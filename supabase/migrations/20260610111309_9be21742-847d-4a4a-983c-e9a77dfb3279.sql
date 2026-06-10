
-- 1. Track per-user Geschäftsleitung decisions per lead
CREATE TABLE public.lead_management_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  comment text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_management_approvals TO authenticated;
GRANT ALL ON public.lead_management_approvals TO service_role;

ALTER TABLE public.lead_management_approvals ENABLE ROW LEVEL SECURITY;

-- Anyone who can access the lead can read approvals (so detail view shows them to all roles).
CREATE POLICY "Read approvals when lead accessible"
ON public.lead_management_approvals
FOR SELECT TO authenticated
USING (public.can_access_lead(lead_id));

-- Only Geschäftsleitung users may record their own decision (and only their own row).
CREATE POLICY "GL can insert own decision"
ON public.lead_management_approvals
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.has_role(auth.uid(), 'geschaeftsleitung'::app_role)
);

CREATE POLICY "GL can update own decision"
ON public.lead_management_approvals
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.has_role(auth.uid(), 'geschaeftsleitung'::app_role)
)
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Superadmin manages approvals"
ON public.lead_management_approvals
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

-- 2. Helper: list all Geschäftsleitung users with display info (SECURITY DEFINER bypasses RLS on user_roles/profiles)
CREATE OR REPLACE FUNCTION public.get_geschaeftsleitung_users()
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id, p.display_name, p.avatar_url
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'geschaeftsleitung'::app_role
$$;

GRANT EXECUTE ON FUNCTION public.get_geschaeftsleitung_users() TO authenticated;

-- 3. Allow GL to UPDATE leads also while in 'controlling_approved' (first GL decision moves it to management_review)
DROP POLICY IF EXISTS "Leads update scoped by role" ON public.leads;
CREATE POLICY "Leads update scoped by role"
ON public.leads
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    (is_demo = false)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((has_role(auth.uid(), 'agency_manager'::app_role) OR has_role(auth.uid(), 'backoffice'::app_role))
          AND agency_id = get_current_employee_agency())
      OR (has_role(auth.uid(), 'controlling'::app_role) AND status = 'ready_for_controlling')
      OR (has_role(auth.uid(), 'geschaeftsleitung'::app_role)
          AND status IN ('controlling_approved','management_review'))
      OR (has_role(auth.uid(), 'hr'::app_role)
          AND status IN ('hr_processing','management_approved','hired'))
      OR employee_id = get_current_employee_id()
    )
  )
);
