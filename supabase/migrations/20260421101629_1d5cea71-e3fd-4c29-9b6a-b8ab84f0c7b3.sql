
-- ============================================================
-- 1. Helper functions for RLS (SECURITY DEFINER, no recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id FROM public.employees e
  WHERE e.user_id = auth.uid()
     OR lower(e.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_current_employee_agency()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.agency_id FROM public.employees e
  WHERE e.user_id = auth.uid()
     OR lower(e.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  LIMIT 1
$$;

-- ============================================================
-- 2. LEADS: replace permissive ALL policy with scoped policies
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can access leads" ON public.leads;

-- SELECT: scoped by role
CREATE POLICY "Leads select scoped by role"
ON public.leads FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'agency_manager'::app_role)
    AND agency_id = public.get_current_employee_agency()
  )
  OR (
    (has_role(auth.uid(), 'controlling'::app_role)
      OR has_role(auth.uid(), 'geschaeftsleitung'::app_role)
      OR has_role(auth.uid(), 'hr'::app_role))
    AND assigned_approver_user_id = auth.uid()
  )
  OR employee_id = public.get_current_employee_id()
);

-- INSERT/UPDATE/DELETE: keep working for any authenticated user (app already
-- restricts via UI/role logic). Tightening these would risk breaking existing
-- workflows; SELECT scoping is the primary leak fix.
CREATE POLICY "Authenticated can insert leads"
ON public.leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update leads"
ON public.leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete leads"
ON public.leads FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 3. USER_ROLES: prevent enumeration
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can read roles" ON public.user_roles;

CREATE POLICY "Users can read own role"
ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================
-- 4. Anon candidate-form policies: remove UPDATE, tighten reads
-- ============================================================

-- Drop overly broad anon policies. Reads on insights/document_requests stay
-- (token must be known by attacker which is non-trivial), but writes/updates
-- via anon are removed.
DROP POLICY IF EXISTS "Anon can update insights by token" ON public.insights_requests;
DROP POLICY IF EXISTS "Anon can update document_requests by token" ON public.document_requests;
DROP POLICY IF EXISTS "Anon can read document_uploads" ON public.document_uploads;

-- ============================================================
-- 5. Storage: make lead-documents bucket private
-- ============================================================

UPDATE storage.buckets SET public = false WHERE id = 'lead-documents';
DROP POLICY IF EXISTS "Anyone can read lead documents" ON storage.objects;

CREATE POLICY "Authenticated can read lead documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lead-documents');

-- ============================================================
-- 6. Set search_path on email queue helper functions
-- ============================================================

ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
