-- Allow authenticated users to view all dentists for scheduling purposes
-- Keep the existing policy for managing own records, but add a read policy for all authenticated users

CREATE POLICY "Authenticated users can view all dentists for scheduling" 
ON public.dentists 
FOR SELECT 
USING (true);

-- Update the existing policy to only apply to INSERT, UPDATE, DELETE operations
DROP POLICY IF EXISTS "Dentists can access own record" ON public.dentists;

CREATE POLICY "Dentists can manage own record" 
ON public.dentists 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);