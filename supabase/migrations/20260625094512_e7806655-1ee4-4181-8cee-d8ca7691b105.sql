
-- Zusätzliche Anhang-Kategorien (idempotent)
INSERT INTO public.contract_categories (code, label_de, is_attachment, sort_order) VALUES
  ('reglement_geschaeftsintern',     'Geschäftsinternes Reglement',                true, 200),
  ('reglement_score_ma',             'Score-Punkte-Reglement MA',                  true, 210),
  ('reglement_score_fk',             'Score-Punkte-Reglement FK',                  true, 220),
  ('reglement_bonus',                'Bonusreglement',                             true, 230),
  ('reglement_gratifikation',        'Gratifikationsreglement',                    true, 240),
  ('reglement_spesen',               'Spesenreglement',                            true, 250),
  ('reglement_ferien',               'Ferien-, Feiertags- und Urlaubsreglement',   true, 260),
  ('reglement_termin_feedback',      'Termin- und Feedbackreglement',              true, 270),
  ('reglement_compliance',           'Compliance-Reglement',                       true, 280),
  ('vorgabewesen',                   'Vorgabewesen',                               true, 290),
  ('verhaltenskodex',                'Verhaltenskodex',                            true, 300),
  ('vbv_weiterbildung',              'VBV-Weiterbildungsvereinbarung',             true, 310),
  ('iaf_weiterbildung',              'IAF-Weiterbildungsvereinbarung',             true, 320)
ON CONFLICT (code) DO NOTHING;

-- Hauptbibliothek
CREATE TABLE IF NOT EXISTS public.contract_documents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  doc_type              text NOT NULL DEFAULT 'attachment',
    -- 'contract' | 'attachment' | 'reference'
  kind_code             text REFERENCES public.contract_kinds(code)         ON UPDATE CASCADE,
  category_code         text REFERENCES public.contract_categories(code)    ON UPDATE CASCADE,
  target_group_code     text REFERENCES public.contract_target_groups(code) ON UPDATE CASCADE,
  area                  text,                              -- 'sales' | 'office' | NULL
  language              text NOT NULL DEFAULT 'de',        -- 'de' | 'fr' | 'it'
  version               int  NOT NULL DEFAULT 1,
  valid_from            date,
  valid_to              date,
  status                text NOT NULL DEFAULT 'draft',     -- 'draft' | 'active' | 'archived'
  is_mandatory_attachment boolean NOT NULL DEFAULT false,
  is_optional_attachment  boolean NOT NULL DEFAULT false,
  is_careerplan_relevant  boolean NOT NULL DEFAULT false,
  is_leadership_relevant  boolean NOT NULL DEFAULT false,
  original_storage_path text,                              -- Originaldatei (unveränderlich)
  original_mime_type    text,
  original_size_bytes   bigint,
  original_filename     text,
  template_storage_path text,                              -- bearbeitbare Vorlage (.docx)
  template_mime_type    text,
  template_size_bytes   bigint,
  template_filename     text,
  notes                 text,
  created_by            uuid,
  updated_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (doc_type IN ('contract','attachment','reference')),
  CHECK (status IN ('draft','active','archived')),
  CHECK (area IS NULL OR area IN ('sales','office')),
  CHECK (language IN ('de','fr','it'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_documents TO authenticated;
GRANT ALL ON public.contract_documents TO service_role;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_documents read auth active or superadmin"
  ON public.contract_documents FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );
CREATE POLICY "contract_documents superadmin insert"
  ON public.contract_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "contract_documents superadmin update"
  ON public.contract_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "contract_documents superadmin delete"
  ON public.contract_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_contract_documents_updated
  BEFORE UPDATE ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_contract_documents_status   ON public.contract_documents(status);
CREATE INDEX IF NOT EXISTS idx_contract_documents_kind     ON public.contract_documents(kind_code);
CREATE INDEX IF NOT EXISTS idx_contract_documents_category ON public.contract_documents(category_code);
CREATE INDEX IF NOT EXISTS idx_contract_documents_target   ON public.contract_documents(target_group_code);

-- Versionshistorie (Originaldateien bleiben erhalten)
CREATE TABLE IF NOT EXISTS public.contract_document_versions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         uuid NOT NULL REFERENCES public.contract_documents(id) ON DELETE CASCADE,
  version             int  NOT NULL,
  snapshot            jsonb NOT NULL,           -- vollständige Metadaten zum Zeitpunkt
  original_storage_path text,
  template_storage_path text,
  change_note         text,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);
GRANT SELECT, INSERT ON public.contract_document_versions TO authenticated;
GRANT ALL ON public.contract_document_versions TO service_role;
ALTER TABLE public.contract_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_doc_versions read superadmin"
  ON public.contract_document_versions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "contract_doc_versions insert superadmin"
  ON public.contract_document_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

-- Storage RLS auf 'contracts' Bucket: Pfad-Präfix 'library/'
DO $$ BEGIN
  CREATE POLICY "contracts library read superadmin"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'contracts'
      AND (storage.foldername(name))[1] = 'library'
      AND public.has_role(auth.uid(), 'superadmin'::app_role)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "contracts library write superadmin"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'contracts'
      AND (storage.foldername(name))[1] = 'library'
      AND public.has_role(auth.uid(), 'superadmin'::app_role)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "contracts library delete superadmin"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'contracts'
      AND (storage.foldername(name))[1] = 'library'
      AND public.has_role(auth.uid(), 'superadmin'::app_role)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
