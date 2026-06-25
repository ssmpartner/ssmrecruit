
ALTER TABLE public.contract_letterhead
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS is_default_for_language boolean NOT NULL DEFAULT false;

ALTER TABLE public.contract_sets
  ADD COLUMN IF NOT EXISTS letterhead_id uuid REFERENCES public.contract_letterhead(id) ON DELETE SET NULL;

ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS letterhead_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS docx_storage_path text;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS docx_path text,
  ADD COLUMN IF NOT EXISTS merged_pdf_path text,
  ADD COLUMN IF NOT EXISTS letterhead_mode text,
  ADD COLUMN IF NOT EXISTS letterhead_id uuid REFERENCES public.contract_letterhead(id) ON DELETE SET NULL;
