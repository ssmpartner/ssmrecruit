-- Auto-Claim auch für Controlling: der erste Controlling-User, der handelt, wird zugewiesen.
-- Ausserdem Reminder-Counter beim Wechsel in Controlling-Prüfung zurücksetzen.
CREATE OR REPLACE FUNCTION public.trg_hr_auto_claim()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;

  -- HR Auto-Claim
  IF NEW.status IN ('hr_processing','hr_pending')
     AND NEW.assigned_approver_user_id IS NULL
     AND public.has_role(_uid, 'hr'::app_role) THEN
    NEW.assigned_approver_user_id := _uid;
    NEW.assigned_approver_role := 'hr';
  END IF;

  -- Controlling Auto-Claim (first-come-first-serve)
  IF NEW.status = 'ready_for_controlling'
     AND NEW.assigned_approver_user_id IS NULL
     AND public.has_role(_uid, 'controlling'::app_role) THEN
    NEW.assigned_approver_user_id := _uid;
    NEW.assigned_approver_role := 'controlling';
  END IF;

  -- Bei Statuswechsel Reminder-Zähler und Claim je nach Zielphase zurücksetzen
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('hr_processing','hr_pending','ready_for_controlling') THEN
      NEW.approval_reminder_count := 0;
      NEW.last_approval_reminder_at := NULL;
    END IF;
    -- Bei Rückgabe an Recruiter Claim aufheben, damit späterer Controlling-User frei neu claimen kann
    IF OLD.status = 'ready_for_controlling' AND NEW.status NOT IN ('ready_for_controlling','controlling_approved','management_review','management_approved') THEN
      NEW.assigned_approver_user_id := NULL;
      NEW.assigned_approver_role := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;