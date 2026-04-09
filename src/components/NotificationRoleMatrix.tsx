import { useState, useEffect, useCallback } from 'react';
import { Bell, Mail, Save, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

type AppRole = 'superadmin' | 'admin' | 'backoffice' | 'analyst' | 'teamleiter';

interface RoleSetting {
  id: string;
  notification_type: string;
  role: AppRole;
  in_app_enabled: boolean;
  email_enabled: boolean;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' },
  { value: 'backoffice', label: 'Backoffice' },
  { value: 'teamleiter', label: 'Teamleiter' },
  { value: 'analyst', label: 'Analyst' },
];

const NOTIFICATION_TYPES: { type: string; label: string; group: string }[] = [
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
  // AI Voice Agent
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

const GROUPS = ['Leads', 'Termine', 'Aufgaben & Prozesse', 'AI Voice Agent', 'Weitere'];

export default function NotificationRoleMatrix() {
  const { isSuperadmin } = useAuth();
  const [settings, setSettings] = useState<RoleSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notification_role_settings')
      .select('*');
    if (!error && data) {
      setSettings(data as unknown as RoleSetting[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const getSetting = (type: string, role: AppRole) =>
    settings.find(s => s.notification_type === type && s.role === role);

  const toggleValue = (type: string, role: AppRole, field: 'in_app_enabled' | 'email_enabled') => {
    if (!isSuperadmin) return;
    setSettings(prev => prev.map(s =>
      s.notification_type === type && s.role === role
        ? { ...s, [field]: !s[field] }
        : s
    ));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let hasError = false;
    for (const s of settings) {
      const { error } = await supabase
        .from('notification_role_settings')
        .update({
          in_app_enabled: s.in_app_enabled,
          email_enabled: s.email_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', s.id);
      if (error) hasError = true;
    }
    setSaving(false);
    setDirty(false);
    if (hasError) {
      toast.error('Einige Einstellungen konnten nicht gespeichert werden.');
    } else {
      toast.success('Benachrichtigungs-Einstellungen gespeichert.');
    }
  };

  if (!isSuperadmin) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">Zugriff verweigert</h2>
        <p className="text-sm text-muted-foreground mt-1">Nur Superadmins können Benachrichtigungsrollen verwalten.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" /> Benachrichtigungen pro Rolle
          </h2>
          <p className="text-sm text-muted-foreground">
            Legen Sie fest, welche Rollen welche Benachrichtigungen erhalten (In-App & E-Mail).
          </p>
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Speichern
          </button>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-48">Benachrichtigung</th>
              {ROLES.map(r => (
                <th key={r.value} className="text-center py-3 px-2 font-semibold text-muted-foreground" colSpan={2}>
                  <span className="text-xs">{r.label}</span>
                </th>
              ))}
            </tr>
            <tr className="border-b bg-muted/10">
              <th />
              {ROLES.map(r => (
                <th key={r.value} className="text-center" colSpan={1}>
                  {/* Two sub-columns per role */}
                </th>
              ))}
              {/* Render sub-headers */}
            </tr>
            <tr className="border-b bg-muted/10 text-[11px]">
              <th />
              {ROLES.map(r => (
                <>
                  <th key={`${r.value}-app`} className="text-center py-1.5 px-1 text-muted-foreground font-medium">
                    <Bell className="h-3 w-3 mx-auto" />
                  </th>
                  <th key={`${r.value}-email`} className="text-center py-1.5 px-1 text-muted-foreground font-medium">
                    <Mail className="h-3 w-3 mx-auto" />
                  </th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map(group => (
              <>
                <tr key={`group-${group}`} className="bg-muted/20">
                  <td colSpan={1 + ROLES.length * 2} className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {group}
                  </td>
                </tr>
                {NOTIFICATION_TYPES.filter(nt => nt.group === group).map(nt => (
                  <tr key={nt.type} className="border-b hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-4 font-medium">{nt.label}</td>
                    {ROLES.map(r => {
                      const s = getSetting(nt.type, r.value);
                      return (
                        <>
                          <td key={`${nt.type}-${r.value}-app`} className="text-center py-2.5 px-1">
                            <button
                              onClick={() => toggleValue(nt.type, r.value, 'in_app_enabled')}
                              className={`h-5 w-5 rounded border-2 transition-all mx-auto flex items-center justify-center ${
                                s?.in_app_enabled
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                              }`}
                            >
                              {s?.in_app_enabled && <span className="text-[10px] font-bold">✓</span>}
                            </button>
                          </td>
                          <td key={`${nt.type}-${r.value}-email`} className="text-center py-2.5 px-1">
                            <button
                              onClick={() => toggleValue(nt.type, r.value, 'email_enabled')}
                              className={`h-5 w-5 rounded border-2 transition-all mx-auto flex items-center justify-center ${
                                s?.email_enabled
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                              }`}
                            >
                              {s?.email_enabled && <span className="text-[10px] font-bold">✓</span>}
                            </button>
                          </td>
                        </>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-primary flex items-center justify-center text-primary-foreground text-[9px] font-bold">✓</span>
          In-App
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-emerald-600 flex items-center justify-center text-white text-[9px] font-bold">✓</span>
          E-Mail
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded border-2 border-muted-foreground/30" />
          Deaktiviert
        </span>
      </div>
    </div>
  );
}
