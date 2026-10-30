import { supabase } from '@/integrations/supabase/client';
import { db } from './db';
import { syncService, generateId, type SyncTableName } from './syncService';
import type { Patient, Dentist, Appointment, MedicalHistory, Visit, Payment } from '@/types';

type NewVisit = Omit<Visit, 'id' | 'created_at' | 'updated_at' | 'diagnosis'> & {
  diagnosis?: string;
};

type NewPayment = Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'patient'>;

/**
 * Local-first data access.
 *
 * Every write lands in IndexedDB first, then goes into the sync queue. Queued
 * changes are flushed immediately when the device is online and retried in the
 * background otherwise, so the same code path works offline and connected.
 */
export class DataService {
  private isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  private async cacheRows<T extends { id: string }>(
    localTable: { bulkPut: (rows: T[]) => Promise<unknown> },
    rows: T[]
  ): Promise<void> {
    if (rows.length > 0) {
      await localTable.bulkPut(rows);
    }
  }

  /** Queues a change and pushes it right away when possible. */
  private async save(table: SyncTableName, operation: 'insert' | 'update' | 'delete', data: Record<string, unknown>): Promise<void> {
    await syncService.addToSyncQueue(table, operation, data);

    if (this.isOnline()) {
      await syncService.flush();
    }
  }

  // Patients
  async getPatients(): Promise<Patient[]> {
    if (this.isOnline()) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('last_name', { ascending: true });

        if (error) throw error;

        const patients = (data ?? []) as Patient[];
        await this.cacheRows(db.patients, patients);
        return patients;
      } catch (error) {
        console.error('Supabase patients fetch failed, using local data:', error);
      }
    }

    return await db.patients.orderBy('last_name').toArray();
  }

  async getPatientById(id: string): Promise<Patient | undefined> {
    if (this.isOnline()) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const patient = data as Patient;
          await db.patients.put(patient);
          return patient;
        }
      } catch (error) {
        console.error('Failed to fetch patient from server, using local data:', error);
      }
    }

    return await db.patients.get(id);
  }

  async addPatient(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const now = new Date().toISOString();
    const newPatient: Patient = {
      ...patient,
      id: generateId(),
      created_at: now,
      updated_at: now
    };

    await db.patients.add(newPatient);
    await this.save('patients', 'insert', newPatient as unknown as Record<string, unknown>);

    return newPatient;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
    const updatedData = { ...updates, id, updated_at: new Date().toISOString() };

    await db.patients.update(id, updatedData);
    await this.save('patients', 'update', updatedData as Record<string, unknown>);
  }

  async deletePatient(id: string): Promise<void> {
    const [appointments, visits, payments, histories] = await Promise.all([
      db.appointments.where('patient_id').equals(id).toArray(),
      db.visits.where('patient_id').equals(id).toArray(),
      db.payments.where('patient_id').equals(id).toArray(),
      db.medicalHistory.where('patient_id').equals(id).toArray()
    ]);

    await db.transaction(
      'rw',
      [db.patients, db.appointments, db.visits, db.payments, db.medicalHistory],
      async () => {
        await db.patients.delete(id);
        await Promise.all([
          db.appointments.where('patient_id').equals(id).delete(),
          db.visits.where('patient_id').equals(id).delete(),
          db.payments.where('patient_id').equals(id).delete(),
          db.medicalHistory.where('patient_id').equals(id).delete()
        ]);
      }
    );

    await this.save('patients', 'delete', { id });
    await Promise.all([
      ...appointments.map((row) => this.save('appointments', 'delete', { id: row.id })),
      ...visits.map((row) => this.save('visits', 'delete', { id: row.id })),
      ...payments.map((row) => this.save('payments', 'delete', { id: row.id })),
      ...histories.map((row) => this.save('medicalHistory', 'delete', { id: row.id }))
    ]);
  }

  // Dentists
  async getDentists(): Promise<Dentist[]> {
    if (this.isOnline()) {
      try {
        const { data, error } = await supabase
          .from('dentists')
          .select('*')
          .order('last_name', { ascending: true });

        if (error) throw error;

        // The generated Supabase types predate the dentist username/password
        // migration, so the row shape is narrower than the runtime record.
        const dentists = (data ?? []) as unknown as Dentist[];
        await this.cacheRows(db.dentists, dentists);
        return dentists;
      } catch (error) {
        console.error('Supabase dentists fetch failed, using local data:', error);
      }
    }

    return await db.dentists.orderBy('last_name').toArray();
  }

  async addDentist(dentist: Omit<Dentist, 'id' | 'created_at' | 'updated_at'>): Promise<Dentist> {
    const now = new Date().toISOString();
    const newDentist: Dentist = {
      ...dentist,
      email: dentist.email || `${dentist.username}@clinic.local`,
      id: generateId(),
      created_at: now,
      updated_at: now
    };

    await db.dentists.add(newDentist);
    await this.save('dentists', 'insert', newDentist as unknown as Record<string, unknown>);

    return newDentist;
  }

  async updateDentist(id: string, updates: Partial<Dentist>): Promise<void> {
    const updatedData = { ...updates, id, updated_at: new Date().toISOString() };

    await db.dentists.update(id, updatedData);
    await this.save('dentists', 'update', updatedData as Record<string, unknown>);
  }

  async deleteDentist(id: string): Promise<void> {
    await db.dentists.delete(id);
    await this.save('dentists', 'delete', { id });
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    if (this.isOnline()) {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:patients(first_name, last_name, phone),
            dentist:dentists(first_name, last_name)
          `)
          .order('appointment_datetime', { ascending: true });

        if (error) throw error;

        const appointments = (data ?? []) as Appointment[];
        await this.cacheRows(db.appointments, appointments);
        return appointments;
      } catch (error) {
        console.error('Error fetching appointments from server, using local data:', error);
      }
    }

    const appointments = await db.appointments.orderBy('appointment_datetime').toArray();

    // Populate patient and dentist info from the local cache for offline use.
    return await Promise.all(
      appointments.map(async (appointment) => {
        const patient = await db.patients.get(appointment.patient_id);
        const dentist = await db.dentists.get(appointment.dentist_id);

        return {
          ...appointment,
          patient: appointment.patient ?? (patient ? {
            first_name: patient.first_name,
            last_name: patient.last_name,
            phone: patient.phone
          } : undefined),
          dentist: appointment.dentist ?? (dentist ? {
            first_name: dentist.first_name,
            last_name: dentist.last_name
          } : undefined)
        };
      })
    );
  }

  async addAppointment(
    appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'patient' | 'dentist'>
  ): Promise<Appointment> {
    const now = new Date().toISOString();
    const newAppointment: Appointment = {
      ...appointment,
      id: generateId(),
      created_at: now,
      updated_at: now
    };

    await db.appointments.add(newAppointment);
    await this.save('appointments', 'insert', newAppointment as unknown as Record<string, unknown>);

    return newAppointment;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<void> {
    const updatedData = { ...updates, id, updated_at: new Date().toISOString() };

    await db.appointments.update(id, updatedData);
    await this.save('appointments', 'update', updatedData as Record<string, unknown>);
  }

  async deleteAppointment(id: string): Promise<void> {
    await db.appointments.delete(id);
    await this.save('appointments', 'delete', { id });
  }

  // Medical History
  async getMedicalHistory(patientId: string): Promise<MedicalHistory | undefined> {
    if (this.isOnline()) {
      try {
        const { data, error } = await supabase
          .from('medical_history')
          .select('*')
          .eq('patient_id', patientId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const history = data as MedicalHistory;
          await db.medicalHistory.put(history);
          return history;
        }
      } catch (error) {
        console.error('Error fetching medical history from server, using local data:', error);
      }
    }

    return await db.medicalHistory.where('patient_id').equals(patientId).first();
  }

  async addMedicalHistory(
    history: Omit<MedicalHistory, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MedicalHistory> {
    const now = new Date().toISOString();
    const newHistory: MedicalHistory = {
      ...history,
      id: generateId(),
      created_at: now,
      updated_at: now
    };

    await db.medicalHistory.add(newHistory);
    await this.save('medicalHistory', 'insert', newHistory as unknown as Record<string, unknown>);

    return newHistory;
  }

  async updateMedicalHistory(id: string, updates: Partial<MedicalHistory>): Promise<void> {
    const updatedData = { ...updates, id, updated_at: new Date().toISOString() };

    await db.medicalHistory.update(id, updatedData);
    await this.save('medicalHistory', 'update', updatedData as Record<string, unknown>);
  }

  // Visits
  async getVisitsByPatient(patientId: string): Promise<Visit[]> {
    if (this.isOnline()) {
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('patient_id', patientId)
          .order('visit_date', { ascending: false });

        if (error) throw error;

        const visits = (data ?? []) as Visit[];
        await this.cacheRows(db.visits, visits);
        return visits;
      } catch (error) {
        console.error('Error fetching visits from server, using local data:', error);
      }
    }

    const visits = await db.visits.where('patient_id').equals(patientId).toArray();
    return visits.sort((a, b) => b.visit_date.localeCompare(a.visit_date));
  }

  async addVisit(visit: NewVisit): Promise<Visit> {
    const now = new Date().toISOString();
    const newVisit: Visit = {
      ...visit,
      diagnosis: visit.diagnosis ?? '',
      id: generateId(),
      created_at: now,
      updated_at: now
    };

    await db.visits.add(newVisit);
    await this.save('visits', 'insert', newVisit as unknown as Record<string, unknown>);

    return newVisit;
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    if (this.isOnline()) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('payment_date', { ascending: false });

        if (error) throw error;

        const payments = (data ?? []) as Payment[];
        await this.cacheRows(db.payments, payments);
        return this.withPatientNames(payments);
      } catch (error) {
        console.error('Error fetching payments from server, using local data:', error);
      }
    }

    const payments = await db.payments.orderBy('payment_date').reverse().toArray();
    return this.withPatientNames(payments);
  }

  async getPaymentsByPatient(patientId: string): Promise<Payment[]> {
    if (this.isOnline()) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('patient_id', patientId)
          .order('payment_date', { ascending: false });

        if (error) throw error;

        const payments = (data ?? []) as Payment[];
        await this.cacheRows(db.payments, payments);
        return payments;
      } catch (error) {
        console.error('Error fetching payments from server, using local data:', error);
      }
    }

    const payments = await db.payments.where('patient_id').equals(patientId).toArray();
    return payments.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  }

  async addPayment(payment: NewPayment): Promise<Payment> {
    const now = new Date().toISOString();
    const newPayment: Payment = {
      ...payment,
      id: generateId(),
      created_at: now,
      updated_at: now
    };

    await db.payments.add(newPayment);
    await this.save('payments', 'insert', newPayment as unknown as Record<string, unknown>);

    return newPayment;
  }

  private async withPatientNames(payments: Payment[]): Promise<Payment[]> {
    return await Promise.all(
      payments.map(async (payment) => {
        if (payment.patient) return payment;

        const patient = await db.patients.get(payment.patient_id);
        return patient
          ? { ...payment, patient: { first_name: patient.first_name, last_name: patient.last_name } }
          : payment;
      })
    );
  }
}

export const dataService = new DataService();
