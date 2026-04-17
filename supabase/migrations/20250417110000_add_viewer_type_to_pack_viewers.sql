-- Add viewer type and company name to pack_viewers
ALTER TABLE pack_viewers
  ADD COLUMN IF NOT EXISTS viewer_type   text DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS company_name  text;

-- Update the register_public_pack_viewer RPC to accept new fields
CREATE OR REPLACE FUNCTION register_public_pack_viewer(
  p_token            text,
  p_viewer_name      text,
  p_viewer_email     text,
  p_viewer_phone     text,
  p_is_selling       boolean,
  p_selling_location text DEFAULT NULL,
  p_viewer_type      text DEFAULT 'buyer',
  p_company_name     text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id   uuid;
  v_seller_id     uuid;
  v_seller_name   text;
  v_seller_email  text;
  v_agent_email   text;
  v_property_addr text;
  v_agency_name   text;
  v_recipients    text[];
BEGIN
  SELECT id, seller_user_id
  INTO v_property_id, v_seller_id
  FROM properties
  WHERE shareable_link_token = p_token
    AND is_link_active = true
  LIMIT 1;

  IF v_property_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Invalid or inactive pack link');
  END IF;

  SELECT full_name, email
  INTO v_seller_name, v_seller_email
  FROM users
  WHERE id = v_seller_id;

  SELECT u.email, a.agency_name
  INTO v_agent_email, v_agency_name
  FROM users u
  JOIN agencies a ON a.agent_user_id = u.id
  WHERE a.id = (SELECT agency_id FROM users WHERE id = v_seller_id)
  LIMIT 1;

  SELECT TRIM(CONCAT_WS(', ',
    address_line1,
    NULLIF(address_line2, ''),
    address_town,
    address_postcode
  ))
  INTO v_property_addr
  FROM properties
  WHERE id = v_property_id;

  INSERT INTO pack_viewers (
    property_id, viewer_name, viewer_email, viewer_phone,
    is_selling, selling_location, viewer_type, company_name, viewed_at
  ) VALUES (
    v_property_id, p_viewer_name, p_viewer_email, p_viewer_phone,
    p_is_selling, p_selling_location, p_viewer_type, p_company_name, NOW()
  )
  ON CONFLICT DO NOTHING;

  v_recipients := ARRAY[]::text[];
  IF v_seller_email IS NOT NULL THEN
    v_recipients := array_append(v_recipients, v_seller_email);
  END IF;
  IF v_agent_email IS NOT NULL AND v_agent_email <> v_seller_email THEN
    v_recipients := array_append(v_recipients, v_agent_email);
  END IF;

  RETURN json_build_object(
    'ok',               true,
    'property_id',      v_property_id,
    'seller_name',      COALESCE(v_seller_name, 'Seller'),
    'property_address', COALESCE(v_property_addr, 'the property'),
    'agency_name',      v_agency_name,
    'recipients',       v_recipients
  );
END;
$$;
