
-- 1. Erweiterungen an contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS placeholder_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2. Anhang-Sortierung
ALTER TABLE public.contract_attachments
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS document_id uuid;

-- 3. Änderungsprotokoll
CREATE TABLE IF NOT EXISTS public.contract_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  field text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  action text NOT NULL DEFAULT 'update',
  changed_by uuid,
  changed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_change_log_contract_idx
  ON public.contract_change_log (contract_id, created_at DESC);

GRANT SELECT, INSERT ON public.contract_change_log TO authenticated;
GRANT ALL ON public.contract_change_log TO service_role;

ALTER TABLE public.contract_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins können Protokoll lesen" ON public.contract_change_log;
CREATE POLICY "Admins können Protokoll lesen"
  ON public.contract_change_log
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr'::app_role)
  );

DROP POLICY IF EXISTS "Authentifizierte können Protokoll schreiben" ON public.contract_change_log;
CREATE POLICY "Authentifizierte können Protokoll schreiben"
  ON public.contract_change_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Trigger: Diff-Protokollierung bei Vertragsänderungen
CREATE OR REPLACE FUNCTION public.trg_contract_change_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _name text;
  _tracked text[] := ARRAY[
    'body_html','status','position','level','careerplan_level','workload','salary',
    'commission_model','location','manager_name','agency_name','start_date',
    'notice_period','probation_period','thirteenth_salary','placeholder_overrides',
    'internal_notes','language','area','target_group_code','kind_code'
  ];
  _field text;
  _old jsonb;
  _new jsonb;
BEGIN
  IF _user IS NOT NULL THEN
    SELECT display_name INTO _name FROM public.profiles WHERE id = _user;
  END IF;

  FOREACH _field IN ARRAY _tracked LOOP
    EXECUTE format('SELECT to_jsonb($1.%I), to_jsonb($2.%I)', _field, _field)
      INTO _old, _new
      USING OLD, NEW;
    IF _old IS DISTINCT FROM _new THEN
      INSERT INTO public.contract_change_log (contract_id, field, old_value, new_value, changed_by, changed_by_name)
      VALUES (NEW.id, _field, _old, _new, _user, _name);
    END IF;
  END LOOP;

  -- Statusbedingte Zeitstempel automatisch setzen
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'finalized' AND NEW.finalized_at IS NULL THEN NEW.finalized_at := now(); END IF;
    IF NEW.status = 'sent' AND NEW.sent_at IS NULL THEN NEW.sent_at := now(); END IF;
    IF NEW.status = 'signed' AND NEW.signed_at IS NULL THEN NEW.signed_at := now(); END IF;
    IF NEW.status = 'archived' AND NEW.archived_at IS NULL THEN NEW.archived_at := now(); END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_change_log ON public.contracts;
CREATE TRIGGER trg_contract_change_log
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contract_change_log();
