
-- Add missing personal information fields to the patients table
ALTER TABLE public.patients 
ADD COLUMN age INTEGER,
ADD COLUMN occupation CHARACTER VARYING,
ADD COLUMN marital_status CHARACTER VARYING;

-- Create a separate medical_history table
CREATE TABLE public.medical_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  
  -- Physician Information
  physician_name CHARACTER VARYING,
  physician_specialty CHARACTER VARYING,
  physician_address TEXT,
  physician_phone CHARACTER VARYING,
  
  -- General Health Questions
  in_good_health CHARACTER VARYING,
  in_medical_treatment CHARACTER VARYING,
  treatment_condition TEXT,
  serious_illness CHARACTER VARYING,
  illness_description TEXT,
  hospitalized CHARACTER VARYING,
  hospitalization_details TEXT,
  taking_medication CHARACTER VARYING,
  medication_details TEXT,
  uses_tobacco CHARACTER VARYING,
  uses_alcohol_drugs CHARACTER VARYING,
  
  -- Allergies
  allergies JSONB DEFAULT '[]'::jsonb,
  other_allergy CHARACTER VARYING,
  
  -- Vital Information
  bleeding_time CHARACTER VARYING,
  blood_type CHARACTER VARYING,
  blood_pressure CHARACTER VARYING,
  
  -- Women Only Questions
  is_pregnant CHARACTER VARYING,
  is_nursing CHARACTER VARYING,
  taking_birth_control CHARACTER VARYING,
  
  -- Medical Conditions
  medical_conditions JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on patient_id for better query performance
CREATE INDEX idx_medical_history_patient_id ON public.medical_history(patient_id);

-- Enable RLS on medical_history table
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for medical_history (assuming no auth for now, but structure is ready)
CREATE POLICY "Allow all operations on medical_history" ON public.medical_history
  FOR ALL USING (true);
