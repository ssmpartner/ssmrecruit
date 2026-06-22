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

  SELECT e.id INTO _employee_id
  FROM public.employees e
  LEFT JOIN (
    SELECT employee_id, count(*) as lead_count
    FROM public.leads
    WHERE created_at >= _month_start
    GROUP BY employee_id
  ) lc ON lc.employee_id = e.id
  WHERE e.agency_id = _agency_id
    AND COALESCE(e.role, '') NOT IN ('backoffice', 'geschaeftsleitung', 'controlling', 'hr')
    AND COALESCE(e.can_receive_leads, true) = true
  ORDER BY COALESCE(lc.lead_count, 0) ASC, e.created_at ASC
  LIMIT 1;

  IF _employee_id IS NULL THEN
    SELECT id INTO _employee_id FROM public.employees
    WHERE COALESCE(role, '') NOT IN ('backoffice', 'geschaeftsleitung', 'controlling', 'hr')
      AND COALESCE(can_receive_leads, true) = true
    LIMIT 1;
  END IF;

  RETURN _employee_id;
END;
$function$;