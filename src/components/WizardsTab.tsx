import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Copy, Trash2, Eye, ArrowLeft, GripVertical, Play, ChevronRight, Video, ListChecks, ToggleLeft, Loader2, AlertTriangle, ExternalLink, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ── Types ──
interface WizardOption {
  id: string;
  label: string;
  value: string;
  next_step_id: string;
  triggers: Record<string, unknown>[];
}

interface WizardStep {
  id: string;
  type: 'video' | 'choice' | 'decision';
  title: string;
  content: string;
  options: WizardOption[];
  next_step_logic: string;
}

interface Wizard {
  id: string;
  name: string;
  type: string;
  status: string;
  version: string;
  steps: WizardStep[];
  rules: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

const STEP_TYPES: { value: WizardStep['type']; label: string; icon: typeof Video }[] = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'choice', label: 'Auswahl (Multiple Choice)', icon: ListChecks },
  { value: 'decision', label: 'Entscheidung (Ja/Nein)', icon: ToggleLeft },
];

const uid = () => crypto.randomUUID();

const emptyOption = (): WizardOption => ({ id: uid(), label: '', value: '', next_step_id: '', triggers: [] });

const emptyStep = (type: WizardStep['type'] = 'choice'): WizardStep => ({
  id: uid(),
  type,
  title: '',
  content: '',
  options: type === 'decision'
    ? [{ ...emptyOption(), label: 'Ja', value: 'yes' }, { ...emptyOption(), label: 'Nein', value: 'no' }]
    : [emptyOption()],
  next_step_logic: '',
});

// ── List view ──
function WizardList({ wizards, loading, onEdit, onDuplicate, onDelete, onToggle, onCreate }: {
  wizards: Wizard[];
  loading: boolean;
  onEdit: (w: Wizard) => void;
  onDuplicate: (w: Wizard) => void;
  onDelete: (w: Wizard) => void;
  onToggle: (w: Wizard) => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Wizard-Verwaltung</h2>
          <p className="text-sm text-muted-foreground">Erstelle und verwalte Wizard-Abläufe für Recruiting, Sales und mehr.</p>
        </div>
        <Button onClick={onCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Neuer Wizard</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : wizards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Noch keine Wizards vorhanden.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wizards.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name || '(Unbenannt)'}</TableCell>
                    <TableCell>
                      <Switch checked={w.status === 'active'} onCheckedChange={() => onToggle(w)} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground capitalize">{w.type}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{w.version}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(w)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDuplicate(w)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" disabled={w.status === 'active'} onClick={() => onDelete(w)}>
                        <Trash2 className={`h-4 w-4 ${w.status === 'active' ? 'text-muted-foreground/40' : 'text-destructive'}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bewerbungs-Wizard special card */}
      <Card className="border-l-4 border-l-accent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center">
                <ClipboardList className="h-4.5 w-4.5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Bewerbungs-Wizard</p>
                <p className="text-xs text-muted-foreground">Öffentliches Bewerbungsformular unter /bewerbung</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href="/bewerbung" target="_blank" rel="noopener"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                <ExternalLink className="h-3.5 w-3.5" /> Vorschau
              </a>
              <Button variant="outline" size="sm" onClick={() => {
                // Navigate to bewerbung tab in settings
                const event = new CustomEvent('settings-navigate', { detail: 'bewerbung' });
                window.dispatchEvent(event);
              }}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Konfigurieren
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Step editor ──
function StepEditor({ step, steps, onChange, onRemove }: {
  step: WizardStep;
  steps: WizardStep[];
  onChange: (s: WizardStep) => void;
  onRemove: () => void;
}) {
  const update = (patch: Partial<WizardStep>) => onChange({ ...step, ...patch });
  const setOption = (idx: number, patch: Partial<WizardOption>) => {
    const opts = [...step.options];
    opts[idx] = { ...opts[idx], ...patch };
    update({ options: opts });
  };

  return (
    <Card className="border-l-4 border-l-primary/60">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {STEP_TYPES.find(t => t.value === step.type)?.label ?? step.type}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Titel</Label>
            <Input value={step.title} onChange={e => update({ title: e.target.value })} placeholder="Step Titel" />
          </div>
          <div>
            <Label className="text-xs">Typ</Label>
            <Select value={step.type} onValueChange={v => update({ type: v as WizardStep['type'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STEP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs">Beschreibung / Content</Label>
          <Textarea value={step.content} onChange={e => update({ content: e.target.value })} rows={2} placeholder="Beschreibung oder Content" />
        </div>

        {(step.type === 'choice' || step.type === 'decision') && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Optionen</Label>
            {step.options.map((opt, idx) => (
              <div key={opt.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Label</Label>
                  <Input value={opt.label} onChange={e => setOption(idx, { label: e.target.value })} placeholder="Label" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Wert</Label>
                  <Input value={opt.value} onChange={e => setOption(idx, { value: e.target.value })} placeholder="value" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Next Step</Label>
                  <Select value={opt.next_step_id || '__none'} onValueChange={v => setOption(idx, { next_step_id: v === '__none' ? '' : v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Kein —</SelectItem>
                      {steps.filter(s => s.id !== step.id).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.title || `Step ${steps.indexOf(s) + 1}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {step.type === 'choice' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => update({ options: step.options.filter((_, i) => i !== idx) })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {step.type === 'choice' && (
              <Button variant="outline" size="sm" onClick={() => update({ options: [...step.options, emptyOption()] })}>
                <Plus className="h-3 w-3 mr-1" /> Option
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Preview ──
function WizardPreview({ steps }: { steps: WizardStep[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (steps.length === 0) return <div className="text-center py-12 text-muted-foreground text-sm">Keine Schritte vorhanden</div>;

  const step = steps[currentIdx];
  if (!step) return null;

  const goTo = (stepId: string) => {
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx >= 0) setCurrentIdx(idx);
    else if (currentIdx < steps.length - 1) setCurrentIdx(currentIdx + 1);
  };

  const selectOption = (opt: WizardOption) => {
    setAnswers(prev => ({ ...prev, [step.id]: opt.value }));
    if (opt.next_step_id) goTo(opt.next_step_id);
    else if (currentIdx < steps.length - 1) setCurrentIdx(currentIdx + 1);
  };

  const isLast = currentIdx >= steps.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {steps.map((s, i) => (
          <span key={s.id} className={`flex items-center gap-1 ${i === currentIdx ? 'text-primary font-semibold' : ''}`}>
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {s.title || `Step ${i + 1}`}
          </span>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">
            {STEP_TYPES.find(t => t.value === step.type)?.label}
          </span>
          <CardTitle className="text-base">{step.title || `Step ${currentIdx + 1}`}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {step.content && <p className="text-sm text-muted-foreground">{step.content}</p>}

          {step.type === 'video' && (
            <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
              <Play className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}

          {(step.type === 'choice' || step.type === 'decision') && (
            <div className="space-y-2">
              {step.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => selectOption(opt)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    answers[step.id] === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  {opt.label || opt.value || '(Leer)'}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" disabled={currentIdx === 0} onClick={() => setCurrentIdx(currentIdx - 1)}>Zurück</Button>
            {step.type === 'video' && (
              <Button size="sm" disabled={isLast} onClick={() => setCurrentIdx(currentIdx + 1)}>Weiter</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" onClick={() => { setCurrentIdx(0); setAnswers({}); }}>
        <Play className="h-3 w-3 mr-1" /> Neustart
      </Button>
    </div>
  );
}

// ── Editor ──
function WizardEditor({ wizard, onSave, onBack, allWizards }: {
  wizard: Wizard;
  onSave: (w: Wizard) => Promise<void>;
  onBack: () => void;
  allWizards: Wizard[];
}) {
  const [draft, setDraft] = useState<Wizard>({ ...wizard, steps: [...(wizard.steps || [])] });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const patch = (p: Partial<Wizard>) => setDraft(prev => ({ ...prev, ...p }));

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast({ title: 'Fehler', description: 'Name ist erforderlich', variant: 'destructive' });
      return;
    }
    // Check: only one active recruiting wizard
    if (draft.status === 'active' && draft.type === 'recruiting') {
      const conflict = allWizards.find(w => w.id !== draft.id && w.type === 'recruiting' && w.status === 'active');
      if (conflict) {
        toast({ title: 'Fehler', description: `Es existiert bereits ein aktiver Recruiting-Wizard: "${conflict.name}"`, variant: 'destructive' });
        return;
      }
    }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  };

  const addStep = (type: WizardStep['type']) => {
    patch({ steps: [...draft.steps, emptyStep(type)] });
  };

  const updateStep = (idx: number, s: WizardStep) => {
    const steps = [...draft.steps];
    steps[idx] = s;
    patch({ steps });
  };

  const removeStep = (idx: number) => {
    patch({ steps: draft.steps.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{wizard.id ? 'Wizard bearbeiten' : 'Neuer Wizard'}</h2>
          <p className="text-xs text-muted-foreground">{draft.name || '(Unbenannt)'}</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Speichern
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full">
          <TabsTrigger value="general" className="flex-1">Allgemein</TabsTrigger>
          <TabsTrigger value="steps" className="flex-1">Schritte ({draft.steps.length})</TabsTrigger>
          <TabsTrigger value="logic" className="flex-1">Logik</TabsTrigger>
          <TabsTrigger value="preview" className="flex-1">Vorschau</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 pt-2">
          <div>
            <Label>Name</Label>
            <Input value={draft.name} onChange={e => patch({ name: e.target.value })} placeholder="Wizard Name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Typ</Label>
              <Select value={draft.type} onValueChange={v => patch({ type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruiting">Recruiting</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Version</Label>
              <Input value={draft.version} onChange={e => patch({ version: e.target.value })} placeholder="1.0" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={draft.status === 'active'} onCheckedChange={v => patch({ status: v ? 'active' : 'inactive' })} />
            <Label>{draft.status === 'active' ? 'Aktiv' : 'Inaktiv'}</Label>
          </div>
        </TabsContent>

        <TabsContent value="steps" className="space-y-3 pt-2">
          {draft.steps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Noch keine Schritte. Füge den ersten Schritt hinzu.</p>
          )}
          {draft.steps.map((s, i) => (
            <StepEditor key={s.id} step={s} steps={draft.steps} onChange={upd => updateStep(i, upd)} onRemove={() => removeStep(i)} />
          ))}
          <div className="flex gap-2 flex-wrap">
            {STEP_TYPES.map(t => {
              const Icon = t.icon;
              return (
                <Button key={t.value} variant="outline" size="sm" onClick={() => addStep(t.value)}>
                  <Icon className="h-3.5 w-3.5 mr-1" /> {t.label}
                </Button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="logic" className="pt-2">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mb-3 text-muted-foreground/40" />
              <p className="font-medium">Regel-Engine kommt bald</p>
              <p className="text-xs mt-1">Hier werden Automationen, Scoring und Matching-Logiken konfiguriert.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="pt-2">
          <WizardPreview steps={draft.steps} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Main export ──
export default function WizardsTab() {
  const [wizards, setWizards] = useState<Wizard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Wizard | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Wizard | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('wizards').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setWizards(data.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        status: r.status,
        version: r.version,
        steps: (r.steps as WizardStep[]) || [],
        rules: (r.rules as Record<string, unknown>[]) || [],
        created_at: r.created_at,
        updated_at: r.updated_at,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (w: Wizard) => {
    const payload = { name: w.name, type: w.type, status: w.status, version: w.version, steps: JSON.parse(JSON.stringify(w.steps)), rules: JSON.parse(JSON.stringify(w.rules)) };
    let error;
    if (wizards.find(x => x.id === w.id)) {
      ({ error } = await supabase.from('wizards').update(payload).eq('id', w.id));
    } else {
      ({ error } = await supabase.from('wizards').insert({ id: w.id, ...payload }));
    }
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Gespeichert', description: `Wizard "${w.name}" wurde gespeichert.` });
    await load();
    setEditing(null);
  };

  const toggle = async (w: Wizard) => {
    const next = w.status === 'active' ? 'inactive' : 'active';
    if (next === 'active' && w.type === 'recruiting') {
      const conflict = wizards.find(x => x.id !== w.id && x.type === 'recruiting' && x.status === 'active');
      if (conflict) {
        toast({ title: 'Fehler', description: `Es darf nur ein aktiver Recruiting-Wizard existieren. Deaktiviere zuerst "${conflict.name}".`, variant: 'destructive' });
        return;
      }
    }
    await supabase.from('wizards').update({ status: next }).eq('id', w.id);
    await load();
  };

  const duplicate = async (w: Wizard) => {
    const copy: Wizard = { ...w, id: uid(), name: `${w.name} (Kopie)`, status: 'inactive', steps: JSON.parse(JSON.stringify(w.steps)), rules: JSON.parse(JSON.stringify(w.rules)) };
    await save(copy);
  };

  const remove = async () => {
    if (!confirmDelete) return;
    await supabase.from('wizards').delete().eq('id', confirmDelete.id);
    setConfirmDelete(null);
    await load();
    toast({ title: 'Gelöscht', description: 'Wizard wurde entfernt.' });
  };

  const handleCreate = () => {
    setEditing({
      id: uid(),
      name: '',
      type: 'recruiting',
      status: 'inactive',
      version: '1.0',
      steps: [],
      rules: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  if (editing) {
    return <WizardEditor wizard={editing} onSave={save} onBack={() => setEditing(null)} allWizards={wizards} />;
  }

  return (
    <>
      <WizardList
        wizards={wizards}
        loading={loading}
        onEdit={w => setEditing(w)}
        onDuplicate={duplicate}
        onDelete={w => setConfirmDelete(w)}
        onToggle={toggle}
        onCreate={handleCreate}
      />

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wizard löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Möchtest du den Wizard „{confirmDelete?.name}" wirklich unwiderruflich löschen?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={remove}>Löschen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
