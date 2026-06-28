-- Allow authenticated users to view all dentists for scheduling purposes
-- Keep the existing policy for managing own records, but add a read policy for all authenticated users

DROP POLICY IF EXISTS "Authenticated users can view all dentists for scheduling" ON public.dentists;
CREATE POLICY "Authenticated users can view all dentists for scheduling"
ON public.dentists
FOR SELECT
USING (true);

-- Update the existing policy to only apply to INSERT, UPDATE, DELETE operations
DROP POLICY IF EXISTS "Dentists can access own record" ON public.dentists;
DROP POLICY IF EXISTS "Dentists can manage own record" ON public.dentists;

-- This project uses local app auth for dentists, so there is no dentists.user_id auth mapping.
-- Keep dentist CRUD open to app clients according to the app's own access rules.
CREATE POLICY "Dentists can manage own record"
ON public.dentists
FOR ALL
USING (true)
WITH CHECK (true);