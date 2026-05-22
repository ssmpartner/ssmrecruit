
-- Tighten DELETE & UPDATE policies on leads so employees can only modify/delete
-- their own (or assigned to them) leads. Agency managers/backoffice limited to
-- their agency. Admins/superadmins unrestricted. Review roles cannot delete.

DROP POLICY IF EXISTS "Authenticated can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated can update leads" ON public.leads;

CREATE POLICY "Leads delete scoped by role"
ON public.leads
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    (has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role))
    AND agency_id = get_current_employee_agency()
  )
  OR (employee_id = get_current_employee_id())
);

CREATE POLICY "Leads update scoped by role"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    (has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role))
    AND agency_id = get_current_employee_agency()
  )
  OR (
    (has_role(auth.uid(), 'controlling'::app_role) OR has_role(auth.uid(), 'geschaeftsleitung'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
    AND assigned_approver_user_id = auth.uid()
  )
  OR (employee_id = get_current_employee_id())
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    (has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role))
    AND agency_id = get_current_employee_agency()
  )
  OR (
    (has_role(auth.uid(), 'controlling'::app_role) OR has_role(auth.uid(), 'geschaeftsleitung'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
    AND assigned_approver_user_id = auth.uid()
  )
  OR (employee_id = get_current_employee_id())
);
