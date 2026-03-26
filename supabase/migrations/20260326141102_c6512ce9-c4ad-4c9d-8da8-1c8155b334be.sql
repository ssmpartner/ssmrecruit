
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS approval_stage text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS approval_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_by_role text NOT NULL DEFAULT '';
