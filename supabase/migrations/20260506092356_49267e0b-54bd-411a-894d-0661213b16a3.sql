-- 1. insights_requests: remove anonymous SELECT (now via edge function lookup-public-form)
DROP POLICY IF EXISTS "Anon can read insights by token" ON public.insights_requests;

-- 2. appointment_suggestions: remove anonymous SELECT (not needed by public flow)
DROP POLICY IF EXISTS "Anon can read own suggestions" ON public.appointment_suggestions;

-- 3. notifications: scope to recipient (or broadcast=null) + admins
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_user_id uuid;
CREATE INDEX IF NOT EXISTS notifications_recipient_user_id_idx ON public.notifications (recipient_user_id);

DROP POLICY IF EXISTS "Authenticated can access notifications" ON public.notifications;

CREATE POLICY "Notifications select scoped"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    recipient_user_id IS NULL
    OR recipient_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Notifications insert authenticated"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Notifications update scoped"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    recipient_user_id IS NULL
    OR recipient_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    recipient_user_id IS NULL
    OR recipient_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Notifications delete scoped"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (
    recipient_user_id IS NULL
    OR recipient_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Remove email-based fallback in employee resolution (privilege escalation risk)
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_current_employee_agency()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.agency_id FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1
$$;
