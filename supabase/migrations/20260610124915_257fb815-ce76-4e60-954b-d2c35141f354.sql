DROP POLICY IF EXISTS "Leads update scoped by role" ON public.leads;

CREATE POLICY "Leads update scoped by role"
ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    is_demo = false
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND agency_id = get_current_employee_agency())
      OR (has_role(auth.uid(), 'controlling'::app_role) AND status = 'ready_for_controlling')
      OR (has_role(auth.uid(), 'geschaeftsleitung'::app_role) AND status = ANY (ARRAY['controlling_approved','management_review']))
      OR (has_role(auth.uid(), 'hr'::app_role) AND status = ANY (ARRAY['management_approved','hr_processing','hired']))
      OR employee_id = get_current_employee_id()
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    is_demo = false
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND agency_id = get_current_employee_agency())
      OR (has_role(auth.uid(), 'controlling'::app_role) AND status = ANY (ARRAY['controlling_approved','management_review','rejected']))
      OR (has_role(auth.uid(), 'geschaeftsleitung'::app_role) AND status = ANY (ARRAY['management_review','management_approved','hr_processing','rejected']))
      OR (has_role(auth.uid(), 'hr'::app_role) AND status = ANY (ARRAY['hr_processing','hired','rejected']))
      OR employee_id = get_current_employee_id()
    )
  )
);