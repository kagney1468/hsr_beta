-- Align public.material_information with PropertyProfile.tsx (and completion.ts) field names.
-- Adds text columns referenced by the app; converts legacy boolean columns to text labels.

-- Columns referenced in PropertyProfile load/upsert that were missing from the database
ALTER TABLE public.material_information
  ADD COLUMN IF NOT EXISTS mobile_signal text,
  ADD COLUMN IF NOT EXISTS parking text,
  ADD COLUMN IF NOT EXISTS restrictions text,
  ADD COLUMN IF NOT EXISTS rights_easements text,
  ADD COLUMN IF NOT EXISTS flood_risk text,
  ADD COLUMN IF NOT EXISTS coastal_erosion text,
  ADD COLUMN IF NOT EXISTS planning_permissions text;

-- App uses string selects (e.g. "Mains"); legacy column was boolean
ALTER TABLE public.material_information
  ALTER COLUMN electricity_supply DROP DEFAULT;

ALTER TABLE public.material_information
  ALTER COLUMN electricity_supply TYPE text USING (
    CASE
      WHEN electricity_supply IS TRUE THEN 'Mains'
      WHEN electricity_supply IS FALSE THEN 'Off-grid / Generator'
      ELSE NULL
    END
  );

ALTER TABLE public.material_information
  ALTER COLUMN electricity_supply SET DEFAULT 'Mains';

-- App uses "Yes" / "No" strings; legacy column was boolean
ALTER TABLE public.material_information
  ALTER COLUMN coalfield_area DROP DEFAULT;

ALTER TABLE public.material_information
  ALTER COLUMN coalfield_area TYPE text USING (
    CASE
      WHEN coalfield_area IS TRUE THEN 'Yes'
      WHEN coalfield_area IS FALSE THEN 'No'
      ELSE 'No'
    END
  );

ALTER TABLE public.material_information
  ALTER COLUMN coalfield_area SET DEFAULT 'No';
