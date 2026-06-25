import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ScrollText } from 'lucide-react';

interface RuleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  conditions: any;
  actions: any;
  is_active: boolean;
  sort_order: number;
}

const emptyRule = (): Partial<RuleRow> => ({
  code: '', name: '', description: '', conditions: {}, actions: {},
  is_active: true, sort_order: 100,
});

const CONDITION_HELP = `{
  "kind_code": "innendienst",
  "target_group_code": "fk",
  "area": "sales",
  "position_in": ["trainee", "finanzcoach_ausbildung"]
}`;
const ACTION_HELP = `{
  "hide_fields": ["careerplan","leadership"],
  "hide_categories": ["karriereplan"],
  "require_categories": ["reglement_score_fk"],
  "optional_categories": ["vbv_weiterbildung"],
  "allow_partner_fields": true
}`;

export default function ContractRulesTab() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<RuleRow>>(emptyRule());
  const [condText, setCondText] = useState('{}');
  const [actText, setActText] = useState('{}');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('contract_set_rules').select('*').order('sort_order');
    setRules((data as RuleRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditingId(null); setForm(emptyRule());
    setCondText('{}'); setActText('{}');
    setOpen(true);
  };
  const openEdit = (r: RuleRow) => {
    setEditingId(r.id); setForm({ ...r });
    setCondText(JSON.stringify(r.conditions ?? {}, null, 2));
    setActText(JSON.stringify(r.actions ?? {}, null, 2));
    setOpen(true);
  };

  const save = async () => {
    if (!form.code || !form.name) { toast.error('Code und Name erforderlich'); return; }
    let cond: any, act: any;
    try { cond = JSON.parse(condText || '{}'); } catch { toast.error('Bedingungen sind kein gültiges JSON'); return; }
    try { act  = JSON.parse(actText  || '{}'); } catch { toast.error('Aktionen sind kein gültiges JSON');     return; }
    setSaving(true);
    try {
      const payload: any = {
        code: form.code, name: form.name, description: form.description || null,
        conditions: cond, actions: act,
        is_active: form.is_active ?? true, sort_order: form.sort_order ?? 100,
      };
      if (editingId) {
        const { error } = await supabase.from('contract_set_rules').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contract_set_rules').insert(payload);
        if (error) throw error;
      }
      toast.success('Regel gespeichert');
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error('Speichern fehlgeschlagen: ' + (e?.message || e));
    } finally { setSaving(false); }
  };

  const toggleActive = async (r: RuleRow) => {
    await supabase.from('contract_set_rules').update({ is_active: !r.is_active }).eq('id', r.id);
    load();
  };
  const remove = async (r: RuleRow) => {
    if (!confirm(`Regel „${r.name}" löschen?`)) return;
    const { error } = await supabase.from('contract_set_rules').delete().eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ScrollText className="h-4 w-4" />
            Regeln steuern, welche Felder/Anhänge je Vertragsart, Zielgruppe, Bereich oder Position angezeigt, ausgeblendet oder als Pflicht gefordert werden.
          </div>
          <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Neue Regel</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          {loading ? <div className="py-6 text-sm text-muted-foreground">Lade…</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Bedingungen</TableHead>
                  <TableHead>Aktionen</TableHead>
                  <TableHead>Aktiv</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{r.name}</div>
                      {r.description && <div className="text-[11px] text-muted-foreground">{r.description}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.code}</Badge></TableCell>
                    <TableCell><pre className="text-[10px] bg-muted/40 rounded p-1 max-w-[260px] overflow-x-auto">{JSON.stringify(r.conditions, null, 1)}</pre></TableCell>
                    <TableCell><pre className="text-[10px] bg-muted/40 rounded p-1 max-w-[260px] overflow-x-auto">{JSON.stringify(r.actions, null, 1)}</pre></TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Keine Regeln vorhanden.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Regel bearbeiten' : 'Neue Regel'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Code *</Label><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>Name *</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Beschreibung</Label><Textarea rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="md:col-span-2">
              <Label>Bedingungen (JSON)</Label>
              <Textarea rows={6} className="font-mono text-xs" value={condText} onChange={e => setCondText(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Beispiel: <code>{CONDITION_HELP}</code></p>
            </div>
            <div className="md:col-span-2">
              <Label>Aktionen (JSON)</Label>
              <Textarea rows={6} className="font-mono text-xs" value={actText} onChange={e => setActText(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Beispiel: <code>{ACTION_HELP}</code></p>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Aktiv</Label></div>
            <div><Label>Sortierung</Label><Input type="number" value={form.sort_order ?? 100} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 100 })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Speichert…' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
