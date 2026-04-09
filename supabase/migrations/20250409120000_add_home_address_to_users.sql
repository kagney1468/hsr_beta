-- Add home address fields to the users table for seller profile.
-- These columns are referenced by SellerProfile.tsx but were never migrated.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS home_address_line1    text,
  ADD COLUMN IF NOT EXISTS home_address_line2    text,
  ADD COLUMN IF NOT EXISTS home_address_town     text,
  ADD COLUMN IF NOT EXISTS home_address_county   text,
  ADD COLUMN IF NOT EXISTS home_address_city     text,
  ADD COLUMN IF NOT EXISTS home_address_postcode text;

-- Also ensure contact_preference exists (used by same form)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS contact_preference text DEFAULT 'email';
