-- Run this once in Supabase Dashboard → SQL Editor
-- Fixes: empty dentists/patients on web (RLS blocked anon key) + dentist login columns

-- 1) Dentist login credentials
ALTER TABLE public.dentists
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS password text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dentists_username
  ON public.dentists (lower(username))
  WHERE username IS NOT NULL;

-- 2) Allow anon key access (app uses local login, not Supabase Auth)
DROP POLICY IF EXISTS "Authenticated users can access all patients" ON public.patients;
DROP POLICY IF EXISTS "Dentists can access all patients" ON public.patients;
DROP POLICY IF EXISTS "App clients can access patients" ON public.patients;
CREATE POLICY "App clients can access patients"
ON public.patients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view all dentists for scheduling" ON public.dentists;
DROP POLICY IF EXISTS "Dentists can manage own record" ON public.dentists;
DROP POLICY IF EXISTS "Dentists can access own record" ON public.dentists;
DROP POLICY IF EXISTS "App clients can access dentists" ON public.dentists;
CREATE POLICY "App clients can access dentists"
ON public.dentists FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can access their appointments" ON public.appointments;
DROP POLICY IF EXISTS "App clients can access appointments" ON public.appointments;
CREATE POLICY "App clients can access appointments"
ON public.appointments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access patient visits" ON public.visits;
DROP POLICY IF EXISTS "Dentists can access patient visits" ON public.visits;
DROP POLICY IF EXISTS "App clients can access visits" ON public.visits;
CREATE POLICY "App clients can access visits"
ON public.visits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access patient payments" ON public.payments;
DROP POLICY IF EXISTS "Dentists can access patient payments" ON public.payments;
DROP POLICY IF EXISTS "App clients can access payments" ON public.payments;
CREATE POLICY "App clients can access payments"
ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Dentists can access medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Allow all operations on medical_history" ON public.medical_history;
DROP POLICY IF EXISTS "App clients can access medical history" ON public.medical_history;
CREATE POLICY "App clients can access medical history"
ON public.medical_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can upload X-rays" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view X-rays" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete X-rays" ON storage.objects;
DROP POLICY IF EXISTS "App clients can upload X-rays" ON storage.objects;
DROP POLICY IF EXISTS "App clients can view X-rays" ON storage.objects;
DROP POLICY IF EXISTS "App clients can delete X-rays" ON storage.objects;

CREATE POLICY "App clients can upload X-rays" ON storage.objects
FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'xrays');

CREATE POLICY "App clients can view X-rays" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'xrays');

CREATE POLICY "App clients can delete X-rays" ON storage.objects
FOR DELETE TO anon, authenticated USING (bucket_id = 'xrays');
