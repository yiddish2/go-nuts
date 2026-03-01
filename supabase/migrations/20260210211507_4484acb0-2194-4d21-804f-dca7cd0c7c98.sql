
-- Create a security definer function to check if an email is whitelisted
-- This allows unauthenticated users to verify without exposing the table
CREATE OR REPLACE FUNCTION public.is_email_allowed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails WHERE lower(email) = lower(_email)
  )
$$;
