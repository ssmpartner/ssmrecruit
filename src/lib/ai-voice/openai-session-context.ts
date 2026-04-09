/**
 * AI Voice Agent – OpenAI Session Context Builder
 *
 * Prepares the full context payload that the Railway Voice Backend
 * sends to OpenAI Realtime API when starting a voice session.
 *
 * IMPORTANT: This module is used by the Core Backend (Edge Functions)
 * to assemble the context. OpenAI is NEVER called directly from the frontend.
 */

import { supabase } from '@/integrations/supabase/client';

// ── Types ─────────────────────────────────────────────────────────

export interface OpenAISessionContext {
  /** Agent identity & behaviour */
  agent: AgentContext;
  /** Lead/candidate data relevant for the conversation */
  subject: SubjectContext | null;
  /** Curated knowledge snippets the agent may reference */
  knowledge: KnowledgeSummary;
  /** What the agent is allowed to do */
  actionPermissions: ActionPermissions;
  /** When to escalate */
  escalationRules: EscalationRule[];
  /** Deployment & runtime config */
  runtime: RuntimeContext;
  /** Compliance constraints */
  compliance: ComplianceContext;
}

export interface AgentContext {
  id: string;
  name: string;
  displayName: string;
  agentType: string;
  language: string;
  supportedLanguages: string[];
  systemPrompt: string;
  greetingMessage: string;
  fallbackMessage: string;
  toneStyle: string;
  objective: string;
  identityMode: string;
  maxTurns: number;
  maxCallDurationSeconds: number;
  voiceId: string;
}

export interface SubjectContext {
  leadId?: string;
  candidateId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  currentStatus?: string;
  source?: string;
  agencyName?: string;
  previousInteractions?: number;
  notes?: string;
}

export interface KnowledgeSummary {
  totalItems: number;
  categories: string[];
  items: KnowledgeSnippet[];
}

export interface KnowledgeSnippet {
  id: string;
  title: string;
  category: string;
  content: string;
  riskClass: string;
}

export interface ActionPermissions {
  allowAutoActions: boolean;
  allowHumanHandover: boolean;
  allowedActions: string[];
  blockedActions: string[];
  executionMode: 'shadow' | 'recommendation' | 'assisted' | 'autonomous';
  requireApproval: string[];
}

export interface EscalationRule {
  trigger: string;
  priority: string;
  action: string;
  description: string;
}

export interface RuntimeContext {
  sessionId: string;
  deploymentId?: string;
  campaignId?: string;
  environment: 'sandbox' | 'staging' | 'production';
  rolloutMode: string;
  isTest: boolean;
  direction: 'inbound' | 'outbound';
}

export interface ComplianceContext {
  requiredDisclosures: string[];
  forbiddenStatements: string[];
  recordingConsent: boolean;
  maxConfidenceForAutoAction: number;
}

// ── OpenAI Tool Definitions ───────────────────────────────────────

export interface OpenAIToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** Tool definitions that OpenAI Realtime API can call during conversation */
export function getOpenAIToolDefinitions(permissions: ActionPermissions): OpenAIToolDefinition[] {
  const allTools: OpenAIToolDefinition[] = [
    {
      type: 'function',
      name: 'suggest_status_change',
      description: 'Suggest changing the lead status based on conversation outcome.',
      parameters: {
        type: 'object',
        properties: {
          new_status: { type: 'string', enum: ['Qualifiziert', 'Nicht interessiert', 'Callback', 'Termin vereinbart', 'Nicht erreicht'] },
          reason: { type: 'string', description: 'Why this status is appropriate' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['new_status', 'reason', 'confidence'],
      },
    },
    {
      type: 'function',
      name: 'suggest_appointment',
      description: 'Suggest scheduling an appointment with the candidate.',
      parameters: {
        type: 'object',
        properties: {
          preferred_date: { type: 'string', description: 'ISO date string' },
          preferred_time: { type: 'string', description: 'HH:mm format' },
          appointment_type: { type: 'string', enum: ['video', 'phone', 'in_person'] },
          notes: { type: 'string' },
        },
        required: ['preferred_date', 'preferred_time', 'appointment_type'],
      },
    },
    {
      type: 'function',
      name: 'create_followup',
      description: 'Create a follow-up task for a human agent.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
          suggested_date: { type: 'string', description: 'ISO date for follow-up' },
        },
        required: ['reason', 'urgency'],
      },
    },
    {
      type: 'function',
      name: 'escalate_to_human',
      description: 'Escalate the conversation to a human agent immediately.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          escalation_type: { type: 'string', enum: ['human_requested', 'compliance', 'uncertainty', 'technical'] },
        },
        required: ['reason', 'priority', 'escalation_type'],
      },
    },
    {
      type: 'function',
      name: 'create_note',
      description: 'Save an important observation or piece of information from the conversation.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          category: { type: 'string', enum: ['observation', 'requirement', 'concern', 'interest'] },
        },
        required: ['content'],
      },
    },
    {
      type: 'function',
      name: 'mark_callback_requested',
      description: 'The candidate has requested a callback at a specific time.',
      parameters: {
        type: 'object',
        properties: {
          preferred_date: { type: 'string' },
          preferred_time: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['reason'],
      },
    },
    {
      type: 'function',
      name: 'end_conversation',
      description: 'Signal that the conversation should end gracefully.',
      parameters: {
        type: 'object',
        properties: {
          outcome: { type: 'string', enum: ['qualified', 'not_interested', 'callback', 'appointment', 'escalated', 'wrong_number', 'voicemail'] },
          summary: { type: 'string', description: 'Brief conversation summary' },
          sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
        },
        required: ['outcome', 'summary', 'sentiment'],
      },
    },
  ];

  // Filter to only allowed actions
  return allTools.filter(tool => {
    if (permissions.blockedActions.includes(tool.name)) return false;
    if (permissions.allowedActions.length > 0 && !permissions.allowedActions.includes(tool.name)) return false;
    return true;
  });
}

// ── Context Builder ───────────────────────────────────────────────

const db = { from: (table: string) => supabase.from(table as any) };

export async function buildSessionContext(params: {
  agentId: string;
  sessionId: string;
  leadId?: string;
  candidateId?: string;
  campaignId?: string;
  deploymentId?: string;
  direction: 'inbound' | 'outbound';
  isTest: boolean;
}): Promise<OpenAISessionContext> {
  // Fetch agent
  const { data: agent } = await db.from('ai_agents').select('*').eq('id', params.agentId).single();
  if (!agent) throw new Error(`Agent ${params.agentId} not found`);

  // Fetch deployment for rollout mode
  let rolloutMode = 'shadow';
  let environment: 'sandbox' | 'staging' | 'production' = 'sandbox';
  if (params.deploymentId) {
    const { data: deployment } = await db.from('ai_agent_deployments').select('*').eq('id', params.deploymentId).single();
    if (deployment) {
      rolloutMode = (deployment as any).rollout_mode || 'shadow';
      environment = (deployment as any).environment || 'sandbox';
    }
  }

  // Fetch approved knowledge items for this agent
  const knowledgeQuery = db.from('ai_voice_knowledge_items')
    .select('id, title, category, content, risk_class')
    .eq('is_active', true)
    .eq('approval_status', 'approved');

  // Include both agent-specific and global items
  const { data: knowledgeItems } = await knowledgeQuery
    .or(`agent_id.eq.${params.agentId},agent_id.is.null`)
    .limit(50);

  // Fetch compliance rules
  const { data: complianceRules } = await db.from('ai_compliance_rules')
    .select('*')
    .eq('is_active', true);

  // Build subject context from lead if available
  let subject: SubjectContext | null = null;
  if (params.leadId) {
    const { data: lead } = await db.from('leads').select('*').eq('id', params.leadId).single();
    if (lead) {
      subject = {
        leadId: (lead as any).id,
        firstName: (lead as any).first_name || (lead as any).name?.split(' ')[0],
        lastName: (lead as any).last_name || (lead as any).name?.split(' ').slice(1).join(' '),
        phone: (lead as any).phone,
        email: (lead as any).email,
        currentStatus: (lead as any).status,
        source: (lead as any).source,
      };
    }
  }

  // Extract compliance constraints
  const disclosures: string[] = [];
  const forbidden: string[] = [];
  let recordingConsent = false;

  (complianceRules ?? []).forEach((rule: any) => {
    if (rule.rule_type === 'mandatory_disclosure' && rule.config?.text) {
      disclosures.push(rule.config.text);
    }
    if (rule.rule_type === 'forbidden_statement' && rule.config?.pattern) {
      forbidden.push(rule.config.pattern);
    }
    if (rule.rule_type === 'recording_consent') {
      recordingConsent = true;
    }
  });

  // Agent version escalation/action rules
  const agentConfig = (agent as any).config || {};
  const escalationRules: EscalationRule[] = agentConfig.escalation_rules ?? [
    { trigger: 'human_requested', priority: 'high', action: 'escalate_to_human', description: 'Kandidat wünscht menschlichen Kontakt' },
    { trigger: 'compliance_violation', priority: 'critical', action: 'escalate_to_human', description: 'Compliance-Verstoss erkannt' },
    { trigger: 'high_uncertainty', priority: 'medium', action: 'escalate_to_human', description: 'Agent unsicher bei Antwort' },
    { trigger: 'aggressive_behaviour', priority: 'high', action: 'end_conversation', description: 'Aggressives Verhalten des Gesprächspartners' },
  ];

  // Determine action permissions based on rollout mode
  const modePermissions: Record<string, ActionPermissions> = {
    shadow: {
      allowAutoActions: false,
      allowHumanHandover: false,
      allowedActions: [],
      blockedActions: ['*'],
      executionMode: 'shadow',
      requireApproval: ['*'],
    },
    recommendation: {
      allowAutoActions: false,
      allowHumanHandover: (agent as any).allow_human_handover,
      allowedActions: ['suggest_status_change', 'suggest_appointment', 'create_followup', 'create_note', 'escalate_to_human', 'mark_callback_requested', 'end_conversation'],
      blockedActions: [],
      executionMode: 'recommendation',
      requireApproval: ['suggest_status_change', 'suggest_appointment'],
    },
    assisted: {
      allowAutoActions: (agent as any).allow_auto_actions,
      allowHumanHandover: (agent as any).allow_human_handover,
      allowedActions: ['suggest_status_change', 'suggest_appointment', 'create_followup', 'create_note', 'escalate_to_human', 'mark_callback_requested', 'end_conversation'],
      blockedActions: [],
      executionMode: 'assisted',
      requireApproval: ['suggest_status_change'],
    },
    autonomous: {
      allowAutoActions: true,
      allowHumanHandover: (agent as any).allow_human_handover,
      allowedActions: ['suggest_status_change', 'suggest_appointment', 'create_followup', 'create_note', 'escalate_to_human', 'mark_callback_requested', 'end_conversation'],
      blockedActions: [],
      executionMode: 'autonomous',
      requireApproval: [],
    },
  };

  const actionPermissions = modePermissions[rolloutMode] ?? modePermissions.shadow;

  const knItems = (knowledgeItems ?? []).map((k: any) => ({
    id: k.id,
    title: k.title,
    category: k.category,
    content: k.content,
    riskClass: k.risk_class,
  }));

  const categories = [...new Set(knItems.map(k => k.category))];

  return {
    agent: {
      id: (agent as any).id,
      name: (agent as any).name,
      displayName: (agent as any).display_name || (agent as any).name,
      agentType: (agent as any).agent_type,
      language: (agent as any).language,
      supportedLanguages: (agent as any).language_supported || ['de'],
      systemPrompt: (agent as any).system_prompt,
      greetingMessage: (agent as any).greeting_message,
      fallbackMessage: (agent as any).fallback_message,
      toneStyle: (agent as any).tone_style,
      objective: (agent as any).objective,
      identityMode: (agent as any).identity_mode,
      maxTurns: (agent as any).max_turns,
      maxCallDurationSeconds: (agent as any).max_call_duration_seconds,
      voiceId: (agent as any).voice_id || 'alloy',
    },
    subject,
    knowledge: {
      totalItems: knItems.length,
      categories,
      items: knItems,
    },
    actionPermissions,
    escalationRules,
    runtime: {
      sessionId: params.sessionId,
      deploymentId: params.deploymentId,
      campaignId: params.campaignId,
      environment,
      rolloutMode,
      isTest: params.isTest,
      direction: params.direction,
    },
    compliance: {
      requiredDisclosures: disclosures,
      forbiddenStatements: forbidden,
      recordingConsent,
      maxConfidenceForAutoAction: 0.85,
    },
  };
}

// ── System Prompt Composer ────────────────────────────────────────

/** Builds the full system prompt for OpenAI Realtime from the session context */
export function composeSystemPrompt(ctx: OpenAISessionContext): string {
  const sections: string[] = [];

  // Identity
  sections.push(`Du bist "${ctx.agent.displayName}", ein KI-gestützter Telefonassistent von SSM Recruit.`);
  sections.push(`Deine Rolle: ${ctx.agent.objective || 'Recruiting-Assistent für Erstqualifizierung und Terminvereinbarung.'}`);
  sections.push(`Tonalität: ${ctx.agent.toneStyle}. Sprache: ${ctx.agent.language}.`);

  // Identity mode
  if (ctx.agent.identityMode === 'digital_assistant') {
    sections.push('WICHTIG: Du bist ein digitaler Assistent. Gib dich NIEMALS als Mensch aus. Auf Nachfrage, ob du ein Mensch bist, sage klar, dass du ein KI-Assistent bist.');
  }

  // Compliance disclosures
  if (ctx.compliance.requiredDisclosures.length > 0) {
    sections.push('\nPFLICHTOFFENLEGUNG (muss im Gespräch erwähnt werden):');
    ctx.compliance.requiredDisclosures.forEach(d => sections.push(`- ${d}`));
  }

  // Forbidden statements
  if (ctx.compliance.forbiddenStatements.length > 0) {
    sections.push('\nVERBOTENE AUSSAGEN (dürfen NIEMALS getätigt werden):');
    ctx.compliance.forbiddenStatements.forEach(f => sections.push(`- ${f}`));
  }

  // Subject context
  if (ctx.subject) {
    sections.push(`\nGESPRÄCHSPARTNER: ${ctx.subject.firstName || ''} ${ctx.subject.lastName || ''}`);
    if (ctx.subject.currentStatus) sections.push(`Aktueller Status: ${ctx.subject.currentStatus}`);
    if (ctx.subject.source) sections.push(`Quelle: ${ctx.subject.source}`);
  }

  // Knowledge summary
  if (ctx.knowledge.totalItems > 0) {
    sections.push(`\nWISSENSBASIS (${ctx.knowledge.totalItems} Einträge in ${ctx.knowledge.categories.join(', ')}):`);
    ctx.knowledge.items.slice(0, 10).forEach(k => {
      sections.push(`[${k.category}] ${k.title}: ${k.content.substring(0, 200)}${k.content.length > 200 ? '…' : ''}`);
    });
  }

  // Escalation rules
  sections.push('\nESKALATIONSREGELN:');
  ctx.escalationRules.forEach(r => {
    sections.push(`- Bei "${r.trigger}": ${r.description} → ${r.action} (Priorität: ${r.priority})`);
  });

  // Action mode
  sections.push(`\nAKTIONSMODUS: ${ctx.actionPermissions.executionMode}`);
  if (ctx.actionPermissions.executionMode === 'shadow') {
    sections.push('Du darfst Aktionen nur protokollieren, nicht ausführen.');
  } else if (ctx.actionPermissions.executionMode === 'recommendation') {
    sections.push('Du darfst Aktionen vorschlagen. Alle Vorschläge müssen von einem Menschen bestätigt werden.');
  }

  // Max duration
  sections.push(`\nMaximale Gesprächsdauer: ${ctx.agent.maxCallDurationSeconds} Sekunden. Beende das Gespräch rechtzeitig und höflich.`);

  // Recording consent
  if (ctx.compliance.recordingConsent) {
    sections.push('\nHINWEIS: Das Gespräch wird aufgezeichnet. Informiere den Gesprächspartner zu Beginn.');
  }

  // Agent system prompt (custom)
  if (ctx.agent.systemPrompt) {
    sections.push(`\nAGENT-SPEZIFISCHE ANWEISUNGEN:\n${ctx.agent.systemPrompt}`);
  }

  return sections.join('\n');
}

// ── OpenAI Realtime Config Builder ────────────────────────────────

export interface OpenAIRealtimeConfig {
  model: string;
  voice: string;
  instructions: string;
  tools: OpenAIToolDefinition[];
  turn_detection: { type: string; threshold?: number; prefix_padding_ms?: number; silence_duration_ms?: number };
  input_audio_transcription: { model: string };
  temperature: number;
  max_response_output_tokens: number | 'inf';
}

/** Builds the configuration payload for OpenAI Realtime API session.create */
export function buildRealtimeConfig(ctx: OpenAISessionContext): OpenAIRealtimeConfig {
  return {
    model: 'gpt-4o-realtime-preview',
    voice: ctx.agent.voiceId || 'alloy',
    instructions: composeSystemPrompt(ctx),
    tools: getOpenAIToolDefinitions(ctx.actionPermissions),
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500,
    },
    input_audio_transcription: {
      model: 'whisper-1',
    },
    temperature: 0.7,
    max_response_output_tokens: 4096,
  };
}
