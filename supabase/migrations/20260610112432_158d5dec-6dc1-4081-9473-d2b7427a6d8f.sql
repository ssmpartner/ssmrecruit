
-- Expand Leads SELECT: Geschäftsleitung sees all leads (for statistics)
DROP POLICY IF EXISTS "Leads select scoped by role" ON public.leads;
CREATE POLICY "Leads select scoped by role"
ON public.leads
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    (is_demo = false)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role))
          AND agency_id = get_current_employee_agency())
      OR has_role(auth.uid(), 'controlling'::app_role)
      OR has_role(auth.uid(), 'geschaeftsleitung'::app_role)
      OR (has_role(auth.uid(), 'hr'::app_role)
          AND status IN ('hr_processing','management_approved','hired'))
      OR employee_id = get_current_employee_id()
    )
  )
);

-- can_access_lead: align with new GL read access
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
        OR public.has_role(auth.uid(), 'controlling'::app_role)
        OR public.has_role(auth.uid(), 'geschaeftsleitung'::app_role)
        OR (public.has_role(auth.uid(), 'hr'::app_role) AND l.status IN ('hr_processing','management_approved','hired'))
        OR l.employee_id = public.get_current_employee_id()
      )
  );
$$;
