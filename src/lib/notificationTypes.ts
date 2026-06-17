export type AppNotificationRole = 'superadmin' | 'admin' | 'backoffice' | 'analyst' | 'teamleiter';

export const NOTIFICATION_TYPES: { type: string; label: string; group: string }[] = [
  { type: 'lead_new', label: 'Neue Leads', group: 'Leads' },
  { type: 'lead_status_change', label: 'Status-Änderungen', group: 'Leads' },
  { type: 'lead_assigned', label: 'Lead-Zuweisungen', group: 'Leads' },
  { type: 'appointment_created', label: 'Termin erstellt', group: 'Termine' },
  { type: 'appointment_reminder', label: 'Termin-Erinnerungen', group: 'Termine' },
  { type: 'appointment_cancelled', label: 'Termin gelöscht', group: 'Termine' },
  { type: 'task_created', label: 'Neue Aufgabe', group: 'Aufgaben & Prozesse' },
  { type: 'task_overdue', label: 'Aufgabe überfällig', group: 'Aufgaben & Prozesse' },
  { type: 'process_step_changed', label: 'Prozess-Schritt', group: 'Aufgaben & Prozesse' },
  { type: 'disc_completed', label: 'DISC-Test abgeschlossen', group: 'Weitere' },
  { type: 'insights_completed', label: 'Insights abgeschlossen', group: 'Weitere' },
  { type: 'document_uploaded', label: 'Dokument hochgeladen', group: 'Weitere' },
  { type: 'duplicate_detected', label: 'Duplikat erkannt', group: 'Weitere' },
  { type: 'automation_triggered', label: 'Automatisierung', group: 'Weitere' },
  { type: 'ai_voice_escalation', label: 'AI-Eskalation', group: 'AI Voice Agent' },
  { type: 'ai_voice_callback_requested', label: 'Rückrufwunsch', group: 'AI Voice Agent' },
  { type: 'ai_voice_human_handover', label: 'Mensch-Übergabe', group: 'AI Voice Agent' },
  { type: 'ai_voice_appointment_prepared', label: 'Termin vorbereitet', group: 'AI Voice Agent' },
  { type: 'ai_voice_status_suggested', label: 'Status vorgeschlagen', group: 'AI Voice Agent' },
  { type: 'ai_voice_status_changed', label: 'Status geändert', group: 'AI Voice Agent' },
  { type: 'ai_voice_followup_created', label: 'Follow-up erstellt', group: 'AI Voice Agent' },
  { type: 'ai_voice_problematic_session', label: 'Problematische Session', group: 'AI Voice Agent' },
  { type: 'ai_voice_compliance_flag', label: 'Compliance-Flag', group: 'AI Voice Agent' },
  { type: 'ai_voice_budget_warning', label: 'Budgetwarnung', group: 'AI Voice Agent' },
];

export const NOTIFICATION_GROUPS = ['Leads', 'Termine', 'Aufgaben & Prozesse', 'AI Voice Agent', 'Weitere'];
