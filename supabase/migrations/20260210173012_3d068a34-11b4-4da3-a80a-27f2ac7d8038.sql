
-- Create allowed_emails table for whitelisting admins and workers
CREATE TABLE public.allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can manage allowed emails
CREATE POLICY "Admins can view allowed emails"
  ON public.allowed_emails FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert allowed emails"
  ON public.allowed_emails FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update allowed emails"
  ON public.allowed_emails FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete allowed emails"
  ON public.allowed_emails FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed your email as admin
INSERT INTO public.allowed_emails (email, role) VALUES ('mordechaimuller2@gmail.com', 'admin');

-- Create/replace the trigger function to auto-assign roles on signup based on allowed_emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _allowed_role app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  -- Check if email is in allowed list and assign role
  SELECT role INTO _allowed_role
  FROM public.allowed_emails
  WHERE lower(email) = lower(NEW.email);

  IF _allowed_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _allowed_role);
  END IF;

  RETURN NEW;
END;
$$;
