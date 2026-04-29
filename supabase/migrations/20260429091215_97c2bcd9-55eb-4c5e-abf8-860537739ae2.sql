DROP POLICY IF EXISTS "Leads select scoped by role" ON public.leads;

CREATE POLICY "Leads select scoped by role"
ON public.leads
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    (
      public.has_role(auth.uid(), 'agency_manager'::public.app_role)
      OR public.has_role(auth.uid(), 'backoffice'::public.app_role)
    )
    AND agency_id = public.get_current_employee_agency()
  )
  OR (
    (
      public.has_role(auth.uid(), 'controlling'::public.app_role)
      OR public.has_role(auth.uid(), 'geschaeftsleitung'::public.app_role)
      OR public.has_role(auth.uid(), 'hr'::public.app_role)
    )
    AND assigned_approver_user_id = auth.uid()
  )
  OR employee_id = public.get_current_employee_id()
);