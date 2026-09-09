ALTER TABLE public.appointment_suggestions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'candidate',
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'interview',
  ADD COLUMN IF NOT EXISTS appointment_title text,
  ADD COLUMN IF NOT EXISTS appointment_type text NOT NULL DEFAULT 'onsite',
  ADD COLUMN IF NOT EXISTS duration integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_name text;

CREATE INDEX IF NOT EXISTS idx_appointment_suggestions_lead_purpose
  ON public.appointment_suggestions (lead_id, purpose);

INSERT INTO public.notification_role_settings (notification_type, role, in_app_enabled, email_enabled)
SELECT t, r::app_role, true, true
FROM (VALUES
  ('contract_appointment_proposed'),
  ('contract_appointment_confirmed')
) AS x(t)
CROSS JOIN (VALUES
  ('superadmin'),('admin'),('teamleiter'),('backoffice'),('agency_manager'),('employee'),('hr')
) AS y(r)
ON CONFLICT (notification_type, role) DO UPDATE
  SET in_app_enabled = true, email_enabled = true;