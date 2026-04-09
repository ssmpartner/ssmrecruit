import { createContext } from 'react';

export type NotificationType = 
  | 'lead_new' 
  | 'lead_status_change' 
  | 'lead_assigned' 
  | 'appointment_created' 
  | 'appointment_reminder' 
  | 'appointment_cancelled'
  | 'disc_completed'
  | 'automation_triggered'
  | 'duplicate_detected'
  | 'task_created'
  | 'task_overdue'
  | 'insights_completed'
  | 'document_uploaded'
  | 'process_step_changed'
  | 'system'
  // AI Voice Agent types
  | 'ai_voice_escalation'
  | 'ai_voice_callback_requested'
  | 'ai_voice_human_handover'
  | 'ai_voice_appointment_prepared'
  | 'ai_voice_status_suggested'
  | 'ai_voice_status_changed'
  | 'ai_voice_followup_created'
  | 'ai_voice_problematic_session'
  | 'ai_voice_compliance_flag'
  | 'ai_voice_budget_warning';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  leadId?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  leadNew: boolean;
  leadStatusChange: boolean;
  leadAssigned: boolean;
  appointmentCreated: boolean;
  appointmentReminder: boolean;
  appointmentCancelled: boolean;
  discCompleted: boolean;
  automationTriggered: boolean;
  duplicateDetected: boolean;
  taskCreated: boolean;
  taskOverdue: boolean;
  insightsCompleted: boolean;
  documentUploaded: boolean;
  processStepChanged: boolean;
  // AI Voice
  aiVoiceEscalation: boolean;
  aiVoiceCallbackRequested: boolean;
  aiVoiceHumanHandover: boolean;
  aiVoiceAppointmentPrepared: boolean;
  aiVoiceStatusSuggested: boolean;
  aiVoiceStatusChanged: boolean;
  aiVoiceFollowupCreated: boolean;
  aiVoiceProblematicSession: boolean;
  aiVoiceComplianceFlag: boolean;
  aiVoiceBudgetWarning: boolean;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  sound: true,
  leadNew: true,
  leadStatusChange: true,
  leadAssigned: true,
  appointmentCreated: true,
  appointmentReminder: true,
  appointmentCancelled: true,
  discCompleted: true,
  automationTriggered: true,
  duplicateDetected: true,
  taskCreated: true,
  taskOverdue: true,
  insightsCompleted: true,
  documentUploaded: true,
  processStepChanged: true,
  aiVoiceEscalation: true,
  aiVoiceCallbackRequested: true,
  aiVoiceHumanHandover: true,
  aiVoiceAppointmentPrepared: true,
  aiVoiceStatusSuggested: true,
  aiVoiceStatusChanged: true,
  aiVoiceFollowupCreated: true,
  aiVoiceProblematicSession: true,
  aiVoiceComplianceFlag: true,
  aiVoiceBudgetWarning: true,
};

export interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
}

export const NotificationsContext = createContext<NotificationsContextType | null>(null);
