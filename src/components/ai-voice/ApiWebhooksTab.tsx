import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Code2, Webhook, AlertTriangle, ArrowRight, Server, Cloud, Monitor } from 'lucide-react';

const INTERNAL_ENDPOINTS = [
  { method: 'POST', path: '/api/voice/inbound-call', desc: 'Eingehender Anruf Webhook (von Railway)', status: 'ready', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/session-complete', desc: 'Session abgeschlossen Callback', status: 'ready', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/escalation', desc: 'Eskalation Webhook', status: 'ready', layer: 'Core Backend' },
  { method: 'GET', path: '/api/voice/agents', desc: 'Agenten Liste abrufen', status: 'ready', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/outbound-call', desc: 'Ausgehenden Anruf starten (→ Railway)', status: 'ready', layer: 'Core Backend' },
  { method: 'GET', path: '/api/voice/sessions/:id', desc: 'Session Details abrufen', status: 'ready', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/campaign/start', desc: 'Kampagne starten (→ Railway)', status: 'pending', layer: 'Core Backend' },
  { method: 'POST', path: '/api/voice/action-result', desc: 'Action-Ergebnis an Railway melden', status: 'ready', layer: 'Core Backend' },
];

const RAILWAY_ENDPOINTS = [
  { method: 'POST', path: '/calls/outbound', desc: 'Outbound-Call via Twilio initiieren', status: 'planned' },
  { method: 'POST', path: '/webhooks/twilio/voice', desc: 'Twilio Voice Webhook (Inbound)', status: 'planned' },
  { method: 'POST', path: '/webhooks/twilio/status', desc: 'Twilio Status Callback', status: 'planned' },
  { method: 'WS', path: '/ws/media-stream', desc: 'Twilio Media Stream WebSocket', status: 'planned' },
  { method: 'WS', path: '/ws/openai-realtime', desc: 'OpenAI Realtime WebSocket Bridge', status: 'planned' },
  { method: 'POST', path: '/sessions/:id/action', desc: 'Action-Ergebnis von Core Backend empfangen', status: 'planned' },
  { method: 'GET', path: '/health', desc: 'Health-Check Endpoint', status: 'planned' },
  { method: 'GET', path: '/status', desc: 'System-Status & aktive Sessions', status: 'planned' },
];

const WEBHOOKS = [
  { name: 'Twilio Inbound Voice', url: '{RAILWAY_URL}/webhooks/twilio/voice', event: 'inbound_call', direction: 'Twilio → Railway', active: false },
  { name: 'Twilio Status Callback', url: '{RAILWAY_URL}/webhooks/twilio/status', event: 'call.status_change', direction: 'Twilio → Railway', active: false },
  { name: 'Session Complete', url: '{CORE_BACKEND}/api/voice/session-complete', event: 'session.complete', direction: 'Railway → Core', active: false },
  { name: 'Escalation Alert', url: '{CORE_BACKEND}/api/voice/escalation', event: 'escalation.created', direction: 'Railway → Core', active: false },
  { name: 'Action Suggestion', url: '{CORE_BACKEND}/api/voice/action-suggest', event: 'action.suggest', direction: 'Railway → Core', active: false },
  { name: 'Turn Update', url: '{CORE_BACKEND}/api/voice/turn-update', event: 'session.turn_added', direction: 'Railway → Core', active: false },
];

function MethodBadge({ method }: { method: string }) {
  const colors = {
    POST: 'bg-blue-500/10 text-blue-700',
    GET: 'bg-emerald-500/10 text-emerald-700',
    WS: 'bg-purple-500/10 text-purple-700',
    PUT: 'bg-amber-500/10 text-amber-700',
  };
  return (
    <Badge variant="outline" className={`text-[10px] font-mono min-w-[45px] justify-center ${(colors as any)[method] || ''}`}>
      {method}
    </Badge>
  );
}

export default function ApiWebhooksTab() {
  return (
    <div className="space-y-6">
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

      {/* Communication Flow Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">Kommunikationsfluss</CardTitle>
        </CardHeader>
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
        </CardContent>
      </Card>

      {/* Core Backend Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4" />
            Core Backend API-Endpunkte (Edge Functions)
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
            <Cloud className="h-4 w-4 text-purple-600" />
            Railway Voice Backend Endpunkte
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

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Webhook className="h-4 w-4" />
            Webhook-Konfiguration
          </CardTitle>
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
                  {wh.active ? 'Aktiv' : 'Konfiguration ausstehend'}
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
