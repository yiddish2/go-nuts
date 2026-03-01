
-- Add unique constraint on nut names to prevent duplicates
ALTER TABLE public.nuts ADD CONSTRAINT nuts_name_unique UNIQUE (name);
