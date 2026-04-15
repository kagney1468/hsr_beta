-- Track when an inactivity reminder was last sent so we don't spam sellers.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS last_inactivity_email timestamptz;
