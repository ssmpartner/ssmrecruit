
-- =====================================================
-- Vertragssets
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contract_sets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text UNIQUE NOT NULL,
  name              text NOT NULL,
  description       text,
  kind_code         text REFERENCES public.contract_kinds(code)          ON UPDATE CASCADE,
  target_group_code text REFERENCES public.contract_target_groups(code)  ON UPDATE CASCADE,
  area              text CHECK (area IS NULL OR area IN ('sales','office')),
  position_codes    text[] NOT NULL DEFAULT '{}',
  language          text NOT NULL DEFAULT 'de' CHECK (language IN ('de','fr','it')),
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        int NOT NULL DEFAULT 100,
  created_by        uuid,
  updated_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_sets TO authenticated;
GRANT ALL ON public.contract_sets TO service_role;
ALTER TABLE public.contract_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_sets read auth" ON public.contract_sets FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(),'superadmin'::app_role));
CREATE POLICY "contract_sets write superadmin" ON public.contract_sets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));
CREATE TRIGGER trg_contract_sets_updated BEFORE UPDATE ON public.contract_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bestandteile eines Sets (Kategorie-basiert, sprachneutral)
-- role: main | mandatory | optional | jobdesc | careerplan | leadership | education
CREATE TABLE IF NOT EXISTS public.contract_set_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id        uuid NOT NULL REFERENCES public.contract_sets(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('main','mandatory','optional','jobdesc','careerplan','leadership','education')),
  category_code text NOT NULL REFERENCES public.contract_categories(code) ON UPDATE CASCADE,
  is_mandatory  boolean NOT NULL DEFAULT false,
  sort_order    int NOT NULL DEFAULT 100,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, role, category_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_set_items TO authenticated;
GRANT ALL ON public.contract_set_items TO service_role;
ALTER TABLE public.contract_set_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_set_items read auth" ON public.contract_set_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "contract_set_items write superadmin" ON public.contract_set_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));

-- =====================================================
-- Regel-Engine
-- Bedingungen + Aktionen als JSON, vom Superadmin pflegbar
-- conditions: { kind_code?, target_group_code?, area?, position_in?: [..] }
-- actions: { hide_fields?: [..], show_categories?: [..], require_categories?: [..],
--            optional_categories?: [..], allow_partner_fields?: bool }
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contract_set_rules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,
  name         text NOT NULL,
  description  text,
  conditions   jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions      jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   int NOT NULL DEFAULT 100,
  created_by   uuid,
  updated_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_set_rules TO authenticated;
GRANT ALL ON public.contract_set_rules TO service_role;
ALTER TABLE public.contract_set_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_set_rules read auth" ON public.contract_set_rules FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(),'superadmin'::app_role));
CREATE POLICY "contract_set_rules write superadmin" ON public.contract_set_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));
CREATE TRIGGER trg_contract_set_rules_updated BEFORE UPDATE ON public.contract_set_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed: 5 Standard-Sets
-- =====================================================
INSERT INTO public.contract_sets (code, name, kind_code, target_group_code, area, position_codes, sort_order) VALUES
  ('aussendienst_ma',  'Aussendienst Mitarbeiter / Handelsreisender', 'aussendienst',       'ma',              'sales',  ARRAY['trainee','finanzcoach_ausbildung','finanzcoach','senior_finanzcoach','key_account'], 10),
  ('fuehrungskraft',   'Führungskraft',                               'fuehrungskraft',     'fk',              'sales',  ARRAY['teamleiter','verkaufsleiter','agenturleiter','generalagent'], 20),
  ('innendienst',      'Innendienst',                                 'innendienst',        'innendienst',     'office', ARRAY['backoffice','hr','marketing','administration'], 30),
  ('kooperationspartner','Kooperationspartner',                       'kooperationspartner','externe_partner', NULL,     ARRAY[]::text[], 40),
  ('leadlieferant',    'Leadlieferant',                               'leadlieferant',      'leadlieferanten', NULL,     ARRAY[]::text[], 50)
ON CONFLICT (code) DO NOTHING;

-- Items seeden (Hauptvertrag + Anhänge)
WITH s AS (SELECT id, code FROM public.contract_sets)
INSERT INTO public.contract_set_items (set_id, role, category_code, is_mandatory, sort_order)
SELECT s.id, v.role, v.category, v.req, v.so
FROM s, (VALUES
  -- Aussendienst MA
  ('aussendienst_ma','main',       'handelsreisendenvertrag', true,  10),
  ('aussendienst_ma','mandatory',  'reglement_score_ma',      true,  20),
  ('aussendienst_ma','mandatory',  'reglement_spesen',        true,  30),
  ('aussendienst_ma','mandatory',  'reglement_ferien',        true,  40),
  ('aussendienst_ma','mandatory',  'reglement_termin_feedback',true, 50),
  ('aussendienst_ma','careerplan', 'karriereplan',            true,  60),
  ('aussendienst_ma','mandatory',  'reglement_geschaeftsintern',true,70),
  ('aussendienst_ma','mandatory',  'reglement_compliance',    true,  80),
  ('aussendienst_ma','mandatory',  'vorgabewesen',            true,  90),
  ('aussendienst_ma','mandatory',  'verhaltenskodex',         true, 100),
  ('aussendienst_ma','optional',   'vbv_weiterbildung',       false,110),
  ('aussendienst_ma','optional',   'iaf_weiterbildung',       false,120),
  ('aussendienst_ma','optional',   'reglement_gratifikation', false,130),

  -- Führungskraft
  ('fuehrungskraft','main',        'fuehrungsvertrag',        true,  10),
  ('fuehrungskraft','mandatory',   'reglement_score_fk',      true,  20),
  ('fuehrungskraft','careerplan',  'karriereplan',            true,  30),
  ('fuehrungskraft','leadership',  'leadership_zulage',       true,  40),
  ('fuehrungskraft','mandatory',   'reglement_bonus',         true,  50),
  ('fuehrungskraft','mandatory',   'reglement_spesen',        true,  60),
  ('fuehrungskraft','mandatory',   'reglement_ferien',        true,  70),
  ('fuehrungskraft','mandatory',   'reglement_geschaeftsintern',true,80),
  ('fuehrungskraft','mandatory',   'reglement_compliance',    true,  90),
  ('fuehrungskraft','mandatory',   'vorgabewesen',            true, 100),
  ('fuehrungskraft','mandatory',   'verhaltenskodex',         true, 110),
  ('fuehrungskraft','jobdesc',     'stellenbeschreibung',     true, 120),

  -- Innendienst (kein Karriereplan, kein Leadership, kein Score)
  ('innendienst','main',           'innendienstvertrag',      true,  10),
  ('innendienst','jobdesc',        'stellenbeschreibung',     true,  20),
  ('innendienst','mandatory',      'reglement_geschaeftsintern',true,30),
  ('innendienst','mandatory',      'reglement_compliance',    true,  40),
  ('innendienst','mandatory',      'vorgabewesen',            true,  50),
  ('innendienst','mandatory',      'verhaltenskodex',         true,  60),
  ('innendienst','mandatory',      'reglement_ferien',        true,  70),

  -- Kooperationspartner
  ('kooperationspartner','main',     'kooperationsvertrag', true, 10),
  ('kooperationspartner','mandatory','reglement_bonus',     true, 20),

  -- Leadlieferant
  ('leadlieferant','main',     'leadsvereinbarung', true, 10),
  ('leadlieferant','mandatory','reglement_compliance', true, 20)
) AS v(set_code, role, category, req, so)
WHERE s.code = v.set_code
ON CONFLICT (set_id, role, category_code) DO NOTHING;

-- =====================================================
-- Seed: Standard-Regeln (alle editierbar)
-- =====================================================
INSERT INTO public.contract_set_rules (code, name, description, conditions, actions, sort_order) VALUES
  ('hide_careerplan_for_innendienst',
   'Karriereplan im Innendienst ausblenden',
   'Innendienst hat keinen Karriereplan, keine Score-Punkte, keine Provision, keine Leadership-Zulage.',
   '{"kind_code":"innendienst"}'::jsonb,
   '{"hide_fields":["careerplan","score","leadership","provision"],"hide_categories":["karriereplan","leadership_zulage","reglement_score_ma","reglement_score_fk"]}'::jsonb,
   10),
  ('fk_show_leadership_and_score',
   'Führungskraft: Leadership und Score FK anbieten',
   'Bei Zielgruppe Führungskraft werden Leadership-Zulage und Score-Punkte-Reglement FK pflichtmässig vorgeschlagen.',
   '{"target_group_code":"fk"}'::jsonb,
   '{"require_categories":["leadership_zulage","reglement_score_fk"]}'::jsonb,
   20),
  ('ma_sales_score_and_careerplan',
   'MA Vertrieb: Score MA und Karriereplan',
   'Bei Zielgruppe MA im Bereich Vertrieb werden Score MA und Karriereplan pflichtmässig angeboten.',
   '{"target_group_code":"ma","area":"sales"}'::jsonb,
   '{"require_categories":["reglement_score_ma","karriereplan"]}'::jsonb,
   30),
  ('trainee_optional_vbv_iaf',
   'Trainee / Finanzcoach in Ausbildung: VBV/IAF optional',
   'Für Trainees und Finanzcoaches in Ausbildung werden VBV- und IAF-Weiterbildungsvereinbarungen optional angeboten.',
   '{"position_in":["trainee","finanzcoach_ausbildung"]}'::jsonb,
   '{"optional_categories":["vbv_weiterbildung","iaf_weiterbildung"]}'::jsonb,
   40),
  ('leadlieferant_partner_fields',
   'Leadlieferant: Firmen-/Partnerfelder statt Arbeitnehmerfelder',
   'Bei Vertragsart Leadlieferant werden statt Arbeitnehmerfeldern (AHV, Lohn, etc.) Firmen-/Partnerfelder verwendet.',
   '{"kind_code":"leadlieferant"}'::jsonb,
   '{"allow_partner_fields":true,"hide_fields":["ahv","lohn","ferien","arbeitszeit"]}'::jsonb,
   50)
ON CONFLICT (code) DO NOTHING;
