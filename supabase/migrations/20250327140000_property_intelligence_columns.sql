-- Phase 4: Property Intelligence Engine
-- Adds recent_sales column, unique constraint for upsert, and public RPC

-- 1. Add recent_sales column for Land Registry price paid data
ALTER TABLE property_intelligence
  ADD COLUMN IF NOT EXISTS recent_sales jsonb;

-- 2. Remove any duplicate property_id rows before adding unique constraint
--    (keeps the most recently inserted row per property_id)
DELETE FROM property_intelligence a
USING (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY created_at DESC NULLS LAST) AS rn
  FROM property_intelligence
) b
WHERE a.id = b.id AND b.rn > 1;

-- 3. Add unique constraint on property_id so upsert works
DO $$ BEGIN
  ALTER TABLE property_intelligence
    ADD CONSTRAINT property_intelligence_property_id_key UNIQUE (property_id);
EXCEPTION WHEN duplicate_table THEN
  -- constraint already exists, ignore
  NULL;
END $$;

-- 4. RPC: get intelligence data for a public pack via share token
--    Uses SECURITY DEFINER to bypass RLS (token already validates access)
CREATE OR REPLACE FUNCTION get_property_intelligence_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id text;
BEGIN
  -- Validate token and resolve property_id
  SELECT s.property_id::text INTO v_property_id
  FROM shares s
  WHERE s.token = p_token
    AND s.active = true
  LIMIT 1;

  IF v_property_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'intelligence',
    (SELECT row_to_json(pi)
     FROM property_intelligence pi
     WHERE pi.property_id = v_property_id),

    'schools',
    COALESCE(
      (SELECT json_agg(row_to_json(ns) ORDER BY ns.distance_miles)
       FROM nearby_schools ns
       WHERE ns.property_id = v_property_id),
      '[]'::json
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_property_intelligence_by_token(text) TO anon, authenticated;
