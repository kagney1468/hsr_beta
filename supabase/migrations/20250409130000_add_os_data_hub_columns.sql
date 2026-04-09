-- Add OS Data Hub columns to property_intelligence
ALTER TABLE public.property_intelligence
  ADD COLUMN IF NOT EXISTS os_map       jsonb,
  ADD COLUMN IF NOT EXISTS conservation jsonb,
  ADD COLUMN IF NOT EXISTS green_spaces jsonb;
