
-- Table to store status wizard completion results
CREATE TABLE public.status_wizard_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  wizard_type text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback text NOT NULL DEFAULT '',
  completed_by text NOT NULL DEFAULT '',
  original_employee_id text NOT NULL DEFAULT '',
  lead_withdrawn boolean NOT NULL DEFAULT false,
  reassigned_to text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.status_wizard_results ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated can read status_wizard_results" ON public.status_wizard_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert status_wizard_results" ON public.status_wizard_results
  FOR INSERT TO authenticated WITH CHECK (true);

-- Add original_employee_id to leads for statistics tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS original_employee_id text NOT NULL DEFAULT '';

-- Add callback_count to leads for tracking reminder count
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS callback_count integer NOT NULL DEFAULT 0;
