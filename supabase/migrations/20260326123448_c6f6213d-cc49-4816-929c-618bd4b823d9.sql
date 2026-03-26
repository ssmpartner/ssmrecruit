CREATE OR REPLACE FUNCTION public.resolve_agency_by_canton(_canton_code text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _agency_id text;
  _hauptsitz_id text;
  _month_start timestamptz;
  _lead_count int;
BEGIN
  _month_start := date_trunc('month', now());

  -- Find specific agency (not Hauptsitz) that has this canton and is within quota
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

  -- Fallback to Hauptsitz
  SELECT id INTO _hauptsitz_id
  FROM public.agencies
  WHERE name ILIKE '%hauptsitz%'
  LIMIT 1;

  IF _hauptsitz_id IS NOT NULL THEN
    RETURN _hauptsitz_id;
  END IF;

  -- Final fallback: first agency
  SELECT id INTO _agency_id
  FROM public.agencies
  LIMIT 1;

  RETURN _agency_id;
END;
$function$;