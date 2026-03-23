
ALTER TABLE public.escalation_wizard_links
  ADD COLUMN IF NOT EXISTS delay_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER update_escalation_wizard_links_updated_at
  BEFORE UPDATE ON public.escalation_wizard_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
