
-- 1) Spalte für Erinnerungs-Tracking
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_approval_reminder_at timestamptz;

-- 2) Rollen-Defaults für neue & bestehende Typen
-- Helper: schreibe Defaults idempotent
INSERT INTO public.notification_role_settings (role, notification_type, in_app_enabled, email_enabled)
VALUES
  -- Controlling
  ('controlling', 'lead_ready_for_controlling', true, true),
  ('controlling', 'lead_controlling_approved', true, false),
  ('controlling', 'lead_controlling_rejected', true, true),
  ('controlling', 'lead_management_approved', true, false),
  ('controlling', 'lead_management_rejected', true, true),
  ('controlling', 'approval_reminder', true, true),
  ('controlling', 'lead_status_change', true, false),
  ('controlling', 'duplicate_detected', true, false),

  -- Geschäftsleitung
  ('geschaeftsleitung', 'lead_controlling_approved', true, true),
  ('geschaeftsleitung', 'lead_management_approved', true, true),
  ('geschaeftsleitung', 'lead_management_rejected', true, true),
  ('geschaeftsleitung', 'lead_hired', true, true),
  ('geschaeftsleitung', 'approval_reminder', true, true),

  -- HR
  ('hr', 'lead_management_approved', true, true),
  ('hr', 'lead_hr_processing', true, true),
  ('hr', 'lead_hired', true, true),
  ('hr', 'document_uploaded', true, false),
  ('hr', 'approval_reminder', true, true)
ON CONFLICT (role, notification_type) DO UPDATE
  SET in_app_enabled = EXCLUDED.in_app_enabled,
      email_enabled  = EXCLUDED.email_enabled;

-- 3) Empfänger-Funktion: Controlling/GL/HR bei lead-bezogenen Events
--    grundsätzlich zulassen (gefiltert weiterhin durch role_enabled / personal override)
CREATE OR REPLACE FUNCTION public.get_notification_recipients(_notification_type text, _channel text, _lead_id text DEFAULT NULL::text)
 RETURNS TABLE(user_id uuid, email text, employee_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _lead_agency text;
  _lead_employee text;
BEGIN
  IF _lead_id IS NOT NULL THEN
    SELECT agency_id, employee_id
      INTO _lead_agency, _lead_employee
    FROM public.leads WHERE id = _lead_id;
  END IF;

  RETURN QUERY
  WITH role_defaults AS (
    SELECT
      nrs.role::text AS role,
      CASE WHEN _channel = 'email' THEN nrs.email_enabled
           ELSE nrs.in_app_enabled END AS role_enabled
    FROM public.notification_role_settings nrs
    WHERE nrs.notification_type = _notification_type
  ),
  candidates AS (
    SELECT
      e.id           AS employee_id,
      e.user_id,
      e.email,
      e.name         AS employee_name,
      e.role         AS emp_role,
      e.agency_id    AS emp_agency,
      COALESCE(rd.role_enabled, false) AS role_enabled,
      CASE WHEN _channel = 'email' THEN p.email_enabled
           ELSE p.in_app_enabled END AS personal_override
    FROM public.employees e
    LEFT JOIN role_defaults rd ON rd.role = e.role
    LEFT JOIN public.employee_notification_prefs p
      ON p.user_id = e.user_id AND p.notification_type = _notification_type
    WHERE e.user_id IS NOT NULL
  )
  SELECT c.user_id, c.email, c.employee_name
  FROM candidates c
  WHERE COALESCE(c.personal_override, c.role_enabled) = true
    AND (
      (_lead_id IS NOT NULL AND (
        c.emp_role IN ('superadmin','admin','controlling','geschaeftsleitung','hr')
        OR c.employee_id = _lead_employee
        OR (c.emp_role IN ('agency_manager','backoffice') AND c.emp_agency = _lead_agency)
      ))
      OR (_lead_id IS NULL AND c.emp_role IN ('superadmin','admin','controlling','geschaeftsleitung','hr'))
    );
END;
$function$;

-- 4) Status-Trigger erweitern: zusätzlich typisierte Events dispatchen
CREATE OR REPLACE FUNCTION public.trg_lead_status_change_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _typ text;
  _title text;
  _desc text;
BEGIN
  IF NEW.id = 'test-lead-dummy-001' THEN RETURN NEW; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  -- generische Status-Änderung (bestehende Logik)
  PERFORM public.dispatch_notification(
    'lead_status_change', 'lead', NEW.id, NEW.id,
    'Status geändert: ' || COALESCE(NEW.name, NEW.id),
    'Neuer Status: ' || COALESCE(NEW.status, '–') || ' (vorher: ' || COALESCE(OLD.status, '–') || ')',
    'lead_status:' || COALESCE(NEW.status, ''),
    auth.uid()
  );

  -- spezifischer Typ je nach Übergang
  _typ := NULL;
  CASE NEW.status
    WHEN 'ready_for_controlling' THEN
      _typ := 'lead_ready_for_controlling';
      _title := 'Lead bereit für Controlling-Prüfung: ' || COALESCE(NEW.name, NEW.id);
      _desc  := 'Bitte prüfen und freigeben oder ablehnen.';
    WHEN 'controlling_approved' THEN
      _typ := 'lead_controlling_approved';
      _title := 'Controlling-Freigabe erteilt: ' || COALESCE(NEW.name, NEW.id);
      _desc  := 'Geschäftsleitung-Freigabe erforderlich (Artan & Davide).';
    WHEN 'management_approved' THEN
      _typ := 'lead_management_approved';
      _title := 'Geschäftsleitung-Freigabe erteilt: ' || COALESCE(NEW.name, NEW.id);
      _desc  := 'Lead geht in den HR-Prozess.';
    WHEN 'hr_processing' THEN
      _typ := 'lead_hr_processing';
      _title := 'HR-Bearbeitung gestartet: ' || COALESCE(NEW.name, NEW.id);
      _desc  := 'HR übernimmt den Lead.';
    WHEN 'hired' THEN
      _typ := 'lead_hired';
      _title := 'Lead eingestellt: ' || COALESCE(NEW.name, NEW.id);
      _desc  := 'Onboarding kann starten.';
    WHEN 'rejected' THEN
      IF OLD.status = 'ready_for_controlling' THEN
        _typ := 'lead_controlling_rejected';
        _title := 'Controlling abgelehnt: ' || COALESCE(NEW.name, NEW.id);
        _desc  := 'Lead wurde im Controlling abgelehnt.';
      ELSIF OLD.status IN ('controlling_approved','management_review') THEN
        _typ := 'lead_management_rejected';
        _title := 'Geschäftsleitung abgelehnt: ' || COALESCE(NEW.name, NEW.id);
        _desc  := 'Lead wurde durch die Geschäftsleitung abgelehnt.';
      END IF;
    ELSE
      _typ := NULL;
  END CASE;

  IF _typ IS NOT NULL THEN
    PERFORM public.dispatch_notification(
      _typ, 'lead', NEW.id, NEW.id, _title, _desc,
      _typ, auth.uid()
    );
    -- Reminder-Zähler zurücksetzen, da Status sich bewegt hat
    NEW.last_approval_reminder_at := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger muss BEFORE UPDATE laufen, damit NEW.last_approval_reminder_at zurückgesetzt wird
DROP TRIGGER IF EXISTS trg_lead_status_change_notify ON public.leads;
CREATE TRIGGER trg_lead_status_change_notify
  BEFORE UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_lead_status_change_notify();
