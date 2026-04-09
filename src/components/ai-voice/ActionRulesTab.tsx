import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Zap, Calendar, UserPlus, RotateCcw, CheckSquare, AlertTriangle,
  ArrowRightLeft, Plus, Clock, Check, X, Eye, ShieldCheck, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { ACTION_DEFINITIONS, actionGateway, type ActionType, type ExecutionMode } from '@/lib/ai-voice-action-gateway';

interface ActionRule {
  id: string;
  action_type: ActionType;
  trigger: string;
  mode: 'suggested' | 'auto_executed';
  approval_required: boolean;
  active: boolean;
}

const ICON_MAP: Record<string, any> = {
  set_status: ArrowRightLeft,
  open_wizard: Zap,
  create_followup: RotateCcw,
  create_task: CheckSquare,
  create_note: CheckSquare,
  assign_to_user: UserPlus,
  escalate_to_human: AlertTriangle,
  mark_wrong_number: X,
  mark_no_interest: X,
  mark_callback_requested: Clock,
  mark_qualified: Check,
  mark_not_reached: Clock,
  schedule_callback: Calendar,
  prepare_interview: Calendar,
  send_confirmation_placeholder: ShieldCheck,
};

const DEFAULT_RULES: ActionRule[] = [
  { id: '1', action_type: 'schedule_callback', trigger: 'Termin vereinbart', mode: 'suggested', approval_required: true, active: true },
  { id: '2', action_type: 'set_status', trigger: 'Neuer Lead erkannt', mode: 'auto_executed', approval_required: false, active: true },
  { id: '3', action_type: 'mark_no_interest', trigger: 'Kein Interesse', mode: 'suggested', approval_required: true, active: true },
  { id: '4', action_type: 'escalate_to_human', trigger: 'Eskalation angefordert', mode: 'auto_executed', approval_required: false, active: true },
  { id: '5', action_type: 'create_task', trigger: 'Rückruf gewünscht', mode: 'suggested', approval_required: true, active: false },
  { id: '6', action_type: 'create_followup', trigger: 'Follow-up gewünscht', mode: 'suggested', approval_required: true, active: true },
  { id: '7', action_type: 'open_wizard', trigger: 'Wizard-Ergebnis erkannt', mode: 'suggested', approval_required: true, active: false },
  { id: '8', action_type: 'assign_to_user', trigger: 'Mensch zuweisen', mode: 'suggested', approval_required: true, active: true },
  { id: '9', action_type: 'mark_wrong_number', trigger: 'Falsche Nummer erkannt', mode: 'auto_executed', approval_required: false, active: true },
  { id: '10', action_type: 'mark_callback_requested', trigger: 'Rückruf erbeten', mode: 'suggested', approval_required: true, active: true },
  { id: '11', action_type: 'mark_qualified', trigger: 'Qualifizierung bestätigt', mode: 'suggested', approval_required: true, active: true },
  { id: '12', action_type: 'mark_not_reached', trigger: 'Nicht erreicht', mode: 'auto_executed', approval_required: false, active: true },
  { id: '13', action_type: 'prepare_interview', trigger: 'Interview geplant', mode: 'suggested', approval_required: true, active: false },
  { id: '14', action_type: 'create_note', trigger: 'Gesprächsnotiz', mode: 'auto_executed', approval_required: false, active: true },
  { id: '15', action_type: 'send_confirmation_placeholder', trigger: 'Bestätigung angefordert', mode: 'suggested', approval_required: true, active: false },
];

export default function ActionRulesTab() {
  const [rules, setRules] = useState<ActionRule[]>(DEFAULT_RULES);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<string>('all');

  useEffect(() => {
    loadActionLogs();
  }, []);

  async function loadActionLogs() {
    try {
      const data = await actionGateway.getActionHistory({ limit: 50 });
      setActionLogs(data);
    } catch { /* silent */ }
  }

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    toast.success('Regel aktualisiert');
  }

  async function handleApprove(logId: string) {
    try {
      await actionGateway.approveAction(logId, 'current-user');
      toast.success('Aktion genehmigt und ausgeführt');
      loadActionLogs();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleReject(logId: string) {
    try {
      await actionGateway.rejectAction(logId, 'current-user', 'Manuell abgelehnt');
      toast.info('Aktion abgelehnt');
      loadActionLogs();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const filteredLogs = filterMode === 'all'
    ? actionLogs
    : actionLogs.filter((l: any) => l.execution_mode === filterMode);

  const modeColor = (mode: string) => {
    switch (mode) {
      case 'auto_executed': return 'default';
      case 'approved': return 'default';
      case 'suggested': return 'secondary';
      case 'shadow': return 'outline';
      case 'blocked': return 'destructive';
      default: return 'outline';
    }
  };

  const modeLabel = (mode: string) => {
    switch (mode) {
      case 'auto_executed': return 'Automatisch';
      case 'approved': return 'Genehmigt';
      case 'suggested': return 'Vorschlag';
      case 'shadow': return 'Shadow';
      case 'blocked': return 'Blockiert';
      default: return mode;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="text-xs"><Zap className="h-3.5 w-3.5 mr-1" />Regeln ({rules.length})</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs"><Clock className="h-3.5 w-3.5 mr-1" />Ausstehend</TabsTrigger>
          <TabsTrigger value="history" className="text-xs"><Play className="h-3.5 w-3.5 mr-1" />Verlauf</TabsTrigger>
        </TabsList>

        {/* ── Rules Tab ── */}
        <TabsContent value="rules">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Action Rules</h3>
              <p className="text-sm text-muted-foreground">Definiere Aktionen, die ein Agent nach Gesprächsergebnis auslösen darf</p>
            </div>
            <Button onClick={() => toast.info('Neue Regel – in Entwicklung')}><Plus className="h-4 w-4 mr-2" />Neue Regel</Button>
          </div>

          <div className="grid gap-3">
            {rules.map(rule => {
              const def = ACTION_DEFINITIONS[rule.action_type];
              const Icon = ICON_MAP[rule.action_type] || Zap;
              return (
                <Card key={rule.id} className={!rule.active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">Wenn: {rule.trigger}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">Dann: {def?.description || rule.action_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={rule.mode === 'auto_executed' ? 'default' : 'outline'} className="text-[10px]">
                            {rule.mode === 'auto_executed' ? 'Direkt ausführen' : 'Nur Vorschlag'}
                          </Badge>
                          {rule.approval_required && <Badge variant="secondary" className="text-[10px]">Genehmigung nötig</Badge>}
                        </div>
                        <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Pending Actions ── */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />Ausstehende Aktionen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actionLogs.filter((l: any) => l.execution_mode === 'suggested').length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Keine ausstehenden Aktionen</p>
              ) : (
                <div className="space-y-3">
                  {actionLogs.filter((l: any) => l.execution_mode === 'suggested').map((log: any) => {
                    const def = ACTION_DEFINITIONS[log.action_type as ActionType];
                    return (
                      <Card key={log.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{def?.label || log.action_type}</p>
                            <p className="text-xs text-muted-foreground">{log.reason} • Lead: {log.target_id?.slice(0, 8) || '–'}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleReject(log.id)}>
                              <X className="h-3 w-3 mr-1" />Ablehnen
                            </Button>
                            <Button size="sm" onClick={() => handleApprove(log.id)}>
                              <Check className="h-3 w-3 mr-1" />Genehmigen
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Aktionsverlauf</CardTitle>
                <Select value={filterMode} onValueChange={setFilterMode}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Modi</SelectItem>
                    <SelectItem value="auto_executed">Automatisch</SelectItem>
                    <SelectItem value="approved">Genehmigt</SelectItem>
                    <SelectItem value="suggested">Vorschlag</SelectItem>
                    <SelectItem value="shadow">Shadow</SelectItem>
                    <SelectItem value="blocked">Blockiert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Keine Einträge vorhanden</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aktion</TableHead>
                      <TableHead>Modus</TableHead>
                      <TableHead>Ergebnis</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Zeit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log: any) => {
                      const def = ACTION_DEFINITIONS[log.action_type as ActionType];
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm font-medium">{def?.label || log.action_type}</TableCell>
                          <TableCell>
                            <Badge variant={modeColor(log.execution_mode) as any} className="text-[10px]">
                              {modeLabel(log.execution_mode)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.result === 'success' ? 'default' : 'destructive'} className="text-[10px]">
                              {log.result}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{log.target_id?.slice(0, 8) || '–'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString('de-CH')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Execution Mode Reference ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Execution-Modi Referenz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Eye, label: 'Shadow', desc: 'Nur Protokollierung, keine Ausführung', color: 'text-muted-foreground' },
              { icon: Clock, label: 'Recommendation', desc: 'Vorschlag, Benutzer entscheidet', color: 'text-blue-500' },
              { icon: ShieldCheck, label: 'Assisted', desc: 'Vorschlag mit Genehmigungspflicht', color: 'text-amber-500' },
              { icon: Zap, label: 'Autonomous', desc: 'Automatische Ausführung (wenn erlaubt)', color: 'text-green-500' },
            ].map(m => (
              <div key={m.label} className="flex items-start gap-2 p-2 rounded-lg border">
                <m.icon className={`h-4 w-4 mt-0.5 ${m.color}`} />
                <div>
                  <p className="text-xs font-medium">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
