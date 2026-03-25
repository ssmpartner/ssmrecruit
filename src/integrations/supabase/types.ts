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
          allowed_cantons: string[]
          color: string
          contact_email: string
          created_at: string
          id: string
          language: string
          name: string
          region: string
          updated_at: string
        }
        Insert: {
          allowed_cantons?: string[]
          color?: string
          contact_email: string
          created_at?: string
          id: string
          language?: string
          name: string
          region?: string
          updated_at?: string
        }
        Update: {
          allowed_cantons?: string[]
          color?: string
          contact_email?: string
          created_at?: string
          id?: string
          language?: string
          name?: string
          region?: string
          updated_at?: string
        }
        Relationships: []
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
          id: string
          lead_id: string
          match_result: Json
          motivator_scores: Json
          raw_ai_response: Json | null
          recommendation: string
          report_sections: Json
          scores: Json
          summary: Json
          wizard_answers: Json
        }
        Insert: {
          completed_at?: string
          created_at?: string
          disc_scores?: Json
          id?: string
          lead_id: string
          match_result?: Json
          motivator_scores?: Json
          raw_ai_response?: Json | null
          recommendation?: string
          report_sections?: Json
          scores?: Json
          summary?: Json
          wizard_answers?: Json
        }
        Update: {
          completed_at?: string
          created_at?: string
          disc_scores?: Json
          id?: string
          lead_id?: string
          match_result?: Json
          motivator_scores?: Json
          raw_ai_response?: Json | null
          recommendation?: string
          report_sections?: Json
          scores?: Json
          summary?: Json
          wizard_answers?: Json
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
          callback_count: number
          campaign: string
          canton: string
          canton_code: string
          city: string
          created_at: string
          email: string
          employee_id: string
          id: string
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
          callback_count?: number
          campaign?: string
          canton?: string
          canton_code?: string
          city?: string
          created_at?: string
          email: string
          employee_id: string
          id: string
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
          callback_count?: number
          campaign?: string
          canton?: string
          canton_code?: string
          city?: string
          created_at?: string
          email?: string
          employee_id?: string
          id?: string
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
    }
    Enums: {
      app_role: "superadmin" | "admin" | "backoffice" | "analyst" | "teamleiter"
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
      app_role: ["superadmin", "admin", "backoffice", "analyst", "teamleiter"],
    },
  },
} as const
