
-- Update the RLS policy for patients table to allow any authenticated user
DROP POLICY IF EXISTS "Dentists can access all patients" ON public.patients;

CREATE POLICY "Authenticated users can access all patients" 
ON public.patients 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Also update other related policies to be consistent
DROP POLICY IF EXISTS "Dentists can access medical history" ON public.medical_history;

CREATE POLICY "Authenticated users can access medical history" 
ON public.medical_history 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Dentists can access patient visits" ON public.visits;

CREATE POLICY "Authenticated users can access patient visits" 
ON public.visits 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Dentists can access patient payments" ON public.payments;

CREATE POLICY "Authenticated users can access patient payments" 
ON public.payments 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Dentists can access their appointments" ON public.appointments;

CREATE POLICY "Authenticated users can access appointments" 
ON public.appointments 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
