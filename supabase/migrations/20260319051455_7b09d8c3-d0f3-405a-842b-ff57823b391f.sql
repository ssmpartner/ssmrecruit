
-- Insights requests table
CREATE TABLE public.insights_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'pending',
  sent_via text NOT NULL DEFAULT 'manual',
  sent_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  reminder_sent_at timestamptz,
  responses jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Document requests table
CREATE TABLE public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'pending',
  sent_via text NOT NULL DEFAULT 'manual',
  sent_at timestamptz NOT NULL DEFAULT now(),
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Document uploads table
CREATE TABLE public.document_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.document_requests(id) ON DELETE CASCADE,
  lead_id text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'other',
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insights_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage requests
CREATE POLICY "Authenticated can access insights_requests" ON public.insights_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can access document_requests" ON public.document_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can access document_uploads" ON public.document_uploads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon users can read/update insights requests by token (for public form)
CREATE POLICY "Anon can read insights by token" ON public.insights_requests FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update insights by token" ON public.insights_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Anon can read document requests by token
CREATE POLICY "Anon can read document_requests by token" ON public.document_requests FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update document_requests by token" ON public.document_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Anon can insert document uploads
CREATE POLICY "Anon can insert document_uploads" ON public.document_uploads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read document_uploads" ON public.document_uploads FOR SELECT TO anon USING (true);

-- Storage bucket for lead documents
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-documents', 'lead-documents', true);

-- Storage policies for lead-documents bucket
CREATE POLICY "Anyone can upload lead documents" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'lead-documents');
CREATE POLICY "Anyone can read lead documents" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'lead-documents');
CREATE POLICY "Authenticated can delete lead documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lead-documents');

-- Enable realtime for tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.insights_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_uploads;
