-- Applications table for job applications via website forms
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salutation text NOT NULL DEFAULT '',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  birth_date text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Schweiz',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  cv_path text,
  motivation_letter_path text,
  attachment_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_privacy boolean NOT NULL DEFAULT false,
  consent_email_contract boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'incomplete',
  lead_id text,
  agency_id text,
  source text NOT NULL DEFAULT 'website',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert applications"
  ON public.applications FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can access applications"
  ON public.applications FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anon can upload application documents"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'application-documents');

CREATE POLICY "Authenticated can read application documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'application-documents');
