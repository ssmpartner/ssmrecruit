
INSERT INTO public.user_roles (user_id, role)
SELECT e.user_id, e.role::public.app_role
FROM public.employees e
WHERE e.user_id IS NOT NULL
  AND e.role IS NOT NULL
  AND e.role::text = ANY(ARRAY(SELECT unnest(enum_range(NULL::public.app_role))::text))
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.user_id)
ON CONFLICT (user_id, role) DO NOTHING;
