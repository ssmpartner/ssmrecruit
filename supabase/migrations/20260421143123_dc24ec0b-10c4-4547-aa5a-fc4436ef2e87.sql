
CREATE OR REPLACE FUNCTION public.sync_lead_agency_with_employee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp_agency text;
BEGIN
  IF NEW.employee_id IS NOT NULL THEN
    SELECT agency_id INTO _emp_agency FROM public.employees WHERE id = NEW.employee_id;
    IF _emp_agency IS NOT NULL AND (NEW.agency_id IS DISTINCT FROM _emp_agency) THEN
      NEW.agency_id := _emp_agency;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_agency ON public.leads;
CREATE TRIGGER trg_sync_lead_agency
BEFORE INSERT OR UPDATE OF employee_id, agency_id ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_lead_agency_with_employee();
