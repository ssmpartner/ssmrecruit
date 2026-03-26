CREATE OR REPLACE FUNCTION public.resolve_employee_by_agency(_agency_id text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _employee_id text;
  _month_start timestamptz;
BEGIN
  _month_start := date_trunc('month', now());

  -- Pick the employee in this agency with the fewest leads this month
  SELECT e.id INTO _employee_id
  FROM public.employees e
  LEFT JOIN (
    SELECT employee_id, count(*) as lead_count
    FROM public.leads
    WHERE created_at >= _month_start
    GROUP BY employee_id
  ) lc ON lc.employee_id = e.id
  WHERE e.agency_id = _agency_id
  ORDER BY COALESCE(lc.lead_count, 0) ASC, e.created_at ASC
  LIMIT 1;

  -- Fallback: any employee
  IF _employee_id IS NULL THEN
    SELECT id INTO _employee_id FROM public.employees LIMIT 1;
  END IF;

  RETURN _employee_id;
END;
$function$;