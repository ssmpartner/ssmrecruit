ALTER TABLE public.contract_templates
  ADD COLUMN source_document_id uuid REFERENCES public.contract_documents(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX contract_templates_source_document_unique
  ON public.contract_templates (source_document_id)
  WHERE source_document_id IS NOT NULL;

COMMENT ON COLUMN public.contract_templates.source_document_id IS 'Verweis auf das Bibliotheksdokument, aus dem diese Vorlage per DOCX-Konvertierung erzeugt wurde. Original bleibt massgeblich.';