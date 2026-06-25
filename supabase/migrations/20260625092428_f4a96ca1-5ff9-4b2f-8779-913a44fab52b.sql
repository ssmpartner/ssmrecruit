
-- =========================================================
-- Modul „Verträge" – additive Migration
-- =========================================================

-- 1. contract_templates
CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  contract_type text NOT NULL,
  area text NOT NULL CHECK (area IN ('sales','office')),
  position text,
  level text,
  language text NOT NULL DEFAULT 'de',
  careerplan_linked boolean NOT NULL DEFAULT false,
  careerplan_level text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  body_html text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_superadmin_all" ON public.contract_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. contract_template_versions
CREATE TABLE public.contract_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  body_html text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_template_versions TO authenticated;
GRANT ALL ON public.contract_template_versions TO service_role;
ALTER TABLE public.contract_template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_versions_superadmin_all" ON public.contract_template_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));

-- 3. contract_template_attachments
CREATE TABLE public.contract_template_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_template_attachments TO authenticated;
GRANT ALL ON public.contract_template_attachments TO service_role;
ALTER TABLE public.contract_template_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_attachments_superadmin_all" ON public.contract_template_attachments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));

-- 4. contracts (generierte Verträge)
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_lead_id text REFERENCES public.leads(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  template_version integer,
  area text NOT NULL CHECK (area IN ('sales','office')),
  language text NOT NULL DEFAULT 'de',
  position text,
  level text,
  careerplan_level text,
  start_date date,
  workload text,
  salary text,
  commission_model text,
  location text,
  manager_name text,
  body_html text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','finalized','sent','signed','archived')),
  pdf_path text,
  signature_provider text,
  current_version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_superadmin_all" ON public.contracts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. contract_versions
CREATE TABLE public.contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  body_html text NOT NULL,
  pdf_path text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_versions TO authenticated;
GRANT ALL ON public.contract_versions TO service_role;
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_versions_superadmin_all" ON public.contract_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));

-- 6. contract_attachments
CREATE TABLE public.contract_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_attachments TO authenticated;
GRANT ALL ON public.contract_attachments TO service_role;
ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_attachments_superadmin_all" ON public.contract_attachments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));

-- 7. contract_letterhead (Singleton)
CREATE TABLE public.contract_letterhead (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'SSM CI',
  storage_path text NOT NULL,
  mime_type text DEFAULT 'application/pdf',
  is_active boolean NOT NULL DEFAULT true,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_letterhead TO authenticated;
GRANT ALL ON public.contract_letterhead TO service_role;
ALTER TABLE public.contract_letterhead ENABLE ROW LEVEL SECURITY;
CREATE POLICY "letterhead_superadmin_all" ON public.contract_letterhead
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));
CREATE TRIGGER update_contract_letterhead_updated_at
  BEFORE UPDATE ON public.contract_letterhead
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. contract_permissions
CREATE TABLE public.contract_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_generate boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_manage_templates boolean NOT NULL DEFAULT false,
  can_manage_letterhead boolean NOT NULL DEFAULT false,
  can_finalize boolean NOT NULL DEFAULT false,
  can_archive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_permissions TO authenticated;
GRANT ALL ON public.contract_permissions TO service_role;
ALTER TABLE public.contract_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_permissions_superadmin_all" ON public.contract_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::app_role));
CREATE POLICY "contract_permissions_self_read" ON public.contract_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER update_contract_permissions_updated_at
  BEFORE UPDATE ON public.contract_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hilfsindizes
CREATE INDEX idx_contract_templates_area ON public.contract_templates(area);
CREATE INDEX idx_contract_templates_status ON public.contract_templates(status);
CREATE INDEX idx_contracts_lead ON public.contracts(candidate_lead_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contract_versions_contract ON public.contract_versions(contract_id);
CREATE INDEX idx_template_versions_template ON public.contract_template_versions(template_id);
