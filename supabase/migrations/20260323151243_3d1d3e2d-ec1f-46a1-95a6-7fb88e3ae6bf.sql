
CREATE TABLE public.assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  disc_scores jsonb NOT NULL DEFAULT '{}',
  motivator_scores jsonb NOT NULL DEFAULT '{}',
  wizard_answers jsonb NOT NULL DEFAULT '{}',
  scores jsonb NOT NULL DEFAULT '{}',
  match_result jsonb NOT NULL DEFAULT '{}',
  recommendation text NOT NULL DEFAULT '',
  report_sections jsonb NOT NULL DEFAULT '{}',
  summary jsonb NOT NULL DEFAULT '{}',
  raw_ai_response jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can access assessment_results" ON public.assessment_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can insert assessment_results" ON public.assessment_results FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read assessment_results" ON public.assessment_results FOR SELECT TO anon USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_results;
