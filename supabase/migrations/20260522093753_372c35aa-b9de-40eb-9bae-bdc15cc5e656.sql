UPDATE public.profiles p
SET display_name = e.name, updated_at = now()
FROM public.employees e
WHERE e.user_id = p.id
  AND e.name IS NOT NULL
  AND e.name <> ''
  AND (p.display_name IS NULL OR p.display_name = '' OR p.display_name LIKE '%@%');