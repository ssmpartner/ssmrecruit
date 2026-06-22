CREATE OR REPLACE FUNCTION public.status_label(_status text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE _status
    WHEN 'new'                  THEN 'Neuer Lead'
    WHEN 'contacted'            THEN 'Kontaktiert'
    WHEN 'callback'             THEN 'Rückruf'
    WHEN 'not_reached'          THEN 'Nicht erreicht'
    WHEN 'not_interested'       THEN 'Nicht interessiert'
    WHEN 'no_need'              THEN 'Kein Bedarf'
    WHEN 'not_suitable'         THEN 'Nicht passend'
    WHEN 'internal'             THEN 'Interne Stelle'
    WHEN 'appointment'          THEN 'Terminiert'
    WHEN 'interview_1'          THEN 'Interview 1'
    WHEN 'interview_2'          THEN 'Interview 2'
    WHEN 'insights'             THEN 'Insights'
    WHEN 'follow_up'            THEN 'Follow-up'
    WHEN 'ready_for_controlling' THEN 'Bereit für Controlling-Prüfung'
    WHEN 'controlling_approved'  THEN 'Controlling freigegeben'
    WHEN 'management_review'     THEN 'Geschäftsleitung-Prüfung'
    WHEN 'management_approved'   THEN 'Geschäftsleitung freigegeben'
    WHEN 'hr_processing'        THEN 'HR-Bearbeitung'
    WHEN 'hr_pending'           THEN 'HR Pendent (Unterlagen)'
    WHEN 'hired'                THEN 'Eingestellt'
    WHEN 'rejected'             THEN 'Abgelehnt'
    ELSE COALESCE(_status, '–')
  END;
$$;

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

  PERFORM public.dispatch_notification(
    'lead_status_change', 'lead', NEW.id, NEW.id,
    'Status geändert: ' || COALESCE(NEW.name, NEW.id),
    'Neuer Status: ' || public.status_label(NEW.status) || ' (vorher: ' || public.status_label(OLD.status) || ')',
    'lead_status:' || COALESCE(NEW.status, ''),
    auth.uid()
  );

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
    NEW.last_approval_reminder_at := NULL;
  END IF;

  RETURN NEW;
END;
$function$;