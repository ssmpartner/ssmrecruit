import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, X, GripVertical, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CareerLevel {
  name: string;
  salaryMin: number;
  salaryMax: number;
  requirements: string[];
}

interface CareerPlan {
  id: string;
  position: string;
  levels: CareerLevel[];
  is_active: boolean;
}

export default function CareerPlansTab() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<CareerPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<CareerPlan, 'id'>>({ position: '', levels: [], is_active: true });
  const [isAdding, setIsAdding] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('career_plans').select('*').order('position');
    if (!error && data) {
      setPlans(data.map((r: any) => ({
        id: r.id,
        position: r.position,
        levels: (r.levels as CareerLevel[]) || [],
        is_active: r.is_active,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const emptyLevel: CareerLevel = { name: '', salaryMin: 0, salaryMax: 0, requirements: [''] };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setDraft({ position: '', levels: [{ ...emptyLevel }], is_active: true });
  };

  const startEdit = (plan: CareerPlan) => {
    setEditingId(plan.id);
    setIsAdding(false);
    setDraft({ position: plan.position, levels: plan.levels.length ? plan.levels : [{ ...emptyLevel }], is_active: plan.is_active });
    setExpandedId(plan.id);
  };

  const cancel = () => { setIsAdding(false); setEditingId(null); };

  const save = async () => {
    if (!draft.position.trim()) {
      toast({ title: 'Fehler', description: 'Position ist erforderlich', variant: 'destructive' });
      return;
    }
    const validLevels = draft.levels.filter(l => l.name.trim());
    if (!validLevels.length) {
      toast({ title: 'Fehler', description: 'Mindestens eine Stufe ist erforderlich', variant: 'destructive' });
      return;
    }

    const payload = { position: draft.position.trim(), levels: validLevels as any, is_active: draft.is_active };

    if (editingId) {
      const { error } = await supabase.from('career_plans').update(payload).eq('id', editingId);
      if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Gespeichert', description: `Karriereplan für "${draft.position}" aktualisiert.` });
    } else {
      const { error } = await supabase.from('career_plans').insert(payload);
      if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Erstellt', description: `Karriereplan für "${draft.position}" erstellt.` });
    }
    cancel();
    loadPlans();
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from('career_plans').delete().eq('id', id);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Gelöscht' });
    loadPlans();
  };

  const updateLevel = (index: number, updates: Partial<CareerLevel>) => {
    setDraft(prev => ({
      ...prev,
      levels: prev.levels.map((l, i) => i === index ? { ...l, ...updates } : l),
    }));
  };

  const addLevel = () => setDraft(prev => ({ ...prev, levels: [...prev.levels, { ...emptyLevel }] }));
  const removeLevel = (index: number) => setDraft(prev => ({ ...prev, levels: prev.levels.filter((_, i) => i !== index) }));

  const updateReq = (levelIdx: number, reqIdx: number, value: string) => {
    setDraft(prev => ({
      ...prev,
      levels: prev.levels.map((l, i) => i === levelIdx ? { ...l, requirements: l.requirements.map((r, ri) => ri === reqIdx ? value : r) } : l),
    }));
  };

  const addReq = (levelIdx: number) => {
    setDraft(prev => ({
      ...prev,
      levels: prev.levels.map((l, i) => i === levelIdx ? { ...l, requirements: [...l.requirements, ''] } : l),
    }));
  };

  const removeReq = (levelIdx: number, reqIdx: number) => {
    setDraft(prev => ({
      ...prev,
      levels: prev.levels.map((l, i) => i === levelIdx ? { ...l, requirements: l.requirements.filter((_, ri) => ri !== reqIdx) } : l),
    }));
  };

  const isEditing = isAdding || editingId !== null;

  const formatSalary = (v: number) => v ? `CHF ${v.toLocaleString('de-CH')}` : '–';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Target className="h-5 w-5" /> SSM Karriereplan</h2>
          <p className="text-sm text-muted-foreground">Karrierepfade mit Stufen, Gehaltsbändern und Anforderungen verwalten</p>
        </div>
        {!isEditing && (
          <button onClick={startAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Neuer Plan
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {isEditing && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold">{editingId ? 'Karriereplan bearbeiten' : 'Neuer Karriereplan'}</h3>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Position *</label>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="z.B. Frontend Entwickler"
              value={draft.position}
              onChange={e => setDraft(prev => ({ ...prev, position: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={draft.is_active} onChange={e => setDraft(prev => ({ ...prev, is_active: e.target.checked }))} className="rounded" />
            <span className="text-sm">Aktiv</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stufen</label>
              <button onClick={addLevel} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="h-3 w-3" /> Stufe</button>
            </div>

            {draft.levels.map((level, li) => (
              <div key={li} className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    <span className="text-xs font-bold text-muted-foreground">Stufe {li + 1}</span>
                  </div>
                  {draft.levels.length > 1 && (
                    <button onClick={() => removeLevel(li)} className="text-destructive hover:text-destructive/80"><X className="h-3.5 w-3.5" /></button>
                  )}
                </div>

                <input
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                  placeholder="Stufenname (z.B. Junior, Senior, Lead)"
                  value={level.name}
                  onChange={e => updateLevel(li, { name: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Gehalt Min (CHF)</label>
                    <input
                      type="number" className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                      value={level.salaryMin || ''} onChange={e => updateLevel(li, { salaryMin: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Gehalt Max (CHF)</label>
                    <input
                      type="number" className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                      value={level.salaryMax || ''} onChange={e => updateLevel(li, { salaryMax: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">Anforderungen</label>
                  {level.requirements.map((req, ri) => (
                    <div key={ri} className="flex gap-2">
                      <input
                        className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
                        placeholder="z.B. 3+ Jahre Erfahrung"
                        value={req}
                        onChange={e => updateReq(li, ri, e.target.value)}
                      />
                      {level.requirements.length > 1 && (
                        <button onClick={() => removeReq(li, ri)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addReq(li)} className="text-xs text-primary hover:underline">+ Anforderung</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Save className="h-4 w-4" /> Speichern
            </button>
            <button onClick={cancel} className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Plans list */}
      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-8">Lade Karrierepläne...</div>
      ) : plans.length === 0 && !isEditing ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Noch keine Karrierepläne</p>
          <p className="text-xs mt-1">Erstellen Sie den ersten Plan für eine Position.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map(plan => {
            const isExpanded = expandedId === plan.id && editingId !== plan.id;
            return (
              <div key={plan.id} className="rounded-xl border bg-card shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                  <div className="flex items-center gap-3">
                    <Target className="h-4 w-4 text-primary" />
                    <div>
                      <span className="text-sm font-medium">{plan.position}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{plan.levels.length} Stufe{plan.levels.length !== 1 ? 'n' : ''}</span>
                    </div>
                    {!plan.is_active && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Inaktiv</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); startEdit(plan); }} className="p-1 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={e => { e.stopPropagation(); deletePlan(plan.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-3 space-y-2">
                    {plan.levels.map((level, li) => (
                      <div key={li} className="flex items-start gap-3 py-2 border-b last:border-0">
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">{li + 1}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{level.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSalary(level.salaryMin)} – {formatSalary(level.salaryMax)}
                          </p>
                          {level.requirements.filter(Boolean).length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {level.requirements.filter(Boolean).map((req, ri) => (
                                <li key={ri} className="text-xs text-muted-foreground flex items-start gap-1">
                                  <span className="text-primary mt-0.5">•</span> {req}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
