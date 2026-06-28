-- This app uses local login + the Supabase anon key (not Supabase Auth sessions).
-- Allow anon clients to read/write clinic data. App-level auth guards access in the UI.

-- Patients
DROP POLICY IF EXISTS "Authenticated users can access all patients" ON public.patients;
DROP POLICY IF EXISTS "Dentists can access all patients" ON public.patients;
DROP POLICY IF EXISTS "App clients can access patients" ON public.patients;
CREATE POLICY "App clients can access patients"
ON public.patients
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Dentists
DROP POLICY IF EXISTS "Authenticated users can view all dentists for scheduling" ON public.dentists;
DROP POLICY IF EXISTS "Dentists can manage own record" ON public.dentists;
DROP POLICY IF EXISTS "Dentists can access own record" ON public.dentists;
DROP POLICY IF EXISTS "App clients can access dentists" ON public.dentists;
CREATE POLICY "App clients can access dentists"
ON public.dentists
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Appointments
DROP POLICY IF EXISTS "Authenticated users can access appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can access their appointments" ON public.appointments;
DROP POLICY IF EXISTS "App clients can access appointments" ON public.appointments;
CREATE POLICY "App clients can access appointments"
ON public.appointments
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Visits
DROP POLICY IF EXISTS "Authenticated users can access patient visits" ON public.visits;
DROP POLICY IF EXISTS "Dentists can access patient visits" ON public.visits;
DROP POLICY IF EXISTS "App clients can access visits" ON public.visits;
CREATE POLICY "App clients can access visits"
ON public.visits
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Payments
DROP POLICY IF EXISTS "Authenticated users can access patient payments" ON public.payments;
DROP POLICY IF EXISTS "Dentists can access patient payments" ON public.payments;
DROP POLICY IF EXISTS "App clients can access payments" ON public.payments;
CREATE POLICY "App clients can access payments"
ON public.payments
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Medical history
DROP POLICY IF EXISTS "Authenticated users can access medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Dentists can access medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Allow all operations on medical_history" ON public.medical_history;
DROP POLICY IF EXISTS "App clients can access medical history" ON public.medical_history;
CREATE POLICY "App clients can access medical history"
ON public.medical_history
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- X-ray storage (anon clients)
DROP POLICY IF EXISTS "Authenticated users can upload X-rays" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view X-rays" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete X-rays" ON storage.objects;
DROP POLICY IF EXISTS "App clients can upload X-rays" ON storage.objects;
DROP POLICY IF EXISTS "App clients can view X-rays" ON storage.objects;
DROP POLICY IF EXISTS "App clients can delete X-rays" ON storage.objects;

CREATE POLICY "App clients can upload X-rays" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'xrays');

CREATE POLICY "App clients can view X-rays" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'xrays');

CREATE POLICY "App clients can delete X-rays" ON storage.objects
FOR DELETE TO anon, authenticated
USING (bucket_id = 'xrays');
