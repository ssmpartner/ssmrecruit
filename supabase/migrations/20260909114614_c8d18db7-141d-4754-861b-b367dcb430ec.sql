CREATE OR REPLACE FUNCTION public.enforce_controlling_approval_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wizard_type = 'controlling_approval' THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW; -- service role / edge functions
    END IF;
    IF NOT (public.has_role(auth.uid(), 'controlling') OR public.has_role(auth.uid(), 'superadmin')) THEN
      RAISE EXCEPTION 'Keine Berechtigung: Die Controlling-Freigabe darf nur von der Rolle Controlling erteilt werden.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_controlling_approval_role ON public.status_wizard_results;
CREATE TRIGGER trg_enforce_controlling_approval_role
BEFORE INSERT OR UPDATE ON public.status_wizard_results
FOR EACH ROW EXECUTE FUNCTION public.enforce_controlling_approval_role();

CREATE OR REPLACE FUNCTION public.enforce_controlling_status_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'controlling_approved' AND COALESCE(OLD.status, '') <> 'controlling_approved' THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF NOT (public.has_role(auth.uid(), 'controlling') OR public.has_role(auth.uid(), 'superadmin')) THEN
      RAISE EXCEPTION 'Keine Berechtigung: Nur die Rolle Controlling darf einen Kandidaten auf "Controlling freigegeben" setzen.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_controlling_status_role ON public.leads;
CREATE TRIGGER trg_enforce_controlling_status_role
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.enforce_controlling_status_role();