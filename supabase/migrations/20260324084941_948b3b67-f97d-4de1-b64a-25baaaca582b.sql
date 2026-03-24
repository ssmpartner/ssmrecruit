
CREATE OR REPLACE FUNCTION public.resolve_agency_by_canton(_canton_code text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency_id text;
  _hauptsitz_id text;
BEGIN
  -- Find specific agency (not Hauptsitz) that has this canton in allowed_cantons
  SELECT id INTO _agency_id
  FROM public.agencies
  WHERE _canton_code = ANY(allowed_cantons)
    AND name NOT ILIKE '%hauptsitz%'
  ORDER BY array_length(allowed_cantons, 1) ASC -- prefer most specific agency
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
$$;
