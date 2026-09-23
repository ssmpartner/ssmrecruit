-- Agenturleiter sollen alle Agenturen sehen, für die sie als zuständiger Leiter eingetragen sind
CREATE OR REPLACE FUNCTION public.is_my_agency(_agency_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _agency_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND (
        e.agency_id = _agency_id
        OR EXISTS (
          SELECT 1 FROM public.agencies a
          WHERE a.id = _agency_id AND a.manager_employee_id = e.id
        )
      )
  );
$$;

COMMENT ON FUNCTION public.is_my_agency(text) IS 'Prüft, ob die Agentur die eigene ist oder vom aktuellen Benutzer als Agenturleiter geführt wird.';

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
            AND public.is_my_agency(l.agency_id))
        OR public.has_role(auth.uid(), 'controlling'::app_role)
        OR public.has_role(auth.uid(), 'geschaeftsleitung'::app_role)
        OR public.has_role(auth.uid(), 'hr'::app_role)
        OR l.employee_id = public.get_current_employee_id()
      )
  );
$$;

DROP POLICY IF EXISTS "Leads select scoped by role" ON public.leads;
CREATE POLICY "Leads select scoped by role" ON public.leads FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR ((is_demo = false) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND is_my_agency(agency_id))
    OR has_role(auth.uid(), 'controlling'::app_role)
    OR has_role(auth.uid(), 'geschaeftsleitung'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
    OR (employee_id = get_current_employee_id())
  ))
);

DROP POLICY IF EXISTS "Leads insert scoped by role" ON public.leads;
CREATE POLICY "Leads insert scoped by role" ON public.leads FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND is_my_agency(agency_id))
  OR (employee_id = get_current_employee_id())
);

DROP POLICY IF EXISTS "Leads delete scoped by role" ON public.leads;
CREATE POLICY "Leads delete scoped by role" ON public.leads FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR ((is_demo = false) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND is_my_agency(agency_id))
    OR (employee_id = get_current_employee_id())
  ))
);

DROP POLICY IF EXISTS "Leads update scoped by role" ON public.leads;
CREATE POLICY "Leads update scoped by role" ON public.leads FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR ((is_demo = false) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND is_my_agency(agency_id))
    OR (has_role(auth.uid(), 'controlling'::app_role) AND (status = 'ready_for_controlling'::text))
    OR (has_role(auth.uid(), 'geschaeftsleitung'::app_role) AND (status = ANY (ARRAY['controlling_approved'::text, 'management_review'::text])))
    OR (has_role(auth.uid(), 'hr'::app_role) AND (status = ANY (ARRAY['management_approved'::text, 'hr_processing'::text, 'hr_pending'::text, 'hired'::text])))
    OR (employee_id = get_current_employee_id())
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR ((is_demo = false) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND is_my_agency(agency_id))
    OR (has_role(auth.uid(), 'controlling'::app_role) AND (status = ANY (ARRAY['ready_for_controlling'::text, 'controlling_approved'::text, 'management_review'::text, 'hr_processing'::text, 'rejected'::text])))
    OR (has_role(auth.uid(), 'geschaeftsleitung'::app_role) AND (status = ANY (ARRAY['management_review'::text, 'management_approved'::text, 'hr_processing'::text, 'rejected'::text])))
    OR (has_role(auth.uid(), 'hr'::app_role) AND (status = ANY (ARRAY['hr_processing'::text, 'hr_pending'::text, 'hired'::text, 'rejected'::text])))
    OR (employee_id = get_current_employee_id())
  ))
);

DROP POLICY IF EXISTS "Tasks scoped by lead/agency/assignee" ON public.tasks;
CREATE POLICY "Tasks scoped by lead/agency/assignee" ON public.tasks FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR ((lead_id IS NOT NULL) AND can_access_lead(lead_id))
  OR ((assigned_to IS NOT NULL) AND (assigned_to = get_current_employee_id()))
  OR ((agency_id IS NOT NULL) AND is_my_agency(agency_id))
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR ((lead_id IS NOT NULL) AND can_access_lead(lead_id))
  OR ((assigned_to IS NOT NULL) AND (assigned_to = get_current_employee_id()))
  OR ((agency_id IS NOT NULL) AND is_my_agency(agency_id))
);

DROP POLICY IF EXISTS "Applications readable by admins or agency" ON public.applications;
CREATE POLICY "Applications readable by admins or agency" ON public.applications FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'hr'::app_role)
  OR ((agency_id IS NOT NULL) AND is_my_agency(agency_id))
);