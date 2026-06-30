
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS approval_reminder_count int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.trg_hr_auto_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IN ('hr_processing','hr_pending')
     AND NEW.assigned_approver_user_id IS NULL
     AND public.has_role(_uid, 'hr'::app_role) THEN
    NEW.assigned_approver_user_id := _uid;
    NEW.assigned_approver_role := 'hr';
  END IF;
  -- Bei Statuswechsel in HR Reminder-Zähler zurücksetzen
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('hr_processing','hr_pending') THEN
    NEW.approval_reminder_count := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_auto_claim ON public.leads;
CREATE TRIGGER trg_hr_auto_claim
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.trg_hr_auto_claim();
