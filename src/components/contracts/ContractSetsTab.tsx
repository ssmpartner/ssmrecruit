import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, PackageOpen } from 'lucide-react';
import { useContractLookups, CONTRACT_LANGUAGES, ContractLang } from '@/hooks/useContractLookups';
import { evaluateRules, applyRulesToItems, RuleRow } from '@/lib/contract-rules';

type Role = 'main' | 'mandatory' | 'optional' | 'jobdesc' | 'careerplan' | 'leadership' | 'education';
const ROLE_LABEL: Record<Role, string> = {
  main: 'Hauptvertrag', mandatory: 'Pflicht-Anhang', optional: 'Optional',
  jobdesc: 'Stellenbeschreibung', careerplan: 'Karriereplan',
  leadership: 'Leadership', education: 'Weiterbildung',
};

interface SetRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  kind_code: string | null;
  target_group_code: string | null;
  area: 'sales' | 'office' | null;
  position_codes: string[];
  language: ContractLang;
  is_active: boolean;
  sort_order: number;
}
interface SetItem {
  id: string;
  set_id: string;
  role: Role;
  category_code: string;
  is_mandatory: boolean;
  sort_order: number;
}

const emptySet = (): Partial<SetRow> => ({
  code: '', name: '', description: '', kind_code: null, target_group_code: null,
  area: null, position_codes: [], language: 'de', is_active: true, sort_order: 100,
});

export default function ContractSetsTab() {
  const { kinds, categories, targetGroups } = useContractLookups();
  const [sets, setSets] = useState<SetRow[]>([]);
  const [items, setItems] = useState<SetItem[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SetRow | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<SetRow>>(emptySet());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Item-Editor
  const [itemRole, setItemRole] = useState<Role>('mandatory');
  const [itemCategory, setItemCategory] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const [s, i, r] = await Promise.all([
      supabase.from('contract_sets').select('*').order('sort_order'),
      supabase.from('contract_set_items').select('*').order('sort_order'),
      supabase.from('contract_set_rules').select('id,code,name,conditions,actions,is_active').eq('is_active', true),
    ]);
    setSets((s.data as SetRow[]) || []);
    setItems((i.data as SetItem[]) || []);
    setRules((r.data as RuleRow[]) || []);
    setLoading(false);
    if (!selected && s.data && s.data.length) setSelected(s.data[0] as SetRow);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const selectedItems = useMemo(
    () => items.filter(it => it.set_id === selected?.id).sort((a, b) => a.sort_order - b.sort_order),
    [items, selected]
  );

  // Effective rules preview gegen Set-Kontext
  const effective = useMemo(() => selected ? evaluateRules(rules, {
    kind_code: selected.kind_code,
    target_group_code: selected.target_group_code,
    area: selected.area,
    position: selected.position_codes?.[0] || null,
  }) : null, [rules, selected]);

  const previewItems = useMemo(() => {
    if (!effective) return selectedItems;
    return applyRulesToItems(selectedItems, effective);
  }, [selectedItems, effective]);

  const catLabel = (code: string) => categories.find(c => c.code === code)?.label_de || code;

  const openNew = () => { setEditingId(null); setForm(emptySet()); setOpen(true); };
  const openEdit = (s: SetRow) => {
    setEditingId(s.id);
    setForm({ ...s });
    setOpen(true);
  };

  const saveSet = async () => {
    if (!form.code || !form.name) { toast.error('Code und Name erforderlich'); return; }
    setSaving(true);
    try {
      const payload: any = {
        code: form.code, name: form.name, description: form.description || null,
        kind_code: form.kind_code || null, target_group_code: form.target_group_code || null,
        area: form.area || null, position_codes: form.position_codes || [],
        language: form.language || 'de', is_active: form.is_active ?? true,
        sort_order: form.sort_order ?? 100,
      };
      if (editingId) {
        const { error } = await supabase.from('contract_sets').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contract_sets').insert(payload);
        if (error) throw error;
      }
      toast.success('Set gespeichert');
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error('Speichern fehlgeschlagen: ' + (e?.message || e));
    } finally { setSaving(false); }
  };

  const removeSet = async (s: SetRow) => {
    if (!confirm(`Set „${s.name}" wirklich löschen? Items werden ebenfalls entfernt.`)) return;
    const { error } = await supabase.from('contract_sets').delete().eq('id', s.id);
    if (error) { toast.error(error.message); return; }
    if (selected?.id === s.id) setSelected(null);
    load();
  };

  const addItem = async () => {
    if (!selected || !itemCategory) { toast.error('Kategorie wählen'); return; }
    const { error } = await supabase.from('contract_set_items').insert({
      set_id: selected.id, role: itemRole, category_code: itemCategory,
      is_mandatory: itemRole !== 'optional',
      sort_order: (selectedItems.at(-1)?.sort_order || 0) + 10,
    });
    if (error) { toast.error(error.message); return; }
    setItemCategory('');
    load();
  };

  const removeItem = async (it: SetItem) => {
    const { error } = await supabase.from('contract_set_items').delete().eq('id', it.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const toggleItemMandatory = async (it: SetItem) => {
    const { error } = await supabase.from('contract_set_items')
      .update({ is_mandatory: !it.is_mandatory }).eq('id', it.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Liste der Sets */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2"><PackageOpen className="h-4 w-4" /> Vertragssets</CardTitle>
          <Button size="sm" onClick={openNew} className="gap-1"><Plus className="h-3.5 w-3.5" /> Neu</Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {loading ? <div className="text-sm text-muted-foreground">Lade…</div> :
            sets.map(s => (
              <div key={s.id}
                className={`p-2 rounded-md cursor-pointer border ${selected?.id === s.id ? 'border-primary bg-muted/50' : 'border-transparent hover:bg-muted/30'}`}
                onClick={() => setSelected(s)}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="flex items-center gap-1">
                    {!s.is_active && <Badge variant="outline" className="text-[10px]">inaktiv</Badge>}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(s); }}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); removeSet(s); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground flex flex-wrap gap-1 mt-1">
                  {s.kind_code && <Badge variant="secondary" className="text-[10px]">{kinds.find(k => k.code === s.kind_code)?.label_de}</Badge>}
                  {s.target_group_code && <Badge variant="outline" className="text-[10px]">{targetGroups.find(t => t.code === s.target_group_code)?.label_de}</Badge>}
                  {s.area && <Badge variant="outline" className="text-[10px]">{s.area === 'sales' ? 'Vertrieb' : 'Innendienst'}</Badge>}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Detail: Items + Regel-Vorschau */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {selected ? selected.name : 'Bitte ein Set wählen'}
          </CardTitle>
          {selected?.description && <p className="text-xs text-muted-foreground">{selected.description}</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          {selected && (
            <>
              {effective && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                  <div className="font-medium">Aktive Regeln für dieses Set</div>
                  {effective.matched.length === 0 ? (
                    <div className="text-muted-foreground">Keine Regeln treffen zu.</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {effective.matched.map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                    </div>
                  )}
                  {effective.hiddenCategories.size > 0 && (
                    <div>Ausgeblendete Kategorien: {[...effective.hiddenCategories].map(catLabel).join(', ')}</div>
                  )}
                  {effective.requiredCategories.size > 0 && (
                    <div>Pflicht durch Regel: {[...effective.requiredCategories].map(catLabel).join(', ')}</div>
                  )}
                  {effective.optionalCategories.size > 0 && (
                    <div>Optional durch Regel: {[...effective.optionalCategories].map(catLabel).join(', ')}</div>
                  )}
                  {effective.allowPartnerFields && <div>→ Partner-/Firmenfelder aktiv (keine Arbeitnehmerfelder).</div>}
                </div>
              )}

              <div className="flex flex-wrap items-end gap-2 border rounded-md p-3">
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs">Rolle</Label>
                  <Select value={itemRole} onValueChange={(v: Role) => setItemRole(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-[2] min-w-[200px]">
                  <Label className="text-xs">Kategorie</Label>
                  <Select value={itemCategory} onValueChange={setItemCategory}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.code} value={c.code}>{c.label_de}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addItem} className="gap-1"><Plus className="h-4 w-4" /> Hinzufügen</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Pflicht</TableHead>
                    <TableHead>Regelhinweis</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewItems.map(it => {
                    const hidden = effective?.hiddenCategories.has(it.category_code);
                    const forcedReq = effective?.requiredCategories.has(it.category_code);
                    const forcedOpt = effective?.optionalCategories.has(it.category_code);
                    return (
                      <TableRow key={it.id} className={hidden ? 'opacity-40 line-through' : ''}>
                        <TableCell><Badge variant="outline" className="text-[10px]">{ROLE_LABEL[it.role]}</Badge></TableCell>
                        <TableCell className="text-xs">{catLabel(it.category_code)}</TableCell>
                        <TableCell>
                          <Switch checked={it.is_mandatory} onCheckedChange={() => toggleItemMandatory(it)} />
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {hidden && 'Wird durch Regel ausgeblendet'}
                          {forcedReq && !hidden && 'Pflicht durch Regel'}
                          {forcedOpt && !hidden && 'Optional durch Regel'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => removeItem(it)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {previewItems.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Noch keine Bestandteile.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Set-Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? 'Vertragsset bearbeiten' : 'Neues Vertragsset'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Code *</Label><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>Name *</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Beschreibung</Label><Textarea rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Vertragsart</Label>
              <Select value={form.kind_code || ''} onValueChange={v => setForm({ ...form, kind_code: v || null })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{kinds.map(k => <SelectItem key={k.code} value={k.code}>{k.label_de}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Zielgruppe</Label>
              <Select value={form.target_group_code || ''} onValueChange={v => setForm({ ...form, target_group_code: v || null })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{targetGroups.map(t => <SelectItem key={t.code} value={t.code}>{t.label_de}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bereich</Label>
              <Select value={form.area || 'none'} onValueChange={v => setForm({ ...form, area: v === 'none' ? null : (v as any) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="sales">Vertrieb</SelectItem>
                  <SelectItem value="office">Innendienst</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sprache</Label>
              <Select value={form.language || 'de'} onValueChange={(v: ContractLang) => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONTRACT_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Positionen (Komma-getrennte Codes, z. B. trainee, finanzcoach)</Label>
              <Input value={(form.position_codes || []).join(', ')}
                onChange={e => setForm({ ...form, position_codes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Aktiv</Label>
            </div>
            <div><Label>Sortierung</Label><Input type="number" value={form.sort_order ?? 100} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 100 })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={saveSet} disabled={saving}>{saving ? 'Speichert…' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
