import Dexie, { Table } from 'dexie';
import type {
  Patient,
  Dentist,
  Appointment,
  MedicalHistory,
  Visit,
  Payment,
  SyncQueueItem,
  AppState
} from '@/types';

export class ToothTimeDB extends Dexie {
  patients!: Table<Patient, string>;
  dentists!: Table<Dentist, string>;
  appointments!: Table<Appointment, string>;
  medicalHistory!: Table<MedicalHistory, string>;
  visits!: Table<Visit, string>;
  payments!: Table<Payment, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  appState!: Table<AppState & { id: number }, number>;

  constructor() {
    super('ToothTimeDB');

    this.version(1).stores({
      patients: 'id, email, phone, last_name, updated_at',
      dentists: 'id, last_name, specialization',
      appointments: 'id, patient_id, dentist_id, appointment_datetime, status, updated_at',
      medicalHistory: 'id, patient_id',
      visits: 'id, patient_id, appointment_id, visit_date',
      payments: 'id, visit_id, patient_id, payment_date',
      syncQueue: '++id, table, synced, timestamp',
      appState: 'id'
    });

    this.version(2).stores({
      patients: 'id, email, phone, last_name, updated_at',
      dentists: 'id, username, last_name, specialization',
      appointments: 'id, patient_id, dentist_id, appointment_datetime, status, updated_at',
      medicalHistory: 'id, patient_id',
      visits: 'id, patient_id, appointment_id, visit_date',
      payments: 'id, visit_id, patient_id, payment_date',
      syncQueue: '++id, table, synced, timestamp',
      appState: 'id'
    });

    // v3: the queue's `synced` flag is numeric because IndexedDB cannot index
    // booleans. With the old boolean values the index was empty, so pending
    // offline changes were never found (and never pushed to Supabase).
    this.version(3).stores({
      patients: 'id, email, phone, last_name, updated_at',
      dentists: 'id, username, last_name, specialization',
      appointments: 'id, patient_id, dentist_id, appointment_datetime, status, updated_at',
      medicalHistory: 'id, patient_id',
      visits: 'id, patient_id, visit_date, updated_at',
      payments: 'id, patient_id, payment_date, updated_at',
      syncQueue: '++id, table, synced, timestamp',
      appState: 'id'
    }).upgrade(async (tx) => {
      await tx.table('syncQueue').toCollection().modify((item: SyncQueueItem) => {
        item.synced = item.synced ? 1 : 0;
      });
    });
  }
}

export const db = new ToothTimeDB();

// Initialize app state
db.appState.get(1).then(state => {
  if (!state) {
    return db.appState.put({
      id: 1,
      isOnline: navigator.onLine,
      syncInProgress: false
    });
  }

  // A previous session may have been closed mid-sync, which leaves this flag stuck.
  if (state.syncInProgress) {
    return db.appState.update(1, { syncInProgress: false });
  }

  return undefined;
}).catch((error) => {
  console.error('Failed to initialize local app state:', error);
});
