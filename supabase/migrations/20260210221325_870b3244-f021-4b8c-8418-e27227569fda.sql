
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert (needed for logging failed attempts from anon users)
CREATE POLICY "Anyone can insert login attempts"
ON public.login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can delete old logs
CREATE POLICY "Admins can delete login attempts"
ON public.login_attempts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
