ALTER TABLE public.leads ADD COLUMN lead_lifecycle text NOT NULL DEFAULT 'active';
COMMENT ON COLUMN public.leads.lead_lifecycle IS 'Lifecycle status: active, archived, deleted';