CREATE TABLE public.lead_document_waivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  waived_by TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (lead_id, doc_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_document_waivers TO authenticated;
GRANT ALL ON public.lead_document_waivers TO service_role;

ALTER TABLE public.lead_document_waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Waivers scoped by lead access"
ON public.lead_document_waivers
FOR ALL
TO authenticated
USING (public.can_access_lead(lead_id))
WITH CHECK (public.can_access_lead(lead_id));

CREATE INDEX idx_lead_document_waivers_lead ON public.lead_document_waivers(lead_id);