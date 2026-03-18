import { useState } from 'react';
import { Workflow, Plus, Trash2, Zap, UserCog, Bell, ArrowRight, Check, ChevronRight, Users, Settings2, ToggleLeft, Brain } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLeads } from '@/context/useLeads';
import { statusConfig, statusFlow, type LeadStatus } from '@/lib/mock-data';
import { cantons } from '@/lib/swiss-plz';
import { useToast } from '@/hooks/use-toast';
import ProcessStepper from '@/components/ProcessStepper';

export type AutomationTrigger = 'status_change' | 'lead_created' | 'disc_completed' | 'time_in_status';
export type AutomationAction = 'change_status' | 'assign_employee' | 'send_notification';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  triggerConfig: {
    fromStatus?: LeadStatus;
    toStatus?: LeadStatus;
    daysInStatus?: number;
    canton?: string;
  };
  action: AutomationAction;
  actionConfig: {
    targetStatus?: LeadStatus;
    targetEmployeeId?: string;
    notificationMessage?: string;
  };
  createdAt: string;
}

const triggerConfig: Record<AutomationTrigger, { label: string; icon: typeof Zap; description: string }> = {
  status_change: { label: 'Status-Wechsel', icon: ArrowRight, description: 'Wird ausgelöst, wenn ein Lead einen bestimmten Status erreicht' },
  lead_created: { label: 'Lead erstellt', icon: Users, description: 'Wird ausgelöst, wenn ein neuer Lead erfasst wird' },
  disc_completed: { label: 'DISC-Test abgeschlossen', icon: Brain, description: 'Wird ausgelöst, wenn der Persönlichkeitstest abgeschlossen wird' },
  time_in_status: { label: 'Verweildauer überschritten', icon: Bell, description: 'Wird ausgelöst, wenn ein Lead zu lange in einem Status bleibt' },
};

const actionConfig: Record<AutomationAction, { label: string; icon: typeof Zap; description: string }> = {
  change_status: { label: 'Status ändern', icon: ArrowRight, description: 'Ändert den Lead-Status automatisch' },
  assign_employee: { label: 'Mitarbeiter zuweisen', icon: UserCog, description: 'Weist den Lead automatisch einem Mitarbeiter zu' },
  send_notification: { label: 'Benachrichtigung senden', icon: Bell, description: 'Sendet eine Benachrichtigung an den zugewiesenen Mitarbeiter' },
};

const defaultRules: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'DISC-Test → Gespräch 2',
    enabled: true,
    trigger: 'disc_completed',
    triggerConfig: {},
    action: 'change_status',
    actionConfig: { targetStatus: 'interview_2' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-2',
    name: 'Erinnerung bei Inaktivität',
    enabled: false,
    trigger: 'time_in_status',
    triggerConfig: { toStatus: 'contacted', daysInStatus: 3 },
    action: 'send_notification',
    actionConfig: { notificationMessage: 'Lead seit 3 Tagen im Status "Kontaktiert" – bitte nachfassen!' },
    createdAt: new Date().toISOString(),
  },
];

const mainFlow: LeadStatus[] = statusFlow.filter(s => s !== 'rejected');

const inputCls = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export default function Processes() {
  const { leads, employees } = useLeads();
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    trigger: 'status_change' as AutomationTrigger,
    fromStatus: '' as LeadStatus | '',
    toStatus: '' as LeadStatus | '',
    daysInStatus: 3,
    canton: '',
    action: 'change_status' as AutomationAction,
    targetStatus: '' as LeadStatus | '',
    targetEmployeeId: '',
    notificationMessage: '',
  });

  const addRule = () => {
    if (!form.name.trim()) {
      toast({ title: 'Fehler', description: 'Bitte gib einen Namen für die Regel ein.', variant: 'destructive' });
      return;
    }
    const rule: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: form.name,
      enabled: true,
      trigger: form.trigger,
      triggerConfig: {
        fromStatus: form.fromStatus || undefined,
        toStatus: form.toStatus || undefined,
        daysInStatus: form.trigger === 'time_in_status' ? form.daysInStatus : undefined,
        canton: form.canton || undefined,
      },
      action: form.action,
      actionConfig: {
        targetStatus: form.action === 'change_status' ? (form.targetStatus as LeadStatus) : undefined,
        targetEmployeeId: form.action === 'assign_employee' ? form.targetEmployeeId : undefined,
        notificationMessage: form.action === 'send_notification' ? form.notificationMessage : undefined,
      },
      createdAt: new Date().toISOString(),
    };
    setRules(prev => [...prev, rule]);
    setDialogOpen(false);
    setForm({ name: '', trigger: 'status_change', fromStatus: '', toStatus: '', daysInStatus: 3, canton: '', action: 'change_status', targetStatus: '', targetEmployeeId: '', notificationMessage: '' });
    toast({ title: 'Regel erstellt', description: `"${rule.name}" wurde hinzugefügt.` });
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Entfernt', description: 'Automatisierung wurde gelöscht.' });
  };

  // Pipeline stats
  const statusCounts = mainFlow.map(status => ({
    status,
    config: statusConfig[status],
    count: leads.filter(l => l.status === status).length,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prozesse & Automatisierungen</h1>
        <p className="text-muted-foreground">Visualisierung des Lead-Workflows und Automatisierungsregeln</p>
      </div>

      {/* ── Process Visualization ── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Recruiting-Prozess</h2>
        </div>

        {/* Full-width stepper overview */}
        <div className="py-2">
          <ProcessStepper currentStatus="hired" />
        </div>

        {/* Status distribution */}
        <div className="grid grid-cols-7 gap-3">
          {statusCounts.map(({ status, config, count }) => (
            <div key={status} className="rounded-xl border bg-muted/30 p-3 text-center space-y-1 transition-colors hover:bg-muted/50">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-[11px] font-medium text-muted-foreground leading-tight">{config.label}</p>
              <div className="mx-auto mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: leads.length > 0 ? `${(count / leads.length) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Automations ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Automatisierungen</h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{rules.length}</span>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" /> Neue Regel
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Automatisierung erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                {/* Rule name */}
                <div>
                  <label className="text-sm font-medium">Name der Regel</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="z.B. Auto-Zuweisung ZH Leads" className={inputCls + ' mt-1'} />
                </div>

                {/* Trigger */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auslöser (Trigger)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(triggerConfig) as [AutomationTrigger, typeof triggerConfig[AutomationTrigger]][]).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      const isActive = form.trigger === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setForm(p => ({ ...p, trigger: key }))}
                          className={`rounded-xl border p-3 text-left transition-colors ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-xs font-semibold">{cfg.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{cfg.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Trigger Config */}
                  {form.trigger === 'status_change' && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Von Status</label>
                        <select value={form.fromStatus} onChange={e => setForm(p => ({ ...p, fromStatus: e.target.value as LeadStatus }))} className={inputCls + ' mt-1'}>
                          <option value="">Beliebig</option>
                          {statusFlow.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Zu Status</label>
                        <select value={form.toStatus} onChange={e => setForm(p => ({ ...p, toStatus: e.target.value as LeadStatus }))} className={inputCls + ' mt-1'}>
                          <option value="">Beliebig</option>
                          {statusFlow.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {form.trigger === 'time_in_status' && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Im Status</label>
                        <select value={form.toStatus} onChange={e => setForm(p => ({ ...p, toStatus: e.target.value as LeadStatus }))} className={inputCls + ' mt-1'}>
                          {statusFlow.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Nach Tagen</label>
                        <input type="number" min={1} max={30} value={form.daysInStatus} onChange={e => setForm(p => ({ ...p, daysInStatus: Number(e.target.value) }))} className={inputCls + ' mt-1'} />
                      </div>
                    </div>
                  )}

                  {form.trigger === 'lead_created' && (
                    <div className="pt-1">
                      <label className="text-xs font-medium text-muted-foreground">Nur für Kanton (optional)</label>
                      <select value={form.canton} onChange={e => setForm(p => ({ ...p, canton: e.target.value }))} className={inputCls + ' mt-1'}>
                        <option value="">Alle Kantone</option>
                        {cantons.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aktion</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(actionConfig) as [AutomationAction, typeof actionConfig[AutomationAction]][]).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      const isActive = form.action === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setForm(p => ({ ...p, action: key }))}
                          className={`rounded-xl border p-3 text-left transition-colors ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
                        >
                          <Icon className={`h-3.5 w-3.5 mb-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-xs font-semibold">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Action Config */}
                  {form.action === 'change_status' && (
                    <div className="pt-1">
                      <label className="text-xs font-medium text-muted-foreground">Ziel-Status</label>
                      <select value={form.targetStatus} onChange={e => setForm(p => ({ ...p, targetStatus: e.target.value as LeadStatus }))} className={inputCls + ' mt-1'}>
                        <option value="">Status wählen</option>
                        {statusFlow.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                      </select>
                    </div>
                  )}

                  {form.action === 'assign_employee' && (
                    <div className="pt-1">
                      <label className="text-xs font-medium text-muted-foreground">Mitarbeiter</label>
                      <select value={form.targetEmployeeId} onChange={e => setForm(p => ({ ...p, targetEmployeeId: e.target.value }))} className={inputCls + ' mt-1'}>
                        <option value="">Mitarbeiter wählen</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                  )}

                  {form.action === 'send_notification' && (
                    <div className="pt-1">
                      <label className="text-xs font-medium text-muted-foreground">Nachricht</label>
                      <textarea
                        value={form.notificationMessage}
                        onChange={e => setForm(p => ({ ...p, notificationMessage: e.target.value }))}
                        rows={2}
                        placeholder="z.B. Lead seit X Tagen unbearbeitet..."
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none mt-1"
                      />
                    </div>
                  )}
                </div>

                <button onClick={addRule} disabled={!form.name.trim()} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                  Regel erstellen
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Rules list */}
        <div className="space-y-3">
          {rules.length === 0 && (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
              <Zap className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Noch keine Automatisierungen erstellt.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Erstelle Regeln um deinen Recruiting-Prozess zu automatisieren.</p>
            </div>
          )}

          {rules.map(rule => {
            const trigger = triggerConfig[rule.trigger];
            const action = actionConfig[rule.action];
            const TriggerIcon = trigger.icon;
            const ActionIcon = action.icon;

            return (
              <div key={rule.id} className={`rounded-xl border bg-card p-4 shadow-sm transition-all ${!rule.enabled ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className={`h-4 w-4 ${rule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      <h3 className="text-sm font-semibold truncate">{rule.name}</h3>
                      {rule.enabled ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Aktiv</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Inaktiv</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1">
                        <TriggerIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{trigger.label}</span>
                        {rule.triggerConfig.toStatus && (
                          <span className="text-muted-foreground">→ {statusConfig[rule.triggerConfig.toStatus]?.label}</span>
                        )}
                        {rule.triggerConfig.daysInStatus && (
                          <span className="text-muted-foreground">({rule.triggerConfig.daysInStatus} Tage)</span>
                        )}
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />

                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1">
                        <ActionIcon className="h-3 w-3 text-primary" />
                        <span className="font-medium text-primary">{action.label}</span>
                        {rule.actionConfig.targetStatus && (
                          <span className="text-primary/70">→ {statusConfig[rule.actionConfig.targetStatus]?.label}</span>
                        )}
                        {rule.actionConfig.targetEmployeeId && (
                          <span className="text-primary/70">→ {employees.find(e => e.id === rule.actionConfig.targetEmployeeId)?.name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${rule.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
