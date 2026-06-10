DROP POLICY IF EXISTS "Leads update scoped by role" ON public.leads;

CREATE POLICY "Leads update scoped by role"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    is_demo = false
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        (public.has_role(auth.uid(), 'agency_manager'::app_role) OR public.has_role(auth.uid(), 'backoffice'::app_role))
        AND agency_id = public.get_current_employee_agency()
      )
      OR (public.has_role(auth.uid(), 'controlling'::app_role) AND status = 'ready_for_controlling')
      OR (public.has_role(auth.uid(), 'geschaeftsleitung'::app_role) AND status IN ('controlling_approved', 'management_review'))
      OR (public.has_role(auth.uid(), 'hr'::app_role) AND status IN ('management_approved', 'hr_processing', 'hired'))
      OR employee_id = public.get_current_employee_id()
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    is_demo = false
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        (public.has_role(auth.uid(), 'agency_manager'::app_role) OR public.has_role(auth.uid(), 'backoffice'::app_role))
        AND agency_id = public.get_current_employee_agency()
      )
      OR (public.has_role(auth.uid(), 'controlling'::app_role) AND status IN ('controlling_approved', 'management_review', 'rejected'))
      OR (public.has_role(auth.uid(), 'geschaeftsleitung'::app_role) AND status IN ('management_review', 'management_approved', 'rejected'))
      OR (public.has_role(auth.uid(), 'hr'::app_role) AND status IN ('hr_processing', 'hired', 'rejected'))
      OR employee_id = public.get_current_employee_id()
    )
  )
);