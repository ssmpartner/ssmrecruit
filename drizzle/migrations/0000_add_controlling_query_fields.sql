ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS controlling_query_open BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS controlling_query_text TEXT,
  ADD COLUMN IF NOT EXISTS controlling_query_by TEXT,
  ADD COLUMN IF NOT EXISTS controlling_query_at TIMESTAMPTZ;