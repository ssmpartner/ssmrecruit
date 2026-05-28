
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_leads_is_demo ON public.leads(is_demo);

-- Replace SELECT policy to hide demo leads from non-superadmins
DROP POLICY IF EXISTS "Leads select scoped by role" ON public.leads;
CREATE POLICY "Leads select scoped by role"
ON public.leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    is_demo = false
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND (agency_id = get_current_employee_agency()))
      OR ((has_role(auth.uid(), 'controlling'::app_role) OR has_role(auth.uid(), 'geschaeftsleitung'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND (assigned_approver_user_id = auth.uid()))
      OR (employee_id = get_current_employee_id())
    )
  )
);

-- Update UPDATE policy
DROP POLICY IF EXISTS "Leads update scoped by role" ON public.leads;
CREATE POLICY "Leads update scoped by role"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    is_demo = false
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND (agency_id = get_current_employee_agency()))
      OR ((has_role(auth.uid(), 'controlling'::app_role) OR has_role(auth.uid(), 'geschaeftsleitung'::app_role) OR has_role(auth.uid(), 'hr'::app_role)) AND (assigned_approver_user_id = auth.uid()))
      OR (employee_id = get_current_employee_id())
    )
  )
);

-- Update DELETE policy
DROP POLICY IF EXISTS "Leads delete scoped by role" ON public.leads;
CREATE POLICY "Leads delete scoped by role"
ON public.leads
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    is_demo = false
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role)) AND (agency_id = get_current_employee_agency()))
      OR (employee_id = get_current_employee_id())
    )
  )
);
