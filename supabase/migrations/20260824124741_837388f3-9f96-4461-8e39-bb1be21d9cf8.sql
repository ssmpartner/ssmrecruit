UPDATE public.employees SET can_receive_leads = false, updated_at = now() WHERE name = 'Recruit Dummy';

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
    AND COALESCE(e.role, '') NOT IN ('backoffice', 'geschaeftsleitung', 'controlling', 'hr', 'superadmin', 'admin')
    AND COALESCE(e.can_receive_leads, true) = true
  ORDER BY COALESCE(lc.lead_count, 0) ASC, e.created_at ASC
  LIMIT 1;

  IF _employee_id IS NOT NULL THEN
    RETURN _employee_id;
  END IF;

  -- Fallback: least loaded eligible employee in a regular (non-Hauptsitz) agency
  SELECT e.id INTO _employee_id
  FROM public.employees e
  JOIN public.agencies a ON a.id = e.agency_id AND a.name NOT ILIKE '%hauptsitz%'
  LEFT JOIN (
    SELECT employee_id, count(*) as lead_count
    FROM public.leads
    WHERE created_at >= _month_start
    GROUP BY employee_id
  ) lc ON lc.employee_id = e.id
  WHERE COALESCE(e.role, '') NOT IN ('backoffice', 'geschaeftsleitung', 'controlling', 'hr', 'superadmin', 'admin')
    AND COALESCE(e.can_receive_leads, true) = true
  ORDER BY COALESCE(lc.lead_count, 0) ASC, e.created_at ASC
  LIMIT 1;

  RETURN _employee_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_agency_by_canton(_canton_code text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _agency_id text;
  _month_start timestamptz;
BEGIN
  _month_start := date_trunc('month', now());

  IF _canton_code IS NOT NULL AND _canton_code <> '' THEN
    SELECT a.id INTO _agency_id
    FROM public.agencies a
    WHERE _canton_code = ANY(a.allowed_cantons)
      AND a.name NOT ILIKE '%hauptsitz%'
      AND (
        a.monthly_lead_quota IS NULL
        OR (SELECT count(*) FROM public.leads l WHERE l.agency_id = a.id AND l.created_at >= _month_start) < a.monthly_lead_quota
      )
      AND EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.agency_id = a.id
          AND COALESCE(e.role, '') NOT IN ('backoffice','geschaeftsleitung','controlling','hr','superadmin','admin')
          AND COALESCE(e.can_receive_leads, true) = true
      )
    ORDER BY array_length(a.allowed_cantons, 1) ASC
    LIMIT 1;

    IF _agency_id IS NOT NULL THEN
      RETURN _agency_id;
    END IF;
  END IF;

  SELECT a.id INTO _agency_id
  FROM public.agencies a
  LEFT JOIN (
    SELECT agency_id, count(*) AS cnt
    FROM public.leads
    WHERE created_at >= date_trunc('month', now())
    GROUP BY agency_id
  ) lc ON lc.agency_id = a.id
  WHERE a.name NOT ILIKE '%hauptsitz%'
    AND (a.monthly_lead_quota IS NULL OR COALESCE(lc.cnt, 0) < a.monthly_lead_quota)
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.agency_id = a.id
        AND COALESCE(e.role, '') NOT IN ('backoffice','geschaeftsleitung','controlling','hr','superadmin','admin')
        AND COALESCE(e.can_receive_leads, true) = true
    )
  ORDER BY COALESCE(lc.cnt, 0) ASC, a.created_at ASC
  LIMIT 1;

  IF _agency_id IS NOT NULL THEN
    RETURN _agency_id;
  END IF;

  SELECT id INTO _agency_id FROM public.agencies WHERE name ILIKE '%hauptsitz%' LIMIT 1;
  RETURN _agency_id;
END;
$function$;

DO $$
DECLARE
  _hq text;
  _dummy text;
  _rec record;
  _agency text;
  _emp text;
BEGIN
  SELECT id INTO _hq FROM public.agencies WHERE name ILIKE '%hauptsitz%' LIMIT 1;
  SELECT id INTO _dummy FROM public.employees WHERE name = 'Recruit Dummy' LIMIT 1;

  FOR _rec IN
    SELECT l.id, l.canton_code
    FROM public.leads l
    WHERE l.lead_lifecycle = 'active'
      AND COALESCE(l.notes, '') NOT ILIKE '%duplikat%'
      AND (l.employee_id = _dummy OR (l.agency_id = _hq AND l.employee_id = _dummy))
    ORDER BY l.created_at
  LOOP
    _agency := public.resolve_agency_by_canton(COALESCE(_rec.canton_code, ''));
    _emp := public.resolve_employee_by_agency(_agency);
    IF _agency IS NULL OR _emp IS NULL OR _agency = _hq OR _emp = _dummy THEN
      CONTINUE;
    END IF;
    UPDATE public.leads
      SET agency_id = _agency, employee_id = _emp, updated_at = now()
      WHERE id = _rec.id;
  END LOOP;
END $$;