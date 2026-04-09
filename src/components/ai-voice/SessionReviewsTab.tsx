import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Flag, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const SENTIMENT_BADGE: Record<string, { label: string; cls: string }> = {
  positive: { label: 'Positiv', cls: 'bg-emerald-500/10 text-emerald-700' },
  neutral: { label: 'Neutral', cls: 'bg-muted text-muted-foreground' },
  negative: { label: 'Negativ', cls: 'bg-destructive/10 text-destructive' },
};

export default function SessionReviewsTab() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadSessions();
  }, [filter]);

  async function loadSessions() {
    let query = supabase
      .from('ai_voice_sessions')
      .select('id, agent_id, direction, status, outcome, sentiment, duration_seconds, started_at, summary, summary_status')
      .order('started_at', { ascending: false })
      .limit(100);

    if (filter === 'flagged') query = query.eq('summary_status', 'flagged');
    if (filter === 'negative') query = query.eq('sentiment', 'negative');
    if (filter === 'needs_review') query = query.in('summary_status', ['pending', '']);

    const { data } = await query;
    setSessions(data || []);
    setLoading(false);
  }

  const flaggedCount = sessions.filter(s => s.summary_status === 'flagged').length;
  const negativeCount = sessions.filter(s => s.sentiment === 'negative').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl bg-destructive/10 p-3"><Flag className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">{flaggedCount}</p>
              <p className="text-xs text-muted-foreground">Markierte Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl bg-amber-500/10 p-3"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{negativeCount}</p>
              <p className="text-xs text-muted-foreground">Negative Stimmung</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">Sessions gesamt</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Session Reviews</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Sessions</SelectItem>
                <SelectItem value="flagged">Markiert</SelectItem>
                <SelectItem value="negative">Negativ</SelectItem>
                <SelectItem value="needs_review">Prüfung ausstehend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Lade Sessions…</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Keine Sessions gefunden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Richtung</TableHead>
                  <TableHead>Ergebnis</TableHead>
                  <TableHead>Stimmung</TableHead>
                  <TableHead>Dauer</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{s.started_at ? format(new Date(s.started_at), 'dd.MM.yy HH:mm', { locale: de }) : '–'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.direction === 'outbound' ? 'Ausgehend' : 'Eingehend'}</Badge></TableCell>
                    <TableCell className="text-xs">{s.outcome || '–'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${SENTIMENT_BADGE[s.sentiment]?.cls || ''}`}>
                        {SENTIMENT_BADGE[s.sentiment]?.label || s.sentiment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.duration_seconds}s</TableCell>
                    <TableCell>
                      {s.summary_status === 'flagged' && <Badge variant="destructive" className="text-[10px]">Markiert</Badge>}
                      {s.summary_status === 'reviewed' && <Badge className="text-[10px]">Geprüft</Badge>}
                      {(!s.summary_status || s.summary_status === 'pending') && <Badge variant="outline" className="text-[10px]">Offen</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
