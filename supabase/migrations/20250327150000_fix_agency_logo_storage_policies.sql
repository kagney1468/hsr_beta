-- Ensure agent branding logo uploads/read work for `agency-logos` bucket.
-- Upload path convention: {auth.uid()}/logo.ext

DROP POLICY IF EXISTS hsr_agency_logos_agent_all ON storage.objects;
DROP POLICY IF EXISTS hsr_agency_logos_public_read ON storage.objects;

CREATE POLICY hsr_agency_logos_agent_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY hsr_agency_logos_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'agency-logos');
