-- Aufgaben-E-Mails global deaktivieren: Standard + persönliche Overrides
UPDATE public.notification_role_settings
SET email_enabled = false,
    updated_at = now()
WHERE notification_type IN ('task_created', 'task_overdue')
  AND email_enabled IS DISTINCT FROM false;

UPDATE public.employee_notification_prefs
SET email_enabled = false,
    updated_at = now()
WHERE notification_type IN ('task_created', 'task_overdue')
  AND email_enabled IS DISTINCT FROM false;

-- Serverseitiger Schutz: Aufgaben dürfen nie automatisch per E-Mail geroutet werden.
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
  IF _channel = 'email' AND _notification_type IN ('task_created', 'task_overdue') THEN
    RETURN;
  END IF;

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

-- Alte 2-Parameter-Variante ebenfalls schützen, falls ältere Aufrufer sie nutzen.
CREATE OR REPLACE FUNCTION public.get_notification_recipients(_notification_type text, _channel text)
RETURNS TABLE(user_id uuid, email text, employee_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _channel = 'email' AND _notification_type IN ('task_created', 'task_overdue') THEN
    RETURN;
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
      e.user_id,
      e.email,
      e.name AS employee_name,
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
  WHERE COALESCE(c.personal_override, c.role_enabled) = true;
END;
$function$;