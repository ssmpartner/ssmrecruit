
CREATE TABLE public.appointment_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  insights_request_id uuid REFERENCES public.insights_requests(id) ON DELETE CASCADE,
  suggested_date text NOT NULL,
  suggested_time text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response_note text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone
);

ALTER TABLE public.appointment_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can access appointment_suggestions"
  ON public.appointment_suggestions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can insert appointment_suggestions"
  ON public.appointment_suggestions FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read own suggestions"
  ON public.appointment_suggestions FOR SELECT TO anon
  USING (true);
