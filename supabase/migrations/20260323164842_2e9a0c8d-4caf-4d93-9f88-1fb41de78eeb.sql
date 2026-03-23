
-- Escalation Processes
CREATE TABLE public.escalation_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_process_status text NOT NULL,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  source_filters text[] NOT NULL DEFAULT '{}',
  applies_to_all_sources boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.escalation_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read escalation_processes" ON public.escalation_processes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can modify escalation_processes" ON public.escalation_processes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_escalation_processes_updated_at
  BEFORE UPDATE ON public.escalation_processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Escalation Rules
CREATE TABLE public.escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_process_id uuid NOT NULL REFERENCES public.escalation_processes(id) ON DELETE CASCADE,
  condition_type text NOT NULL DEFAULT '',
  condition_value text NOT NULL DEFAULT '',
  action_type text NOT NULL DEFAULT '',
  action_value text NOT NULL DEFAULT '',
  delay_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read escalation_rules" ON public.escalation_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can modify escalation_rules" ON public.escalation_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_escalation_rules_updated_at
  BEFORE UPDATE ON public.escalation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Escalation Wizard Links
CREATE TABLE public.escalation_wizard_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_process_id uuid NOT NULL REFERENCES public.escalation_processes(id) ON DELETE CASCADE,
  wizard_id uuid NOT NULL REFERENCES public.wizards(id) ON DELETE CASCADE,
  start_step_id text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.escalation_wizard_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read escalation_wizard_links" ON public.escalation_wizard_links
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can modify escalation_wizard_links" ON public.escalation_wizard_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));
