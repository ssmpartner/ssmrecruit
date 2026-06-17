
CREATE TABLE public.notification_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','in_app')),
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email text,
  recipient_name text,
  triggered_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_source text NOT NULL DEFAULT 'system',
  trigger_label text,
  entity_type text,
  entity_id text,
  subject text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','skipped')),
  error text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_log_created_at ON public.notification_activity_log (created_at DESC);
CREATE INDEX idx_notif_log_type ON public.notification_activity_log (notification_type);
CREATE INDEX idx_notif_log_recipient ON public.notification_activity_log (recipient_user_id);

GRANT SELECT ON public.notification_activity_log TO authenticated;
GRANT ALL ON public.notification_activity_log TO service_role;

ALTER TABLE public.notification_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins read notification activity log"
  ON public.notification_activity_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));
