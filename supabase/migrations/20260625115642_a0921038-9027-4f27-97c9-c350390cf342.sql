
-- 1. Neue Berechtigungsspalten
ALTER TABLE public.contract_permissions
  ADD COLUMN IF NOT EXISTS can_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_attachments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_sets boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_placeholders boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_audit_log boolean NOT NULL DEFAULT false;

-- 2. Versionstabellen für Sets und Vorlagen-Anhänge
CREATE TABLE IF NOT EXISTS public.contract_set_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.contract_sets(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_set_versions TO authenticated;
GRANT ALL ON public.contract_set_versions TO service_role;
ALTER TABLE public.contract_set_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_set_versions superadmin"
  ON public.contract_set_versions FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.contract_template_attachment_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid NOT NULL REFERENCES public.contract_template_attachments(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  storage_path text,
  change_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attachment_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_template_attachment_versions TO authenticated;
GRANT ALL ON public.contract_template_attachment_versions TO service_role;
ALTER TABLE public.contract_template_attachment_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ctav superadmin"
  ON public.contract_template_attachment_versions FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Zentrales Audit-Log
CREATE TABLE IF NOT EXISTS public.contract_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,    -- template | set | template_attachment | letterhead | permission | library_document | contract
  entity_id text NOT NULL,
  action text NOT NULL,          -- create | update | delete | version | finalize | send | archive
  field text,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid,
  changed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contract_audit_log_entity_idx
  ON public.contract_audit_log(entity_type, entity_id, created_at DESC);
GRANT SELECT, INSERT ON public.contract_audit_log TO authenticated;
GRANT ALL ON public.contract_audit_log TO service_role;
ALTER TABLE public.contract_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit insert any auth"
  ON public.contract_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
CREATE POLICY "audit view by permission"
  ON public.contract_audit_log FOR SELECT
  USING (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.contract_permissions cp
      WHERE cp.user_id = auth.uid() AND cp.can_view_audit_log = true
    )
  );

-- 4. Hilfsfunktion: Berechtigungsprüfung inkl. Rollendefaults
CREATE OR REPLACE FUNCTION public.has_contract_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
  _explicit boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  -- Admin/Superadmin: alles erlaubt
  IF public.has_role(_user_id, 'superadmin'::app_role)
     OR public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;

  -- Explizite Vergabe via contract_permissions
  EXECUTE format(
    'SELECT %I FROM public.contract_permissions WHERE user_id = $1 LIMIT 1',
    _perm
  ) INTO _explicit USING _user_id;
  IF _explicit IS TRUE THEN RETURN true; END IF;

  -- Rollendefaults
  SELECT role::text INTO _role
  FROM public.user_roles WHERE user_id = _user_id LIMIT 1;

  IF _role = 'hr' THEN
    RETURN _perm IN ('can_view','can_generate','can_edit','can_finalize','can_send');
  END IF;

  -- Recruiter-ähnliche Rollen (Teamleiter, Backoffice, Agency Manager) = Recruiter-Logik
  IF _role IN ('teamleiter','backoffice','agency_manager') THEN
    RETURN _perm IN ('can_view','can_generate','can_edit');
  END IF;

  RETURN false;
EXCEPTION WHEN undefined_column THEN
  RETURN false;
END;
$$;

-- 5. Generischer Audit-Trigger
CREATE OR REPLACE FUNCTION public.trg_contract_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _name text;
  _eid text;
  _etype text := TG_ARGV[0];
  _action text;
BEGIN
  IF _user IS NOT NULL THEN
    SELECT display_name INTO _name FROM public.profiles WHERE id = _user;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _action := 'create';
    _eid := (to_jsonb(NEW)->>'id');
    INSERT INTO public.contract_audit_log(entity_type, entity_id, action, new_value, changed_by, changed_by_name)
    VALUES (_etype, _eid, _action, to_jsonb(NEW), _user, _name);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _eid := (to_jsonb(NEW)->>'id');
    IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
      INSERT INTO public.contract_audit_log(entity_type, entity_id, action, old_value, new_value, changed_by, changed_by_name)
      VALUES (_etype, _eid, _action, to_jsonb(OLD), to_jsonb(NEW), _user, _name);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _eid := (to_jsonb(OLD)->>'id');
    INSERT INTO public.contract_audit_log(entity_type, entity_id, action, old_value, changed_by, changed_by_name)
    VALUES (_etype, _eid, _action, to_jsonb(OLD), _user, _name);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger anhängen (idempotent)
DROP TRIGGER IF EXISTS audit_contract_templates ON public.contract_templates;
CREATE TRIGGER audit_contract_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.trg_contract_audit('template');

DROP TRIGGER IF EXISTS audit_contract_sets ON public.contract_sets;
CREATE TRIGGER audit_contract_sets
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_sets
  FOR EACH ROW EXECUTE FUNCTION public.trg_contract_audit('set');

DROP TRIGGER IF EXISTS audit_contract_template_attachments ON public.contract_template_attachments;
CREATE TRIGGER audit_contract_template_attachments
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_template_attachments
  FOR EACH ROW EXECUTE FUNCTION public.trg_contract_audit('template_attachment');

DROP TRIGGER IF EXISTS audit_contract_letterhead ON public.contract_letterhead;
CREATE TRIGGER audit_contract_letterhead
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_letterhead
  FOR EACH ROW EXECUTE FUNCTION public.trg_contract_audit('letterhead');

DROP TRIGGER IF EXISTS audit_contract_permissions ON public.contract_permissions;
CREATE TRIGGER audit_contract_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_permissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_contract_audit('permission');

DROP TRIGGER IF EXISTS audit_contract_documents ON public.contract_documents;
CREATE TRIGGER audit_contract_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.trg_contract_audit('library_document');

-- 6. Versions-Trigger für contract_sets
CREATE OR REPLACE FUNCTION public.trg_contract_set_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next int;
BEGIN
  SELECT COALESCE(MAX(version),0) + 1 INTO _next
  FROM public.contract_set_versions WHERE set_id = NEW.id;
  INSERT INTO public.contract_set_versions(set_id, version, snapshot, created_by)
  VALUES (NEW.id, _next, to_jsonb(NEW), auth.uid());
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS version_contract_sets ON public.contract_sets;
CREATE TRIGGER version_contract_sets
  AFTER INSERT OR UPDATE ON public.contract_sets
  FOR EACH ROW EXECUTE FUNCTION public.trg_contract_set_version();

-- 7. Versions-Trigger für contract_template_attachments
CREATE OR REPLACE FUNCTION public.trg_contract_template_attachment_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next int;
BEGIN
  SELECT COALESCE(MAX(version),0) + 1 INTO _next
  FROM public.contract_template_attachment_versions WHERE attachment_id = NEW.id;
  INSERT INTO public.contract_template_attachment_versions(attachment_id, version, snapshot, storage_path, created_by)
  VALUES (NEW.id, _next, to_jsonb(NEW), NEW.storage_path, auth.uid());
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS version_contract_template_attachments ON public.contract_template_attachments;
CREATE TRIGGER version_contract_template_attachments
  AFTER INSERT OR UPDATE ON public.contract_template_attachments
  FOR EACH ROW EXECUTE FUNCTION public.trg_contract_template_attachment_version();
