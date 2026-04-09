import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  DollarSign, AlertTriangle, Bot, Building2, Megaphone, TrendingUp,
  ShieldOff, ShieldCheck, Activity, Zap, XOctagon, Power, Eye,
  BellRing, Server, PhoneOff, BarChart3, Clock, AlertCircle
} from 'lucide-react';
import { getMockCostData } from '@/lib/ai-voice-mock';
import { toast } from 'sonner';

// ── Mock Monitoring Data ──────────────────────────────────────────
const MOCK_ALERTS = [
  { id: 'a1', type: 'budget_warning', severity: 'warning', title: 'Budget-Warnschwelle erreicht', desc: 'SSM Recruiting Bot: 75% des Tagesbudgets verbraucht (150/200 CHF)', time: '09:45', active: true },
  { id: 'a2', type: 'error_rate', severity: 'critical', title: 'Erhöhte Fehlerquote', desc: 'Agent "SSM Inbound" hat 35% Fehlerquote in den letzten 30 Min.', time: '09:32', active: true },
  { id: 'a3', type: 'escalation_spike', severity: 'warning', title: 'Häufige Eskalationen', desc: '8 Eskalationen in 1 Stunde – normal sind 2-3', time: '09:20', active: true },
  { id: 'a4', type: 'provider_issue', severity: 'info', title: 'Provider-Latenz erhöht', desc: 'Mock Telephony Provider: Latenz 450ms (normal: <200ms)', time: '08:55', active: false },
  { id: 'a5', type: 'compliance', severity: 'warning', title: 'Compliance-Flag', desc: 'Session s42: Pflichtoffenlegung nicht erkannt', time: '08:40', active: true },
];

const MOCK_MONITORING = {
  liveSessions: 3,
  errorRate: 12.5,
  connectionDrops: 2,
  providerErrors: 1,
  escalationRate: 18.2,
  callsLastHour: 24,
  avgCallsPerHour: 15,
  agentsWithoutKnowledge: 0,
  agentsWithoutDeployment: 1,
  agentsMisconfigured: 0,
};

const KILL_SWITCHES = [
  { id: 'global', scope: 'Global', label: 'Globaler Kill Switch', desc: 'Stoppt ALLE AI-Voice-Aktivitäten sofort', active: false, icon: XOctagon },
  { id: 'agent-001', scope: 'Agent', label: 'SSM Recruiting Bot', desc: 'Outbound-Agent für Erstgespräche', active: false, icon: Bot },
  { id: 'agent-002', scope: 'Agent', label: 'SSM Inbound Assistent', desc: 'Inbound-Qualifizierung', active: false, icon: Bot },
  { id: 'agency-zh', scope: 'Agentur', label: 'SSM Zürich', desc: 'Alle Agents dieser Agentur', active: false, icon: Building2 },
  { id: 'agency-be', scope: 'Agentur', label: 'SSM Bern', desc: 'Alle Agents dieser Agentur', active: false, icon: Building2 },
  { id: 'campaign-1', scope: 'Kampagne', label: 'Frühlings-Recruiting 2026', desc: 'Outbound-Kampagne', active: false, icon: Megaphone },
];

const COST_LOG_ENTRIES = [
  { id: 'cl1', session: 's1', agent: 'SSM Recruiting Bot', type: 'call', provider: 'Mock Telephony', amount: 0.85, units: 28, unitPrice: 0.03, currency: 'CHF', time: '09:15', campaign: 'Frühlings-Recruiting', agency: 'SSM Zürich' },
  { id: 'cl2', session: 's1', agent: 'SSM Recruiting Bot', type: 'tts', provider: 'Mock Voice AI', amount: 0.42, units: 1400, unitPrice: 0.0003, currency: 'CHF', time: '09:15', campaign: 'Frühlings-Recruiting', agency: 'SSM Zürich' },
  { id: 'cl3', session: 's1', agent: 'SSM Recruiting Bot', type: 'stt', provider: 'Mock Voice AI', amount: 0.38, units: 28, unitPrice: 0.014, currency: 'CHF', time: '09:15', campaign: 'Frühlings-Recruiting', agency: 'SSM Zürich' },
  { id: 'cl4', session: 's1', agent: 'SSM Recruiting Bot', type: 'ai', provider: 'Mock Voice AI', amount: 0.25, units: 5, unitPrice: 0.05, currency: 'CHF', time: '09:15', campaign: 'Frühlings-Recruiting', agency: 'SSM Zürich' },
  { id: 'cl5', session: 's2', agent: 'SSM Inbound Assistent', type: 'call', provider: 'Mock Telephony', amount: 0.96, units: 32, unitPrice: 0.03, currency: 'CHF', time: '08:45', campaign: '–', agency: 'SSM Bern' },
  { id: 'cl6', session: 's4', agent: 'SSM Recruiting Bot', type: 'call', provider: 'Mock Telephony', amount: 1.35, units: 45, unitPrice: 0.03, currency: 'CHF', time: '14:00', campaign: 'Frühlings-Recruiting', agency: 'SSM Zürich' },
];

export default function CostControlTab() {
  const costs = getMockCostData();
  const [killStates, setKillStates] = useState<Record<string, boolean>>(Object.fromEntries(KILL_SWITCHES.map(k => [k.id, k.active])));
  const [killConfirm, setKillConfirm] = useState<{ id: string; label: string; scope: string } | null>(null);
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [globalAutoStop, setGlobalAutoStop] = useState(true);
  const [globalDailyLimit, setGlobalDailyLimit] = useState(500);
  const [globalMonthlyLimit, setGlobalMonthlyLimit] = useState(5000);
  const [globalWarnPct, setGlobalWarnPct] = useState(80);

  const budgets = [
    { scope: 'Agent', icon: Bot, items: [
      { name: 'SSM Recruiting Bot', usedDay: 18.50, limitDay: 50, usedMonth: 98.50, limitMonth: 200, warn: 75 },
      { name: 'SSM Inbound Assistent', usedDay: 5.20, limitDay: 30, usedMonth: 29.00, limitMonth: 100, warn: 75 },
    ]},
    { scope: 'Agentur', icon: Building2, items: [
      { name: 'SSM Zürich', usedDay: 22.40, limitDay: 80, usedMonth: 85.20, limitMonth: 300, warn: 80 },
      { name: 'SSM Bern', usedDay: 8.10, limitDay: 80, usedMonth: 42.30, limitMonth: 300, warn: 80 },
    ]},
    { scope: 'Kampagne', icon: Megaphone, items: [
      { name: 'Frühlings-Recruiting 2026', usedDay: 25.60, limitDay: 100, usedMonth: 385.50, limitMonth: 2000, warn: 75 },
      { name: 'Reactivation Q2', usedDay: 0, limitDay: 60, usedMonth: 210.00, limitMonth: 1000, warn: 75 },
    ]},
  ];

  function requestKillSwitch(id: string, label: string, scope: string) {
    if (killStates[id]) {
      // Deactivating – no confirmation needed
      setKillStates(s => ({ ...s, [id]: false }));
      toast.success(`${label} wieder aktiviert`);
    } else {
      setKillConfirm({ id, label, scope });
    }
  }

  function confirmKillSwitch() {
    if (!killConfirm) return;
    setKillStates(s => ({ ...s, [killConfirm.id]: true }));
    toast.error(`⛔ ${killConfirm.label} – ABGESCHALTET`, { duration: 5000 });
    setKillConfirm(null);
  }

  function dismissAlert(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: false } : a));
    toast.info('Alarm quittiert');
  }

  const activeAlerts = alerts.filter(a => a.active);
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const anyKillActive = Object.values(killStates).some(v => v);

  return (
    <div className="space-y-6">
      {/* ── Global Kill Switch Banner ── */}
      {anyKillActive && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-3">
          <XOctagon className="h-6 w-6 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">Kill Switch aktiv</p>
            <p className="text-sm text-destructive/80">
              {Object.entries(killStates).filter(([, v]) => v).map(([k]) => KILL_SWITCHES.find(ks => ks.id === k)?.label).join(', ')} – abgeschaltet
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => { setKillStates(Object.fromEntries(KILL_SWITCHES.map(k => [k.id, false]))); toast.success('Alle Kill Switches deaktiviert'); }}>
            Alle reaktivieren
          </Button>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1" />Übersicht</TabsTrigger>
          <TabsTrigger value="budgets" className="text-xs"><DollarSign className="h-3.5 w-3.5 mr-1" />Budgets</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs"><Clock className="h-3.5 w-3.5 mr-1" />Cost Logs</TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs"><Activity className="h-3.5 w-3.5 mr-1" />Monitoring</TabsTrigger>
          <TabsTrigger value="killswitch" className="text-xs"><XOctagon className="h-3.5 w-3.5 mr-1" />Kill Switch{anyKillActive && <span className="ml-1 h-2 w-2 rounded-full bg-destructive inline-block" />}</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs"><BellRing className="h-3.5 w-3.5 mr-1" />Alarme{activeAlerts.length > 0 && <Badge variant="destructive" className="ml-1 text-[9px] h-4 px-1">{activeAlerts.length}</Badge>}</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview">
          <div className="space-y-4">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Kosten heute</p><p className="text-2xl font-bold">{(costs.totalCost / 6).toFixed(2)}</p><p className="text-[10px] text-muted-foreground">CHF</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Kosten Monat</p><p className="text-2xl font-bold">{costs.totalCost.toFixed(2)}</p><p className="text-[10px] text-muted-foreground">CHF</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aktive Warnungen</p><p className="text-2xl font-bold">{activeAlerts.length}</p><p className="text-[10px]">{criticalAlerts.length > 0 ? <span className="text-destructive font-medium">{criticalAlerts.length} kritisch</span> : <span className="text-muted-foreground">keine kritisch</span>}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Kill Switches</p><p className="text-2xl font-bold">{Object.values(killStates).filter(v => v).length}</p><p className="text-[10px] text-muted-foreground">von {KILL_SWITCHES.length} aktiv</p></CardContent></Card>
            </div>

            {/* Cost breakdown + trend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Kostenaufschlüsselung</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {costs.breakdown.map(b => (
                    <div key={b.type}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">{b.label}</span><span className="font-medium">{b.amount.toFixed(2)} CHF</span></div>
                      <Progress value={b.percentage} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Tagesverlauf</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {costs.dailyTrend.map(d => (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-12">{d.date}</span>
                      <div className="flex-1"><Progress value={(d.cost / 30) * 100} className="h-2" /></div>
                      <span className="text-xs font-medium w-16 text-right">{d.cost.toFixed(2)} CHF</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Active alerts summary */}
            {activeAlerts.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Aktive Warnungen</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {activeAlerts.slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`h-3.5 w-3.5 ${a.severity === 'critical' ? 'text-destructive' : 'text-amber-500'}`} />
                        <div>
                          <p className="text-xs font-medium">{a.title}</p>
                          <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => dismissAlert(a.id)}>Quittieren</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── BUDGETS ── */}
        <TabsContent value="budgets">
          <div className="space-y-4">
            {budgets.map(scope => (
              <Card key={scope.scope}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><scope.icon className="h-4 w-4 text-primary" />Budget pro {scope.scope}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {scope.items.map((item, i) => {
                    const dayPct = (item.usedDay / item.limitDay) * 100;
                    const monthPct = (item.usedMonth / item.limitMonth) * 100;
                    const dayWarn = dayPct >= item.warn;
                    const dayOver = dayPct >= 100;
                    const monthWarn = monthPct >= item.warn;
                    const monthOver = monthPct >= 100;
                    return (
                      <div key={i} className="space-y-2 p-3 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.name}</span>
                          <div className="flex gap-1.5">
                            {dayOver && <Badge variant="destructive" className="text-[10px]">Tageslimit!</Badge>}
                            {monthOver && <Badge variant="destructive" className="text-[10px]">Monatslimit!</Badge>}
                            {!dayOver && dayWarn && <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">Tages-Warnung</Badge>}
                            {!monthOver && monthWarn && <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">Monats-Warnung</Badge>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Tag</span><span>{item.usedDay.toFixed(2)} / {item.limitDay} CHF</span></div>
                            <Progress value={Math.min(dayPct, 100)} className={`h-2 ${dayOver ? '[&>div]:bg-destructive' : dayWarn ? '[&>div]:bg-amber-500' : ''}`} />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Monat</span><span>{item.usedMonth.toFixed(2)} / {item.limitMonth} CHF</span></div>
                            <Progress value={Math.min(monthPct, 100)} className={`h-2 ${monthOver ? '[&>div]:bg-destructive' : monthWarn ? '[&>div]:bg-amber-500' : ''}`} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}

            {/* Global Limits */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Globale Limits & Auto-Stopp</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tägliches Gesamtlimit (CHF)</Label>
                    <Input type="number" value={globalDailyLimit} onChange={e => setGlobalDailyLimit(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Monatliches Gesamtlimit (CHF)</Label>
                    <Input type="number" value={globalMonthlyLimit} onChange={e => setGlobalMonthlyLimit(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Warnschwelle (%)</Label>
                    <Input type="number" value={globalWarnPct} onChange={e => setGlobalWarnPct(Number(e.target.value))} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Switch checked={globalAutoStop} onCheckedChange={setGlobalAutoStop} />
                    <Label className="text-xs">Auto-Stopp bei Überschreitung</Label>
                  </div>
                </div>
                {globalAutoStop && (
                  <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                    Auto-Stopp ist aktiv: Bei Überschreitung der Limits werden alle Agents automatisch pausiert.
                  </div>
                )}
                <Button size="sm" onClick={() => toast.success('Globale Limits gespeichert')}>Speichern</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── COST LOGS ── */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Kostenprotokoll</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Zeit</TableHead>
                    <TableHead className="text-xs">Session</TableHead>
                    <TableHead className="text-xs">Agent</TableHead>
                    <TableHead className="text-xs">Typ</TableHead>
                    <TableHead className="text-xs">Provider</TableHead>
                    <TableHead className="text-xs">Einheiten</TableHead>
                    <TableHead className="text-xs">Stückpreis</TableHead>
                    <TableHead className="text-xs text-right">Betrag</TableHead>
                    <TableHead className="text-xs">Kampagne</TableHead>
                    <TableHead className="text-xs">Agentur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COST_LOG_ENTRIES.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{e.time}</TableCell>
                      <TableCell className="text-xs font-mono">{e.session}</TableCell>
                      <TableCell className="text-xs">{e.agent}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{e.type}</Badge></TableCell>
                      <TableCell className="text-xs">{e.provider}</TableCell>
                      <TableCell className="text-xs">{e.units}</TableCell>
                      <TableCell className="text-xs">{e.unitPrice.toFixed(4)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{e.amount.toFixed(2)} {e.currency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.campaign}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.agency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MONITORING ── */}
        <TabsContent value="monitoring">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Live Sessions', value: MOCK_MONITORING.liveSessions, icon: Activity, warn: false },
                { label: 'Fehlerquote', value: `${MOCK_MONITORING.errorRate}%`, icon: AlertTriangle, warn: MOCK_MONITORING.errorRate > 20 },
                { label: 'Abbrüche', value: MOCK_MONITORING.connectionDrops, icon: PhoneOff, warn: MOCK_MONITORING.connectionDrops > 5 },
                { label: 'Provider-Fehler', value: MOCK_MONITORING.providerErrors, icon: Server, warn: MOCK_MONITORING.providerErrors > 3 },
                { label: 'Eskalationsquote', value: `${MOCK_MONITORING.escalationRate}%`, icon: AlertCircle, warn: MOCK_MONITORING.escalationRate > 25 },
              ].map(m => (
                <Card key={m.label} className={m.warn ? 'border-destructive/50' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <m.icon className={`h-3.5 w-3.5 ${m.warn ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                    </div>
                    <p className={`text-lg font-bold ${m.warn ? 'text-destructive' : ''}`}>{m.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* System Health Checks */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">System-Health-Checks</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'Calls/Stunde', current: MOCK_MONITORING.callsLastHour, expected: MOCK_MONITORING.avgCallsPerHour, warn: MOCK_MONITORING.callsLastHour > MOCK_MONITORING.avgCallsPerHour * 2 },
                  { label: 'Agents ohne Wissensquelle', current: MOCK_MONITORING.agentsWithoutKnowledge, expected: 0, warn: MOCK_MONITORING.agentsWithoutKnowledge > 0 },
                  { label: 'Agents ohne Deployment', current: MOCK_MONITORING.agentsWithoutDeployment, expected: 0, warn: MOCK_MONITORING.agentsWithoutDeployment > 0 },
                  { label: 'Agents fehlkonfiguriert', current: MOCK_MONITORING.agentsMisconfigured, expected: 0, warn: MOCK_MONITORING.agentsMisconfigured > 0 },
                ].map(h => (
                  <div key={h.label} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {h.warn ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-green-500" />}
                      <span className="text-sm">{h.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${h.warn ? 'text-amber-600' : ''}`}>{h.current}</span>
                      <span className="text-xs text-muted-foreground">(erwartet: {h.expected})</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── KILL SWITCH ── */}
        <TabsContent value="killswitch">
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
              <ShieldOff className="h-4 w-4" />
              Kill Switches stoppen sofort alle Voice-Aktivitäten im jeweiligen Scope. Laufende Calls werden beendet, neue Calls blockiert.
            </div>

            <div className="space-y-3">
              {KILL_SWITCHES.map(ks => {
                const isActive = killStates[ks.id];
                return (
                  <Card key={ks.id} className={isActive ? 'border-destructive bg-destructive/5' : ''}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-destructive/10' : 'bg-muted'}`}>
                          <ks.icon className={`h-5 w-5 ${isActive ? 'text-destructive' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{ks.label}</p>
                            <Badge variant="outline" className="text-[10px]">{ks.scope}</Badge>
                            {isActive && <Badge variant="destructive" className="text-[10px]">ABGESCHALTET</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{ks.desc}</p>
                        </div>
                      </div>
                      <Button
                        variant={isActive ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => requestKillSwitch(ks.id, ks.label, ks.scope)}
                      >
                        {isActive ? <><Power className="h-3 w-3 mr-1" />Reaktivieren</> : <><XOctagon className="h-3 w-3 mr-1" />Abschalten</>}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── ALERTS ── */}
        <TabsContent value="alerts">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-destructive">{criticalAlerts.length}</p><p className="text-[10px] text-muted-foreground">Kritisch</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-amber-500">{activeAlerts.filter(a => a.severity === 'warning').length}</p><p className="text-[10px] text-muted-foreground">Warnungen</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-muted-foreground">{alerts.filter(a => !a.active).length}</p><p className="text-[10px] text-muted-foreground">Quittiert</p></CardContent></Card>
            </div>

            <div className="space-y-2">
              {alerts.map(a => (
                <Card key={a.id} className={!a.active ? 'opacity-50' : a.severity === 'critical' ? 'border-destructive/50' : ''}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${a.severity === 'critical' ? 'bg-destructive/10' : a.severity === 'warning' ? 'bg-amber-500/10' : 'bg-muted'}`}>
                        {a.severity === 'critical' ? <XOctagon className="h-4 w-4 text-destructive" /> : a.severity === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{a.title}</p>
                          <Badge variant={a.severity === 'critical' ? 'destructive' : a.severity === 'warning' ? 'outline' : 'secondary'} className="text-[10px]">{a.severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{a.desc}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                      </div>
                    </div>
                    {a.active && (
                      <Button variant="ghost" size="sm" onClick={() => dismissAlert(a.id)}>Quittieren</Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Kill Switch Confirmation ── */}
      <AlertDialog open={!!killConfirm} onOpenChange={() => setKillConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><XOctagon className="h-5 w-5 text-destructive" />Kill Switch aktivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{killConfirm?.label}</strong> ({killConfirm?.scope}) wird sofort abgeschaltet.
              Alle laufenden Voice-Sessions in diesem Scope werden beendet, neue Calls werden blockiert.
              Diese Aktion kann jederzeit rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmKillSwitch}>
              Jetzt abschalten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
