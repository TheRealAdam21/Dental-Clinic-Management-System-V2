-- Store dentist login credentials for web/mobile clients using local app auth.
ALTER TABLE public.dentists
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS password text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dentists_username
  ON public.dentists (lower(username))
  WHERE username IS NOT NULL;
