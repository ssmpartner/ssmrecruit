import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Bot, PhoneCall, PhoneIncoming, PhoneOutgoing, TrendingUp, Clock,
  CheckCircle2, XCircle, AlertTriangle, DollarSign, Users, Calendar,
  ArrowUpRight, ArrowDownRight, Minus, Zap, RefreshCw
} from 'lucide-react';
import { getMockSessions, getMockCostData, getMockAgents, getMockCampaigns } from '@/lib/ai-voice-mock';

export default function VoiceDashboardTab() {
  const agents = getMockAgents();
  const sessions = getMockSessions();
  const costs = getMockCostData();
  const campaigns = getMockCampaigns();

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const appointmentSessions = completedSessions.filter(s => s.outcome === 'appointment_scheduled');
  const escalatedSessions = sessions.filter(s => s.outcome === 'escalated' || s.outcome === 'callback_requested');
  const failedSessions = sessions.filter(s => s.status === 'no_answer' || s.status === 'failed');

  const kpis = [
    { label: 'Aktive Agenten', value: agents.filter(a => a.is_active).length, sub: `von ${agents.length}`, icon: Bot, trend: 'up' },
    { label: 'Laufende Sessions', value: 0, sub: 'aktuell', icon: PhoneCall, trend: 'neutral' },
    { label: 'Calls heute', value: sessions.length, sub: `${completedSessions.length} abgeschlossen`, icon: PhoneOutgoing, trend: 'up' },
    { label: 'Qualifizierungen', value: completedSessions.length, sub: `${Math.round(completedSessions.length / Math.max(sessions.length, 1) * 100)}% Rate`, icon: CheckCircle2, trend: 'up' },
    { label: 'Terminierungen', value: appointmentSessions.length, sub: 'Termine vereinbart', icon: Calendar, trend: 'up' },
    { label: 'Übergaben', value: escalatedSessions.length, sub: 'an Mitarbeiter', icon: Users, trend: 'neutral' },
    { label: 'Fehler / Abbrüche', value: failedSessions.length, sub: 'keine Antwort', icon: XCircle, trend: 'down' },
    { label: 'Tageskosten', value: `${(costs.totalCost / 6).toFixed(2)}`, sub: 'CHF heute', icon: DollarSign, trend: 'neutral' },
    { label: 'Monatskosten', value: `${costs.totalCost.toFixed(2)}`, sub: 'CHF gesamt', icon: DollarSign, trend: 'up' },
    { label: 'Offene Eskalationen', value: 0, sub: 'keine ausstehend', icon: AlertTriangle, trend: 'neutral' },
  ];

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <ArrowUpRight className="h-3 w-3 text-green-600" />;
    if (trend === 'down') return <ArrowDownRight className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm"><Zap className="h-4 w-4 mr-1.5" />Test-Call starten</Button>
        <Button size="sm" variant="outline"><RefreshCw className="h-4 w-4 mr-1.5" />Daten aktualisieren</Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((kpi, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <kpi.icon className="h-4 w-4 text-primary" />
                <TrendIcon trend={kpi.trend} />
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Letzte Calls</CardTitle>
            <CardDescription>Aktuelle Session-Aktivität</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3">
                    {s.direction === 'outbound' ? <PhoneOutgoing className="h-4 w-4 text-primary" /> : <PhoneIncoming className="h-4 w-4 text-accent-foreground" />}
                    <div>
                      <p className="text-sm font-medium">{s.lead_name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.agent_name} · {s.duration_seconds}s</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={s.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                      {s.status === 'completed' ? 'OK' : s.status}
                    </Badge>
                    {s.is_test && <Badge variant="outline" className="text-[10px]">Test</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agent Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Agenten-Status</CardTitle>
            <CardDescription>Übersicht aller Voice Agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agents.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground">{a.sessions_count} Sessions · {a.success_rate}% Erfolg</p>
                    </div>
                  </div>
                  <Badge variant={a.is_active ? 'default' : 'secondary'}>{a.is_active ? 'Aktiv' : 'Inaktiv'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Campaigns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Kampagnen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaigns.map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.completed_calls}/{c.total_calls} Calls</p>
                  </div>
                  <div className="w-28">
                    {c.total_calls > 0 && <Progress value={(c.completed_calls / c.total_calls) * 100} className="h-2" />}
                    <p className="text-[10px] text-muted-foreground text-right mt-0.5">{c.success_rate}% Erfolg</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kostenverteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold mb-3">{costs.totalCost.toFixed(2)} {costs.currency}</p>
            <div className="space-y-2">
              {costs.breakdown.map(b => (
                <div key={b.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-medium">{b.amount.toFixed(2)} CHF</span>
                  </div>
                  <Progress value={b.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Statusverteilung der Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Abgeschlossen', count: completedSessions.length, color: 'bg-green-500' },
              { label: 'Keine Antwort', count: failedSessions.length, color: 'bg-yellow-500' },
              { label: 'Termin', count: appointmentSessions.length, color: 'bg-blue-500' },
              { label: 'Rückruf', count: escalatedSessions.length, color: 'bg-orange-500' },
              { label: 'Abgelehnt', count: sessions.filter(s => s.outcome === 'not_interested').length, color: 'bg-red-500' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                <div>
                  <p className="text-sm font-medium">{s.count}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
