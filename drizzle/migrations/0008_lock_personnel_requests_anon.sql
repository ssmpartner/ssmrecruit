DROP POLICY IF EXISTS "Anon can read personnel_requests by token" ON public.personnel_requests;
DROP POLICY IF EXISTS "Anon can update personnel_requests" ON public.personnel_requests;
REVOKE SELECT, UPDATE ON public.personnel_requests FROM anon;