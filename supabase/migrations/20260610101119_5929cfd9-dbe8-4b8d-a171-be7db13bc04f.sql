
-- Expand Controlling read access to all leads (for cross-agency statistics)
-- Keeps Controlling restricted to UPDATE/DELETE only on ready_for_controlling.

DROP POLICY IF EXISTS "Leads select scoped by role" ON public.leads;
CREATE POLICY "Leads select scoped by role" ON public.leads
FOR SELECT USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    (is_demo = false) AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND (agency_id = get_current_employee_agency()))
      OR has_role(auth.uid(), 'controlling'::app_role)
      OR (has_role(auth.uid(), 'geschaeftsleitung'::app_role) AND (status = ANY (ARRAY['management_review'::text, 'controlling_approved'::text])))
      OR (has_role(auth.uid(), 'hr'::app_role) AND (status = ANY (ARRAY['hr_processing'::text, 'management_approved'::text, 'hired'::text])))
      OR (employee_id = get_current_employee_id())
    )
  )
);

-- Update can_access_lead so Controlling can also read related activities/appointments for analytics
CREATE OR REPLACE FUNCTION public.can_access_lead(_lead_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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
        OR public.has_role(auth.uid(), 'controlling'::app_role)
        OR (public.has_role(auth.uid(), 'geschaeftsleitung'::app_role) AND l.status IN ('management_review','controlling_approved'))
        OR (public.has_role(auth.uid(), 'hr'::app_role) AND l.status IN ('hr_processing','management_approved','hired'))
        OR l.employee_id = public.get_current_employee_id()
      )
  );
$$;
