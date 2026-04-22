-- Sprint 5 — Professional portal foundation
-- Adds: firms table, professional columns on users, pack_reference on properties

-- ── 1. firms table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.firms (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name         text NOT NULL,
  company_number    text NOT NULL UNIQUE,
  registered_office text,
  created_at        timestamp with time zone DEFAULT now()
);

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read firms"
  ON public.firms FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert firms"
  ON public.firms FOR INSERT
  TO authenticated WITH CHECK (true);

-- ── 2. Professional columns on users ─────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS firm_id           uuid REFERENCES public.firms(id),
  ADD COLUMN IF NOT EXISTS profession_type   text,
  ADD COLUMN IF NOT EXISTS regulatory_body   text,
  ADD COLUMN IF NOT EXISTS regulatory_number text;

-- ── 3. pack_reference on properties ──────────────────────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS pack_reference text UNIQUE;

-- ── 4. Function to generate the reference ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_pack_reference(p_postcode text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_area    text;
  v_seq     int;
  v_ref     text;
BEGIN
  v_area := upper(regexp_replace(trim(p_postcode), '^([A-Za-z]+).*', '\1'));

  SELECT COUNT(*) + 1
    INTO v_seq
    FROM public.properties
   WHERE pack_reference LIKE 'HSR-' || v_area || '-%';

  v_ref := 'HSR-' || v_area || '-' || lpad(v_seq::text, 4, '0');

  RETURN v_ref;
END;
$$;

-- ── 5. Trigger to auto-assign reference on property insert ────────────────────
CREATE OR REPLACE FUNCTION public.assign_pack_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pack_reference IS NULL AND NEW.address_postcode IS NOT NULL THEN
    NEW.pack_reference := public.generate_pack_reference(NEW.address_postcode);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_pack_reference ON public.properties;

CREATE TRIGGER trg_assign_pack_reference
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_pack_reference();

-- ── 6. Back-fill references for existing properties ───────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, address_postcode
      FROM public.properties
     WHERE pack_reference IS NULL
       AND address_postcode IS NOT NULL
     ORDER BY created_at ASC
  LOOP
    UPDATE public.properties
       SET pack_reference = public.generate_pack_reference(r.address_postcode)
     WHERE id = r.id;
  END LOOP;
END;
$$;
