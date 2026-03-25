CREATE OR REPLACE FUNCTION public.prevent_test_lead_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.id = 'test-lead-dummy-001' THEN
    RAISE EXCEPTION 'Der System-Test-Lead darf nicht gelöscht werden.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER protect_test_lead
  BEFORE DELETE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_test_lead_deletion();