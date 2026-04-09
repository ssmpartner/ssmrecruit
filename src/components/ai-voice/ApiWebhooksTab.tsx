import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Code2, Webhook, AlertTriangle, ArrowRight, Server, Cloud, Monitor,
  Search, RefreshCw, CheckCircle2, XCircle, Clock, Activity, RotateCcw,
  FileWarning, Eye, Shield, Zap
} from 'lucide-react';

// ── Webhook Event Types ───────────────────────────────────────────

interface WebhookEventType {
  type: string;
  label: string;
  source: string;
  target: string;
  description: string;
  payloadFields: string[];
}

const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  { type: 'inbound_call_event', label: 'Eingehender Anruf', source: 'Twilio', target: 'Railway → Core', description: 'Neuer eingehender Anruf von einem Kandidaten', payloadFields: ['call_sid', 'from', 'to', 'direction', 'status'] },
  { type: 'outbound_call_event', label: 'Ausgehender Anruf', source: 'Railway', target: 'Core', description: 'Ergebnis eines ausgehenden Anrufs', payloadFields: ['call_sid', 'session_id', 'agent_id', 'status', 'duration'] },
  { type: 'session_status_event', label: 'Session-Status', source: 'Railway', target: 'Core', description: 'Session-Zustandswechsel (queued → active → completed)', payloadFields: ['session_id', 'from_state', 'to_state', 'timestamp', 'metadata'] },
  { type: 'action_event', label: 'Aktionsereignis', source: 'Railway', target: 'Core (Action Gateway)', description: 'KI schlägt eine Aktion vor oder führt sie aus', payloadFields: ['action_type', 'session_id', 'lead_id', 'confidence', 'rollout_mode', 'payload'] },
  { type: 'escalation_event', label: 'Eskalation', source: 'Railway', target: 'Core', description: 'Eskalation an menschlichen Mitarbeiter', payloadFields: ['session_id', 'agent_id', 'lead_id', 'reason', 'priority'] },
  { type: 'provider_error_event', label: 'Provider-Fehler', source: 'Railway / Twilio', target: 'Core', description: 'Fehler bei einem externen Provider', payloadFields: ['provider', 'error_code', 'error_message', 'session_id', 'recoverable'] },
  { type: 'cost_event', label: 'Kostenereignis', source: 'Railway', target: 'Core', description: 'Kostenabrechnung nach Session-Ende', payloadFields: ['session_id', 'cost_ai', 'cost_telephony', 'cost_total', 'currency'] },
  { type: 'compliance_event', label: 'Compliance-Ereignis', source: 'Railway / Core', target: 'Core', description: 'Compliance-Verstoss oder -Flag erkannt', payloadFields: ['session_id', 'rule_id', 'severity', 'detail', 'auto_action'] },
];

// ── Mock Event Logs ───────────────────────────────────────────────

interface EventLog {
  id: string;
  event_type: string;
  source_system: string;
  source_runtime: string;
  target: string;
  status: 'delivered' | 'failed' | 'retrying' | 'dead_letter';
  retries: number;
  payload_preview: string;
  created_at: string;
  processed_at: string | null;
}

const MOCK_EVENT_LOGS: EventLog[] = [
  { id: 'evt-001', event_type: 'session_status_event', source_system: 'railway_voice', source_runtime: 'railway', target: 'core_backend', status: 'delivered', retries: 0, payload_preview: '{"session_id":"s1","from_state":"active","to_state":"completed"}', created_at: '2026-04-09T09:15:28Z', processed_at: '2026-04-09T09:15:28Z' },
  { id: 'evt-002', event_type: 'action_event', source_system: 'railway_voice', source_runtime: 'railway', target: 'action_gateway', status: 'delivered', retries: 0, payload_preview: '{"action_type":"schedule_callback","session_id":"s1","confidence":0.92}', created_at: '2026-04-09T09:15:26Z', processed_at: '2026-04-09T09:15:27Z' },
  { id: 'evt-003', event_type: 'cost_event', source_system: 'railway_voice', source_runtime: 'railway', target: 'core_backend', status: 'delivered', retries: 0, payload_preview: '{"session_id":"s1","cost_total":0.85,"currency":"CHF"}', created_at: '2026-04-09T09:15:30Z', processed_at: '2026-04-09T09:15:30Z' },
  { id: 'evt-004', event_type: 'escalation_event', source_system: 'railway_voice', source_runtime: 'railway', target: 'core_backend', status: 'delivered', retries: 1, payload_preview: '{"session_id":"s5","reason":"Kandidat möchte Mensch","priority":"high"}', created_at: '2026-04-08T11:20:30Z', processed_at: '2026-04-08T11:20:32Z' },
  { id: 'evt-005', event_type: 'provider_error_event', source_system: 'twilio', source_runtime: 'railway', target: 'core_backend', status: 'failed', retries: 3, payload_preview: '{"provider":"twilio","error_code":"31005","error_message":"Connection timeout"}', created_at: '2026-04-08T10:05:00Z', processed_at: null },
  { id: 'evt-006', event_type: 'compliance_event', source_system: 'railway_voice', source_runtime: 'railway', target: 'core_backend', status: 'delivered', retries: 0, payload_preview: '{"rule_id":"consent","severity":"high","detail":"Aufnahmehinweis fehlte"}', created_at: '2026-04-07T16:45:00Z', processed_at: '2026-04-07T16:45:01Z' },
  { id: 'evt-007', event_type: 'inbound_call_event', source_system: 'twilio', source_runtime: 'railway', target: 'core_backend', status: 'retrying', retries: 2, payload_preview: '{"call_sid":"CA123","from":"+41791234567","to":"+41441234567"}', created_at: '2026-04-07T14:20:00Z', processed_at: null },
  { id: 'evt-008', event_type: 'session_status_event', source_system: 'railway_voice', source_runtime: 'railway', target: 'core_backend', status: 'dead_letter', retries: 5, payload_preview: '{"session_id":"s-old","from_state":"ringing","to_state":"failed"}', created_at: '2026-04-06T09:00:00Z', processed_at: null },
];

// ── Retry Queue Mock ──────────────────────────────────────────────

const MOCK_RETRY_QUEUE = MOCK_EVENT_LOGS.filter(e => e.status === 'retrying' || e.status === 'dead_letter');

// ── Endpoint Definitions ──────────────────────────────────────────

const INTERNAL_ENDPOINTS = [
  { method: 'POST', path: '/api/voice/inbound-call', desc: 'Eingehender Anruf Webhook (von Railway)', status: 'ready', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/session-complete', desc: 'Session abgeschlossen Callback', status: 'ready', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/escalation', desc: 'Eskalation Webhook', status: 'ready', layer: 'Core Backend' },
  { method: 'GET', path: '/api/voice/agents', desc: 'Agenten Liste abrufen', status: 'ready', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/outbound-call', desc: 'Ausgehenden Anruf starten (→ Railway)', status: 'ready', layer: 'Core Backend' },
  { method: 'GET', path: '/api/voice/sessions/:id', desc: 'Session Details abrufen', status: 'ready', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/campaign/start', desc: 'Kampagne starten (→ Railway)', status: 'pending', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/action-result', desc: 'Action-Ergebnis an Railway melden', status: 'ready', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/webhook/inbound', desc: 'Webhook-Empfang für externe Events', status: 'ready', layer: 'Core Backend' },
];

const RAILWAY_ENDPOINTS = [
  { method: 'POST', path: '/calls/outbound', desc: 'Outbound-Call via Twilio initiieren', status: 'planned' },
  { method: 'POST', path: '/webhooks/twilio/voice', desc: 'Twilio Voice Webhook (Inbound)', status: 'planned' },
  { method: 'POST', path: '/webhooks/twilio/status', desc: 'Twilio Status Callback', status: 'planned' },
  { method: 'WS', path: '/ws/media-stream', desc: 'Twilio Media Stream WebSocket', status: 'planned' },
  { method: 'WS', path: '/ws/openai-realtime', desc: 'OpenAI Realtime WebSocket Bridge', status: 'planned' },
  { method: 'POST', path: '/sessions/:id/action', desc: 'Action-Ergebnis von Core Backend empfangen', status: 'planned' },
  { method: 'POST', path: '/events/dispatch', desc: 'Event-Dispatch an Core Backend', status: 'planned' },
  { method: 'GET', path: '/health', desc: 'Health-Check Endpoint', status: 'planned' },
  { method: 'GET', path: '/status', desc: 'System-Status & aktive Sessions', status: 'planned' },
];

const WEBHOOKS = [
  { name: 'Twilio Inbound Voice', url: '{RAILWAY_URL}/webhooks/twilio/voice', event: 'inbound_call_event', direction: 'Twilio → Railway', active: false },
  { name: 'Twilio Status Callback', url: '{RAILWAY_URL}/webhooks/twilio/status', event: 'session_status_event', direction: 'Twilio → Railway', active: false },
  { name: 'Session Complete', url: '{CORE_BACKEND}/api/voice/session-complete', event: 'session_status_event', direction: 'Railway → Core', active: false },
  { name: 'Escalation Alert', url: '{CORE_BACKEND}/api/voice/escalation', event: 'escalation_event', direction: 'Railway → Core', active: false },
  { name: 'Action Suggestion', url: '{CORE_BACKEND}/api/voice/action-suggest', event: 'action_event', direction: 'Railway → Core', active: false },
  { name: 'Cost Report', url: '{CORE_BACKEND}/api/voice/cost-report', event: 'cost_event', direction: 'Railway → Core', active: false },
  { name: 'Provider Error', url: '{CORE_BACKEND}/api/voice/provider-error', event: 'provider_error_event', direction: 'Railway → Core', active: false },
  { name: 'Compliance Flag', url: '{CORE_BACKEND}/api/voice/compliance-flag', event: 'compliance_event', direction: 'Railway → Core', active: false },
];

// ── Helpers ───────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    POST: 'bg-blue-500/10 text-blue-700',
    GET: 'bg-emerald-500/10 text-emerald-700',
    WS: 'bg-purple-500/10 text-purple-700',
    PUT: 'bg-amber-500/10 text-amber-700',
  };
  return (
    <Badge variant="outline" className={`text-[10px] font-mono min-w-[45px] justify-center ${colors[method] || ''}`}>
      {method}
    </Badge>
  );
}

function EventStatusBadge({ status }: { status: EventLog['status'] }) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }> = {
    delivered: { variant: 'default', label: 'Zugestellt', icon: <CheckCircle2 className="h-3 w-3 mr-0.5" /> },
    failed: { variant: 'destructive', label: 'Fehlgeschlagen', icon: <XCircle className="h-3 w-3 mr-0.5" /> },
    retrying: { variant: 'secondary', label: 'Retry', icon: <RefreshCw className="h-3 w-3 mr-0.5" /> },
    dead_letter: { variant: 'outline', label: 'Dead Letter', icon: <FileWarning className="h-3 w-3 mr-0.5" /> },
  };
  const m = map[status] || { variant: 'secondary' as const, label: status, icon: null };
  return <Badge variant={m.variant} className="text-[10px] flex items-center gap-0">{m.icon}{m.label}</Badge>;
}

// ── Main Component ────────────────────────────────────────────────

export default function ApiWebhooksTab() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview" className="gap-1 text-xs"><Code2 className="h-3 w-3" />API Übersicht</TabsTrigger>
          <TabsTrigger value="events" className="gap-1 text-xs"><Zap className="h-3 w-3" />Webhook Events</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1 text-xs"><Activity className="h-3 w-3" />Event Logs</TabsTrigger>
          <TabsTrigger value="health" className="gap-1 text-xs"><CheckCircle2 className="h-3 w-3" />Health</TabsTrigger>
          <TabsTrigger value="retry" className="gap-1 text-xs"><RotateCcw className="h-3 w-3" />Retry Queue</TabsTrigger>
          <TabsTrigger value="errors" className="gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Fehler</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><ApiOverviewSection /></TabsContent>
        <TabsContent value="events"><WebhookEventsSection /></TabsContent>
        <TabsContent value="logs"><EventLogsSection /></TabsContent>
        <TabsContent value="health"><HealthStatusSection /></TabsContent>
        <TabsContent value="retry"><RetryQueueSection /></TabsContent>
        <TabsContent value="errors"><ErrorLogSection /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Tab: API Overview ─────────────────────────────────────────────

function ApiOverviewSection() {
  return (
    <div className="space-y-6 mt-4">
      {/* Architecture Info */}
      <div className="flex items-start gap-3 border border-amber-200 rounded-lg bg-amber-50/50 p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-sm text-amber-800">API-Architektur vorbereitet</p>
          <p className="text-xs text-amber-700">
            Die Endpunkte sind nach Zielarchitektur definiert: SSM Recruit Core Backend (Edge Functions) kommuniziert
            mit dem Railway Voice Backend. Twilio-Webhooks zeigen auf Railway, nicht direkt auf SSM Recruit.
          </p>
        </div>
      </div>

      {/* Communication Flow */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm">Kommunikationsfluss</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 flex-wrap py-3">
            <Badge variant="outline" className="text-xs"><Monitor className="h-3 w-3 mr-1" />Frontend</Badge>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="text-xs"><Server className="h-3 w-3 mr-1" />Core Backend</Badge>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="text-xs"><Cloud className="h-3 w-3 mr-1" />Railway Voice</Badge>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">Twilio / OpenAI</Badge>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Railway sendet Events an SSM Recruit Core. Twilio liefert Events an Railway. OpenAI ist eine Runtime-Komponente ohne eigene Event-Dispatch-Logik.
          </p>
        </CardContent>
      </Card>

      {/* Core Backend Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4" />Core Backend API-Endpunkte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {INTERNAL_ENDPOINTS.map((ep, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3">
                <MethodBadge method={ep.method} />
                <code className="text-xs font-mono flex-1">{ep.path}</code>
                <span className="text-xs text-muted-foreground hidden md:block">{ep.desc}</span>
                <Badge variant={ep.status === 'ready' ? 'default' : 'secondary'} className="text-[10px]">
                  {ep.status === 'ready' ? 'Bereit' : 'Geplant'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Railway Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cloud className="h-4 w-4 text-purple-600" />Railway Voice Backend Endpunkte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {RAILWAY_ENDPOINTS.map((ep, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3 border-dashed">
                <MethodBadge method={ep.method} />
                <code className="text-xs font-mono flex-1">{ep.path}</code>
                <span className="text-xs text-muted-foreground hidden md:block">{ep.desc}</span>
                <Badge variant="outline" className="text-[10px]">Geplant</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><Webhook className="h-4 w-4" />Webhook-Konfiguration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {WEBHOOKS.map((wh, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{wh.name}</p>
                    <Badge variant="outline" className="text-[10px]">{wh.direction}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Event: <code className="text-[10px]">{wh.event}</code></p>
                  <code className="text-[10px] text-amber-600 italic">{wh.url}</code>
                </div>
                <Badge variant={wh.active ? 'default' : 'outline'} className="text-[10px]">
                  {wh.active ? 'Aktiv' : 'Ausstehend'}
                </Badge>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-4">
            <Webhook className="h-3.5 w-3.5 mr-1" />Webhook hinzufügen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Webhook Events ───────────────────────────────────────────

function WebhookEventsSection() {
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventType | null>(null);

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">Alle unterstützten Webhook-Event-Typen für die Runtime-Kommunikation zwischen Railway, Twilio und SSM Recruit.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {WEBHOOK_EVENT_TYPES.map(evt => (
          <Card key={evt.type} className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedEvent?.type === evt.type ? 'border-primary' : ''}`} onClick={() => setSelectedEvent(evt)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <code className="text-xs font-mono font-semibold text-primary">{evt.type}</code>
                <Badge variant="outline" className="text-[10px]">{evt.source}</Badge>
              </div>
              <p className="text-sm font-medium">{evt.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{evt.description}</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{evt.target}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedEvent && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Payload: {selectedEvent.type}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 font-mono text-xs">
              <p className="text-muted-foreground mb-2">{'{'}</p>
              <p className="ml-4">"event_type": "<span className="text-primary">{selectedEvent.type}</span>",</p>
              <p className="ml-4">"source": "<span className="text-primary">{selectedEvent.source.toLowerCase().replace(/\s/g, '_')}</span>",</p>
              <p className="ml-4">"timestamp": "2026-04-09T10:00:00Z",</p>
              <p className="ml-4">"signature": "sha256=...",</p>
              <p className="ml-4">"payload": {'{'}</p>
              {selectedEvent.payloadFields.map((f, i) => (
                <p key={f} className="ml-8">"{f}": "..."{i < selectedEvent.payloadFields.length - 1 ? ',' : ''}</p>
              ))}
              <p className="ml-4">{'}'},</p>
              <p className="ml-4">"retry_count": 0,</p>
              <p className="ml-4">"idempotency_key": "evt-..."</p>
              <p className="text-muted-foreground">{'}'}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px]"><Shield className="h-3 w-3 mr-0.5" />Signaturvalidierung</Badge>
              <Badge variant="outline" className="text-[10px]"><RotateCcw className="h-3 w-3 mr-0.5" />Retry: 3× exponentiell</Badge>
              <Badge variant="outline" className="text-[10px]"><FileWarning className="h-3 w-3 mr-0.5" />Dead Letter nach 5 Versuchen</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Event Logs ───────────────────────────────────────────────

function EventLogsSection() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = MOCK_EVENT_LOGS.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (search && !e.event_type.includes(search.toLowerCase()) && !e.source_system.includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Event oder Source suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="delivered">Zugestellt</SelectItem>
            <SelectItem value="failed">Fehlgeschlagen</SelectItem>
            <SelectItem value="retrying">Retry</SelectItem>
            <SelectItem value="dead_letter">Dead Letter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Runtime</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead>Payload</TableHead>
              <TableHead>Zeitpunkt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell><code className="text-xs font-mono">{e.event_type}</code></TableCell>
                <TableCell className="text-xs">{e.source_system}</TableCell>
                <TableCell className="text-xs">{e.source_runtime}</TableCell>
                <TableCell className="text-xs">{e.target}</TableCell>
                <TableCell><EventStatusBadge status={e.status} /></TableCell>
                <TableCell className="text-xs text-center">{e.retries}</TableCell>
                <TableCell>
                  <code className="text-[10px] text-muted-foreground block max-w-[200px] truncate">{e.payload_preview}</code>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('de-CH')}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Keine Events gefunden</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ── Tab: Health Status ────────────────────────────────────────────

function HealthStatusSection() {
  const healthChecks = [
    { name: 'Core Backend (Edge Functions)', status: 'healthy', latency: '45ms', lastCheck: '2026-04-09T10:00:00Z' },
    { name: 'Action Gateway', status: 'healthy', latency: '52ms', lastCheck: '2026-04-09T10:00:00Z' },
    { name: 'Railway Voice Backend', status: 'not_configured', latency: '—', lastCheck: '—' },
    { name: 'Twilio Provider', status: 'not_configured', latency: '—', lastCheck: '—' },
    { name: 'OpenAI Realtime', status: 'not_configured', latency: '—', lastCheck: '—' },
    { name: 'Webhook Dispatch', status: 'healthy', latency: '12ms', lastCheck: '2026-04-09T10:00:00Z' },
    { name: 'Event Queue', status: 'healthy', latency: '8ms', lastCheck: '2026-04-09T10:00:00Z' },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {healthChecks.map(hc => (
          <Card key={hc.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{hc.name}</p>
                {hc.status === 'healthy' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {hc.status === 'not_configured' && <Clock className="h-4 w-4 text-muted-foreground" />}
                {hc.status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Latenz: {hc.latency}</span>
                <Badge variant={hc.status === 'healthy' ? 'default' : hc.status === 'error' ? 'destructive' : 'outline'} className="text-[10px]">
                  {hc.status === 'healthy' ? 'Gesund' : hc.status === 'not_configured' ? 'Nicht konfiguriert' : 'Fehler'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Retry Queue ──────────────────────────────────────────────

function RetryQueueSection() {
  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-start gap-3 border rounded-lg p-4 bg-muted/30">
        <RotateCcw className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <p className="font-medium text-sm">Retry-Verarbeitung</p>
          <p className="text-xs text-muted-foreground">
            Events die nicht zugestellt werden konnten, werden automatisch bis zu 3× mit exponentiellem Backoff wiederholt.
            Nach 5 fehlgeschlagenen Versuchen werden sie in die Dead Letter Queue verschoben.
          </p>
        </div>
      </div>

      {MOCK_RETRY_QUEUE.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Keine Events in der Retry Queue</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Payload</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_RETRY_QUEUE.map(e => (
                <TableRow key={e.id}>
                  <TableCell><code className="text-xs font-mono">{e.event_type}</code></TableCell>
                  <TableCell><EventStatusBadge status={e.status} /></TableCell>
                  <TableCell className="text-xs text-center">{e.retries}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('de-CH')}</TableCell>
                  <TableCell><code className="text-[10px] text-muted-foreground block max-w-[200px] truncate">{e.payload_preview}</code></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-xs"><RefreshCw className="h-3 w-3 mr-1" />Retry</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Error Log ────────────────────────────────────────────────

function ErrorLogSection() {
  const errors = MOCK_EVENT_LOGS.filter(e => e.status === 'failed' || e.status === 'dead_letter');

  return (
    <div className="space-y-4 mt-4">
      {errors.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Keine Fehler in den letzten 7 Tagen</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{errors.length}</p>
                <p className="text-xs text-muted-foreground">Fehler gesamt</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{errors.filter(e => e.status === 'failed').length}</p>
                <p className="text-xs text-muted-foreground">Fehlgeschlagen</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{errors.filter(e => e.status === 'dead_letter').length}</p>
                <p className="text-xs text-muted-foreground">Dead Letter</p>
              </CardContent>
            </Card>
          </div>

          {errors.map(e => (
            <Card key={e.id} className="border-destructive/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-xs font-mono font-semibold">{e.event_type}</code>
                  <EventStatusBadge status={e.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div><span className="text-muted-foreground">Source:</span> {e.source_system}</div>
                  <div><span className="text-muted-foreground">Retries:</span> {e.retries}</div>
                  <div><span className="text-muted-foreground">Erstellt:</span> {new Date(e.created_at).toLocaleString('de-CH')}</div>
                  <div><span className="text-muted-foreground">Target:</span> {e.target}</div>
                </div>
                <div className="bg-muted rounded p-2">
                  <code className="text-[10px] text-muted-foreground break-all">{e.payload_preview}</code>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
