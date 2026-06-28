import { supabase } from '@/integrations/supabase/client';
import { db } from './db';
import type { SyncQueueItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class SyncService {
  private syncInProgress = false;
  private maxRetries = 3;

  async addToSyncQueue(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    await db.syncQueue.add({
      table,
      operation,
      data,
      timestamp: Date.now(),
      synced: false,
      retries: 0
    });
  }

  async pullFromServer(): Promise<void> {
    const tables = ['patients', 'dentists', 'appointments', 'medicalHistory', 'visits', 'payments'];
    const dbTableMap: Record<string, string> = {
      patients: 'patients',
      dentists: 'dentists',
      appointments: 'appointments',
      medicalHistory: 'medical_history',
      visits: 'visits',
      payments: 'payments'
    };

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(dbTableMap[table]).select('*');

        if (error) throw error;

        if (data) {
          const dbTable = db[table as keyof typeof db] as {
            clear: () => Promise<void>;
            bulkPut: (rows: unknown[]) => Promise<void>;
          };
          await dbTable.clear();
          if (data.length > 0) {
            await dbTable.bulkPut(data);
          }
        }
      } catch (error) {
        console.error(`Error pulling ${table}:`, error);
      }
    }
  }

  async syncAll(): Promise<void> {
    if (this.syncInProgress) return;

    const state = await db.appState.get(1);
    if (!state?.isOnline && !navigator.onLine) return;

    this.syncInProgress = true;
    await db.appState.update(1, { syncInProgress: true, isOnline: navigator.onLine });

    try {
      await this.pullFromServer();
      await this.pushToServer();
      await db.appState.update(1, { lastSync: Date.now() });
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
      await db.appState.update(1, { syncInProgress: false });
    }
  }

  private async pushToServer(): Promise<void> {
    const queueItems = await db.syncQueue
      .where('synced')
      .equals(0)
      .sortBy('timestamp');

    for (const item of queueItems) {
      if ((item.retries || 0) >= this.maxRetries) {
        continue;
      }

      try {
        await this.syncItem(item);
        await db.syncQueue.update(item.id!, { synced: true });
      } catch (error) {
        console.error(`Error syncing item ${item.id}:`, error);
        await db.syncQueue.update(item.id!, {
          retries: (item.retries || 0) + 1
        });
      }
    }

    // Clean up old synced items
    await db.syncQueue.where('synced').equals(1).delete();
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const tableMap: Record<string, string> = {
      patients: 'patients',
      dentists: 'dentists',
      appointments: 'appointments',
      medicalHistory: 'medical_history',
      visits: 'visits',
      payments: 'payments'
    };

    const serverTable = tableMap[item.table];
    if (!serverTable) return;

    switch (item.operation) {
      case 'insert':
        const { error: insertError } = await supabase
          .from(serverTable)
          .insert(item.data);
        if (insertError) throw insertError;
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(serverTable)
          .update(item.data)
          .eq('id', item.data.id);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(serverTable)
          .delete()
          .eq('id', item.data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  async getPendingSyncCount(): Promise<number> {
    return await db.syncQueue.where('synced').equals(0).count();
  }
}

export const syncService = new SyncService();

// Generate UUID for new records
export const generateId = () => uuidv4();
