-- Helper: can the current authenticated user access a given lead?
CREATE OR REPLACE FUNCTION public.can_access_lead(_lead_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = _lead_id
      AND (
        public.has_role(auth.uid(), 'superadmin'::app_role)
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR ((public.has_role(auth.uid(), 'agency_manager'::app_role)
             OR public.has_role(auth.uid(), 'backoffice'::app_role))
            AND l.agency_id = public.get_current_employee_agency())
        OR ((public.has_role(auth.uid(), 'controlling'::app_role)
             OR public.has_role(auth.uid(), 'geschaeftsleitung'::app_role)
             OR public.has_role(auth.uid(), 'hr'::app_role))
            AND l.assigned_approver_user_id = auth.uid())
        OR l.employee_id = public.get_current_employee_id()
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_lead(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_lead(text) TO authenticated;

DROP POLICY IF EXISTS "Authenticated can access activities" ON public.activities;
CREATE POLICY "Activities scoped by lead access"
ON public.activities FOR ALL TO authenticated
USING (public.can_access_lead(lead_id))
WITH CHECK (public.can_access_lead(lead_id));

DROP POLICY IF EXISTS "Authenticated can access appointments" ON public.appointments;
CREATE POLICY "Appointments scoped by lead access"
ON public.appointments FOR ALL TO authenticated
USING (public.can_access_lead(lead_id))
WITH CHECK (public.can_access_lead(lead_id));

DROP POLICY IF EXISTS "Authenticated can access tasks" ON public.tasks;
CREATE POLICY "Tasks scoped by lead/agency/assignee"
ON public.tasks FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
  OR (assigned_to IS NOT NULL AND assigned_to = public.get_current_employee_id())
  OR (agency_id IS NOT NULL AND agency_id = public.get_current_employee_agency())
)
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (lead_id IS NOT NULL AND public.can_access_lead(lead_id))
  OR (assigned_to IS NOT NULL AND assigned_to = public.get_current_employee_id())
  OR (agency_id IS NOT NULL AND agency_id = public.get_current_employee_agency())
);

DROP POLICY IF EXISTS "Authenticated can access lead_personal_data" ON public.lead_personal_data;
CREATE POLICY "Personal data scoped by lead access"
ON public.lead_personal_data FOR ALL TO authenticated
USING (public.can_access_lead(lead_id))
WITH CHECK (public.can_access_lead(lead_id));

DROP POLICY IF EXISTS "Authenticated can access insights_requests" ON public.insights_requests;
CREATE POLICY "Insights requests scoped by lead access"
ON public.insights_requests FOR ALL TO authenticated
USING (public.can_access_lead(lead_id))
WITH CHECK (public.can_access_lead(lead_id));

DROP POLICY IF EXISTS "Authenticated can insert status_wizard_results" ON public.status_wizard_results;
DROP POLICY IF EXISTS "Authenticated can read status_wizard_results" ON public.status_wizard_results;
CREATE POLICY "Wizard results scoped by lead access (select)"
ON public.status_wizard_results FOR SELECT TO authenticated
USING (public.can_access_lead(lead_id));
CREATE POLICY "Wizard results scoped by lead access (insert)"
ON public.status_wizard_results FOR INSERT TO authenticated
WITH CHECK (public.can_access_lead(lead_id));

DROP POLICY IF EXISTS "Authenticated can access employees" ON public.employees;
CREATE POLICY "Employees readable by authenticated"
ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employees writable by admins"
ON public.employees FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employees updatable by admins"
ON public.employees FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employees deletable by admins"
ON public.employees FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read integrations" ON public.integrations;

DROP POLICY IF EXISTS "Authenticated users can read ai_audit_logs" ON public.ai_audit_logs;
DROP POLICY IF EXISTS "Authenticated users can read ai_voice_sessions" ON public.ai_voice_sessions;
DROP POLICY IF EXISTS "Authenticated users can read ai_voice_turns" ON public.ai_voice_turns;

DROP POLICY IF EXISTS "Authenticated can insert leads" ON public.leads;
CREATE POLICY "Leads insert scoped by role"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR ((public.has_role(auth.uid(), 'agency_manager'::app_role)
       OR public.has_role(auth.uid(), 'backoffice'::app_role))
      AND agency_id = public.get_current_employee_agency())
  OR employee_id = public.get_current_employee_id()
);

DROP POLICY IF EXISTS "Authenticated can access applications" ON public.applications;
CREATE POLICY "Applications readable by admins or agency"
ON public.applications FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'hr'::app_role)
  OR (agency_id IS NOT NULL AND agency_id = public.get_current_employee_agency())
);
CREATE POLICY "Applications updatable by admins/hr"
ON public.applications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Applications deletable by admins"
ON public.applications FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Hide sensitive agency columns from anon (public wizards keep limited columns)
REVOKE SELECT ON public.agencies FROM anon;
GRANT SELECT (id, name, plz, city, region, language, color, allowed_cantons,
              latitude, longitude, radius_km, address, created_at, updated_at)
ON public.agencies TO anon;

DROP POLICY IF EXISTS "Anon can read assessment_results" ON public.assessment_results;
DROP POLICY IF EXISTS "Anon can read disc_results" ON public.disc_results;

DROP POLICY IF EXISTS "Anon can read document_requests by token" ON public.document_requests;
CREATE POLICY "Anon can read active document_requests"
ON public.document_requests FOR SELECT TO anon
USING (expires_at IS NULL OR expires_at > now());

DROP POLICY IF EXISTS "Anon can insert document_uploads" ON public.document_uploads;
CREATE POLICY "Anon can insert document_uploads via valid request"
ON public.document_uploads FOR INSERT TO anon
WITH CHECK (
  request_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.document_requests r
    WHERE r.id = request_id
      AND r.lead_id = document_uploads.lead_id
      AND (r.expires_at IS NULL OR r.expires_at > now())
  )
);