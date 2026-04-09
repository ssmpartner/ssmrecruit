import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield, AlertTriangle, CheckCircle2, Eye, FileText, Search,
  Filter, Flag, MessageSquare, Clock, User, ChevronRight, Plus,
  BookOpen, History, XCircle, RefreshCw, Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const db = { from: (t: string) => supabase.from(t as any) };

/* ── severity config ──────────────────────────────────────────── */
const SEV: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-muted text-muted-foreground', label: 'Niedrig' },
  medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Mittel' },
  high: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', label: 'Hoch' },
  critical: { color: 'bg-destructive/10 text-destructive', label: 'Kritisch' },
};

const REVIEW_STATUSES = ['pending', 'in_review', 'reviewed', 'flagged', 'cleared'] as const;
const KNOWLEDGE_STATUSES = ['draft', 'in_review', 'approved', 'rejected', 'expired'] as const;

/* ═══════════════════════════════════════════════════════════════
   1. AUDIT LOG SUB-TAB
   ═══════════════════════════════════════════════════════════════ */
function AuditLogSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const { data } = await db.from('ai_audit_logs').select('*').order('changed_at', { ascending: false }).limit(200);
    setLogs(data || []);
    setLoading(false);
  }

  const tables = [...new Set(logs.map(l => l.table_name))];
  const actions = [...new Set(logs.map(l => l.action))];

  const filtered = logs.filter(l => {
    if (tableFilter !== 'all' && l.table_name !== tableFilter) return false;
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (search && !JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const actionBadge = (a: string) => {
    const map: Record<string, string> = {
      create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      delete: 'bg-destructive/10 text-destructive',
      publish: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      kill_switch: 'bg-destructive/10 text-destructive',
      status_change: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return map[a] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Tabelle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Tabellen</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Aktion" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Aktionen</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadLogs}><RefreshCw className="h-3.5 w-3.5 mr-1" />Aktualisieren</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{logs.length}</p>
          <p className="text-xs text-muted-foreground">Einträge gesamt</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{logs.filter(l => l.action === 'create').length}</p>
          <p className="text-xs text-muted-foreground">Erstellt</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{logs.filter(l => l.action === 'update' || l.action === 'status_change').length}</p>
          <p className="text-xs text-muted-foreground">Geändert</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{logs.filter(l => ['kill_switch', 'delete'].includes(l.action)).length}</p>
          <p className="text-xs text-muted-foreground">Kritisch</p>
        </CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Zeitpunkt</TableHead>
                <TableHead>Tabelle</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Datensatz</TableHead>
                <TableHead>Benutzer</TableHead>
                <TableHead className="w-[80px]">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Lade…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Keine Einträge</TableCell></TableRow>
              ) : filtered.map(l => (
                <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetail(l)}>
                  <TableCell className="text-xs font-mono">{format(new Date(l.changed_at), 'dd.MM.yy HH:mm', { locale: de })}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.table_name}</Badge></TableCell>
                  <TableCell><Badge className={`text-[10px] ${actionBadge(l.action)}`}>{l.action}</Badge></TableCell>
                  <TableCell className="text-sm truncate max-w-[200px]">{l.record_id}</TableCell>
                  <TableCell className="text-sm">{l.changed_by || '–'}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Audit Detail</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Tabelle:</span> <Badge variant="outline">{detail.table_name}</Badge></div>
                <div><span className="text-muted-foreground">Aktion:</span> <Badge className={actionBadge(detail.action)}>{detail.action}</Badge></div>
                <div><span className="text-muted-foreground">Datensatz:</span> {detail.record_id}</div>
                <div><span className="text-muted-foreground">Benutzer:</span> {detail.changed_by}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Zeitpunkt:</span> {format(new Date(detail.changed_at), 'dd.MM.yyyy HH:mm:ss', { locale: de })}</div>
              </div>
              {detail.old_data && (
                <div>
                  <p className="text-xs font-medium mb-1 text-muted-foreground">Vorher:</p>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[200px]">{JSON.stringify(detail.old_data, null, 2)}</pre>
                </div>
              )}
              {detail.new_data && (
                <div>
                  <p className="text-xs font-medium mb-1 text-muted-foreground">Nachher:</p>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[200px]">{JSON.stringify(detail.new_data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. COMPLIANCE RULES SUB-TAB
   ═══════════════════════════════════════════════════════════════ */
function ComplianceRulesSection() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRule, setEditRule] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadRules(); }, []);

  async function loadRules() {
    setLoading(true);
    const { data } = await db.from('ai_compliance_rules').select('*').order('severity', { ascending: false });
    setRules(data || []);
    setLoading(false);
  }

  async function toggleRule(id: string, active: boolean) {
    await db.from('ai_compliance_rules').update({ is_active: active } as any).eq('id', id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: active } : r));
  }

  const RULE_TYPES = [
    { value: 'recording_consent', label: 'Aufnahme-Einwilligung' },
    { value: 'disclosure', label: 'KI-Offenlegung' },
    { value: 'data_retention', label: 'Datenhaltung' },
    { value: 'call_hours', label: 'Anrufzeiten' },
    { value: 'max_attempts', label: 'Max. Versuche' },
    { value: 'forbidden_topic', label: 'Gesperrtes Thema' },
    { value: 'forbidden_statement', label: 'Gesperrte Aussage' },
    { value: 'escalation_trigger', label: 'Eskalations-Trigger' },
    { value: 'custom', label: 'Benutzerdefiniert' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{rules.filter(r => r.is_active).length} aktiv</Badge>
          <Badge variant="secondary">{rules.length} gesamt</Badge>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5 mr-1" />Regel hinzufügen</Button>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Lade Regeln…</CardContent></Card>
        ) : rules.map(rule => {
          const sev = SEV[rule.severity] || SEV.medium;
          return (
            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{rule.name}</p>
                      <Badge variant="outline" className="text-[10px]">{rule.rule_type}</Badge>
                      <Badge className={`text-[10px] ${sev.color}`}>{sev.label}</Badge>
                      <Badge variant="outline" className="text-[10px]">→ {rule.applies_to}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRule(rule)}><Eye className="h-3.5 w-3.5" /></Button>
                  <Switch checked={rule.is_active} onCheckedChange={v => toggleRule(rule.id, v)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Rule Dialog */}
      <RuleDialog
        open={showAdd || !!editRule}
        onClose={() => { setShowAdd(false); setEditRule(null); }}
        rule={editRule}
        ruleTypes={RULE_TYPES}
        onSaved={loadRules}
      />
    </div>
  );
}

function RuleDialog({ open, onClose, rule, ruleTypes, onSaved }: {
  open: boolean; onClose: () => void; rule: any | null;
  ruleTypes: { value: string; label: string }[]; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '', description: '', rule_type: 'custom', severity: 'medium', applies_to: 'all', is_active: true,
  });

  useEffect(() => {
    if (rule) setForm({ name: rule.name, description: rule.description, rule_type: rule.rule_type, severity: rule.severity, applies_to: rule.applies_to, is_active: rule.is_active });
    else setForm({ name: '', description: '', rule_type: 'custom', severity: 'medium', applies_to: 'all', is_active: true });
  }, [rule, open]);

  async function save() {
    if (rule) {
      await db.from('ai_compliance_rules').update(form as any).eq('id', rule.id);
    } else {
      await db.from('ai_compliance_rules').insert(form as any);
    }
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{rule ? 'Regel bearbeiten' : 'Neue Compliance-Regel'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Textarea placeholder="Beschreibung" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.rule_type} onValueChange={v => setForm(p => ({ ...p, rule_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ruleTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Niedrig</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
                <SelectItem value="critical">Kritisch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={form.applies_to} onValueChange={v => setForm(p => ({ ...p, applies_to: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="recordings">Aufnahmen</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
            <span className="text-sm">Aktiv</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={save} disabled={!form.name}>{rule ? 'Speichern' : 'Erstellen'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. SESSION REVIEW SUB-TAB
   ═══════════════════════════════════════════════════════════════ */
function SessionReviewSection() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'escalated' | 'review'>('all');
  const [reviewSession, setReviewSession] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [turns, setTurns] = useState<any[]>([]);

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() {
    setLoading(true);
    const { data } = await db.from('ai_voice_sessions').select('*').order('created_at', { ascending: false }).limit(100);
    setSessions(data || []);
    setLoading(false);
  }

  async function openReview(s: any) {
    setReviewSession(s);
    setReviewNote('');
    const { data } = await db.from('ai_voice_turns').select('*').eq('session_id', s.id).order('turn_index', { ascending: true });
    setTurns(data || []);
  }

  async function flagSession(id: string, flag: string) {
    const meta = (sessions.find(s => s.id === id)?.metadata || {}) as any;
    await db.from('ai_voice_sessions').update({ metadata: { ...meta, qa_flag: flag, qa_reviewed_at: new Date().toISOString(), qa_note: reviewNote || meta.qa_note || '' } } as any).eq('id', id);
    await loadSessions();
    setReviewSession(null);
  }

  const filtered = sessions.filter(s => {
    const meta = (s.metadata || {}) as any;
    if (filter === 'flagged') return meta.qa_flag === 'flagged';
    if (filter === 'escalated') return s.escalation_status !== 'none';
    if (filter === 'review') return !meta.qa_flag || meta.qa_flag === 'pending';
    return true;
  });

  const qaStatus = (s: any) => {
    const flag = (s.metadata as any)?.qa_flag;
    if (flag === 'flagged') return <Badge className="text-[10px] bg-destructive/10 text-destructive">Flagged</Badge>;
    if (flag === 'cleared') return <Badge className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Geprüft</Badge>;
    if (flag === 'reviewed') return <Badge className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Reviewed</Badge>;
    return <Badge variant="outline" className="text-[10px]">Offen</Badge>;
  };

  const sentimentBadge = (s: string) => {
    const map: Record<string, string> = {
      positive: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      negative: 'bg-destructive/10 text-destructive',
      neutral: 'bg-muted text-muted-foreground',
    };
    return map[s] || map.neutral;
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {([['all', 'Alle'], ['review', 'Zu prüfen'], ['flagged', 'Flagged'], ['escalated', 'Eskaliert']] as const).map(([key, label]) => (
          <Button key={key} variant={filter === key ? 'default' : 'outline'} size="sm" onClick={() => setFilter(key)}>{label}
            {key === 'flagged' && <Badge variant="secondary" className="ml-1 text-[10px]">{sessions.filter(s => (s.metadata as any)?.qa_flag === 'flagged').length}</Badge>}
            {key === 'review' && <Badge variant="secondary" className="ml-1 text-[10px]">{sessions.filter(s => !(s.metadata as any)?.qa_flag || (s.metadata as any)?.qa_flag === 'pending').length}</Badge>}
          </Button>
        ))}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={loadSessions}><RefreshCw className="h-3.5 w-3.5 mr-1" />Aktualisieren</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{sessions.length}</p>
          <p className="text-xs text-muted-foreground">Sessions gesamt</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{sessions.filter(s => (s.metadata as any)?.qa_flag === 'flagged').length}</p>
          <p className="text-xs text-muted-foreground">Flagged</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{sessions.filter(s => s.escalation_status !== 'none').length}</p>
          <p className="text-xs text-muted-foreground">Eskaliert</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{sessions.filter(s => (s.metadata as any)?.qa_flag === 'cleared').length}</p>
          <p className="text-xs text-muted-foreground">Geprüft ✓</p>
        </CardContent></Card>
      </div>

      {/* Session list */}
      <Card>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Richtung</TableHead>
                <TableHead>Dauer</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Ergebnis</TableHead>
                <TableHead>QA-Status</TableHead>
                <TableHead>Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Lade…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Sessions</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-mono">{s.session_uid || s.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(s.created_at), 'dd.MM.yy HH:mm', { locale: de })}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.direction}</Badge></TableCell>
                  <TableCell className="text-sm">{s.duration_seconds}s</TableCell>
                  <TableCell><Badge className={`text-[10px] ${sentimentBadge(s.sentiment)}`}>{s.sentiment}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{s.result_type || s.outcome || '–'}</Badge></TableCell>
                  <TableCell>{qaStatus(s)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openReview(s)}><Eye className="h-3.5 w-3.5 mr-1" />Prüfen</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewSession} onOpenChange={() => setReviewSession(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Session Review – {reviewSession?.session_uid || reviewSession?.id?.slice(0, 8)}</DialogTitle></DialogHeader>
          {reviewSession && (
            <ScrollArea className="max-h-[65vh]">
              <div className="space-y-4">
                {/* Session Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Richtung:</span> {reviewSession.direction}</div>
                  <div><span className="text-muted-foreground">Dauer:</span> {reviewSession.duration_seconds}s</div>
                  <div><span className="text-muted-foreground">Sentiment:</span> <Badge className={`text-[10px] ${sentimentBadge(reviewSession.sentiment)}`}>{reviewSession.sentiment}</Badge></div>
                  <div><span className="text-muted-foreground">Ergebnis:</span> {reviewSession.result_type || '–'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Zusammenfassung:</span> {reviewSession.summary || '–'}</div>
                  <div><span className="text-muted-foreground">Kosten:</span> CHF {Number(reviewSession.cost_total).toFixed(2)}</div>
                  <div><span className="text-muted-foreground">QA:</span> {qaStatus(reviewSession)}</div>
                </div>

                {/* Transcript */}
                <div>
                  <p className="text-sm font-medium mb-2">Gesprächsverlauf ({turns.length} Turns)</p>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {turns.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Kein Transcript verfügbar</p>
                    ) : turns.map(t => (
                      <div key={t.id} className={`flex gap-2 ${t.speaker === 'agent' || t.role === 'agent' ? '' : 'flex-row-reverse'}`}>
                        <div className={`rounded-lg p-2 max-w-[80%] text-sm ${t.speaker === 'agent' || t.role === 'agent' ? 'bg-primary/10' : 'bg-muted'}`}>
                          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{t.speaker === 'agent' || t.role === 'agent' ? '🤖 Agent' : '👤 Kandidat'}</p>
                          <p>{t.transcript}</p>
                          {t.interpreted_intent && <p className="text-[10px] text-muted-foreground mt-1">Intent: {t.interpreted_intent}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Note */}
                <div>
                  <p className="text-sm font-medium mb-1">Review-Notiz</p>
                  <Textarea
                    placeholder="Notiz zur Prüfung…"
                    value={reviewNote || (reviewSession.metadata as any)?.qa_note || ''}
                    onChange={e => setReviewNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setReviewSession(null)}>Schliessen</Button>
            <Button variant="outline" className="text-green-600 border-green-200" onClick={() => flagSession(reviewSession.id, 'cleared')}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />OK – Freigeben
            </Button>
            <Button variant="outline" className="text-blue-600 border-blue-200" onClick={() => flagSession(reviewSession.id, 'reviewed')}>
              <Eye className="h-3.5 w-3.5 mr-1" />Reviewed
            </Button>
            <Button variant="destructive" onClick={() => flagSession(reviewSession.id, 'flagged')}>
              <Flag className="h-3.5 w-3.5 mr-1" />Flaggen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. KNOWLEDGE APPROVAL SUB-TAB
   ═══════════════════════════════════════════════════════════════ */
function KnowledgeApprovalSection() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setLoading(true);
    const { data } = await db.from('ai_voice_knowledge_items').select('*').order('updated_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const updates: any = { approval_status: status };
    if (status === 'approved') updates.approved_for_live_calls = true;
    if (status === 'rejected') updates.approved_for_live_calls = false;
    await db.from('ai_voice_knowledge_items').update(updates as any).eq('id', id);
    loadItems();
  }

  const filtered = items.filter(i => statusFilter === 'all' || i.approval_status === statusFilter);

  const statusBadge = (s: string) => {
    const map: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-muted text-muted-foreground', label: 'Entwurf' },
      in_review: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'In Prüfung' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Freigegeben' },
      rejected: { color: 'bg-destructive/10 text-destructive', label: 'Abgelehnt' },
      expired: { color: 'bg-muted text-muted-foreground', label: 'Abgelaufen' },
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Ausstehend' },
    };
    const c = map[s] || map.draft;
    return <Badge className={`text-[10px] ${c.color}`}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {(['all', 'draft', 'in_review', 'approved', 'rejected', 'expired'] as const).map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'Alle' : s === 'draft' ? 'Entwurf' : s === 'in_review' ? 'In Prüfung' : s === 'approved' ? 'Freigegeben' : s === 'rejected' ? 'Abgelehnt' : 'Abgelaufen'}
            <Badge variant="secondary" className="ml-1 text-[10px]">{s === 'all' ? items.length : items.filter(i => i.approval_status === s).length}</Badge>
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Gesamt', count: items.length },
          { label: 'Entwurf', count: items.filter(i => i.approval_status === 'draft').length },
          { label: 'In Prüfung', count: items.filter(i => i.approval_status === 'in_review' || i.approval_status === 'pending').length },
          { label: 'Freigegeben', count: items.filter(i => i.approval_status === 'approved').length },
          { label: 'Live-fähig', count: items.filter(i => i.approved_for_live_calls).length },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{s.count}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Risiko</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Live</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Lade…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Einträge</TableCell></TableRow>
              ) : filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{item.content?.slice(0, 60)}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{item.category}</Badge></TableCell>
                  <TableCell><Badge className={`text-[10px] ${SEV[item.risk_class]?.color || SEV.low.color}`}>{SEV[item.risk_class]?.label || item.risk_class}</Badge></TableCell>
                  <TableCell className="text-sm">v{item.version}</TableCell>
                  <TableCell>{statusBadge(item.approval_status)}</TableCell>
                  <TableCell>{item.approved_for_live_calls ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(item.approval_status === 'in_review' || item.approval_status === 'pending' || item.approval_status === 'draft') && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 text-green-600" onClick={() => updateStatus(item.id, 'approved')}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => updateStatus(item.id, 'rejected')}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {item.approval_status === 'draft' && (
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => updateStatus(item.id, 'in_review')}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {item.approval_status === 'rejected' && (
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => updateStatus(item.id, 'draft')}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function ComplianceTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Compliance & Audit</h3>
        <Badge variant="outline" className="text-xs"><Shield className="h-3 w-3 mr-1" />Revisionssicher</Badge>
      </div>

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="audit" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1" />Audit Log</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs"><Shield className="h-3.5 w-3.5 mr-1" />Regeln</TabsTrigger>
          <TabsTrigger value="review" className="text-xs"><Eye className="h-3.5 w-3.5 mr-1" />Session Review</TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs"><BookOpen className="h-3.5 w-3.5 mr-1" />Wissensfreigabe</TabsTrigger>
        </TabsList>

        <TabsContent value="audit"><AuditLogSection /></TabsContent>
        <TabsContent value="rules"><ComplianceRulesSection /></TabsContent>
        <TabsContent value="review"><SessionReviewSection /></TabsContent>
        <TabsContent value="knowledge"><KnowledgeApprovalSection /></TabsContent>
      </Tabs>
    </div>
  );
}
