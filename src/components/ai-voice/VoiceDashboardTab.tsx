import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bot, PhoneCall, PhoneOutgoing, TrendingUp, Clock,
  CheckCircle2, XCircle, AlertTriangle, DollarSign, Users, Calendar,
  ArrowUpRight, Minus, Zap, RefreshCw, Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function VoiceDashboardTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    agentsTotal: 0, agentsActive: 0, sessionsTotal: 0,
    campaignsRunning: 0, campaignsTotal: 0,
    escalationsOpen: 0, costTotal: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const [agentsRes, sessionsRes, campaignsRes, escalationsRes, costsRes] = await Promise.all([
      supabase.from('ai_agents').select('id, is_active', { count: 'exact' }).is('deleted_at', null),
      supabase.from('ai_voice_sessions').select('id, status, outcome, direction, duration_seconds, is_test, agent_id', { count: 'exact' }),
      supabase.from('ai_voice_campaigns').select('id, status', { count: 'exact' }),
      supabase.from('ai_voice_escalations').select('id', { count: 'exact' }).eq('status', 'open'),
      supabase.from('ai_voice_cost_logs').select('total_cost'),
    ]);

    const agents = agentsRes.data || [];
    const sessions = sessionsRes.data || [];
    const campaigns = campaignsRes.data || [];
    const costSum = (costsRes.data || []).reduce((s, c) => s + Number(c.total_cost || 0), 0);

    setStats({
      agentsTotal: agents.length,
      agentsActive: agents.filter(a => a.is_active).length,
      sessionsTotal: sessions.length,
      campaignsRunning: campaigns.filter(c => c.status === 'running').length,
      campaignsTotal: campaigns.length,
      escalationsOpen: escalationsRes.count || 0,
      costTotal: costSum,
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1,2,3,4,5,6,7,8,9,10].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const hasData = stats.sessionsTotal > 0;

  const kpis = [
    { label: 'Aktive Agenten', value: stats.agentsActive, sub: `von ${stats.agentsTotal} gesamt`, icon: Bot },
    { label: 'Sessions gesamt', value: stats.sessionsTotal, sub: hasData ? 'aus Datenbank' : 'Noch keine Daten', icon: PhoneCall },
    { label: 'Kampagnen aktiv', value: stats.campaignsRunning, sub: `von ${stats.campaignsTotal} gesamt`, icon: TrendingUp },
    { label: 'Offene Eskalationen', value: stats.escalationsOpen, sub: stats.escalationsOpen === 0 ? 'Keine ausstehend' : 'Aktion erforderlich', icon: AlertTriangle },
    { label: 'Gesamtkosten', value: `${stats.costTotal.toFixed(2)}`, sub: 'CHF', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={loadStats}><RefreshCw className="h-4 w-4 mr-1.5" />Aktualisieren</Button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
          <Info className="h-3.5 w-3.5" />
          <span>Daten werden live aus der Datenbank geladen</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <kpi.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PhoneCall className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Noch keine Session-Daten</h3>
            <p className="text-sm text-muted-foreground mb-4">Starte einen Test-Call oder eine Kampagne, um hier Daten zu sehen.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Systemstatus</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-sm">Agenten konfiguriert</span>
                  <Badge variant="default">{stats.agentsTotal}</Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-sm">Kampagnen angelegt</span>
                  <Badge variant="default">{stats.campaignsTotal}</Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-sm">Sessions durchgeführt</span>
                  <Badge variant="default">{stats.sessionsTotal}</Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                  <span className="text-sm">Offene Eskalationen</span>
                  <Badge variant={stats.escalationsOpen > 0 ? 'destructive' : 'default'}>{stats.escalationsOpen}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Kosten</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-2">{stats.costTotal.toFixed(2)} CHF</p>
              <p className="text-sm text-muted-foreground">Gesamtkosten aus allen Sessions</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
