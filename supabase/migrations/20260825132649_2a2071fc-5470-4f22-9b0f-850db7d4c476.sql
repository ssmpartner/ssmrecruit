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

  EXECUTE format(
    'SELECT %I FROM public.contract_permissions WHERE user_id = $1 LIMIT 1',
    _perm
  ) INTO _explicit USING _user_id;
  IF _explicit IS TRUE THEN RETURN true; END IF;

  SELECT role::text INTO _role
  FROM public.user_roles WHERE user_id = _user_id LIMIT 1;

  IF _role = 'hr' THEN
    RETURN _perm IN ('can_view','can_generate','can_edit','can_finalize','can_send');
  END IF;

  IF _role = 'geschaeftsleitung' THEN
    RETURN _perm IN ('can_view','can_generate');
  END IF;

  IF _role IN ('teamleiter','backoffice','agency_manager') THEN
    RETURN _perm IN ('can_view','can_generate','can_edit');
  END IF;

  RETURN false;
EXCEPTION WHEN undefined_column THEN
  RETURN false;
END;
$function$;

CREATE POLICY "contracts_select_perm" ON public.contracts
  FOR SELECT TO authenticated
  USING (public.has_contract_permission(auth.uid(), 'can_view'));

CREATE POLICY "contracts_insert_perm" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_contract_permission(auth.uid(), 'can_generate'));

CREATE POLICY "contracts_update_perm" ON public.contracts
  FOR UPDATE TO authenticated
  USING (
    public.has_contract_permission(auth.uid(), 'can_edit')
    OR public.has_contract_permission(auth.uid(), 'can_finalize')
    OR public.has_contract_permission(auth.uid(), 'can_send')
  )
  WITH CHECK (
    public.has_contract_permission(auth.uid(), 'can_edit')
    OR public.has_contract_permission(auth.uid(), 'can_finalize')
    OR public.has_contract_permission(auth.uid(), 'can_send')
  );

CREATE POLICY "contract_versions_select_perm" ON public.contract_versions
  FOR SELECT TO authenticated
  USING (public.has_contract_permission(auth.uid(), 'can_view'));

CREATE POLICY "contract_attachments_select_perm" ON public.contract_attachments
  FOR SELECT TO authenticated
  USING (public.has_contract_permission(auth.uid(), 'can_view'));

CREATE POLICY "contracts_bucket_read_perm" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contracts' AND public.has_contract_permission(auth.uid(), 'can_view'));