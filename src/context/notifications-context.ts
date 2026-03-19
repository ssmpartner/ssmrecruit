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
  | 'system';

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
