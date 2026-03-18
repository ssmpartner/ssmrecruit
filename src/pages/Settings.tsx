import { useState } from 'react';
import { Globe, Zap, Key, CheckCircle2, XCircle, Save, ExternalLink, UserPlus, Shield, Trash2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type SystemRole = 'superadmin' | 'admin' | 'backoffice' | 'analyst';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  createdAt: string;
}

const roleConfig: Record<SystemRole, { label: string; color: string; description: string }> = {
  superadmin: { label: 'Superadmin', color: 'bg-destructive text-destructive-foreground', description: 'Vollzugriff – kann alles verwalten inkl. Benutzer & Einstellungen' },
  admin: { label: 'Admin', color: 'bg-primary text-primary-foreground', description: 'Kann Leads, Mitarbeiter & Agenturen verwalten' },
  backoffice: { label: 'Backoffice', color: 'bg-warning text-warning-foreground', description: 'Kann Leads bearbeiten, zuweisen und Status ändern' },
  analyst: { label: 'Analyst', color: 'bg-info text-info-foreground', description: 'Nur Lesezugriff auf Dashboard & Analytics' },
};

const initialSystemUsers: SystemUser[] = [
  { id: 'su1', name: 'Sarah Chen', email: 'sarah@company.com', role: 'superadmin', createdAt: '2025-01-15T10:00:00Z' },
  { id: 'su2', name: 'Marcus Johnson', email: 'marcus@company.com', role: 'admin', createdAt: '2025-02-01T10:00:00Z' },
];

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
  {
    id: 'meta',
    name: 'Meta (Facebook / Instagram)',
    description: 'Leads aus Facebook & Instagram Lead Ads sammeln',
    icon: '📘',
    method: 'none',
    zapierWebhook: '',
    apiKey: '',
    connected: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    description: 'Leads aus TikTok Lead-Generierungskampagnen sammeln',
    icon: '🎵',
    method: 'none',
    zapierWebhook: '',
    apiKey: '',
    connected: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Lead Forms',
    description: 'Leads aus LinkedIn Lead Gen Forms sammeln (demnächst)',
    icon: '💼',
    method: 'none',
    zapierWebhook: '',
    apiKey: '',
    connected: false,
  },
  {
    id: 'website',
    name: 'Webseiten-Formulare',
    description: 'Leads aus Ihren Website-Kontaktformularen per Webhook sammeln',
    icon: '🌐',
    method: 'none',
    zapierWebhook: '',
    apiKey: '',
    connected: false,
  },
];

export default function Settings() {
  const { toast } = useToast();
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
      toast({ title: 'Error', description: 'No webhook URL configured', variant: 'destructive' });
      return;
    }

    try {
      await fetch(integration.zapierWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          test: true,
          source: integration.id,
          timestamp: new Date().toISOString(),
          triggered_from: window.location.origin,
          lead: {
            name: 'Test Lead',
            email: 'test@example.com',
            phone: '+1 555-0000',
            source: integration.id,
          },
        }),
      });
      toast({ title: 'Test sent', description: 'Check your Zap history to confirm it was triggered.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to send test. Check the webhook URL.', variant: 'destructive' });
    }
  };

  // User management state
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(initialSystemUsers);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'backoffice' as SystemRole });

  const addSystemUser = () => {
    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast({ title: 'Fehler', description: 'Bitte Name und E-Mail ausfüllen', variant: 'destructive' });
      return;
    }
    setSystemUsers(prev => [...prev, {
      id: `su${Date.now()}`,
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      createdAt: new Date().toISOString(),
    }]);
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
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">Benutzer & Integrationen verwalten</p>
      </div>

      {/* ── User Management ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Benutzerverwaltung</h2>
          <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                <UserPlus className="h-4 w-4" /> Benutzer hinzufügen
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Benutzer hinzufügen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <input
                    value={userForm.name}
                    onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="z.B. Max Mustermann"
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">E-Mail</label>
                  <input
                    value={userForm.email}
                    onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="z.B. max@firma.de"
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Rolle</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm(p => ({ ...p, role: e.target.value as SystemRole }))}
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Object.entries(roleConfig).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">{roleConfig[userForm.role].description}</p>
                </div>
                <button
                  onClick={addSystemUser}
                  disabled={!userForm.name.trim() || !userForm.email.trim()}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Benutzer erstellen
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Role legend */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(roleConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${cfg.color}`} />
              <span className="text-xs font-medium">{cfg.label}</span>
              <span className="text-xs text-muted-foreground">– {cfg.description}</span>
            </div>
          ))}
        </div>

        {/* User list */}
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
              {systemUsers.map(user => {
                const cfg = roleConfig[user.role];
                const initials = user.name.split(' ').map(n => n[0]).join('');
                return (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={user.role}
                        onChange={e => changeUserRole(user.id, e.target.value as SystemRole)}
                        className="h-8 rounded-lg border bg-background px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
                      >
                        {Object.entries(roleConfig).map(([key, c]) => (
                          <option key={key} value={key}>{c.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {new Date(user.createdAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => removeSystemUser(user.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Benutzer entfernen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook endpoint info */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-accent p-2">
            <Globe className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="flex-1">
         <h3 className="font-semibold text-sm">Ihr Eingangs-Webhook-Endpunkt</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Verwenden Sie diese URL in Zapier oder Ihrer Werbeplattform, um Leads an RecruitFlow zu senden. Leads erscheinen automatisch in Ihrer Pipeline.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-secondary px-3 py-2 text-xs font-mono text-secondary-foreground break-all">
                {window.location.origin}/api/webhook/leads
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/webhook/leads`);
                  toast({ title: 'Kopiert', description: 'Webhook-URL in die Zwischenablage kopiert' });
                }}
                className="shrink-0 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
              >
                Kopieren
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Lead-Quellen Integrationen</h2>

        {integrations.map(integration => {
          const isExpanded = expandedId === integration.id;
          const isLinkedIn = integration.id === 'linkedin';

          return (
            <div key={integration.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <button
                onClick={() => !isLinkedIn && setExpandedId(isExpanded ? null : integration.id)}
                className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                disabled={isLinkedIn}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{integration.name}</h3>
                    <p className="text-xs text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isLinkedIn && (
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Coming Soon</span>
                  )}
                  {integration.connected && (
                    <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </span>
                  )}
                  {!integration.connected && !isLinkedIn && (
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      <XCircle className="h-3 w-3" /> Not connected
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && !isLinkedIn && (
                <div className="border-t px-5 py-5 space-y-5">
                  {/* Connection method */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Connection Method</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateIntegration(integration.id, { method: 'zapier' })}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                          integration.method === 'zapier'
                            ? 'border-primary bg-accent text-accent-foreground'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        <Zap className="h-4 w-4" /> Zapier Webhook
                      </button>
                      <button
                        onClick={() => updateIntegration(integration.id, { method: 'api' })}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                          integration.method === 'api'
                            ? 'border-primary bg-accent text-accent-foreground'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        <Key className="h-4 w-4" /> Direct API Key
                      </button>
                    </div>
                  </div>

                  {/* Zapier config */}
                  {integration.method === 'zapier' && (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <h4 className="text-sm font-medium mb-2">How to set up with Zapier:</h4>
                        <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                          <li>Create a new Zap in <a href="https://zapier.com" target="_blank" rel="noreferrer" className="text-primary underline">Zapier</a></li>
                          <li>
                            Set trigger to <strong>"{integration.name} → New Lead"</strong>
                          </li>
                          <li>Add action <strong>"Webhooks by Zapier → POST"</strong></li>
                          <li>Paste your incoming webhook URL (above) as the POST URL</li>
                          <li>Copy the Zapier webhook URL below to receive catch hooks</li>
                        </ol>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Zapier Webhook URL</label>
                        <input
                          value={integration.zapierWebhook}
                          onChange={e => updateIntegration(integration.id, { zapierWebhook: e.target.value })}
                          placeholder="https://hooks.zapier.com/hooks/catch/..."
                          className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveIntegration(integration.id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                        >
                          <Save className="h-4 w-4" /> Save
                        </button>
                        <button
                          onClick={() => testWebhook(integration)}
                          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
                        >
                          <Zap className="h-4 w-4" /> Send Test
                        </button>
                        {integration.connected && (
                          <button
                            onClick={() => disconnectIntegration(integration.id)}
                            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* API Key config */}
                  {integration.method === 'api' && (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <h4 className="text-sm font-medium mb-2">How to get your API credentials:</h4>
                        {integration.id === 'meta' && (
                          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                            <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-primary underline">Meta for Developers</a></li>
                            <li>Create or select your app</li>
                            <li>Navigate to <strong>Settings → Basic</strong> and copy your Access Token</li>
                            <li>Ensure <strong>leads_retrieval</strong> permission is enabled</li>
                          </ol>
                        )}
                        {integration.id === 'tiktok' && (
                          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                            <li>Go to <a href="https://ads.tiktok.com/marketing_api" target="_blank" rel="noreferrer" className="text-primary underline">TikTok Marketing API</a></li>
                            <li>Create a developer app</li>
                            <li>Generate a long-lived access token</li>
                            <li>Copy the token below</li>
                          </ol>
                        )}
                        {integration.id === 'website' && (
                          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                            <li>Generate an API key for your website integration</li>
                            <li>Use it to authenticate requests to the incoming webhook</li>
                          </ol>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          {integration.id === 'meta' ? 'Meta Access Token' : integration.id === 'tiktok' ? 'TikTok Access Token' : 'API Key'}
                        </label>
                        <input
                          type="password"
                          value={integration.apiKey}
                          onChange={e => updateIntegration(integration.id, { apiKey: e.target.value })}
                          placeholder="Paste your token here..."
                          className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveIntegration(integration.id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                        >
                          <Save className="h-4 w-4" /> Save
                        </button>
                        {integration.connected && (
                          <button
                            onClick={() => disconnectIntegration(integration.id)}
                            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            Disconnect
                          </button>
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
    </div>
  );
}
