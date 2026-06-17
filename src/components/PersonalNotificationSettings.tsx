import { useEffect, useState, useCallback, useMemo } from 'react';
import { Bell, Mail, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { NOTIFICATION_TYPES, NOTIFICATION_GROUPS } from '@/lib/notificationTypes';

type Channel = 'in_app' | 'email';

interface RoleDefault {
  notification_type: string;
  role: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
}

interface PersonalPref {
  notification_type: string;
  in_app_enabled: boolean | null;
  email_enabled: boolean | null;
}

export default function PersonalNotificationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employeeRole, setEmployeeRole] = useState<string | null>(null);
  const [roleDefaults, setRoleDefaults] = useState<RoleDefault[]>([]);
  const [prefs, setPrefs] = useState<Record<string, PersonalPref>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: emp }, { data: defaults }, { data: personal }] = await Promise.all([
      supabase.from('employees').select('role').eq('user_id', user.id).maybeSingle(),
      supabase.from('notification_role_settings').select('notification_type, role, in_app_enabled, email_enabled'),
      supabase.from('employee_notification_prefs').select('notification_type, in_app_enabled, email_enabled').eq('user_id', user.id),
    ]);
    setEmployeeRole((emp as { role?: string } | null)?.role ?? null);
    setRoleDefaults((defaults as RoleDefault[] | null) ?? []);
    const map: Record<string, PersonalPref> = {};
    (personal as PersonalPref[] | null)?.forEach((p) => { map[p.notification_type] = p; });
    setPrefs(map);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const defaultFor = useMemo(() => {
    const lookup = new Map<string, { in_app: boolean; email: boolean }>();
    if (employeeRole) {
      roleDefaults
        .filter((d) => d.role === employeeRole)
        .forEach((d) => lookup.set(d.notification_type, { in_app: d.in_app_enabled, email: d.email_enabled }));
    }
    return (type: string): { in_app: boolean; email: boolean } => lookup.get(type) ?? { in_app: false, email: false };
  }, [roleDefaults, employeeRole]);

  const effectiveValue = (type: string, channel: Channel): boolean => {
    const p = prefs[type];
    const override = p ? (channel === 'email' ? p.email_enabled : p.in_app_enabled) : null;
    if (override !== null && override !== undefined) return override;
    const d = defaultFor(type);
    return channel === 'email' ? d.email : d.in_app;
  };

  const isOverridden = (type: string, channel: Channel): boolean => {
    const p = prefs[type];
    if (!p) return false;
    const v = channel === 'email' ? p.email_enabled : p.in_app_enabled;
    return v !== null && v !== undefined;
  };

  const setOverride = async (type: string, channel: Channel, value: boolean | null) => {
    if (!user?.id) return;
    const key = `${type}:${channel}`;
    setBusy((b) => ({ ...b, [key]: true }));
    const prev = prefs[type];
    const next: PersonalPref = {
      notification_type: type,
      in_app_enabled: channel === 'in_app' ? value : (prev?.in_app_enabled ?? null),
      email_enabled: channel === 'email' ? value : (prev?.email_enabled ?? null),
    };
    // Wenn beide null → Zeile entfernen, sonst upsert
    if (next.in_app_enabled === null && next.email_enabled === null) {
      const { error } = await supabase
        .from('employee_notification_prefs')
        .delete()
        .eq('user_id', user.id)
        .eq('notification_type', type);
      if (!error) {
        setPrefs((p) => { const n = { ...p }; delete n[type]; return n; });
      } else {
        toast.error('Konnte Einstellung nicht zurücksetzen');
      }
    } else {
      const { error } = await supabase
        .from('employee_notification_prefs')
        .upsert(
          { user_id: user.id, notification_type: type, in_app_enabled: next.in_app_enabled, email_enabled: next.email_enabled },
          { onConflict: 'user_id,notification_type' }
        );
      if (!error) {
        setPrefs((p) => ({ ...p, [type]: next }));
      } else {
        toast.error('Konnte Einstellung nicht speichern');
      }
    }
    setBusy((b) => { const n = { ...b }; delete n[key]; return n; });
  };

  const resetType = (type: string) => setOverride(type, 'email', null).then(() => setOverride(type, 'in_app', null));

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Lade Einstellungen…
      </div>
    );
  }

  return (
    <section className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold mb-1">Meine Benachrichtigungen</h3>
        <p className="text-sm text-muted-foreground">
          Standard kommt aus deiner Rolle{employeeRole ? ` (${employeeRole})` : ''}. Du kannst pro Typ einzeln Glocke und E-Mail überschreiben.
        </p>
      </div>

      <div className="px-5 py-3 grid grid-cols-[1fr,80px,80px,40px] gap-3 text-xs uppercase tracking-wide text-muted-foreground bg-muted/30 border-b border-border">
        <div>Benachrichtigung</div>
        <div className="text-center flex items-center justify-center gap-1"><Bell className="w-3 h-3" />In-App</div>
        <div className="text-center flex items-center justify-center gap-1"><Mail className="w-3 h-3" />E-Mail</div>
        <div />
      </div>

      {NOTIFICATION_GROUPS.map((group) => {
        const items = NOTIFICATION_TYPES.filter((t) => t.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <div className="px-5 py-2 text-xs font-semibold text-primary bg-muted/20">{group}</div>
            {items.map((item) => {
              const inAppEff = effectiveValue(item.type, 'in_app');
              const emailEff = effectiveValue(item.type, 'email');
              const anyOverride = isOverridden(item.type, 'in_app') || isOverridden(item.type, 'email');
              return (
                <div key={item.type} className="px-5 py-3 grid grid-cols-[1fr,80px,80px,40px] gap-3 items-center border-b border-border last:border-b-0">
                  <div className="text-sm">
                    {item.label}
                    {anyOverride && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-primary/70">eigene Einstellung</span>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={inAppEff}
                      onCheckedChange={(v) => setOverride(item.type, 'in_app', v)}
                      disabled={busy[`${item.type}:in_app`]}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={emailEff}
                      onCheckedChange={(v) => setOverride(item.type, 'email', v)}
                      disabled={busy[`${item.type}:email`]}
                    />
                  </div>
                  <div className="flex justify-center">
                    {anyOverride ? (
                      <button
                        onClick={() => resetType(item.type)}
                        title="Auf Rollen-Standard zurücksetzen"
                        className="text-muted-foreground hover:text-foreground p-1 rounded"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
