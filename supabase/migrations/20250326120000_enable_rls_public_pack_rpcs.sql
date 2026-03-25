-- Row Level Security + public pack access via SECURITY DEFINER RPCs only (no broad anon SELECT).
-- Apply with: supabase db push / SQL editor on the linked project.

-- ---------------------------------------------------------------------------
-- Public pack RPCs (anon may EXECUTE; tables stay protected by RLS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_pack_share_property(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_share public.shares%ROWTYPE;
  v_prop public.properties%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 1 THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_share FROM public.shares WHERE token = p_token AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_prop FROM public.properties WHERE id = v_share.property_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'share', to_jsonb(v_share),
    'property', to_jsonb(v_prop)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_pack_details(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_share public.shares%ROWTYPE;
  v_prop public.properties%ROWTYPE;
  v_mat public.material_information%ROWTYPE;
  v_docs jsonb;
  v_agency jsonb;
  v_found_mat boolean;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 1 THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_share FROM public.shares WHERE token = p_token AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_prop FROM public.properties WHERE id = v_share.property_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_mat FROM public.material_information WHERE property_id = v_prop.id LIMIT 1;
  v_found_mat := FOUND;

  SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
  INTO v_docs
  FROM public.documents d
  WHERE d.property_id = v_prop.id;

  SELECT to_jsonb(a) INTO v_agency
  FROM public.users u
  JOIN public.agencies a ON a.id = u.agency_id
  WHERE u.auth_user_id = v_prop.seller_user_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'material_information', CASE WHEN v_found_mat THEN to_jsonb(v_mat) ELSE NULL END,
    'documents', coalesce(v_docs, '[]'::jsonb),
    'agency', v_agency
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.register_public_pack_viewer(
  p_token text,
  p_viewer_name text,
  p_viewer_email text,
  p_viewer_phone text,
  p_is_selling boolean,
  p_selling_location text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share public.shares%ROWTYPE;
  v_prop public.properties%ROWTYPE;
  v_seller public.users%ROWTYPE;
  v_agency public.agencies%ROWTYPE;
  v_agent public.users%ROWTYPE;
  v_recipients text[] := ARRAY[]::text[];
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_share FROM public.shares WHERE token = p_token AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_prop FROM public.properties WHERE id = v_share.property_id;
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
  )
  VALUES (
    v_prop.id,
    p_viewer_name,
    p_viewer_email,
    p_viewer_phone,
    now(),
    coalesce(p_is_selling, false),
    p_selling_location
  );

  SELECT * INTO v_seller FROM public.users WHERE auth_user_id = v_prop.seller_user_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'seller_name', 'Seller',
      'property_address', coalesce(v_prop.address, 'Property'),
      'agency_name', NULL,
      'recipients', '[]'::jsonb
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
    'ok', true,
    'seller_name', coalesce(v_seller.full_name, 'Seller'),
    'property_address', coalesce(v_prop.address, 'Property'),
    'agency_name', (SELECT a.agency_name FROM public.agencies a WHERE a.id = v_seller.agency_id LIMIT 1),
    'recipients', to_jsonb(v_recipients)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_pack_share_property(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pack_share_property(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_pack_share_property(text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_pack_details(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pack_details(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_pack_details(text) TO authenticated;

REVOKE ALL ON FUNCTION public.register_public_pack_viewer(text, text, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_public_pack_viewer(text, text, text, text, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_public_pack_viewer(text, text, text, text, boolean, text) TO authenticated;

-- Helpers: avoid infinite RLS recursion when policies on `users` query `users`.
CREATE OR REPLACE FUNCTION public.hsr_is_agent()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.role = 'agent'
  );
$$;

CREATE OR REPLACE FUNCTION public.hsr_current_user_agency_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT agency_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.hsr_is_agent() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hsr_is_agent() TO authenticated;

REVOKE ALL ON FUNCTION public.hsr_current_user_agency_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hsr_current_user_agency_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS on application tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_viewers ENABLE ROW LEVEL SECURITY;

-- Idempotent re-apply (same policy names only)
DROP POLICY IF EXISTS hsr_agencies_agent_manage ON public.agencies;
DROP POLICY IF EXISTS hsr_agencies_agent_read_all ON public.agencies;
DROP POLICY IF EXISTS hsr_users_own ON public.users;
DROP POLICY IF EXISTS hsr_users_agent_read ON public.users;
DROP POLICY IF EXISTS hsr_properties_seller_rw ON public.properties;
DROP POLICY IF EXISTS hsr_properties_agent_select ON public.properties;
DROP POLICY IF EXISTS hsr_mi_seller ON public.material_information;
DROP POLICY IF EXISTS hsr_mi_agent_select ON public.material_information;
DROP POLICY IF EXISTS hsr_documents_seller ON public.documents;
DROP POLICY IF EXISTS hsr_documents_agent_select ON public.documents;
DROP POLICY IF EXISTS hsr_decl_seller ON public.seller_declarations;
DROP POLICY IF EXISTS hsr_decl_agent_select ON public.seller_declarations;
DROP POLICY IF EXISTS hsr_shares_seller ON public.shares;
DROP POLICY IF EXISTS hsr_shares_agent_select ON public.shares;
DROP POLICY IF EXISTS hsr_viewers_seller ON public.pack_viewers;
DROP POLICY IF EXISTS hsr_viewers_agent_select ON public.pack_viewers;

-- agencies
CREATE POLICY hsr_agencies_agent_manage ON public.agencies
  FOR ALL TO authenticated
  USING (
    agent_user_id = (SELECT auth.uid())
    OR id = public.hsr_current_user_agency_id()
  )
  WITH CHECK (
    agent_user_id = (SELECT auth.uid())
    OR id = public.hsr_current_user_agency_id()
  );

CREATE POLICY hsr_agencies_agent_read_all ON public.agencies
  FOR SELECT TO authenticated
  USING (public.hsr_is_agent());

-- users
CREATE POLICY hsr_users_own ON public.users
  FOR ALL TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

CREATE POLICY hsr_users_agent_read ON public.users
  FOR SELECT TO authenticated
  USING (public.hsr_is_agent());

-- properties (seller owns; agents read all)
CREATE POLICY hsr_properties_seller_rw ON public.properties
  FOR ALL TO authenticated
  USING (seller_user_id = (SELECT auth.uid()))
  WITH CHECK (seller_user_id = (SELECT auth.uid()));

CREATE POLICY hsr_properties_agent_select ON public.properties
  FOR SELECT TO authenticated
  USING (public.hsr_is_agent());

-- material_information
CREATE POLICY hsr_mi_seller ON public.material_information
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = material_information.property_id AND p.seller_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = material_information.property_id AND p.seller_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY hsr_mi_agent_select ON public.material_information
  FOR SELECT TO authenticated
  USING (public.hsr_is_agent());

-- documents
CREATE POLICY hsr_documents_seller ON public.documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = documents.property_id AND p.seller_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = documents.property_id AND p.seller_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY hsr_documents_agent_select ON public.documents
  FOR SELECT TO authenticated
  USING (public.hsr_is_agent());

-- seller_declarations
CREATE POLICY hsr_decl_seller ON public.seller_declarations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = seller_declarations.property_id AND p.seller_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = seller_declarations.property_id AND p.seller_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY hsr_decl_agent_select ON public.seller_declarations
  FOR SELECT TO authenticated
  USING (public.hsr_is_agent());

-- shares
CREATE POLICY hsr_shares_seller ON public.shares
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = shares.property_id AND p.seller_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = shares.property_id AND p.seller_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY hsr_shares_agent_select ON public.shares
  FOR SELECT TO authenticated
  USING (public.hsr_is_agent());

-- pack_viewers
CREATE POLICY hsr_viewers_seller ON public.pack_viewers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = pack_viewers.property_id AND p.seller_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = pack_viewers.property_id AND p.seller_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY hsr_viewers_agent_select ON public.pack_viewers
  FOR SELECT TO authenticated
  USING (public.hsr_is_agent());

-- ---------------------------------------------------------------------------
-- Storage: private bucket — authenticated sellers/agents only (signed URLs)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS hsr_storage_prop_docs_select ON storage.objects;
DROP POLICY IF EXISTS hsr_storage_prop_docs_insert ON storage.objects;
DROP POLICY IF EXISTS hsr_storage_prop_docs_update ON storage.objects;
DROP POLICY IF EXISTS hsr_storage_prop_docs_delete ON storage.objects;
DROP POLICY IF EXISTS hsr_agency_logos_agent_all ON storage.objects;
DROP POLICY IF EXISTS hsr_agency_logos_public_read ON storage.objects;

CREATE POLICY hsr_storage_prop_docs_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.properties WHERE seller_user_id = (SELECT auth.uid())
      )
      OR (
        public.hsr_is_agent()
        AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties)
      )
    )
  );

CREATE POLICY hsr_storage_prop_docs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.properties WHERE seller_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY hsr_storage_prop_docs_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.properties WHERE seller_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY hsr_storage_prop_docs_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.properties WHERE seller_user_id = (SELECT auth.uid())
    )
  );

-- agency-logos: agents upload under {auth.uid()}/…; public read for getPublicUrl()
CREATE POLICY hsr_agency_logos_agent_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY hsr_agency_logos_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'agency-logos');
