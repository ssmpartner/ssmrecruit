import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  NotificationsContext,
  defaultNotificationPreferences,
  type AppNotification,
  type NotificationPreferences,
} from './notifications-context';
import { supabase } from '@/integrations/supabase/client';

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);

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

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

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
      value={{ notifications, unreadCount, preferences, addNotification, markAsRead, markAllAsRead, clearAll, updatePreferences }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
