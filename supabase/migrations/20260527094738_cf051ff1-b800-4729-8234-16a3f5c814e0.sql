ALTER TABLE public.document_requests 
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'application';

-- restrict to known values
DO $$ BEGIN
  ALTER TABLE public.document_requests
    ADD CONSTRAINT document_requests_kind_check
    CHECK (kind IN ('application','employment'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS document_requests_kind_idx ON public.document_requests(kind);