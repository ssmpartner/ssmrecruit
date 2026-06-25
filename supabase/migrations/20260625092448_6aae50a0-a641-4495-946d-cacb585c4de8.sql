
CREATE POLICY "contracts_bucket_superadmin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contracts' AND public.has_role(auth.uid(),'superadmin'::app_role));
CREATE POLICY "contracts_bucket_superadmin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts' AND public.has_role(auth.uid(),'superadmin'::app_role));
CREATE POLICY "contracts_bucket_superadmin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'contracts' AND public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (bucket_id = 'contracts' AND public.has_role(auth.uid(),'superadmin'::app_role));
CREATE POLICY "contracts_bucket_superadmin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contracts' AND public.has_role(auth.uid(),'superadmin'::app_role));
