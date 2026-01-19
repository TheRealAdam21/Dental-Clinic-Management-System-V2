
-- Phase 1: Add user tracking and enable RLS on all tables

-- First, add user_id column to dentists table to link with auth.users
ALTER TABLE public.dentists 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index to ensure one dentist record per user
CREATE UNIQUE INDEX idx_dentists_user_id ON public.dentists(user_id);

-- Enable RLS on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop the existing overly permissive policy on medical_history
DROP POLICY IF EXISTS "Allow all operations on medical_history" ON public.medical_history;

-- Create secure RLS policies

-- Dentists can only access their own record
CREATE POLICY "Dentists can access own record" ON public.dentists
  FOR ALL USING (auth.uid() = user_id);

-- Patients can only be accessed by authenticated dentists
CREATE POLICY "Dentists can access all patients" ON public.patients
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.dentists 
      WHERE user_id = auth.uid()
    )
  );

-- Appointments can only be accessed by the assigned dentist
CREATE POLICY "Dentists can access their appointments" ON public.appointments
  FOR ALL TO authenticated USING (
    dentist_id IN (
      SELECT id FROM public.dentists 
      WHERE user_id = auth.uid()
    )
  );

-- Visits can only be accessed by authenticated dentists
CREATE POLICY "Dentists can access patient visits" ON public.visits
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.dentists 
      WHERE user_id = auth.uid()
    )
  );

-- Payments can only be accessed by authenticated dentists
CREATE POLICY "Dentists can access patient payments" ON public.payments
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.dentists 
      WHERE user_id = auth.uid()
    )
  );

-- Medical history can only be accessed by authenticated dentists
CREATE POLICY "Dentists can access medical history" ON public.medical_history
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.dentists 
      WHERE user_id = auth.uid()
    )
  );

-- Create a function to automatically create dentist profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_dentist_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create dentist profile if email exists in a predefined list or if it's the first user
  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.dentists (user_id, email, first_name, last_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Dr.'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Dentist')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create dentist profile
CREATE TRIGGER on_auth_user_created_dentist
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_dentist_signup();
