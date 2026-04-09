import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Bot, PhoneOutgoing, PhoneIncoming, Play, Loader2, User, Phone,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Clock, DollarSign,
  Zap, MessageSquare, Target, Volume2, PhoneOff
} from 'lucide-react';
import { toast } from 'sonner';
import {
  MockVoiceProvider, SCENARIO_OPTIONS,
  type MockSession, type MockTurn, type ScenarioKey, type SuggestedAction, type CallStateEvent,
  getMockAgents,
} from '@/lib/ai-voice-mock';

const mockProvider = new MockVoiceProvider();
const agents = getMockAgents();

type TestMode = 'sandbox' | 'inbound_sim' | 'outbound_sim' | 'shadow' | 'recommendation' | 'assisted';
type TestTarget = 'single_candidate' | 'test_group' | 'dummy';

const TEST_MODES: { value: TestMode; label: string; description: string }[] = [
  { value: 'sandbox', label: 'Sandbox Call', description: 'Isolierter Test ohne Auswirkung auf Daten' },
  { value: 'inbound_sim', label: 'Inbound Simulation', description: 'Eingehender Anruf simulieren' },
  { value: 'outbound_sim', label: 'Outbound Simulation', description: 'Ausgehender Anruf simulieren' },
  { value: 'shadow', label: 'Shadow Mode', description: 'Agent hört mit, greift nicht ein' },
  { value: 'recommendation', label: 'Recommendation', description: 'Agent empfiehlt Aktionen' },
  { value: 'assisted', label: 'Assisted', description: 'Agent handelt mit Bestätigung' },
];

const TEST_TARGETS: { value: TestTarget; label: string }[] = [
  { value: 'single_candidate', label: 'Einzelner Kandidat' },
  { value: 'test_group', label: 'Testgruppe' },
  { value: 'dummy', label: 'Dummy-Datensatz' },
];

// ─── Sub-Components ──────────────────────────────────────────────────────────

function TurnBubble({ turn, index }: { turn: MockTurn; index: number }) {
  if (turn.role === 'system') {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{turn.transcript}</span>
      </div>
    );
  }
  const isAgent = turn.role === 'agent';
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isAgent ? 'bg-primary/10' : 'bg-muted'}`}>
        <div className="flex items-center gap-2 mb-1">
          {isAgent ? <Bot className="h-3 w-3 text-primary" /> : <User className="h-3 w-3" />}
          <span className="text-[10px] font-medium text-muted-foreground">
            {isAgent ? 'Agent' : 'Kandidat'} · {(turn.confidence * 100).toFixed(0)}%
            {turn.intent && <> · <span className="text-primary">{turn.intent}</span></>}
          </span>
          <span className="text-[10px] text-muted-foreground/60 ml-auto">{(turn.timestampMs / 1000).toFixed(1)}s</span>
        </div>
        <p className="text-sm">{turn.transcript}</p>
      </div>
    </div>
  );
}

function CallStateTimeline({ events }: { events: CallStateEvent[] }) {
  const stateIcons: Record<string, React.ReactNode> = {
    ringing: <Phone className="h-3 w-3 text-yellow-500" />,
    connected: <Volume2 className="h-3 w-3 text-green-600" />,
    completed: <CheckCircle2 className="h-3 w-3 text-primary" />,
    no_answer: <PhoneOff className="h-3 w-3 text-orange-500" />,
    busy: <PhoneOff className="h-3 w-3 text-red-500" />,
    voicemail: <MessageSquare className="h-3 w-3 text-blue-500" />,
    failed: <XCircle className="h-3 w-3 text-destructive" />,
  };
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {events.map((e, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          <div className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-full">
            {stateIcons[e.state] ?? <Clock className="h-3 w-3" />}
            <span className="text-[10px] font-medium">{e.state}</span>
            <span className="text-[10px] text-muted-foreground">{(e.timestamp / 1000).toFixed(1)}s</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionRow({ action }: { action: SuggestedAction }) {
  const typeIcons: Record<string, React.ReactNode> = {
    status_change: <Target className="h-3.5 w-3.5 text-blue-600" />,
    wizard_start: <Zap className="h-3.5 w-3.5 text-purple-600" />,
    follow_up: <Clock className="h-3.5 w-3.5 text-orange-500" />,
    appointment: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
    escalation: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
    note: <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />,
  };
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
      <div className="flex items-center gap-2">
        {typeIcons[action.type] ?? <Zap className="h-3.5 w-3.5" />}
        <div>
          <p className="text-sm font-medium">{action.label}</p>
          <p className="text-[11px] text-muted-foreground">{action.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px]">{action.autoExecute ? 'Auto' : 'Manuell'}</Badge>
        {action.executed
          ? <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100">Ausgeführt</Badge>
          : <Badge variant="secondary" className="text-[10px]">Vorgeschlagen</Badge>}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TestCenterTab() {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '');
  const [testMode, setTestMode] = useState<TestMode>('sandbox');
  const [testTarget, setTestTarget] = useState<TestTarget>('dummy');
  const [scenario, setScenario] = useState<ScenarioKey>('interested');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [session, setSession] = useState<MockSession | null>(null);
  const [visibleTurns, setVisibleTurns] = useState<MockTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleTurns]);

  const runTest = useCallback(async () => {
    setIsRunning(true);
    setSession(null);
    setVisibleTurns([]);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 8 + Math.random() * 12, 90));
      }, 200);

      const isInbound = testMode === 'inbound_sim' || SCENARIO_OPTIONS.find(s => s.key === scenario)?.direction === 'inbound';
      const result = isInbound
        ? await mockProvider.simulateInboundCall({ agentId, callerNumber: '+41791234567', scenario })
        : await mockProvider.startOutboundCall({ leadId: 'test-lead-dummy-001', agentId, phoneNumber: '+41791234567', scenario });

      clearInterval(progressInterval);
      setProgress(100);

      // Animate turns one by one
      for (let i = 0; i < result.turns.length; i++) {
        await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
        setVisibleTurns(prev => [...prev, result.turns[i]]);
      }

      setSession(result);
      toast.success('Test abgeschlossen');
    } catch {
      toast.error('Testfehler aufgetreten');
    } finally {
      setIsRunning(false);
    }
  }, [agentId, testMode, scenario]);

  const sentimentColor = (s: string) => {
    if (s === 'positive') return 'bg-green-100 text-green-800';
    if (s === 'negative') return 'bg-red-100 text-red-800';
    if (s === 'mixed') return 'bg-yellow-100 text-yellow-800';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Test Center</h3>
        <p className="text-sm text-muted-foreground">Simuliere Anrufe und teste KI-Agenten im Mock-Betrieb</p>
      </div>

      {/* ─── Configuration ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Testkonfiguration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Testmodus</Label>
              <Select value={testMode} onValueChange={v => setTestMode(v as TestMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEST_MODES.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="font-medium">{m.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">{TEST_MODES.find(m => m.value === testMode)?.description}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Testziel</Label>
              <Select value={testTarget} onValueChange={v => setTestTarget(v as TestTarget)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEST_TARGETS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Szenario</Label>
              <Select value={scenario} onValueChange={v => setScenario(v as ScenarioKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCENARIO_OPTIONS.map(s => (
                    <SelectItem key={s.key} value={s.key}>
                      <div className="flex items-center gap-2">
                        {s.direction === 'outbound' ? <PhoneOutgoing className="h-3 w-3" /> : <PhoneIncoming className="h-3 w-3" />}
                        <span>{s.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">{SCENARIO_OPTIONS.find(s => s.key === scenario)?.description}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={runTest} disabled={isRunning} className="min-w-[140px]">
              {isRunning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Läuft...</> : <><Play className="h-4 w-4 mr-2" />Test starten</>}
            </Button>
            {isRunning && (
              <div className="flex-1 max-w-xs">
                <Progress value={progress} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{progress < 100 ? 'Verbindung wird aufgebaut...' : 'Abgeschlossen'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Live Transcript ────────────────────────────────────────── */}
      {visibleTurns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Gesprächsverlauf</CardTitle>
                {session && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="default" className="text-[10px]">{session.status}</Badge>
                    <Badge className={`text-[10px] ${sentimentColor(session.sentiment)} hover:opacity-90`}>{session.sentiment}</Badge>
                    <Badge variant="outline" className="text-[10px]">{session.durationSeconds}s</Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {session && <CallStateTimeline events={session.callStates} />}
              <div ref={scrollRef} className="space-y-3 max-h-[420px] overflow-y-auto pr-2 mt-3">
                {visibleTurns.map((t, i) => <TurnBubble key={i} turn={t} index={i} />)}
                {isRunning && (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs text-muted-foreground">Agent spricht...</span>
                    </div>
                  </div>
                )}
              </div>
              {session && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm font-medium mb-1">Zusammenfassung</p>
                  <p className="text-sm text-muted-foreground">{session.summary}</p>
                  <Badge variant="outline" className="text-[10px] mt-2">{session.outcome.replace(/_/g, ' ')}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Right Panel: Intents + Actions + Costs ─────────────── */}
          <div className="space-y-4">
            {/* Intents */}
            {session && session.intents.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Erkannte Intents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {session.intents.map((intent, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/40">
                      <div className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <div>
                          <p className="text-xs font-medium">{intent.intent}</p>
                          {intent.entities && (
                            <p className="text-[10px] text-muted-foreground">
                              {Object.entries(intent.entities).map(([k, v]) => `${k}: ${v}`).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono">{(intent.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Actions: suggested vs executed */}
            {session && session.suggestedActions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Aktionen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {session.suggestedActions.map((action, i) => (
                    <ActionRow key={i} action={action} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Costs */}
            {session && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />Kosten
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Telefonie', value: session.costs.telephony },
                      { label: 'Text-to-Speech', value: session.costs.tts },
                      { label: 'Speech-to-Text', value: session.costs.stt },
                      { label: 'KI-Inferenz', value: session.costs.aiInference },
                    ].map(c => (
                      <div key={c.label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{c.label}</span>
                        <span className="font-medium">{c.value.toFixed(2)} CHF</span>
                      </div>
                    ))}
                    <Separator className="my-1" />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Gesamt</span>
                      <span>{session.costs.total.toFixed(2)} {session.costs.currency}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ─── Quick Scenario Cards (when no session) ─────────────────── */}
      {!session && visibleTurns.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {SCENARIO_OPTIONS.map(s => (
            <Card
              key={s.key}
              className={`cursor-pointer hover:border-primary/50 transition-colors ${scenario === s.key ? 'border-primary' : ''}`}
              onClick={() => setScenario(s.key)}
            >
              <CardContent className="p-4 text-center space-y-2">
                {s.direction === 'outbound' ? <PhoneOutgoing className="h-6 w-6 mx-auto text-primary" /> : <PhoneIncoming className="h-6 w-6 mx-auto text-accent-foreground" />}
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">{s.description}</p>
                <Badge variant="outline" className="text-[10px]">{s.direction}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
