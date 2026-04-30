ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS not_reached_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS not_reached_last_at timestamptz;