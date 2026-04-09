/**
 * AI Voice Action Gateway
 * Central orchestrator for all actions triggered by AI Voice sessions.
 * Handles execution modes: shadow, recommendation, assisted, autonomous.
 * Integrates with SSM Recruit notifications and task system.
 */
import { supabase } from '@/integrations/supabase/client';
import type { NotificationType } from '@/context/notifications-context';

// ── Action Types ──────────────────────────────────────────────────
export type ActionType =
  | 'set_status'
  | 'open_wizard'
  | 'create_followup'
  | 'create_task'
  | 'create_note'
  | 'assign_to_user'
  | 'escalate_to_human'
  | 'mark_wrong_number'
  | 'mark_no_interest'
  | 'mark_callback_requested'
  | 'mark_qualified'
  | 'mark_not_reached'
  | 'schedule_callback'
  | 'prepare_interview'
  | 'send_confirmation_placeholder';

export type ExecutionMode = 'suggested' | 'approved' | 'auto_executed' | 'blocked' | 'shadow';
export type RolloutMode = 'off' | 'shadow' | 'recommendation' | 'assisted' | 'autonomous';

export interface ActionRequest {
  action_type: ActionType;
  source: 'ai_voice_agent';
  session_id: string;
  ai_agent_id: string;
  lead_id?: string;
  candidate_id?: string;
  rollout_mode: RolloutMode;
  reason: string;
  confidence: number;
  payload: Record<string, unknown>;
}

export interface ActionResult {
  id: string;
  action_type: ActionType;
  execution_mode: ExecutionMode;
  success: boolean;
  result_message: string;
  timestamp: string;
}

// ── Action Definitions ────────────────────────────────────────────
interface ActionDef {
  label: string;
  description: string;
  allowAutoExecute: boolean;
  requiresLeadId: boolean;
}

export const ACTION_DEFINITIONS: Record<ActionType, ActionDef> = {
  set_status:                    { label: 'Status ändern',               description: 'Lead-Status im System aktualisieren',                    allowAutoExecute: true,  requiresLeadId: true },
  open_wizard:                   { label: 'Wizard starten',              description: 'Wizard-Prozess für den Lead auslösen',                   allowAutoExecute: false, requiresLeadId: true },
  create_followup:               { label: 'Follow-up erstellen',         description: 'Follow-up-Aufgabe für den Lead anlegen',                 allowAutoExecute: true,  requiresLeadId: true },
  create_task:                   { label: 'Aufgabe erstellen',           description: 'Allgemeine Aufgabe im System anlegen',                   allowAutoExecute: true,  requiresLeadId: false },
  create_note:                   { label: 'Notiz erstellen',             description: 'Gesprächsnotiz am Lead hinterlegen',                     allowAutoExecute: true,  requiresLeadId: true },
  assign_to_user:                { label: 'Benutzer zuweisen',           description: 'Lead einem Mitarbeiter zuweisen',                        allowAutoExecute: false, requiresLeadId: true },
  escalate_to_human:             { label: 'An Mensch eskalieren',        description: 'Gespräch an zuständigen Mitarbeiter übergeben',           allowAutoExecute: true,  requiresLeadId: true },
  mark_wrong_number:             { label: 'Falsche Nummer',              description: 'Lead als "Falsche Nummer" markieren',                    allowAutoExecute: true,  requiresLeadId: true },
  mark_no_interest:              { label: 'Kein Interesse',              description: 'Lead als "Nicht interessiert" markieren',                 allowAutoExecute: true,  requiresLeadId: true },
  mark_callback_requested:       { label: 'Rückruf gewünscht',           description: 'Lead als "Rückruf gewünscht" markieren',                 allowAutoExecute: true,  requiresLeadId: true },
  mark_qualified:                { label: 'Qualifiziert',                description: 'Lead als qualifiziert markieren',                        allowAutoExecute: false, requiresLeadId: true },
  mark_not_reached:              { label: 'Nicht erreicht',              description: 'Lead als nicht erreicht markieren',                      allowAutoExecute: true,  requiresLeadId: true },
  schedule_callback:             { label: 'Rückruf planen',              description: 'Rückruftermin im Kalender anlegen',                      allowAutoExecute: true,  requiresLeadId: true },
  prepare_interview:             { label: 'Interview vorbereiten',       description: 'Interviewtermin und Unterlagen vorbereiten',              allowAutoExecute: false, requiresLeadId: true },
  send_confirmation_placeholder: { label: 'Bestätigung senden',          description: 'Platzhalter-Bestätigung an Kandidat (vorbereitet)',       allowAutoExecute: false, requiresLeadId: true },
};

// ── Resolve execution mode from rollout mode ──────────────────────
function resolveExecutionMode(rollout: RolloutMode, actionDef: ActionDef): ExecutionMode {
  switch (rollout) {
    case 'off':
      return 'blocked';
    case 'shadow':
      return 'shadow';
    case 'recommendation':
      return 'suggested';
    case 'assisted':
      return 'suggested'; // user must approve
    case 'autonomous':
      return actionDef.allowAutoExecute ? 'auto_executed' : 'suggested';
    default:
      return 'blocked';
  }
}

// ── DB helper (bypass strict types) ───────────────────────────────
const dbHelper = { from: (t: string) => supabase.from(t as any) };

// ── Edge Function Gateway Client ──────────────────────────────────
// All actions are routed through the server-side Edge Function
// `ai-voice-gateway` which enforces rules, auth, and logging.
// The frontend NEVER executes actions directly against the DB.

const GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-voice-gateway`;

async function gatewayFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Nicht authentifiziert – bitte einloggen');

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(options.headers || {}),
    },
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || `Gateway error ${res.status}`);
  }
  return body.data;
}

// ── Core Gateway (routes through Edge Function) ───────────────────
export const actionGateway = {
  /**
   * Process an action request through the server-side gateway.
   */
  async processAction(request: ActionRequest): Promise<ActionResult> {
    const data = await gatewayFetch('/execute', {
      method: 'POST',
      body: JSON.stringify({
        action_type: request.action_type,
        source: request.source,
        source_runtime: 'ssm_recruit_frontend',
        session_id: request.session_id,
        ai_agent_id: request.ai_agent_id,
        lead_id: request.lead_id,
        candidate_id: request.candidate_id,
        execution_mode: request.rollout_mode,
        reason: request.reason,
        confidence: request.confidence,
        payload: request.payload,
        audit_metadata: { origin: 'frontend' },
      }),
    });
    return {
      id: data.id,
      action_type: data.action_type,
      execution_mode: data.execution_mode,
      success: data.success,
      result_message: data.message,
      timestamp: data.timestamp,
    };
  },

  /**
   * Approve a previously suggested action via server-side gateway.
   */
  async approveAction(actionLogId: string, userId: string): Promise<ActionResult> {
    const data = await gatewayFetch('/approve', {
      method: 'POST',
      body: JSON.stringify({ action_log_id: actionLogId, reason: `Approved by ${userId}` }),
    });
    return {
      id: data.id,
      action_type: data.action_type,
      execution_mode: 'approved',
      success: data.success,
      result_message: data.message,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Reject a suggested action via server-side gateway.
   */
  async rejectAction(actionLogId: string, userId: string, reason: string): Promise<void> {
    await gatewayFetch('/reject', {
      method: 'POST',
      body: JSON.stringify({ action_log_id: actionLogId, reason }),
    });
  },

  /**
   * Get pending (suggested) actions.
   */
  async getPendingActions(leadId?: string) {
    const params = leadId ? `?lead_id=${leadId}` : '';
    return await gatewayFetch(`/pending${params}`);
  },

  /**
   * Get action history for a session or lead.
   */
  async getActionHistory(filters: { sessionId?: string; leadId?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (filters.sessionId) params.set('session_id', filters.sessionId);
    if (filters.leadId) params.set('lead_id', filters.leadId);
    if (filters.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    return await gatewayFetch(`/history${qs ? '?' + qs : ''}`);
  },

  /**
   * Process a batch of actions.
   */
  async processBatch(actions: ActionRequest[]): Promise<ActionResult[]> {
    const data = await gatewayFetch('/batch', {
      method: 'POST',
      body: JSON.stringify({ actions: actions.map(a => ({
        action_type: a.action_type,
        source: a.source,
        source_runtime: 'ssm_recruit_frontend',
        session_id: a.session_id,
        ai_agent_id: a.ai_agent_id,
        lead_id: a.lead_id,
        candidate_id: a.candidate_id,
        execution_mode: a.rollout_mode,
        reason: a.reason,
        confidence: a.confidence,
        payload: a.payload,
      })) }),
    });
    return (data as any[]).map((d: any) => ({
      id: d.id,
      action_type: d.action_type,
      execution_mode: d.execution_mode,
      success: d.success,
      result_message: d.message,
      timestamp: d.timestamp || new Date().toISOString(),
    }));
  },

  /**
   * Check gateway health status.
   */
  async getHealth() {
    const res = await fetch(`${GATEWAY_URL}/health`, {
      headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    return await res.json();
  },
};

// ── Notification Helpers (client-side convenience) ─────────────────
// These are kept for direct notification creation from client code
// when not going through the gateway (e.g., compliance monitoring).

/**
 * Notify about problematic sessions (compliance flags, high error rate, etc.)
 */
export async function notifyProblematicSession(sessionId: string, reason: string, leadId?: string) {
  await db.from('notifications').insert({
    type: 'ai_voice_problematic_session',
    title: '🚨 Problematische Session erkannt',
    description: `Session ${sessionId.slice(0, 8)}: ${reason}`,
    lead_id: leadId || null,
  } as any);
}

/**
 * Notify about compliance violations.
 */
export async function notifyComplianceFlag(ruleName: string, sessionId: string, detail: string, leadId?: string) {
  await db.from('notifications').insert({
    type: 'ai_voice_compliance_flag',
    title: `🛡️ Compliance-Verletzung: ${ruleName}`,
    description: `Session ${sessionId.slice(0, 8)}: ${detail}`,
    lead_id: leadId || null,
  } as any);
}

/**
 * Notify admins about budget warnings.
 */
export async function notifyBudgetWarning(scope: string, current: number, limit: number) {
  const pct = ((current / limit) * 100).toFixed(0);
  await db.from('notifications').insert({
    type: 'ai_voice_budget_warning',
    title: `💰 Budgetwarnung: ${scope}`,
    description: `${pct}% des Budgets erreicht (${current.toFixed(2)} / ${limit.toFixed(2)} CHF)`,
    lead_id: null,
  } as any);
}

/**
 * Notify when a candidate requests to speak to a human.
 */
export async function notifyHumanHandover(sessionId: string, agentName: string, leadId?: string) {
  await db.from('notifications').insert({
    type: 'ai_voice_human_handover',
    title: '👤 Kandidat möchte Mensch sprechen',
    description: `Während Session ${sessionId.slice(0, 8)} mit ${agentName} wurde eine Übergabe an einen Mitarbeiter angefordert.`,
    lead_id: leadId || null,
  } as any);
}
