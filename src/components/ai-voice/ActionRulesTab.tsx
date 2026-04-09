import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Zap, Calendar, UserPlus, RotateCcw, CheckSquare, AlertTriangle,
  ArrowRightLeft, Plus, Clock, Check, X, Eye, ShieldCheck, Play,
  Shield, FileText, Phone, Star, Ban, Info, TriangleAlert, Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { ACTION_DEFINITIONS, actionGateway, type ActionType } from '@/lib/ai-voice-action-gateway';

/* ── Types ───────────────────────────────────────────── */

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type RuleMode = 'forbidden' | 'suggest_only' | 'approval_required' | 'auto_execute';

interface ActionRule {
  id: string;
  action_type: ActionType;
  label: string;
  description: string;
  mode: RuleMode;
  risk_level: RiskLevel;
  active: boolean;
  allowed_roles: string[];
  allowed_agent_types: string[];
  conditions: string;
  scope: string;
  logging_required: boolean;
  notes: string;
}

/* ── Icon map ────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ElementType> = {
  set_status: ArrowRightLeft,
  open_wizard: Zap,
  create_followup: RotateCcw,
  create_task: CheckSquare,
  create_note: FileText,
  assign_to_user: UserPlus,
  escalate_to_human: AlertTriangle,
  mark_wrong_number: Phone,
  mark_no_interest: Ban,
  mark_callback_requested: Clock,
  mark_qualified: Star,
  mark_not_reached: Clock,
  schedule_callback: Calendar,
  prepare_interview: Calendar,
  send_confirmation_placeholder: ShieldCheck,
};

/* ── Demo rules ──────────────────────────────────────── */

const DEMO_RULES: ActionRule[] = [
  {
    id: '1', action_type: 'set_status', label: 'Status ändern',
    description: 'Lead-Status nach Gesprächsergebnis aktualisieren (z.B. „Kontaktiert", „Qualifiziert", „Kein Interesse").',
    mode: 'suggest_only', risk_level: 'medium', active: true,
    allowed_roles: ['superadmin', 'admin', 'teamleiter'],
    allowed_agent_types: ['outbound', 'inbound', 'qualification'],
    conditions: 'Nur wenn Gesprächsergebnis eindeutig zugeordnet werden kann.',
    scope: 'global', logging_required: true,
    notes: 'Im Recommendation-Mode: Agent schlägt Status vor, Recruiter bestätigt.'
  },
  {
    id: '2', action_type: 'open_wizard', label: 'Wizard starten',
    description: 'Qualifizierungs- oder Assessment-Wizard für den Lead einleiten.',
    mode: 'approval_required', risk_level: 'medium', active: true,
    allowed_roles: ['superadmin', 'admin'],
    allowed_agent_types: ['qualification'],
    conditions: 'Lead muss Status ≥ „Kontaktiert" haben.',
    scope: 'global', logging_required: true,
    notes: 'Wizard-Start nur nach erfolgreicher Erstqualifikation.'
  },
  {
    id: '3', action_type: 'create_followup', label: 'Follow-up erstellen',
    description: 'Automatische Follow-up-Aufgabe mit Fälligkeitsdatum anlegen.',
    mode: 'auto_execute', risk_level: 'low', active: true,
    allowed_roles: ['superadmin', 'admin', 'teamleiter', 'backoffice'],
    allowed_agent_types: ['outbound', 'inbound', 'callback', 'reactivation'],
    conditions: 'Immer wenn kein abschliessendes Ergebnis vorliegt.',
    scope: 'global', logging_required: true,
    notes: 'Sichere Default-Aktion – kann im Autonomous-Mode automatisch ausgeführt werden.'
  },
  {
    id: '4', action_type: 'create_task', label: 'Aufgabe erstellen',
    description: 'Neue Aufgabe im Task Center für zuständigen Mitarbeiter erstellen.',
    mode: 'auto_execute', risk_level: 'low', active: true,
    allowed_roles: ['superadmin', 'admin', 'teamleiter', 'backoffice'],
    allowed_agent_types: ['outbound', 'inbound', 'callback', 'qualification'],
    conditions: 'Bei Eskalation, Rückrufwunsch oder manueller Nachbearbeitung.',
    scope: 'global', logging_required: true,
    notes: 'Sichere Default-Aktion.'
  },
  {
    id: '5', action_type: 'create_note', label: 'Notiz erstellen',
    description: 'Gesprächszusammenfassung als Notiz am Lead hinterlegen.',
    mode: 'auto_execute', risk_level: 'low', active: true,
    allowed_roles: ['superadmin', 'admin', 'teamleiter', 'backoffice'],
    allowed_agent_types: ['outbound', 'inbound', 'callback', 'qualification', 'reactivation'],
    conditions: 'Nach jedem abgeschlossenen Gespräch.',
    scope: 'global', logging_required: true,
    notes: 'Sichere Default-Aktion – immer aktiv empfohlen.'
  },
  {
    id: '6', action_type: 'schedule_callback', label: 'Termin vorbereiten',
    description: 'Terminvorschlag basierend auf Gesprächsvereinbarung erstellen.',
    mode: 'suggest_only', risk_level: 'medium', active: true,
    allowed_roles: ['superadmin', 'admin', 'teamleiter'],
    allowed_agent_types: ['outbound', 'callback'],
    conditions: 'Kandidat hat explizit Termin oder Rückruf gewünscht.',
    scope: 'global', logging_required: true,
    notes: 'Termin wird nur vorgeschlagen, nie direkt eingetragen.'
  },
  {
    id: '7', action_type: 'mark_callback_requested', label: 'Rückruf planen',
    description: 'Lead als „Rückruf gewünscht" markieren und Aufgabe erstellen.',
    mode: 'auto_execute', risk_level: 'low', active: true,
    allowed_roles: ['superadmin', 'admin', 'teamleiter', 'backoffice'],
    allowed_agent_types: ['outbound', 'inbound'],
    conditions: 'Kandidat äussert explizit Rückrufwunsch.',
    scope: 'global', logging_required: true,
    notes: 'Sichere Aktion – kann automatisch ausgeführt werden.'
  },
  {
    id: '8', action_type: 'assign_to_user', label: 'Mensch zuweisen',
    description: 'Gespräch oder Lead an einen menschlichen Mitarbeiter übergeben.',
    mode: 'approval_required', risk_level: 'medium', active: true,
    allowed_roles: ['superadmin', 'admin', 'teamleiter'],
    allowed_agent_types: ['outbound', 'inbound', 'callback', 'qualification'],
    conditions: 'Bei Eskalationswunsch, Beschwerde oder komplexen Rückfragen.',
    scope: 'global', logging_required: true,
    notes: 'Genehmigung durch Teamleiter oder Admin empfohlen.'
  },
  {
    id: '9', action_type: 'mark_qualified', label: 'Lead qualifizieren',
    description: 'Lead-Status auf „Qualifiziert" setzen nach erfolgreicher Vorqualifikation.',
    mode: 'suggest_only', risk_level: 'high', active: true,
    allowed_roles: ['superadmin', 'admin'],
    allowed_agent_types: ['qualification'],
    conditions: 'Alle Pflichtfragen beantwortet, Ergebnis positiv.',
    scope: 'global', logging_required: true,
    notes: '⚠️ Statusänderung mit hoher Auswirkung – nur Vorschlag empfohlen.'
  },
  {
    id: '10', action_type: 'mark_no_interest', label: 'Kein Interesse markieren',
    description: 'Lead als „Kein Interesse" markieren und aus aktiven Kampagnen entfernen.',
    mode: 'suggest_only', risk_level: 'high', active: true,
    allowed_roles: ['superadmin', 'admin', 'teamleiter'],
    allowed_agent_types: ['outbound', 'reactivation'],
    conditions: 'Kandidat lehnt explizit und eindeutig ab.',
    scope: 'global', logging_required: true,
    notes: '⚠️ Endgültige Statusänderung – niemals automatisch ausführen.'
  },
  {
    id: '11', action_type: 'mark_wrong_number', label: 'Falsche Nummer markieren',
    description: 'Telefonnummer als ungültig oder falsch kennzeichnen.',
    mode: 'auto_execute', risk_level: 'low', active: true,
    allowed_roles: ['superadmin', 'admin', 'teamleiter', 'backoffice'],
    allowed_agent_types: ['outbound', 'callback', 'reactivation'],
    conditions: 'Nummer nicht erreichbar oder Teilnehmer bestätigt falsche Nummer.',
    scope: 'global', logging_required: true,
    notes: 'Sichere Aktion – automatische Ausführung empfohlen.'
  },
  {
    id: '12', action_type: 'mark_not_reached', label: 'Nicht erreicht markieren',
    description: 'Lead als „Nicht erreicht" markieren nach fehlgeschlagenem Kontaktversuch.',
    mode: 'auto_execute', risk_level: 'low', active: true,
    allowed_roles: ['superadmin', 'admin', 'teamleiter', 'backoffice'],
    allowed_agent_types: ['outbound', 'callback', 'reactivation'],
    conditions: 'Anruf nicht angenommen, Mailbox oder besetzt.',
    scope: 'global', logging_required: true,
    notes: 'Sichere Aktion – automatische Ausführung empfohlen.'
  },
];

/* ── Helpers ─────────────────────────────────────────── */

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; icon: React.ElementType }> = {
  low: { label: 'Niedrig', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20', icon: Check },
  medium: { label: 'Mittel', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', icon: Info },
  high: { label: 'Hoch', color: 'bg-orange-500/10 text-orange-700 border-orange-500/20', icon: TriangleAlert },
  critical: { label: 'Kritisch', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
};

const MODE_CONFIG: Record<RuleMode, { label: string; badge: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType }> = {
  forbidden: { label: 'Verboten', badge: 'destructive', icon: Ban },
  suggest_only: { label: 'Nur Vorschlag', badge: 'outline', icon: Eye },
  approval_required: { label: 'Genehmigung nötig', badge: 'secondary', icon: ShieldCheck },
  auto_execute: { label: 'Automatisch', badge: 'default', icon: Zap },
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin', admin: 'Admin', teamleiter: 'Teamleiter',
  backoffice: 'Backoffice', analyst: 'Analyst',
};

/* ── Component ───────────────────────────────────────── */

export default function ActionRulesTab() {
  const [rules, setRules] = useState<ActionRule[]>(DEMO_RULES);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState('all');
  const [selectedRule, setSelectedRule] = useState<ActionRule | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => { loadActionLogs(); }, []);

  async function loadActionLogs() {
    try { setActionLogs(await actionGateway.getActionHistory({ limit: 50 })); } catch { /* silent */ }
  }

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    toast.success('Regel aktualisiert');
  }

  function updateRuleMode(id: string, mode: RuleMode) {
    const rule = rules.find(r => r.id === id);
    if (mode === 'auto_execute' && rule && (rule.risk_level === 'high' || rule.risk_level === 'critical')) {
      toast.warning('⚠️ Automatische Ausführung bei hohem Risiko nicht empfohlen!');
    }
    setRules(prev => prev.map(r => r.id === id ? { ...r, mode } : r));
    toast.success('Ausführungsmodus geändert');
  }

  function openDetail(rule: ActionRule) {
    setSelectedRule(rule);
    setDetailOpen(true);
  }

  async function handleApprove(logId: string) {
    try { await actionGateway.approveAction(logId, 'current-user'); toast.success('Aktion genehmigt'); loadActionLogs(); } catch (e: any) { toast.error(e.message); }
  }
  async function handleReject(logId: string) {
    try { await actionGateway.rejectAction(logId, 'current-user', 'Manuell abgelehnt'); toast.info('Aktion abgelehnt'); loadActionLogs(); } catch (e: any) { toast.error(e.message); }
  }

  const filteredLogs = filterMode === 'all' ? actionLogs : actionLogs.filter((l: any) => l.execution_mode === filterMode);

  // Conflict detection
  const conflicts: string[] = [];
  const autoHighRisk = rules.filter(r => r.active && r.mode === 'auto_execute' && (r.risk_level === 'high' || r.risk_level === 'critical'));
  if (autoHighRisk.length > 0) {
    conflicts.push(`${autoHighRisk.length} Regel(n) mit hohem Risiko sind auf automatische Ausführung gesetzt.`);
  }
  const forbiddenButActive = rules.filter(r => r.active && r.mode === 'forbidden');
  if (forbiddenButActive.length > 0) {
    conflicts.push(`${forbiddenButActive.length} aktive Regel(n) sind als „Verboten" markiert – diese werden blockiert.`);
  }

  const riskStats = {
    low: rules.filter(r => r.risk_level === 'low' && r.active).length,
    medium: rules.filter(r => r.risk_level === 'medium' && r.active).length,
    high: rules.filter(r => r.risk_level === 'high' && r.active).length,
    critical: rules.filter(r => r.risk_level === 'critical' && r.active).length,
  };

  return (
    <div className="space-y-4">
      {/* ── Warning Banner ── */}
      {conflicts.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <TriangleAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Regelkonflikte erkannt</p>
              {conflicts.map((c, i) => <p key={i} className="text-xs text-amber-600 mt-1">• {c}</p>)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Risk Overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(RISK_CONFIG) as RiskLevel[]).map(level => {
          const cfg = RISK_CONFIG[level];
          const RiskIcon = cfg.icon;
          return (
            <Card key={level}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                  <RiskIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{riskStats[level]}</p>
                  <p className="text-[10px] text-muted-foreground">{cfg.label} Risiko</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="text-xs"><Zap className="h-3.5 w-3.5 mr-1" />Regeln ({rules.length})</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs"><Clock className="h-3.5 w-3.5 mr-1" />Ausstehend</TabsTrigger>
          <TabsTrigger value="history" className="text-xs"><Play className="h-3.5 w-3.5 mr-1" />Verlauf</TabsTrigger>
          <TabsTrigger value="modes" className="text-xs"><Settings2 className="h-3.5 w-3.5 mr-1" />Modi-Referenz</TabsTrigger>
        </TabsList>

        {/* ── Rules ── */}
        <TabsContent value="rules">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Action Rules</h3>
              <p className="text-sm text-muted-foreground">Definiere Aktionen, Ausführungsmodi, Risikoklassen und Berechtigungen</p>
            </div>
            <Button onClick={() => toast.info('Neue Regel – in Entwicklung')} size="sm"><Plus className="h-4 w-4 mr-1" />Neue Regel</Button>
          </div>

          <div className="grid gap-3">
            {rules.map(rule => {
              const Icon = ICON_MAP[rule.action_type] || Zap;
              const riskCfg = RISK_CONFIG[rule.risk_level];
              const modeCfg = MODE_CONFIG[rule.mode];
              const ModeIcon = modeCfg.icon;
              const isRisky = rule.mode === 'auto_execute' && (rule.risk_level === 'high' || rule.risk_level === 'critical');

              return (
                <Card key={rule.id} className={`${!rule.active ? 'opacity-50' : ''} ${isRisky ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{rule.label}</p>
                            <Badge variant="outline" className={`text-[10px] ${riskCfg.color}`}>{riskCfg.label}</Badge>
                            {isRisky && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger><TriangleAlert className="h-3.5 w-3.5 text-destructive" /></TooltipTrigger>
                                  <TooltipContent><p className="text-xs">Hohe Risikostufe mit automatischer Ausführung!</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rule.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Shield className="h-2.5 w-2.5" />{rule.allowed_roles.length} Rollen
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">{rule.scope}</Badge>
                            {rule.logging_required && <Badge variant="outline" className="text-[10px]">Logging</Badge>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Select value={rule.mode} onValueChange={(v) => updateRuleMode(rule.id, v as RuleMode)}>
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="forbidden"><span className="flex items-center gap-1.5"><Ban className="h-3 w-3" />Verboten</span></SelectItem>
                            <SelectItem value="suggest_only"><span className="flex items-center gap-1.5"><Eye className="h-3 w-3" />Nur Vorschlag</span></SelectItem>
                            <SelectItem value="approval_required"><span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />Genehmigung</span></SelectItem>
                            <SelectItem value="auto_execute"><span className="flex items-center gap-1.5"><Zap className="h-3 w-3" />Automatisch</span></SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openDetail(rule)}>
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                        <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Pending ── */}
        <TabsContent value="pending">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Ausstehende Aktionen</CardTitle></CardHeader>
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
                            <Button size="sm" variant="outline" onClick={() => handleReject(log.id)}><X className="h-3 w-3 mr-1" />Ablehnen</Button>
                            <Button size="sm" onClick={() => handleApprove(log.id)}><Check className="h-3 w-3 mr-1" />Genehmigen</Button>
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
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
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
                            <Badge variant={log.execution_mode === 'blocked' ? 'destructive' : log.execution_mode === 'auto_executed' ? 'default' : 'outline'} className="text-[10px]">
                              {log.execution_mode === 'auto_executed' ? 'Automatisch' : log.execution_mode === 'approved' ? 'Genehmigt' : log.execution_mode === 'suggested' ? 'Vorschlag' : log.execution_mode === 'shadow' ? 'Shadow' : log.execution_mode === 'blocked' ? 'Blockiert' : log.execution_mode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.result === 'success' ? 'default' : 'destructive'} className="text-[10px]">{log.result}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{log.target_id?.slice(0, 8) || '–'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('de-CH')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Modes Reference ── */}
        <TabsContent value="modes">
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Ban, label: 'Verboten', desc: 'Aktion ist vollständig gesperrt. Der Agent darf diese Aktion unter keinen Umständen ausführen oder vorschlagen.', color: 'text-destructive', bg: 'bg-destructive/10' },
              { icon: Eye, label: 'Nur Vorschlag (Recommendation)', desc: 'Agent schlägt die Aktion vor. Ein menschlicher Recruiter entscheidet und führt manuell aus. Kein automatischer Eingriff.', color: 'text-blue-600', bg: 'bg-blue-500/10' },
              { icon: ShieldCheck, label: 'Genehmigungspflichtig (Assisted)', desc: 'Agent bereitet die Aktion vor und erstellt einen Genehmigungsantrag. Ein berechtigter Benutzer muss explizit genehmigen.', color: 'text-amber-600', bg: 'bg-amber-500/10' },
              { icon: Zap, label: 'Automatisch (Autonomous)', desc: 'Agent führt die Aktion direkt aus ohne menschliche Bestätigung. Nur für risikoarme Aktionen empfohlen.', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            ].map(m => (
              <Card key={m.label}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${m.bg}`}>
                    <m.icon className={`h-5 w-5 ${m.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-4 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <TriangleAlert className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">Sicherheitshinweis: Autonomous Mode</p>
                  <p className="text-xs text-amber-600 mt-1">Der Autonomous-Mode sollte ausschliesslich für risikoarme Aktionen verwendet werden (z.B. Notiz erstellen, Nicht-erreicht markieren). Statusänderungen, Qualifizierungen oder Lead-Löschungen dürfen niemals automatisch ausgeführt werden.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Detail Sheet ── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedRule && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {(() => { const I = ICON_MAP[selectedRule.action_type] || Zap; return <I className="h-5 w-5 text-primary" />; })()}
                  {selectedRule.label}
                </SheetTitle>
                <SheetDescription>{selectedRule.description}</SheetDescription>
              </SheetHeader>

              <div className="space-y-5 mt-6">
                <div>
                  <Label className="text-xs text-muted-foreground">Ausführungsmodus</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={MODE_CONFIG[selectedRule.mode].badge} className="text-xs">{MODE_CONFIG[selectedRule.mode].label}</Badge>
                    <Badge variant="outline" className={`text-xs ${RISK_CONFIG[selectedRule.risk_level].color}`}>{RISK_CONFIG[selectedRule.risk_level].label} Risiko</Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Erlaubte Rollen</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedRule.allowed_roles.map(r => (
                      <Badge key={r} variant="secondary" className="text-[10px]">{ROLE_LABELS[r] || r}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Erlaubte Agententypen</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedRule.allowed_agent_types.map(t => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Bedingungen</Label>
                  <p className="text-sm mt-1">{selectedRule.conditions}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Scope</Label>
                  <p className="text-sm mt-1">{selectedRule.scope}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={selectedRule.logging_required} disabled />
                  <Label className="text-sm">Logging-Pflicht</Label>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Hinweise</Label>
                  <p className="text-sm mt-1">{selectedRule.notes}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
