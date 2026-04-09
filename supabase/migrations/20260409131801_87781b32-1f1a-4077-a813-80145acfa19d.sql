
-- =============================================
-- 1. ai_agents - extend
-- =============================================
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS identity_mode text NOT NULL DEFAULT 'digital_assistant',
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS greeting_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS language_supported text[] NOT NULL DEFAULT '{de}'::text[],
  ADD COLUMN IF NOT EXISTS tone_style text NOT NULL DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS objective text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS max_call_duration_seconds integer NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS allow_human_handover boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_auto_actions boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_approval_mode boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS knowledge_mode text NOT NULL DEFAULT 'curated',
  ADD COLUMN IF NOT EXISTS active_version_id uuid NULL,
  ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_ai_agents_slug ON public.ai_agents (slug);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON public.ai_agents (status);
CREATE INDEX IF NOT EXISTS idx_ai_agents_agent_type ON public.ai_agents (agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_agency_id ON public.ai_agents (agency_id);

-- =============================================
-- 2. ai_agent_versions - extend
-- =============================================
ALTER TABLE public.ai_agent_versions
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS prompt_system text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS conversation_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS forbidden_statements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_disclosures jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escalation_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS action_permissions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_binding_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_agent_versions_agent ON public.ai_agent_versions (agent_id);

-- =============================================
-- 3. ai_agent_deployments - extend
-- =============================================
ALTER TABLE public.ai_agent_deployments
  ADD COLUMN IF NOT EXISTS deployment_scope text NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS agency_id text NULL,
  ADD COLUMN IF NOT EXISTS team_id text NULL,
  ADD COLUMN IF NOT EXISTS user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS lead_source text NULL,
  ADD COLUMN IF NOT EXISTS campaign_id uuid NULL,
  ADD COLUMN IF NOT EXISTS candidate_id text NULL,
  ADD COLUMN IF NOT EXISTS test_group_id text NULL,
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS end_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS rollout_mode text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS created_by_user text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ai_agent_deployments_agent ON public.ai_agent_deployments (agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_deployments_scope ON public.ai_agent_deployments (deployment_scope);

-- =============================================
-- 4. ai_voice_campaigns - extend
-- =============================================
ALTER TABLE public.ai_voice_campaigns
  ADD COLUMN IF NOT EXISTS target_scope_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduling_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS retry_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Zurich',
  ADD COLUMN IF NOT EXISTS cost_limit_daily numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_limit_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ai_voice_campaigns_agent ON public.ai_voice_campaigns (agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_voice_campaigns_status ON public.ai_voice_campaigns (status);

-- =============================================
-- 5. ai_voice_numbers - extend
-- =============================================
ALTER TABLE public.ai_voice_numbers
  ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'CH',
  ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS number_type text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS supports_inbound boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_outbound boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_recording boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS routing_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ai_voice_numbers_agent ON public.ai_voice_numbers (agent_id);

-- =============================================
-- 6. ai_voice_sessions - extend
-- =============================================
ALTER TABLE public.ai_voice_sessions
  ADD COLUMN IF NOT EXISTS session_uid text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS candidate_id text NULL,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS phone_number_from text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_number_to text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_id uuid NULL,
  ADD COLUMN IF NOT EXISTS provider_call_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transcript_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS summary_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cost_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_ai numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_telephony numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS result_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS result_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS escalation_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS agency_id text NULL;

CREATE INDEX IF NOT EXISTS idx_ai_voice_sessions_agent ON public.ai_voice_sessions (agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_voice_sessions_lead ON public.ai_voice_sessions (lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_voice_sessions_status ON public.ai_voice_sessions (status);
CREATE INDEX IF NOT EXISTS idx_ai_voice_sessions_campaign ON public.ai_voice_sessions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_voice_sessions_uid ON public.ai_voice_sessions (session_uid);

-- =============================================
-- 7. ai_voice_turns - extend
-- =============================================
ALTER TABLE public.ai_voice_turns
  ADD COLUMN IF NOT EXISTS speaker text NOT NULL DEFAULT 'assistant',
  ADD COLUMN IF NOT EXISTS interpreted_intent text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS action_suggested_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS action_executed_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS latency_ms integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ai_voice_turns_session ON public.ai_voice_turns (session_id);

-- =============================================
-- 8. ai_voice_action_logs - extend
-- =============================================
ALTER TABLE public.ai_voice_action_logs
  ADD COLUMN IF NOT EXISTS ai_agent_id uuid NULL,
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'suggested',
  ADD COLUMN IF NOT EXISTS payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS executed_by text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ai_voice_action_logs_session ON public.ai_voice_action_logs (session_id);

-- =============================================
-- 9. ai_voice_escalations - extend
-- =============================================
ALTER TABLE public.ai_voice_escalations
  ADD COLUMN IF NOT EXISTS escalation_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS due_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_ai_voice_escalations_session ON public.ai_voice_escalations (session_id);
CREATE INDEX IF NOT EXISTS idx_ai_voice_escalations_status ON public.ai_voice_escalations (status);

-- =============================================
-- 10. ai_voice_knowledge_items - extend
-- =============================================
ALTER TABLE public.ai_voice_knowledge_items
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS scope_type text NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS risk_class text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS approved_for_live_calls boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz NULL,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS owner_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_ai_voice_knowledge_agent ON public.ai_voice_knowledge_items (agent_id);

-- =============================================
-- 11. ai_voice_test_runs - extend
-- =============================================
ALTER TABLE public.ai_voice_test_runs
  ADD COLUMN IF NOT EXISTS test_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS test_mode text NOT NULL DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS test_target_type text NOT NULL DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS target_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actual_result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pass_fail_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ai_voice_test_runs_agent ON public.ai_voice_test_runs (agent_id);

-- =============================================
-- 12. ai_voice_cost_logs - extend
-- =============================================
ALTER TABLE public.ai_voice_cost_logs
  ADD COLUMN IF NOT EXISTS provider_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS units numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logged_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ai_voice_cost_logs_session ON public.ai_voice_cost_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_ai_voice_cost_logs_agent ON public.ai_voice_cost_logs (agent_id);

-- =============================================
-- 13. ai_provider_configs - extend
-- =============================================
ALTER TABLE public.ai_provider_configs
  ADD COLUMN IF NOT EXISTS provider_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS websocket_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS auth_type text NOT NULL DEFAULT 'api_key',
  ADD COLUMN IF NOT EXISTS secret_placeholder text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_sid_placeholder text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'eu',
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_category ON public.ai_provider_configs (provider_category);

-- =============================================
-- 14. ai_compliance_rules - extend
-- =============================================
ALTER TABLE public.ai_compliance_rules
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS rule_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'medium';

-- =============================================
-- 15. Audit log table for AI module
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL,
  old_data jsonb NULL,
  new_data jsonb NULL,
  changed_by text NOT NULL DEFAULT '',
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_audit_logs" ON public.ai_audit_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read ai_audit_logs" ON public.ai_audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_table ON public.ai_audit_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_record ON public.ai_audit_logs (record_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_time ON public.ai_audit_logs (changed_at);
