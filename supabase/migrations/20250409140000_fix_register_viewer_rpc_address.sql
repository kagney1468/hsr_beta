-- Fix register_public_pack_viewer: replace v_prop.address (column does not exist)
-- with a constructed address string from the individual address columns.

CREATE OR REPLACE FUNCTION public.register_public_pack_viewer(
  p_token          text,
  p_viewer_name    text,
  p_viewer_email   text,
  p_viewer_phone   text,
  p_is_selling     boolean,
  p_selling_location text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share      public.shares%ROWTYPE;
  v_prop       public.properties%ROWTYPE;
  v_seller     public.users%ROWTYPE;
  v_agency     public.agencies%ROWTYPE;
  v_agent      public.users%ROWTYPE;
  v_recipients text[] := ARRAY[]::text[];
  v_address    text;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_share
  FROM public.shares
  WHERE token = p_token AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_prop
  FROM public.properties
  WHERE id = v_share.property_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_property');
  END IF;

  -- Build a display address from the individual columns
  SELECT string_agg(part, ', ')
  INTO v_address
  FROM (
    SELECT part FROM (VALUES
      (v_prop.address_line1),
      (v_prop.address_line2),
      (v_prop.address_town),
      (v_prop.address_county),
      (v_prop.address_postcode)
    ) AS t(part)
    WHERE part IS NOT NULL AND trim(part) <> ''
  ) parts;

  v_address := coalesce(v_address, 'Property');

  INSERT INTO public.pack_viewers (
    property_id,
    viewer_name,
    viewer_email,
    viewer_phone,
    viewed_at,
    is_selling,
    selling_location
  ) VALUES (
    v_prop.id,
    p_viewer_name,
    p_viewer_email,
    p_viewer_phone,
    now(),
    coalesce(p_is_selling, false),
    p_selling_location
  );

  -- seller_user_id stores users.id (public UUID), not auth.uid()
  SELECT * INTO v_seller
  FROM public.users
  WHERE id = v_prop.seller_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok',               true,
      'seller_name',      'Seller',
      'property_address', v_address,
      'agency_name',      NULL,
      'recipients',       '[]'::jsonb
    );
  END IF;

  IF v_seller.email IS NOT NULL THEN
    v_recipients := array_append(v_recipients, v_seller.email);
  END IF;

  IF v_seller.agency_id IS NOT NULL THEN
    SELECT * INTO v_agency FROM public.agencies WHERE id = v_seller.agency_id LIMIT 1;
    IF FOUND AND v_agency.agent_user_id IS NOT NULL THEN
      SELECT * INTO v_agent FROM public.users WHERE auth_user_id = v_agency.agent_user_id LIMIT 1;
      IF FOUND AND v_agent.email IS NOT NULL THEN
        v_recipients := array_append(v_recipients, v_agent.email);
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok',               true,
    'seller_name',      coalesce(v_seller.full_name, 'Seller'),
    'property_address', v_address,
    'agency_name',      (SELECT a.agency_name FROM public.agencies a WHERE a.id = v_seller.agency_id LIMIT 1),
    'recipients',       to_jsonb(v_recipients)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_public_pack_viewer(text, text, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_public_pack_viewer(text, text, text, text, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_public_pack_viewer(text, text, text, text, boolean, text) TO authenticated;
