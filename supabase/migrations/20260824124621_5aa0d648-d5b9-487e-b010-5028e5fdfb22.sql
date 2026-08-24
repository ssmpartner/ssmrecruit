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

  -- 1) Canton match (non-Hauptsitz, within quota)
  IF _canton_code IS NOT NULL AND _canton_code <> '' THEN
    SELECT a.id INTO _agency_id
    FROM public.agencies a
    WHERE _canton_code = ANY(a.allowed_cantons)
      AND a.name NOT ILIKE '%hauptsitz%'
      AND (
        a.monthly_lead_quota IS NULL
        OR (SELECT count(*) FROM public.leads l WHERE l.agency_id = a.id AND l.created_at >= _month_start) < a.monthly_lead_quota
      )
    ORDER BY array_length(a.allowed_cantons, 1) ASC
    LIMIT 1;

    IF _agency_id IS NOT NULL THEN
      RETURN _agency_id;
    END IF;
  END IF;

  -- 2) Fair fallback: least loaded non-Hauptsitz agency within quota (Hauptsitz only for duplicates)
  SELECT a.id INTO _agency_id
  FROM public.agencies a
  LEFT JOIN (
    SELECT agency_id, count(*) AS cnt
    FROM public.leads
    WHERE created_at >= date_trunc('month', now())
    GROUP BY agency_id
  ) lc ON lc.agency_id = a.id
  WHERE a.name NOT ILIKE '%hauptsitz%'
    AND (
      a.monthly_lead_quota IS NULL
      OR COALESCE(lc.cnt, 0) < a.monthly_lead_quota
    )
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.agency_id = a.id
        AND COALESCE(e.role, '') NOT IN ('backoffice','geschaeftsleitung','controlling','hr')
        AND COALESCE(e.can_receive_leads, true) = true
    )
  ORDER BY COALESCE(lc.cnt, 0) ASC, a.created_at ASC
  LIMIT 1;

  IF _agency_id IS NOT NULL THEN
    RETURN _agency_id;
  END IF;

  -- 3) Last resort: Hauptsitz
  SELECT id INTO _agency_id FROM public.agencies WHERE name ILIKE '%hauptsitz%' LIMIT 1;
  IF _agency_id IS NOT NULL THEN
    RETURN _agency_id;
  END IF;

  SELECT id INTO _agency_id FROM public.agencies LIMIT 1;
  RETURN _agency_id;
END;
$function$;

-- Backfill: move non-duplicate leads away from Hauptsitz/Dummy
DO $$
DECLARE
  _hq text;
  _rec record;
  _agency text;
  _emp text;
BEGIN
  SELECT id INTO _hq FROM public.agencies WHERE name ILIKE '%hauptsitz%' LIMIT 1;
  IF _hq IS NULL THEN RETURN; END IF;

  FOR _rec IN
    SELECT l.id, l.canton_code
    FROM public.leads l
    JOIN public.employees e ON e.id = l.employee_id
    WHERE l.agency_id = _hq
      AND l.lead_lifecycle = 'active'
      AND COALESCE(l.notes, '') NOT ILIKE '%duplikat%'
      AND e.name = 'Recruit Dummy'
    ORDER BY l.created_at
  LOOP
    _agency := public.resolve_agency_by_canton(COALESCE(_rec.canton_code, ''));
    IF _agency IS NULL OR _agency = _hq THEN
      CONTINUE;
    END IF;
    _emp := public.resolve_employee_by_agency(_agency);
    IF _emp IS NULL THEN
      CONTINUE;
    END IF;
    UPDATE public.leads
      SET agency_id = _agency, employee_id = _emp, updated_at = now()
      WHERE id = _rec.id;
  END LOOP;
END $$;