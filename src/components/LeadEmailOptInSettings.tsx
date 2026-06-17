import { useEffect, useState, useCallback } from 'react';
import { Loader2, Mail, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  user_id: string | null;
  agency_id: string;
}

interface PrefRow {
  user_id: string;
  notify_new_lead_email: boolean;
}

export default function LeadEmailOptInSettings() {
  const { user, isSuperadmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingSelf, setSavingSelf] = useState(false);
  const [selfEnabled, setSelfEnabled] = useState(false);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prefsData }, empRes] = await Promise.all([
      supabase.from('employee_notification_prefs').select('user_id, notify_new_lead_email'),
      isSuperadmin
        ? supabase.from('employees').select('id, name, email, user_id, agency_id').order('name')
        : Promise.resolve({ data: [] as EmployeeRow[] }),
    ]);
    const map: Record<string, boolean> = {};
    (prefsData as PrefRow[] | null)?.forEach((p) => { map[p.user_id] = p.notify_new_lead_email; });
    setPrefs(map);
    if (user?.id) setSelfEnabled(!!map[user.id]);
    setEmployees(((empRes.data as EmployeeRow[] | null) ?? []).filter((e) => e.user_id));
    setLoading(false);
  }, [isSuperadmin, user?.id]);

  useEffect(() => { load(); }, [load]);

  const upsertPref = async (userId: string, value: boolean) => {
    const { error } = await supabase
      .from('employee_notification_prefs')
      .upsert({ user_id: userId, notify_new_lead_email: value }, { onConflict: 'user_id' });
    return error;
  };

  const handleSelfToggle = async (value: boolean) => {
    if (!user?.id) return;
    setSavingSelf(true);
    const prev = selfEnabled;
    setSelfEnabled(value);
    const error = await upsertPref(user.id, value);
    setSavingSelf(false);
    if (error) {
      setSelfEnabled(prev);
      toast.error('Konnte Einstellung nicht speichern');
    } else {
      toast.success(value ? 'E-Mail-Benachrichtigung aktiviert' : 'E-Mail-Benachrichtigung deaktiviert');
      setPrefs((p) => ({ ...p, [user.id]: value }));
    }
  };

  const handleAdminToggle = async (userId: string, value: boolean) => {
    setPending((p) => ({ ...p, [userId]: true }));
    const prev = !!prefs[userId];
    setPrefs((p) => ({ ...p, [userId]: value }));
    const error = await upsertPref(userId, value);
    setPending((p) => { const n = { ...p }; delete n[userId]; return n; });
    if (error) {
      setPrefs((p) => ({ ...p, [userId]: prev }));
      toast.error('Konnte Einstellung nicht speichern');
    }
  };

  const bulkSet = async (value: boolean) => {
    if (!isSuperadmin) return;
    const targets = employees.filter((e) => e.user_id);
    const rows = targets.map((e) => ({ user_id: e.user_id as string, notify_new_lead_email: value }));
    const { error } = await supabase
      .from('employee_notification_prefs')
      .upsert(rows, { onConflict: 'user_id' });
    if (error) {
      toast.error('Massenaktion fehlgeschlagen');
      return;
    }
    const next: Record<string, boolean> = { ...prefs };
    targets.forEach((e) => { if (e.user_id) next[e.user_id] = value; });
    setPrefs(next);
    if (user?.id && user.id in next) setSelfEnabled(next[user.id]);
    toast.success(value ? 'Für alle aktiviert' : 'Für alle deaktiviert');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Lade Einstellungen…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Persönliche Einstellung */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">E-Mail bei neuem Lead</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Erhalte eine E-Mail-Benachrichtigung, sobald ein neuer Lead im System eingeht.
            </p>
            <div className="flex items-center gap-3">
              <Switch
                checked={selfEnabled}
                onCheckedChange={handleSelfToggle}
                disabled={savingSelf || !user?.id}
              />
              <span className="text-sm">{selfEnabled ? 'Aktiviert' : 'Deaktiviert'}</span>
              {savingSelf && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </div>
      </section>

      {/* Superadmin: Übersicht & Massenaktion */}
      {isSuperadmin && (
        <section className="border border-border rounded-lg p-5 bg-card">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Empfänger verwalten (Superadmin)</h3>
              <p className="text-sm text-muted-foreground">
                Aktiviere oder deaktiviere die Lead-Benachrichtigung für einzelne Mitarbeiter.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => bulkSet(true)}
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
              >
                Alle aktivieren
              </button>
              <button
                onClick={() => bulkSet(false)}
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
              >
                Alle deaktivieren
              </button>
            </div>
          </div>

          <div className="divide-y divide-border border border-border rounded-md">
            {employees.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Keine Mitarbeiter mit Account gefunden.</div>
            )}
            {employees.map((e) => {
              const uid = e.user_id as string;
              const enabled = !!prefs[uid];
              return (
                <div key={e.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-sm font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pending[uid] && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => handleAdminToggle(uid, v)}
                      disabled={!!pending[uid]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
