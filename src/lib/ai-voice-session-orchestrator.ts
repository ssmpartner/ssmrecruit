/**
 * AI Voice Session Orchestrator
 * Prepares the full session lifecycle for the Railway Voice Backend.
 * Provider-agnostic — works with Mock and later with Twilio/OpenAI.
 */
import { supabase } from '@/integrations/supabase/client';
import { buildSessionContext, buildRealtimeConfig } from './ai-voice/openai-session-context';

// ── Session Lifecycle States ──────────────────────────────────────
export type SessionState =
  | 'queued'
  | 'initiating'
  | 'ringing'
  | 'connected'
  | 'active'
  | 'paused'
  | 'awaiting_action'
  | 'escalated'
  | 'completed'
  | 'failed'
  | 'cancelled';

export const SESSION_STATE_META: Record<SessionState, { label: string; color: string; terminal: boolean; icon: string }> = {
  queued:           { label: 'In Warteschlange', color: 'bg-muted text-muted-foreground',   terminal: false, icon: '⏳' },
  initiating:       { label: 'Wird initiiert',   color: 'bg-blue-100 text-blue-800',        terminal: false, icon: '🔄' },
  ringing:          { label: 'Klingelt',          color: 'bg-yellow-100 text-yellow-800',    terminal: false, icon: '📞' },
  connected:        { label: 'Verbunden',         color: 'bg-green-100 text-green-800',      terminal: false, icon: '🔗' },
  active:           { label: 'Aktiv',             color: 'bg-green-200 text-green-900',      terminal: false, icon: '🗣️' },
  paused:           { label: 'Pausiert',          color: 'bg-orange-100 text-orange-800',    terminal: false, icon: '⏸️' },
  awaiting_action:  { label: 'Wartet auf Aktion', color: 'bg-purple-100 text-purple-800',   terminal: false, icon: '⏱️' },
  escalated:        { label: 'Eskaliert',         color: 'bg-red-100 text-red-800',          terminal: false, icon: '🚨' },
  completed:        { label: 'Abgeschlossen',     color: 'bg-primary/10 text-primary',       terminal: true,  icon: '✅' },
  failed:           { label: 'Fehlgeschlagen',    color: 'bg-destructive/10 text-destructive', terminal: true, icon: '❌' },
  cancelled:        { label: 'Abgebrochen',       color: 'bg-muted text-muted-foreground',   terminal: true,  icon: '🚫' },
};

// Valid transitions
export const STATE_TRANSITIONS: Record<SessionState, SessionState[]> = {
  queued:          ['initiating', 'cancelled'],
  initiating:      ['ringing', 'failed', 'cancelled'],
  ringing:         ['connected', 'failed', 'cancelled'],
  connected:       ['active', 'failed', 'cancelled'],
  active:          ['paused', 'awaiting_action', 'escalated', 'completed', 'failed'],
  paused:          ['active', 'completed', 'cancelled'],
  awaiting_action: ['active', 'escalated', 'completed', 'failed'],
  escalated:       ['active', 'completed', 'failed'],
  completed:       [],
  failed:          [],
  cancelled:       [],
};

// ── Session Events ────────────────────────────────────────────────
export type SessionEventType =
  | 'session_created'
  | 'provider_call_requested'
  | 'provider_call_connected'
  | 'ai_joined'
  | 'first_turn_created'
  | 'action_suggested'
  | 'action_approved'
  | 'action_executed'
  | 'action_blocked'
  | 'escalation_created'
  | 'summary_generated'
  | 'session_completed'
  | 'session_failed'
  | 'session_cancelled'
  | 'state_changed'
  | 'error_occurred';

export interface SessionEvent {
  id: string;
  type: SessionEventType;
  timestamp: string;
  detail: string;
  metadata?: Record<string, unknown>;
  fromState?: SessionState;
  toState?: SessionState;
}

export const EVENT_LABELS: Record<SessionEventType, { label: string; icon: string }> = {
  session_created:          { label: 'Session erstellt',        icon: '📋' },
  provider_call_requested:  { label: 'Provider-Anruf angefragt', icon: '📡' },
  provider_call_connected:  { label: 'Provider verbunden',      icon: '✅' },
  ai_joined:                { label: 'KI beigetreten',          icon: '🤖' },
  first_turn_created:       { label: 'Erster Turn',             icon: '💬' },
  action_suggested:         { label: 'Aktion vorgeschlagen',    icon: '💡' },
  action_approved:          { label: 'Aktion genehmigt',        icon: '✅' },
  action_executed:          { label: 'Aktion ausgeführt',       icon: '⚡' },
  action_blocked:           { label: 'Aktion blockiert',        icon: '🚫' },
  escalation_created:       { label: 'Eskalation erstellt',     icon: '🚨' },
  summary_generated:        { label: 'Zusammenfassung erstellt', icon: '📝' },
  session_completed:        { label: 'Session abgeschlossen',   icon: '🏁' },
  session_failed:           { label: 'Session fehlgeschlagen',  icon: '❌' },
  session_cancelled:        { label: 'Session abgebrochen',     icon: '🚫' },
  state_changed:            { label: 'Status geändert',         icon: '🔄' },
  error_occurred:           { label: 'Fehler aufgetreten',      icon: '⚠️' },
};

// ── Orchestrator Context ──────────────────────────────────────────
export interface OrchestrationContext {
  sessionId: string;
  agentId: string;
  deploymentId?: string;
  leadId?: string;
  candidateId?: string;
  agencyId?: string;
  campaignId?: string;
  direction: 'inbound' | 'outbound';
  rolloutMode: string;
  environment: 'sandbox' | 'production';
  isMock: boolean;
}

export interface OrchestrationResult {
  sessionId: string;
  state: SessionState;
  events: SessionEvent[];
  context: OrchestrationContext;
  realtimeConfig?: ReturnType<typeof buildRealtimeConfig>;
  error?: string;
}

// ── Helper: generate events ───────────────────────────────────────
function createEvent(type: SessionEventType, detail: string, meta?: Record<string, unknown>, fromState?: SessionState, toState?: SessionState): SessionEvent {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    detail,
    metadata: meta,
    fromState,
    toState,
  };
}

// ── Mock Orchestrator (client-side simulation) ────────────────────
// In production, this logic runs on the Railway Voice Backend.
// Here we simulate the lifecycle for testing and demonstration.

export async function orchestrateSession(ctx: OrchestrationContext): Promise<OrchestrationResult> {
  const events: SessionEvent[] = [];

  // 1. Session created
  events.push(createEvent('session_created', `Session ${ctx.sessionId.slice(0, 8)} erstellt`, {
    direction: ctx.direction,
    agentId: ctx.agentId,
    isMock: ctx.isMock,
  }));

  // 2. Load agent
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', ctx.agentId)
    .single();

  if (!agent) {
    events.push(createEvent('session_failed', 'Agent nicht gefunden', { agentId: ctx.agentId }));
    return { sessionId: ctx.sessionId, state: 'failed', events, context: ctx, error: 'Agent not found' };
  }

  // 3. Check deployment
  if (ctx.deploymentId) {
    const { data: deployment } = await supabase
      .from('ai_agent_deployments')
      .select('*')
      .eq('id', ctx.deploymentId)
      .single();

    if (!deployment || !deployment.is_enabled) {
      events.push(createEvent('session_failed', 'Deployment nicht aktiv oder nicht gefunden'));
      return { sessionId: ctx.sessionId, state: 'failed', events, context: ctx, error: 'Deployment inactive' };
    }

    ctx.rolloutMode = deployment.rollout_mode;
    events.push(createEvent('state_changed', `Rollout-Modus: ${ctx.rolloutMode}`, {}, 'queued', 'initiating'));
  }

  // 4. Load knowledge
  const { data: knowledge } = await supabase
    .from('ai_voice_knowledge_items')
    .select('id, title, content, category')
    .eq('is_active', true)
    .eq('approved_for_live_calls', true)
    .or(`agent_id.eq.${ctx.agentId},scope_type.eq.global`)
    .limit(20);

  // 5. Load action permissions (from agent config)
  const actionPermissions = (agent.config as any)?.action_permissions || {};

  // 6. Build session context for OpenAI (prepared but not sent in mock mode)
  let realtimeConfig;
  try {
    const sessionCtx = await buildSessionContext({
      agentId: ctx.agentId,
      sessionId: ctx.sessionId,
      leadId: ctx.leadId,
      candidateId: ctx.candidateId,
      campaignId: ctx.campaignId,
      direction: ctx.direction,
      isTest: ctx.isMock,
    });
    realtimeConfig = buildRealtimeConfig(sessionCtx);
    events.push(createEvent('ai_joined', 'KI-Kontext vorbereitet', { model: realtimeConfig.model }));
  } catch {
    events.push(createEvent('error_occurred', 'KI-Kontext konnte nicht erstellt werden'));
  }

  // 7. Provider call request
  events.push(createEvent('provider_call_requested', ctx.isMock ? 'Mock-Provider: Anruf simuliert' : 'Provider-Anruf angefragt', {
    provider: ctx.isMock ? 'mock' : 'twilio',
  }, 'initiating', 'ringing'));

  // 8. In mock mode, simulate connection
  if (ctx.isMock) {
    events.push(createEvent('provider_call_connected', 'Mock-Verbindung hergestellt', {}, 'ringing', 'connected'));
    events.push(createEvent('state_changed', 'Session aktiv', {}, 'connected', 'active'));
    events.push(createEvent('first_turn_created', 'Begrüssung gesendet'));

    // Simulate completion
    events.push(createEvent('summary_generated', 'Zusammenfassung erstellt'));
    events.push(createEvent('session_completed', 'Mock-Session abgeschlossen', {}, 'active', 'completed'));
  }

  return {
    sessionId: ctx.sessionId,
    state: ctx.isMock ? 'completed' : 'ringing',
    events,
    context: ctx,
    realtimeConfig,
  };
}

// ── Build mock events for existing sessions (for UI display) ──────
export function buildMockEventsForSession(session: {
  status: string;
  direction: string;
  duration: number;
  outcome: string;
  sentiment: string;
  escalation_status: string;
  created_at: string;
  is_test: boolean;
  turns?: { index: number }[];
  actions?: { type: string; result: string }[];
}): SessionEvent[] {
  const events: SessionEvent[] = [];
  const base = new Date(session.created_at).getTime();

  events.push({
    id: crypto.randomUUID(),
    type: 'session_created',
    timestamp: new Date(base).toISOString(),
    detail: `${session.direction === 'outbound' ? 'Outbound' : 'Inbound'}-Session erstellt${session.is_test ? ' (Test)' : ''}`,
  });

  if (session.status !== 'queued') {
    events.push({
      id: crypto.randomUUID(),
      type: 'provider_call_requested',
      timestamp: new Date(base + 500).toISOString(),
      detail: session.is_test ? 'Mock-Provider: Anruf initiiert' : 'Provider-Anruf angefragt',
      fromState: 'queued',
      toState: 'initiating',
    });
  }

  if (['completed', 'no_answer', 'failed'].includes(session.status) && session.duration > 0) {
    events.push({
      id: crypto.randomUUID(),
      type: 'provider_call_connected',
      timestamp: new Date(base + 2000).toISOString(),
      detail: 'Verbindung hergestellt',
      fromState: 'ringing',
      toState: 'connected',
    });

    events.push({
      id: crypto.randomUUID(),
      type: 'ai_joined',
      timestamp: new Date(base + 2500).toISOString(),
      detail: 'KI-Agent beigetreten',
      fromState: 'connected',
      toState: 'active',
    });

    if (session.turns && session.turns.length > 0) {
      events.push({
        id: crypto.randomUUID(),
        type: 'first_turn_created',
        timestamp: new Date(base + 3000).toISOString(),
        detail: `Erster Turn erstellt (${session.turns.length} Turns gesamt)`,
      });
    }
  }

  if (session.status === 'no_answer') {
    events.push({
      id: crypto.randomUUID(),
      type: 'session_failed',
      timestamp: new Date(base + 5000).toISOString(),
      detail: 'Keine Antwort – Anruf beendet',
      fromState: 'ringing',
      toState: 'failed',
    });
  }

  if (session.actions) {
    session.actions.forEach((a, i) => {
      events.push({
        id: crypto.randomUUID(),
        type: a.result === 'pending_approval' ? 'action_suggested' : 'action_executed',
        timestamp: new Date(base + 4000 + i * 500).toISOString(),
        detail: `${a.type}: ${a.result}`,
      });
    });
  }

  if (session.escalation_status !== 'none') {
    events.push({
      id: crypto.randomUUID(),
      type: 'escalation_created',
      timestamp: new Date(base + (session.duration * 1000) - 2000).toISOString(),
      detail: 'Eskalation an Mitarbeiter erstellt',
      fromState: 'active',
      toState: 'escalated',
    });
  }

  if (session.status === 'completed') {
    events.push({
      id: crypto.randomUUID(),
      type: 'summary_generated',
      timestamp: new Date(base + (session.duration * 1000) + 500).toISOString(),
      detail: 'Zusammenfassung und Sentiment-Analyse erstellt',
    });

    events.push({
      id: crypto.randomUUID(),
      type: 'session_completed',
      timestamp: new Date(base + (session.duration * 1000) + 1000).toISOString(),
      detail: `Session abgeschlossen: ${session.outcome.replace(/_/g, ' ')}`,
      fromState: 'active',
      toState: 'completed',
    });
  }

  return events;
}
