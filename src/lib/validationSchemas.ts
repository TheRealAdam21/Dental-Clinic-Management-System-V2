
import { z } from 'zod';

export const patientSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number too long'),
  address: z.string().max(500, 'Address too long').optional(),
  date_of_birth: z.string().optional(),
  age: z.number().min(0, 'Age must be positive').max(150, 'Invalid age').optional(),
  gender: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().max(100, 'Occupation too long').optional(),
  emergency_contact_name: z.string().max(100, 'Emergency contact name too long').optional(),
  emergency_contact_phone: z.string().max(15, 'Emergency contact phone too long').optional(),
  insurance_provider: z.string().max(100, 'Insurance provider name too long').optional(),
  insurance_policy_number: z.string().max(50, 'Policy number too long').optional(),
});

export const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Please select a patient').uuid('Invalid patient ID'),
  dentist_id: z.string().min(1, 'Please select a dentist').uuid('Invalid dentist ID'),
  appointment_datetime: z.string().min(1, 'Appointment date and time required'),
  service_type: z.string().min(1, 'Service type is required').max(100, 'Service type too long'),
  notes: z.string().optional().nullable(),
});

// Make medical history schema completely optional
export const medicalHistorySchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  medical_conditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  taking_medication: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  medication_details: z.string().max(1000, 'Medication details too long').optional(),
  in_good_health: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  serious_illness: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  illness_description: z.string().max(1000, 'Illness description too long').optional(),
  hospitalized: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  hospitalization_details: z.string().max(1000, 'Hospitalization details too long').optional(),
  in_medical_treatment: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  treatment_condition: z.string().max(1000, 'Treatment condition too long').optional(),
  physician_name: z.string().max(100, 'Physician name too long').optional(),
  physician_specialty: z.string().max(100, 'Physician specialty too long').optional(),
  physician_phone: z.string().max(15, 'Physician phone too long').optional(),
  physician_address: z.string().max(500, 'Physician address too long').optional(),
  blood_type: z.string().max(10, 'Blood type too long').optional(),
  blood_pressure: z.string().max(20, 'Blood pressure too long').optional(),
  bleeding_time: z.string().max(20, 'Bleeding time too long').optional(),
  uses_tobacco: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  uses_alcohol_drugs: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  is_pregnant: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  is_nursing: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  taking_birth_control: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  other_allergy: z.string().max(500, 'Other allergies too long').optional(),
}).optional();

export type PatientFormData = z.infer<typeof patientSchema>;
export type AppointmentFormData = z.infer<typeof appointmentSchema>;
export type MedicalHistoryFormData = z.infer<typeof medicalHistorySchema>;
