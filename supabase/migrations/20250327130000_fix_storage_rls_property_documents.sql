-- property-documents: sellers upload under {property_id}/… where properties.seller_user_id
-- references public.users.id (not auth.uid()). Match the pattern used on public.properties RLS.

DROP POLICY IF EXISTS "Viewers can read documents via signed URL" ON storage.objects;

DROP POLICY IF EXISTS hsr_storage_prop_docs_select ON storage.objects;
DROP POLICY IF EXISTS hsr_storage_prop_docs_insert ON storage.objects;
DROP POLICY IF EXISTS hsr_storage_prop_docs_update ON storage.objects;
DROP POLICY IF EXISTS hsr_storage_prop_docs_delete ON storage.objects;

-- Seller: object path prefix must be a property owned by current user (via users.auth_user_id).
-- Agent: may access objects under any property id when their users.role is agent.
CREATE POLICY hsr_storage_prop_docs_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT p.id::text
        FROM public.properties p
        WHERE p.seller_user_id = (
          SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.auth_user_id = auth.uid()
            AND lower(trim(coalesce(u.role, ''))) = 'agent'
        )
        AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties)
      )
    )
  );

CREATE POLICY hsr_storage_prop_docs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT p.id::text
        FROM public.properties p
        WHERE p.seller_user_id = (
          SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.auth_user_id = auth.uid()
            AND lower(trim(coalesce(u.role, ''))) = 'agent'
        )
        AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties)
      )
    )
  );

CREATE POLICY hsr_storage_prop_docs_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT p.id::text
        FROM public.properties p
        WHERE p.seller_user_id = (
          SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.auth_user_id = auth.uid()
            AND lower(trim(coalesce(u.role, ''))) = 'agent'
        )
        AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'property-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT p.id::text
        FROM public.properties p
        WHERE p.seller_user_id = (
          SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.auth_user_id = auth.uid()
            AND lower(trim(coalesce(u.role, ''))) = 'agent'
        )
        AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties)
      )
    )
  );

CREATE POLICY hsr_storage_prop_docs_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT p.id::text
        FROM public.properties p
        WHERE p.seller_user_id = (
          SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.auth_user_id = auth.uid()
            AND lower(trim(coalesce(u.role, ''))) = 'agent'
        )
        AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.properties)
      )
    )
  );
