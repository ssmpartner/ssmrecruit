import { useMemo, useState, useCallback } from 'react';
import { ArrowRight, AlertTriangle, Clock, TrendingUp, Users, Settings2, Bell, UserCog, ArrowRightLeft, Plus, Trash2, Save, X, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { statusConfig, type LeadStatus, type Lead, type Employee } from '@/lib/mock-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LeadStatusBadge from './LeadStatusBadge';
import SourceBadge from './SourceBadge';
import { useToast } from '@/hooks/use-toast';

const mainFlow: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up', 'hired'];

export interface EscalationAction {
  type: 'notify' | 'reassign' | 'status_change';
  targetEmployeeId?: string;
  targetStatus?: LeadStatus;
  notificationMessage?: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  enabled: boolean;
  thresholdDays: number;
  actions: EscalationAction[];
}

export type EscalationRules = Record<string, EscalationRule[]>;

const DEFAULT_RULES: EscalationRules = {
  new: [{ id: 'esc-new-1', name: 'Erstkontakt überfällig', enabled: true, thresholdDays: 1, actions: [{ type: 'notify', notificationMessage: 'Lead seit über 24h ohne Kontakt – bitte sofort bearbeiten!' }] }],
  contacted: [{ id: 'esc-cont-1', name: 'Termin-Vereinbarung überfällig', enabled: true, thresholdDays: 5, actions: [{ type: 'notify', notificationMessage: 'Lead wartet seit 5 Tagen auf Termin.' }] }],
  appointment: [{ id: 'esc-apt-1', name: 'Qualifizierung dauert zu lange', enabled: true, thresholdDays: 7, actions: [{ type: 'notify', notificationMessage: 'Lead seit 7 Tagen in Qualifizierung – bitte nachfassen.' }] }],
  follow_up: [{ id: 'esc-fu-1', name: 'Follow-up überfällig', enabled: true, thresholdDays: 3, actions: [{ type: 'notify', notificationMessage: 'Follow-up seit 3 Tagen ausstehend!' }] }],
};

const ACTION_ICONS = { notify: Bell, reassign: UserCog, status_change: ArrowRightLeft };
const ACTION_LABELS = { notify: 'Benachrichtigung', reassign: 'Neuzuweisung', status_change: 'Status ändern' };

const inputCls = "h-8 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

// ── Escalation Rule Editor Dialog ──
function EscalationRuleEditor({
  status, rules, onSave, onClose, employees,
}: {
  status: LeadStatus;
  rules: EscalationRule[];
  onSave: (status: LeadStatus, rules: EscalationRule[]) => void;
  onClose: () => void;
  employees: Employee[];
}) {
  const [localRules, setLocalRules] = useState<EscalationRule[]>(rules);
  const [expandedRule, setExpandedRule] = useState<string | null>(localRules[0]?.id ?? null);
  const { toast } = useToast();

  const addRule = () => {
    const id = `esc-${Date.now()}`;
    const newRule: EscalationRule = { id, name: 'Neue Eskalationsregel', enabled: true, thresholdDays: 3, actions: [{ type: 'notify', notificationMessage: '' }] };
    setLocalRules(prev => [...prev, newRule]);
    setExpandedRule(id);
  };

  const removeRule = (id: string) => {
    setLocalRules(prev => prev.filter(r => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<EscalationRule>) => {
    setLocalRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const addAction = (ruleId: string) => {
    setLocalRules(prev => prev.map(r => r.id === ruleId ? { ...r, actions: [...r.actions, { type: 'notify', notificationMessage: '' }] } : r));
  };

  const removeAction = (ruleId: string, idx: number) => {
    setLocalRules(prev => prev.map(r => r.id === ruleId ? { ...r, actions: r.actions.filter((_, i) => i !== idx) } : r));
  };

  const updateAction = (ruleId: string, idx: number, updates: Partial<EscalationAction>) => {
    setLocalRules(prev => prev.map(r => r.id === ruleId ? { ...r, actions: r.actions.map((a, i) => i === idx ? { ...a, ...updates } : a) } : r));
  };

  const handleSave = () => {
    onSave(status, localRules);
    toast({ title: 'Eskalationsregeln gespeichert', description: `${localRules.filter(r => r.enabled).length} aktive Regel(n) für "${statusConfig[status].label}"` });
    onClose();
  };

  return (
    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Eskalationsregeln: {statusConfig[status].label}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-3 mt-2">
        {localRules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Keine Eskalationsregeln definiert.</p>
        )}

        {localRules.map(rule => {
          const isExpanded = expandedRule === rule.id;
          return (
            <div key={rule.id} className="rounded-xl border bg-muted/20 overflow-hidden">
              {/* Rule header */}
              <div
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); updateRule(rule.id, { enabled: !rule.enabled }); }}
                  className={`h-4 w-4 rounded border-2 shrink-0 transition-colors ${rule.enabled ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}
                />
                <span className={`text-sm font-medium flex-1 truncate ${!rule.enabled ? 'text-muted-foreground line-through' : ''}`}>{rule.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{rule.thresholdDays}d</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{rule.actions.length} Aktion{rule.actions.length !== 1 ? 'en' : ''}</span>
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </div>

              {/* Rule details */}
              {isExpanded && (
                <div className="border-t px-3 pb-3 pt-2 space-y-3">
                  {/* Name & threshold */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[11px] font-medium text-muted-foreground">Regelname</label>
                      <input className={inputCls} value={rule.name} onChange={e => updateRule(rule.id, { name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">Tage</label>
                      <input type="number" min={1} className={inputCls} value={rule.thresholdDays} onChange={e => updateRule(rule.id, { thresholdDays: parseInt(e.target.value) || 1 })} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-muted-foreground">Aktionen</label>
                      <button onClick={() => addAction(rule.id)} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                        <Plus className="h-3 w-3" /> Aktion
                      </button>
                    </div>

                    {rule.actions.map((action, idx) => {
                      const ActionIcon = ACTION_ICONS[action.type];
                      return (
                        <div key={idx} className="rounded-lg border bg-card p-2.5 space-y-2">
                          <div className="flex items-center gap-2">
                            <ActionIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <select
                              className={`${inputCls} flex-1`}
                              value={action.type}
                              onChange={e => updateAction(rule.id, idx, { type: e.target.value as EscalationAction['type'] })}
                            >
                              <option value="notify">Benachrichtigung</option>
                              <option value="reassign">Neuzuweisung</option>
                              <option value="status_change">Status ändern</option>
                            </select>
                            {rule.actions.length > 1 && (
                              <button onClick={() => removeAction(rule.id, idx)} className="text-destructive/60 hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {action.type === 'notify' && (
                            <textarea
                              className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                              rows={2}
                              placeholder="Benachrichtigungstext..."
                              value={action.notificationMessage || ''}
                              onChange={e => updateAction(rule.id, idx, { notificationMessage: e.target.value })}
                            />
                          )}

                          {action.type === 'reassign' && (
                            <select
                              className={inputCls}
                              value={action.targetEmployeeId || ''}
                              onChange={e => updateAction(rule.id, idx, { targetEmployeeId: e.target.value })}
                            >
                              <option value="">Mitarbeiter wählen...</option>
                              {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                              ))}
                            </select>
                          )}

                          {action.type === 'status_change' && (
                            <select
                              className={inputCls}
                              value={action.targetStatus || ''}
                              onChange={e => updateAction(rule.id, idx, { targetStatus: e.target.value as LeadStatus })}
                            >
                              <option value="">Ziel-Status wählen...</option>
                              {Object.entries(statusConfig).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Delete rule */}
                  <button onClick={() => removeRule(rule.id)} className="flex items-center gap-1 text-[11px] text-destructive hover:underline">
                    <Trash2 className="h-3 w-3" /> Regel löschen
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add rule button */}
        <button
          onClick={addRule}
          className="flex items-center justify-center gap-1.5 w-full rounded-xl border-2 border-dashed border-muted-foreground/20 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" /> Neue Eskalationsregel
        </button>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5" /> Abbrechen
        </button>
        <button onClick={handleSave} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Save className="h-3.5 w-3.5" /> Speichern
        </button>
      </div>
    </DialogContent>
  );
}

// ── Flow Node ──
function FlowNode({
  status, count, escalated, avgDays, isLast, rules, onOpenRules, onClickNode,
}: {
  status: LeadStatus;
  count: number;
  escalated: number;
  avgDays: number;
  isLast: boolean;
  rules: EscalationRule[];
  onOpenRules: () => void;
  onClickNode: () => void;
}) {
  const config = statusConfig[status];
  const hasEscalation = escalated > 0;
  const activeRules = rules.filter(r => r.enabled);
  const minThreshold = activeRules.length > 0 ? Math.min(...activeRules.map(r => r.thresholdDays)) : undefined;
  const emoji = config.label === 'Neuer Lead' ? '🆕' : config.label === 'Kontaktiert' ? '📞' : config.label === 'Termin' ? '📅' : config.label === 'Follow-up' ? '🔄' : '✅';

  return (
    <div className="flex items-center gap-0 flex-1 min-w-0">
      <div className="flex flex-col items-center flex-1 min-w-0">
        {/* Escalation badge */}
        <div className="h-7 flex items-end justify-center mb-1.5">
          {hasEscalation && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 rounded-full bg-destructive/10 border border-destructive/20 px-2.5 py-0.5 text-[11px] font-semibold text-destructive animate-pulse cursor-pointer" onClick={onOpenRules}>
                    <AlertTriangle className="h-3 w-3" />
                    {escalated} Eskalation{escalated > 1 ? 'en' : ''}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{escalated} Lead{escalated > 1 ? 's' : ''} haben die Verweildauer überschritten</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Main node */}
        <div
          className={`relative w-full rounded-2xl border-2 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group ${
            hasEscalation
              ? 'border-destructive/40 bg-destructive/5 shadow-sm shadow-destructive/10'
              : 'border-border bg-card shadow-sm hover:border-primary/30'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg">{emoji}</span>
            <div className="flex items-center gap-1.5">
              {minThreshold !== undefined && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {minThreshold}d
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eskalation nach {minThreshold} Tag{minThreshold !== 1 ? 'en' : ''}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* Settings gear – always visible on non-hired */}
              {status !== 'hired' && (
                <button
                  onClick={onOpenRules}
                  className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-0.5 hover:bg-muted"
                  title="Eskalationsregeln bearbeiten"
                >
                  <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground mb-1 truncate">{config.label}</p>
          <p className="text-3xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors" onClick={onClickNode} title="Leads anzeigen">{count}</p>

          {count > 0 && status !== 'hired' && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Ø {avgDays.toFixed(1)} Tage</span>
            </div>
          )}

          {/* Active rules indicator */}
          {activeRules.length > 0 && status !== 'hired' && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              {activeRules.flatMap(r => r.actions).some(a => a.type === 'notify') && <Bell className="h-2.5 w-2.5" />}
              {activeRules.flatMap(r => r.actions).some(a => a.type === 'reassign') && <UserCog className="h-2.5 w-2.5" />}
              {activeRules.flatMap(r => r.actions).some(a => a.type === 'status_change') && <ArrowRightLeft className="h-2.5 w-2.5" />}
              <span>{activeRules.length} Regel{activeRules.length !== 1 ? 'n' : ''}</span>
            </div>
          )}
        </div>
        <div className="h-6" />
      </div>

      {!isLast && (
        <div className="flex flex-col items-center px-1 shrink-0">
          <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}

// ── Pipeline Flow ──
interface PipelineFlowProps {
  leads: Lead[];
  employees?: Employee[];
  onSelectLead?: (lead: Lead) => void;
}

export default function PipelineFlow({ leads, employees = [], onSelectLead }: PipelineFlowProps) {
  const activeLeads = useMemo(() => leads.filter(l => l.lifecycle === 'active'), [leads]);
  const [escalationRules, setEscalationRules] = useState<EscalationRules>(DEFAULT_RULES);
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);
  const [viewingStatus, setViewingStatus] = useState<LeadStatus | null>(null);

  const handleSaveRules = useCallback((status: LeadStatus, rules: EscalationRule[]) => {
    setEscalationRules(prev => ({ ...prev, [status]: rules }));
  }, []);

  const flowData = useMemo(() => {
    const now = Date.now();
    return mainFlow.map(status => {
      const inStatus = activeLeads.filter(l => l.status === status);
      const count = inStatus.length;
      const rules = escalationRules[status] || [];
      const activeRules = rules.filter(r => r.enabled);
      const minThreshold = activeRules.length > 0 ? Math.min(...activeRules.map(r => r.thresholdDays)) : Infinity;

      const escalated = inStatus.filter(l => {
        const days = (now - new Date(l.updatedAt || l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return days > minThreshold;
      }).length;

      const avgDays = count > 0
        ? inStatus.reduce((sum, l) => sum + (now - new Date(l.updatedAt || l.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0) / count
        : 0;

      return { status, count, escalated, avgDays, rules };
    });
  }, [activeLeads, escalationRules]);

  const rejectedCount = activeLeads.filter(l => l.status === 'rejected').length;
  const totalEscalations = flowData.reduce((sum, d) => sum + d.escalated, 0);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Pipeline-Flow</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {totalEscalations > 0 && (
            <div className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertTriangle className="h-4 w-4" />
              {totalEscalations} Eskalation{totalEscalations > 1 ? 'en' : ''}
            </div>
          )}
          {rejectedCount > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-xs">❌</span>
              {rejectedCount} abgelehnt
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-0 pt-2">
        {flowData.map((data, i) => (
          <FlowNode
            key={data.status}
            status={data.status}
            count={data.count}
            escalated={data.escalated}
            avgDays={data.avgDays}
            isLast={i === flowData.length - 1}
            rules={data.rules}
            onOpenRules={() => setEditingStatus(data.status)}
            onClickNode={() => data.count > 0 && setViewingStatus(data.status)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 pt-2 border-t text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/60 animate-pulse" />
          <span>Eskalation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Settings2 className="h-3 w-3" />
          <span>Hover → Regeln bearbeiten</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Bell className="h-3 w-3" /><UserCog className="h-3 w-3" /><ArrowRightLeft className="h-3 w-3" />
          <span>Aktionstypen</span>
        </div>
      </div>

      {/* Escalation Rule Editor Dialog */}
      <Dialog open={editingStatus !== null} onOpenChange={(open) => !open && setEditingStatus(null)}>
        {editingStatus && (
          <EscalationRuleEditor
            status={editingStatus}
            rules={escalationRules[editingStatus] || []}
            onSave={handleSaveRules}
            onClose={() => setEditingStatus(null)}
            employees={employees}
          />
        )}
      {/* Leads in Status Dialog */}
      <Dialog open={viewingStatus !== null} onOpenChange={(open) => !open && setViewingStatus(null)}>
        {viewingStatus && (() => {
          const now = Date.now();
          const inStatus = activeLeads
            .filter(l => l.status === viewingStatus)
            .map(l => {
              const days = (now - new Date(l.updatedAt || l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
              const rules = escalationRules[viewingStatus] || [];
              const activeR = rules.filter(r => r.enabled);
              const minT = activeR.length > 0 ? Math.min(...activeR.map(r => r.thresholdDays)) : Infinity;
              return { lead: l, days, isEscalated: days > minT };
            })
            .sort((a, b) => b.days - a.days);

          return (
            <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {statusConfig[viewingStatus].label} – {inStatus.length} Lead{inStatus.length !== 1 ? 's' : ''}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 mt-2">
                {inStatus.map(({ lead, days, isEscalated }) => (
                  <div
                    key={lead.id}
                    onClick={() => { onSelectLead?.(lead); setViewingStatus(null); }}
                    className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm hover:-translate-y-0.5 ${
                      isEscalated ? 'border-destructive/30 bg-destructive/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.position || '—'} · {lead.city || lead.plz || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SourceBadge source={lead.source} />
                      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isEscalated ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isEscalated && <AlertTriangle className="h-3 w-3" />}
                        <Clock className="h-3 w-3" />
                        {Math.floor(days)}d
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}
