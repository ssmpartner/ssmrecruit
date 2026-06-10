
-- Expand HR read access (parity with Controlling & GL) + add generic role-users RPC

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
      OR has_role(auth.uid(), 'hr'::app_role)
      OR employee_id = get_current_employee_id()
    )
  )
);

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
        OR public.has_role(auth.uid(), 'hr'::app_role)
        OR l.employee_id = public.get_current_employee_id()
      )
  );
$$;

-- Generic helper to list all users having a given role with display info
CREATE OR REPLACE FUNCTION public.get_role_users(_role app_role)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id, p.display_name, p.avatar_url
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = _role
$$;

GRANT EXECUTE ON FUNCTION public.get_role_users(app_role) TO authenticated;
