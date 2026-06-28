export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  age?: number | null;
  occupation?: string;
  marital_status?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  gender?: string;
  created_at?: string;
  updated_at?: string;
  xray_images?: string[] | null;
}

export interface Dentist {
  id: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  specialization?: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_datetime: string;
  service_type: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  patient?: Pick<Patient, 'first_name' | 'last_name' | 'phone'>;
  dentist?: Pick<Dentist, 'first_name' | 'last_name'>;
}

export interface MedicalHistory {
  id: string;
  patient_id: string;
  physician_name?: string;
  physician_specialty?: string;
  physician_address?: string;
  physician_phone?: string;
  in_good_health?: string;
  in_medical_treatment?: string;
  treatment_condition?: string;
  serious_illness?: string;
  illness_description?: string;
  hospitalized?: string;
  hospitalization_details?: string;
  taking_medication?: string;
  medication_details?: string;
  uses_tobacco?: string;
  uses_alcohol_drugs?: string;
  allergies?: string[];
  other_allergy?: string;
  bleeding_time?: string;
  is_pregnant?: string;
  is_nursing?: string;
  taking_birth_control?: string;
  blood_type?: string;
  blood_pressure?: string;
  medical_conditions?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  appointment_id?: string;
  visit_date: string;
  diagnosis?: string;
  treatment?: string;
  treatment_provided?: string;
  treatment_cost?: number | null;
  notes?: string;
  amount_charged?: number;
  xray_images?: string[] | null;
  created_at?: string;
}

export interface Payment {
  id: string;
  visit_id: string;
  patient_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  notes?: string;
  created_at?: string;
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
  synced: boolean;
  retries?: number;
}

export interface AppState {
  isOnline: boolean;
  lastSync?: number;
  syncInProgress: boolean;
}
