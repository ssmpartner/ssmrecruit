import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Code2, Webhook, Copy, ExternalLink, AlertTriangle } from 'lucide-react';

const ENDPOINTS = [
  { method: 'POST', path: '/api/voice/inbound-call', description: 'Eingehender Anruf Webhook', status: 'ready' },
  { method: 'POST', path: '/api/voice/session-complete', description: 'Session abgeschlossen Callback', status: 'ready' },
  { method: 'POST', path: '/api/voice/escalation', description: 'Eskalation Webhook', status: 'ready' },
  { method: 'GET', path: '/api/voice/agents', description: 'Agenten Liste abrufen', status: 'ready' },
  { method: 'POST', path: '/api/voice/outbound-call', description: 'Ausgehenden Anruf starten', status: 'pending' },
  { method: 'GET', path: '/api/voice/sessions/:id', description: 'Session Details abrufen', status: 'ready' },
  { method: 'POST', path: '/api/voice/campaign/start', description: 'Kampagne starten', status: 'pending' },
];

const WEBHOOKS = [
  { name: 'Twilio Inbound', url: '', event: 'inbound_call', active: false },
  { name: 'Session Complete', url: '', event: 'session_complete', active: false },
  { name: 'Escalation Alert', url: '', event: 'escalation_created', active: false },
];

export default function ApiWebhooksTab() {
  return (
    <div className="space-y-6">
      {/* Warning */}
      <div className="flex items-start gap-3 border border-amber-200 rounded-lg bg-amber-50/50 p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-sm text-amber-800">API noch nicht produktiv</p>
          <p className="text-xs text-amber-700">Die API-Endpunkte sind vorbereitet, aber noch nicht mit echten Providern verbunden. Aktuell werden Mock-Daten verwendet.</p>
        </div>
      </div>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            API-Endpunkte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ENDPOINTS.map((ep, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3">
                <Badge variant="outline" className={`text-[10px] font-mono min-w-[50px] justify-center ${ep.method === 'POST' ? 'bg-blue-500/10 text-blue-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                  {ep.method}
                </Badge>
                <code className="text-xs font-mono flex-1">{ep.path}</code>
                <span className="text-xs text-muted-foreground hidden md:block">{ep.description}</span>
                <Badge variant={ep.status === 'ready' ? 'default' : 'secondary'} className="text-[10px]">
                  {ep.status === 'ready' ? 'Bereit' : 'Geplant'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {WEBHOOKS.map((wh, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <p className="font-medium text-sm">{wh.name}</p>
                  <p className="text-xs text-muted-foreground">Event: <code className="text-[10px]">{wh.event}</code></p>
                  {wh.url ? (
                    <code className="text-[10px] text-muted-foreground">{wh.url}</code>
                  ) : (
                    <p className="text-[10px] text-amber-600 italic">Keine URL konfiguriert</p>
                  )}
                </div>
                <Badge variant={wh.active ? 'default' : 'outline'} className="text-[10px]">
                  {wh.active ? 'Aktiv' : 'Inaktiv'}
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
