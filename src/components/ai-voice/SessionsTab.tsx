import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, PhoneIncoming, PhoneOutgoing, User, Eye, Search, Filter, DollarSign, Clock, Zap, AlertTriangle, Activity, Server } from 'lucide-react';
import {
  SESSION_STATE_META,
  EVENT_LABELS,
  buildMockEventsForSession,
  type SessionState,
  type SessionEvent,
} from '@/lib/ai-voice-session-orchestrator';

const MOCK_SESSIONS = [
  { id: 's1', session_uid: 'MOCK-001', agent_name: 'SSM Recruiting Bot', lead_name: 'Max Mustermann', agency: 'SSM Zürich', direction: 'outbound', status: 'completed', lifecycle_state: 'completed' as SessionState, duration: 28, sentiment: 'positive', outcome: 'appointment_scheduled', result_type: 'success', phone_from: '+41 44 123 45 67', phone_to: '+41 79 987 65 43', cost_total: 0.85, cost_ai: 0.45, cost_tel: 0.40, transcript_status: 'completed', escalation_status: 'none', created_at: '2026-04-09T09:15:00Z', is_test: true, environment: 'sandbox',
    turns: [
      { index: 0, speaker: 'system', text: 'Anruf wird verbunden...', intent: 'system_event', confidence: 1, latency: 0 },
      { index: 1, speaker: 'assistant', text: 'Guten Tag, hier spricht der SSM Recruiting-Assistent. Ich rufe Sie an bezüglich Ihrer Bewerbung als Finanzberater.', intent: 'greeting', confidence: 0.97, latency: 120 },
      { index: 2, speaker: 'candidate', text: 'Ja, hallo. Worum geht es genau?', intent: 'inquiry', confidence: 0.92, latency: 0 },
      { index: 3, speaker: 'assistant', text: 'Wir möchten gerne einen persönlichen Termin mit Ihnen vereinbaren. Wann passt es Ihnen?', intent: 'schedule_request', confidence: 0.95, latency: 180 },
      { index: 4, speaker: 'candidate', text: 'Nächste Woche Dienstag Nachmittag wäre gut.', intent: 'time_proposal', confidence: 0.89, latency: 0 },
      { index: 5, speaker: 'assistant', text: 'Perfekt, Dienstag 14:00 Uhr ist eingetragen. Vielen Dank!', intent: 'confirmation', confidence: 0.96, latency: 150 },
    ],
    actions: [{ type: 'create_appointment', target: 'Lead', mode: 'suggested', result: 'pending_approval' }],
    summary: 'Terminvereinbarung erfolgreich. Kandidat interessiert, Termin Dienstag 14:00.',
  },
  { id: 's2', session_uid: 'MOCK-002', agent_name: 'SSM Inbound Assistent', lead_name: 'Thomas Meier', agency: 'SSM Bern', direction: 'inbound', status: 'completed', lifecycle_state: 'completed' as SessionState, duration: 32, sentiment: 'positive', outcome: 'lead_created', result_type: 'success', phone_from: '+41 79 123 45 67', phone_to: '+41 44 123 45 67', cost_total: 0.92, cost_ai: 0.52, cost_tel: 0.40, transcript_status: 'completed', escalation_status: 'none', created_at: '2026-04-09T08:45:00Z', is_test: true, environment: 'sandbox', turns: [], actions: [], summary: 'Neuer Interessent qualifiziert und als Lead angelegt.' },
  { id: 's3', session_uid: 'MOCK-003', agent_name: 'SSM Recruiting Bot', lead_name: 'Anna Keller', agency: 'SSM Zürich', direction: 'outbound', status: 'no_answer', lifecycle_state: 'failed' as SessionState, duration: 0, sentiment: 'neutral', outcome: 'no_answer', result_type: 'retry', phone_from: '+41 44 123 45 67', phone_to: '+41 78 555 12 34', cost_total: 0.05, cost_ai: 0, cost_tel: 0.05, transcript_status: 'none', escalation_status: 'none', created_at: '2026-04-08T16:30:00Z', is_test: true, environment: 'sandbox', turns: [], actions: [], summary: 'Keine Antwort. Retry geplant.' },
  { id: 's4', session_uid: 'MOCK-004', agent_name: 'SSM Recruiting Bot', lead_name: 'Peter Schmid', agency: 'SSM Zürich', direction: 'outbound', status: 'completed', lifecycle_state: 'completed' as SessionState, duration: 45, sentiment: 'negative', outcome: 'not_interested', result_type: 'closed', phone_from: '+41 44 123 45 67', phone_to: '+41 76 333 44 55', cost_total: 1.20, cost_ai: 0.70, cost_tel: 0.50, transcript_status: 'completed', escalation_status: 'none', created_at: '2026-04-08T14:00:00Z', is_test: true, environment: 'sandbox', turns: [], actions: [], summary: 'Kandidat nicht interessiert. Position passt nicht.' },
  { id: 's5', session_uid: 'MOCK-005', agent_name: 'SSM Recruiting Bot', lead_name: 'Lisa Weber', agency: 'SSM Bern', direction: 'outbound', status: 'completed', lifecycle_state: 'escalated' as SessionState, duration: 35, sentiment: 'positive', outcome: 'callback_requested', result_type: 'follow_up', phone_from: '+41 44 123 45 67', phone_to: '+41 79 222 33 44', cost_total: 0.95, cost_ai: 0.55, cost_tel: 0.40, transcript_status: 'completed', escalation_status: 'escalated', created_at: '2026-04-08T11:20:00Z', is_test: true, environment: 'sandbox', turns: [], actions: [], summary: 'Rückruf gewünscht. Eskalation an Berater.' },
];

type MockSession = typeof MOCK_SESSIONS[0];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    completed: { variant: 'default', label: 'Abgeschlossen' },
    no_answer: { variant: 'secondary', label: 'Keine Antwort' },
    failed: { variant: 'destructive', label: 'Fehlgeschlagen' },
    in_progress: { variant: 'outline', label: 'Laufend' },
  };
  const m = map[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={m.variant} className="text-[10px]">{m.label}</Badge>;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (sentiment === 'positive') return <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100">Positiv</Badge>;
  if (sentiment === 'negative') return <Badge className="text-[10px] bg-red-100 text-red-800 hover:bg-red-100">Negativ</Badge>;
  return <Badge variant="outline" className="text-[10px]">Neutral</Badge>;
}

function LifecycleStateBadge({ state }: { state: SessionState }) {
  const meta = SESSION_STATE_META[state];
  if (!meta) return null;
  return <Badge className={`text-[10px] ${meta.color} hover:${meta.color}`}>{meta.icon} {meta.label}</Badge>;
}

export default function SessionsTab() {
  const [selected, setSelected] = useState<MockSession | null>(null);
  const [dirFilter, setDirFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = MOCK_SESSIONS.filter(s => {
    if (dirFilter !== 'all' && s.direction !== dirFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.lead_name.toLowerCase().includes(search.toLowerCase()) && !s.agent_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Call Sessions</h3>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Lead oder Agent suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={dirFilter} onValueChange={setDirFilter}>
          <SelectTrigger className="w-[150px]"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Alle Richtungen</SelectItem><SelectItem value="outbound">Outbound</SelectItem><SelectItem value="inbound">Inbound</SelectItem></SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Alle Status</SelectItem><SelectItem value="completed">Abgeschlossen</SelectItem><SelectItem value="no_answer">Keine Antwort</SelectItem><SelectItem value="failed">Fehlgeschlagen</SelectItem></SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead><TableHead>Agent</TableHead><TableHead>Agentur</TableHead><TableHead>Richtung</TableHead><TableHead>Status</TableHead><TableHead>Lifecycle</TableHead><TableHead>Dauer</TableHead><TableHead>Stimmung</TableHead><TableHead>Kosten</TableHead><TableHead>Datum</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(s => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(s)}>
                <TableCell className="font-medium">{s.lead_name}</TableCell>
                <TableCell className="text-sm">{s.agent_name}</TableCell>
                <TableCell className="text-sm">{s.agency}</TableCell>
                <TableCell>{s.direction === 'outbound' ? <PhoneOutgoing className="h-4 w-4" /> : <PhoneIncoming className="h-4 w-4" />}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell><LifecycleStateBadge state={s.lifecycle_state} /></TableCell>
                <TableCell className="text-sm">{s.duration}s</TableCell>
                <TableCell><SentimentBadge sentiment={s.sentiment} /></TableCell>
                <TableCell className="text-sm">{s.cost_total.toFixed(2)} CHF</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString('de-CH')}</TableCell>
                <TableCell><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Keine Sessions gefunden</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && <SessionDetail session={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Session Detail with Tabs ──────────────────────────────────────

function SessionDetail({ session: s }: { session: MockSession }) {
  const events = buildMockEventsForSession({
    status: s.status,
    direction: s.direction,
    duration: s.duration,
    outcome: s.outcome,
    sentiment: s.sentiment,
    escalation_status: s.escalation_status,
    created_at: s.created_at,
    is_test: s.is_test,
    turns: s.turns,
    actions: s.actions,
  });

  return (
    <div className="space-y-5">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          {s.direction === 'outbound' ? <PhoneOutgoing className="h-5 w-5" /> : <PhoneIncoming className="h-5 w-5" />}
          Session {s.session_uid}
        </SheetTitle>
      </SheetHeader>

      <div className="flex gap-2 flex-wrap">
        <StatusBadge status={s.status} />
        <LifecycleStateBadge state={s.lifecycle_state} />
        <SentimentBadge sentiment={s.sentiment} />
        <Badge variant="outline" className="text-[10px]">{s.outcome.replace(/_/g, ' ')}</Badge>
        {s.is_test && <Badge variant="secondary" className="text-[10px]">Test</Badge>}
        {s.escalation_status !== 'none' && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Eskaliert</Badge>}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="conversation">Gespräch</TabsTrigger>
          <TabsTrigger value="technical">Technik</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><Label className="text-xs text-muted-foreground">Lead</Label><p className="font-medium">{s.lead_name}</p></div>
            <div><Label className="text-xs text-muted-foreground">Agent</Label><p className="font-medium">{s.agent_name}</p></div>
            <div><Label className="text-xs text-muted-foreground">Agentur</Label><p>{s.agency}</p></div>
            <div><Label className="text-xs text-muted-foreground">Richtung</Label><p>{s.direction}</p></div>
            <div><Label className="text-xs text-muted-foreground">Von</Label><p className="font-mono text-xs">{s.phone_from}</p></div>
            <div><Label className="text-xs text-muted-foreground">An</Label><p className="font-mono text-xs">{s.phone_to}</p></div>
            <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span>{s.duration}s Dauer</span></div>
            <div className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /><span>{s.cost_total.toFixed(2)} CHF (AI: {s.cost_ai}, Tel: {s.cost_tel})</span></div>
          </div>
          <Separator />
          <div><Label className="text-xs text-muted-foreground">Zusammenfassung</Label><p className="text-sm mt-1">{s.summary}</p></div>

          {/* Lifecycle State Flow */}
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Session Lifecycle</Label>
            <SessionStateFlow currentState={s.lifecycle_state} />
          </div>

          {s.actions.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Ausgeführte Aktionen</Label>
                {s.actions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/40">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm">{a.type} → {a.target}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">{a.mode}: {a.result}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Event Timeline Tab */}
        <TabsContent value="timeline" className="mt-4">
          <EventTimeline events={events} />
        </TabsContent>

        {/* Conversation Tab */}
        <TabsContent value="conversation" className="mt-4">
          {s.turns.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {s.turns.map(t => (
                <div key={t.index} className={`flex ${t.speaker === 'assistant' ? 'justify-start' : t.speaker === 'system' ? 'justify-center' : 'justify-end'}`}>
                  {t.speaker === 'system' ? (
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{t.text}</span>
                  ) : (
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${t.speaker === 'assistant' ? 'bg-primary/10' : 'bg-muted'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {t.speaker === 'assistant' ? <Bot className="h-3 w-3 text-primary" /> : <User className="h-3 w-3" />}
                        <span className="text-[10px] text-muted-foreground">{t.speaker === 'assistant' ? 'Agent' : 'Kandidat'} · {(t.confidence * 100).toFixed(0)}% · {t.latency}ms</span>
                      </div>
                      <p className="text-sm">{t.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Intent: {t.intent}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Kein Gesprächsverlauf verfügbar für diese Session.</p>
          )}
        </TabsContent>

        {/* Technical Tab */}
        <TabsContent value="technical" className="mt-4 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Technische Metadaten</Label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <MetaRow label="Session UID" value={s.session_uid} />
              <MetaRow label="Lifecycle State" value={s.lifecycle_state} />
              <MetaRow label="Environment" value={s.environment} />
              <MetaRow label="Transcript Status" value={s.transcript_status} />
              <MetaRow label="Result Type" value={s.result_type} />
              <MetaRow label="Escalation Status" value={s.escalation_status} />
              <MetaRow label="Test Session" value={s.is_test ? 'Ja' : 'Nein'} />
              <MetaRow label="Provider" value={s.is_test ? 'Mock' : 'Twilio (geplant)'} />
            </div>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Kostenaufschlüsselung</Label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/40 text-center">
                <p className="font-medium">{s.cost_ai.toFixed(2)} CHF</p>
                <p className="text-muted-foreground">AI Inference</p>
              </div>
              <div className="p-2 rounded bg-muted/40 text-center">
                <p className="font-medium">{s.cost_tel.toFixed(2)} CHF</p>
                <p className="text-muted-foreground">Telephony</p>
              </div>
              <div className="p-2 rounded bg-muted/40 text-center">
                <p className="font-medium">{s.cost_total.toFixed(2)} CHF</p>
                <p className="text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Mock vs. Livebetrieb</Label>
            <div className="p-3 rounded border border-dashed border-muted-foreground/30">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{s.is_test ? 'Mock-Modus' : 'Livebetrieb'}</span>
              </div>
              {s.is_test ? (
                <p className="text-xs text-muted-foreground">Diese Session wurde mit dem Mock-Provider simuliert. Im Livebetrieb wird das Railway Voice Backend über Twilio eine echte Telefonverbindung aufbauen und OpenAI für die Gesprächsführung nutzen.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Produktiv-Session über das Railway Voice Backend mit echtem Telefonieanbieter.</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Session State Flow Visualization ──────────────────────────────

function SessionStateFlow({ currentState }: { currentState: SessionState }) {
  const stateOrder: SessionState[] = ['queued', 'initiating', 'ringing', 'connected', 'active', 'completed'];
  const errorStates: SessionState[] = ['failed', 'cancelled'];
  const branchStates: SessionState[] = ['paused', 'awaiting_action', 'escalated'];

  const currentIdx = stateOrder.indexOf(currentState);
  const isError = errorStates.includes(currentState);
  const isBranch = branchStates.includes(currentState);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 flex-wrap">
        {stateOrder.map((state, i) => {
          const meta = SESSION_STATE_META[state];
          const isPast = currentIdx >= 0 ? i <= currentIdx : false;
          const isCurrent = state === currentState;
          return (
            <span key={state} className="flex items-center gap-1">
              <Badge
                variant={isCurrent ? 'default' : 'outline'}
                className={`text-[10px] ${isCurrent ? meta.color : isPast ? 'opacity-60' : 'opacity-30'}`}
              >
                {meta.icon} {meta.label}
              </Badge>
              {i < stateOrder.length - 1 && <span className={`text-xs ${isPast ? 'text-foreground' : 'text-muted-foreground/30'}`}>→</span>}
            </span>
          );
        })}
      </div>
      {(isError || isBranch) && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">↳</span>
          <LifecycleStateBadge state={currentState} />
        </div>
      )}
    </div>
  );
}

// ── Event Timeline ────────────────────────────────────────────────

function EventTimeline({ events }: { events: SessionEvent[] }) {
  return (
    <div className="space-y-0">
      <Label className="text-xs text-muted-foreground mb-3 block flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5" />
        Event Timeline ({events.length} Ereignisse)
      </Label>
      <div className="relative ml-3 border-l-2 border-muted pl-6 space-y-4">
        {events.map((event, i) => {
          const meta = EVENT_LABELS[event.type];
          return (
            <div key={event.id} className="relative">
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[8px]">
                {meta?.icon || '•'}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{meta?.label || event.type}</span>
                  {event.fromState && event.toState && (
                    <span className="text-[10px] text-muted-foreground">
                      {SESSION_STATE_META[event.fromState]?.label} → {SESSION_STATE_META[event.toState]?.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{event.detail}</p>
                <p className="text-[10px] text-muted-foreground/60">{new Date(event.timestamp).toLocaleString('de-CH')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-muted/30">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono font-medium">{value}</p>
    </div>
  );
}
