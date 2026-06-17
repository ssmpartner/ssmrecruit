
CREATE TABLE public.employee_notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_new_lead_email boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_notification_prefs TO authenticated;
GRANT ALL ON public.employee_notification_prefs TO service_role;

ALTER TABLE public.employee_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification prefs"
  ON public.employee_notification_prefs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Superadmin manages all notification prefs"
  ON public.employee_notification_prefs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins read all notification prefs"
  ON public.employee_notification_prefs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_employee_notification_prefs_updated_at
  BEFORE UPDATE ON public.employee_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: aktiviere Opt-in für bestehenden Testempfänger (Bilel), falls vorhanden
INSERT INTO public.employee_notification_prefs (user_id, notify_new_lead_email)
SELECT e.user_id, true
FROM public.employees e
WHERE e.email = 'bilel.chagra@ssmpartner.ch' AND e.user_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET notify_new_lead_email = true;
