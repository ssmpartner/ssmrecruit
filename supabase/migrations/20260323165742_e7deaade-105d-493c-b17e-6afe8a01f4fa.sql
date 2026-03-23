
ALTER TABLE public.escalation_rules
  ADD COLUMN IF NOT EXISTS test_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.escalation_wizard_links
  ADD COLUMN IF NOT EXISTS test_only boolean NOT NULL DEFAULT false;
