export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          description: string
          id: string
          lead_id: string
          type: string
          user: string
        }
        Insert: {
          created_at?: string
          description?: string
          id: string
          lead_id: string
          type: string
          user?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          lead_id?: string
          type?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          address: string
          allowed_cantons: string[]
          city: string
          color: string
          contact_email: string
          created_at: string
          id: string
          language: string
          latitude: number | null
          longitude: number | null
          monthly_lead_quota: number | null
          name: string
          plz: string
          radius_km: number
          region: string
          updated_at: string
        }
        Insert: {
          address?: string
          allowed_cantons?: string[]
          city?: string
          color?: string
          contact_email: string
          created_at?: string
          id: string
          language?: string
          latitude?: number | null
          longitude?: number | null
          monthly_lead_quota?: number | null
          name: string
          plz?: string
          radius_km?: number
          region?: string
          updated_at?: string
        }
        Update: {
          address?: string
          allowed_cantons?: string[]
          city?: string
          color?: string
          contact_email?: string
          created_at?: string
          id?: string
          language?: string
          latitude?: number | null
          longitude?: number | null
          monthly_lead_quota?: number | null
          name?: string
          plz?: string
          radius_km?: number
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_deployments: {
        Row: {
          agency_id: string | null
          agent_id: string
          campaign_id: string | null
          candidate_id: string | null
          config: Json
          created_at: string
          created_by_user: string
          deployed_at: string | null
          deployed_by: string
          deployment_scope: string
          end_at: string | null
          environment: string
          id: string
          is_enabled: boolean
          lead_source: string | null
          priority: number
          rollout_mode: string
          start_at: string | null
          status: string
          team_id: string | null
          test_group_id: string | null
          updated_at: string
          user_id: string | null
          version_id: string | null
        }
        Insert: {
          agency_id?: string | null
          agent_id: string
          campaign_id?: string | null
          candidate_id?: string | null
          config?: Json
          created_at?: string
          created_by_user?: string
          deployed_at?: string | null
          deployed_by?: string
          deployment_scope?: string
          end_at?: string | null
          environment?: string
          id?: string
          is_enabled?: boolean
          lead_source?: string | null
          priority?: number
          rollout_mode?: string
          start_at?: string | null
          status?: string
          team_id?: string | null
          test_group_id?: string | null
          updated_at?: string
          user_id?: string | null
          version_id?: string | null
        }
        Update: {
          agency_id?: string | null
          agent_id?: string
          campaign_id?: string | null
          candidate_id?: string | null
          config?: Json
          created_at?: string
          created_by_user?: string
          deployed_at?: string | null
          deployed_by?: string
          deployment_scope?: string
          end_at?: string | null
          environment?: string
          id?: string
          is_enabled?: boolean
          lead_source?: string | null
          priority?: number
          rollout_mode?: string
          start_at?: string | null
          status?: string
          team_id?: string | null
          test_group_id?: string | null
          updated_at?: string
          user_id?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_deployments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_deployments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_versions: {
        Row: {
          action_permissions_json: Json
          agent_id: string
          config_snapshot: Json
          conversation_rules: Json
          created_at: string
          created_by: string
          escalation_rules_json: Json
          forbidden_statements: Json
          greeting_message: string
          id: string
          is_published: boolean
          knowledge_binding_json: Json
          notes: string
          prompt_system: string
          required_disclosures: Json
          status: string
          system_prompt: string
          version: string
          version_number: number
        }
        Insert: {
          action_permissions_json?: Json
          agent_id: string
          config_snapshot?: Json
          conversation_rules?: Json
          created_at?: string
          created_by?: string
          escalation_rules_json?: Json
          forbidden_statements?: Json
          greeting_message?: string
          id?: string
          is_published?: boolean
          knowledge_binding_json?: Json
          notes?: string
          prompt_system?: string
          required_disclosures?: Json
          status?: string
          system_prompt?: string
          version?: string
          version_number?: number
        }
        Update: {
          action_permissions_json?: Json
          agent_id?: string
          config_snapshot?: Json
          conversation_rules?: Json
          created_at?: string
          created_by?: string
          escalation_rules_json?: Json
          forbidden_statements?: Json
          greeting_message?: string
          id?: string
          is_published?: boolean
          knowledge_binding_json?: Json
          notes?: string
          prompt_system?: string
          required_disclosures?: Json
          status?: string
          system_prompt?: string
          version?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          active_version_id: string | null
          agency_id: string | null
          agent_type: string
          allow_auto_actions: boolean
          allow_human_handover: boolean
          assigned_user_id: string | null
          config: Json
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string
          display_name: string
          fallback_message: string
          greeting_message: string
          greeting_text: string
          id: string
          identity_mode: string
          is_active: boolean
          knowledge_mode: string
          language: string
          language_supported: string[]
          lead_sources: string[]
          max_call_duration_seconds: number
          max_turns: number
          name: string
          objective: string
          require_approval_mode: boolean
          slug: string
          status: string
          system_prompt: string
          telephony_provider_id: string | null
          test_only: boolean
          tone_style: string
          updated_at: string
          updated_by: string
          voice_ai_provider_id: string | null
          voice_id: string
        }
        Insert: {
          active_version_id?: string | null
          agency_id?: string | null
          agent_type?: string
          allow_auto_actions?: boolean
          allow_human_handover?: boolean
          assigned_user_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string
          display_name?: string
          fallback_message?: string
          greeting_message?: string
          greeting_text?: string
          id?: string
          identity_mode?: string
          is_active?: boolean
          knowledge_mode?: string
          language?: string
          language_supported?: string[]
          lead_sources?: string[]
          max_call_duration_seconds?: number
          max_turns?: number
          name: string
          objective?: string
          require_approval_mode?: boolean
          slug?: string
          status?: string
          system_prompt?: string
          telephony_provider_id?: string | null
          test_only?: boolean
          tone_style?: string
          updated_at?: string
          updated_by?: string
          voice_ai_provider_id?: string | null
          voice_id?: string
        }
        Update: {
          active_version_id?: string | null
          agency_id?: string | null
          agent_type?: string
          allow_auto_actions?: boolean
          allow_human_handover?: boolean
          assigned_user_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string
          display_name?: string
          fallback_message?: string
          greeting_message?: string
          greeting_text?: string
          id?: string
          identity_mode?: string
          is_active?: boolean
          knowledge_mode?: string
          language?: string
          language_supported?: string[]
          lead_sources?: string[]
          max_call_duration_seconds?: number
          max_turns?: number
          name?: string
          objective?: string
          require_approval_mode?: boolean
          slug?: string
          status?: string
          system_prompt?: string
          telephony_provider_id?: string | null
          test_only?: boolean
          tone_style?: string
          updated_at?: string
          updated_by?: string
          voice_ai_provider_id?: string | null
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_telephony_provider_id_fkey"
            columns: ["telephony_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_voice_ai_provider_id_fkey"
            columns: ["voice_ai_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      ai_compliance_rules: {
        Row: {
          applies_to: string
          config: Json
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          rule_json: Json
          rule_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          applies_to?: string
          config?: Json
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
          rule_json?: Json
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          config?: Json
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          rule_json?: Json
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_provider_configs: {
        Row: {
          account_sid_placeholder: string
          api_key_placeholder: string
          auth_type: string
          config: Json
          created_at: string
          endpoint_url: string
          id: string
          is_default: boolean
          name: string
          production_mode: boolean
          provider_category: string
          provider_code: string
          provider_type: string
          region: string
          sandbox_mode: boolean
          secret_placeholder: string
          status: string
          updated_at: string
          webhook_url_placeholder: string
          websocket_url: string
        }
        Insert: {
          account_sid_placeholder?: string
          api_key_placeholder?: string
          auth_type?: string
          config?: Json
          created_at?: string
          endpoint_url?: string
          id?: string
          is_default?: boolean
          name: string
          production_mode?: boolean
          provider_category?: string
          provider_code?: string
          provider_type?: string
          region?: string
          sandbox_mode?: boolean
          secret_placeholder?: string
          status?: string
          updated_at?: string
          webhook_url_placeholder?: string
          websocket_url?: string
        }
        Update: {
          account_sid_placeholder?: string
          api_key_placeholder?: string
          auth_type?: string
          config?: Json
          created_at?: string
          endpoint_url?: string
          id?: string
          is_default?: boolean
          name?: string
          production_mode?: boolean
          provider_category?: string
          provider_code?: string
          provider_type?: string
          region?: string
          sandbox_mode?: boolean
          secret_placeholder?: string
          status?: string
          updated_at?: string
          webhook_url_placeholder?: string
          websocket_url?: string
        }
        Relationships: []
      }
      ai_voice_action_logs: {
        Row: {
          action_data: Json
          action_type: string
          ai_agent_id: string | null
          created_at: string
          executed_by: string
          execution_mode: string
          id: string
          payload_json: Json
          reason: string
          result: string
          result_json: Json
          session_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action_data?: Json
          action_type?: string
          ai_agent_id?: string | null
          created_at?: string
          executed_by?: string
          execution_mode?: string
          id?: string
          payload_json?: Json
          reason?: string
          result?: string
          result_json?: Json
          session_id: string
          target_id?: string
          target_type?: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          ai_agent_id?: string | null
          created_at?: string
          executed_by?: string
          execution_mode?: string
          id?: string
          payload_json?: Json
          reason?: string
          result?: string
          result_json?: Json
          session_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_voice_action_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_voice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_voice_campaigns: {
        Row: {
          agency_id: string | null
          agent_id: string
          campaign_type: string
          config: Json
          cost_limit_daily: number
          cost_limit_total: number
          created_at: string
          created_by: string
          description: string
          id: string
          max_calls_per_day: number
          name: string
          retry_rules_json: Json
          schedule_end: string | null
          schedule_start: string | null
          scheduling_rules_json: Json
          source_filters_json: Json
          status: string
          target_lead_sources: string[]
          target_scope_json: Json
          target_statuses: string[]
          timezone: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          agent_id: string
          campaign_type?: string
          config?: Json
          cost_limit_daily?: number
          cost_limit_total?: number
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          max_calls_per_day?: number
          name: string
          retry_rules_json?: Json
          schedule_end?: string | null
          schedule_start?: string | null
          scheduling_rules_json?: Json
          source_filters_json?: Json
          status?: string
          target_lead_sources?: string[]
          target_scope_json?: Json
          target_statuses?: string[]
          timezone?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          agent_id?: string
          campaign_type?: string
          config?: Json
          cost_limit_daily?: number
          cost_limit_total?: number
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          max_calls_per_day?: number
          name?: string
          retry_rules_json?: Json
          schedule_end?: string | null
          schedule_start?: string | null
          scheduling_rules_json?: Json
          source_filters_json?: Json
          status?: string
          target_lead_sources?: string[]
          target_scope_json?: Json
          target_statuses?: string[]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_voice_campaigns_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_voice_cost_logs: {
        Row: {
          agent_id: string | null
          amount: number
          cost_type: string
          created_at: string
          currency: string
          description: string
          id: string
          logged_at: string
          provider_id: string | null
          provider_name: string
          session_id: string | null
          total_cost: number
          unit_price: number
          units: number
        }
        Insert: {
          agent_id?: string | null
          amount?: number
          cost_type?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          logged_at?: string
          provider_id?: string | null
          provider_name?: string
          session_id?: string | null
          total_cost?: number
          unit_price?: number
          units?: number
        }
        Update: {
          agent_id?: string | null
          amount?: number
          cost_type?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          logged_at?: string
          provider_id?: string | null
          provider_name?: string
          session_id?: string | null
          total_cost?: number
          unit_price?: number
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_voice_cost_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_cost_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_cost_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_voice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_voice_escalations: {
        Row: {
          agent_id: string
          assigned_employee_id: string | null
          assigned_to_role: string
          assigned_to_user_id: string | null
          created_at: string
          due_at: string | null
          escalation_type: string
          id: string
          lead_id: string | null
          priority: string
          reason: string
          resolution_notes: string
          resolved_at: string | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          assigned_employee_id?: string | null
          assigned_to_role?: string
          assigned_to_user_id?: string | null
          created_at?: string
          due_at?: string | null
          escalation_type?: string
          id?: string
          lead_id?: string | null
          priority?: string
          reason?: string
          resolution_notes?: string
          resolved_at?: string | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          assigned_employee_id?: string | null
          assigned_to_role?: string
          assigned_to_user_id?: string | null
          created_at?: string
          due_at?: string | null
          escalation_type?: string
          id?: string
          lead_id?: string | null
          priority?: string
          reason?: string
          resolution_notes?: string
          resolved_at?: string | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_voice_escalations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_escalations_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_escalations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_escalations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_voice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_voice_knowledge_items: {
        Row: {
          agent_id: string | null
          approval_status: string
          approved_for_live_calls: boolean
          category: string
          content: string
          content_type: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          owner_id: string
          risk_class: string
          scope_type: string
          tags: string[]
          title: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          version: number
        }
        Insert: {
          agent_id?: string | null
          approval_status?: string
          approved_for_live_calls?: boolean
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          owner_id?: string
          risk_class?: string
          scope_type?: string
          tags?: string[]
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          version?: number
        }
        Update: {
          agent_id?: string | null
          approval_status?: string
          approved_for_live_calls?: boolean
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          owner_id?: string
          risk_class?: string
          scope_type?: string
          tags?: string[]
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_voice_knowledge_items_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_voice_numbers: {
        Row: {
          agency_id: string | null
          agent_id: string | null
          country: string
          created_at: string
          direction: string
          display_name: string
          id: string
          label: string
          number_type: string
          phone_number: string
          provider_id: string | null
          provider_number_id: string
          region: string
          routing_rules_json: Json
          status: string
          supports_inbound: boolean
          supports_outbound: boolean
          supports_recording: boolean
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          agent_id?: string | null
          country?: string
          created_at?: string
          direction?: string
          display_name?: string
          id?: string
          label?: string
          number_type?: string
          phone_number: string
          provider_id?: string | null
          provider_number_id?: string
          region?: string
          routing_rules_json?: Json
          status?: string
          supports_inbound?: boolean
          supports_outbound?: boolean
          supports_recording?: boolean
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          agent_id?: string | null
          country?: string
          created_at?: string
          direction?: string
          display_name?: string
          id?: string
          label?: string
          number_type?: string
          phone_number?: string
          provider_id?: string | null
          provider_number_id?: string
          region?: string
          routing_rules_json?: Json
          status?: string
          supports_inbound?: boolean
          supports_outbound?: boolean
          supports_recording?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_voice_numbers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_numbers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_numbers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_voice_sessions: {
        Row: {
          agency_id: string | null
          agent_id: string
          assigned_user_id: string | null
          campaign_id: string | null
          candidate_id: string | null
          cost_ai: number
          cost_telephony: number
          cost_total: number
          created_at: string
          direction: string
          duration_seconds: number
          ended_at: string | null
          escalation_status: string
          id: string
          is_test: boolean
          lead_id: string | null
          metadata: Json
          number_id: string | null
          outcome: string
          phone_number_from: string
          phone_number_to: string
          provider_call_id: string
          provider_id: string | null
          recording_url: string
          result_reason: string
          result_type: string
          sentiment: string
          session_uid: string
          started_at: string | null
          status: string
          summary: string
          summary_status: string
          transcript_status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          agent_id: string
          assigned_user_id?: string | null
          campaign_id?: string | null
          candidate_id?: string | null
          cost_ai?: number
          cost_telephony?: number
          cost_total?: number
          created_at?: string
          direction?: string
          duration_seconds?: number
          ended_at?: string | null
          escalation_status?: string
          id?: string
          is_test?: boolean
          lead_id?: string | null
          metadata?: Json
          number_id?: string | null
          outcome?: string
          phone_number_from?: string
          phone_number_to?: string
          provider_call_id?: string
          provider_id?: string | null
          recording_url?: string
          result_reason?: string
          result_type?: string
          sentiment?: string
          session_uid?: string
          started_at?: string | null
          status?: string
          summary?: string
          summary_status?: string
          transcript_status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          agent_id?: string
          assigned_user_id?: string | null
          campaign_id?: string | null
          candidate_id?: string | null
          cost_ai?: number
          cost_telephony?: number
          cost_total?: number
          created_at?: string
          direction?: string
          duration_seconds?: number
          ended_at?: string | null
          escalation_status?: string
          id?: string
          is_test?: boolean
          lead_id?: string | null
          metadata?: Json
          number_id?: string | null
          outcome?: string
          phone_number_from?: string
          phone_number_to?: string
          provider_call_id?: string
          provider_id?: string | null
          recording_url?: string
          result_reason?: string
          result_type?: string
          sentiment?: string
          session_uid?: string
          started_at?: string | null
          status?: string
          summary?: string
          summary_status?: string
          transcript_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_voice_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ai_voice_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_sessions_number_id_fkey"
            columns: ["number_id"]
            isOneToOne: false
            referencedRelation: "ai_voice_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_voice_test_runs: {
        Row: {
          actual_result_json: Json
          agent_id: string
          created_at: string
          duration_ms: number
          expected_result_json: Json
          id: string
          notes: string
          pass_fail_status: string
          result: Json
          run_by: string
          scenario_config: Json
          scenario_name: string
          status: string
          target_id: string
          test_mode: string
          test_name: string
          test_target_type: string
          version_id: string | null
        }
        Insert: {
          actual_result_json?: Json
          agent_id: string
          created_at?: string
          duration_ms?: number
          expected_result_json?: Json
          id?: string
          notes?: string
          pass_fail_status?: string
          result?: Json
          run_by?: string
          scenario_config?: Json
          scenario_name?: string
          status?: string
          target_id?: string
          test_mode?: string
          test_name?: string
          test_target_type?: string
          version_id?: string | null
        }
        Update: {
          actual_result_json?: Json
          agent_id?: string
          created_at?: string
          duration_ms?: number
          expected_result_json?: Json
          id?: string
          notes?: string
          pass_fail_status?: string
          result?: Json
          run_by?: string
          scenario_config?: Json
          scenario_name?: string
          status?: string
          target_id?: string
          test_mode?: string
          test_name?: string
          test_target_type?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_voice_test_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_voice_test_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_voice_turns: {
        Row: {
          action_executed_json: Json
          action_suggested_json: Json
          audio_url: string
          confidence: number
          created_at: string
          duration_ms: number
          id: string
          interpreted_intent: string
          latency_ms: number
          metadata: Json
          role: string
          session_id: string
          speaker: string
          transcript: string
          turn_index: number
        }
        Insert: {
          action_executed_json?: Json
          action_suggested_json?: Json
          audio_url?: string
          confidence?: number
          created_at?: string
          duration_ms?: number
          id?: string
          interpreted_intent?: string
          latency_ms?: number
          metadata?: Json
          role?: string
          session_id: string
          speaker?: string
          transcript?: string
          turn_index?: number
        }
        Update: {
          action_executed_json?: Json
          action_suggested_json?: Json
          audio_url?: string
          confidence?: number
          created_at?: string
          duration_ms?: number
          id?: string
          interpreted_intent?: string
          latency_ms?: number
          metadata?: Json
          role?: string
          session_id?: string
          speaker?: string
          transcript?: string
          turn_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_voice_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_voice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      applications: {
        Row: {
          address: string
          agency_id: string | null
          attachment_paths: Json
          birth_date: string
          city: string
          consent_email_contract: boolean
          consent_privacy: boolean
          country: string
          created_at: string
          custom_fields: Json
          cv_path: string | null
          email: string
          first_name: string
          id: string
          ip_address: string | null
          last_name: string
          lead_id: string | null
          motivation_letter_path: string | null
          phone: string
          salutation: string
          source: string
          status: string
          updated_at: string
          user_agent: string | null
          zip: string
        }
        Insert: {
          address?: string
          agency_id?: string | null
          attachment_paths?: Json
          birth_date?: string
          city?: string
          consent_email_contract?: boolean
          consent_privacy?: boolean
          country?: string
          created_at?: string
          custom_fields?: Json
          cv_path?: string | null
          email?: string
          first_name?: string
          id?: string
          ip_address?: string | null
          last_name?: string
          lead_id?: string | null
          motivation_letter_path?: string | null
          phone?: string
          salutation?: string
          source?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          zip?: string
        }
        Update: {
          address?: string
          agency_id?: string | null
          attachment_paths?: Json
          birth_date?: string
          city?: string
          consent_email_contract?: boolean
          consent_privacy?: boolean
          country?: string
          created_at?: string
          custom_fields?: Json
          cv_path?: string | null
          email?: string
          first_name?: string
          id?: string
          ip_address?: string | null
          last_name?: string
          lead_id?: string | null
          motivation_letter_path?: string | null
          phone?: string
          salutation?: string
          source?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          zip?: string
        }
        Relationships: []
      }
      appointment_suggestions: {
        Row: {
          created_at: string
          id: string
          insights_request_id: string | null
          lead_id: string
          responded_at: string | null
          response_note: string | null
          status: string
          suggested_date: string
          suggested_time: string
        }
        Insert: {
          created_at?: string
          id?: string
          insights_request_id?: string | null
          lead_id: string
          responded_at?: string | null
          response_note?: string | null
          status?: string
          suggested_date: string
          suggested_time: string
        }
        Update: {
          created_at?: string
          id?: string
          insights_request_id?: string | null
          lead_id?: string
          responded_at?: string | null
          response_note?: string | null
          status?: string
          suggested_date?: string
          suggested_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_suggestions_insights_request_id_fkey"
            columns: ["insights_request_id"]
            isOneToOne: false
            referencedRelation: "insights_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          created_by: string
          date: string
          duration: number
          id: string
          lead_id: string
          meeting_link: string | null
          notes: string
          time: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          duration?: number
          id: string
          lead_id: string
          meeting_link?: string | null
          notes?: string
          time: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          duration?: number
          id?: string
          lead_id?: string
          meeting_link?: string | null
          notes?: string
          time?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          completed_at: string
          created_at: string
          disc_scores: Json
          dominant_disc_type: string
          id: string
          lead_id: string
          match_result: Json
          motivator_scores: Json
          personality_avatar: string
          personality_meaning: string
          personality_risks_extended: Json
          personality_strengths_extended: Json
          personality_summary: string
          personality_title: string
          personality_type_combination: string
          raw_ai_response: Json | null
          recommendation: string
          report_sections: Json
          scores: Json
          summary: Json
          top_motivators: Json
          wizard_answers: Json
        }
        Insert: {
          completed_at?: string
          created_at?: string
          disc_scores?: Json
          dominant_disc_type?: string
          id?: string
          lead_id: string
          match_result?: Json
          motivator_scores?: Json
          personality_avatar?: string
          personality_meaning?: string
          personality_risks_extended?: Json
          personality_strengths_extended?: Json
          personality_summary?: string
          personality_title?: string
          personality_type_combination?: string
          raw_ai_response?: Json | null
          recommendation?: string
          report_sections?: Json
          scores?: Json
          summary?: Json
          top_motivators?: Json
          wizard_answers?: Json
        }
        Update: {
          completed_at?: string
          created_at?: string
          disc_scores?: Json
          dominant_disc_type?: string
          id?: string
          lead_id?: string
          match_result?: Json
          motivator_scores?: Json
          personality_avatar?: string
          personality_meaning?: string
          personality_risks_extended?: Json
          personality_strengths_extended?: Json
          personality_summary?: string
          personality_title?: string
          personality_type_combination?: string
          raw_ai_response?: Json | null
          recommendation?: string
          report_sections?: Json
          scores?: Json
          summary?: Json
          top_motivators?: Json
          wizard_answers?: Json
        }
        Relationships: []
      }
      career_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          levels: Json
          position: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          levels?: Json
          position: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          levels?: Json
          position?: string
          updated_at?: string
        }
        Relationships: []
      }
      disc_results: {
        Row: {
          answers: Json
          completed_at: string
          dominant_type: string
          id: string
          lead_id: string
          scores: Json
        }
        Insert: {
          answers?: Json
          completed_at?: string
          dominant_type: string
          id: string
          lead_id: string
          scores?: Json
        }
        Update: {
          answers?: Json
          completed_at?: string
          dominant_type?: string
          id?: string
          lead_id?: string
          scores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "disc_results_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          lead_id: string
          reminder_sent_at: string | null
          sent_at: string
          sent_via: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          lead_id: string
          reminder_sent_at?: string | null
          sent_at?: string
          sent_via?: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          lead_id?: string
          reminder_sent_at?: string | null
          sent_at?: string
          sent_via?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      document_uploads: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          lead_id: string
          request_id: string
          uploaded_at: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string
          id?: string
          lead_id: string
          request_id: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          lead_id?: string
          request_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_uploads_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "document_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_automation_rules: {
        Row: {
          created_at: string
          delay_minutes: number
          description: string
          id: string
          is_active: boolean
          name: string
          recipient_type: string
          template_id: string | null
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_minutes?: number
          description?: string
          id?: string
          is_active?: boolean
          name: string
          recipient_type?: string
          template_id?: string | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_minutes?: number
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          recipient_type?: string
          template_id?: string | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          placeholders: string[]
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          placeholders?: string[]
          subject?: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          placeholders?: string[]
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          agency_id: string
          avatar: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agency_id: string
          avatar?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_processes: {
        Row: {
          applies_to_all_sources: boolean
          created_at: string
          description: string
          id: string
          is_active: boolean
          main_process_status: string
          name: string
          priority: number
          source_filters: string[]
          updated_at: string
        }
        Insert: {
          applies_to_all_sources?: boolean
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          main_process_status: string
          name?: string
          priority?: number
          source_filters?: string[]
          updated_at?: string
        }
        Update: {
          applies_to_all_sources?: boolean
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          main_process_status?: string
          name?: string
          priority?: number
          source_filters?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      escalation_rules: {
        Row: {
          action_type: string
          action_value: string
          condition_type: string
          condition_value: string
          created_at: string
          delay_minutes: number
          escalation_process_id: string
          id: string
          is_active: boolean
          sort_order: number
          test_only: boolean
          updated_at: string
        }
        Insert: {
          action_type?: string
          action_value?: string
          condition_type?: string
          condition_value?: string
          created_at?: string
          delay_minutes?: number
          escalation_process_id: string
          id?: string
          is_active?: boolean
          sort_order?: number
          test_only?: boolean
          updated_at?: string
        }
        Update: {
          action_type?: string
          action_value?: string
          condition_type?: string
          condition_value?: string
          created_at?: string
          delay_minutes?: number
          escalation_process_id?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          test_only?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_escalation_process_id_fkey"
            columns: ["escalation_process_id"]
            isOneToOne: false
            referencedRelation: "escalation_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_wizard_links: {
        Row: {
          created_at: string
          delay_minutes: number
          escalation_process_id: string
          id: string
          is_active: boolean
          sort_order: number
          start_step_id: string
          test_only: boolean
          updated_at: string
          wizard_id: string
        }
        Insert: {
          created_at?: string
          delay_minutes?: number
          escalation_process_id: string
          id?: string
          is_active?: boolean
          sort_order?: number
          start_step_id?: string
          test_only?: boolean
          updated_at?: string
          wizard_id: string
        }
        Update: {
          created_at?: string
          delay_minutes?: number
          escalation_process_id?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          start_step_id?: string
          test_only?: boolean
          updated_at?: string
          wizard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_wizard_links_escalation_process_id_fkey"
            columns: ["escalation_process_id"]
            isOneToOne: false
            referencedRelation: "escalation_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_wizard_links_wizard_id_fkey"
            columns: ["wizard_id"]
            isOneToOne: false
            referencedRelation: "wizards"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          note: string
          recorded_at: string
          recorded_by: string | null
          value: number
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          note?: string
          recorded_at?: string
          recorded_by?: string | null
          value?: number
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          note?: string
          recorded_at?: string
          recorded_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          agency_id: string | null
          category: string
          created_at: string
          created_by: string | null
          current_value: number
          deadline: string | null
          description: string
          employee_id: string
          id: string
          quarter: string
          source: string
          status: string
          target_value: number
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          current_value?: number
          deadline?: string | null
          description?: string
          employee_id: string
          id?: string
          quarter?: string
          source?: string
          status?: string
          target_value?: number
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          current_value?: number
          deadline?: string | null
          description?: string
          employee_id?: string
          id?: string
          quarter?: string
          source?: string
          status?: string
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      insights_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lead_id: string
          reminder_sent_at: string | null
          responses: Json | null
          sent_at: string
          sent_via: string
          status: string
          token: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id: string
          reminder_sent_at?: string | null
          responses?: Json | null
          sent_at?: string
          sent_via?: string
          status?: string
          token?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          reminder_sent_at?: string | null
          responses?: Json | null
          sent_at?: string
          sent_via?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          api_key: string
          connected: boolean
          created_at: string
          description: string
          icon: string
          id: string
          method: string
          name: string
          updated_at: string
          zapier_webhook: string
        }
        Insert: {
          api_key?: string
          connected?: boolean
          created_at?: string
          description?: string
          icon?: string
          id: string
          method?: string
          name: string
          updated_at?: string
          zapier_webhook?: string
        }
        Update: {
          api_key?: string
          connected?: boolean
          created_at?: string
          description?: string
          icon?: string
          id?: string
          method?: string
          name?: string
          updated_at?: string
          zapier_webhook?: string
        }
        Relationships: []
      }
      lead_sources: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id: string
          label: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string
          agency_id: string
          alt_email: string
          alt_phone: string
          approval_history: Json
          approval_stage: string
          approval_status: string
          approved_by_role: string
          assigned_approver_role: string
          assigned_approver_user_id: string | null
          callback_count: number
          campaign: string
          canton: string
          canton_code: string
          city: string
          created_at: string
          email: string
          employee_id: string
          id: string
          is_read: boolean
          lead_lifecycle: string
          name: string
          notes: string
          original_employee_id: string
          phone: string
          plz: string
          position: string
          salutation: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string
          agency_id: string
          alt_email?: string
          alt_phone?: string
          approval_history?: Json
          approval_stage?: string
          approval_status?: string
          approved_by_role?: string
          assigned_approver_role?: string
          assigned_approver_user_id?: string | null
          callback_count?: number
          campaign?: string
          canton?: string
          canton_code?: string
          city?: string
          created_at?: string
          email: string
          employee_id: string
          id: string
          is_read?: boolean
          lead_lifecycle?: string
          name: string
          notes?: string
          original_employee_id?: string
          phone?: string
          plz?: string
          position?: string
          salutation?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          agency_id?: string
          alt_email?: string
          alt_phone?: string
          approval_history?: Json
          approval_stage?: string
          approval_status?: string
          approved_by_role?: string
          assigned_approver_role?: string
          assigned_approver_user_id?: string | null
          callback_count?: number
          campaign?: string
          canton?: string
          canton_code?: string
          city?: string
          created_at?: string
          email?: string
          employee_id?: string
          id?: string
          is_read?: boolean
          lead_lifecycle?: string
          name?: string
          notes?: string
          original_employee_id?: string
          phone?: string
          plz?: string
          position?: string
          salutation?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_role_settings: {
        Row: {
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          notification_type: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          description: string
          id: string
          lead_id: string | null
          read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          lead_id?: string | null
          read?: boolean
          title: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          lead_id?: string | null
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      process_flow_drafts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          edges: Json
          id: string
          is_test_active: boolean
          name: string
          nodes: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          edges?: Json
          id?: string
          is_test_active?: boolean
          name?: string
          nodes?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          edges?: Json
          id?: string
          is_test_active?: boolean
          name?: string
          nodes?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_wizard_results: {
        Row: {
          answers: Json
          completed_by: string
          created_at: string
          feedback: string
          id: string
          lead_id: string
          lead_withdrawn: boolean
          original_employee_id: string
          reassigned_to: string
          wizard_type: string
        }
        Insert: {
          answers?: Json
          completed_by?: string
          created_at?: string
          feedback?: string
          id?: string
          lead_id: string
          lead_withdrawn?: boolean
          original_employee_id?: string
          reassigned_to?: string
          wizard_type: string
        }
        Update: {
          answers?: Json
          completed_by?: string
          created_at?: string
          feedback?: string
          id?: string
          lead_id?: string
          lead_withdrawn?: boolean
          original_employee_id?: string
          reassigned_to?: string
          wizard_type?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          agency_id: string
          assigned_to: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          lead_id: string
          lead_status: string | null
          priority: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_to: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          lead_id: string
          lead_status?: string | null
          priority?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_to?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          lead_id?: string
          lead_status?: string | null
          priority?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wizards: {
        Row: {
          created_at: string
          id: string
          name: string
          rules: Json
          status: string
          steps: Json
          type: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          rules?: Json
          status?: string
          steps?: Json
          type?: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          rules?: Json
          status?: string
          steps?: Json
          type?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      resolve_agency_by_canton: {
        Args: { _canton_code: string }
        Returns: string
      }
      resolve_employee_by_agency: {
        Args: { _agency_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "superadmin"
        | "admin"
        | "backoffice"
        | "analyst"
        | "teamleiter"
        | "controlling"
        | "geschaeftsleitung"
        | "hr"
        | "agency_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "superadmin",
        "admin",
        "backoffice",
        "analyst",
        "teamleiter",
        "controlling",
        "geschaeftsleitung",
        "hr",
        "agency_manager",
      ],
    },
  },
} as const
