
-- Bestehende Einträge sichern, dann Tabelle ersetzen
CREATE TEMP TABLE _old_lead_prefs AS
SELECT user_id, notify_new_lead_email
FROM public.employee_notification_prefs;

DROP TABLE public.employee_notification_prefs;

CREATE TABLE public.employee_notification_prefs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  in_app_enabled boolean,
  email_enabled boolean,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_notification_prefs TO authenticated;
GRANT ALL ON public.employee_notification_prefs TO service_role;

ALTER TABLE public.employee_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification prefs"
  ON public.employee_notification_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Superadmin manages all notification prefs"
  ON public.employee_notification_prefs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins read all notification prefs"
  ON public.employee_notification_prefs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_employee_notification_prefs_updated_at
  BEFORE UPDATE ON public.employee_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bestehenden Bilel-Opt-in übernehmen
INSERT INTO public.employee_notification_prefs (user_id, notification_type, email_enabled)
SELECT user_id, 'lead_new', notify_new_lead_email
FROM _old_lead_prefs
WHERE notify_new_lead_email IS NOT NULL;

-- Effektive Empfängerlogik: Rolle-Default + persönlicher Override
CREATE OR REPLACE FUNCTION public.get_notification_recipients(
  _notification_type text,
  _channel text  -- 'email' oder 'in_app'
)
RETURNS TABLE(user_id uuid, email text, employee_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

GRANT EXECUTE ON FUNCTION public.get_notification_recipients(text, text) TO authenticated, service_role;
