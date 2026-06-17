
-- 1. Master-Schalter
INSERT INTO public.app_settings (key, value)
VALUES ('email_delivery', '{"external_emails_enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Generische Dispatch-Helfer-Funktion (ruft notify-event Edge Function via pg_net)
CREATE OR REPLACE FUNCTION public.dispatch_notification(
  _type text,
  _entity_type text,
  _entity_id text,
  _lead_id text,
  _title text,
  _description text,
  _trigger_label text,
  _triggered_by uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
  _url text := 'https://adettewqzanmkgnnjlop.supabase.co/functions/v1/notify-event';
BEGIN
  SELECT decrypted_secret INTO _key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF _key IS NULL THEN
    RAISE WARNING 'dispatch_notification: service role key missing';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := jsonb_build_object(
      'notification_type', _type,
      'entity_type', _entity_type,
      'entity_id', _entity_id,
      'lead_id', _lead_id,
      'title', _title,
      'description', _description,
      'trigger_label', _trigger_label,
      'triggered_by_user_id', _triggered_by
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'dispatch_notification failed: %', sqlerrm;
END;
$$;

-- 3. Trigger: Lead-Status-Änderung
CREATE OR REPLACE FUNCTION public.trg_lead_status_change_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id = 'test-lead-dummy-001' THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.dispatch_notification(
      'lead_status_change', 'lead', NEW.id, NEW.id,
      'Status geändert: ' || COALESCE(NEW.name, NEW.id),
      'Neuer Status: ' || COALESCE(NEW.status, '–') || ' (vorher: ' || COALESCE(OLD.status, '–') || ')',
      'lead_status:' || COALESCE(NEW.status, ''),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_status_change_notify
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_lead_status_change_notify();

-- 4. Trigger: Lead-Zuweisung
CREATE OR REPLACE FUNCTION public.trg_lead_assigned_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _emp_name text;
BEGIN
  IF NEW.id = 'test-lead-dummy-001' THEN RETURN NEW; END IF;
  IF NEW.employee_id IS DISTINCT FROM OLD.employee_id AND NEW.employee_id IS NOT NULL THEN
    SELECT name INTO _emp_name FROM public.employees WHERE id = NEW.employee_id;
    PERFORM public.dispatch_notification(
      'lead_assigned', 'lead', NEW.id, NEW.id,
      'Lead zugewiesen: ' || COALESCE(NEW.name, NEW.id),
      'Neuer Mitarbeiter: ' || COALESCE(_emp_name, NEW.employee_id),
      'lead_assigned',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_assigned_notify
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_lead_assigned_notify();

-- 5. Trigger: Aufgabe erstellt
CREATE OR REPLACE FUNCTION public.trg_task_created_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _lead_name text;
BEGIN
  IF NEW.lead_id = 'test-lead-dummy-001' THEN RETURN NEW; END IF;
  SELECT name INTO _lead_name FROM public.leads WHERE id = NEW.lead_id;
  PERFORM public.dispatch_notification(
    'task_created', 'task', NEW.id::text, NEW.lead_id,
    'Neue Aufgabe: ' || COALESCE(NEW.title, '–'),
    'Lead: ' || COALESCE(_lead_name, NEW.lead_id) || ' · Priorität: ' || COALESCE(NEW.priority, 'medium'),
    'task:' || COALESCE(NEW.source, 'system'),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_created_notify
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.trg_task_created_notify();

-- 6. Trigger: Termin erstellt
CREATE OR REPLACE FUNCTION public.trg_appointment_created_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _lead_name text;
BEGIN
  IF NEW.lead_id = 'test-lead-dummy-001' THEN RETURN NEW; END IF;
  SELECT name INTO _lead_name FROM public.leads WHERE id = NEW.lead_id;
  PERFORM public.dispatch_notification(
    'appointment_created', 'appointment', NEW.id, NEW.lead_id,
    'Neuer Termin: ' || COALESCE(NEW.title, '–'),
    'Lead: ' || COALESCE(_lead_name, NEW.lead_id) || ' · ' || COALESCE(NEW.date, '') || ' ' || COALESCE(NEW.time, ''),
    'appointment:' || COALESCE(NEW.type, 'video'),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointments_created_notify
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trg_appointment_created_notify();
