import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, Edit, Eye, History, Plus, Trash2, Upload, Library, Info } from 'lucide-react';
import { useContractLookups, CONTRACT_LANGUAGES, ContractLang } from '@/hooks/useContractLookups';
import { useAuth } from '@/context/AuthContext';
import LibraryPreviewDialog from './LibraryPreviewDialog';

type DocStatus = 'draft' | 'active' | 'archived';
type DocType = 'contract' | 'attachment' | 'reference';
type Area = 'sales' | 'office' | '';

interface DocRow {
  id: string;
  name: string;
  doc_type: DocType;
  kind_code: string | null;
  category_code: string | null;
  target_group_code: string | null;
  area: Area | null;
  language: ContractLang;
  version: number;
  valid_from: string | null;
  valid_to: string | null;
  status: DocStatus;
  is_mandatory_attachment: boolean;
  is_optional_attachment: boolean;
  is_careerplan_relevant: boolean;
  is_leadership_relevant: boolean;
  original_storage_path: string | null;
  original_filename: string | null;
  template_storage_path: string | null;
  template_filename: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<DocStatus, string> = { draft: 'Entwurf', active: 'Aktiv', archived: 'Archiviert' };
const STATUS_VARIANTS: Record<DocStatus, 'secondary' | 'default' | 'outline'> = { draft: 'secondary', active: 'default', archived: 'outline' };
const DOC_TYPE_LABELS: Record<DocType, string> = { contract: 'Vertrag', attachment: 'Anhang', reference: 'Referenz' };

const emptyForm = (): Partial<DocRow> => ({
  name: '', doc_type: 'attachment', kind_code: null, category_code: null, target_group_code: null,
  area: null, language: 'de', version: 1, status: 'draft',
  is_mandatory_attachment: false, is_optional_attachment: false,
  is_careerplan_relevant: false, is_leadership_relevant: false,
  valid_from: null, valid_to: null, notes: '',
});

export default function ContractLibraryTab() {
  const { user } = useAuth();
  const { kinds, categories, targetGroups } = useContractLookups();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fKind, setFKind] = useState<string>('all');
  const [fTarget, setFTarget] = useState<string>('all');
  const [fArea, setFArea] = useState<string>('all');
  const [fLang, setFLang] = useState<string>('all');
  const [fStatus, setFStatus] = useState<string>('all');
  const [fVersion, setFVersion] = useState<string>('');
  const [fValidOn, setFValidOn] = useState<string>('');
  const [q, setQ] = useState('');

  // Dialog state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<DocRow>>(emptyForm());
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contract_documents')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) toast.error('Bibliothek laden fehlgeschlagen: ' + error.message);
    setRows((data as DocRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (fKind !== 'all' && r.kind_code !== fKind) return false;
    if (fTarget !== 'all' && r.target_group_code !== fTarget) return false;
    if (fArea !== 'all' && (r.area || '') !== fArea) return false;
    if (fLang !== 'all' && r.language !== fLang) return false;
    if (fStatus !== 'all' && r.status !== fStatus) return false;
    if (fVersion && String(r.version) !== fVersion) return false;
    if (fValidOn) {
      const d = fValidOn;
      if (r.valid_from && d < r.valid_from) return false;
      if (r.valid_to && d > r.valid_to) return false;
    }
    if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, fKind, fTarget, fArea, fLang, fStatus, fVersion, fValidOn, q]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOriginalFile(null);
    setTemplateFile(null);
    setOpen(true);
  };

  const openEdit = (r: DocRow) => {
    setEditingId(r.id);
    setForm({ ...r });
    setOriginalFile(null);
    setTemplateFile(null);
    setOpen(true);
  };

  const uploadToBucket = async (file: File, kind: 'original' | 'template', docId: string, version: number) => {
    const ext = file.name.split('.').pop() || 'bin';
    const ts = Date.now();
    const path = `library/${docId}/v${version}/${kind}_${ts}.${ext}`;
    const { error } = await supabase.storage.from('contracts').upload(path, file, { upsert: false });
    if (error) throw error;
    return { path, filename: file.name, mime: file.type, size: file.size };
  };

  const save = async () => {
    if (!form.name) { toast.error('Name erforderlich'); return; }
    setSaving(true);
    try {
      let id = editingId;
      let nextVersion = form.version || 1;

      if (id) {
        // Bestehender Eintrag → wenn neue Datei hochgeladen wird, Version erhöhen
        if (originalFile || templateFile) nextVersion = (form.version || 1) + 1;

        const updates: any = {
          name: form.name,
          doc_type: form.doc_type,
          kind_code: form.kind_code || null,
          category_code: form.category_code || null,
          target_group_code: form.target_group_code || null,
          area: form.area || null,
          language: form.language || 'de',
          status: form.status || 'draft',
          valid_from: form.valid_from || null,
          valid_to: form.valid_to || null,
          is_mandatory_attachment: !!form.is_mandatory_attachment,
          is_optional_attachment: !!form.is_optional_attachment,
          is_careerplan_relevant: !!form.is_careerplan_relevant,
          is_leadership_relevant: !!form.is_leadership_relevant,
          notes: form.notes || null,
          version: nextVersion,
          updated_by: user?.id || null,
        };

        if (originalFile) {
          const up = await uploadToBucket(originalFile, 'original', id, nextVersion);
          updates.original_storage_path = up.path;
          updates.original_filename = up.filename;
          updates.original_mime_type = up.mime;
          updates.original_size_bytes = up.size;
        }
        if (templateFile) {
          const up = await uploadToBucket(templateFile, 'template', id, nextVersion);
          updates.template_storage_path = up.path;
          updates.template_filename = up.filename;
          updates.template_mime_type = up.mime;
          updates.template_size_bytes = up.size;
        }

        const { error } = await supabase.from('contract_documents').update(updates).eq('id', id);
        if (error) throw error;

        // Versionshistorie schreiben, wenn neue Datei
        if (originalFile || templateFile) {
          await supabase.from('contract_document_versions').insert({
            document_id: id, version: nextVersion,
            snapshot: updates,
            original_storage_path: updates.original_storage_path || form.original_storage_path,
            template_storage_path: updates.template_storage_path || form.template_storage_path,
            created_by: user?.id || null,
          });
        }
      } else {
        // Neu anlegen
        const ins: any = {
          name: form.name,
          doc_type: form.doc_type || 'attachment',
          kind_code: form.kind_code || null,
          category_code: form.category_code || null,
          target_group_code: form.target_group_code || null,
          area: form.area || null,
          language: form.language || 'de',
          status: form.status || 'draft',
          version: 1,
          valid_from: form.valid_from || null,
          valid_to: form.valid_to || null,
          is_mandatory_attachment: !!form.is_mandatory_attachment,
          is_optional_attachment: !!form.is_optional_attachment,
          is_careerplan_relevant: !!form.is_careerplan_relevant,
          is_leadership_relevant: !!form.is_leadership_relevant,
          notes: form.notes || null,
          created_by: user?.id || null,
          updated_by: user?.id || null,
        };
        const { data: created, error } = await supabase
          .from('contract_documents').insert(ins).select('id').single();
        if (error) throw error;
        id = created!.id;

        const patch: any = {};
        if (originalFile) {
          const up = await uploadToBucket(originalFile, 'original', id!, 1);
          patch.original_storage_path = up.path;
          patch.original_filename = up.filename;
          patch.original_mime_type = up.mime;
          patch.original_size_bytes = up.size;
        }
        if (templateFile) {
          const up = await uploadToBucket(templateFile, 'template', id!, 1);
          patch.template_storage_path = up.path;
          patch.template_filename = up.filename;
          patch.template_mime_type = up.mime;
          patch.template_size_bytes = up.size;
        }
        if (Object.keys(patch).length) {
          await supabase.from('contract_documents').update(patch).eq('id', id!);
          await supabase.from('contract_document_versions').insert({
            document_id: id!, version: 1, snapshot: { ...ins, ...patch },
            original_storage_path: patch.original_storage_path || null,
            template_storage_path: patch.template_storage_path || null,
            created_by: user?.id || null,
          });
        }
      }

      toast.success('Dokument gespeichert');
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error('Speichern fehlgeschlagen: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: DocRow) => {
    if (!confirm(`„${r.name}" wirklich löschen? Die hochgeladenen Dateien bleiben im Speicher erhalten.`)) return;
    const { error } = await supabase.from('contract_documents').delete().eq('id', r.id);
    if (error) { toast.error('Löschen fehlgeschlagen: ' + error.message); return; }
    toast.success('Dokument gelöscht');
    load();
  };

  const downloadFile = async (path: string | null, filename: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from('contracts').createSignedUrl(path, 60);
    if (error || !data) { toast.error('Download fehlgeschlagen'); return; }
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = filename || 'dokument';
    a.target = '_blank';
    a.click();
  };

  const changeStatus = async (r: DocRow, status: DocStatus) => {
    if (status === r.status) return;
    setRows(prev => prev.map(x => x.id === r.id ? { ...x, status } : x));
    const { error } = await supabase.from('contract_documents')
      .update({ status, updated_by: user?.id || null })
      .eq('id', r.id);
    if (error) {
      toast.error('Status konnte nicht geändert werden: ' + error.message);
      setRows(prev => prev.map(x => x.id === r.id ? { ...x, status: r.status } : x));
    } else {
      toast.success(`Status auf „${STATUS_LABELS[status]}" gesetzt`);
    }
  };

  const labelOf = (list: { code: string; label_de: string }[], code: string | null) =>
    list.find(x => x.code === code)?.label_de || '–';

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <Input placeholder="Suchen…" value={q} onChange={e => setQ(e.target.value)} className="lg:col-span-2" />
            <Select value={fKind} onValueChange={setFKind}>
              <SelectTrigger><SelectValue placeholder="Vertragsart" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Arten</SelectItem>
                {kinds.map(k => <SelectItem key={k.code} value={k.code}>{k.label_de}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fTarget} onValueChange={setFTarget}>
              <SelectTrigger><SelectValue placeholder="Zielgruppe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Zielgruppen</SelectItem>
                {targetGroups.map(t => <SelectItem key={t.code} value={t.code}>{t.label_de}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fArea} onValueChange={setFArea}>
              <SelectTrigger><SelectValue placeholder="Bereich" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Bereiche</SelectItem>
                <SelectItem value="sales">Vertrieb</SelectItem>
                <SelectItem value="office">Innendienst</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fLang} onValueChange={setFLang}>
              <SelectTrigger><SelectValue placeholder="Sprache" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Sprachen</SelectItem>
                {CONTRACT_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="draft">Entwurf</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="archived">Archiviert</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Version" value={fVersion} onChange={e => setFVersion(e.target.value)} />
            <Input type="date" placeholder="Gültig am" value={fValidOn} onChange={e => setFValidOn(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Dokument hochladen</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Lade Bibliothek…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Library className="h-8 w-8 opacity-40" />
              Keine Dokumente gefunden.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Vertragsart</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Zielgruppe</TableHead>
                  <TableHead>Bereich</TableHead>
                  <TableHead>Sprache</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Gültigkeit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dateien</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.is_mandatory_attachment && <Badge variant="destructive" className="text-[10px]">Pflicht-Anhang</Badge>}
                        {r.is_optional_attachment  && <Badge variant="secondary" className="text-[10px]">Optional</Badge>}
                        {r.is_careerplan_relevant  && <Badge variant="outline" className="text-[10px]">Karriereplan</Badge>}
                        {r.is_leadership_relevant  && <Badge variant="outline" className="text-[10px]">Leadership</Badge>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{DOC_TYPE_LABELS[r.doc_type]}</Badge></TableCell>
                    <TableCell className="text-xs">{labelOf(kinds, r.kind_code)}</TableCell>
                    <TableCell className="text-xs">{labelOf(categories, r.category_code)}</TableCell>
                    <TableCell className="text-xs">{labelOf(targetGroups, r.target_group_code)}</TableCell>
                    <TableCell className="text-xs">{r.area === 'sales' ? 'Vertrieb' : r.area === 'office' ? 'Innendienst' : '–'}</TableCell>
                    <TableCell className="uppercase text-xs">{r.language}</TableCell>
                    <TableCell className="text-xs">v{r.version}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {r.valid_from || '–'} {r.valid_to ? `→ ${r.valid_to}` : ''}
                    </TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[r.status]}>{STATUS_LABELS[r.status]}</Badge></TableCell>
                    <TableCell className="text-xs space-y-1">
                      {r.original_storage_path && (
                        <Button size="sm" variant="ghost" className="h-6 px-1 gap-1" onClick={() => downloadFile(r.original_storage_path, r.original_filename)}>
                          <Download className="h-3 w-3" /> Original
                        </Button>
                      )}
                      {r.template_storage_path && (
                        <Button size="sm" variant="ghost" className="h-6 px-1 gap-1" onClick={() => downloadFile(r.template_storage_path, r.template_filename)}>
                          <Download className="h-3 w-3" /> Vorlage
                        </Button>
                      )}
                      {!r.original_storage_path && !r.template_storage_path && <span className="text-muted-foreground">Keine Datei</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? <><Edit className="h-4 w-4" /> Dokument bearbeiten</> : <><Upload className="h-4 w-4" /> Neues Dokument</>}
              {editingId && form.version ? <Badge variant="outline" className="ml-2"><History className="h-3 w-3 mr-1" /> v{form.version}</Badge> : null}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Dokumentname *</Label>
              <Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <Label>Dokumenttyp</Label>
              <Select value={form.doc_type || 'attachment'} onValueChange={(v: DocType) => setForm({ ...form, doc_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Vertrag</SelectItem>
                  <SelectItem value="attachment">Anhang</SelectItem>
                  <SelectItem value="reference">Referenz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vertragsart</Label>
              <Select value={form.kind_code || ''} onValueChange={v => setForm({ ...form, kind_code: v || null })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {kinds.map(k => <SelectItem key={k.code} value={k.code}>{k.label_de}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kategorie</Label>
              <Select value={form.category_code || ''} onValueChange={v => setForm({ ...form, category_code: v || null })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.code} value={c.code}>{c.label_de}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Zielgruppe</Label>
              <Select value={form.target_group_code || ''} onValueChange={v => setForm({ ...form, target_group_code: v || null })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {targetGroups.map(t => <SelectItem key={t.code} value={t.code}>{t.label_de}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Bereich</Label>
              <Select value={form.area || 'none'} onValueChange={v => setForm({ ...form, area: (v === 'none' ? null : v) as Area })}>
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
                <SelectContent>
                  {CONTRACT_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status || 'draft'} onValueChange={(v: DocStatus) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Entwurf</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="archived">Archiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Gültig ab</Label>
              <Input type="date" value={form.valid_from || ''} onChange={e => setForm({ ...form, valid_from: e.target.value || null })} />
            </div>
            <div>
              <Label>Gültig bis</Label>
              <Input type="date" value={form.valid_to || ''} onChange={e => setForm({ ...form, valid_to: e.target.value || null })} />
            </div>

            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
              <div className="flex items-center gap-2"><Switch checked={!!form.is_mandatory_attachment} onCheckedChange={c => setForm({ ...form, is_mandatory_attachment: c })} /><Label className="text-xs">Pflichtanhang</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.is_optional_attachment}  onCheckedChange={c => setForm({ ...form, is_optional_attachment:  c })} /><Label className="text-xs">Optionaler Anhang</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.is_careerplan_relevant}  onCheckedChange={c => setForm({ ...form, is_careerplan_relevant:  c })} /><Label className="text-xs">Karriereplan</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.is_leadership_relevant}  onCheckedChange={c => setForm({ ...form, is_leadership_relevant:  c })} /><Label className="text-xs">Leadership</Label></div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label className="text-xs">Originaldatei (PDF empfohlen)</Label>
                <Input type="file" accept=".pdf,.docx,.doc" onChange={e => setOriginalFile(e.target.files?.[0] || null)} />
                {form.original_filename && <div className="text-xs text-muted-foreground mt-1">Aktuell: {form.original_filename}</div>}
                <p className="text-[11px] text-muted-foreground mt-1">Originale werden nie überschrieben – neue Datei = neue Version.</p>
              </div>
              <div>
                <Label className="text-xs">Bearbeitbare Vorlage (.docx)</Label>
                <Input type="file" accept=".docx" onChange={e => setTemplateFile(e.target.files?.[0] || null)} />
                {form.template_filename && <div className="text-xs text-muted-foreground mt-1">Aktuell: {form.template_filename}</div>}
              </div>
            </div>

            <div className="md:col-span-2">
              <Label>Notizen</Label>
              <Textarea rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
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
