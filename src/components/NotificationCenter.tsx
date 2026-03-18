import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, UserPlus, CalendarDays, ArrowRightLeft, Brain, Zap, Info, X, Copy } from 'lucide-react';
import { useNotifications } from '@/context/useNotifications';
import { type NotificationType } from '@/context/notifications-context';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string }> = {
  lead_new: { icon: UserPlus, color: 'text-blue-500 bg-blue-500/10' },
  lead_status_change: { icon: ArrowRightLeft, color: 'text-amber-500 bg-amber-500/10' },
  lead_assigned: { icon: UserPlus, color: 'text-violet-500 bg-violet-500/10' },
  appointment_created: { icon: CalendarDays, color: 'text-emerald-500 bg-emerald-500/10' },
  appointment_reminder: { icon: Bell, color: 'text-orange-500 bg-orange-500/10' },
  appointment_cancelled: { icon: X, color: 'text-red-500 bg-red-500/10' },
  disc_completed: { icon: Brain, color: 'text-pink-500 bg-pink-500/10' },
  automation_triggered: { icon: Zap, color: 'text-yellow-500 bg-yellow-500/10' },
  system: { icon: Info, color: 'text-muted-foreground bg-muted' },
};

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 w-96 rounded-xl border bg-card shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">Benachrichtigungen</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1"
                    title="Alle als gelesen markieren"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Alle gelesen
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Alle löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm font-medium">Keine Benachrichtigungen</p>
                  <p className="text-xs">Sie sind auf dem neuesten Stand!</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const config = typeConfig[notification.type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 border-b last:border-0 ${
                        !notification.read ? 'bg-primary/[0.03]' : ''
                      }`}
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: de })}
                        </p>
                      </div>
                      {!notification.read && (
                        <Check className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-1" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
