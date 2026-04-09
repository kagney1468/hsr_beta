-- Add EPC column to property_intelligence for storing EPC API results
ALTER TABLE public.property_intelligence
  ADD COLUMN IF NOT EXISTS epc jsonb;
