
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contract_generation_unlocked boolean NOT NULL DEFAULT false;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS thirteenth_salary boolean,
  ADD COLUMN IF NOT EXISTS notice_period text,
  ADD COLUMN IF NOT EXISTS probation_period text,
  ADD COLUMN IF NOT EXISTS agency_name text,
  ADD COLUMN IF NOT EXISTS set_id uuid REFERENCES public.contract_sets(id) ON DELETE SET NULL;
