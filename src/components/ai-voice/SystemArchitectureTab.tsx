import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Server, Globe, Monitor, Bot, Phone, Zap, Cloud, ArrowRight,
  CheckCircle2, XCircle, AlertTriangle, Settings2, Shield, Save,
  Loader2, RefreshCw, ExternalLink, Layers, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ── Architecture Layers ───────────────────────────────────────────

interface SystemLayer {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  responsibilities: string[];
  configKeys: string[];
  statusKey: string;
}

const LAYERS: SystemLayer[] = [
  {
    id: 'frontend',
    label: 'SSM Recruit Frontend',
    description: 'React-basierte Verwaltungsoberfläche für Agenten, Kampagnen, Knowledge Base und Monitoring.',
    icon: Monitor,
    color: 'text-blue-600',
    responsibilities: [
      'Agent-Verwaltung & Konfiguration',
      'Kampagnen-Management',
      'Session-Monitoring & Analytics',
      'Knowledge Base Pflege',
      'Rollenbasierte Zugriffskontrolle',
    ],
    configKeys: [],
    statusKey: 'frontend',
  },
  {
    id: 'core_backend',
    label: 'SSM Recruit Core Backend',
    description: 'Lovable Cloud Backend (Edge Functions + Datenbank) für Daten, Regeln, Rechte und Action Gateway.',
    icon: Server,
    color: 'text-emerald-600',
    responsibilities: [
      'Datenbank & Persistenz (PostgreSQL)',
      'RLS-Policies & Authentifizierung',
      'Action Gateway (15 Aktionstypen)',
      'Audit Logging & Compliance',
      'Webhook-Empfang & Event-Verarbeitung',
      'Budget- & Kostenkontrolle',
    ],
    configKeys: ['voice_backend_base_url', 'internal_service_token_placeholder', 'environment_mode'],
    statusKey: 'core_backend',
  },
  {
    id: 'railway_backend',
    label: 'Railway Voice Backend',
    description: 'Externer Voice-Orchestrator auf Railway für Echtzeit-Session-Steuerung und Provider-Kommunikation.',
    icon: Cloud,
    color: 'text-purple-600',
    responsibilities: [
      'Realtime Session-Management',
      'Call-Orchestrierung (Inbound/Outbound)',
      'WebSocket-Verbindung zu OpenAI',
      'Twilio Media Stream Handling',
      'Turn-by-Turn Verarbeitung',
      'Webhook-Dispatch an SSM Recruit',
    ],
    configKeys: ['voice_backend_base_url', 'public_webhook_url_placeholder', 'api_auth_placeholder'],
    statusKey: 'railway_backend',
  },
  {
    id: 'openai',
    label: 'OpenAI Realtime API',
    description: 'Voice AI Provider für Sprachverarbeitung und Konversations-KI in Echtzeit.',
    icon: Bot,
    color: 'text-orange-600',
    responsibilities: [
      'Speech-to-Text (Realtime)',
      'LLM-basierte Konversation',
      'Text-to-Speech (Realtime)',
      'Intent-Erkennung',
      'Action Suggestions',
    ],
    configKeys: ['openai_connection_placeholder'],
    statusKey: 'openai',
  },
  {
    id: 'twilio',
    label: 'Twilio Telephony',
    description: 'Telefonie-Provider für SIP-Trunking, Nummernverwaltung und Media Streams.',
    icon: Phone,
    color: 'text-red-600',
    responsibilities: [
      'Outbound Call Initiation',
      'Inbound Call Routing',
      'Media Stream (WebSocket)',
      'Call Recording',
      'Nummernverwaltung',
      'DTMF & Call Control',
    ],
    configKeys: ['twilio_connection_placeholder'],
    statusKey: 'twilio',
  },
];

// ── Event Flows ───────────────────────────────────────────────────

const EVENT_FLOWS = [
  { from: 'Frontend', to: 'Core Backend', event: 'campaign.start', desc: 'Kampagne starten / pausieren' },
  { from: 'Core Backend', to: 'Railway Backend', event: 'call.initiate', desc: 'Outbound-Call Request an Voice Backend' },
  { from: 'Railway Backend', to: 'Twilio', event: 'call.create', desc: 'Twilio REST API – Anruf starten' },
  { from: 'Twilio', to: 'Railway Backend', event: 'media.stream', desc: 'WebSocket Media Stream (Audio)' },
  { from: 'Railway Backend', to: 'OpenAI', event: 'realtime.stream', desc: 'Audio an OpenAI Realtime API' },
  { from: 'OpenAI', to: 'Railway Backend', event: 'realtime.response', desc: 'AI-Antwort (Text + Audio)' },
  { from: 'Railway Backend', to: 'Core Backend', event: 'session.update', desc: 'Turn, Status, Sentiment, Kosten' },
  { from: 'Railway Backend', to: 'Core Backend', event: 'action.suggest', desc: 'Aktion vorschlagen (z.B. Status ändern)' },
  { from: 'Core Backend', to: 'Railway Backend', event: 'action.result', desc: 'Ergebnis der Action-Ausführung' },
  { from: 'Railway Backend', to: 'Core Backend', event: 'session.complete', desc: 'Session abgeschlossen mit Summary' },
  { from: 'Core Backend', to: 'Frontend', event: 'notification.push', desc: 'Realtime-Benachrichtigung an UI' },
  { from: 'Twilio', to: 'Railway Backend', event: 'call.status', desc: 'Status-Callbacks (ringing, answered, completed)' },
];

// ── Config Defaults ───────────────────────────────────────────────

const DEFAULT_CONFIG = {
  voice_backend_base_url: '',
  environment_mode: 'development',
  public_webhook_url_placeholder: '',
  openai_connection_placeholder: '',
  twilio_connection_placeholder: '',
  api_auth_placeholder: '',
  internal_service_token_placeholder: '',
};

type ArchConfig = typeof DEFAULT_CONFIG;

export default function SystemArchitectureTab() {
  const [config, setConfig] = useState<ArchConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ai_voice_architecture_config')
      .maybeSingle();
    if (data?.value && typeof data.value === 'object') {
      setConfig({ ...DEFAULT_CONFIG, ...(data.value as Record<string, string>) });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'ai_voice_architecture_config', value: config as any }, { onConflict: 'key' });
    setSaving(false);
    if (error) toast.error('Fehler beim Speichern');
    else toast.success('Architektur-Konfiguration gespeichert');
  }

  function getLayerStatus(layer: SystemLayer): { status: 'ready' | 'configured' | 'missing'; label: string } {
    if (layer.id === 'frontend') return { status: 'ready', label: 'Aktiv' };
    if (layer.id === 'core_backend') return { status: 'ready', label: 'Aktiv (Lovable Cloud)' };
    if (layer.id === 'railway_backend') {
      return config.voice_backend_base_url
        ? { status: 'configured', label: 'URL konfiguriert' }
        : { status: 'missing', label: 'Nicht konfiguriert' };
    }
    if (layer.id === 'openai') {
      return config.openai_connection_placeholder
        ? { status: 'configured', label: 'Platzhalter gesetzt' }
        : { status: 'missing', label: 'Ausstehend' };
    }
    if (layer.id === 'twilio') {
      return config.twilio_connection_placeholder
        ? { status: 'configured', label: 'Platzhalter gesetzt' }
        : { status: 'missing', label: 'Ausstehend' };
    }
    return { status: 'missing', label: 'Unbekannt' };
  }

  const statusIcon = (s: string) => {
    if (s === 'ready') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === 'configured') return <Settings2 className="h-4 w-4 text-amber-500" />;
    return <XCircle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Systemarchitektur</h3>
          <p className="text-sm text-muted-foreground">Zielarchitektur für den produktiven Voice-Betrieb mit Twilio, OpenAI und Railway</p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Konfiguration speichern
        </Button>
      </div>

      {/* Architecture Warning */}
      <div className="flex items-start gap-3 border border-amber-200 rounded-lg bg-amber-50/50 p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-sm text-amber-800">Architektur in Vorbereitung</p>
          <p className="text-xs text-amber-700">Die Zielarchitektur ist definiert, aber noch nicht produktiv verbunden. Aktuell läuft das System im Mock-Modus. Twilio und OpenAI werden später über das Railway Voice Backend angeschlossen.</p>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {LAYERS.map(layer => {
          const s = getLayerStatus(layer);
          const Icon = layer.icon;
          return (
            <Card key={layer.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  s.status === 'ready' ? 'bg-green-500/10' : s.status === 'configured' ? 'bg-amber-500/10' : 'bg-muted'
                }`}>
                  <Icon className={`h-4 w-4 ${layer.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{layer.label.split(' ').slice(0, 2).join(' ')}</p>
                  <div className="flex items-center gap-1">
                    {statusIcon(s.status)}
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Architecture Layers Detail */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2"><Layers className="h-4 w-4" /> Systemschichten</h4>
        {LAYERS.map(layer => {
          const s = getLayerStatus(layer);
          const Icon = layer.icon;
          return (
            <Card key={layer.id} className={s.status === 'missing' ? 'opacity-70 border-dashed' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      s.status === 'ready' ? 'bg-green-500/10' : s.status === 'configured' ? 'bg-amber-500/10' : 'bg-muted'
                    }`}>
                      <Icon className={`h-5 w-5 ${layer.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{layer.label}</p>
                      <p className="text-xs text-muted-foreground">{layer.description}</p>
                    </div>
                  </div>
                  <Badge
                    variant={s.status === 'ready' ? 'default' : s.status === 'configured' ? 'secondary' : 'outline'}
                    className="text-[10px]"
                  >
                    {s.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Verantwortlichkeiten</Label>
                    <ul className="space-y-1">
                      {layer.responsibilities.map(r => (
                        <li key={r} className="flex items-center gap-2 text-xs">
                          <Zap className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {layer.configKeys.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Konfiguration</Label>
                      {layer.configKeys.map(key => (
                        <div key={key} className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground font-mono">{key}</Label>
                          <Input
                            value={(config as any)[key] || ''}
                            onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                            placeholder={`${key} eingeben…`}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Event Flow */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4" /> Kommunikationsfluss</h4>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {EVENT_FLOWS.map((flow, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <Badge variant="outline" className="text-[10px] font-mono min-w-[120px] justify-center">{flow.from}</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Badge variant="outline" className="text-[10px] font-mono min-w-[120px] justify-center">{flow.to}</Badge>
                  <code className="text-[10px] font-mono text-primary bg-primary/5 px-2 py-0.5 rounded">{flow.event}</code>
                  <span className="text-xs text-muted-foreground hidden md:block">{flow.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Global Config */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2"><Settings2 className="h-4 w-4" /> Globale Konfiguration</h4>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Environment Mode</Label>
                <div className="flex items-center gap-4">
                  {['development', 'staging', 'production'].map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="env_mode"
                        checked={config.environment_mode === mode}
                        onChange={() => setConfig(c => ({ ...c, environment_mode: mode }))}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs capitalize">{mode}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono">voice_backend_base_url</Label>
                <Input
                  value={config.voice_backend_base_url}
                  onChange={e => setConfig(c => ({ ...c, voice_backend_base_url: e.target.value }))}
                  placeholder="https://ssm-voice.up.railway.app"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono">public_webhook_url_placeholder</Label>
                <Input
                  value={config.public_webhook_url_placeholder}
                  onChange={e => setConfig(c => ({ ...c, public_webhook_url_placeholder: e.target.value }))}
                  placeholder="https://ssm-voice.up.railway.app/webhooks/twilio"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono">internal_service_token_placeholder</Label>
                <Input
                  value={config.internal_service_token_placeholder}
                  onChange={e => setConfig(c => ({ ...c, internal_service_token_placeholder: e.target.value }))}
                  placeholder="Service-Token für interne Kommunikation"
                  className="h-8 text-xs font-mono"
                  type="password"
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium">Sicherheitshinweis</p>
                <p className="text-[10px] text-muted-foreground">
                  Echte API-Keys und Secrets werden nicht in dieser Konfiguration gespeichert, sondern über sichere Secret-Verwaltung
                  bereitgestellt. Die hier sichtbaren Platzhalter dienen der Architektur-Dokumentation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Railway Deployment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cloud className="h-4 w-4 text-purple-600" />
            Railway Voice Backend – Deployment-Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Das Voice Backend wird als eigenständiger Service auf Railway deployed. Es empfängt Anrufe via Twilio Webhooks,
            orchestriert die Realtime-Kommunikation mit OpenAI und meldet Ergebnisse an das SSM Recruit Core Backend zurück.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border">
              <p className="text-xs font-medium">Technologie</p>
              <p className="text-[10px] text-muted-foreground">Node.js / TypeScript, WebSocket Server, Express/Fastify</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-xs font-medium">Kommunikation</p>
              <p className="text-[10px] text-muted-foreground">REST API + WebSocket zu Twilio & OpenAI</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-xs font-medium">Skalierung</p>
              <p className="text-[10px] text-muted-foreground">Horizontal skalierbar, Stateless pro Call</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Geplante Endpunkte auf Railway</Label>
            <div className="space-y-1.5">
              {[
                { method: 'POST', path: '/calls/outbound', desc: 'Outbound-Call initiieren' },
                { method: 'POST', path: '/webhooks/twilio/voice', desc: 'Twilio Voice Webhook (Inbound)' },
                { method: 'POST', path: '/webhooks/twilio/status', desc: 'Twilio Status Callback' },
                { method: 'WS', path: '/ws/media-stream', desc: 'Twilio Media Stream WebSocket' },
                { method: 'WS', path: '/ws/openai-realtime', desc: 'OpenAI Realtime WebSocket' },
                { method: 'POST', path: '/sessions/:id/action', desc: 'Action-Ergebnis von Core Backend' },
                { method: 'GET', path: '/health', desc: 'Health-Check Endpoint' },
              ].map((ep, i) => (
                <div key={i} className="flex items-center gap-3 border rounded-lg p-2.5">
                  <Badge variant="outline" className={`text-[10px] font-mono min-w-[45px] justify-center ${
                    ep.method === 'WS' ? 'bg-purple-500/10 text-purple-700' :
                    ep.method === 'POST' ? 'bg-blue-500/10 text-blue-700' : 'bg-emerald-500/10 text-emerald-700'
                  }`}>
                    {ep.method}
                  </Badge>
                  <code className="text-[10px] font-mono flex-1">{ep.path}</code>
                  <span className="text-[10px] text-muted-foreground hidden md:block">{ep.desc}</span>
                  <Badge variant="outline" className="text-[10px]">Geplant</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
