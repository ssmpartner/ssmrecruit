REVOKE ALL ON public.personnel_requests FROM anon;
DROP POLICY IF EXISTS "Public can read feedback attachments" ON storage.objects;
CREATE POLICY "Authenticated can read feedback attachments" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'feedback-attachments');