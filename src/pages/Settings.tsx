import { useState, useEffect, useCallback } from 'react';
import { Globe, Zap, Key, CheckCircle2, XCircle, Save, ExternalLink, UserPlus, Shield, Trash2, Mail, MessageSquare, Phone, Video, Clock, Monitor, Mic, MicOff, VideoOff, Camera, ScreenShare, MessageCircle, LayoutGrid, Bell, Send, Settings2, Link2, Brain, RefreshCw, FileText, Lock, Users, CalendarDays, Plug, Copy, Code2, ChevronDown, LogOut, Loader2, Tag, Plus, Pencil, GripVertical, ClipboardList, Target, Wand2, MapPin } from 'lucide-react';
import EmailSettingsTab from '@/components/EmailSettingsTab';
import ProfileSettings from '@/components/ProfileSettings';
import WizardsTab from '@/components/WizardsTab';
import { useToast } from '@/hooks/use-toast';
import { useLeads } from '@/context/useLeads';
import { useNotifications } from '@/context/useNotifications';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { type NotificationMethod } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type SystemRole = 'superadmin' | 'admin' | 'backoffice' | 'analyst' | 'teamleiter';

const roleConfig: Record<SystemRole, { label: string; color: string; description: string }> = {
  superadmin: { label: 'Superadmin', color: 'bg-destructive text-destructive-foreground', description: 'Vollzugriff – kann alles verwalten inkl. Benutzer & Einstellungen' },
  admin: { label: 'Admin', color: 'bg-primary text-primary-foreground', description: 'Kann Leads, Mitarbeiter & Agenturen verwalten' },
  teamleiter: { label: 'Teamleiter', color: 'bg-emerald-600 text-white', description: 'Eigene Leads bearbeiten, Pipeline, Aufgaben, Kalender & Statistik' },
  backoffice: { label: 'Backoffice', color: 'bg-warning text-warning-foreground', description: 'Kann Leads bearbeiten, zuweisen und Status ändern' },
  analyst: { label: 'Analyst', color: 'bg-info text-info-foreground', description: 'Nur Lesezugriff auf Dashboard & Analytics' },
};

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  method: 'zapier' | 'api' | 'none';
  zapierWebhook: string;
  apiKey: string;
  connected: boolean;
}


function ToggleRow({ label, description, checked, onChange, icon }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}>
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

type SettingsTab = 'profile' | 'notifications' | 'users' | 'sources' | 'appointments' | 'insights' | 'wizards' | 'email' | 'integrations' | 'api';

const tabs: { id: SettingsTab; label: string; icon: typeof Bell; desc: string }[] = [
  { id: 'profile', label: 'Mein Profil', icon: Shield, desc: 'Name, E-Mail & Passwort' },
  { id: 'notifications', label: 'Benachrichtigungen', icon: Bell, desc: 'In-App Alerts konfigurieren' },
  { id: 'users', label: 'Benutzer', icon: Users, desc: 'Rollen & Zugriffsrechte' },
  { id: 'sources', label: 'Lead-Quellen', icon: Tag, desc: 'Quellen verwalten & anpassen' },
  { id: 'appointments', label: 'Termine & Video', icon: CalendarDays, desc: 'Terminplanung & Video-Calls' },
  { id: 'insights', label: 'Insights / DISC', icon: Brain, desc: 'Persönlichkeitstest-Einstellungen' },
  { id: 'wizards', label: 'Wizards', icon: Wand2, desc: 'Wizard-Abläufe verwalten' },
  { id: 'email', label: 'E-Mail Automationen', icon: Mail, desc: 'Templates & Regeln verwalten' },
  { id: 'integrations', label: 'Integrationen', icon: Plug, desc: 'Lead-Quellen & Webhooks' },
  { id: 'api', label: 'API-Schlüssel', icon: Key, desc: 'API-Keys generieren & verwalten' },
];

export default function Settings() {
  const { toast } = useToast();
  const { appointmentSettings, updateAppointmentSettings, insightsSettings, updateInsightsSettings } = useLeads();
  const { preferences: notifPrefs, updatePreferences: updateNotifPrefs } = useNotifications();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  // Load integrations from DB
  const loadIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    const { data, error } = await supabase.from('integrations').select('*');
    if (!error && data) {
      setIntegrations(data.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        method: row.method as 'zapier' | 'api' | 'none',
        zapierWebhook: row.zapier_webhook,
        apiKey: row.api_key,
        connected: row.connected,
      })));
    }
    setIntegrationsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'integrations') {
      loadIntegrations();
    }
  }, [activeTab, loadIntegrations]);

  const updateIntegration = (id: string, updates: Partial<Integration>) => {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const saveIntegration = async (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;
    if (integration.method === 'zapier' && !integration.zapierWebhook.trim()) {
      toast({ title: 'Fehler', description: 'Bitte Zapier Webhook-URL eingeben', variant: 'destructive' });
      return;
    }
    if (integration.method === 'api' && !integration.apiKey.trim()) {
      toast({ title: 'Fehler', description: 'Bitte API-Schlüssel eingeben', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('integrations').update({
      method: integration.method,
      zapier_webhook: integration.zapierWebhook,
      api_key: integration.apiKey,
      connected: true,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) {
      toast({ title: 'Fehler', description: 'Konnte nicht gespeichert werden', variant: 'destructive' });
      return;
    }
    updateIntegration(id, { connected: true });
    toast({ title: 'Integration gespeichert', description: `${integration.name} wurde erfolgreich verbunden.` });
  };

  const disconnectIntegration = async (id: string) => {
    const { error } = await supabase.from('integrations').update({
      connected: false,
      method: 'none',
      zapier_webhook: '',
      api_key: '',
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) {
      toast({ title: 'Fehler', description: 'Konnte nicht getrennt werden', variant: 'destructive' });
      return;
    }
    updateIntegration(id, { connected: false, method: 'none', zapierWebhook: '', apiKey: '' });
    toast({ title: 'Getrennt', description: 'Integration wurde entfernt.' });
  };

  const testWebhook = async (integration: Integration) => {
    if (!integration.zapierWebhook.trim()) {
      toast({ title: 'Fehler', description: 'Keine Webhook-URL konfiguriert', variant: 'destructive' });
      return;
    }
    try {
      await fetch(integration.zapierWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({ test: true, source: integration.id, timestamp: new Date().toISOString(), triggered_from: window.location.origin, lead: { name: 'Test Lead', email: 'test@example.com', phone: '+41 44 000 00 00', source: integration.id } }),
      });
      toast({ title: 'Test gesendet', description: 'Prüfen Sie Ihren Zap-Verlauf, ob er ausgelöst wurde.' });
    } catch {
      toast({ title: 'Fehler', description: 'Test fehlgeschlagen. Prüfen Sie die Webhook-URL.', variant: 'destructive' });
    }
  };

  const { isSuperadmin } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">System konfigurieren und verwalten</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <nav className="w-56 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                <div>
                  <p className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-2xl space-y-6">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'notifications' && <NotificationsTab notifPrefs={notifPrefs} updateNotifPrefs={updateNotifPrefs} toast={toast} />}
          {activeTab === 'users' && <UsersTab isSuperadmin={isSuperadmin} />}
          {activeTab === 'sources' && <LeadSourcesTab isSuperadmin={isSuperadmin} />}
          {activeTab === 'appointments' && <AppointmentsTab appointmentSettings={appointmentSettings} updateAppointmentSettings={updateAppointmentSettings} toast={toast} />}
          {activeTab === 'insights' && <InsightsTab insightsSettings={insightsSettings} updateInsightsSettings={updateInsightsSettings} toast={toast} />}
          {activeTab === 'wizards' && <WizardsTab />}
          {activeTab === 'email' && <EmailSettingsTab />}
          {activeTab === 'integrations' && (
            <IntegrationsTab
              integrations={integrations}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              updateIntegration={updateIntegration}
              saveIntegration={saveIntegration}
              disconnectIntegration={disconnectIntegration}
              testWebhook={testWebhook}
              toast={toast}
            />
          )}
          {activeTab === 'api' && <ApiKeysTab toast={toast} />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function NotificationsTab({ notifPrefs, updateNotifPrefs, toast }: any) {
  return (
    <>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Bell className="h-5 w-5" /> Benachrichtigungen</h2>
        <p className="text-sm text-muted-foreground">Konfigurieren Sie, welche Benachrichtigungen Sie erhalten möchten.</p>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Settings2 className="h-4 w-4 text-muted-foreground" /> Allgemein</h3>
        <ToggleRow label="Benachrichtigungen aktiviert" description="Master-Schalter für alle In-App-Benachrichtigungen"
          checked={notifPrefs.enabled} onChange={(v: boolean) => { updateNotifPrefs({ enabled: v }); toast({ title: v ? 'Benachrichtigungen aktiviert' : 'Benachrichtigungen deaktiviert' }); }}
          icon={<Bell className="h-4 w-4" />} />
        <ToggleRow label="Benachrichtigungston" description="Akustisches Signal bei neuen Benachrichtigungen"
          checked={notifPrefs.sound} onChange={(v: boolean) => { updateNotifPrefs({ sound: v }); toast({ title: 'Gespeichert' }); }} />
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Lead-Benachrichtigungen</h3>
        <ToggleRow label="Neue Leads" description="Benachrichtigung bei neuen Lead-Eingängen"
          checked={notifPrefs.leadNew} onChange={(v: boolean) => { updateNotifPrefs({ leadNew: v }); toast({ title: 'Gespeichert' }); }} />
        <ToggleRow label="Status-Änderungen" description="Benachrichtigung bei Lead-Status-Wechseln"
          checked={notifPrefs.leadStatusChange} onChange={(v: boolean) => { updateNotifPrefs({ leadStatusChange: v }); toast({ title: 'Gespeichert' }); }} />
        <ToggleRow label="Lead-Zuweisungen" description="Benachrichtigung wenn Leads zugewiesen werden"
          checked={notifPrefs.leadAssigned} onChange={(v: boolean) => { updateNotifPrefs({ leadAssigned: v }); toast({ title: 'Gespeichert' }); }} />
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Termin-Benachrichtigungen</h3>
        <ToggleRow label="Termin erstellt" description="Benachrichtigung bei neuen Terminen"
          checked={notifPrefs.appointmentCreated} onChange={(v: boolean) => { updateNotifPrefs({ appointmentCreated: v }); toast({ title: 'Gespeichert' }); }} />
        <ToggleRow label="Termin-Erinnerungen" description="Erinnerungen vor anstehenden Terminen"
          checked={notifPrefs.appointmentReminder} onChange={(v: boolean) => { updateNotifPrefs({ appointmentReminder: v }); toast({ title: 'Gespeichert' }); }} />
        <ToggleRow label="Termin gelöscht" description="Benachrichtigung wenn Termine entfernt werden"
          checked={notifPrefs.appointmentCancelled} onChange={(v: boolean) => { updateNotifPrefs({ appointmentCancelled: v }); toast({ title: 'Gespeichert' }); }} />
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Aufgaben & Prozesse</h3>
        <ToggleRow label="Neue Aufgabe erstellt" description="Benachrichtigung wenn eine neue Aufgabe zugewiesen wird"
          checked={notifPrefs.taskCreated} onChange={(v: boolean) => { updateNotifPrefs({ taskCreated: v }); toast({ title: 'Gespeichert' }); }}
          icon={<ClipboardList className="h-4 w-4" />} />
        <ToggleRow label="Aufgabe überfällig" description="Benachrichtigung wenn eine Aufgabe das Fälligkeitsdatum überschreitet"
          checked={notifPrefs.taskOverdue} onChange={(v: boolean) => { updateNotifPrefs({ taskOverdue: v }); toast({ title: 'Gespeichert' }); }} />
        <ToggleRow label="Prozess-Schritt geändert" description="Benachrichtigung wenn ein Lead in eine neue Prozessphase wechselt"
          checked={notifPrefs.processStepChanged} onChange={(v: boolean) => { updateNotifPrefs({ processStepChanged: v }); toast({ title: 'Gespeichert' }); }} />
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Weitere Benachrichtigungen</h3>
        <ToggleRow label="DISC-Test abgeschlossen" description="Benachrichtigung wenn ein Kandidat den Persönlichkeitstest abschliesst"
          checked={notifPrefs.discCompleted} onChange={(v: boolean) => { updateNotifPrefs({ discCompleted: v }); toast({ title: 'Gespeichert' }); }}
          icon={<Brain className="h-4 w-4" />} />
        <ToggleRow label="Insights-Formular abgeschlossen" description="Benachrichtigung wenn ein Kandidat das Insights-Formular ausfüllt"
          checked={notifPrefs.insightsCompleted} onChange={(v: boolean) => { updateNotifPrefs({ insightsCompleted: v }); toast({ title: 'Gespeichert' }); }} />
        <ToggleRow label="Dokument hochgeladen" description="Benachrichtigung wenn ein Kandidat Dokumente über den Upload-Link einreicht"
          checked={notifPrefs.documentUploaded} onChange={(v: boolean) => { updateNotifPrefs({ documentUploaded: v }); toast({ title: 'Gespeichert' }); }} />
        <ToggleRow label="Duplikat erkannt" description="Benachrichtigung wenn ein mögliches Duplikat erkannt wird"
          checked={notifPrefs.duplicateDetected} onChange={(v: boolean) => { updateNotifPrefs({ duplicateDetected: v }); toast({ title: 'Gespeichert' }); }} />
        <ToggleRow label="Automatisierungen" description="Benachrichtigung wenn eine Automatisierung ausgelöst wird"
          checked={notifPrefs.automationTriggered} onChange={(v: boolean) => { updateNotifPrefs({ automationTriggered: v }); toast({ title: 'Gespeichert' }); }} />
      </div>
    </>
  );
}

function UsersTab({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'backoffice' as SystemRole });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'list' },
    });
    if (error) {
      toast({ title: 'Fehler', description: 'Benutzer konnten nicht geladen werden', variant: 'destructive' });
    } else {
      setUsers(data.users || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast({ title: 'Fehler', description: 'Bitte alle Felder ausfüllen', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'create', email: form.email.trim(), password: form.password, display_name: form.name.trim(), role: form.role },
    });
    setSaving(false);
    if (error || data?.error) {
      toast({ title: 'Fehler', description: data?.error || 'Benutzer konnte nicht erstellt werden', variant: 'destructive' });
    } else {
      toast({ title: 'Benutzer erstellt', description: `${form.name} wurde als ${roleConfig[form.role].label} hinzugefügt.` });
      setForm({ name: '', email: '', password: '', role: 'backoffice' });
      setDialogOpen(false);
      loadUsers();
    }
  };

  const handleChangeRole = async (userId: string, newRole: SystemRole) => {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'update_role', user_id: userId, role: newRole },
    });
    if (error || data?.error) {
      toast({ title: 'Fehler', description: data?.error || 'Rolle konnte nicht geändert werden', variant: 'destructive' });
      loadUsers();
    } else {
      toast({ title: 'Rolle geändert', description: `Rolle wurde zu ${roleConfig[newRole].label} geändert.` });
      loadUsers();
    }
  };

  const handleDelete = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'delete', user_id: userId },
    });
    if (error || data?.error) {
      toast({ title: 'Fehler', description: data?.error || 'Benutzer konnte nicht gelöscht werden', variant: 'destructive' });
    } else {
      toast({ title: 'Entfernt', description: 'Benutzer wurde entfernt.' });
      loadUsers();
    }
  };

  if (!isSuperadmin) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">Zugriff verweigert</h2>
        <p className="text-sm text-muted-foreground mt-1">Nur Superadmins können Benutzer verwalten.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Benutzerverwaltung</h2>
          <p className="text-sm text-muted-foreground">Benutzer und Rollen verwalten</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              <UserPlus className="h-4 w-4" /> Hinzufügen
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neuen Benutzer hinzufügen</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="z.B. Max Mustermann" className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">E-Mail</label>
                <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="z.B. max@firma.ch" className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Passwort</label>
                <input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mindestens 8 Zeichen" className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Rolle</label>
                <select value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value as SystemRole }))}
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                  {Object.entries(roleConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">{roleConfig[form.role].description}</p>
              </div>
              <button onClick={handleCreate} disabled={saving || !form.name.trim() || !form.email.trim() || !form.password}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Benutzer erstellen
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(roleConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${cfg.color}`} />
            <span className="text-xs font-medium">{cfg.label}</span>
            <span className="text-xs text-muted-foreground">– {cfg.description}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Benutzer</th>
                <th className="px-5 py-3 font-medium">Rolle</th>
                <th className="px-5 py-3 font-medium">Hinzugefügt</th>
                <th className="px-5 py-3 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => {
                const role = (u.role || 'analyst') as SystemRole;
                const cfg = roleConfig[role];
                const initials = (u.display_name || u.email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">{initials}</div>
                        <div>
                          <p className="font-medium">{u.display_name}{isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(Sie)</span>}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select value={role} onChange={(e) => handleChangeRole(u.id, e.target.value as SystemRole)}
                        disabled={isSelf}
                        className="h-8 rounded-lg border bg-background px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">
                        {Object.entries(roleConfig).map(([key, c]) => (
                          <option key={key} value={key}>{c.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString('de-DE')}</td>
                    <td className="px-5 py-3">
                      {!isSelf && (
                        <button onClick={() => handleDelete(u.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Benutzer entfernen">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

const SOURCE_ICONS = [
  { value: 'Globe', label: 'Webseite' },
  { value: 'Music', label: 'TikTok' },
  { value: 'Facebook', label: 'Facebook/Meta' },
  { value: 'Linkedin', label: 'LinkedIn' },
  { value: 'FileSpreadsheet', label: 'Tabelle/CSV' },
  { value: 'Mail', label: 'E-Mail' },
  { value: 'Phone', label: 'Telefon' },
  { value: 'MessageSquare', label: 'Chat' },
  { value: 'Tag', label: 'Allgemein' },
];

function LeadSourcesTab({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { toast } = useToast();
  const { leadSources, reloadLeadSources } = useLeads();
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('Globe');
  const [editColor, setEditColor] = useState('#6B7280');
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('Globe');
  const [newColor, setNewColor] = useState('#22C55E');
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  if (!isSuperadmin) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">Zugriff verweigert</h2>
        <p className="text-sm text-muted-foreground mt-1">Nur Superadmins können Lead-Quellen verwalten.</p>
      </div>
    );
  }

  const startEdit = (source: typeof leadSources[0]) => {
    setEditId(source.id);
    setEditLabel(source.label);
    setEditIcon(source.icon);
    setEditColor(source.color);
  };

  const cancelEdit = () => { setEditId(null); setEditLabel(''); setEditIcon('Globe'); setEditColor('#6B7280'); };

  const saveEdit = async () => {
    if (!editId || !editLabel.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('lead_sources').update({
      label: editLabel.trim(),
      icon: editIcon,
      color: editColor,
    }).eq('id', editId);
    setSaving(false);
    if (error) {
      toast({ title: 'Fehler', description: 'Konnte nicht gespeichert werden', variant: 'destructive' });
      return;
    }
    toast({ title: 'Gespeichert', description: `Quelle "${editLabel.trim()}" wurde aktualisiert.` });
    cancelEdit();
    reloadLeadSources();
  };

  const handleAdd = async () => {
    const id = newId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!id || !newLabel.trim()) {
      toast({ title: 'Fehler', description: 'ID und Label sind erforderlich', variant: 'destructive' });
      return;
    }
    if (leadSources.some(s => s.id === id)) {
      toast({ title: 'Fehler', description: 'Diese ID existiert bereits', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('lead_sources').insert({
      id,
      label: newLabel.trim(),
      icon: newIcon,
      color: newColor,
      sort_order: leadSources.length + 1,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Fehler', description: 'Konnte nicht erstellt werden', variant: 'destructive' });
      return;
    }
    toast({ title: 'Erstellt', description: `Quelle "${newLabel.trim()}" wurde hinzugefügt.` });
    setNewId(''); setNewLabel(''); setNewIcon('Globe'); setNewColor('#22C55E'); setShowAdd(false);
    reloadLeadSources();
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from('lead_sources').delete().eq('id', id);
    setSaving(false);
    if (error) {
      toast({ title: 'Fehler', description: 'Konnte nicht gelöscht werden. Möglicherweise wird die Quelle noch verwendet.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Gelöscht', description: 'Quelle wurde entfernt.' });
    reloadLeadSources();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Tag className="h-5 w-5" /> Lead-Quellen</h2>
          <p className="text-sm text-muted-foreground">Quellen verwalten, die bei Leads zugewiesen werden können.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Neue Quelle
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold">Neue Quelle hinzufügen</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">ID (eindeutig)</label>
              <input value={newId} onChange={e => setNewId(e.target.value)}
                placeholder="z.B. google_ads"
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Anzeigename</label>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="z.B. Google Ads"
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Icon</label>
              <select value={newIcon} onChange={e => setNewIcon(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                {SOURCE_ICONS.map(ic => <option key={ic.value} value={ic.value}>{ic.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Farbe</label>
              <div className="mt-1 flex items-center gap-2">
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                  className="h-9 w-12 rounded-lg border bg-background cursor-pointer" />
                <input value={newColor} onChange={e => setNewColor(e.target.value)}
                  className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !newId.trim() || !newLabel.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Hinzufügen
            </button>
            <button onClick={() => { setShowAdd(false); setNewId(''); setNewLabel(''); }}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-5 py-3 font-medium">Quelle</th>
              <th className="px-5 py-3 font-medium">ID</th>
              <th className="px-5 py-3 font-medium">Farbe</th>
              <th className="px-5 py-3 font-medium">Icon</th>
              <th className="px-5 py-3 font-medium w-32">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {leadSources.map(source => (
              <tr key={source.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-5 py-3">
                  {editId === source.id ? (
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                      className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  ) : (
                    <span className="font-medium">{source.label}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{source.id}</td>
                <td className="px-5 py-3">
                  {editId === source.id ? (
                    <div className="flex items-center gap-2">
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                        className="h-8 w-10 rounded border bg-background cursor-pointer" />
                      <input value={editColor} onChange={e => setEditColor(e.target.value)}
                        className="h-8 w-24 rounded-lg border bg-background px-2 text-xs font-mono outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: source.color }} />
                      <span className="text-xs text-muted-foreground font-mono">{source.color}</span>
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">
                  {editId === source.id ? (
                    <select value={editIcon} onChange={e => setEditIcon(e.target.value)}
                      className="h-8 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
                      {SOURCE_ICONS.map(ic => <option key={ic.value} value={ic.value}>{ic.label}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground">{SOURCE_ICONS.find(i => i.value === source.icon)?.label || source.icon}</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    {editId === source.id ? (
                      <>
                        <button onClick={saveEdit} disabled={saving}
                          className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors" title="Speichern">
                          <Save className="h-4 w-4" />
                        </button>
                        <button onClick={cancelEdit}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors" title="Abbrechen">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(source)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Bearbeiten">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(source.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Löschen">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {leadSources.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Keine Quellen konfiguriert.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground">
          <strong>Tipp:</strong> Verwenden Sie die Bulk-Aktionen in der Leads-Übersicht, um die Quelle mehrerer Leads gleichzeitig zu ändern. Wählen Sie dazu die gewünschten Leads aus und klicken Sie auf «Quelle ändern».
        </p>
      </div>
    </>
  );
}

function AppointmentsTab({ appointmentSettings, updateAppointmentSettings, toast }: any) {
  return (
    <>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Termine & Video-Telefonie</h2>
        <p className="text-sm text-muted-foreground">Terminplanung, Video-Call-Anbieter und Benachrichtigungsversand.</p>
      </div>

      {/* Standard-Termineinstellungen */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Standard-Termineinstellungen</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Standard-Dauer</label>
            <select value={appointmentSettings.defaultDuration}
              onChange={(e: any) => { updateAppointmentSettings({ defaultDuration: Number(e.target.value) }); toast({ title: 'Gespeichert' }); }}
              className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value={15}>15 Minuten</option><option value={30}>30 Minuten</option><option value={45}>45 Minuten</option><option value={60}>60 Minuten</option><option value={90}>90 Minuten</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Standard-Art</label>
            <select value={appointmentSettings.defaultType}
              onChange={(e: any) => { updateAppointmentSettings({ defaultType: e.target.value }); toast({ title: 'Gespeichert' }); }}
              className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="phone">Telefon</option><option value="video">Video-Call</option><option value="onsite">Vor Ort</option>
            </select>
          </div>
        </div>
        <ToggleRow label="Status automatisch auf «Terminiert» setzen" description="Setzt den Lead-Status automatisch auf «Terminiert» wenn ein Termin erstellt wird"
          checked={appointmentSettings.autoStatusChange} onChange={(v: boolean) => updateAppointmentSettings({ autoStatusChange: v })} />
      </div>

      {/* Video-Anbieter */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Video className="h-4 w-4 text-muted-foreground" /> Video-Anbieter</h3>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'jitsi' as const, label: 'Jitsi Meet (Kostenlos)', desc: 'Kein Account nötig, Open Source' },
            { value: 'custom' as const, label: 'Eigener Server', desc: 'Eigene Jitsi-Instanz verwenden' },
          ]).map(opt => (
            <button key={opt.value}
              onClick={() => { updateAppointmentSettings({ videoProvider: opt.value }); toast({ title: 'Gespeichert' }); }}
              className={`rounded-xl border p-4 text-left transition-colors ${appointmentSettings.videoProvider === opt.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
              <span className="text-sm font-semibold">{opt.label}</span>
              {appointmentSettings.videoProvider === opt.value && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Aktiv</span>}
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
        {appointmentSettings.videoProvider === 'custom' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Server-URL</label>
            <div className="flex gap-2 mt-1">
              <input value={appointmentSettings.customVideoBaseUrl} onChange={(e: any) => updateAppointmentSettings({ customVideoBaseUrl: e.target.value })}
                placeholder="https://meet.ihr-server.ch" className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={() => toast({ title: 'Gespeichert', description: 'Server-URL aktualisiert' })}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"><Save className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Anzeigename im Call</label>
          <input value={appointmentSettings.displayName} onChange={(e: any) => updateAppointmentSettings({ displayName: e.target.value })}
            placeholder="z.B. Firma AG – Recruiting" className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* Video-Call Verhalten */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Monitor className="h-4 w-4 text-muted-foreground" /> Video-Call Verhalten</h3>
        <ToggleRow label="Vorraum (Prejoin) anzeigen" description="Zeigt eine Vorschau bevor man dem Call beitritt"
          checked={appointmentSettings.prejoinEnabled} onChange={(v: boolean) => updateAppointmentSettings({ prejoinEnabled: v })} />
        <ToggleRow label="Mikrofon stumm starten" description="Mikrofon beim Beitritt standardmässig stumm"
          checked={appointmentSettings.startWithAudioMuted} onChange={(v: boolean) => updateAppointmentSettings({ startWithAudioMuted: v })} />
        <ToggleRow label="Kamera aus starten" description="Kamera beim Beitritt standardmässig deaktiviert"
          checked={appointmentSettings.startWithVideoMuted} onChange={(v: boolean) => updateAppointmentSettings({ startWithVideoMuted: v })} />
      </div>

      {/* Video-Call Funktionen */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><ScreenShare className="h-4 w-4 text-muted-foreground" /> Video-Call Funktionen</h3>
        <ToggleRow label="Aufnahme erlauben" description="Teilnehmer können den Call aufnehmen"
          checked={appointmentSettings.enableRecording} onChange={(v: boolean) => updateAppointmentSettings({ enableRecording: v })} icon={<Camera className="h-4 w-4" />} />
        <ToggleRow label="Bildschirmfreigabe erlauben" description="Teilnehmer können ihren Bildschirm teilen"
          checked={appointmentSettings.enableScreensharing} onChange={(v: boolean) => updateAppointmentSettings({ enableScreensharing: v })} icon={<ScreenShare className="h-4 w-4" />} />
        <ToggleRow label="Chat aktivieren" description="In-Call Textnachrichten erlauben"
          checked={appointmentSettings.enableChat} onChange={(v: boolean) => updateAppointmentSettings({ enableChat: v })} icon={<MessageCircle className="h-4 w-4" />} />
        <ToggleRow label="Kachelansicht erlauben" description="Mehrere Teilnehmer gleichzeitig sehen"
          checked={appointmentSettings.enableTileView} onChange={(v: boolean) => updateAppointmentSettings({ enableTileView: v })} icon={<LayoutGrid className="h-4 w-4" />} />
      </div>

      {/* Erinnerungen */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" /> Erinnerungen</h3>
        <ToggleRow label="Erinnerung vor Termin senden" description="Lead wird vor dem Termin automatisch erinnert"
          checked={appointmentSettings.reminderEnabled} onChange={(v: boolean) => updateAppointmentSettings({ reminderEnabled: v })} />
        {appointmentSettings.reminderEnabled && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Erinnerung senden vor</label>
            <select value={appointmentSettings.reminderMinutesBefore}
              onChange={(e: any) => { updateAppointmentSettings({ reminderMinutesBefore: Number(e.target.value) }); toast({ title: 'Gespeichert' }); }}
              className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value={5}>5 Minuten</option><option value={10}>10 Minuten</option><option value={15}>15 Minuten</option>
              <option value={30}>30 Minuten</option><option value={60}>1 Stunde</option><option value={120}>2 Stunden</option><option value={1440}>1 Tag</option>
            </select>
          </div>
        )}
      </div>

      {/* Benachrichtigung & Versand */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Send className="h-4 w-4 text-muted-foreground" /> Benachrichtigung & Versand</h3>
        <p className="text-xs text-muted-foreground">Kanal für Termineinladungen und Erinnerungen wählen.</p>
        <div className="grid grid-cols-3 gap-3">
          {([
            { method: 'email' as NotificationMethod, label: 'E-Mail', icon: Mail, desc: 'Einladung per E-Mail' },
            { method: 'sms' as NotificationMethod, label: 'SMS', icon: Phone, desc: 'Einladung per SMS' },
            { method: 'whatsapp' as NotificationMethod, label: 'WhatsApp', icon: MessageSquare, desc: 'Einladung per WhatsApp' },
          ]).map(opt => {
            const isActive = appointmentSettings.notificationMethod === opt.method;
            const Icon = opt.icon;
            return (
              <button key={opt.method}
                onClick={() => { updateAppointmentSettings({ notificationMethod: opt.method }); toast({ title: 'Gespeichert', description: `Benachrichtigung per ${opt.label} aktiviert` }); }}
                className={`rounded-xl border p-4 text-left transition-colors ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-semibold">{opt.label}</span>
                  {isActive && <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Aktiv</span>}
                </div>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            );
          })}
        </div>
        <ToggleRow label="Einladung automatisch senden" description="Sendet die Einladung sofort nach Terminerstellung"
          checked={appointmentSettings.autoSendInvite} onChange={(v: boolean) => updateAppointmentSettings({ autoSendInvite: v })} />
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nachrichtenvorlage</label>
          <textarea value={appointmentSettings.inviteMessageTemplate} onChange={(e: any) => updateAppointmentSettings({ inviteMessageTemplate: e.target.value })}
            rows={5} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ring resize-none" />
          <p className="text-[11px] text-muted-foreground mt-1">
            Platzhalter: <code className="bg-secondary px-1 rounded">{'{name}'}</code> <code className="bg-secondary px-1 rounded">{'{date}'}</code> <code className="bg-secondary px-1 rounded">{'{time}'}</code> <code className="bg-secondary px-1 rounded">{'{link}'}</code> <code className="bg-secondary px-1 rounded">{'{company}'}</code>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">💡 Für tatsächlichen Versand wird Lovable Cloud benötigt (SMS via Twilio, E-Mail via SMTP). Derzeit wird die Aktion protokolliert.</p>
      </div>
    </>
  );
}

interface InsightsQuestion { key: string; label: string; question: string }
interface DiscQuestion { text: string; dimension: 'D' | 'I' | 'S' | 'C' }

interface MotivatorQuestion { text: string; dimension: string }
interface SsmCriteria {
  min_disc: Record<string, number>;
  preferred_motivators: string[];
  min_score: number;
  exclusion_criteria: string[];
}
const defaultSsmCriteria: SsmCriteria = {
  min_disc: { D: 40, I: 40, S: 40, C: 40 },
  preferred_motivators: ['oekonomisch', 'individualistisch'],
  min_score: 60,
  exclusion_criteria: [],
};
const motivatorDimensions = [
  { key: 'individualistisch', label: 'Individualistisch' },
  { key: 'theoretisch', label: 'Theoretisch' },
  { key: 'oekonomisch', label: 'Ökonomisch' },
  { key: 'traditionell', label: 'Traditionell' },
  { key: 'aesthetisch', label: 'Ästhetisch' },
  { key: 'sozial', label: 'Sozial' },
];

function InsightsTab({ insightsSettings, updateInsightsSettings, toast }: any) {
  const [iq, setIq] = useState<InsightsQuestion[]>([]);
  const [dq, setDq] = useState<DiscQuestion[]>([]);
  const [mq, setMq] = useState<MotivatorQuestion[]>([]);
  const [ssmCriteria, setSsmCriteria] = useState<SsmCriteria>(defaultSsmCriteria);
  const [loadingQ, setLoadingQ] = useState(true);
  const [savingIq, setSavingIq] = useState(false);
  const [savingDq, setSavingDq] = useState(false);
  const [editIqIdx, setEditIqIdx] = useState<number | null>(null);
  const [editDqIdx, setEditDqIdx] = useState<number | null>(null);
  const [editMqIdx, setEditMqIdx] = useState<number | null>(null);
  const [iqForm, setIqForm] = useState<InsightsQuestion>({ key: '', label: '', question: '' });
  const [dqForm, setDqForm] = useState<DiscQuestion>({ text: '', dimension: 'D' });
  const [mqForm, setMqForm] = useState<MotivatorQuestion>({ text: '', dimension: 'individualistisch' });
  const [addingIq, setAddingIq] = useState(false);
  const [addingDq, setAddingDq] = useState(false);
  const [addingMq, setAddingMq] = useState(false);
  const [savingMq, setSavingMq] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoadingQ(true);
    const { data } = await supabase.from('app_settings').select('key,value').in('key', ['insights_questions', 'disc_questions', 'motivator_questions', 'ssm_criteria']);
    if (data) {
      for (const row of data) {
        if (row.key === 'insights_questions') setIq(row.value as unknown as InsightsQuestion[]);
        if (row.key === 'disc_questions') setDq(row.value as unknown as DiscQuestion[]);
        if (row.key === 'motivator_questions') setMq(row.value as unknown as MotivatorQuestion[]);
        if (row.key === 'ssm_criteria') setSsmCriteria({ ...defaultSsmCriteria, ...(row.value as any) });
      }
    }
    setLoadingQ(false);
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const saveIqToDb = async (questions: InsightsQuestion[]) => {
    setSavingIq(true);
    await supabase.from('app_settings').update({ value: questions as unknown as any, updated_at: new Date().toISOString() }).eq('key', 'insights_questions');
    setSavingIq(false);
    toast({ title: 'Insights-Fragen gespeichert' });
  };

  const saveDqToDb = async (questions: DiscQuestion[]) => {
    setSavingDq(true);
    await supabase.from('app_settings').update({ value: questions as unknown as any, updated_at: new Date().toISOString() }).eq('key', 'disc_questions');
    setSavingDq(false);
    toast({ title: 'DISC-Fragen gespeichert' });
  };

  const handleAddIq = () => {
    if (!iqForm.label.trim() || !iqForm.question.trim()) { toast({ title: 'Fehler', description: 'Label und Frage ausfüllen', variant: 'destructive' }); return; }
    const key = iqForm.key || iqForm.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const updated = [...iq, { ...iqForm, key }];
    setIq(updated);
    saveIqToDb(updated);
    setIqForm({ key: '', label: '', question: '' });
    setAddingIq(false);
  };

  const handleUpdateIq = (idx: number) => {
    if (!iqForm.label.trim() || !iqForm.question.trim()) return;
    const updated = [...iq];
    updated[idx] = { ...iqForm, key: iqForm.key || iq[idx].key };
    setIq(updated);
    saveIqToDb(updated);
    setEditIqIdx(null);
  };

  const handleDeleteIq = (idx: number) => {
    const updated = iq.filter((_, i) => i !== idx);
    setIq(updated);
    saveIqToDb(updated);
  };

  const handleAddDq = () => {
    if (!dqForm.text.trim()) { toast({ title: 'Fehler', description: 'Fragetext eingeben', variant: 'destructive' }); return; }
    const updated = [...dq, dqForm];
    setDq(updated);
    saveDqToDb(updated);
    setDqForm({ text: '', dimension: 'D' });
    setAddingDq(false);
  };

  const handleUpdateDq = (idx: number) => {
    if (!dqForm.text.trim()) return;
    const updated = [...dq];
    updated[idx] = dqForm;
    setDq(updated);
    saveDqToDb(updated);
    setEditDqIdx(null);
  };

  const handleDeleteDq = (idx: number) => {
    const updated = dq.filter((_, i) => i !== idx);
    setDq(updated);
    saveDqToDb(updated);
  };

  const saveMqToDb = async (questions: MotivatorQuestion[]) => {
    setSavingMq(true);
    await supabase.from('app_settings').upsert({ key: 'motivator_questions', value: questions as unknown as any, updated_at: new Date().toISOString() });
    setSavingMq(false);
    toast({ title: 'Motivatoren-Fragen gespeichert' });
  };

  const handleAddMq = () => {
    if (!mqForm.text.trim()) { toast({ title: 'Fehler', description: 'Fragetext eingeben', variant: 'destructive' }); return; }
    const updated = [...mq, mqForm];
    setMq(updated);
    saveMqToDb(updated);
    setMqForm({ text: '', dimension: 'individualistisch' });
    setAddingMq(false);
  };

  const handleUpdateMq = (idx: number) => {
    if (!mqForm.text.trim()) return;
    const updated = [...mq];
    updated[idx] = mqForm;
    setMq(updated);
    saveMqToDb(updated);
    setEditMqIdx(null);
  };

  const handleDeleteMq = (idx: number) => {
    const updated = mq.filter((_, i) => i !== idx);
    setMq(updated);
    saveMqToDb(updated);
  };

  const dimColor = (d: string) =>
    d === 'D' ? 'bg-red-100 text-red-700' :
    d === 'I' ? 'bg-amber-100 text-amber-700' :
    d === 'S' ? 'bg-emerald-100 text-emerald-700' :
    'bg-blue-100 text-blue-700';

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Brain className="h-5 w-5" /> Insights / DISC-Persönlichkeitstest</h2>
        <p className="text-sm text-muted-foreground">Fragen verwalten und Einstellungen konfigurieren.</p>
      </div>

      {/* General Settings */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Settings2 className="h-4 w-4 text-muted-foreground" /> Allgemein</h3>
        <ToggleRow label="Status automatisch auf «Insights» setzen" description="Setzt den Lead-Status automatisch auf «Insights» wenn der DISC-Test abgeschlossen wird"
          checked={insightsSettings.autoStatusAfterComplete} onChange={(v: boolean) => { updateInsightsSettings({ autoStatusAfterComplete: v }); toast({ title: 'Gespeichert' }); }} />
        <ToggleRow label="Pflicht vor Gespräch 2" description="Der DISC-Test muss abgeschlossen sein, bevor der Status auf «Gespräch 2» gesetzt werden kann"
          checked={insightsSettings.requiredBeforeInterview2} onChange={(v: boolean) => { updateInsightsSettings({ requiredBeforeInterview2: v }); toast({ title: 'Gespeichert' }); }}
          icon={<Lock className="h-4 w-4" />} />
        <ToggleRow label="Detaillierte Ergebnisse anzeigen" description="Zeigt Prozent-Werte und Interpretation für jede DISC-Dimension"
          checked={insightsSettings.showDetailedResults} onChange={(v: boolean) => { updateInsightsSettings({ showDetailedResults: v }); toast({ title: 'Gespeichert' }); }}
          icon={<FileText className="h-4 w-4" />} />
        <ToggleRow label="Wiederholung erlauben" description="Kandidaten dürfen den DISC-Test erneut ausfüllen"
          checked={insightsSettings.allowRetake} onChange={(v: boolean) => { updateInsightsSettings({ allowRetake: v }); toast({ title: 'Gespeichert' }); }}
          icon={<RefreshCw className="h-4 w-4" />} />
      </div>

      {/* Intro Text */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Einleitungstext</h3>
        <p className="text-xs text-muted-foreground">Dieser Text wird dem Kandidaten vor Beginn des Tests angezeigt.</p>
        <textarea value={insightsSettings.introText} onChange={(e: any) => updateInsightsSettings({ introText: e.target.value })}
          rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
      </div>

      {/* Insights Questions (Teil 1) */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" /> Teil 1: Insights-Fragen ({iq.length})
          </h3>
          <button onClick={() => { setAddingIq(true); setIqForm({ key: '', label: '', question: '' }); }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" /> Frage hinzufügen
          </button>
        </div>

        {loadingQ ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {iq.map((q, i) => (
              <div key={i} className="rounded-lg border bg-muted/30 px-4 py-3">
                {editIqIdx === i ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input value={iqForm.label} onChange={e => setIqForm(f => ({ ...f, label: e.target.value }))}
                        placeholder="Label" className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                      <input value={iqForm.key} onChange={e => setIqForm(f => ({ ...f, key: e.target.value }))}
                        placeholder="Key (optional)" className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <textarea value={iqForm.question} onChange={e => setIqForm(f => ({ ...f, question: e.target.value }))}
                      rows={2} placeholder="Fragetext" className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateIq(i)} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"><Save className="h-3 w-3 inline mr-1" />Speichern</button>
                      <button onClick={() => setEditIqIdx(null)} className="rounded-md bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80">Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">{q.label}</span>
                        <span className="text-[10px] text-muted-foreground/60">({q.key})</span>
                      </div>
                      <p className="text-sm mt-0.5">{q.question}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditIqIdx(i); setIqForm(q); }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDeleteIq(i)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {addingIq && (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input value={iqForm.label} onChange={e => setIqForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Label (z.B. Motivation)" className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <input value={iqForm.key} onChange={e => setIqForm(f => ({ ...f, key: e.target.value }))}
                placeholder="Key (optional, wird generiert)" className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <textarea value={iqForm.question} onChange={e => setIqForm(f => ({ ...f, question: e.target.value }))}
              rows={2} placeholder="Fragetext eingeben..." className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
            <div className="flex gap-2">
              <button onClick={handleAddIq} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"><Plus className="h-3 w-3 inline mr-1" />Hinzufügen</button>
              <button onClick={() => setAddingIq(false)} className="rounded-md bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80">Abbrechen</button>
            </div>
          </div>
        )}
      </div>

      {/* DISC Questions (Teil 2) */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" /> Teil 2: DISC-Persönlichkeitsfragen ({dq.length})
          </h3>
          <button onClick={() => { setAddingDq(true); setDqForm({ text: '', dimension: 'D' }); }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" /> Frage hinzufügen
          </button>
        </div>

        {loadingQ ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {dq.map((q, i) => (
              <div key={i} className="rounded-lg border bg-muted/30 px-4 py-3">
                {editDqIdx === i ? (
                  <div className="space-y-2">
                    <textarea value={dqForm.text} onChange={e => setDqForm(f => ({ ...f, text: e.target.value }))}
                      rows={2} placeholder="Fragetext" className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-muted-foreground">Dimension:</label>
                      {(['D', 'I', 'S', 'C'] as const).map(d => (
                        <button key={d} onClick={() => setDqForm(f => ({ ...f, dimension: d }))}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${dqForm.dimension === d ? dimColor(d) : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateDq(i)} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"><Save className="h-3 w-3 inline mr-1" />Speichern</button>
                      <button onClick={() => setEditDqIdx(null)} className="rounded-md bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80">Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">{i + 1}</span>
                    <span className="text-sm flex-1">{q.text}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${dimColor(q.dimension)}`}>{q.dimension}</span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditDqIdx(i); setDqForm(q); }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDeleteDq(i)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {addingDq && (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-2">
            <textarea value={dqForm.text} onChange={e => setDqForm(f => ({ ...f, text: e.target.value }))}
              rows={2} placeholder="Aussage eingeben (z.B. 'Ich treffe Entscheidungen schnell.')" className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground">Dimension:</label>
              {(['D', 'I', 'S', 'C'] as const).map(d => (
                <button key={d} onClick={() => setDqForm(f => ({ ...f, dimension: d }))}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${dqForm.dimension === d ? dimColor(d) : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddDq} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"><Plus className="h-3 w-3 inline mr-1" />Hinzufügen</button>
              <button onClick={() => setAddingDq(false)} className="rounded-md bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80">Abbrechen</button>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <strong>DISC-Dimensionen:</strong>{' '}
            <span className="text-red-600 font-semibold">D</span> = Dominanz · 
            <span className="text-amber-600 font-semibold"> I</span> = Initiative · 
            <span className="text-emerald-600 font-semibold"> S</span> = Stetigkeit · 
            <span className="text-blue-600 font-semibold"> C</span> = Gewissenhaftigkeit
          </p>
        </div>
      </div>

      {/* Motivator Questions (Teil 3) - Full CRUD */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" /> Teil 3: Motivatoren-Fragen ({mq.length})
          </h3>
          <button onClick={() => { setAddingMq(true); setMqForm({ text: '', dimension: 'individualistisch' }); }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" /> Frage hinzufügen
          </button>
        </div>

        {loadingQ ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {mq.map((q, i) => (
              <div key={i} className="rounded-lg border bg-muted/30 px-4 py-3">
                {editMqIdx === i ? (
                  <div className="space-y-2">
                    <textarea value={mqForm.text} onChange={e => setMqForm(f => ({ ...f, text: e.target.value }))}
                      rows={2} placeholder="Fragetext" className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs font-medium text-muted-foreground">Dimension:</label>
                      {motivatorDimensions.map(m => (
                        <button key={m.key} onClick={() => setMqForm(f => ({ ...f, dimension: m.key }))}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${mqForm.dimension === m.key ? 'bg-purple-100 text-purple-700' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateMq(i)} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"><Save className="h-3 w-3 inline mr-1" />Speichern</button>
                      <button onClick={() => setEditMqIdx(null)} className="rounded-md bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80">Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">{i + 1}</span>
                    <span className="text-sm flex-1">{q.text}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700">
                      {motivatorDimensions.find(m => m.key === q.dimension)?.label || q.dimension}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditMqIdx(i); setMqForm(q); }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDeleteMq(i)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {addingMq && (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-2">
            <textarea value={mqForm.text} onChange={e => setMqForm(f => ({ ...f, text: e.target.value }))}
              rows={2} placeholder="Aussage eingeben (z.B. 'Ich strebe nach finanzieller Unabhängigkeit.')" className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-medium text-muted-foreground">Dimension:</label>
              {motivatorDimensions.map(m => (
                <button key={m.key} onClick={() => setMqForm(f => ({ ...f, dimension: m.key }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${mqForm.dimension === m.key ? 'bg-purple-100 text-purple-700' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddMq} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"><Plus className="h-3 w-3 inline mr-1" />Hinzufügen</button>
              <button onClick={() => setAddingMq(false)} className="rounded-md bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80">Abbrechen</button>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Motivator-Dimensionen:</strong>{' '}
            Individualistisch · Theoretisch · Ökonomisch · Traditionell · Ästhetisch · Sozial
            – idealerweise 2+ Fragen pro Dimension.
          </p>
        </div>
      </div>

      {/* SSM Match Kriterien */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" /> SSM Match-Kriterien
        </h3>
        <p className="text-xs text-muted-foreground">
          Definieren Sie die Idealwerte für das Kandidaten-Matching. Die KI verwendet diese Kriterien für den Culture Fit Score und die Empfehlung.
        </p>

        {/* Min DISC */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mindest DISC-Werte (%)</h4>
          <div className="grid grid-cols-4 gap-3">
            {(['D', 'I', 'S', 'C'] as const).map(dim => (
              <div key={dim} className="space-y-1">
                <label className={`text-xs font-bold ${dim === 'D' ? 'text-red-600' : dim === 'I' ? 'text-amber-600' : dim === 'S' ? 'text-emerald-600' : 'text-blue-600'}`}>{dim}</label>
                <input type="number" min={0} max={100} value={ssmCriteria.min_disc[dim] || 0}
                  onChange={e => setSsmCriteria(prev => ({ ...prev, min_disc: { ...prev.min_disc, [dim]: parseInt(e.target.value) || 0 } }))}
                  className="w-full h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
          </div>
        </div>

        {/* Preferred motivators */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wunsch-Motivatoren</h4>
          <div className="flex flex-wrap gap-2">
            {motivatorDimensions.map(m => {
              const selected = ssmCriteria.preferred_motivators.includes(m.key);
              return (
                <button key={m.key} type="button"
                  onClick={() => setSsmCriteria(prev => ({
                    ...prev,
                    preferred_motivators: selected
                      ? prev.preferred_motivators.filter(k => k !== m.key)
                      : [...prev.preferred_motivators, m.key],
                  }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                >{m.label}</button>
              );
            })}
          </div>
        </div>

        {/* Min score */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mindest-Gesamtscore</h4>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={100} value={ssmCriteria.min_score}
              onChange={e => setSsmCriteria(prev => ({ ...prev, min_score: parseInt(e.target.value) }))}
              className="flex-1" />
            <span className="text-sm font-bold w-10 text-right">{ssmCriteria.min_score}%</span>
          </div>
        </div>

        {/* Exclusion criteria */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ausschlusskriterien</h4>
          <div className="space-y-1.5">
            {ssmCriteria.exclusion_criteria.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={c} onChange={e => {
                  const updated = [...ssmCriteria.exclusion_criteria];
                  updated[i] = e.target.value;
                  setSsmCriteria(prev => ({ ...prev, exclusion_criteria: updated }));
                }} className="flex-1 h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => setSsmCriteria(prev => ({ ...prev, exclusion_criteria: prev.exclusion_criteria.filter((_, j) => j !== i) }))}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <button onClick={() => setSsmCriteria(prev => ({ ...prev, exclusion_criteria: [...prev.exclusion_criteria, ''] }))}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"><Plus className="h-3 w-3" /> Kriterium hinzufügen</button>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={async () => {
            const filtered = { ...ssmCriteria, exclusion_criteria: ssmCriteria.exclusion_criteria.filter(c => c.trim()) };
            await supabase.from('app_settings').upsert({ key: 'ssm_criteria', value: filtered as unknown as any, updated_at: new Date().toISOString() });
            toast({ title: 'SSM-Kriterien gespeichert' });
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Save className="h-4 w-4" /> Kriterien speichern
        </button>
      </div>

      {/* Wizard Preview & Test */}
      <WizardPreviewPanel toast={toast} />
    </>
  );
}

/* ── Wizard Preview Panel ── */
function WizardPreviewPanel({ toast }: { toast: any }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const DUMMY_LEAD_ID = 'test-lead-dummy-001';
  const PREVIEW_TOKEN = 'test-wizard-preview-token';

  const resetAndOpen = async () => {
    setLoading(true);
    // Reset the insights request to pending
    await supabase.from('insights_requests').update({
      status: 'pending',
      completed_at: null,
      responses: {},
    }).eq('token', PREVIEW_TOKEN);
    // Reset lead status
    await supabase.from('leads').update({ status: 'new' }).eq('id', DUMMY_LEAD_ID);
    // Delete old assessment results for this lead
    await supabase.from('assessment_results').delete().eq('lead_id', DUMMY_LEAD_ID);
    await supabase.from('disc_results').delete().eq('lead_id', DUMMY_LEAD_ID);
    await supabase.from('appointment_suggestions').delete().eq('lead_id', DUMMY_LEAD_ID);

    setAssessmentResult(null);
    const url = `${window.location.origin}/insights-form?token=${PREVIEW_TOKEN}`;
    setPreviewUrl(url);
    setLoading(false);
    window.open(url, '_blank');
    toast({ title: 'Wizard geöffnet', description: 'Test-Wizard wurde in neuem Tab geöffnet.' });
  };

  const loadResult = async () => {
    setLoadingResult(true);
    const { data } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('lead_id', DUMMY_LEAD_ID)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    if (data) {
      setAssessmentResult(data);
    } else {
      toast({ title: 'Keine Ergebnisse', description: 'Bitte füllen Sie zuerst den Wizard aus.', variant: 'destructive' });
    }
    setLoadingResult(false);
  };

  const matchLevelConfig: Record<string, { label: string; emoji: string; bg: string }> = {
    perfect: { label: 'Perfekter Match', emoji: '🔥', bg: 'bg-success/10 border-success/30' },
    very_good: { label: 'Sehr guter Match', emoji: '✅', bg: 'bg-info/10 border-info/30' },
    conditional: { label: 'Bedingt geeignet', emoji: '⚠️', bg: 'bg-warning/10 border-warning/30' },
    no_match: { label: 'Kein Match', emoji: '❌', bg: 'bg-destructive/10 border-destructive/30' },
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-muted-foreground" /> Wizard Vorschau & Test
        </h3>
        <div className="flex gap-2">
          <button onClick={loadResult} disabled={loadingResult}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
            {loadingResult ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Ergebnisse laden
          </button>
          <button onClick={resetAndOpen} disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            Wizard testen
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Test-Lead:</strong> Max Mustermann (Test) · test@ssmrecruit.dev<br />
          Klicken Sie «Wizard testen», um den Wizard in einem neuen Tab zu öffnen. Nach Abschluss klicken Sie «Ergebnisse laden» um die KI-Analyse hier zu sehen.
        </p>
      </div>

      {/* Results Display */}
      {assessmentResult && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" /> Assessment-Ergebnis
          </h4>

          {/* Summary */}
          {assessmentResult.summary?.headline && (
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-sm font-semibold">{assessmentResult.summary.headline}</p>
              <p className="text-xs text-muted-foreground mt-1">{assessmentResult.summary.description}</p>
            </div>
          )}

          {/* Match + Recommendation */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-lg border p-3 ${matchLevelConfig[assessmentResult.match_result?.level]?.bg || 'bg-muted'}`}>
              <p className="text-xs text-muted-foreground">Match Score</p>
              <p className="text-2xl font-bold">{assessmentResult.match_result?.score ?? '—'}<span className="text-xs font-normal text-muted-foreground">/100</span></p>
              <p className="text-xs font-medium mt-0.5">
                {matchLevelConfig[assessmentResult.match_result?.level]?.emoji} {matchLevelConfig[assessmentResult.match_result?.level]?.label || '—'}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Empfehlung</p>
              <p className="text-lg font-bold mt-1">
                {assessmentResult.recommendation === 'einstellen' ? '✅ Einstellen' :
                 assessmentResult.recommendation === 'weiter_pruefen' ? '🔍 Weiter prüfen' :
                 assessmentResult.recommendation === 'ablehnen' ? '❌ Ablehnen' : assessmentResult.recommendation || '—'}
              </p>
            </div>
          </div>

          {/* DISC Scores */}
          {assessmentResult.disc_scores && Object.keys(assessmentResult.disc_scores).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">DISC Scores</p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(assessmentResult.disc_scores).map(([dim, val]) => (
                  <div key={dim} className="rounded-lg border p-2 text-center">
                    <p className="text-xs font-bold">{dim}</p>
                    <p className="text-lg font-bold">{val as number}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivator Scores */}
          {assessmentResult.motivator_scores && Object.keys(assessmentResult.motivator_scores).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Motivatoren Scores</p>
              <div className="space-y-1.5">
                {Object.entries(assessmentResult.motivator_scores).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([dim, val]) => (
                  <div key={dim} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-28 capitalize">{dim}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${val as number}%` }} />
                    </div>
                    <span className="text-xs font-bold w-10 text-right">{val as number}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Scores */}
          {assessmentResult.scores && Object.keys(assessmentResult.scores).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Performance Scores</p>
              <div className="space-y-1.5">
                {Object.entries(assessmentResult.scores).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-28 capitalize">{key.replace('_', ' ')}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-ring transition-all" style={{ width: `${val as number}%` }} />
                    </div>
                    <span className="text-xs font-bold w-10 text-right">{val as number}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & Risks */}
          {(assessmentResult.match_result?.strengths?.length > 0 || assessmentResult.match_result?.risks?.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-success mb-1">Stärken</p>
                <ul className="space-y-0.5">
                  {assessmentResult.match_result.strengths?.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-warning mb-1">Risiken</p>
                <ul className="space-y-0.5">
                  {assessmentResult.match_result.risks?.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground">• {r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntegrationsTab({ integrations, expandedId, setExpandedId, updateIntegration, saveIntegration, disconnectIntegration, testWebhook, toast }: any) {
  return (
    <>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Plug className="h-5 w-5" /> Integrationen</h2>
        <p className="text-sm text-muted-foreground">Lead-Quellen verbinden und Webhooks konfigurieren.</p>
      </div>

      {/* Webhook endpoint info */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-accent p-2"><Globe className="h-4 w-4 text-accent-foreground" /></div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Ihr Eingangs-Webhook-Endpunkt</h3>
            <p className="text-xs text-muted-foreground mt-1">Verwenden Sie diese URL in Zapier oder Ihrer Werbeplattform, um Leads an SSM Recruit zu senden.</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-secondary px-3 py-2 text-xs font-mono text-secondary-foreground break-all">{window.location.origin}/api/webhook/leads</code>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/webhook/leads`); toast({ title: 'Kopiert', description: 'Webhook-URL in die Zwischenablage kopiert' }); }}
                className="shrink-0 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted transition-colors">Kopieren</button>
            </div>
          </div>
        </div>
      </div>

      {/* Integration list */}
      <div className="space-y-3">
        {integrations.map((integration: any) => {
          const isExpanded = expandedId === integration.id;
          const isComingSoon = integration.id === 'linkedin' || integration.id === 'microsoft365';
          return (
            <div key={integration.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <button onClick={() => !isComingSoon && setExpandedId(isExpanded ? null : integration.id)}
                className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors" disabled={isComingSoon}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{integration.name}</h3>
                    <p className="text-xs text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isComingSoon && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Demnächst</span>}
                  {integration.connected && <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success"><CheckCircle2 className="h-3 w-3" /> Verbunden</span>}
                  {!integration.connected && !isComingSoon && <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground"><XCircle className="h-3 w-3" /> Nicht verbunden</span>}
                </div>
              </button>

              {isExpanded && !isComingSoon && (
                <div className="border-t px-5 py-5 space-y-5">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Verbindungsmethode</label>
                    <div className="flex gap-2">
                      <button onClick={() => updateIntegration(integration.id, { method: 'zapier' })}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${integration.method === 'zapier' ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-secondary'}`}>
                        <Zap className="h-4 w-4" /> Zapier Webhook
                      </button>
                      <button onClick={() => updateIntegration(integration.id, { method: 'api' })}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${integration.method === 'api' ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-secondary'}`}>
                        <Key className="h-4 w-4" /> Direkter API-Schlüssel
                      </button>
                    </div>
                  </div>

                  {integration.method === 'zapier' && (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <h4 className="text-sm font-medium mb-2">Einrichtung mit Zapier:</h4>
                        <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                          <li>Erstellen Sie einen neuen Zap in <a href="https://zapier.com" target="_blank" rel="noreferrer" className="text-primary underline">Zapier</a></li>
                          <li>Setzen Sie den Trigger auf <strong>"{integration.name} → Neuer Lead"</strong></li>
                          <li>Fügen Sie die Aktion <strong>"Webhooks by Zapier → POST"</strong> hinzu</li>
                          <li>Kopieren Sie die Zapier Webhook-URL unten</li>
                        </ol>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Zapier Webhook-URL</label>
                        <input value={integration.zapierWebhook} onChange={(e: any) => updateIntegration(integration.id, { zapierWebhook: e.target.value })}
                          placeholder="https://hooks.zapier.com/hooks/catch/..." className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveIntegration(integration.id)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                          <Save className="h-4 w-4" /> Speichern
                        </button>
                        <button onClick={() => testWebhook(integration)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                          <Zap className="h-4 w-4" /> Test senden
                        </button>
                        {integration.connected && (
                          <button onClick={() => disconnectIntegration(integration.id)} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">Trennen</button>
                        )}
                      </div>
                    </div>
                  )}

                  {integration.method === 'api' && (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <h4 className="text-sm font-medium mb-2">API-Zugangsdaten erhalten:</h4>
                        {integration.id === 'meta' && (
                          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                            <li>Gehen Sie zu <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-primary underline">Meta for Developers</a></li>
                            <li>Erstellen oder wählen Sie Ihre App</li>
                            <li>Navigieren Sie zu <strong>Einstellungen → Basis</strong> und kopieren Sie Ihren Access Token</li>
                          </ol>
                        )}
                        {integration.id === 'tiktok' && (
                          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                            <li>Gehen Sie zur <a href="https://ads.tiktok.com/marketing_api" target="_blank" rel="noreferrer" className="text-primary underline">TikTok Marketing API</a></li>
                            <li>Erstellen Sie eine Entwickler-App</li>
                            <li>Generieren Sie einen langlebigen Access Token</li>
                          </ol>
                        )}
                        {integration.id === 'website' && (
                          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                            <li>Generieren Sie einen API-Schlüssel für Ihre Webseiten-Integration</li>
                            <li>Verwenden Sie ihn zur Authentifizierung von Anfragen an den Eingangs-Webhook</li>
                          </ol>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          {integration.id === 'meta' ? 'Meta Access Token' : integration.id === 'tiktok' ? 'TikTok Access Token' : 'API-Schlüssel'}
                        </label>
                        <input type="password" value={integration.apiKey} onChange={(e: any) => updateIntegration(integration.id, { apiKey: e.target.value })}
                          placeholder="Token hier einfügen..." className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveIntegration(integration.id)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                          <Save className="h-4 w-4" /> Speichern
                        </button>
                        {integration.connected && (
                          <button onClick={() => disconnectIntegration(integration.id)} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">Trennen</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mapbox Integration */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1"><MapPin className="h-5 w-5" /> Dienst-Integrationen</h2>
        <p className="text-sm text-muted-foreground mb-4">Externe Dienste für Karten, Geocoding und mehr.</p>
        <MapboxIntegrationCard toast={toast} />
      </div>
    </>
  );
}

function MapboxIntegrationCard({ toast }: { toast: any }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [tokenPreview, setTokenPreview] = useState('');

  useEffect(() => {
    const check = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        if (!error && data?.token) {
          setStatus('connected');
          const t = data.token as string;
          setTokenPreview(t.slice(0, 8) + '••••••••' + t.slice(-4));
        } else {
          setStatus('disconnected');
        }
      } catch {
        setStatus('disconnected');
      }
    };
    check();
  }, []);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <div>
            <h3 className="font-semibold text-sm">Mapbox</h3>
            <p className="text-xs text-muted-foreground">Karten-Visualisierung, Geocoding & Adress-Autovervollständigung</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {status === 'connected' && <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success"><CheckCircle2 className="h-3 w-3" /> Verbunden</span>}
          {status === 'disconnected' && <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground"><XCircle className="h-3 w-3" /> Nicht konfiguriert</span>}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 py-5 space-y-4">
          <div className="rounded-lg bg-secondary/50 p-4">
            <h4 className="text-sm font-medium mb-2">Verwendung in SSM Recruit:</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li><strong>Statistik → Karte:</strong> Interaktive Lead-Verteilung mit Status-Pins & Agentur-Gebiete</li>
              <li><strong>Adress-Autovervollständigung:</strong> Beim Erstellen/Bearbeiten von Leads automatische Adressvorschläge</li>
              <li><strong>Geocoding:</strong> PLZ/Ort-Erkennung für automatische Agentur-Zuweisung</li>
            </ul>
          </div>

          {status === 'connected' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Mapbox Access Token</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-secondary px-3 py-2 text-xs font-mono text-secondary-foreground">{tokenPreview}</code>
                  <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">Aktiv</span>
                </div>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Der Token ist als Backend-Secret gespeichert und wird sicher über eine Backend-Funktion bereitgestellt. 
                  Um den Token zu ändern, aktualisieren Sie das Secret <code className="bg-secondary px-1 rounded text-[10px]">MAPBOX_TOKEN</code> in den Projekt-Einstellungen.
                </p>
              </div>
            </div>
          )}

          {status === 'disconnected' && (
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary/50 p-4">
                <h4 className="text-sm font-medium mb-2">Token einrichten:</h4>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Erstellen Sie ein Konto bei <a href="https://www.mapbox.com/" target="_blank" rel="noreferrer" className="text-primary underline">mapbox.com</a></li>
                  <li>Navigieren Sie zu <strong>Account → Access Tokens</strong></li>
                  <li>Erstellen oder kopieren Sie Ihren Default Public Token</li>
                  <li>Speichern Sie den Token als Secret <code className="bg-secondary px-1 rounded">MAPBOX_TOKEN</code></li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  permissions: string[];
}

function ApiKeysTab({ toast }: any) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { id: 'ak1', name: 'Produktions-Schlüssel', key: 'rf_live_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', createdAt: '2026-01-15T10:00:00Z', lastUsed: '2026-03-17T14:22:00Z', permissions: ['leads:read', 'leads:write', 'appointments:read', 'appointments:write'] },
    { id: 'ak2', name: 'Webhook-Schlüssel', key: 'rf_live_sk_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4', createdAt: '2026-02-20T08:00:00Z', lastUsed: '2026-03-18T09:15:00Z', permissions: ['leads:write'] },
  ]);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState({ name: '', permissions: ['leads:read'] as string[] });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const allPermissions = [
    { value: 'leads:read', label: 'Leads lesen' },
    { value: 'leads:write', label: 'Leads schreiben' },
    { value: 'appointments:read', label: 'Termine lesen' },
    { value: 'appointments:write', label: 'Termine schreiben' },
    { value: 'employees:read', label: 'Mitarbeiter lesen' },
    { value: 'agencies:read', label: 'Agenturen lesen' },
    { value: 'disc:read', label: 'DISC-Ergebnisse lesen' },
    { value: 'webhooks:write', label: 'Webhooks senden' },
  ];

  const generateApiKey = () => {
    if (!newKeyForm.name.trim()) {
      toast({ title: 'Fehler', description: 'Bitte einen Namen eingeben', variant: 'destructive' });
      return;
    }
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const randomKey = 'rf_live_sk_' + Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const newKey: ApiKey = {
      id: `ak-${Date.now()}`,
      name: newKeyForm.name,
      key: randomKey,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      permissions: newKeyForm.permissions,
    };
    setApiKeys(prev => [newKey, ...prev]);
    setGeneratedKey(randomKey);
    toast({ title: 'API-Schlüssel erstellt', description: 'Kopieren Sie den Schlüssel jetzt – er wird nur einmal angezeigt.' });
  };

  const revokeKey = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
    toast({ title: 'Widerrufen', description: 'API-Schlüssel wurde dauerhaft deaktiviert.' });
  };

  const maskKey = (key: string) => key.slice(0, 14) + '•'.repeat(20) + key.slice(-4);

  const togglePermission = (perm: string) => {
    setNewKeyForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Key className="h-5 w-5" /> API-Schlüssel</h2>
          <p className="text-sm text-muted-foreground">Erstellen und verwalten Sie API-Schlüssel für den Zugriff auf die SSM Recruit REST API.</p>
        </div>
        <Dialog open={newKeyDialog} onOpenChange={(open) => { setNewKeyDialog(open); if (!open) { setGeneratedKey(null); setNewKeyForm({ name: '', permissions: ['leads:read'] }); } }}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              <Key className="h-4 w-4" /> Neuen Schlüssel erstellen
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Neuen API-Schlüssel erstellen</DialogTitle></DialogHeader>
            {!generatedKey ? (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <input value={newKeyForm.name} onChange={(e) => setNewKeyForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="z.B. Produktions-Key, Zapier-Key"
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Berechtigungen</label>
                  <div className="grid grid-cols-2 gap-2">
                    {allPermissions.map(p => (
                      <button key={p.value} onClick={() => togglePermission(p.value)}
                        className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors ${newKeyForm.permissions.includes(p.value) ? 'border-primary bg-primary/5 text-foreground font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
                        <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${newKeyForm.permissions.includes(p.value) ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={generateApiKey} disabled={!newKeyForm.name.trim() || newKeyForm.permissions.length === 0}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                  Schlüssel generieren
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Wichtig</p>
                  <p className="text-xs text-amber-700">Kopieren Sie diesen Schlüssel jetzt. Er wird aus Sicherheitsgründen nicht erneut angezeigt.</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <code className="text-xs font-mono break-all">{generatedKey}</code>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(generatedKey); toast({ title: 'Kopiert!', description: 'API-Schlüssel in die Zwischenablage kopiert.' }); }}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <Copy className="h-4 w-4" /> Schlüssel kopieren
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border bg-card p-4 shadow-sm flex items-start gap-3">
        <div className="rounded-lg bg-accent p-2 shrink-0"><Globe className="h-4 w-4 text-accent-foreground" /></div>
        <div>
          <p className="text-sm font-medium">API-Dokumentation</p>
          <p className="text-xs text-muted-foreground">Vollständige REST API Referenz – wechseln Sie zum Tab „API-Dokumentation" in der linken Navigation.</p>
        </div>
      </div>

      {/* Keys List */}
      <div className="space-y-3">
        {apiKeys.map(apiKey => (
          <div key={apiKey.id} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">{apiKey.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Erstellt: {new Date(apiKey.createdAt).toLocaleDateString('de-DE')}
                  {apiKey.lastUsed && <> · Zuletzt verwendet: {new Date(apiKey.lastUsed).toLocaleDateString('de-DE')}</>}
                </p>
              </div>
              <button onClick={() => revokeKey(apiKey.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                Widerrufen
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono">
                {showKey === apiKey.id ? apiKey.key : maskKey(apiKey.key)}
              </code>
              <button onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                className="rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted transition-colors">
                {showKey === apiKey.id ? 'Verbergen' : 'Anzeigen'}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(apiKey.key); toast({ title: 'Kopiert!' }); }}
                className="rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted transition-colors">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {apiKey.permissions.map(p => (
                <span key={p} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Usage Info */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Verwendung</h3>
        <p className="text-xs text-muted-foreground">Fügen Sie den API-Schlüssel als Bearer Token im Authorization-Header hinzu:</p>
        <pre className="rounded-lg bg-[hsl(var(--sidebar-background))] p-4 text-xs font-mono text-sidebar-foreground overflow-x-auto">{`curl -X GET "${window.location.origin}/api/v1/leads" \\
  -H "Authorization: Bearer rf_live_sk_..." \\
  -H "Content-Type: application/json"`}</pre>
        <p className="text-xs text-muted-foreground">💡 Für die produktive Nutzung wird Lovable Cloud benötigt. Die API-Endpunkte werden dann automatisch bereitgestellt.</p>
      </div>
    </>
  );
}
