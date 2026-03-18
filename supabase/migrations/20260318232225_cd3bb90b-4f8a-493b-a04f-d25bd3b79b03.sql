
-- Tighten RLS policies: Replace wide-open public policies with authenticated-only access

-- LEADS
DROP POLICY IF EXISTS "Allow all access to leads" ON public.leads;
CREATE POLICY "Authenticated can access leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ACTIVITIES
DROP POLICY IF EXISTS "Allow all access to activities" ON public.activities;
CREATE POLICY "Authenticated can access activities" ON public.activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AGENCIES
DROP POLICY IF EXISTS "Allow all access to agencies" ON public.agencies;
CREATE POLICY "Authenticated can access agencies" ON public.agencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EMPLOYEES
DROP POLICY IF EXISTS "Allow all access to employees" ON public.employees;
CREATE POLICY "Authenticated can access employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- APPOINTMENTS
DROP POLICY IF EXISTS "Allow all access to appointments" ON public.appointments;
CREATE POLICY "Authenticated can access appointments" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TASKS
DROP POLICY IF EXISTS "Allow all access to tasks" ON public.tasks;
CREATE POLICY "Authenticated can access tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Allow all access to notifications" ON public.notifications;
CREATE POLICY "Authenticated can access notifications" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- APP_SETTINGS
DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;
CREATE POLICY "Authenticated can read app_settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins can modify app_settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role)) WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- DISC_RESULTS
DROP POLICY IF EXISTS "Allow all access to disc_results" ON public.disc_results;
CREATE POLICY "Authenticated can access disc_results" ON public.disc_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
