import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Bot, PhoneCall, PhoneIncoming, PhoneOutgoing, Play, Square, Settings2, Plus,
  BarChart3, Shield, DollarSign, BookOpen, Zap, Rocket, FlaskConical, Megaphone,
  Hash, AlertTriangle, TrendingUp, Clock, CheckCircle2, XCircle, Minus, Loader2,
  MessageSquare, User, Volume2, FileText, Download, Eye
} from 'lucide-react';
import {
  MockVoiceProvider, getMockAgents, getMockSessions, getMockCampaigns, getMockCostData,
  type MockSession, type MockTurn
} from '@/lib/ai-voice-mock';

const mockProvider = new MockVoiceProvider();

// ─── Dashboard Tab ───
function DashboardTab() {
  const agents = getMockAgents();
  const sessions = getMockSessions();
  const costs = getMockCostData();
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Aktive Agenten</CardDescription><CardTitle className="text-2xl">{agents.filter(a => a.is_active).length}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">von {agents.length} insgesamt</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Sessions heute</CardDescription><CardTitle className="text-2xl">{totalSessions}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{completedSessions} abgeschlossen</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Erfolgsrate</CardDescription><CardTitle className="text-2xl">78%</CardTitle></CardHeader><CardContent><Progress value={78} className="h-2" /></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Kosten (Monat)</CardDescription><CardTitle className="text-2xl">{costs.totalCost.toFixed(2)} {costs.currency}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Alle Provider</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Letzte Sessions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.slice(0, 4).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {s.direction === 'outbound' ? <PhoneOutgoing className="h-4 w-4 text-primary" /> : <PhoneIncoming className="h-4 w-4 text-accent-foreground" />}
                    <div>
                      <p className="text-sm font-medium">{s.lead_name}</p>
                      <p className="text-xs text-muted-foreground">{s.agent_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SessionStatusBadge status={s.status} />
                    {s.is_test && <Badge variant="outline" className="text-[10px]">Test</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Agenten-Übersicht</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agents.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Bot className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.sessions_count} Sessions · {a.success_rate}% Erfolg</p>
                    </div>
                  </div>
                  <Badge variant={a.is_active ? 'default' : 'secondary'}>{a.is_active ? 'Aktiv' : 'Inaktiv'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Agent Studio Tab ───
function AgentStudioTab() {
  const agents = getMockAgents();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agent Studio</h3>
          <p className="text-sm text-muted-foreground">Erstelle und verwalte KI-Voice-Agenten</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Neuer Agent</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Neuen Agenten erstellen</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Name</label><Input placeholder="z.B. SSM Recruiting Bot" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Typ</label>
                  <Select defaultValue="outbound"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inbound">Inbound</SelectItem><SelectItem value="outbound">Outbound</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Beschreibung</label><Input placeholder="Kurzbeschreibung des Agenten" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">System Prompt</label><Textarea rows={4} placeholder="Du bist ein freundlicher Recruiting-Assistent..." /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Begrüssung</label><Input placeholder="Guten Tag, hier spricht..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Sprache</label>
                  <Select defaultValue="de"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="de">Deutsch</SelectItem><SelectItem value="fr">Französisch</SelectItem><SelectItem value="it">Italienisch</SelectItem><SelectItem value="en">Englisch</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium">Max. Turns</label><Input type="number" defaultValue={20} /></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch id="test-only" defaultChecked /><label htmlFor="test-only" className="text-sm">Nur Test-Modus</label></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
                <Button onClick={() => { toast.success('Agent erstellt (Mock)'); setShowCreate(false); }}>Erstellen</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4">
        {agents.map(a => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Bot className="h-5 w-5 text-primary" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{a.name}</p>
                      <Badge variant="outline" className="text-[10px]">{a.agent_type}</Badge>
                      {a.test_only && <Badge variant="secondary" className="text-[10px]">Test</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.is_active ? 'default' : 'secondary'}>{a.is_active ? 'Aktiv' : 'Inaktiv'}</Badge>
                  <Button variant="outline" size="sm">Bearbeiten</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Test Center Tab ───
function TestCenterTab() {
  const [isRunning, setIsRunning] = useState(false);
  const [session, setSession] = useState<MockSession | null>(null);

  const runOutbound = async () => {
    setIsRunning(true);
    setSession(null);
    try {
      const result = await mockProvider.startOutboundCall({ leadId: 'test-lead-dummy-001', agentId: 'mock-agent-001', phoneNumber: '+41791234567' });
      setSession(result);
      toast.success('Mock Outbound Call abgeschlossen');
    } finally {
      setIsRunning(false);
    }
  };

  const runInbound = async () => {
    setIsRunning(true);
    setSession(null);
    try {
      const result = await mockProvider.simulateInboundCall({ agentId: 'mock-agent-002', callerNumber: '+41791234567' });
      setSession(result);
      toast.success('Mock Inbound Call abgeschlossen');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Test Center</h3>
        <p className="text-sm text-muted-foreground">Simuliere Anrufe und teste Agenten im Mock-Modus</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={!isRunning ? runOutbound : undefined}>
          <CardContent className="p-6 text-center space-y-3">
            <PhoneOutgoing className="h-8 w-8 mx-auto text-primary" />
            <p className="font-medium">Outbound Call simulieren</p>
            <p className="text-xs text-muted-foreground">Testet einen ausgehenden Anruf an einen Kandidaten</p>
            <Button disabled={isRunning} className="w-full">{isRunning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Läuft...</> : <><Play className="h-4 w-4 mr-2" />Starten</>}</Button>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={!isRunning ? runInbound : undefined}>
          <CardContent className="p-6 text-center space-y-3">
            <PhoneIncoming className="h-8 w-8 mx-auto text-accent-foreground" />
            <p className="font-medium">Inbound Call simulieren</p>
            <p className="text-xs text-muted-foreground">Testet einen eingehenden Anruf eines Interessenten</p>
            <Button variant="outline" disabled={isRunning} className="w-full">{isRunning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Läuft...</> : <><Play className="h-4 w-4 mr-2" />Starten</>}</Button>
          </CardContent>
        </Card>
      </div>

      {session && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Gesprächsverlauf</CardTitle>
              <div className="flex items-center gap-2">
                <SessionStatusBadge status={session.status} />
                <SentimentBadge sentiment={session.sentiment} />
                <Badge variant="outline">{session.durationSeconds}s</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {session.turns.map((turn, i) => (
                <TurnBubble key={i} turn={turn} />
              ))}
            </div>
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium">Zusammenfassung</p>
              <p className="text-sm text-muted-foreground">{session.summary}</p>
              <div className="flex gap-2">
                <Badge variant="outline">Ergebnis: {session.outcome.replace(/_/g, ' ')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TurnBubble({ turn }: { turn: MockTurn }) {
  const isAgent = turn.role === 'agent';
  const isSystem = turn.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{turn.transcript}</span>
      </div>
    );
  }

  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isAgent ? 'bg-primary/10 text-foreground' : 'bg-muted text-foreground'}`}>
        <div className="flex items-center gap-2 mb-1">
          {isAgent ? <Bot className="h-3 w-3 text-primary" /> : <User className="h-3 w-3" />}
          <span className="text-[10px] font-medium text-muted-foreground">{isAgent ? 'Agent' : 'Kandidat'} · {(turn.confidence * 100).toFixed(0)}%</span>
        </div>
        <p className="text-sm">{turn.transcript}</p>
      </div>
    </div>
  );
}

// ─── Sessions Tab ───
function SessionsTab() {
  const sessions = getMockSessions();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Call Sessions</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead><TableHead>Agent</TableHead><TableHead>Richtung</TableHead><TableHead>Status</TableHead><TableHead>Dauer</TableHead><TableHead>Stimmung</TableHead><TableHead>Ergebnis</TableHead><TableHead>Datum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map(s => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.lead_name}</TableCell>
              <TableCell>{s.agent_name}</TableCell>
              <TableCell>{s.direction === 'outbound' ? <PhoneOutgoing className="h-4 w-4" /> : <PhoneIncoming className="h-4 w-4" />}</TableCell>
              <TableCell><SessionStatusBadge status={s.status} /></TableCell>
              <TableCell>{s.duration_seconds}s</TableCell>
              <TableCell><SentimentBadge sentiment={s.sentiment} /></TableCell>
              <TableCell className="text-sm">{s.outcome.replace(/_/g, ' ')}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleString('de-CH')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Campaigns Tab ───
function CampaignsTab() {
  const campaigns = getMockCampaigns();
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Kampagnen</h3>
        <Button><Plus className="h-4 w-4 mr-2" />Neue Kampagne</Button>
      </div>
      <div className="grid gap-4">
        {campaigns.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{c.name}</p>
                    <Badge variant={c.status === 'running' ? 'default' : 'secondary'}>{c.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Agent: {c.agent_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{c.completed_calls}/{c.total_calls} Calls</p>
                  {c.total_calls > 0 && <Progress value={(c.completed_calls / c.total_calls) * 100} className="h-2 w-32 mt-1" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Numbers Tab ───
function NumbersTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h3 className="text-lg font-semibold">Voice Numbers</h3><p className="text-sm text-muted-foreground">Telefonnummern für KI-Agenten verwalten</p></div>
        <Button><Plus className="h-4 w-4 mr-2" />Nummer hinzufügen</Button>
      </div>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Hash className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Keine Nummern konfiguriert</p>
          <p className="text-sm mt-1">Verbinden Sie einen Telephony-Provider um Nummern zu verwalten.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Knowledge Base Tab ───
function KnowledgeTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h3 className="text-lg font-semibold">Knowledge Base</h3><p className="text-sm text-muted-foreground">Wissensbasis für KI-Agenten</p></div>
        <Button><Plus className="h-4 w-4 mr-2" />Eintrag hinzufügen</Button>
      </div>
      <div className="grid gap-4">
        {[
          { title: 'SSM Partner Unternehmensprofil', category: 'Unternehmen', content: 'SSM Partner AG ist ein führendes Unternehmen in der Finanzberatung...' },
          { title: 'Stellenprofil Finanzberater', category: 'Positionen', content: 'Anforderungen: Abgeschlossene Ausbildung, Vertriebserfahrung...' },
          { title: 'FAQ – Bewerbungsprozess', category: 'FAQ', content: 'Der Bewerbungsprozess besteht aus: 1. Erstgespräch, 2. Assessment...' },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <p className="font-medium text-sm">{item.title}</p>
                    <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{item.content}</p>
                </div>
                <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Action Rules Tab ───
function ActionRulesTab() {
  return (
    <div className="space-y-4">
      <div><h3 className="text-lg font-semibold">Action Rules</h3><p className="text-sm text-muted-foreground">Automatische Aktionen nach Gesprächsergebnis</p></div>
      <div className="grid gap-3">
        {[
          { trigger: 'Termin vereinbart', action: 'Termin im Kalender erstellen', type: 'appointment', active: true },
          { trigger: 'Neuer Lead erkannt', action: 'Lead im System anlegen', type: 'lead_create', active: true },
          { trigger: 'Kein Interesse', action: 'Status auf "Nicht interessiert" setzen', type: 'status_change', active: true },
          { trigger: 'Eskalation angefordert', action: 'Weiterleitung an zuständigen Mitarbeiter', type: 'escalation', active: true },
          { trigger: 'Rückruf gewünscht', action: 'Aufgabe "Rückruf" erstellen', type: 'task_create', active: false },
        ].map((rule, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Wenn: {rule.trigger}</p>
                  <p className="text-xs text-muted-foreground">Dann: {rule.action}</p>
                </div>
              </div>
              <Switch checked={rule.active} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Escalations Tab ───
function EscalationsTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Eskalationen</h3>
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Keine offenen Eskalationen</p>
        <p className="text-sm mt-1">Eskalationen erscheinen hier, wenn ein Agent einen Anruf an einen Mitarbeiter weiterleitet.</p>
      </CardContent></Card>
    </div>
  );
}

// ─── Deployments Tab ───
function DeploymentsTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Deployments</h3>
      <div className="grid gap-3">
        {[
          { agent: 'SSM Recruiting Bot', version: '1.0.0', env: 'sandbox', status: 'active', date: '09.04.2026' },
          { agent: 'SSM Inbound Assistent', version: '1.0.0', env: 'sandbox', status: 'pending', date: '09.04.2026' },
        ].map((d, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Rocket className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{d.agent} <span className="text-muted-foreground">v{d.version}</span></p>
                  <p className="text-xs text-muted-foreground">{d.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{d.env}</Badge>
                <Badge variant={d.status === 'active' ? 'default' : 'secondary'}>{d.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Cost Control Tab ───
function CostControlTab() {
  const costs = getMockCostData();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cost Control</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Kostenübersicht</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{costs.totalCost.toFixed(2)} {costs.currency}</p>
            <p className="text-sm text-muted-foreground mt-1">Laufender Monat</p>
            <div className="mt-4 space-y-3">
              {costs.breakdown.map(b => (
                <div key={b.type}>
                  <div className="flex justify-between text-sm mb-1"><span>{b.label}</span><span className="font-medium">{b.amount.toFixed(2)} CHF</span></div>
                  <Progress value={b.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Tagesverlauf</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {costs.dailyTrend.map(d => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-12">{d.date}</span>
                  <div className="flex-1"><Progress value={(d.cost / 30) * 100} className="h-2" /></div>
                  <span className="text-sm font-medium w-20 text-right">{d.cost.toFixed(2)} CHF</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Compliance Tab ───
function ComplianceTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Compliance & Audit</h3>
      <div className="grid gap-3">
        {[
          { name: 'Aufnahme-Einwilligung', type: 'recording_consent', desc: 'Agent muss zu Beginn die Einwilligung zur Aufnahme einholen', active: true },
          { name: 'DSGVO-Hinweis', type: 'gdpr', desc: 'Datenschutzhinweis muss bei Datenerfassung erfolgen', active: true },
          { name: 'Anrufzeiten', type: 'call_hours', desc: 'Anrufe nur Mo-Fr 08:00-18:00, Sa 09:00-12:00', active: true },
          { name: 'Max. Anrufversuche', type: 'max_attempts', desc: 'Maximal 3 Versuche pro Lead innerhalb von 7 Tagen', active: true },
          { name: 'Datenaufbewahrung', type: 'data_retention', desc: 'Aufnahmen werden nach 90 Tagen automatisch gelöscht', active: false },
        ].map((rule, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-primary" />
                <div>
                  <div className="flex items-center gap-2"><p className="text-sm font-medium">{rule.name}</p><Badge variant="outline" className="text-[10px]">{rule.type}</Badge></div>
                  <p className="text-xs text-muted-foreground">{rule.desc}</p>
                </div>
              </div>
              <Switch checked={rule.active} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Provider Settings Tab ───
function ProviderSettingsTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Provider Settings</h3>
      <p className="text-sm text-muted-foreground">Konfiguriere Telephony- und Voice-AI-Provider. Aktuell läuft alles im Mock-Modus.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: 'Mock Provider (Telephony)', category: 'telephony', type: 'mock', status: 'active', sandbox: true },
          { name: 'Mock Provider (Voice AI)', category: 'voice_ai', type: 'mock', status: 'active', sandbox: true },
          { name: 'Twilio (vorbereitet)', category: 'telephony', type: 'twilio', status: 'inactive', sandbox: false },
          { name: 'OpenAI Realtime (vorbereitet)', category: 'voice_ai', type: 'openai_realtime', status: 'inactive', sandbox: false },
        ].map((p, i) => (
          <Card key={i} className={p.status === 'inactive' ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <p className="font-medium text-sm">{p.name}</p>
                </div>
                <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Kategorie</span><span>{p.category}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Typ</span><span>{p.type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sandbox</span><span>{p.sandbox ? 'Ja' : 'Nein'}</span></div>
              </div>
              {p.status === 'inactive' && (
                <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                  API-Key und Endpoint müssen noch konfiguriert werden.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Analytics Tab ───
function VoiceAnalyticsTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Analytics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" /><p className="text-2xl font-bold">78%</p><p className="text-xs text-muted-foreground">Erfolgsrate</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-5 w-5 mx-auto mb-2 text-primary" /><p className="text-2xl font-bold">32s</p><p className="text-xs text-muted-foreground">Ø Dauer</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-primary" /><p className="text-2xl font-bold">47</p><p className="text-xs text-muted-foreground">Abgeschlossen</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><MessageSquare className="h-5 w-5 mx-auto mb-2 text-primary" /><p className="text-2xl font-bold">6.2</p><p className="text-xs text-muted-foreground">Ø Turns</p></CardContent></Card>
      </div>
      <Card><CardContent className="p-8 text-center text-muted-foreground"><BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-50" /><p>Detaillierte Charts werden nach Anbindung echter Provider angezeigt.</p></CardContent></Card>
    </div>
  );
}

// ─── Helpers ───
function SessionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    completed: { variant: 'default', label: 'Abgeschlossen' },
    in_progress: { variant: 'outline', label: 'Laufend' },
    failed: { variant: 'destructive', label: 'Fehlgeschlagen' },
    no_answer: { variant: 'secondary', label: 'Keine Antwort' },
    busy: { variant: 'secondary', label: 'Besetzt' },
    voicemail: { variant: 'secondary', label: 'Mailbox' },
    initiated: { variant: 'outline', label: 'Gestartet' },
    ringing: { variant: 'outline', label: 'Klingelt' },
    connected: { variant: 'outline', label: 'Verbunden' },
  };
  const m = map[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={m.variant} className="text-[10px]">{m.label}</Badge>;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (sentiment === 'positive') return <Badge className="bg-green-100 text-green-800 text-[10px]">Positiv</Badge>;
  if (sentiment === 'negative') return <Badge className="bg-red-100 text-red-800 text-[10px]">Negativ</Badge>;
  return <Badge variant="outline" className="text-[10px]">Neutral</Badge>;
}

// ─── Main Page ───
export default function AIVoiceAgent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Voice Agent</h1>
        <p className="text-muted-foreground">KI-gestützte Telefonie und Voice-Agents verwalten</p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="studio" className="text-xs"><Bot className="h-3.5 w-3.5 mr-1" />Agent Studio</TabsTrigger>
          <TabsTrigger value="deployments" className="text-xs"><Rocket className="h-3.5 w-3.5 mr-1" />Deployments</TabsTrigger>
          <TabsTrigger value="test" className="text-xs"><FlaskConical className="h-3.5 w-3.5 mr-1" />Test Center</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs"><Megaphone className="h-3.5 w-3.5 mr-1" />Kampagnen</TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs"><PhoneCall className="h-3.5 w-3.5 mr-1" />Sessions</TabsTrigger>
          <TabsTrigger value="numbers" className="text-xs"><Hash className="h-3.5 w-3.5 mr-1" />Nummern</TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs"><BookOpen className="h-3.5 w-3.5 mr-1" />Knowledge</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs"><Zap className="h-3.5 w-3.5 mr-1" />Actions</TabsTrigger>
          <TabsTrigger value="escalations" className="text-xs"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Eskalationen</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs"><TrendingUp className="h-3.5 w-3.5 mr-1" />Analytics</TabsTrigger>
          <TabsTrigger value="costs" className="text-xs"><DollarSign className="h-3.5 w-3.5 mr-1" />Kosten</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs"><Shield className="h-3.5 w-3.5 mr-1" />Compliance</TabsTrigger>
          <TabsTrigger value="providers" className="text-xs"><Settings2 className="h-3.5 w-3.5 mr-1" />Provider</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="studio"><AgentStudioTab /></TabsContent>
        <TabsContent value="deployments"><DeploymentsTab /></TabsContent>
        <TabsContent value="test"><TestCenterTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="sessions"><SessionsTab /></TabsContent>
        <TabsContent value="numbers"><NumbersTab /></TabsContent>
        <TabsContent value="knowledge"><KnowledgeTab /></TabsContent>
        <TabsContent value="actions"><ActionRulesTab /></TabsContent>
        <TabsContent value="escalations"><EscalationsTab /></TabsContent>
        <TabsContent value="analytics"><VoiceAnalyticsTab /></TabsContent>
        <TabsContent value="costs"><CostControlTab /></TabsContent>
        <TabsContent value="compliance"><ComplianceTab /></TabsContent>
        <TabsContent value="providers"><ProviderSettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
