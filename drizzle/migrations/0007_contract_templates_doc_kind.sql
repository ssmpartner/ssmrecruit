ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS doc_kind text NOT NULL DEFAULT 'contract';
ALTER TABLE public.contract_templates DROP CONSTRAINT IF EXISTS contract_templates_doc_kind_check;
ALTER TABLE public.contract_templates ADD CONSTRAINT contract_templates_doc_kind_check CHECK (doc_kind IN ('contract','annex'));