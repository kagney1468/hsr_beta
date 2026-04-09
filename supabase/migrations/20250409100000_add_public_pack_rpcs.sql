-- Fix: create public pack RPCs that were missing from production.
-- Note: seller_user_id on properties stores the PUBLIC user id (users.id),
-- NOT auth.uid(). All joins below use users.id accordingly.

-- ── Helper: increment share view count ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_share_view(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.shares
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE token = p_token AND active = true;
$$;

REVOKE ALL ON FUNCTION public.increment_share_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO service_role;

-- ── get_public_pack_share_property ───────────────────────────────────────────
-- Called by the public pack gate page to validate a share token and return
-- basic property data (no sensitive material info — just enough for the gate).

CREATE OR REPLACE FUNCTION public.get_public_pack_share_property(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_share public.shares%ROWTYPE;
  v_prop  public.properties%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 1 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_share
  FROM public.shares
  WHERE token = p_token AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_prop
  FROM public.properties
  WHERE id = v_share.property_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'share',    to_jsonb(v_share),
    'property', to_jsonb(v_prop)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_pack_share_property(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pack_share_property(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_pack_share_property(text) TO authenticated;

-- ── get_public_pack_details ──────────────────────────────────────────────────
-- Returns material information, documents, and agency branding for a valid
-- share token. Called after the viewer has registered.

CREATE OR REPLACE FUNCTION public.get_public_pack_details(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_share     public.shares%ROWTYPE;
  v_prop      public.properties%ROWTYPE;
  v_mat       public.material_information%ROWTYPE;
  v_docs      jsonb;
  v_agency    jsonb;
  v_found_mat boolean;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 1 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_share
  FROM public.shares
  WHERE token = p_token AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_prop
  FROM public.properties
  WHERE id = v_share.property_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_mat
  FROM public.material_information
  WHERE property_id = v_prop.id
  LIMIT 1;
  v_found_mat := FOUND;

  SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
  INTO v_docs
  FROM public.documents d
  WHERE d.property_id = v_prop.id;

  -- seller_user_id stores users.id (public UUID), not auth.uid()
  SELECT to_jsonb(a) INTO v_agency
  FROM public.users u
  JOIN public.agencies a ON a.id = u.agency_id
  WHERE u.id = v_prop.seller_user_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'material_information', CASE WHEN v_found_mat THEN to_jsonb(v_mat) ELSE NULL END,
    'documents',            coalesce(v_docs, '[]'::jsonb),
    'agency',               v_agency
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_pack_details(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pack_details(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_pack_details(text) TO authenticated;

-- ── register_public_pack_viewer ──────────────────────────────────────────────
-- Registers a viewer and returns recipient emails for the notification.

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
      'property_address', coalesce(v_prop.address, 'Property'),
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
    'property_address', coalesce(v_prop.address, 'Property'),
    'agency_name',      (SELECT a.agency_name FROM public.agencies a WHERE a.id = v_seller.agency_id LIMIT 1),
    'recipients',       to_jsonb(v_recipients)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_public_pack_viewer(text, text, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_public_pack_viewer(text, text, text, text, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_public_pack_viewer(text, text, text, text, boolean, text) TO authenticated;

-- ── get_property_intelligence_by_token ───────────────────────────────────────
-- Returns property intelligence data for a valid share token (public pack view).

CREATE OR REPLACE FUNCTION public.get_property_intelligence_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id text;
BEGIN
  SELECT s.property_id::text INTO v_property_id
  FROM shares s
  WHERE s.token = p_token AND s.active = true
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

GRANT EXECUTE ON FUNCTION public.get_property_intelligence_by_token(text) TO anon, authenticated;
