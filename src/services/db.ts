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
  }
}

export const db = new ToothTimeDB();
const DENTISTS_CLEAR_FLAG = 'toothtime.dentists.cleared.v1';

// Initialize app state
db.appState.get(1).then(state => {
  if (!state) {
    db.appState.add({ 
      id: 1, 
      isOnline: navigator.onLine,
      syncInProgress: false 
    });
  }
});

db.on('ready', async () => {
  if (!localStorage.getItem(DENTISTS_CLEAR_FLAG)) {
    await db.dentists.clear();
    localStorage.setItem(DENTISTS_CLEAR_FLAG, 'true');
  }
});
