import { supabase } from '@/integrations/supabase/client';
import { db } from './db';
import { syncService, generateId } from './syncService';
import type { Patient, Dentist, Appointment, MedicalHistory, Visit, Payment } from '@/types';

export class DataService {
  private async isOnline(): Promise<boolean> {
    const state = await db.appState.get(1);
    return state?.isOnline ?? navigator.onLine;
  }

  // Patients
  async getPatients(): Promise<Patient[]> {
    const online = await this.isOnline();

    if (online) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('last_name', { ascending: true });

        if (!error && data) {
          await db.patients.clear();
          await db.patients.bulkAdd(data);
          return data;
        }
      } catch (error) {
        console.error('Error fetching from server, using local data:', error);
      }
    }

    return await db.patients.orderBy('last_name').toArray();
  }

  async addPatient(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const online = await this.isOnline();
    const newPatient: Patient = {
      ...patient,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.patients.add(newPatient);

    if (online) {
      try {
        const { error } = await supabase.from('patients').insert(newPatient);
        if (error) throw error;
      } catch (error) {
        await syncService.addToSyncQueue('patients', 'insert', newPatient);
      }
    } else {
      await syncService.addToSyncQueue('patients', 'insert', newPatient);
    }

    return newPatient;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
    const online = await this.isOnline();
    const updatedData = { ...updates, updated_at: new Date().toISOString() };

    await db.patients.update(id, updatedData);

    if (online) {
      try {
        const { error } = await supabase
          .from('patients')
          .update(updatedData)
          .eq('id', id);
        if (error) throw error;
      } catch (error) {
        await syncService.addToSyncQueue('patients', 'update', { id, ...updatedData });
      }
    } else {
      await syncService.addToSyncQueue('patients', 'update', { id, ...updatedData });
    }
  }

  // Dentists
  async getDentists(): Promise<Dentist[]> {
    const online = await this.isOnline();

    if (online) {
      try {
        const { data, error } = await supabase
          .from('dentists')
          .select('*')
          .order('last_name', { ascending: true });

        if (!error && data) {
          await db.dentists.clear();
          await db.dentists.bulkAdd(data);
          return data;
        }
      } catch (error) {
        console.error('Error fetching from server, using local data:', error);
      }
    }

    return await db.dentists.orderBy('last_name').toArray();
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    const online = await this.isOnline();

    if (online) {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:patients(first_name, last_name, phone),
            dentist:dentists(first_name, last_name)
          `)
          .order('appointment_datetime', { ascending: true });

        if (!error && data) {
          await db.appointments.clear();
          await db.appointments.bulkAdd(data);
          return data;
        }
      } catch (error) {
        console.error('Error fetching from server, using local data:', error);
      }
    }

    const appointments = await db.appointments.orderBy('appointment_datetime').toArray();
    
    // Populate patient and dentist info from local DB
    const enrichedAppointments = await Promise.all(
      appointments.map(async (appt) => {
        const patient = await db.patients.get(appt.patient_id);
        const dentist = await db.dentists.get(appt.dentist_id);
        
        return {
          ...appt,
          patient: patient ? {
            first_name: patient.first_name,
            last_name: patient.last_name,
            phone: patient.phone
          } : undefined,
          dentist: dentist ? {
            first_name: dentist.first_name,
            last_name: dentist.last_name
          } : undefined
        };
      })
    );

    return enrichedAppointments;
  }

  async addAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const online = await this.isOnline();
    const newAppointment: Appointment = {
      ...appointment,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.appointments.add(newAppointment);

    if (online) {
      try {
        const { error } = await supabase.from('appointments').insert(newAppointment);
        if (error) throw error;
      } catch (error) {
        await syncService.addToSyncQueue('appointments', 'insert', newAppointment);
      }
    } else {
      await syncService.addToSyncQueue('appointments', 'insert', newAppointment);
    }

    return newAppointment;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<void> {
    const online = await this.isOnline();
    const updatedData = { ...updates, updated_at: new Date().toISOString() };

    await db.appointments.update(id, updatedData);

    if (online) {
      try {
        const { error } = await supabase
          .from('appointments')
          .update(updatedData)
          .eq('id', id);
        if (error) throw error;
      } catch (error) {
        await syncService.addToSyncQueue('appointments', 'update', { id, ...updatedData });
      }
    } else {
      await syncService.addToSyncQueue('appointments', 'update', { id, ...updatedData });
    }
  }

  async deleteAppointment(id: string): Promise<void> {
    const online = await this.isOnline();

    await db.appointments.delete(id);

    if (online) {
      try {
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (error) {
        await syncService.addToSyncQueue('appointments', 'delete', { id });
      }
    } else {
      await syncService.addToSyncQueue('appointments', 'delete', { id });
    }
  }

  // Medical History
  async getMedicalHistory(patientId: string): Promise<MedicalHistory | undefined> {
    const online = await this.isOnline();

    if (online) {
      try {
        const { data, error } = await supabase
          .from('medical_history')
          .select('*')
          .eq('patient_id', patientId)
          .single();

        if (!error && data) {
          await db.medicalHistory.put(data);
          return data;
        }
      } catch (error) {
        console.error('Error fetching from server, using local data:', error);
      }
    }

    return await db.medicalHistory.get({ patient_id: patientId } as any);
  }

  async addMedicalHistory(history: Omit<MedicalHistory, 'id' | 'created_at' | 'updated_at'>): Promise<MedicalHistory> {
    const online = await this.isOnline();
    const newHistory: MedicalHistory = {
      ...history,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.medicalHistory.add(newHistory);

    if (online) {
      try {
        const { error } = await supabase.from('medical_history').insert(newHistory);
        if (error) throw error;
      } catch (error) {
        await syncService.addToSyncQueue('medicalHistory', 'insert', newHistory);
      }
    } else {
      await syncService.addToSyncQueue('medicalHistory', 'insert', newHistory);
    }

    return newHistory;
  }

  async updateMedicalHistory(id: string, updates: Partial<MedicalHistory>): Promise<void> {
    const online = await this.isOnline();
    const updatedData = { ...updates, updated_at: new Date().toISOString() };

    await db.medicalHistory.update(id, updatedData);

    if (online) {
      try {
        const { error } = await supabase
          .from('medical_history')
          .update(updatedData)
          .eq('id', id);
        if (error) throw error;
      } catch (error) {
        await syncService.addToSyncQueue('medicalHistory', 'update', { id, ...updatedData });
      }
    } else {
      await syncService.addToSyncQueue('medicalHistory', 'update', { id, ...updatedData });
    }
  }

  // Visits
  async getVisitsByPatient(patientId: string): Promise<Visit[]> {
    const online = await this.isOnline();

    if (online) {
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('patient_id', patientId)
          .order('visit_date', { ascending: false });

        if (!error && data) {
          // Update local DB with fetched data
          for (const visit of data) {
            await db.visits.put(visit);
          }
          return data;
        }
      } catch (error) {
        console.error('Error fetching from server, using local data:', error);
      }
    }

    return await db.visits.where('patient_id').equals(patientId).reverse().sortBy('visit_date');
  }

  async addVisit(visit: Omit<Visit, 'id' | 'created_at'>): Promise<Visit> {
    const online = await this.isOnline();
    const newVisit: Visit = {
      ...visit,
      id: generateId(),
      created_at: new Date().toISOString()
    };

    await db.visits.add(newVisit);

    if (online) {
      try {
        const { error } = await supabase.from('visits').insert(newVisit);
        if (error) throw error;
      } catch (error) {
        await syncService.addToSyncQueue('visits', 'insert', newVisit);
      }
    } else {
      await syncService.addToSyncQueue('visits', 'insert', newVisit);
    }

    return newVisit;
  }

  // Payments
  async getPaymentsByPatient(patientId: string): Promise<Payment[]> {
    const online = await this.isOnline();

    if (online) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('patient_id', patientId)
          .order('payment_date', { ascending: false });

        if (!error && data) {
          // Update local DB with fetched data
          for (const payment of data) {
            await db.payments.put(payment);
          }
          return data;
        }
      } catch (error) {
        console.error('Error fetching from server, using local data:', error);
      }
    }

    return await db.payments.where('patient_id').equals(patientId).reverse().sortBy('payment_date');
  }

  async addPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    const online = await this.isOnline();
    const newPayment: Payment = {
      ...payment,
      id: generateId(),
      created_at: new Date().toISOString()
    };

    await db.payments.add(newPayment);

    if (online) {
      try {
        const { error } = await supabase.from('payments').insert(newPayment);
        if (error) throw error;
      } catch (error) {
        await syncService.addToSyncQueue('payments', 'insert', newPayment);
      }
    } else {
      await syncService.addToSyncQueue('payments', 'insert', newPayment);
    }

    return newPayment;
  }
}

export const dataService = new DataService();
