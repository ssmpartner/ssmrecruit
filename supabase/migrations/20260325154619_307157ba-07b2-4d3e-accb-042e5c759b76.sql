CREATE TABLE public.notification_role_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  role app_role NOT NULL,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_type, role)
);

ALTER TABLE public.notification_role_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read notification_role_settings"
  ON public.notification_role_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Superadmins can modify notification_role_settings"
  ON public.notification_role_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Seed default settings: all types × all roles = enabled
INSERT INTO public.notification_role_settings (notification_type, role, in_app_enabled, email_enabled)
SELECT nt, r, true, true
FROM unnest(ARRAY['lead_new','lead_status_change','lead_assigned','appointment_created','appointment_reminder','appointment_cancelled','disc_completed','automation_triggered','duplicate_detected','task_created','task_overdue','insights_completed','document_uploaded','process_step_changed']) AS nt,
     unnest(ARRAY['superadmin','admin','backoffice','analyst','teamleiter']::app_role[]) AS r;