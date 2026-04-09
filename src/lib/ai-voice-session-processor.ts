/**
 * AI Voice Session Processor
 * Bridges mock/real voice sessions with the Action Gateway.
 * After a session ends, processes suggested actions through the gateway.
 */
import { actionGateway, type ActionRequest, type ActionType, type RolloutMode } from './ai-voice-action-gateway';
import type { MockSession, SuggestedAction } from './ai-voice-mock';

// Map mock suggested action types to gateway action types
const ACTION_TYPE_MAP: Record<string, ActionType> = {
  status_change: 'set_status',
  wizard_start: 'open_wizard',
  follow_up: 'create_followup',
  appointment: 'schedule_callback',
  escalation: 'escalate_to_human',
  note: 'create_note',
};

const OUTCOME_ACTIONS: Record<string, ActionType[]> = {
  appointment_scheduled: ['schedule_callback', 'mark_qualified'],
  not_interested: ['mark_no_interest'],
  callback_requested: ['mark_callback_requested', 'schedule_callback'],
  wrong_number: ['mark_wrong_number'],
  escalated: ['escalate_to_human'],
  no_answer: ['mark_not_reached'],
  failed: ['mark_not_reached'],
  voicemail_left: ['mark_not_reached', 'create_followup'],
  info_provided: ['create_note'],
  lead_created: ['set_status'],
};

export async function processSessionActions(
  session: MockSession,
  agentId: string,
  leadId: string | undefined,
  rolloutMode: RolloutMode = 'recommendation'
) {
  const requests: ActionRequest[] = [];

  // 1. Process explicitly suggested actions from the session
  for (const action of session.suggestedActions) {
    const actionType = ACTION_TYPE_MAP[action.type] || 'create_note';
    requests.push({
      action_type: actionType,
      source: 'ai_voice_agent',
      session_id: session.id,
      ai_agent_id: agentId,
      lead_id: leadId,
      rollout_mode: rolloutMode,
      reason: action.description,
      confidence: 0.85,
      payload: action.payload,
    });
  }

  // 2. Add outcome-based actions if not already covered
  const outcomeActions = OUTCOME_ACTIONS[session.outcome] || [];
  const existingTypes = new Set(requests.map(r => r.action_type));
  for (const at of outcomeActions) {
    if (!existingTypes.has(at)) {
      requests.push({
        action_type: at,
        source: 'ai_voice_agent',
        session_id: session.id,
        ai_agent_id: agentId,
        lead_id: leadId,
        rollout_mode: rolloutMode,
        reason: `Automatisch basierend auf Gesprächsergebnis: ${session.outcome}`,
        confidence: 0.75,
        payload: {},
      });
    }
  }

  // 3. Always create a session summary note
  requests.push({
    action_type: 'create_note',
    source: 'ai_voice_agent',
    session_id: session.id,
    ai_agent_id: agentId,
    lead_id: leadId,
    rollout_mode: rolloutMode === 'shadow' ? 'shadow' : 'autonomous', // notes always auto
    reason: 'Gesprächszusammenfassung',
    confidence: 1.0,
    payload: { text: `Zusammenfassung: ${session.summary} | Stimmung: ${session.sentiment} | Dauer: ${session.durationSeconds}s` },
  });

  return actionGateway.processBatch(requests);
}
