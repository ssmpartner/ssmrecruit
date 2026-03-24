import { useMemo, useState, useCallback, useEffect } from 'react';
import { ArrowRight, ArrowDown, AlertTriangle, Clock, TrendingUp, Users, Settings2, Bell, UserCog, ArrowRightLeft, Plus, Trash2, Save, X, ChevronDown, ChevronUp, Eye, Wand2, FlaskConical, LayoutGrid, AlignVerticalJustifyStart, User } from 'lucide-react';
import { statusConfig, type LeadStatus, type Lead, type Employee } from '@/lib/mock-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LeadStatusBadge from './LeadStatusBadge';
import SourceBadge from './SourceBadge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const mainFlow: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up', 'hired'];

// Color map for status-based theming (border, bg, accent, connector line)
const STATUS_THEME: Record<string, { border: string; bg: string; accent: string; text: string; line: string; glow: string }> = {
  new:         { border: 'border-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/40',    accent: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-300',    line: 'bg-blue-400',    glow: 'shadow-blue-200/50 dark:shadow-blue-800/30' },
  contacted:   { border: 'border-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/40',  accent: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-300',  line: 'bg-amber-400',   glow: 'shadow-amber-200/50 dark:shadow-amber-800/30' },
  appointment: { border: 'border-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', accent: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', line: 'bg-emerald-400', glow: 'shadow-emerald-200/50 dark:shadow-emerald-800/30' },
  follow_up:   { border: 'border-violet-400',  bg: 'bg-violet-50 dark:bg-violet-950/40', accent: 'bg-violet-500',  text: 'text-violet-700 dark:text-violet-300', line: 'bg-violet-400',  glow: 'shadow-violet-200/50 dark:shadow-violet-800/30' },
  hired:       { border: 'border-green-400',   bg: 'bg-green-50 dark:bg-green-950/40',  accent: 'bg-green-500',   text: 'text-green-700 dark:text-green-300',  line: 'bg-green-400',   glow: 'shadow-green-200/50 dark:shadow-green-800/30' },
};

const EMOJI_MAP: Record<string, string> = {
  new: '🆕', contacted: '📞', appointment: '📅', follow_up: '🔄', hired: '✅',
};

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
  testOnly: boolean;
}

export type EscalationRules = Record<string, EscalationRule[]>;

interface WizardLink {
  id: string;
  wizardId: string;
  wizardName: string;
  wizardType: string;
  isActive: boolean;
  testOnly: boolean;
}

const DEFAULT_RULES: EscalationRules = {
  new: [{ id: 'esc-new-1', name: 'Erstkontakt überfällig', enabled: true, thresholdDays: 1, testOnly: false, actions: [{ type: 'notify', notificationMessage: 'Lead seit über 24h ohne Kontakt – bitte sofort bearbeiten!' }] }],
  contacted: [{ id: 'esc-cont-1', name: 'Termin-Vereinbarung überfällig', enabled: true, thresholdDays: 5, testOnly: false, actions: [{ type: 'notify', notificationMessage: 'Lead wartet seit 5 Tagen auf Termin.' }] }],
  appointment: [{ id: 'esc-apt-1', name: 'Qualifizierung dauert zu lange', enabled: true, thresholdDays: 7, testOnly: false, actions: [{ type: 'notify', notificationMessage: 'Lead seit 7 Tagen in Qualifizierung – bitte nachfassen.' }] }],
  follow_up: [{ id: 'esc-fu-1', name: 'Follow-up überfällig', enabled: true, thresholdDays: 3, testOnly: false, actions: [{ type: 'notify', notificationMessage: 'Follow-up seit 3 Tagen ausstehend!' }] }],
};

const ACTION_ICONS = { notify: Bell, reassign: UserCog, status_change: ArrowRightLeft };
const ACTION_LABELS = { notify: 'Benachrichtigung', reassign: 'Neuzuweisung', status_change: 'Status ändern' };

const inputCls = "h-8 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

// ── Escalation Rule Editor Dialog (with test toggle) ──
function EscalationRuleEditor({
  status, rules, wizardLinks, onSave, onSaveWizardLinks, onClose, employees, availableWizards, onAddWizard, onRemoveWizard, onToggleWizardActive, onToggleWizardTest, onReorderWizards,
}: {
  status: LeadStatus;
  rules: EscalationRule[];
  wizardLinks: WizardLink[];
  onSave: (status: LeadStatus, rules: EscalationRule[]) => void;
  onSaveWizardLinks: () => void;
  onClose: () => void;
  employees: Employee[];
  availableWizards: { id: string; name: string; type: string }[];
  onAddWizard: (wizardId: string) => void;
  onRemoveWizard: (linkId: string) => void;
  onToggleWizardActive: (linkId: string) => void;
  onToggleWizardTest: (linkId: string) => void;
  onReorderWizards?: (reordered: WizardLink[]) => void;
}) {
  const [localRules, setLocalRules] = useState<EscalationRule[]>(rules);
  const [expandedRule, setExpandedRule] = useState<string | null>(localRules[0]?.id ?? null);
  const [activeTab, setActiveTab] = useState('rules');
  const { toast } = useToast();
  const theme = STATUS_THEME[status] || STATUS_THEME.new;

  const addRule = () => {
    const id = `esc-${Date.now()}`;
    const newRule: EscalationRule = { id, name: 'Neue Eskalationsregel', enabled: true, thresholdDays: 3, testOnly: false, actions: [{ type: 'notify', notificationMessage: '' }] };
    setLocalRules(prev => [...prev, newRule]);
    setExpandedRule(id);
  };

  const removeRule = (id: string) => setLocalRules(prev => prev.filter(r => r.id !== id));
  const updateRule = (id: string, updates: Partial<EscalationRule>) => setLocalRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

  const moveRule = (id: string, direction: 'up' | 'down') => {
    setLocalRules(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const moveWizardLink = (linkId: string, direction: 'up' | 'down') => {
    const idx = wizardLinks.findIndex(l => l.id === linkId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= wizardLinks.length) return;
    const reordered = [...wizardLinks];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    onReorderWizards?.(reordered);
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
    onSaveWizardLinks();
    toast({ title: 'Gespeichert', description: `Regeln & Wizards für "${statusConfig[status].label}" aktualisiert.` });
    onClose();
  };

  const linkedWizardIds = wizardLinks.map(l => l.wizardId);

  return (
    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${theme.accent}`} />
          <Settings2 className="h-5 w-5 text-primary" />
          Konfiguration: {statusConfig[status].label}
        </DialogTitle>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <TabsList className="w-full">
          <TabsTrigger value="rules" className="flex-1 gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Regeln ({localRules.length})
          </TabsTrigger>
          <TabsTrigger value="wizards" className="flex-1 gap-1.5">
            <Wand2 className="h-3.5 w-3.5" /> Wizards ({wizardLinks.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Rules Tab ── */}
        <TabsContent value="rules" className="space-y-3 mt-3">
          {localRules.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Keine Eskalationsregeln definiert.</p>
          )}

          {localRules.map((rule, ruleIdx) => {
            const isExpanded = expandedRule === rule.id;
            return (
              <div key={rule.id} className="rounded-xl border bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedRule(isExpanded ? null : rule.id)}>
                  <div className="flex flex-col gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => moveRule(rule.id, 'up')} disabled={ruleIdx === 0}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 12 12"><path d="M6 3L10 8H2L6 3Z" fill="currentColor"/></svg>
                    </button>
                    <button onClick={() => moveRule(rule.id, 'down')} disabled={ruleIdx === localRules.length - 1}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 12 12"><path d="M6 9L2 4H10L6 9Z" fill="currentColor"/></svg>
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">{ruleIdx + 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); updateRule(rule.id, { enabled: !rule.enabled }); }}
                    className={`h-4 w-4 rounded border-2 shrink-0 transition-colors ${rule.enabled ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`} />
                  <span className={`text-sm font-medium flex-1 truncate ${!rule.enabled ? 'text-muted-foreground line-through' : ''}`}>{rule.name}</span>
                  {rule.testOnly && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <FlaskConical className="h-2.5 w-2.5" /> Test
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0">{rule.thresholdDays}d</span>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="border-t px-3 pb-3 pt-2 space-y-3">
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

                    {/* Test-Only Toggle */}
                    <div className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
                      <FlaskConical className="h-4 w-4 text-amber-600 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">Nur für Test-User</p>
                        <p className="text-[10px] text-muted-foreground">Regel wird nur bei Test-Leads ausgeführt</p>
                      </div>
                      <Switch checked={rule.testOnly} onCheckedChange={v => updateRule(rule.id, { testOnly: v })} />
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
                              <select className={`${inputCls} flex-1`} value={action.type}
                                onChange={e => updateAction(rule.id, idx, { type: e.target.value as EscalationAction['type'] })}>
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
                              <textarea className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                                rows={2} placeholder="Benachrichtigungstext..." value={action.notificationMessage || ''}
                                onChange={e => updateAction(rule.id, idx, { notificationMessage: e.target.value })} />
                            )}
                            {action.type === 'reassign' && (
                              <select className={inputCls} value={action.targetEmployeeId || ''}
                                onChange={e => updateAction(rule.id, idx, { targetEmployeeId: e.target.value })}>
                                <option value="">Mitarbeiter wählen...</option>
                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                              </select>
                            )}
                            {action.type === 'status_change' && (
                              <select className={inputCls} value={action.targetStatus || ''}
                                onChange={e => updateAction(rule.id, idx, { targetStatus: e.target.value as LeadStatus })}>
                                <option value="">Ziel-Status wählen...</option>
                                {Object.entries(statusConfig).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button onClick={() => removeRule(rule.id)} className="flex items-center gap-1 text-[11px] text-destructive hover:underline">
                      <Trash2 className="h-3 w-3" /> Regel löschen
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <button onClick={addRule}
            className="flex items-center justify-center gap-1.5 w-full rounded-xl border-2 border-dashed border-muted-foreground/20 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
            <Plus className="h-4 w-4" /> Neue Eskalationsregel
          </button>
        </TabsContent>

        {/* ── Wizards Tab ── */}
        <TabsContent value="wizards" className="space-y-3 mt-3">
          {wizardLinks.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
              <Wand2 className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Keine Wizards zugewiesen.</p>
              <p className="text-xs text-muted-foreground mt-1">Weise einen Wizard zu, um ihn bei diesem Prozessschritt zu starten.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {wizardLinks.map((link, wIdx) => (
                <div key={link.id} className={`rounded-xl border bg-card p-3 shadow-sm transition-opacity ${!link.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button onClick={() => moveWizardLink(link.id, 'up')} disabled={wIdx === 0}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                        <svg width="10" height="10" viewBox="0 0 12 12"><path d="M6 3L10 8H2L6 3Z" fill="currentColor"/></svg>
                      </button>
                      <button onClick={() => moveWizardLink(link.id, 'down')} disabled={wIdx === wizardLinks.length - 1}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                        <svg width="10" height="10" viewBox="0 0 12 12"><path d="M6 9L2 4H10L6 9Z" fill="currentColor"/></svg>
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">{wIdx + 1}</span>
                    <Wand2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{link.wizardName}</p>
                      <p className="text-[10px] text-muted-foreground">{link.wizardType}</p>
                    </div>
                    {link.testOnly && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <FlaskConical className="h-2.5 w-2.5" /> Test
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => onToggleWizardTest(link.id)}
                              className={`rounded-md p-1 transition-colors ${link.testOnly ? 'bg-amber-100 text-amber-700' : 'text-muted-foreground hover:bg-muted'}`}>
                              <FlaskConical className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent><p>Test-Modus {link.testOnly ? 'deaktivieren' : 'aktivieren'}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Switch checked={link.isActive} onCheckedChange={() => onToggleWizardActive(link.id)} />
                      <button onClick={() => onRemoveWizard(link.id)} className="text-destructive/60 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {availableWizards.filter(w => !linkedWizardIds.includes(w.id)).length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-[11px] font-medium text-muted-foreground mb-2">Verfügbare Wizards</p>
              <div className="space-y-1">
                {availableWizards.filter(w => !linkedWizardIds.includes(w.id)).map(w => (
                  <button key={w.id} onClick={() => onAddWizard(w.id)}
                    className="flex items-center gap-2 w-full rounded-lg border border-dashed p-2.5 text-sm hover:border-primary/40 hover:bg-muted/30 transition-colors">
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate">{w.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{w.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5" /> Abbrechen
        </button>
        <button onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary/90 transition-colors">
          <Save className="h-3.5 w-3.5" /> Speichern
        </button>
      </div>
    </DialogContent>
  );
}

// ── Flow Node ──
function FlowNode({ status, count, escalated, avgDays, rules, wizardCount, onOpenConfig, onClickNode, layout }: {
  status: LeadStatus;
  count: number;
  escalated: number;
  avgDays: number;
  rules: EscalationRule[];
  wizardCount: number;
  onOpenConfig: () => void;
  onClickNode: () => void;
  layout: 'horizontal' | 'vertical';
}) {
  const config = statusConfig[status];
  const theme = STATUS_THEME[status] || STATUS_THEME.new;
  const hasEscalation = escalated > 0;
  const activeRules = rules.filter(r => r.enabled);
  const minThreshold = activeRules.length > 0 ? Math.min(...activeRules.map(r => r.thresholdDays)) : undefined;
  const testRules = rules.filter(r => r.testOnly);
  const emoji = EMOJI_MAP[status] || '📋';

  return (
    <div className={layout === 'vertical' ? 'flex flex-col items-center w-full' : 'flex flex-col items-center flex-1 min-w-0'}>
      {/* Escalation badge */}
      <div className={`flex items-center justify-center ${layout === 'vertical' ? 'h-6 mb-1' : 'h-7 mb-1.5'}`}>
        {hasEscalation && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 rounded-full bg-destructive/10 border border-destructive/20 px-2.5 py-0.5 text-[11px] font-semibold text-destructive animate-pulse cursor-pointer" onClick={onOpenConfig}>
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
        className={`relative rounded-2xl border-2 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group cursor-pointer ${
          layout === 'vertical' ? 'w-full max-w-sm' : 'w-full'
        } ${theme.border} ${theme.bg} shadow-md ${theme.glow} ${
          hasEscalation ? '!border-destructive/50 ring-2 ring-destructive/20' : ''
        }`}
        onClick={onClickNode}
      >
        {/* Color accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${theme.accent}`} />

        <div className="flex items-center justify-between mb-3 mt-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${theme.text}`}>{config.label}</span>
          </div>
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
            {status !== 'hired' && (
              <button onClick={(e) => { e.stopPropagation(); onOpenConfig(); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-0.5 hover:bg-background/60"
                title="Regeln & Wizards bearbeiten">
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <p className={`text-3xl font-bold tracking-tight ${theme.text}`}>{count}</p>

        {count > 0 && status !== 'hired' && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Ø {avgDays.toFixed(1)} Tage</span>
          </div>
        )}

        {/* Active rules & wizards indicator */}
        {status !== 'hired' && (activeRules.length > 0 || wizardCount > 0) && (
          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            {activeRules.length > 0 && (
              <span className="inline-flex items-center gap-1">
                {activeRules.flatMap(r => r.actions).some(a => a.type === 'notify') && <Bell className="h-2.5 w-2.5" />}
                {activeRules.flatMap(r => r.actions).some(a => a.type === 'reassign') && <UserCog className="h-2.5 w-2.5" />}
                {activeRules.flatMap(r => r.actions).some(a => a.type === 'status_change') && <ArrowRightLeft className="h-2.5 w-2.5" />}
                {activeRules.length} Regel{activeRules.length !== 1 ? 'n' : ''}
              </span>
            )}
            {wizardCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Wand2 className="h-2.5 w-2.5" />
                {wizardCount} Wizard{wizardCount !== 1 ? 's' : ''}
              </span>
            )}
            {testRules.length > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <FlaskConical className="h-2.5 w-2.5" />
                {testRules.length} Test
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Connector Arrow ──
function FlowConnector({ fromStatus, toStatus, layout }: { fromStatus: LeadStatus; toStatus: LeadStatus; layout: 'horizontal' | 'vertical' }) {
  const fromTheme = STATUS_THEME[fromStatus] || STATUS_THEME.new;
  const toTheme = STATUS_THEME[toStatus] || STATUS_THEME.new;

  if (layout === 'vertical') {
    return (
      <div className="flex flex-col items-center py-1">
        <div className={`w-0.5 h-4 ${fromTheme.line} rounded-full`} />
        <div className="relative">
          <ArrowDown className={`h-5 w-5 ${fromTheme.text}`} />
        </div>
        <div className={`w-0.5 h-4 ${toTheme.line} rounded-full`} />
      </div>
    );
  }

  return (
    <div className="flex items-center px-1 shrink-0">
      <div className={`h-0.5 w-3 ${fromTheme.line} rounded-full`} />
      <ArrowRight className={`h-5 w-5 ${fromTheme.text}`} />
      <div className={`h-0.5 w-3 ${toTheme.line} rounded-full`} />
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
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');

  // Wizard links per status (loaded from DB)
  const [wizardLinksMap, setWizardLinksMap] = useState<Record<string, WizardLink[]>>({});
  const [availableWizards, setAvailableWizards] = useState<{ id: string; name: string; type: string }[]>([]);

  // Load wizards from DB
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('wizards').select('id, name, type');
      if (data) setAvailableWizards(data.map(w => ({ id: w.id, name: w.name, type: w.type })));
    };
    load();
  }, []);

  // Load escalation_wizard_links grouped by main_process_status
  useEffect(() => {
    const load = async () => {
      const { data: links } = await supabase
        .from('escalation_wizard_links')
        .select('id, escalation_process_id, wizard_id, is_active, test_only, sort_order')
        .order('sort_order');
      
      const { data: procs } = await supabase
        .from('escalation_processes')
        .select('id, main_process_status');

      if (!links || !procs) return;

      const procStatusMap: Record<string, string> = {};
      procs.forEach(p => { procStatusMap[p.id] = p.main_process_status; });

      const map: Record<string, WizardLink[]> = {};
      links.forEach(link => {
        const status = procStatusMap[link.escalation_process_id];
        if (!status) return;
        if (!map[status]) map[status] = [];
        const wiz = availableWizards.find(w => w.id === link.wizard_id);
        map[status].push({
          id: link.id,
          wizardId: link.wizard_id,
          wizardName: wiz?.name || 'Unbekannt',
          wizardType: wiz?.type || '',
          isActive: link.is_active,
          testOnly: (link as any).test_only || false,
        });
      });
      setWizardLinksMap(map);
    };
    if (availableWizards.length > 0) load();
  }, [availableWizards]);

  const handleSaveRules = useCallback((status: LeadStatus, rules: EscalationRule[]) => {
    setEscalationRules(prev => ({ ...prev, [status]: rules }));
  }, []);

  // Local wizard link management for the editor
  const [editingWizardLinks, setEditingWizardLinks] = useState<WizardLink[]>([]);

  useEffect(() => {
    if (editingStatus) {
      setEditingWizardLinks(wizardLinksMap[editingStatus] || []);
    }
  }, [editingStatus, wizardLinksMap]);

  const handleAddWizard = (wizardId: string) => {
    const wiz = availableWizards.find(w => w.id === wizardId);
    if (!wiz) return;
    setEditingWizardLinks(prev => [...prev, {
      id: `local-${Date.now()}`,
      wizardId,
      wizardName: wiz.name,
      wizardType: wiz.type,
      isActive: true,
      testOnly: false,
    }]);
  };

  const handleRemoveWizard = (linkId: string) => {
    setEditingWizardLinks(prev => prev.filter(l => l.id !== linkId));
  };

  const handleToggleWizardActive = (linkId: string) => {
    setEditingWizardLinks(prev => prev.map(l => l.id === linkId ? { ...l, isActive: !l.isActive } : l));
  };

  const handleToggleWizardTest = (linkId: string) => {
    setEditingWizardLinks(prev => prev.map(l => l.id === linkId ? { ...l, testOnly: !l.testOnly } : l));
  };

  const handleReorderWizards = (reordered: WizardLink[]) => {
    setEditingWizardLinks(reordered);
  };

  const handleSaveWizardLinks = () => {
    if (editingStatus) {
      setWizardLinksMap(prev => ({ ...prev, [editingStatus]: [...editingWizardLinks] }));
    }
  };

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

      const wizards = wizardLinksMap[status] || [];

      return { status, count, escalated, avgDays, rules, wizardCount: wizards.filter(w => w.isActive).length };
    });
  }, [activeLeads, escalationRules, wizardLinksMap]);

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

          {/* Layout Toggle */}
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setLayout('horizontal')}
                    className={`rounded-md p-1.5 transition-colors ${layout === 'horizontal' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>Horizontal</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setLayout('vertical')}
                    className={`rounded-md p-1.5 transition-colors ${layout === 'vertical' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <AlignVerticalJustifyStart className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>Vertikal</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Flow Visualization */}
      {layout === 'horizontal' ? (
        <div className="flex items-start gap-0 pt-2">
          {flowData.map((data, i) => (
            <div key={data.status} className="flex items-center flex-1 min-w-0">
              <FlowNode
                status={data.status}
                count={data.count}
                escalated={data.escalated}
                avgDays={data.avgDays}
                rules={data.rules}
                wizardCount={data.wizardCount}
                onOpenConfig={() => setEditingStatus(data.status)}
                onClickNode={() => data.count > 0 && setViewingStatus(data.status)}
                layout="horizontal"
              />
              {i < flowData.length - 1 && (
                <FlowConnector fromStatus={data.status} toStatus={flowData[i + 1].status} layout="horizontal" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-0 pt-2 max-w-md mx-auto">
          {flowData.map((data, i) => (
            <div key={data.status} className="w-full">
              <FlowNode
                status={data.status}
                count={data.count}
                escalated={data.escalated}
                avgDays={data.avgDays}
                rules={data.rules}
                wizardCount={data.wizardCount}
                onOpenConfig={() => setEditingStatus(data.status)}
                onClickNode={() => data.count > 0 && setViewingStatus(data.status)}
                layout="vertical"
              />
              {i < flowData.length - 1 && (
                <FlowConnector fromStatus={data.status} toStatus={flowData[i + 1].status} layout="vertical" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-3 border-t text-[11px] text-muted-foreground flex-wrap">
        {mainFlow.map(status => {
          const t = STATUS_THEME[status];
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-full ${t.accent}`} />
              <span>{statusConfig[status].label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/60 animate-pulse" />
          <span>Eskalation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wand2 className="h-3 w-3" />
          <span>Wizards</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FlaskConical className="h-3 w-3 text-amber-600" />
          <span>Test</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Settings2 className="h-3 w-3" />
          <span>Hover → Konfigurieren</span>
        </div>
      </div>

      {/* Config Dialog */}
      <Dialog open={editingStatus !== null} onOpenChange={(open) => !open && setEditingStatus(null)}>
        {editingStatus && (
          <EscalationRuleEditor
            status={editingStatus}
            rules={escalationRules[editingStatus] || []}
            wizardLinks={editingWizardLinks}
            onSave={handleSaveRules}
            onSaveWizardLinks={handleSaveWizardLinks}
            onClose={() => setEditingStatus(null)}
            employees={employees}
            availableWizards={availableWizards}
            onAddWizard={handleAddWizard}
            onRemoveWizard={handleRemoveWizard}
            onToggleWizardActive={handleToggleWizardActive}
            onToggleWizardTest={handleToggleWizardTest}
            onReorderWizards={handleReorderWizards}
          />
        )}
      </Dialog>

      {/* Leads in Status Dialog */}
      <Dialog open={viewingStatus !== null} onOpenChange={(open) => !open && setViewingStatus(null)}>
        {viewingStatus && (() => {
          const now = Date.now();
          const theme = STATUS_THEME[viewingStatus] || STATUS_THEME.new;
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
                  <div className={`h-3 w-3 rounded-full ${theme.accent}`} />
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
                     <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                      lead.salutation === 'Frau' ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {lead.salutation === 'Frau' ? '♀' : '♂'}
                    </div>
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
