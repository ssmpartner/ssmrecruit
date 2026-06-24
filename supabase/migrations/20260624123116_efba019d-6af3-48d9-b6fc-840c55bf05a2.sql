
-- agency_manager + employee
INSERT INTO public.notification_role_settings (notification_type, role, in_app_enabled, email_enabled)
SELECT t, r::app_role, true, true
FROM (VALUES
  ('lead_new'),('lead_assigned'),('lead_status_change'),('lead_hired'),
  ('appointment_created'),('appointment_cancelled'),('appointment_reminder'),
  ('task_created'),('task_overdue'),
  ('document_uploaded'),('insights_completed'),('disc_completed'),
  ('duplicate_detected'),('process_step_changed'),('automation_triggered')
) AS x(t)
CROSS JOIN (VALUES ('agency_manager'),('employee')) AS y(r)
ON CONFLICT (notification_type, role) DO UPDATE
  SET in_app_enabled = true, email_enabled = true;

-- controlling
INSERT INTO public.notification_role_settings (notification_type, role, in_app_enabled, email_enabled)
SELECT t, 'controlling'::app_role, true, true
FROM (VALUES
  ('lead_ready_for_controlling'),
  ('lead_controlling_approved'),
  ('lead_controlling_rejected'),
  ('approval_reminder'),
  ('lead_status_change'),
  ('duplicate_detected')
) AS x(t)
ON CONFLICT (notification_type, role) DO UPDATE
  SET in_app_enabled = true, email_enabled = true;
