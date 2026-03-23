import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLeads } from '@/context/useLeads';
import { useToast } from '@/hooks/use-toast';
import { statusConfig, type LeadStatus } from '@/lib/mock-data';
import {
  AlertTriangle, Plus, Trash2, Edit3, ChevronLeft, Save, X,
  Shield, Wand2, Eye, Zap, Clock, ArrowRight, Check,
  Globe, Filter, Play, CheckCircle2, XCircle, FlaskConical
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EscalationProcess {
  id: string;
  main_process_status: string;
  name: string;
  description: string;
  source_filters: string[];
  applies_to_all_sources: boolean;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EscalationRule {
  id: string;
  escalation_process_id: string;
  condition_type: string;
  condition_value: string;
  action_type: string;
  action_value: string;
  delay_minutes: number;
  is_active: boolean;
  test_only: boolean;
}

interface EscalationWizardLink {
  id: string;
  escalation_process_id: string;
  wizard_id: string;
  start_step_id: string;
  is_active: boolean;
  sort_order: number;
  delay_minutes: number;
  test_only: boolean;
}

interface WizardStep {
  id: string;
  title: string;
  type: string;
}

interface WizardRow {
  id: string;
  name: string;
  status: string;
  type: string;
  steps: any;
}

const conditionTypes = [
  { value: 'time_in_status', label: 'Verweildauer überschritten' },
  { value: 'source_match', label: 'Lead-Quelle ist' },
  { value: 'no_activity', label: 'Keine Aktivität seit' },
  { value: 'missing_data', label: 'Fehlende Daten' },
];

const actionTypes = [
  { value: 'send_notification', label: 'Benachrichtigung senden' },
  { value: 'change_status', label: 'Status ändern' },
  { value: 'assign_employee', label: 'Mitarbeiter zuweisen' },
  { value: 'create_task', label: 'Aufgabe erstellen' },
  { value: 'send_email', label: 'E-Mail senden' },
  { value: 'trigger_wizard', label: 'Wizard starten' },
];

const inputCls = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface EscalationManagerProps {
  processStatus: LeadStatus;
}

export default function EscalationManager({ processStatus }: EscalationManagerProps) {
  const { leadSources } = useLeads();
  const { toast } = useToast();

  const [processes, setProcesses] = useState<EscalationProcess[]>([]);
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [wizardLinks, setWizardLinks] = useState<EscalationWizardLink[]>([]);
  const [wizards, setWizards] = useState<WizardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<EscalationProcess | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state for new/edit process
  const [form, setForm] = useState({
    name: '', description: '', priority: 0,
    is_active: false, applies_to_all_sources: true,
    source_filters: [] as string[],
  });

  // Form state for new rule
  const [ruleForm, setRuleForm] = useState({
    condition_type: 'time_in_status', condition_value: '',
    action_type: 'send_notification', action_value: '',
    delay_minutes: 0,
  });

  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showWizardDialog, setShowWizardDialog] = useState(false);

  // Preview state
  const [previewSource, setPreviewSource] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [epRes, wizRes] = await Promise.all([
      supabase.from('escalation_processes').select('*').eq('main_process_status', processStatus).order('priority'),
      supabase.from('wizards').select('id, name, status, type, steps'),
    ]);
    setProcesses((epRes.data || []) as EscalationProcess[]);
    setWizards((wizRes.data || []) as WizardRow[]);
    setLoading(false);
  }, [processStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadProcessDetails = useCallback(async (processId: string) => {
    const [rulesRes, linksRes] = await Promise.all([
      supabase.from('escalation_rules').select('*').eq('escalation_process_id', processId),
      supabase.from('escalation_wizard_links').select('*').eq('escalation_process_id', processId).order('sort_order'),
    ]);
    setRules((rulesRes.data || []) as EscalationRule[]);
    setWizardLinks((linksRes.data || []) as EscalationWizardLink[]);
  }, []);

  const selectProcess = (proc: EscalationProcess) => {
    setSelectedProcess(proc);
    setForm({
      name: proc.name, description: proc.description, priority: proc.priority,
      is_active: proc.is_active, applies_to_all_sources: proc.applies_to_all_sources,
      source_filters: proc.source_filters || [],
    });
    loadProcessDetails(proc.id);
  };

  const saveProcess = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Fehler', description: 'Name ist erforderlich.', variant: 'destructive' });
      return;
    }

    if (creating) {
      const { data, error } = await supabase.from('escalation_processes').insert({
        main_process_status: processStatus,
        name: form.name, description: form.description,
        priority: form.priority, is_active: form.is_active,
        applies_to_all_sources: form.applies_to_all_sources,
        source_filters: form.source_filters,
      } as any).select().single();

      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Erstellt', description: `Eskalationsprozess "${form.name}" erstellt.` });
      setCreating(false);
      setSelectedProcess(data as EscalationProcess);
      loadData();
    } else if (selectedProcess) {
      const { error } = await supabase.from('escalation_processes')
        .update({
          name: form.name, description: form.description,
          priority: form.priority, is_active: form.is_active,
          applies_to_all_sources: form.applies_to_all_sources,
          source_filters: form.source_filters,
        } as any)
        .eq('id', selectedProcess.id);

      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Gespeichert' });
      loadData();
    }
  };

  const deleteProcess = async (id: string) => {
    const proc = processes.find(p => p.id === id);
    if (proc?.is_active) {
      toast({ title: 'Fehler', description: 'Aktive Prozesse können nicht gelöscht werden.', variant: 'destructive' });
      return;
    }
    await supabase.from('escalation_processes').delete().eq('id', id);
    toast({ title: 'Gelöscht' });
    if (selectedProcess?.id === id) { setSelectedProcess(null); setCreating(false); }
    loadData();
  };

  const toggleActive = async (proc: EscalationProcess) => {
    await supabase.from('escalation_processes')
      .update({ is_active: !proc.is_active } as any)
      .eq('id', proc.id);
    loadData();
    if (selectedProcess?.id === proc.id) {
      setForm(f => ({ ...f, is_active: !proc.is_active }));
    }
  };

  // Rules
  const addRule = async () => {
    if (!selectedProcess) return;
    const { error } = await supabase.from('escalation_rules').insert({
      escalation_process_id: selectedProcess.id,
      condition_type: ruleForm.condition_type,
      condition_value: ruleForm.condition_value,
      action_type: ruleForm.action_type,
      action_value: ruleForm.action_value,
      delay_minutes: ruleForm.delay_minutes,
    } as any);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Regel hinzugefügt' });
    setShowRuleDialog(false);
    setRuleForm({ condition_type: 'time_in_status', condition_value: '', action_type: 'send_notification', action_value: '', delay_minutes: 0 });
    loadProcessDetails(selectedProcess.id);
  };

  const deleteRule = async (ruleId: string) => {
    await supabase.from('escalation_rules').delete().eq('id', ruleId);
    if (selectedProcess) loadProcessDetails(selectedProcess.id);
    toast({ title: 'Regel entfernt' });
  };

  const toggleRuleActive = async (rule: EscalationRule) => {
    await supabase.from('escalation_rules').update({ is_active: !rule.is_active } as any).eq('id', rule.id);
    if (selectedProcess) loadProcessDetails(selectedProcess.id);
  };

  const toggleRuleTestOnly = async (rule: EscalationRule) => {
    await supabase.from('escalation_rules').update({ test_only: !rule.test_only } as any).eq('id', rule.id);
    if (selectedProcess) loadProcessDetails(selectedProcess.id);
  };

  // Wizard links
  const addWizardLink = async (wizardId: string) => {
    if (!selectedProcess) return;
    const { error } = await supabase.from('escalation_wizard_links').insert({
      escalation_process_id: selectedProcess.id,
      wizard_id: wizardId,
      sort_order: wizardLinks.length,
      delay_minutes: 0,
      start_step_id: '',
    } as any);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Wizard verknüpft' });
    setShowWizardDialog(false);
    loadProcessDetails(selectedProcess.id);
  };

  const removeWizardLink = async (linkId: string) => {
    await supabase.from('escalation_wizard_links').delete().eq('id', linkId);
    if (selectedProcess) loadProcessDetails(selectedProcess.id);
    toast({ title: 'Wizard-Verknüpfung entfernt' });
  };

  const toggleWizardLinkActive = async (link: EscalationWizardLink) => {
    await supabase.from('escalation_wizard_links').update({ is_active: !link.is_active } as any).eq('id', link.id);
    if (selectedProcess) loadProcessDetails(selectedProcess.id);
  };

  const updateWizardLink = async (linkId: string, updates: Partial<EscalationWizardLink>) => {
    await supabase.from('escalation_wizard_links').update(updates as any).eq('id', linkId);
    if (selectedProcess) loadProcessDetails(selectedProcess.id);
  };

  const moveWizardLink = async (linkId: string, direction: 'up' | 'down') => {
    const idx = wizardLinks.findIndex(l => l.id === linkId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= wizardLinks.length) return;
    const current = wizardLinks[idx];
    const swap = wizardLinks[swapIdx];
    await Promise.all([
      supabase.from('escalation_wizard_links').update({ sort_order: swap.sort_order } as any).eq('id', current.id),
      supabase.from('escalation_wizard_links').update({ sort_order: current.sort_order } as any).eq('id', swap.id),
    ]);
    if (selectedProcess) loadProcessDetails(selectedProcess.id);
  };

  const getWizardSteps = (wizardId: string): WizardStep[] => {
    const wizard = wizards.find(w => w.id === wizardId);
    if (!wizard?.steps || !Array.isArray(wizard.steps)) return [];
    return (wizard.steps as any[]).map(s => ({ id: s.id || '', title: s.title || '', type: s.type || '' }));
  };

  const toggleSourceFilter = (sourceId: string) => {
    setForm(f => ({
      ...f,
      source_filters: f.source_filters.includes(sourceId)
        ? f.source_filters.filter(s => s !== sourceId)
        : [...f.source_filters, sourceId],
    }));
  };

  // Preview simulation
  const simulateEscalation = (source: string) => {
    return processes.filter(p => {
      if (!p.is_active) return false;
      if (p.applies_to_all_sources) return true;
      return (p.source_filters || []).includes(source);
    }).sort((a, b) => a.priority - b.priority);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Lade Eskalationsprozesse...</div>;
  }

  // ─── Detail View ───
  if (selectedProcess || creating) {
    const processRules = rules;
    const processWizardLinks = wizardLinks;

    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedProcess(null); setCreating(false); }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Zurück zur Übersicht
        </button>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{creating ? 'Neuer Eskalationsprozess' : form.name || 'Bearbeiten'}</h3>
          <button onClick={saveProcess} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Save className="h-4 w-4" /> Speichern
          </button>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="w-fit">
            <TabsTrigger value="general" className="gap-1.5"><Edit3 className="h-3.5 w-3.5" /> Allgemein</TabsTrigger>
            <TabsTrigger value="sources" className="gap-1.5"><Filter className="h-3.5 w-3.5" /> Quellen</TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5" disabled={creating}><Shield className="h-3.5 w-3.5" /> Regeln</TabsTrigger>
            <TabsTrigger value="wizards" className="gap-1.5" disabled={creating}><Wand2 className="h-3.5 w-3.5" /> Wizards</TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5" disabled={creating}><Eye className="h-3.5 w-3.5" /> Vorschau</TabsTrigger>
          </TabsList>

          {/* ── Tab: Allgemein ── */}
          <TabsContent value="general" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="z.B. Meta-Leads Eskalation" className={inputCls + ' mt-1'} />
              </div>
              <div>
                <label className="text-sm font-medium">Beschreibung</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Beschreibe den Zweck dieses Eskalationsprozesses..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priorität</label>
                  <input type="number" min={0} max={100} value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                    className={inputCls + ' mt-1'} />
                  <p className="text-[11px] text-muted-foreground mt-1">Niedrigere Zahl = höhere Priorität</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="flex items-center gap-3 mt-2">
                    <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                    <span className={`text-sm font-medium ${form.is_active ? 'text-primary' : 'text-muted-foreground'}`}>
                      {form.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab: Quellen ── */}
          <TabsContent value="sources" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Switch checked={form.applies_to_all_sources}
                  onCheckedChange={v => setForm(f => ({ ...f, applies_to_all_sources: v, source_filters: v ? [] : f.source_filters }))} />
                <div>
                  <p className="text-sm font-medium">Gilt für alle Quellen</p>
                  <p className="text-xs text-muted-foreground">Eskalation wird für jede Lead-Quelle ausgelöst</p>
                </div>
              </div>

              {!form.applies_to_all_sources && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Spezifische Quellen auswählen</p>
                  <div className="grid grid-cols-2 gap-2">
                    {leadSources.map(source => {
                      const selected = form.source_filters.includes(source.id);
                      return (
                        <button key={source.id} onClick={() => toggleSourceFilter(source.id)}
                          className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-colors ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                          <div className={`h-3 w-3 rounded-sm border ${selected ? 'bg-primary border-primary' : 'border-muted-foreground/40'} flex items-center justify-center`}>
                            {selected && <Check className="h-2 w-2 text-primary-foreground" />}
                          </div>
                          <span className="text-sm font-medium">{source.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {form.source_filters.length === 0 && !form.applies_to_all_sources && (
                    <p className="text-xs text-destructive">⚠ Keine Quellen ausgewählt – Eskalation wird nicht ausgelöst.</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Tab: Regeln ── */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{processRules.length} {processRules.length === 1 ? 'Regel' : 'Regeln'}</p>
              <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                    <Plus className="h-3.5 w-3.5" /> Regel hinzufügen
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Neue Regel</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium">Bedingung</label>
                      <select value={ruleForm.condition_type} onChange={e => setRuleForm(f => ({ ...f, condition_type: e.target.value }))}
                        className={inputCls + ' mt-1'}>
                        {conditionTypes.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Bedingungswert</label>
                      <input value={ruleForm.condition_value} onChange={e => setRuleForm(f => ({ ...f, condition_value: e.target.value }))}
                        placeholder={ruleForm.condition_type === 'time_in_status' ? 'z.B. 3 (Tage)' : 'Wert eingeben'}
                        className={inputCls + ' mt-1'} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Aktion</label>
                      <select value={ruleForm.action_type} onChange={e => setRuleForm(f => ({ ...f, action_type: e.target.value }))}
                        className={inputCls + ' mt-1'}>
                        {actionTypes.map(at => <option key={at.value} value={at.value}>{at.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Aktionswert</label>
                      <input value={ruleForm.action_value} onChange={e => setRuleForm(f => ({ ...f, action_value: e.target.value }))}
                        placeholder="z.B. Nachricht oder Ziel-Status"
                        className={inputCls + ' mt-1'} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Verzögerung (Minuten)</label>
                      <input type="number" min={0} value={ruleForm.delay_minutes}
                        onChange={e => setRuleForm(f => ({ ...f, delay_minutes: Number(e.target.value) }))}
                        className={inputCls + ' mt-1'} />
                    </div>
                    <button onClick={addRule} className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                      Regel erstellen
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {processRules.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Noch keine Regeln definiert.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {processRules.map(rule => (
                  <div key={rule.id} className={`rounded-xl border bg-card p-4 shadow-sm transition-opacity ${!rule.is_active ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 font-medium">
                            <Zap className="h-3 w-3 text-muted-foreground" />
                            {conditionTypes.find(c => c.value === rule.condition_type)?.label}
                            {rule.condition_value && <span className="text-muted-foreground">: {rule.condition_value}</span>}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 font-medium text-primary">
                            {actionTypes.find(a => a.value === rule.action_type)?.label}
                            {rule.action_value && <span className="text-primary/70">: {rule.action_value}</span>}
                          </span>
                          {rule.delay_minutes > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 font-medium text-amber-700">
                              <Clock className="h-3 w-3" /> {rule.delay_minutes}min
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch checked={rule.is_active} onCheckedChange={() => toggleRuleActive(rule)} />
                        <button onClick={() => deleteRule(rule.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Wizards ── */}
          <TabsContent value="wizards" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{processWizardLinks.length} verknüpfte Wizards</p>
                <p className="text-xs text-muted-foreground">Wizards werden in der definierten Reihenfolge gestartet wenn die Eskalation greift.</p>
              </div>
              <Dialog open={showWizardDialog} onOpenChange={setShowWizardDialog}>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                    <Plus className="h-3.5 w-3.5" /> Wizard verknüpfen
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Wizard verknüpfen</DialogTitle></DialogHeader>
                  <div className="space-y-2 pt-2">
                    {wizards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Keine Wizards im System vorhanden.</p>
                    ) : (
                      wizards.map(w => {
                        const alreadyLinked = processWizardLinks.some(l => l.wizard_id === w.id);
                        return (
                          <button key={w.id} onClick={() => addWizardLink(w.id)}
                            className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${alreadyLinked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'}`}
                            disabled={alreadyLinked}>
                            <Wand2 className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{w.name}</p>
                              <p className="text-[11px] text-muted-foreground">{w.type} · {w.status}</p>
                            </div>
                            {alreadyLinked && <span className="text-[10px] text-muted-foreground">Bereits verknüpft</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {processWizardLinks.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                <Wand2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Keine Wizards verknüpft.</p>
                <p className="text-xs text-muted-foreground mt-1">Verknüpfe einen Wizard um ihn bei Eskalation automatisch zu starten.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {processWizardLinks.map((link, idx) => {
                  const wizard = wizards.find(w => w.id === link.wizard_id);
                  const steps = getWizardSteps(link.wizard_id);
                  return (
                    <div key={link.id} className={`rounded-xl border bg-card shadow-sm transition-opacity ${!link.is_active ? 'opacity-60' : ''}`}>
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveWizardLink(link.id, 'up')} disabled={idx === 0}
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 3L10 8H2L6 3Z" fill="currentColor"/></svg>
                            </button>
                            <button onClick={() => moveWizardLink(link.id, 'down')} disabled={idx === processWizardLinks.length - 1}
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 9L2 4H10L6 9Z" fill="currentColor"/></svg>
                            </button>
                          </div>
                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">{idx + 1}</span>
                          </div>
                          <Wand2 className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">{wizard?.name || 'Unbekannt'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">{wizard?.type}</span>
                              <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${wizard?.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                {wizard?.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Switch checked={link.is_active} onCheckedChange={() => toggleWizardLinkActive(link)} />
                          <button onClick={() => removeWizardLink(link.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Settings */}
                      <div className="border-t px-4 py-3 space-y-3 bg-muted/10">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground">Start-Step (optional)</label>
                            <select value={link.start_step_id || ''}
                              onChange={e => updateWizardLink(link.id, { start_step_id: e.target.value })}
                              className={inputCls + ' mt-1 !h-8 !text-xs'}>
                              <option value="">Erster Schritt (Standard)</option>
                              {steps.map(s => (
                                <option key={s.id} value={s.id}>{s.title} ({s.type})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground">Verzögerung vor Start</label>
                            <div className="flex items-center gap-2 mt-1">
                              <input type="number" min={0} value={link.delay_minutes}
                                onChange={e => updateWizardLink(link.id, { delay_minutes: Number(e.target.value) })}
                                className={inputCls + ' !h-8 !text-xs'} />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Minuten</span>
                            </div>
                          </div>
                        </div>

                        {/* Future: Conditions placeholder */}
                        <div className="rounded-lg border border-dashed bg-muted/20 p-2.5">
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Shield className="h-3 w-3" />
                            Bedingungen (z.B. Lead Score {'>'} X) – kommt bald
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Vorschau ── */}
          <TabsContent value="preview" className="space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
              <h4 className="text-sm font-semibold">Eskalations-Simulation</h4>
              <p className="text-xs text-muted-foreground">Wähle eine Lead-Quelle um zu prüfen, welche Eskalationsprozesse greifen würden.</p>

              <div>
                <label className="text-sm font-medium">Lead-Quelle</label>
                <select value={previewSource} onChange={e => setPreviewSource(e.target.value)}
                  className={inputCls + ' mt-1'}>
                  <option value="">Quelle wählen...</option>
                  {leadSources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              {previewSource && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">
                      Ergebnis für Quelle: <span className="text-primary">{leadSources.find(s => s.id === previewSource)?.label}</span>
                    </p>
                  </div>

                  {(() => {
                    const matching = simulateEscalation(previewSource);
                    if (matching.length === 0) {
                      return (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
                          <XCircle className="h-5 w-5 text-amber-600 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Keine Eskalation</p>
                            <p className="text-xs text-amber-600">Für diese Quelle greift kein Eskalationsprozess. Nur der Standardprozess läuft.</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {matching.map((proc, idx) => (
                          <div key={proc.id} className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{idx + 1}</div>
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{proc.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                Priorität: {proc.priority} · {proc.applies_to_all_sources ? 'Alle Quellen' : `${proc.source_filters.length} Quellen`}
                              </p>
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground mt-2">
                          ℹ Der Standardprozess läuft zusätzlich immer mit.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ─── List View ───
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Eskalationsprozesse für «{statusConfig[processStatus].label}»
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Ergänzen den Standardprozess um automatische Eskalationslogik.</p>
        </div>
        <button onClick={() => {
          setCreating(true);
          setForm({ name: '', description: '', priority: processes.length, is_active: false, applies_to_all_sources: true, source_filters: [] });
        }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-3.5 w-3.5" /> Neuer Eskalationsprozess
        </button>
      </div>

      {processes.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Keine Eskalationsprozesse definiert.</p>
          <p className="text-xs text-muted-foreground mt-1">Standardprozess läuft ohne zusätzliche Eskalation.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {processes.map(proc => (
            <div key={proc.id} className={`rounded-xl border bg-card p-4 shadow-sm transition-opacity ${!proc.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-4">
                <button onClick={() => selectProcess(proc)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-sm font-semibold">{proc.name}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${proc.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {proc.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      Priorität: {proc.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {proc.applies_to_all_sources ? (
                      <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> Alle Quellen</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Filter className="h-3 w-3" /> {proc.source_filters?.length || 0} Quellen</span>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-1.5">
                  <Switch checked={proc.is_active} onCheckedChange={() => toggleActive(proc)} />
                  <button onClick={() => selectProcess(proc)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {!proc.is_active && (
                    <button onClick={() => deleteProcess(proc.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
