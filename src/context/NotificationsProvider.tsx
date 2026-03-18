import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  NotificationsContext,
  defaultNotificationPreferences,
  type AppNotification,
  type NotificationPreferences,
} from './notifications-context';

function seedNotifications(): AppNotification[] {
  const now = Date.now();
  return [
    { id: 'n1', type: 'lead_new', title: 'Neuer Lead eingegangen', description: 'Lukas Müller wurde über Meta Ads erfasst.', leadId: 'l1', read: false, createdAt: new Date(now - 1000 * 60 * 5).toISOString() },
    { id: 'n2', type: 'appointment_created', title: 'Termin erstellt', description: 'Video-Call mit Anna Meier am 20.03.2026 um 14:00.', leadId: 'l2', read: false, createdAt: new Date(now - 1000 * 60 * 30).toISOString() },
    { id: 'n3', type: 'lead_status_change', title: 'Status geändert', description: 'Thomas Schneider wurde auf "Gespräch 1" gesetzt.', leadId: 'l3', read: false, createdAt: new Date(now - 1000 * 60 * 60).toISOString() },
    { id: 'n4', type: 'disc_completed', title: 'DISC-Test abgeschlossen', description: 'Laura Fischer hat den Persönlichkeitstest abgeschlossen (Typ: I).', leadId: 'l4', read: true, createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString() },
    { id: 'n5', type: 'system', title: 'Willkommen bei RecruitFlow', description: 'Ihr Benachrichtigungscenter ist aktiv. Konfigurieren Sie Ihre Präferenzen in den Einstellungen.', read: true, createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString() },
  ];
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const addNotification = useCallback(
    (data: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
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

      setNotifications((prev) => [
        {
          ...data,
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    [preferences],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
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
