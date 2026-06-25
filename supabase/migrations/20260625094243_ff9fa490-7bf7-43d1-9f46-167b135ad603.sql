
-- =========================================================
-- Verträge-Modul: Strukturelle Erweiterung (Schritt 2)
-- Additiv, rückwärtskompatibel. Bestehende Spalten/Tabellen
-- (area, contract_type, language, careerplan_*) bleiben unverändert.
-- =========================================================

-- 1) Lookup: Vertragsarten (Kind)
CREATE TABLE IF NOT EXISTS public.contract_kinds (
  code        text PRIMARY KEY,
  label_de    text NOT NULL,
  label_fr    text,
  label_it    text,
  sort_order  int  NOT NULL DEFAULT 100,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contract_kinds TO authenticated;
GRANT ALL    ON public.contract_kinds TO service_role;
ALTER TABLE public.contract_kinds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_kinds read auth"
  ON public.contract_kinds FOR SELECT TO authenticated USING (true);
CREATE POLICY "contract_kinds superadmin write"
  ON public.contract_kinds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

-- 2) Lookup: Dokumentenkategorien (Category)
CREATE TABLE IF NOT EXISTS public.contract_categories (
  code        text PRIMARY KEY,
  label_de    text NOT NULL,
  label_fr    text,
  label_it    text,
  is_attachment boolean NOT NULL DEFAULT false,
  sort_order  int  NOT NULL DEFAULT 100,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contract_categories TO authenticated;
GRANT ALL    ON public.contract_categories TO service_role;
ALTER TABLE public.contract_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_categories read auth"
  ON public.contract_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "contract_categories superadmin write"
  ON public.contract_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

-- 3) Lookup: Zielgruppen (Target Group)
CREATE TABLE IF NOT EXISTS public.contract_target_groups (
  code        text PRIMARY KEY,
  label_de    text NOT NULL,
  label_fr    text,
  label_it    text,
  sort_order  int  NOT NULL DEFAULT 100,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contract_target_groups TO authenticated;
GRANT ALL    ON public.contract_target_groups TO service_role;
ALTER TABLE public.contract_target_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_target_groups read auth"
  ON public.contract_target_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "contract_target_groups superadmin write"
  ON public.contract_target_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

-- 4) Seed-Daten
INSERT INTO public.contract_kinds (code, label_de, sort_order) VALUES
  ('aussendienst',      'Aussendienst Mitarbeiter', 10),
  ('fuehrungskraft',    'Führungskraft',            20),
  ('innendienst',       'Innendienst',              30),
  ('kooperationspartner','Kooperationspartner',     40),
  ('leadlieferant',     'Leadlieferant',            50)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.contract_categories (code, label_de, is_attachment, sort_order) VALUES
  ('arbeitsvertrag',           'Arbeitsvertrag',              false, 10),
  ('handelsreisendenvertrag',  'Handelsreisendenvertrag',     false, 20),
  ('fuehrungsvertrag',         'Führungsvertrag',             false, 30),
  ('innendienstvertrag',       'Innendienstvertrag',          false, 40),
  ('kooperationsvertrag',      'Kooperationsvertrag',         false, 50),
  ('leadsvereinbarung',        'Leadsvereinbarung',           false, 60),
  ('anhang',                   'Anhang',                      true,  70),
  ('reglement',                'Reglement',                   true,  80),
  ('stellenbeschreibung',      'Stellenbeschreibung',         true,  90),
  ('weiterbildungsvereinbarung','Weiterbildungsvereinbarung', true,  100),
  ('bonus_gratifikation',      'Bonus / Gratifikation',       true,  110),
  ('karriereplan',             'Karriereplan',                true,  120),
  ('leadership_zulage',        'Leadership-Zulage',           true,  130)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.contract_target_groups (code, label_de, sort_order) VALUES
  ('ma',              'MA – Mitarbeiter ohne Führungsfunktion', 10),
  ('fk',              'FK – Führungskraft',                     20),
  ('vertrieb',        'Vertrieb',                               30),
  ('innendienst',     'Innendienst',                            40),
  ('externe_partner', 'Externe Partner',                        50),
  ('leadlieferanten', 'Leadlieferanten',                        60)
ON CONFLICT (code) DO NOTHING;

-- 5) Additive Spalten auf bestehenden Tabellen (alle nullable, keine Defaults
--    die existierende Logik brechen würden). area/contract_type bleiben aktiv.
ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS kind_code         text REFERENCES public.contract_kinds(code)          ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS category_code     text REFERENCES public.contract_categories(code)     ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS target_group_code text REFERENCES public.contract_target_groups(code)  ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS languages_supported text[] NOT NULL DEFAULT ARRAY['de']::text[];

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS kind_code         text REFERENCES public.contract_kinds(code)         ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS category_code     text REFERENCES public.contract_categories(code)    ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS target_group_code text REFERENCES public.contract_target_groups(code) ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_contract_templates_kind     ON public.contract_templates(kind_code);
CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON public.contract_templates(category_code);
CREATE INDEX IF NOT EXISTS idx_contract_templates_target   ON public.contract_templates(target_group_code);
CREATE INDEX IF NOT EXISTS idx_contracts_kind     ON public.contracts(kind_code);
CREATE INDEX IF NOT EXISTS idx_contracts_category ON public.contracts(category_code);
CREATE INDEX IF NOT EXISTS idx_contracts_target   ON public.contracts(target_group_code);

-- 6) updated_at-Trigger auf Lookups
CREATE TRIGGER trg_contract_kinds_updated      BEFORE UPDATE ON public.contract_kinds      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contract_categories_updated BEFORE UPDATE ON public.contract_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contract_target_updated     BEFORE UPDATE ON public.contract_target_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
