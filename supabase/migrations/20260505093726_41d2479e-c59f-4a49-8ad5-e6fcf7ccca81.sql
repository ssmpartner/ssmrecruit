
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.feedback_comments ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-attachments', 'feedback-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload feedback attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'feedback-attachments');

CREATE POLICY "Public can read feedback attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'feedback-attachments');

CREATE POLICY "Authenticated can delete own feedback attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'feedback-attachments' AND owner = auth.uid());
