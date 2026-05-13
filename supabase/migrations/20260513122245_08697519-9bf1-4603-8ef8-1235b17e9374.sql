CREATE TABLE IF NOT EXISTS public.lead_personal_data (
  lead_id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
ALTER TABLE public.lead_personal_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can access lead_personal_data" ON public.lead_personal_data FOR ALL TO authenticated USING (true) WITH CHECK (true);