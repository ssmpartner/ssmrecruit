import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PhoneCall, Clock, Activity, AlertTriangle, CheckCircle2, XCircle, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LiveSession {
  id: string;
  agent_name: string;
  phone_to: string;
  direction: string;
  status: string;
  started_at: string;
  duration: number;
  sentiment: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active: { label: 'Aktiv', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  ringing: { label: 'Klingelt', cls: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  on_hold: { label: 'Wartend', cls: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  completed: { label: 'Beendet', cls: 'bg-muted text-muted-foreground' },
};

export default function LiveMonitoringTab() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveSessions();
    const interval = setInterval(loadActiveSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadActiveSessions() {
    const { data } = await supabase
      .from('ai_voice_sessions')
      .select('id, agent_id, phone_number_to, direction, status, started_at, duration_seconds, sentiment')
      .in('status', ['active', 'ringing', 'on_hold'])
      .order('started_at', { ascending: false })
      .limit(50);

    const mapped: LiveSession[] = (data || []).map(s => ({
      id: s.id,
      agent_name: s.agent_id?.substring(0, 8) || '–',
      phone_to: s.phone_number_to || '–',
      direction: s.direction,
      status: s.status,
      started_at: s.started_at || '',
      duration: s.duration_seconds,
      sentiment: s.sentiment,
    }));
    setSessions(mapped);
    setLoading(false);
  }

  const activeCount = sessions.filter(s => s.status === 'active').length;
  const ringingCount = sessions.filter(s => s.status === 'ringing').length;

  return (
    <div className="space-y-6">
      {/* Live KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-3"><PhoneCall className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Aktive Gespräche</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl bg-amber-500/10 p-3"><Activity className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{ringingCount}</p>
              <p className="text-xs text-muted-foreground">Klingelnd</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl bg-blue-500/10 p-3"><Bot className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">Sessions gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3"><Clock className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">Auto</p>
              <p className="text-xs text-muted-foreground">Refresh: 10s</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Session List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Sessions
            <Badge variant="outline" className="ml-2 text-xs">{sessions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Lade Live-Daten…</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">Keine aktiven Gespräche</p>
              <p className="text-xs text-muted-foreground">Alle AI-Agenten sind im Leerlauf.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${s.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-sm font-medium">{s.phone_to}</p>
                      <p className="text-xs text-muted-foreground">Agent: {s.agent_name} · {s.direction === 'outbound' ? 'Ausgehend' : 'Eingehend'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{s.duration}s</span>
                    <Badge variant="outline" className={STATUS_BADGE[s.status]?.cls || ''}>
                      {STATUS_BADGE[s.status]?.label || s.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
