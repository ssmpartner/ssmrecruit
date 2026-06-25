import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Archive, CheckCircle2, FileDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AREA_LABELS, CONTRACT_LANGUAGES, TEMPLATE_STATUS_LABELS,
  PLACEHOLDER_GROUPS, findDisallowedPlaceholders,
} from '@/lib/contract-placeholders';
import { useCareerLevels } from '@/hooks/useCareerLevels';
import PlaceholderPicker from './PlaceholderPicker';

type Template = {
  id: string;
  title: string;
  contract_type: string;
  area: 'sales' | 'office';
  position: string | null;
  level: string | null;
  language: string;
  careerplan_linked: boolean;
  careerplan_level: string | null;
  status: 'draft' | 'active' | 'archived';
  body_html: string;
  version: number;
  updated_at: string;
};

const empty: Partial<Template> = {
  title: '', contract_type: 'Arbeitsvertrag', area: 'sales',
  position: '', level: '', language: 'de',
  careerplan_linked: false, careerplan_level: null, status: 'draft', body_html: '',
};

export default function ContractTemplatesTab() {
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Template>>(empty);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Template[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEdit({ ...empty }); setOpen(true); }
  function openEdit(t: Template) { setEdit({ ...t }); setOpen(true); }

  async function save() {
    if (!edit.title || !edit.area) { toast.error('Titel und Bereich erforderlich'); return; }
    const user = (await supabase.auth.getUser()).data.user;
    const payload = {
      title: edit.title, contract_type: edit.contract_type || 'Arbeitsvertrag',
      area: edit.area, position: edit.position || null, level: edit.level || null,
      language: edit.language || 'de',
      careerplan_linked: edit.area === 'sales' ? !!edit.careerplan_linked : false,
      careerplan_level: edit.area === 'sales' ? edit.careerplan_level || null : null,
      status: edit.status || 'draft', body_html: edit.body_html || '',
      updated_by: user?.id,
    };

    if (edit.id) {
      // Versionierung: alten Stand snapshotten
      const old = rows.find(r => r.id === edit.id);
      if (old) {
        await supabase.from('contract_template_versions').insert({
          template_id: edit.id, version: old.version,
          title: old.title, body_html: old.body_html,
          snapshot: old as any, created_by: user?.id,
        });
      }
      const { error } = await supabase
        .from('contract_templates')
        .update({ ...payload, version: (old?.version ?? 1) + 1 })
        .eq('id', edit.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('contract_templates').insert({
        ...payload, created_by: user?.id,
      });
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Gespeichert');
    setOpen(false);
    load();
  }

  async function changeStatus(id: string, status: Template['status']) {
    const { error } = await supabase.from('contract_templates').update({ status }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Status aktualisiert'); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Vorlagen werden versioniert. Originalfassungen werden beim Bearbeiten archiviert, nicht überschrieben.
        </p>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Neue Vorlage</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Bereich</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Stufe</TableHead>
              <TableHead>Sprache</TableHead>
              <TableHead>Karriereplan</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Lädt…</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Noch keine Vorlagen.</TableCell></TableRow>}
            {rows.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell><Badge variant={t.area === 'sales' ? 'default' : 'secondary'}>{AREA_LABELS[t.area]}</Badge></TableCell>
                <TableCell>{t.position || '–'}</TableCell>
                <TableCell>{t.level || '–'}</TableCell>
                <TableCell className="uppercase text-xs">{t.language}</TableCell>
                <TableCell>{t.area === 'sales' && t.careerplan_linked ? (t.careerplan_level || 'Ja') : '–'}</TableCell>
                <TableCell>v{t.version}</TableCell>
                <TableCell><Badge variant="outline">{TEMPLATE_STATUS_LABELS[t.status]}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    {t.status !== 'active' && (
                      <Button size="sm" variant="ghost" onClick={() => changeStatus(t.id, 'active')} title="Aktivieren"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></Button>
                    )}
                    {t.status !== 'archived' && (
                      <Button size="sm" variant="ghost" onClick={() => changeStatus(t.id, 'archived')} title="Archivieren"><Archive className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit.id ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titel *</Label>
              <Input value={edit.title || ''} onChange={e => setEdit({ ...edit, title: e.target.value })} />
            </div>
            <div>
              <Label>Vertragstyp</Label>
              <Input value={edit.contract_type || ''} onChange={e => setEdit({ ...edit, contract_type: e.target.value })} />
            </div>
            <div>
              <Label>Bereich *</Label>
              <Select value={edit.area} onValueChange={(v: any) => setEdit({ ...edit, area: v, careerplan_linked: v === 'sales' ? edit.careerplan_linked : false })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Vertrieb</SelectItem>
                  <SelectItem value="office">Innendienst</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Position</Label>
              <Input value={edit.position || ''} onChange={e => setEdit({ ...edit, position: e.target.value })} />
            </div>
            <div>
              <Label>Stufe</Label>
              <Input value={edit.level || ''} onChange={e => setEdit({ ...edit, level: e.target.value })} />
            </div>
            <div>
              <Label>Sprache</Label>
              <Select value={edit.language} onValueChange={v => setEdit({ ...edit, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={edit.status} onValueChange={(v: any) => setEdit({ ...edit, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Entwurf</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="archived">Archiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {edit.area === 'sales' && (
              <>
                <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">Mit SSM Karriereplan verknüpfen</Label>
                    <p className="text-xs text-muted-foreground">Nur für Vertrieb. Innendienst nutzt keinen Karriereplan.</p>
                  </div>
                  <Switch checked={!!edit.careerplan_linked} onCheckedChange={v => setEdit({ ...edit, careerplan_linked: v })} />
                </div>
                {edit.careerplan_linked && (
                  <div className="col-span-2">
                    <Label>Karriereplan-Stufe</Label>
                    <TemplateCareerLevelSelect
                      position={edit.position || ''}
                      value={edit.careerplan_level || ''}
                      onChange={v => setEdit({ ...edit, careerplan_level: v })}
                    />
                  </div>
                )}
              </>
            )}

            <div className="col-span-2">
              <Label>Vertragsinhalt (HTML) – Platzhalter mit {`{{candidate.first_name}}`} usw.</Label>
              <Textarea
                rows={14} className="font-mono text-xs"
                value={edit.body_html || ''}
                onChange={e => setEdit({ ...edit, body_html: e.target.value })}
              />
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Verfügbare Platzhalter</summary>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {KNOWN_PLACEHOLDERS.map(k => (
                    <code key={k} className={`px-1 ${k.startsWith('careerplan.') && edit.area === 'office' ? 'line-through opacity-40' : ''}`}>{`{{${k}}}`}</code>
                  ))}
                </div>
              </details>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={save}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCareerLevelSelect({ position, value, onChange }: { position: string; value: string; onChange: (v: string) => void }) {
  const { levels, loading } = useCareerLevels(position);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={loading ? 'Lade Stufen…' : (levels.length ? 'Stufe wählen' : 'Keine Stufen hinterlegt – bitte unter Einstellungen › SSM Karriereplan anlegen')} /></SelectTrigger>
      <SelectContent>
        {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
