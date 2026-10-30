import { supabase } from '@/integrations/supabase/client';
import { db } from './db';
import type { SyncQueueItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/** Fired on window after a sync run so open views can refresh from local data. */
export const DATA_SYNCED_EVENT = 'toothtime:data-synced';

export type SyncTableName =
  | 'patients'
  | 'dentists'
  | 'appointments'
  | 'medicalHistory'
  | 'visits'
  | 'payments';

export interface SyncResult {
  ok: boolean;
  skipped: boolean;
  pushed: number;
  pending: number;
  lastError?: string;
}

const SYNC_TABLES: SyncTableName[] = [
  'patients',
  'dentists',
  'appointments',
  'medicalHistory',
  'visits',
  'payments'
];

/**
 * Local table -> Supabase table + the exact columns that table exposes.
 * Anything else (joined relations, legacy field names, local-only fields) is
 * stripped before a request, otherwise PostgREST rejects the whole row and the
 * record never reaches the other devices.
 */
type ServerTableName =
  | 'patients'
  | 'dentists'
  | 'appointments'
  | 'medical_history'
  | 'visits'
  | 'payments';

const TABLE_CONFIG: Record<SyncTableName, { serverTable: ServerTableName; columns: string[] }> = {
  patients: {
    serverTable: 'patients',
    columns: [
      'id', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'age', 'occupation',
      'marital_status', 'address', 'emergency_contact_name', 'emergency_contact_phone',
      'insurance_provider', 'insurance_policy_number', 'gender', 'medical_history',
      'xray_images', 'created_at', 'updated_at'
    ]
  },
  dentists: {
    serverTable: 'dentists',
    columns: [
      'id', 'user_id', 'email', 'first_name', 'last_name', 'license_number', 'phone',
      'specialization', 'username', 'password', 'created_at', 'updated_at'
    ]
  },
  appointments: {
    serverTable: 'appointments',
    columns: [
      'id', 'patient_id', 'dentist_id', 'appointment_datetime', 'service_type', 'status',
      'notes', 'created_at', 'updated_at'
    ]
  },
  medicalHistory: {
    serverTable: 'medical_history',
    columns: [
      'id', 'patient_id', 'physician_name', 'physician_specialty', 'physician_address',
      'physician_phone', 'in_good_health', 'in_medical_treatment', 'treatment_condition',
      'serious_illness', 'illness_description', 'hospitalized', 'hospitalization_details',
      'taking_medication', 'medication_details', 'uses_tobacco', 'uses_alcohol_drugs',
      'allergies', 'other_allergy', 'bleeding_time', 'blood_type', 'blood_pressure',
      'is_pregnant', 'is_nursing', 'taking_birth_control', 'medical_conditions',
      'created_at', 'updated_at'
    ]
  },
  visits: {
    serverTable: 'visits',
    columns: [
      'id', 'patient_id', 'visit_date', 'diagnosis', 'treatment', 'treatment_cost', 'notes',
      'xray_images', 'created_at', 'updated_at'
    ]
  },
  payments: {
    serverTable: 'payments',
    columns: [
      'id', 'patient_id', 'amount', 'payment_method', 'payment_date', 'description', 'status',
      'created_at', 'updated_at'
    ]
  }
};

const isSyncTable = (table: string): table is SyncTableName =>
  (SYNC_TABLES as string[]).includes(table);

const describeError = (error: unknown): string => {
  if (!error) return 'Unknown sync error';
  if (typeof error === 'string') return error;
  const candidate = error as { message?: string; details?: string; code?: string };
  return candidate.message || candidate.details || candidate.code || 'Unknown sync error';
};

/** Duplicate primary keys mean the row is already on the server; that is success for us. */
const isDuplicateKeyError = (error: unknown): boolean => {
  if (!error) return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === '23505' || /duplicate key/i.test(candidate.message ?? '');
};

/**
 * Merges a new queue operation with one that is still waiting to be pushed, so
 * a record created offline and then edited produces a single request instead of
 * an insert followed by updates.
 */
const mergeOperation = (
  existing: SyncQueueItem['operation'],
  incoming: SyncQueueItem['operation']
): SyncQueueItem['operation'] => {
  if (incoming === 'delete') return 'delete';
  if (existing === 'insert') return 'insert';
  if (existing === 'delete') return 'insert';
  return incoming === 'insert' ? 'insert' : 'update';
};

export class SyncService {
  private syncInProgress = false;
  private maxRetries = 3;

  private sanitize(table: string, data: Record<string, unknown>): Record<string, unknown> {
    if (!isSyncTable(table)) return data;

    const allowed = TABLE_CONFIG[table].columns;
    const clean: Record<string, unknown> = {};
    for (const column of allowed) {
      if (data[column] !== undefined) {
        clean[column] = data[column];
      }
    }
    return clean;
  }

  async addToSyncQueue(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>
  ): Promise<void> {
    const recordId = typeof data?.id === 'string' ? data.id : undefined;

    if (recordId) {
      const pendingForRecord = await db.syncQueue
        .where('synced')
        .equals(0)
        .filter((item) => item.table === table && item.data?.id === recordId)
        .toArray();

      if (pendingForRecord.length > 0) {
        const [existing, ...duplicates] = pendingForRecord;
        const mergedOperation = mergeOperation(existing.operation, operation);
        const mergedData = mergedOperation === 'delete'
          ? { id: recordId }
          : { ...existing.data, ...data, id: recordId };

        await db.syncQueue.update(existing.id!, {
          operation: mergedOperation,
          data: this.sanitize(table, mergedData),
          timestamp: Date.now(),
          retries: 0,
          lastError: undefined
        });

        if (duplicates.length > 0) {
          await db.syncQueue.bulkDelete(duplicates.map((item) => item.id!));
        }
        return;
      }
    }

    await db.syncQueue.add({
      table,
      operation,
      data: this.sanitize(table, data),
      timestamp: Date.now(),
      synced: 0,
      retries: 0
    });
  }

  /**
   * Pushes queued local changes first, then refreshes the local cache.
   * Records that are still waiting to be pushed are never overwritten by server
   * data, so an offline edit cannot be lost by a background sync.
   */
  async syncAll(options: { force?: boolean } = {}): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { ok: true, skipped: true, pushed: 0, pending: await this.getPendingSyncCount() };
    }

    if (!navigator.onLine) {
      return { ok: true, skipped: true, pushed: 0, pending: await this.getPendingSyncCount() };
    }

    this.syncInProgress = true;
    await db.appState.update(1, { syncInProgress: true, isOnline: true });
    const pendingBefore = await this.getPendingSyncCount();

    try {
      const failedTables = await this.pushToServer(Boolean(options.force));
      await this.pullFromServer(failedTables);

      const pending = await this.getPendingSyncCount();
      const result: SyncResult = {
        ok: pending === 0,
        skipped: false,
        pushed: Math.max(0, pendingBefore - pending),
        pending
      };

      await db.appState.update(1, { lastSync: Date.now(), isOnline: true });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<SyncResult>(DATA_SYNCED_EVENT, { detail: result }));
      }

      return result;
    } catch (error) {
      console.error('Sync error:', error);
      return {
        ok: false,
        skipped: false,
        pushed: 0,
        pending: await this.getPendingSyncCount(),
        lastError: describeError(error)
      };
    } finally {
      this.syncInProgress = false;
      await db.appState.update(1, { syncInProgress: false });
    }
  }

  /**
   * Pushes queued changes only (no server pull). Used right after a write so a
   * connected device uploads immediately instead of waiting for the next sync.
   */
  async flush(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { ok: true, skipped: true, pushed: 0, pending: await this.getPendingSyncCount() };
    }

    if (!navigator.onLine) {
      return { ok: true, skipped: true, pushed: 0, pending: await this.getPendingSyncCount() };
    }

    this.syncInProgress = true;
    const pendingBefore = await this.getPendingSyncCount();

    try {
      await this.pushToServer(false);
      const pending = await this.getPendingSyncCount();
      return {
        ok: pending === 0,
        skipped: false,
        pushed: Math.max(0, pendingBefore - pending),
        pending
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /** Returns the set of local tables that still have un-pushed changes. */
  private async pushToServer(force: boolean): Promise<Set<string>> {
    const queueItems = await db.syncQueue.where('synced').equals(0).sortBy('timestamp');
    const failedTables = new Set<string>();

    for (const item of queueItems) {
      const retries = item.retries ?? 0;

      if (!force && retries >= this.maxRetries) {
        failedTables.add(item.table);
        continue;
      }

      try {
        await this.syncItem(item);
        await db.syncQueue.update(item.id!, { synced: 1, lastError: undefined });
      } catch (error) {
        const message = describeError(error);
        failedTables.add(item.table);
        console.error(`Error syncing ${item.table} ${item.operation} (${item.data?.id}):`, message);
        await db.syncQueue.update(item.id!, {
          retries: retries + 1,
          lastError: message
        });
      }
    }

    // Clean up items that made it to the server.
    await db.syncQueue.where('synced').equals(1).delete();

    return failedTables;
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    if (!isSyncTable(item.table)) {
      throw new Error(`Unknown sync table: ${item.table}`);
    }

    const { serverTable } = TABLE_CONFIG[item.table];
    const payload = this.sanitize(item.table, item.data ?? {});

    switch (item.operation) {
      case 'insert': {
        // upsert keeps this safe if a previous push reached the server but the
        // local queue write did not finish.
        const { error } = await supabase
          .from(serverTable)
          .upsert(payload as never, { onConflict: 'id' });
        if (error && !isDuplicateKeyError(error)) throw error;
        return;
      }

      case 'update': {
        const { data, error } = await supabase
          .from(serverTable)
          .update(payload as never)
          .eq('id', payload.id as string)
          .select('id');

        if (error) throw error;

        // The row is missing remotely (for example a create that never landed),
        // so send the full record we hold locally instead of silently dropping it.
        if (!data || data.length === 0) {
          const localRecord = await this.readLocalRecord(item.table, payload.id as string);
          if (!localRecord) throw new Error('Record not found locally for update fallback');

          const { error: upsertError } = await supabase
            .from(serverTable)
            .upsert(this.sanitize(item.table, localRecord) as never, { onConflict: 'id' });
          if (upsertError) throw upsertError;
        }
        return;
      }

      case 'delete': {
        const { error } = await supabase
          .from(serverTable)
          .delete()
          .eq('id', payload.id as string);
        if (error) throw error;
        return;
      }

      default:
        throw new Error(`Unsupported sync operation: ${String(item.operation)}`);
    }
  }

  private async readLocalRecord(table: SyncTableName, id: string): Promise<Record<string, unknown> | undefined> {
    const localTable = db[table] as unknown as { get: (key: string) => Promise<Record<string, unknown> | undefined> };
    return localTable.get(id);
  }

  private async pullFromServer(failedTables: Set<string>): Promise<void> {
    for (const table of SYNC_TABLES) {
      try {
        const { serverTable } = TABLE_CONFIG[table];
        const { data, error } = await supabase.from(serverTable).select('*');

        if (error) throw error;

        const rows = (data ?? []) as Array<{ id: string }>;
        const localTable = db[table] as unknown as {
          clear: () => Promise<void>;
          bulkPut: (rows: unknown[]) => Promise<unknown>;
        };

        const pendingIds = new Set(
          (await db.syncQueue
            .where('synced')
            .equals(0)
            .filter((item) => item.table === table)
            .toArray())
            .map((item) => item.data?.id)
            .filter((id): id is string => typeof id === 'string')
        );

        const rowsToStore = rows.filter((row) => !pendingIds.has(row.id));

        // Only mirror the server when nothing local is still waiting to upload.
        if (pendingIds.size === 0 && !failedTables.has(table)) {
          await localTable.clear();
        }

        if (rowsToStore.length > 0) {
          await localTable.bulkPut(rowsToStore);
        }
      } catch (error) {
        console.error(`Error pulling ${table}:`, describeError(error));
      }
    }
  }

  async getPendingSyncCount(): Promise<number> {
    return await db.syncQueue.where('synced').equals(0).count();
  }

  /** Last error recorded for a queued change, useful for UI hints. */
  async getPendingSyncError(): Promise<string | undefined> {
    const items = await db.syncQueue.where('synced').equals(0).toArray();
    const failed = items.find((item) => item.lastError);
    return failed?.lastError;
  }
}

export const syncService = new SyncService();

/** Generates UUIDs for new records so local and cloud rows share an id. */
export const generateId = () => uuidv4();

let autoSyncStarted = false;

/**
 * Keeps local data flowing to Supabase without a page reload: on reconnect,
 * when the tab becomes visible again, and on a slow interval for edits queued
 * while online (a failed request is retried instead of being stranded).
 */
export const startAutoSync = (intervalMs = 60_000): void => {
  if (autoSyncStarted || typeof window === 'undefined') return;
  autoSyncStarted = true;

  const requestSync = (force: boolean) => {
    void syncService.syncAll({ force }).catch((error) => {
      console.error('Background sync failed:', error);
    });
  };

  window.addEventListener('online', () => requestSync(true));
  window.addEventListener('offline', () => {
    void db.appState.update(1, { isOnline: false });
  });
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) requestSync(true);
  });

  window.setInterval(() => {
    if (navigator.onLine && !document.hidden) {
      requestSync(false);
    }
  }, intervalMs);
};
