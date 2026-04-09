/**
 * AI Voice Action Gateway
 * Central orchestrator for all actions triggered by AI Voice sessions.
 * Handles execution modes: shadow, recommendation, assisted, autonomous.
 */
import { supabase } from '@/integrations/supabase/client';

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
const db = { from: (t: string) => supabase.from(t as any) };

// ── Core Gateway ──────────────────────────────────────────────────
export const actionGateway = {
  /**
   * Process an action request through the gateway.
   * Determines execution mode based on rollout and logs everything.
   */
  async processAction(request: ActionRequest): Promise<ActionResult> {
    const actionDef = ACTION_DEFINITIONS[request.action_type];
    const executionMode = resolveExecutionMode(request.rollout_mode, actionDef);
    const timestamp = new Date().toISOString();
    const resultId = crypto.randomUUID();

    let success = true;
    let resultMessage = '';

    // Execute the action if mode allows
    if (executionMode === 'auto_executed' || executionMode === 'approved') {
      try {
        resultMessage = await executeAction(request);
      } catch (err: any) {
        success = false;
        resultMessage = err.message || 'Execution failed';
      }
    } else if (executionMode === 'suggested') {
      resultMessage = `Aktion "${actionDef.label}" vorgeschlagen – wartet auf Bestätigung`;
    } else if (executionMode === 'shadow') {
      resultMessage = `Shadow-Modus: "${actionDef.label}" protokolliert, nicht ausgeführt`;
    } else {
      resultMessage = `Aktion "${actionDef.label}" blockiert (Rollout-Modus: ${request.rollout_mode})`;
    }

    // Log to ai_voice_action_logs
    await db.from('ai_voice_action_logs').insert({
      session_id: request.session_id,
      ai_agent_id: request.ai_agent_id,
      action_type: request.action_type,
      target_type: request.lead_id ? 'lead' : 'system',
      target_id: request.lead_id || request.candidate_id || '',
      execution_mode: executionMode,
      payload_json: request.payload,
      result: success ? 'success' : 'failed',
      result_json: { message: resultMessage },
      reason: request.reason,
      executed_by: 'ai_voice_agent',
    } as any);

    // Log to lead activity timeline
    if (request.lead_id) {
      await logToTimeline(request, executionMode, actionDef, resultMessage);
    }

    return { id: resultId, action_type: request.action_type, execution_mode: executionMode, success, result_message: resultMessage, timestamp };
  },

  /**
   * Approve a previously suggested action.
   */
  async approveAction(actionLogId: string, userId: string): Promise<ActionResult> {
    const { data: logEntry } = await db.from('ai_voice_action_logs').select('*').eq('id', actionLogId).single();
    if (!logEntry) throw new Error('Action log not found');

    const entry = logEntry as any;
    if (entry.execution_mode !== 'suggested') {
      throw new Error('Nur vorgeschlagene Aktionen können genehmigt werden');
    }

    // Re-execute the action
    const request: ActionRequest = {
      action_type: entry.action_type as ActionType,
      source: 'ai_voice_agent',
      session_id: entry.session_id,
      ai_agent_id: entry.ai_agent_id || '',
      lead_id: entry.target_type === 'lead' ? entry.target_id : undefined,
      rollout_mode: 'autonomous', // force execution
      reason: `Genehmigt von ${userId}`,
      confidence: 1.0,
      payload: entry.payload_json || {},
    };

    let resultMessage: string;
    let success = true;
    try {
      resultMessage = await executeAction(request);
    } catch (err: any) {
      success = false;
      resultMessage = err.message;
    }

    // Update the log entry
    await db.from('ai_voice_action_logs').update({
      execution_mode: 'approved',
      executed_by: userId,
      result: success ? 'success' : 'failed',
      result_json: { message: resultMessage, approved_at: new Date().toISOString() },
    } as any).eq('id', actionLogId);

    return {
      id: actionLogId,
      action_type: entry.action_type,
      execution_mode: 'approved',
      success,
      result_message: resultMessage,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Reject a suggested action.
   */
  async rejectAction(actionLogId: string, userId: string, reason: string): Promise<void> {
    await db.from('ai_voice_action_logs').update({
      execution_mode: 'blocked',
      executed_by: userId,
      result: 'blocked',
      result_json: { message: `Abgelehnt: ${reason}`, rejected_at: new Date().toISOString() },
    } as any).eq('id', actionLogId);
  },

  /**
   * Get pending (suggested) actions for a lead or globally.
   */
  async getPendingActions(leadId?: string) {
    let q = db.from('ai_voice_action_logs').select('*')
      .eq('execution_mode', 'suggested')
      .eq('result', 'success')
      .order('created_at', { ascending: false });
    if (leadId) q = q.eq('target_id', leadId);
    const { data } = await q;
    return data ?? [];
  },

  /**
   * Get action history for a session or lead.
   */
  async getActionHistory(filters: { sessionId?: string; leadId?: string; limit?: number }) {
    let q = db.from('ai_voice_action_logs').select('*').order('created_at', { ascending: false });
    if (filters.sessionId) q = q.eq('session_id', filters.sessionId);
    if (filters.leadId) q = q.eq('target_id', filters.leadId);
    if (filters.limit) q = q.limit(filters.limit);
    const { data } = await q;
    return data ?? [];
  },

  /**
   * Process a batch of suggested actions from a session.
   */
  async processBatch(actions: ActionRequest[]): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    for (const action of actions) {
      results.push(await actionGateway.processAction(action));
    }
    return results;
  },
};

// ── Action Executors ──────────────────────────────────────────────
async function executeAction(req: ActionRequest): Promise<string> {
  const { action_type, lead_id, payload } = req;

  switch (action_type) {
    case 'set_status': {
      const newStatus = payload.newStatus as string;
      if (!lead_id || !newStatus) throw new Error('lead_id and newStatus required');
      await db.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() } as any).eq('id', lead_id);
      return `Status auf "${newStatus}" gesetzt`;
    }

    case 'mark_no_interest':
      if (!lead_id) throw new Error('lead_id required');
      await db.from('leads').update({ status: 'Nicht interessiert', updated_at: new Date().toISOString() } as any).eq('id', lead_id);
      return 'Lead als "Nicht interessiert" markiert';

    case 'mark_wrong_number':
      if (!lead_id) throw new Error('lead_id required');
      await db.from('leads').update({ status: 'Falsche Nummer', notes: 'AI Voice Agent: Falsche Nummer erkannt', updated_at: new Date().toISOString() } as any).eq('id', lead_id);
      return 'Lead als "Falsche Nummer" markiert';

    case 'mark_callback_requested':
      if (!lead_id) throw new Error('lead_id required');
      await db.from('leads').update({ status: 'Rückruf', updated_at: new Date().toISOString() } as any).eq('id', lead_id);
      return 'Lead als "Rückruf gewünscht" markiert';

    case 'mark_qualified':
      if (!lead_id) throw new Error('lead_id required');
      await db.from('leads').update({ status: 'Qualifiziert', updated_at: new Date().toISOString() } as any).eq('id', lead_id);
      return 'Lead als "Qualifiziert" markiert';

    case 'mark_not_reached':
      if (!lead_id) throw new Error('lead_id required');
      await db.from('leads').update({ status: 'Nicht erreicht', updated_at: new Date().toISOString() } as any).eq('id', lead_id);
      return 'Lead als "Nicht erreicht" markiert';

    case 'create_note': {
      const noteText = (payload.text as string) || 'AI Voice Agent Notiz';
      if (!lead_id) throw new Error('lead_id required');
      await db.from('activities').insert({
        id: crypto.randomUUID(),
        lead_id,
        type: 'note',
        description: `🤖 ${noteText}`,
        user: 'AI Voice Agent',
      } as any);
      return `Notiz erstellt: "${noteText}"`;
    }

    case 'create_followup':
    case 'create_task': {
      const title = (payload.title as string) || `AI-Task: ${ACTION_DEFINITIONS[action_type].label}`;
      const description = (payload.description as string) || '';
      // Create as activity + note (tasks table integration placeholder)
      if (lead_id) {
        await db.from('activities').insert({
          id: crypto.randomUUID(),
          lead_id,
          type: 'note',
          description: `📋 Aufgabe erstellt: ${title}${description ? ` – ${description}` : ''}`,
          user: 'AI Voice Agent',
        } as any);
      }
      return `Aufgabe "${title}" erstellt`;
    }

    case 'assign_to_user': {
      const userId = payload.user_id as string;
      if (!lead_id || !userId) throw new Error('lead_id and user_id required');
      await db.from('leads').update({ employee_id: userId, updated_at: new Date().toISOString() } as any).eq('id', lead_id);
      return `Lead dem Mitarbeiter ${userId} zugewiesen`;
    }

    case 'escalate_to_human': {
      // Create escalation entry
      await db.from('ai_voice_escalations').insert({
        session_id: req.session_id,
        agent_id: req.ai_agent_id,
        lead_id: lead_id || null,
        reason: req.reason || 'Übergabe an Mitarbeiter vom AI Voice Agent',
        priority: (payload.priority as string) || 'medium',
        escalation_type: 'ai_triggered',
        status: 'open',
      } as any);
      if (lead_id) {
        await db.from('activities').insert({
          id: crypto.randomUUID(),
          lead_id,
          type: 'note',
          description: `⚠️ Eskalation: ${req.reason || 'AI Voice Agent hat an Mitarbeiter übergeben'}`,
          user: 'AI Voice Agent',
        } as any);
      }
      return 'Eskalation an Mitarbeiter erstellt';
    }

    case 'schedule_callback': {
      const callbackDate = (payload.date as string) || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const callbackTime = (payload.time as string) || '10:00';
      if (lead_id) {
        await db.from('activities').insert({
          id: crypto.randomUUID(),
          lead_id,
          type: 'appointment',
          description: `📞 Rückruf geplant: ${callbackDate} um ${callbackTime}`,
          user: 'AI Voice Agent',
        } as any);
      }
      return `Rückruf geplant für ${callbackDate} um ${callbackTime}`;
    }

    case 'prepare_interview': {
      if (lead_id) {
        await db.from('activities').insert({
          id: crypto.randomUUID(),
          lead_id,
          type: 'note',
          description: '🎯 Interview-Vorbereitung durch AI Voice Agent gestartet',
          user: 'AI Voice Agent',
        } as any);
      }
      return 'Interview-Vorbereitung gestartet';
    }

    case 'open_wizard': {
      const wizardType = (payload.wizard_type as string) || 'recruiting';
      if (lead_id) {
        await db.from('activities').insert({
          id: crypto.randomUUID(),
          lead_id,
          type: 'status_change',
          description: `🔮 Wizard "${wizardType}" durch AI Voice Agent ausgelöst`,
          user: 'AI Voice Agent',
        } as any);
      }
      return `Wizard "${wizardType}" ausgelöst`;
    }

    case 'send_confirmation_placeholder':
      return 'Bestätigungs-Platzhalter vorbereitet (kein echter Versand)';

    default:
      return `Unbekannte Aktion: ${action_type}`;
  }
}

// ── Timeline Logger ───────────────────────────────────────────────
async function logToTimeline(req: ActionRequest, mode: ExecutionMode, def: ActionDef, result: string) {
  const modeLabel: Record<ExecutionMode, string> = {
    auto_executed: '✅ Automatisch ausgeführt',
    approved: '✅ Genehmigt & ausgeführt',
    suggested: '💡 Vorgeschlagen',
    shadow: '👁️ Shadow-Modus',
    blocked: '🚫 Blockiert',
  };

  const description = `🤖 AI Voice Agent – ${def.label}: ${modeLabel[mode]}. ${result}`;

  await db.from('activities').insert({
    id: crypto.randomUUID(),
    lead_id: req.lead_id!,
    type: mode === 'auto_executed' || mode === 'approved' ? 'status_change' : 'note',
    description,
    user: 'AI Voice Agent',
  } as any);
}
