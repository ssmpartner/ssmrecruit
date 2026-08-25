import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Plus, Pencil, Archive, CheckCircle2, AlertTriangle, Library, CircleCheck, CircleDashed } from 'lucide-react';
import { toast } from 'sonner';
import {
  AREA_LABELS, CONTRACT_LANGUAGES, TEMPLATE_STATUS_LABELS,
  PLACEHOLDER_GROUPS, ALL_PLACEHOLDERS, extractUsedPlaceholders, findDisallowedPlaceholders,
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
  source_document_id: string | null;
  updated_at: string;
};

const empty: Partial<Template> = {
  title: '', contract_type: 'Arbeitsvertrag', area: 'sales',
  position: '', level: '', language: 'de',
  careerplan_linked: false, careerplan_level: null, status: 'draft', body_html: '',
};

interface Props {
  /** Wenn gesetzt, wird der Editor fuer diese Vorlage geoeffnet (z.B. nach DOCX-Konvertierung). */
  editTemplateId?: string | null;
  onEditHandled?: () => void;
}

export default function ContractTemplatesTab({ editTemplateId, onEditHandled }: Props) {
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Template>>(empty);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertAtCursor(token: string) {
    const ta = bodyRef.current;
    const current = edit.body_html || '';
    if (!ta) { setEdit({ ...edit, body_html: current + token }); return; }
    const start = ta.selectionStart ?? current.length;
    const endPos = ta.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(endPos);
    setEdit({ ...edit, body_html: next });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  const area = (edit.area || 'sales') as 'sales' | 'office';

  const disallowed = edit.body_html ? findDisallowedPlaceholders(edit.body_html, area) : [];

  // Im Body vorkommende Platzhalter
  const usedPlaceholders = useMemo(
    () => (edit.body_html ? extractUsedPlaceholders(edit.body_html) : []),
    [edit.body_html],
  );

  // Pflichtplatzhalter, die in der Vorlage noch fehlen
  const missingRequired = useMemo(() => {
    const used = new Set(usedPlaceholders);
    return ALL_PLACEHOLDERS.filter(p => {
      if (!p.required) return false;
      if (used.has(p.key)) return false;
      if (p.areaScope && !p.areaScope.includes(area)) return false;
      return true;
    });
  }, [usedPlaceholders, area]);

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

  // Extern geoeffnete Vorlage (nach Konvertierung aus der Bibliothek)
  useEffect(() => {
    if (!editTemplateId) return;
    const t = rows.find(r => r.id === editTemplateId);
    if (t) { setEdit({ ...t }); setOpen(true); }
    else {
      // Zeile evtl. noch nicht geladen → gezielt nachladen
      supabase.from('contract_templates').select('*').eq('id', editTemplateId).single()
        .then(({ data }) => { if (data) { setEdit({ ...(data as Template) }); setOpen(true); } });
    }
    onEditHandled?.();
  }, [editTemplateId]);

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
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    {t.title}
                    {t.source_document_id && (
                      <Badge variant="outline" className="gap-1 text-[10px]" title="Aus einem Bibliotheksdokument konvertiert">
                        <Library className="h-3 w-3" /> Bibliothek
                      </Badge>
                    )}
                  </div>
                </TableCell>
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
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit.id ? `Vorlage bearbeiten (v${edit.version})` : 'Neue Vorlage'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          </div>

          {/* Editor + Live-Vorschau */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Vertragsinhalt (HTML)</Label>
                <PlaceholderPicker area={area} onInsert={insertAtCursor} />
              </div>
              <Textarea
                ref={bodyRef}
                rows={22} className="font-mono text-xs"
                value={edit.body_html || ''}
                onChange={e => setEdit({ ...edit, body_html: e.target.value })}
              />

              {/* Platzhalter-Status */}
              <div className="rounded-lg border p-3 space-y-2 text-xs">
                <div className="font-medium text-sm">Platzhalter in dieser Vorlage</div>
                {usedPlaceholders.length === 0 ? (
                  <p className="text-muted-foreground">Noch keine Platzhalter vorhanden.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {usedPlaceholders.map(k => (
                      <Badge key={k} variant="secondary" className="font-mono text-[10px]">{`{{${k}}}`}</Badge>
                    ))}
                  </div>
                )}
                <div className="border-t pt-2">
                  {missingRequired.length === 0 ? (
                    <p className="flex items-center gap-1.5 text-emerald-700">
                      <CircleCheck className="h-3.5 w-3.5" /> Alle Pflichtplatzhalter sind vorhanden.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-amber-700 font-medium">
                        <CircleDashed className="h-3.5 w-3.5" /> Fehlende Pflichtplatzhalter:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {missingRequired.map(p => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => insertAtCursor(`{{${p.key}}}`)}
                            className="px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900 font-mono text-[10px] hover:bg-amber-100 transition"
                            title={`${p.label} – Klicken zum Einfügen`}
                          >
                            {`{{${p.key}}}`} – {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {disallowed.length > 0 && (
                <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 text-amber-900 px-2 py-1.5 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                  <div>
                    Nicht erlaubte Platzhalter für diesen Bereich:{' '}
                    {disallowed.map(k => <code key={k} className="mx-0.5">{`{{${k}}}`}</code>)}
                    <div className="opacity-70">Werden beim Generieren automatisch entfernt.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Live-Vorschau</Label>
              <div className="rounded-lg border bg-white dark:bg-muted/30 min-h-[520px] max-h-[70vh] overflow-y-auto p-6">
                {edit.body_html ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-1.5 [&_th]:border [&_th]:border-border [&_th]:p-1.5"
                    dangerouslySetInnerHTML={{ __html: edit.body_html }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Vorschau erscheint, sobald Inhalt vorhanden ist.</p>
                )}
              </div>
            </div>
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Alle verfügbaren Platzhalter</summary>
            <div className="mt-2 space-y-2">
              {PLACEHOLDER_GROUPS.map(g => (
                <div key={g.id}>
                  <div className="font-medium text-foreground/80">{g.label}</div>
                  <div className="grid grid-cols-3 gap-1">
                    {g.placeholders.map(p => (
                      <code key={p.key} className="px-1" title={p.label}>{`{{${p.key}}}`}</code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>

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
