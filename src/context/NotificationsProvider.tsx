import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  NotificationsContext,
  defaultNotificationPreferences,
  type AppNotification,
  type NotificationPreferences,
} from './notifications-context';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Notification types allowed for Controlling role (only their own stage)
const CONTROLLING_ALLOWED_TYPES = new Set([
  'lead_ready_for_controlling',
  'approval_reminder',
  'system',
]);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const { isControlling } = useAuth();

  // Load notifications from DB
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
      if (data) {
        setNotifications(data.map(n => ({
          id: n.id,
          type: n.type as any,
          title: n.title,
          description: n.description,
          leadId: n.lead_id ?? undefined,
          read: n.read,
          createdAt: n.created_at,
        })));
      }
    }
    load();
  }, []);

  // For Controlling: track which leads belong to their scope
  const [controllingLeadIds, setControllingLeadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isControlling) return;
    supabase.from('leads').select('id').eq('status', 'ready_for_controlling')
      .then(({ data }) => {
        if (data) setControllingLeadIds(new Set(data.map(l => l.id)));
      });
  }, [isControlling]);

  // Filter notifications for Controlling role
  const filteredNotifications = useMemo(() => {
    if (!isControlling) return notifications;
    return notifications.filter(n => {
      if (!CONTROLLING_ALLOWED_TYPES.has(n.type)) return false;
      if (n.leadId && !controllingLeadIds.has(n.leadId)) return false;
      return true;
    });
  }, [notifications, isControlling, controllingLeadIds]);

  const unreadCount = useMemo(() => filteredNotifications.filter((n) => !n.read).length, [filteredNotifications]);

  const addNotification = useCallback(
    async (data: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
      if (!preferences.enabled) return;

      const typeMap: Record<string, keyof NotificationPreferences> = {
        lead_new: 'leadNew',
        lead_status_change: 'leadStatusChange',
        lead_assigned: 'leadAssigned',
        appointment_created: 'appointmentCreated',
        appointment_reminder: 'appointmentReminder',
        appointment_cancelled: 'appointmentCancelled',
        disc_completed: 'discCompleted',
        automation_triggered: 'automationTriggered',
        duplicate_detected: 'duplicateDetected',
        task_created: 'taskCreated',
        task_overdue: 'taskOverdue',
        insights_completed: 'insightsCompleted',
        document_uploaded: 'documentUploaded',
        process_step_changed: 'processStepChanged',
        ai_voice_escalation: 'aiVoiceEscalation',
        ai_voice_callback_requested: 'aiVoiceCallbackRequested',
        ai_voice_human_handover: 'aiVoiceHumanHandover',
        ai_voice_appointment_prepared: 'aiVoiceAppointmentPrepared',
        ai_voice_status_suggested: 'aiVoiceStatusSuggested',
        ai_voice_status_changed: 'aiVoiceStatusChanged',
        ai_voice_followup_created: 'aiVoiceFollowupCreated',
        ai_voice_problematic_session: 'aiVoiceProblematicSession',
        ai_voice_compliance_flag: 'aiVoiceComplianceFlag',
        ai_voice_budget_warning: 'aiVoiceBudgetWarning',
      };

      const prefKey = typeMap[data.type];
      if (prefKey && !preferences[prefKey]) return;

      const { data: inserted, error } = await supabase.from('notifications').insert({
        type: data.type,
        title: data.title,
        description: data.description,
        lead_id: data.leadId,
      }).select().single();

      if (inserted && !error) {
        setNotifications((prev) => [{
          id: inserted.id,
          type: inserted.type as any,
          title: inserted.title,
          description: inserted.description,
          leadId: inserted.lead_id ?? undefined,
          read: inserted.read,
          createdAt: inserted.created_at,
        }, ...prev]);
      }
    },
    [preferences],
  );

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).eq('read', false);
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }, []);

  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ notifications: filteredNotifications, unreadCount, preferences, addNotification, markAsRead, markAllAsRead, clearAll, updatePreferences }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
