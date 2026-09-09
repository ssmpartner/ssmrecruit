CREATE OR REPLACE FUNCTION public.has_contract_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
  _explicit boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  IF public.has_role(_user_id, 'superadmin'::app_role)
     OR public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;

  SELECT role::text INTO _role
  FROM public.user_roles WHERE user_id = _user_id LIMIT 1;

  -- Recruiter-Rollen: ausschliesslich Leserecht, keine explizite Erweiterung
  IF _role IN ('teamleiter','backoffice','agency_manager','employee','analyst') THEN
    RETURN _perm = 'can_view';
  END IF;

  EXECUTE format(
    'SELECT %I FROM public.contract_permissions WHERE user_id = $1 LIMIT 1',
    _perm
  ) INTO _explicit USING _user_id;
  IF _explicit IS TRUE THEN RETURN true; END IF;

  IF _role = 'hr' THEN
    RETURN _perm IN ('can_view','can_generate','can_edit','can_finalize','can_send');
  END IF;

  IF _role = 'geschaeftsleitung' THEN
    RETURN _perm IN ('can_view','can_generate');
  END IF;

  RETURN false;
EXCEPTION WHEN undefined_column THEN
  RETURN false;
END;
$function$;