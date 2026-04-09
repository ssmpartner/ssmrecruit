import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, Phone, PhoneIncoming, PhoneOutgoing, Clock, CheckCircle2,
  Calendar, AlertTriangle, DollarSign, XCircle, Target, Users, Award,
  Download, Filter, ArrowUpRight, ArrowDownRight, Minus, Building2
} from 'lucide-react';

/* ── Helper ───────────────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString('de-CH');
const pct = (n: number) => `${n.toFixed(1)}%`;
const chf = (n: number) => `${n.toFixed(2)} CHF`;

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(160, 40%, 50%)',
  'hsl(200, 50%, 55%)',
  'hsl(30, 70%, 55%)',
  'hsl(280, 40%, 55%)',
];

/* ── Mock Data Generator ──────────────────────────────────────── */
function generateMockData(period: string) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 14;
  const dailyData = Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const outbound = Math.floor(Math.random() * 25) + 10;
    const inbound = Math.floor(Math.random() * 12) + 3;
    const total = outbound + inbound;
    const connected = Math.floor(total * (0.55 + Math.random() * 0.25));
    const qualified = Math.floor(connected * (0.25 + Math.random() * 0.2));
    const appointments = Math.floor(qualified * (0.4 + Math.random() * 0.3));
    return {
      date: d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }),
      dateISO: d.toISOString().slice(0, 10),
      total, outbound, inbound, connected, qualified, appointments,
      noAnswer: Math.floor(total * (0.15 + Math.random() * 0.1)),
      voicemail: Math.floor(total * (0.05 + Math.random() * 0.05)),
      escalated: Math.floor(connected * (0.05 + Math.random() * 0.08)),
      handover: Math.floor(connected * (0.02 + Math.random() * 0.05)),
      aborted: Math.floor(total * (0.03 + Math.random() * 0.04)),
      costTotal: +(total * (0.6 + Math.random() * 0.5)).toFixed(2),
    };
  });

  const sum = (key: string) => dailyData.reduce((a, d) => a + ((d as any)[key] || 0), 0);
  const totalCalls = sum('total');
  const totalConnected = sum('connected');
  const totalQualified = sum('qualified');
  const totalAppointments = sum('appointments');
  const totalCost = +sum('costTotal').toFixed(2);

  return {
    dailyData,
    kpis: {
      totalCalls, outbound: sum('outbound'), inbound: sum('inbound'),
      connected: totalConnected,
      connectedRate: totalCalls ? (totalConnected / totalCalls) * 100 : 0,
      noAnswerRate: totalCalls ? (sum('noAnswer') / totalCalls) * 100 : 0,
      voicemailRate: totalCalls ? (sum('voicemail') / totalCalls) * 100 : 0,
      qualifiedRate: totalConnected ? (totalQualified / totalConnected) * 100 : 0,
      appointmentRate: totalConnected ? (totalAppointments / totalConnected) * 100 : 0,
      escalationRate: totalConnected ? (sum('escalated') / totalConnected) * 100 : 0,
      handoverRate: totalConnected ? (sum('handover') / totalConnected) * 100 : 0,
      abortRate: totalCalls ? (sum('aborted') / totalCalls) * 100 : 0,
      costPerCall: totalCalls ? totalCost / totalCalls : 0,
      costPerQualified: totalQualified ? totalCost / totalQualified : 0,
      costPerAppointment: totalAppointments ? totalCost / totalAppointments : 0,
      totalCost, totalQualified, totalAppointments,
      totalEscalated: sum('escalated'), totalHandover: sum('handover'),
    },
  };
}

const AGENTS = [
  { id: 'a1', name: 'SSM Recruiting Bot', type: 'outbound' },
  { id: 'a2', name: 'SSM Inbound Assistent', type: 'inbound' },
  { id: 'a3', name: 'Reactivation Agent', type: 'outbound' },
];

const AGENCIES = [
  { id: 'ag1', name: 'SSM Partner Hauptsitz' },
  { id: 'ag2', name: 'Agentur Zürich' },
  { id: 'ag3', name: 'Agentur Bern' },
];

const CAMPAIGNS = [
  { id: 'c1', name: 'Frühlings-Recruiting 2026' },
  { id: 'c2', name: 'Reactivation Q2' },
  { id: 'c3', name: 'Inbound Follow-up' },
];

const SOURCES = ['Meta', 'TikTok', 'Google', 'Website', 'Empfehlung'];

function generateRankingData() {
  return {
    agents: AGENTS.map(a => ({
      ...a, calls: Math.floor(Math.random() * 200) + 50,
      successRate: +(55 + Math.random() * 35).toFixed(1),
      appointmentRate: +(20 + Math.random() * 30).toFixed(1),
      costPerCall: +(0.5 + Math.random() * 0.8).toFixed(2),
      avgDuration: Math.floor(20 + Math.random() * 40),
      escalationRate: +(3 + Math.random() * 12).toFixed(1),
    })),
    agencies: AGENCIES.map(a => ({
      ...a, calls: Math.floor(Math.random() * 300) + 100,
      successRate: +(60 + Math.random() * 30).toFixed(1),
      qualifiedLeads: Math.floor(Math.random() * 80) + 20,
      costPerQualified: +(3 + Math.random() * 8).toFixed(2),
    })),
    campaigns: CAMPAIGNS.map(c => ({
      ...c, calls: Math.floor(Math.random() * 250) + 80,
      successRate: +(50 + Math.random() * 40).toFixed(1),
      appointments: Math.floor(Math.random() * 50) + 10,
      costPerAppointment: +(5 + Math.random() * 15).toFixed(2),
    })),
    sources: SOURCES.map(s => ({
      name: s, leads: Math.floor(Math.random() * 120) + 30,
      called: Math.floor(Math.random() * 100) + 20,
      qualified: Math.floor(Math.random() * 40) + 5,
      rate: +(40 + Math.random() * 40).toFixed(1),
    })),
  };
}

/* ── KPI Card ─────────────────────────────────────────────────── */
function KPI({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; trend?: 'up' | 'down' | 'flat';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold leading-none">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="flex items-center gap-1">
            {trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />}
            {trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />}
            {trend === 'flat' && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Pie Chart for distribution ───────────────────────────────── */
function DistributionPie({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function VoiceAnalyticsTab() {
  const [period, setPeriod] = useState('30d');
  const [agentFilter, setAgentFilter] = useState('all');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  const { dailyData, kpis } = useMemo(() => generateMockData(period), [period]);
  const rankings = useMemo(() => generateRankingData(), []);

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Voice Analytics</h3>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Tage</SelectItem>
              <SelectItem value="14d">14 Tage</SelectItem>
              <SelectItem value="30d">30 Tage</SelectItem>
              <SelectItem value="90d">90 Tage</SelectItem>
            </SelectContent>
          </Select>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Agent" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Agenten</SelectItem>
              {AGENTS.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Agentur" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Agenturen</SelectItem>
              {AGENCIES.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Kampagne" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kampagnen</SelectItem>
              {CAMPAIGNS.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" />Export</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview" className="text-xs">Übersicht</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">Zeitverlauf</TabsTrigger>
          <TabsTrigger value="rankings" className="text-xs">Rankings</TabsTrigger>
          <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Primary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <KPI label="Calls Total" value={fmt(kpis.totalCalls)} sub={`${fmt(kpis.outbound)} out · ${fmt(kpis.inbound)} in`} icon={Phone} trend="up" />
            <KPI label="Connected Rate" value={pct(kpis.connectedRate)} sub={`${fmt(kpis.connected)} verbunden`} icon={CheckCircle2} trend="up" />
            <KPI label="Qualifizierungsrate" value={pct(kpis.qualifiedRate)} sub={`${fmt(kpis.totalQualified)} qualifiziert`} icon={Target} trend="up" />
            <KPI label="Terminierungsrate" value={pct(kpis.appointmentRate)} sub={`${fmt(kpis.totalAppointments)} Termine`} icon={Calendar} trend="up" />
            <KPI label="Gesamtkosten" value={chf(kpis.totalCost)} sub={`${chf(kpis.costPerCall)} / Call`} icon={DollarSign} trend="flat" />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <KPI label="No Answer Rate" value={pct(kpis.noAnswerRate)} icon={PhoneOutgoing} trend="down" />
            <KPI label="Voicemail Rate" value={pct(kpis.voicemailRate)} icon={Phone} trend="flat" />
            <KPI label="Eskalationsrate" value={pct(kpis.escalationRate)} sub={`${fmt(kpis.totalEscalated)} Eskalationen`} icon={AlertTriangle} trend="down" />
            <KPI label="Übergabe an Mensch" value={pct(kpis.handoverRate)} sub={`${fmt(kpis.totalHandover)} Übergaben`} icon={Users} trend="flat" />
            <KPI label="Abbruchrate" value={pct(kpis.abortRate)} icon={XCircle} trend="down" />
          </div>

          {/* Cost KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPI label="Kosten / Call" value={chf(kpis.costPerCall)} icon={DollarSign} />
            <KPI label="Kosten / qualif. Lead" value={chf(kpis.costPerQualified)} icon={Target} />
            <KPI label="Kosten / Termin" value={chf(kpis.costPerAppointment)} icon={Calendar} />
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DistributionPie
              title="Calls nach Richtung"
              data={[{ name: 'Outbound', value: kpis.outbound }, { name: 'Inbound', value: kpis.inbound }]}
            />
            <DistributionPie
              title="Ergebnis-Verteilung"
              data={[
                { name: 'Qualifiziert', value: kpis.totalQualified },
                { name: 'Termin', value: kpis.totalAppointments },
                { name: 'Eskaliert', value: kpis.totalEscalated },
                { name: 'Übergabe', value: kpis.totalHandover },
              ]}
            />
            <DistributionPie
              title="Nach Quelle"
              data={rankings.sources.map(s => ({ name: s.name, value: s.leads }))}
            />
          </div>
        </TabsContent>

        {/* ── TRENDS ──────────────────────────────────────────── */}
        <TabsContent value="trends" className="space-y-6">
          {/* Calls over time */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Calls pro Tag</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="outbound" name="Outbound" stackId="1" fill={CHART_COLORS[0]} stroke={CHART_COLORS[0]} fillOpacity={0.5} />
                  <Area type="monotone" dataKey="inbound" name="Inbound" stackId="1" fill={CHART_COLORS[1]} stroke={CHART_COLORS[1]} fillOpacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rates over time */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Raten im Zeitverlauf</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData.map(d => ({
                  ...d,
                  connRate: d.total ? +((d.connected / d.total) * 100).toFixed(1) : 0,
                  qualRate: d.connected ? +((d.qualified / d.connected) * 100).toFixed(1) : 0,
                  apptRate: d.connected ? +((d.appointments / d.connected) * 100).toFixed(1) : 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} unit="%" className="text-muted-foreground" />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => `${v}%`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="connRate" name="Connected" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="qualRate" name="Qualifiziert" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="apptRate" name="Termine" stroke={CHART_COLORS[3]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Costs over time */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Kosten pro Tag (CHF)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => chf(v)} />
                  <Bar dataKey="costTotal" name="Kosten" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RANKINGS ────────────────────────────────────────── */}
        <TabsContent value="rankings" className="space-y-6">
          {/* Agent Ranking */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Ranking nach Agent</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Erfolg</TableHead>
                    <TableHead className="text-right">Termine</TableHead>
                    <TableHead className="text-right">CHF/Call</TableHead>
                    <TableHead className="text-right">Ø Dauer</TableHead>
                    <TableHead className="text-right">Eskalation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.agents.sort((a, b) => b.successRate - a.successRate).map((a, i) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</TableCell>
                      <TableCell className="font-medium text-sm">{a.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{a.type}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{a.calls}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={a.successRate} className="h-1.5 w-16" />
                          <span className="text-sm">{a.successRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{a.appointmentRate}%</TableCell>
                      <TableCell className="text-right text-sm">{a.costPerCall} CHF</TableCell>
                      <TableCell className="text-right text-sm">{a.avgDuration}s</TableCell>
                      <TableCell className="text-right text-sm">{a.escalationRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Agency Ranking */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Ranking nach Agentur</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Agentur</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Erfolgsrate</TableHead>
                    <TableHead className="text-right">Qualif. Leads</TableHead>
                    <TableHead className="text-right">CHF/Qualif.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.agencies.sort((a, b) => b.successRate - a.successRate).map((a, i) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</TableCell>
                      <TableCell className="font-medium text-sm">{a.name}</TableCell>
                      <TableCell className="text-right text-sm">{a.calls}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={a.successRate} className="h-1.5 w-16" />
                          <span className="text-sm">{a.successRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{a.qualifiedLeads}</TableCell>
                      <TableCell className="text-right text-sm">{a.costPerQualified} CHF</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Campaign Ranking */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Ranking nach Kampagne</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Kampagne</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Erfolgsrate</TableHead>
                    <TableHead className="text-right">Termine</TableHead>
                    <TableHead className="text-right">CHF/Termin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.campaigns.sort((a, b) => b.successRate - a.successRate).map((c, i) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</TableCell>
                      <TableCell className="font-medium text-sm">{c.name}</TableCell>
                      <TableCell className="text-right text-sm">{c.calls}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={c.successRate} className="h-1.5 w-16" />
                          <span className="text-sm">{c.successRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{c.appointments}</TableCell>
                      <TableCell className="text-right text-sm">{c.costPerAppointment} CHF</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Source Ranking */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Erfolgsquote nach Quelle</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quelle</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Angerufen</TableHead>
                        <TableHead className="text-right">Qualifiziert</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankings.sources.sort((a, b) => b.rate - a.rate).map(s => (
                        <TableRow key={s.name}>
                          <TableCell className="font-medium text-sm">{s.name}</TableCell>
                          <TableCell className="text-right text-sm">{s.leads}</TableCell>
                          <TableCell className="text-right text-sm">{s.called}</TableCell>
                          <TableCell className="text-right text-sm">{s.qualified}</TableCell>
                          <TableCell className="text-right text-sm">{s.rate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rankings.sources} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" unit="%" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} className="text-muted-foreground" />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="rate" name="Erfolgsrate" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DETAILS ──────────────────────────────────────────── */}
        <TabsContent value="details" className="space-y-6">
          {/* Agent Detail Cards */}
          <h4 className="text-sm font-semibold">Agenten-Details</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rankings.agents.map(a => (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{a.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Calls</span><span className="font-medium">{a.calls}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Ø Dauer</span><span className="font-medium">{a.avgDuration}s</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Erfolg</span><span className="font-medium">{a.successRate}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Termine</span><span className="font-medium">{a.appointmentRate}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">CHF/Call</span><span className="font-medium">{a.costPerCall}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Eskalation</span><span className="font-medium">{a.escalationRate}%</span></div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Erfolgsrate</p>
                    <Progress value={a.successRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Campaign Detail Cards */}
          <h4 className="text-sm font-semibold mt-6">Kampagnen-Details</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rankings.campaigns.map(c => (
              <Card key={c.id}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{c.name}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Calls</span><span className="font-medium">{c.calls}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Erfolg</span><span className="font-medium">{c.successRate}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Termine</span><span className="font-medium">{c.appointments}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">CHF/Termin</span><span className="font-medium">{c.costPerAppointment}</span></div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Erfolgsrate</p>
                    <Progress value={c.successRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
