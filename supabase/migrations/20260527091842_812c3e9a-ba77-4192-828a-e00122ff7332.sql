
-- Add version + source tracking to lead_personal_data
ALTER TABLE public.lead_personal_data
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_via text NOT NULL DEFAULT 'internal';

-- Versions history table
CREATE TABLE IF NOT EXISTS public.lead_personal_data_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  version integer NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'System',
  updated_via text NOT NULL DEFAULT 'internal'
);

GRANT SELECT, INSERT ON public.lead_personal_data_versions TO authenticated;
GRANT INSERT ON public.lead_personal_data_versions TO anon;
GRANT ALL ON public.lead_personal_data_versions TO service_role;

ALTER TABLE public.lead_personal_data_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can access personal data versions"
  ON public.lead_personal_data_versions
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can insert personal data versions"
  ON public.lead_personal_data_versions
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lpd_versions_lead_id ON public.lead_personal_data_versions(lead_id, version DESC);

-- Personnel requests (token-based public form)
CREATE TABLE IF NOT EXISTS public.personnel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'pending',
  sent_via text NOT NULL DEFAULT 'manual',
  sent_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  completed_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personnel_requests TO authenticated;
GRANT SELECT, UPDATE ON public.personnel_requests TO anon;
GRANT ALL ON public.personnel_requests TO service_role;

ALTER TABLE public.personnel_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can access personnel_requests"
  ON public.personnel_requests
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read personnel_requests by token"
  ON public.personnel_requests
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can update personnel_requests"
  ON public.personnel_requests
  FOR UPDATE TO anon
  USING (true) WITH CHECK (true);
