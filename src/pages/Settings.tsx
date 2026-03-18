import { useState, useEffect, useCallback } from 'react';
import { Globe, Zap, Key, CheckCircle2, XCircle, Save, ExternalLink, UserPlus, Shield, Trash2, Mail, MessageSquare, Phone, Video, Clock, Monitor, Mic, MicOff, VideoOff, Camera, ScreenShare, MessageCircle, LayoutGrid, Bell, Send, Settings2, Link2, Brain, RefreshCw, FileText, Lock, Users, CalendarDays, Plug, Copy, Code2, ChevronDown, LogOut, Loader2 } from 'lucide-react';
import ProfileSettings from '@/components/ProfileSettings';
import { useToast } from '@/hooks/use-toast';
import { useLeads } from '@/context/useLeads';
import { useNotifications } from '@/context/useNotifications';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { type NotificationMethod, discQuestions } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type SystemRole = 'superadmin' | 'admin' | 'backoffice' | 'analyst';

const roleConfig: Record<SystemRole, { label: string; color: string; description: string }> = {
  superadmin: { label: 'Superadmin', color: 'bg-destructive text-destructive-foreground', description: 'Vollzugriff – kann alles verwalten inkl. Benutzer & Einstellungen' },
  admin: { label: 'Admin', color: 'bg-primary text-primary-foreground', description: 'Kann Leads, Mitarbeiter & Agenturen verwalten' },
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

const defaultIntegrations: Integration[] = [
  { id: 'meta', name: 'Meta (Facebook / Instagram)', description: 'Leads aus Facebook & Instagram Lead Ads sammeln', icon: '📘', method: 'none', zapierWebhook: '', apiKey: '', connected: false },
  { id: 'tiktok', name: 'TikTok Ads', description: 'Leads aus TikTok Lead-Generierungskampagnen sammeln', icon: '🎵', method: 'none', zapierWebhook: '', apiKey: '', connected: false },
  { id: 'linkedin', name: 'LinkedIn Lead Forms', description: 'Leads aus LinkedIn Lead Gen Forms sammeln (demnächst)', icon: '💼', method: 'none', zapierWebhook: '', apiKey: '', connected: false },
  { id: 'website', name: 'Webseiten-Formulare', description: 'Leads aus Ihren Website-Kontaktformularen per Webhook sammeln', icon: '🌐', method: 'none', zapierWebhook: '', apiKey: '', connected: false },
];

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

type SettingsTab = 'profile' | 'notifications' | 'users' | 'appointments' | 'insights' | 'integrations' | 'api';

const tabs: { id: SettingsTab; label: string; icon: typeof Bell; desc: string }[] = [
  { id: 'profile', label: 'Mein Profil', icon: Shield, desc: 'Name, E-Mail & Passwort' },
  { id: 'notifications', label: 'Benachrichtigungen', icon: Bell, desc: 'In-App Alerts konfigurieren' },
  { id: 'users', label: 'Benutzer', icon: Users, desc: 'Rollen & Zugriffsrechte' },
  { id: 'appointments', label: 'Termine & Video', icon: CalendarDays, desc: 'Terminplanung & Video-Calls' },
  { id: 'insights', label: 'Insights / DISC', icon: Brain, desc: 'Persönlichkeitstest-Einstellungen' },
  { id: 'integrations', label: 'Integrationen', icon: Plug, desc: 'Lead-Quellen & Webhooks' },
  { id: 'api', label: 'API-Schlüssel', icon: Key, desc: 'API-Keys generieren & verwalten' },
];

export default function Settings() {
  const { toast } = useToast();
  const { appointmentSettings, updateAppointmentSettings, insightsSettings, updateInsightsSettings } = useLeads();
  const { preferences: notifPrefs, updatePreferences: updateNotifPrefs } = useNotifications();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [integrations, setIntegrations] = useState<Integration[]>(defaultIntegrations);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateIntegration = (id: string, updates: Partial<Integration>) => {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const saveIntegration = (id: string) => {
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
    updateIntegration(id, { connected: true });
    toast({ title: 'Integration gespeichert', description: `${integration.name} wurde erfolgreich verbunden.` });
  };

  const disconnectIntegration = (id: string) => {
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

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(initialSystemUsers);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'backoffice' as SystemRole });

  const addSystemUser = () => {
    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast({ title: 'Fehler', description: 'Bitte Name und E-Mail ausfüllen', variant: 'destructive' });
      return;
    }
    setSystemUsers(prev => [...prev, { id: `su${Date.now()}`, name: userForm.name, email: userForm.email, role: userForm.role, createdAt: new Date().toISOString() }]);
    setUserForm({ name: '', email: '', role: 'backoffice' });
    setUserDialogOpen(false);
    toast({ title: 'Benutzer hinzugefügt', description: `${userForm.name} wurde als ${roleConfig[userForm.role].label} hinzugefügt.` });
  };

  const removeSystemUser = (id: string) => {
    const user = systemUsers.find(u => u.id === id);
    if (user?.role === 'superadmin' && systemUsers.filter(u => u.role === 'superadmin').length <= 1) {
      toast({ title: 'Fehler', description: 'Es muss mindestens ein Superadmin existieren.', variant: 'destructive' });
      return;
    }
    setSystemUsers(prev => prev.filter(u => u.id !== id));
    toast({ title: 'Entfernt', description: 'Benutzer wurde entfernt.' });
  };

  const changeUserRole = (id: string, newRole: SystemRole) => {
    const user = systemUsers.find(u => u.id === id);
    if (user?.role === 'superadmin' && systemUsers.filter(u => u.role === 'superadmin').length <= 1) {
      toast({ title: 'Fehler', description: 'Es muss mindestens ein Superadmin existieren.', variant: 'destructive' });
      return;
    }
    setSystemUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    toast({ title: 'Rolle geändert', description: `Rolle wurde zu ${roleConfig[newRole].label} geändert.` });
  };

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
          {activeTab === 'users' && (
            <UsersTab
              systemUsers={systemUsers}
              userDialogOpen={userDialogOpen}
              setUserDialogOpen={setUserDialogOpen}
              userForm={userForm}
              setUserForm={setUserForm}
              addSystemUser={addSystemUser}
              removeSystemUser={removeSystemUser}
              changeUserRole={changeUserRole}
            />
          )}
          {activeTab === 'appointments' && <AppointmentsTab appointmentSettings={appointmentSettings} updateAppointmentSettings={updateAppointmentSettings} toast={toast} />}
          {activeTab === 'insights' && <InsightsTab insightsSettings={insightsSettings} updateInsightsSettings={updateInsightsSettings} toast={toast} />}
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
        <h3 className="text-sm font-semibold">Weitere Benachrichtigungen</h3>
        <ToggleRow label="DISC-Test abgeschlossen" description="Benachrichtigung wenn ein Kandidat den Persönlichkeitstest abschliesst"
          checked={notifPrefs.discCompleted} onChange={(v: boolean) => { updateNotifPrefs({ discCompleted: v }); toast({ title: 'Gespeichert' }); }}
          icon={<Brain className="h-4 w-4" />} />
        <ToggleRow label="Automatisierungen" description="Benachrichtigung wenn eine Automatisierung ausgelöst wird"
          checked={notifPrefs.automationTriggered} onChange={(v: boolean) => { updateNotifPrefs({ automationTriggered: v }); toast({ title: 'Gespeichert' }); }} />
      </div>
    </>
  );
}

function UsersTab({ systemUsers, userDialogOpen, setUserDialogOpen, userForm, setUserForm, addSystemUser, removeSystemUser, changeUserRole }: any) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Benutzerverwaltung</h2>
          <p className="text-sm text-muted-foreground">Benutzer und Rollen verwalten</p>
        </div>
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
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
                <input value={userForm.name} onChange={(e: any) => setUserForm((p: any) => ({ ...p, name: e.target.value }))}
                  placeholder="z.B. Max Mustermann" className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">E-Mail</label>
                <input value={userForm.email} onChange={(e: any) => setUserForm((p: any) => ({ ...p, email: e.target.value }))}
                  placeholder="z.B. max@firma.de" className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Rolle</label>
                <select value={userForm.role} onChange={(e: any) => setUserForm((p: any) => ({ ...p, role: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                  {Object.entries(roleConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">{roleConfig[userForm.role as SystemRole].description}</p>
              </div>
              <button onClick={addSystemUser} disabled={!userForm.name.trim() || !userForm.email.trim()}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
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
            {systemUsers.map((user: any) => {
              const cfg = roleConfig[user.role as SystemRole];
              const initials = user.name.split(' ').map((n: string) => n[0]).join('');
              return (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">{initials}</div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <select value={user.role} onChange={(e: any) => changeUserRole(user.id, e.target.value)}
                      className="h-8 rounded-lg border bg-background px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-ring">
                      {Object.entries(roleConfig).map(([key, c]) => (
                        <option key={key} value={key}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(user.createdAt).toLocaleDateString('de-DE')}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => removeSystemUser(user.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Benutzer entfernen">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

function InsightsTab({ insightsSettings, updateInsightsSettings, toast }: any) {
  return (
    <>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Brain className="h-5 w-5" /> Insights / DISC-Persönlichkeitstest</h2>
        <p className="text-sm text-muted-foreground">Einstellungen für den DISC-Persönlichkeitstest im Recruiting-Prozess.</p>
      </div>

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

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Einleitungstext</h3>
        <p className="text-xs text-muted-foreground">Dieser Text wird dem Kandidaten vor Beginn des Tests angezeigt.</p>
        <textarea value={insightsSettings.introText} onChange={(e: any) => updateInsightsSettings({ introText: e.target.value })}
          rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-muted-foreground" /> Fragenübersicht ({discQuestions.length} Fragen)</h3>
        <p className="text-xs text-muted-foreground">Aktuelle DISC-Fragen im Test.</p>
        <div className="space-y-1">
          {discQuestions.map((q, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">{i + 1}</span>
              <span className="text-sm flex-1">{q.text}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                q.dimension === 'D' ? 'bg-red-100 text-red-700' :
                q.dimension === 'I' ? 'bg-amber-100 text-amber-700' :
                q.dimension === 'S' ? 'bg-emerald-100 text-emerald-700' :
                'bg-blue-100 text-blue-700'
              }`}>{q.dimension}</span>
            </div>
          ))}
        </div>
      </div>
    </>
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
            <p className="text-xs text-muted-foreground mt-1">Verwenden Sie diese URL in Zapier oder Ihrer Werbeplattform, um Leads an RecruitFlow zu senden.</p>
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
          const isLinkedIn = integration.id === 'linkedin';
          return (
            <div key={integration.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <button onClick={() => !isLinkedIn && setExpandedId(isExpanded ? null : integration.id)}
                className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors" disabled={isLinkedIn}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{integration.name}</h3>
                    <p className="text-xs text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isLinkedIn && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Demnächst</span>}
                  {integration.connected && <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success"><CheckCircle2 className="h-3 w-3" /> Verbunden</span>}
                  {!integration.connected && !isLinkedIn && <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground"><XCircle className="h-3 w-3" /> Nicht verbunden</span>}
                </div>
              </button>

              {isExpanded && !isLinkedIn && (
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
    </>
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
          <p className="text-sm text-muted-foreground">Erstellen und verwalten Sie API-Schlüssel für den Zugriff auf die RecruitFlow REST API.</p>
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
