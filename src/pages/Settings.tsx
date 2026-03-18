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
    description: 'Collect leads from Facebook & Instagram Lead Ads',
    icon: '📘',
    method: 'none',
    zapierWebhook: '',
    apiKey: '',
    connected: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    description: 'Collect leads from TikTok Lead Generation campaigns',
    icon: '🎵',
    method: 'none',
    zapierWebhook: '',
    apiKey: '',
    connected: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Lead Forms',
    description: 'Collect leads from LinkedIn Lead Gen Forms (coming soon)',
    icon: '💼',
    method: 'none',
    zapierWebhook: '',
    apiKey: '',
    connected: false,
  },
  {
    id: 'website',
    name: 'Website Forms',
    description: 'Collect leads from your website contact forms via webhook',
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
      toast({ title: 'Error', description: 'Please enter a Zapier webhook URL', variant: 'destructive' });
      return;
    }
    if (integration.method === 'api' && !integration.apiKey.trim()) {
      toast({ title: 'Error', description: 'Please enter an API key', variant: 'destructive' });
      return;
    }

    updateIntegration(id, { connected: true });
    toast({ title: 'Integration saved', description: `${integration.name} has been connected successfully.` });
  };

  const disconnectIntegration = (id: string) => {
    updateIntegration(id, { connected: false, method: 'none', zapierWebhook: '', apiKey: '' });
    toast({ title: 'Disconnected', description: 'Integration has been removed.' });
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

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure lead source integrations</p>
      </div>

      {/* Webhook endpoint info */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-accent p-2">
            <Globe className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Your Incoming Webhook Endpoint</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Use this URL in Zapier or your ad platform to send leads to RecruitFlow. Leads will automatically appear in your pipeline.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-secondary px-3 py-2 text-xs font-mono text-secondary-foreground break-all">
                {window.location.origin}/api/webhook/leads
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/webhook/leads`);
                  toast({ title: 'Copied', description: 'Webhook URL copied to clipboard' });
                }}
                className="shrink-0 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Lead Source Integrations</h2>

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
