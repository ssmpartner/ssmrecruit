
-- AI Provider Configs
CREATE TABLE public.ai_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider_category text NOT NULL DEFAULT 'telephony' CHECK (provider_category IN ('telephony', 'voice_ai', 'stt', 'tts')),
  provider_type text NOT NULL DEFAULT 'mock',
  endpoint_url text NOT NULL DEFAULT '',
  api_key_placeholder text NOT NULL DEFAULT '',
  webhook_url_placeholder text NOT NULL DEFAULT '',
  sandbox_mode boolean NOT NULL DEFAULT true,
  production_mode boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_provider_configs" ON public.ai_provider_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins can manage ai_provider_configs" ON public.ai_provider_configs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- AI Agents
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  agent_type text NOT NULL DEFAULT 'inbound' CHECK (agent_type IN ('inbound', 'outbound', 'hybrid')),
  language text NOT NULL DEFAULT 'de',
  voice_id text NOT NULL DEFAULT '',
  system_prompt text NOT NULL DEFAULT '',
  greeting_message text NOT NULL DEFAULT '',
  fallback_message text NOT NULL DEFAULT '',
  max_turns integer NOT NULL DEFAULT 20,
  agency_id text REFERENCES public.agencies(id),
  assigned_user_id uuid,
  lead_sources text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  test_only boolean NOT NULL DEFAULT true,
  telephony_provider_id uuid REFERENCES public.ai_provider_configs(id),
  voice_ai_provider_id uuid REFERENCES public.ai_provider_configs(id),
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_agents" ON public.ai_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_agents" ON public.ai_agents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Agent Versions
CREATE TABLE public.ai_agent_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT '1.0.0',
  system_prompt text NOT NULL DEFAULT '',
  greeting_message text NOT NULL DEFAULT '',
  config_snapshot jsonb NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_agent_versions" ON public.ai_agent_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_agent_versions" ON public.ai_agent_versions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Agent Deployments
CREATE TABLE public.ai_agent_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.ai_agent_versions(id),
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'staging', 'production')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'active', 'paused', 'failed', 'retired')),
  deployed_by text NOT NULL DEFAULT '',
  deployed_at timestamptz,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_agent_deployments" ON public.ai_agent_deployments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_agent_deployments" ON public.ai_agent_deployments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Voice Campaigns
CREATE TABLE public.ai_voice_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  campaign_type text NOT NULL DEFAULT 'outbound' CHECK (campaign_type IN ('inbound', 'outbound')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  target_lead_sources text[] NOT NULL DEFAULT '{}',
  target_statuses text[] NOT NULL DEFAULT '{}',
  schedule_start timestamptz,
  schedule_end timestamptz,
  max_calls_per_day integer NOT NULL DEFAULT 50,
  agency_id text REFERENCES public.agencies(id),
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_voice_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_voice_campaigns" ON public.ai_voice_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_voice_campaigns" ON public.ai_voice_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Voice Numbers
CREATE TABLE public.ai_voice_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  provider_id uuid REFERENCES public.ai_provider_configs(id),
  provider_number_id text NOT NULL DEFAULT '',
  agent_id uuid REFERENCES public.ai_agents(id),
  agency_id text REFERENCES public.agencies(id),
  direction text NOT NULL DEFAULT 'both' CHECK (direction IN ('inbound', 'outbound', 'both')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_voice_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_voice_numbers" ON public.ai_voice_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_voice_numbers" ON public.ai_voice_numbers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Voice Sessions
CREATE TABLE public.ai_voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id),
  campaign_id uuid REFERENCES public.ai_voice_campaigns(id),
  lead_id text REFERENCES public.leads(id),
  number_id uuid REFERENCES public.ai_voice_numbers(id),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'connected', 'in_progress', 'completed', 'failed', 'no_answer', 'busy', 'voicemail')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  sentiment text NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  outcome text NOT NULL DEFAULT '' ,
  recording_url text NOT NULL DEFAULT '',
  is_test boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_voice_sessions" ON public.ai_voice_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_voice_sessions" ON public.ai_voice_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Voice Turns
CREATE TABLE public.ai_voice_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_voice_sessions(id) ON DELETE CASCADE,
  turn_index integer NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'user', 'system')),
  transcript text NOT NULL DEFAULT '',
  audio_url text NOT NULL DEFAULT '',
  confidence numeric NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_voice_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_voice_turns" ON public.ai_voice_turns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_voice_turns" ON public.ai_voice_turns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Voice Action Logs
CREATE TABLE public.ai_voice_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_voice_sessions(id) ON DELETE CASCADE,
  action_type text NOT NULL DEFAULT '' CHECK (action_type IN ('status_change', 'task_create', 'escalation', 'note_add', 'wizard_trigger', 'follow_up', 'appointment', 'notification', 'custom')),
  action_data jsonb NOT NULL DEFAULT '{}',
  result text NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'failed', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_voice_action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_voice_action_logs" ON public.ai_voice_action_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_voice_action_logs" ON public.ai_voice_action_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Voice Escalations
CREATE TABLE public.ai_voice_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_voice_sessions(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id),
  lead_id text REFERENCES public.leads(id),
  reason text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_employee_id text REFERENCES public.employees(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
  resolution_notes text NOT NULL DEFAULT '',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_voice_escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_voice_escalations" ON public.ai_voice_escalations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_voice_escalations" ON public.ai_voice_escalations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Voice Knowledge Items
CREATE TABLE public.ai_voice_knowledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_voice_knowledge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_voice_knowledge_items" ON public.ai_voice_knowledge_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_voice_knowledge_items" ON public.ai_voice_knowledge_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Voice Test Runs
CREATE TABLE public.ai_voice_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.ai_agent_versions(id),
  scenario_name text NOT NULL DEFAULT '',
  scenario_config jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed', 'error')),
  result jsonb NOT NULL DEFAULT '{}',
  duration_ms integer NOT NULL DEFAULT 0,
  run_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_voice_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_voice_test_runs" ON public.ai_voice_test_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ai_voice_test_runs" ON public.ai_voice_test_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin'));

-- AI Voice Cost Logs
CREATE TABLE public.ai_voice_cost_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.ai_voice_sessions(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.ai_agents(id),
  provider_id uuid REFERENCES public.ai_provider_configs(id),
  cost_type text NOT NULL DEFAULT 'call' CHECK (cost_type IN ('call', 'stt', 'tts', 'ai_inference', 'number_rental', 'other')),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CHF',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_voice_cost_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_voice_cost_logs" ON public.ai_voice_cost_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins can manage ai_voice_cost_logs" ON public.ai_voice_cost_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- AI Compliance Rules
CREATE TABLE public.ai_compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  rule_type text NOT NULL DEFAULT 'recording_consent' CHECK (rule_type IN ('recording_consent', 'gdpr', 'data_retention', 'call_hours', 'max_attempts', 'blacklist', 'custom')),
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_compliance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ai_compliance_rules" ON public.ai_compliance_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins can manage ai_compliance_rules" ON public.ai_compliance_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Triggers for updated_at
CREATE TRIGGER update_ai_provider_configs_updated_at BEFORE UPDATE ON public.ai_provider_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_agent_deployments_updated_at BEFORE UPDATE ON public.ai_agent_deployments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_voice_campaigns_updated_at BEFORE UPDATE ON public.ai_voice_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_voice_numbers_updated_at BEFORE UPDATE ON public.ai_voice_numbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_voice_sessions_updated_at BEFORE UPDATE ON public.ai_voice_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_voice_escalations_updated_at BEFORE UPDATE ON public.ai_voice_escalations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_voice_knowledge_items_updated_at BEFORE UPDATE ON public.ai_voice_knowledge_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_compliance_rules_updated_at BEFORE UPDATE ON public.ai_compliance_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_ai_voice_sessions_lead_id ON public.ai_voice_sessions(lead_id);
CREATE INDEX idx_ai_voice_sessions_agent_id ON public.ai_voice_sessions(agent_id);
CREATE INDEX idx_ai_voice_sessions_campaign_id ON public.ai_voice_sessions(campaign_id);
CREATE INDEX idx_ai_voice_turns_session_id ON public.ai_voice_turns(session_id);
CREATE INDEX idx_ai_voice_escalations_status ON public.ai_voice_escalations(status);
CREATE INDEX idx_ai_voice_cost_logs_agent_id ON public.ai_voice_cost_logs(agent_id);
