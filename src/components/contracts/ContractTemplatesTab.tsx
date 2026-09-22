import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Archive, CheckCircle2, Upload, FileText, Eye, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AREA_LABELS, CONTRACT_LANGUAGES, TEMPLATE_STATUS_LABELS,
  extractUsedPlaceholders, placeholderLabel, renderSample,
} from '@/lib/contract-placeholders';
import ContractRichEditor from './ContractRichEditor';

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

type Letterhead = {
  id: string;
  name: string;
  storage_path: string;
  language: string | null;
  is_default_for_language: boolean;
  is_active: boolean;
};

const empty: Partial<Template> = {
  title: '', contract_type: 'Arbeitsvertrag', area: 'sales',
  position: '', level: '', language: 'de',
  careerplan_linked: false, careerplan_level: null, status: 'draft', body_html: '',
};

interface Props {
  editTemplateId?: string | null;
  onEditHandled?: () => void;
}

export default function ContractTemplatesTab({ editTemplateId, onEditHandled }: Props) {
  const [rows, setRows] = useState<Template[]>([]);
  const [letterheads, setLetterheads] = useState<Letterhead[]>([]);
  const [letterheadId, setLetterheadId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Template>>(empty);
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState('edit');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  async function importDocx(file: File) {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Bitte eine Word-Datei (.docx) hochladen');
      return;
    }
    setImporting(true);
    try {
      const path = `template-imports/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('contracts').upload(path, file, { upsert: false });
      if (upErr) throw new Error(upErr.message);

      const { data, error } = await supabase.functions.invoke('docx-to-html', { body: { path } });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const html = (data as any)?.html;
      if (!html) throw new Error('Keine Textausgabe erhalten');

      setEdit({ ...empty, title: file.name.replace(/\.docx$/i, ''), body_html: html });
      setTab('edit');
      setOpen(true);
      toast.success('Vertrag übernommen – jetzt Platzhalter einsetzen');
    } catch (e: any) {
      toast.error(e?.message || 'Import fehlgeschlagen');
    } finally {
      setImporting(false);
    }
  }

  const area = (edit.area || 'sales') as 'sales' | 'office';

  const usedPlaceholders = useMemo(
    () => (edit.body_html ? extractUsedPlaceholders(edit.body_html) : []),
    [edit.body_html],
  );

  async function load() {
    setLoading(true);
    const [{ data, error }, { data: lh }] = await Promise.all([
      supabase.from('contract_templates').select('*').order('updated_at', { ascending: false }),
      supabase.from('contract_letterhead').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    ]);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Template[]);
    const list = (lh ?? []) as Letterhead[];
    setLetterheads(list);
    setLetterheadId(prev => prev || list.find(l => l.is_default_for_language)?.id || list[0]?.id || '');
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!editTemplateId) return;
    const t = rows.find(r => r.id === editTemplateId);
    if (t) { setEdit({ ...t }); setTab('edit'); setOpen(true); }
    else {
      supabase.from('contract_templates').select('*').eq('id', editTemplateId).single()
        .then(({ data }) => { if (data) { setEdit({ ...(data as Template) }); setTab('edit'); setOpen(true); } });
    }
    onEditHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTemplateId]);

  function openNew() { setEdit({ ...empty }); setTab('edit'); setOpen(true); }
  function openEdit(t: Template) { setEdit({ ...t }); setTab('edit'); setOpen(true); }

  const previewHtml = useMemo(
    () => (edit.body_html ? renderSample(edit.body_html) : ''),
    [edit.body_html],
  );

  const activeLetterhead = letterheads.find(l => l.id === letterheadId);

  async function buildPdf() {
    if (!edit.body_html) { toast.error('Noch kein Inhalt vorhanden'); return; }
    setPdfBusy(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default as any;
      const container = document.createElement('div');
      container.style.width = '210mm';
      container.style.padding = '20mm';
      container.style.background = '#fff';
      container.style.color = '#111';
      container.style.fontFamily = "Georgia, 'Times New Roman', serif";
      container.style.fontSize = '11pt';
      container.innerHTML = previewHtml;
      document.body.appendChild(container);
      const blob: Blob = await html2pdf()
        .set({
          margin: 0,
          filename: `${edit.title || 'Vorlage'}.pdf`,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(container)
        .outputPdf('blob');
      document.body.removeChild(container);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      toast.error(e?.message || 'PDF-Vorschau fehlgeschlagen');
    } finally {
      setPdfBusy(false);
    }
  }

  useEffect(() => {
    if (tab === 'pdf' && !pdfUrl && edit.body_html) buildPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Bei Inhaltsänderung alte PDF-Vorschau verwerfen
  useEffect(() => {
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit.body_html]);

  async function openLetterhead() {
    if (!activeLetterhead) return;
    const { data } = await supabase.storage.from('contracts').createSignedUrl(activeLetterhead.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  async function save(close = true, goToTab?: string) {
    if (!edit.title) { toast.error('Bitte einen Titel vergeben'); return; }
    const user = (await supabase.auth.getUser()).data.user;
    const payload = {
      title: edit.title, contract_type: edit.contract_type || 'Arbeitsvertrag',
      area: edit.area || 'sales', position: edit.position || null, level: edit.level || null,
      language: edit.language || 'de',
      careerplan_linked: (edit.area || 'sales') === 'sales',
      careerplan_level: edit.careerplan_level || null,
      status: edit.status || 'draft', body_html: edit.body_html || '',
      updated_by: user?.id,
    };

    if (edit.id) {
      const old = rows.find(r => r.id === edit.id);
      if (old) {
        await supabase.from('contract_template_versions').insert({
          template_id: edit.id, version: old.version,
          title: old.title, body_html: old.body_html,
          snapshot: old as any, created_by: user?.id,
        });
      }
      const { data, error } = await supabase
        .from('contract_templates')
        .update({ ...payload, version: (old?.version ?? 1) + 1 })
        .eq('id', edit.id)
        .select('*')
        .maybeSingle();
      if (error) { toast.error(error.message); return; }
      if (!data) { toast.error('Keine Berechtigung zum Speichern dieser Vorlage'); return; }
      setEdit({ ...(data as Template) });
    } else {
      const { data, error } = await supabase
        .from('contract_templates')
        .insert({ ...payload, created_by: user?.id })
        .select('*')
        .single();
      if (error) { toast.error(error.message); return; }
      setEdit({ ...(data as Template) });
    }
    toast.success('Gespeichert');
    await load();
    if (close) setOpen(false);
    else if (goToTab) { setTab(goToTab); if (goToTab === 'pdf') buildPdf(); }
  }

  async function changeStatus(id: string, status: Template['status']) {
    const { error } = await supabase.from('contract_templates').update({ status }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Status aktualisiert'); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Vorlage hochladen oder neu schreiben, Platzhalter einsetzen und aktivieren. Nur aktive Vorlagen werden für neue Verträge verwendet.
        </p>
        <div className="flex items-center gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept=".docx"
              hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) importDocx(f); e.currentTarget.value = ''; }}
            />
            <Button variant="outline" asChild disabled={importing}>
              <span className="cursor-pointer gap-2 inline-flex items-center">
                <Upload className="h-4 w-4" />{importing ? 'Übernehme…' : 'Vorlage hochladen (.docx)'}
              </span>
            </Button>
          </label>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Neue Vorlage</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Bereich</TableHead>
              <TableHead>Sprache</TableHead>
              <TableHead>Platzhalter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Lädt…</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Noch keine Vorlagen.</TableCell></TableRow>}
            {rows.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-muted-foreground" />{t.title}</div>
                </TableCell>
                <TableCell><Badge variant={t.area === 'sales' ? 'default' : 'secondary'}>{AREA_LABELS[t.area]}</Badge></TableCell>
                <TableCell className="uppercase text-xs">{t.language}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {extractUsedPlaceholders(t.body_html || '').length || '–'}
                </TableCell>
                <TableCell>
                  <Badge variant={t.status === 'active' ? 'default' : 'outline'}>{TEMPLATE_STATUS_LABELS[t.status]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Bearbeiten"><Pencil className="h-3.5 w-3.5" /></Button>
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
        <DialogContent className="max-w-[1200px] w-[95vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit.id ? `Vorlage bearbeiten (Version ${edit.version})` : 'Neue Vorlage'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="col-span-2">
              <Label>Titel *</Label>
              <Input value={edit.title || ''} onChange={e => setEdit({ ...edit, title: e.target.value })} />
            </div>
            <div>
              <Label>Vertragsart</Label>
              <Input value={edit.contract_type || ''} onChange={e => setEdit({ ...edit, contract_type: e.target.value })} />
            </div>
            <div>
              <Label>Bereich</Label>
              <Select value={edit.area} onValueChange={(v: any) => setEdit({ ...edit, area: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Vertrieb</SelectItem>
                  <SelectItem value="office">Innendienst</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="col-span-2">
              <Label>Briefpapier</Label>
              <Select value={letterheadId} onValueChange={setLetterheadId}>
                <SelectTrigger>
                  <SelectValue placeholder={letterheads.length ? 'Briefpapier wählen' : 'Noch kein Briefpapier hochgeladen'} />
                </SelectTrigger>
                <SelectContent>
                  {letterheads.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}{l.is_default_for_language ? ' (Standard)' : ''}
                    </SelectItem>
                  ))}
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
          </div>

          <Tabs value={tab} onValueChange={setTab} className="mt-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <TabsList>
                <TabsTrigger value="edit" className="gap-1.5"><Pencil className="h-3.5 w-3.5" />Bearbeiten</TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Vorschau</TabsTrigger>
                <TabsTrigger value="pdf" className="gap-1.5"><FileDown className="h-3.5 w-3.5" />PDF-Vorschau</TabsTrigger>
              </TabsList>
              {activeLetterhead && (
                <Button type="button" variant="ghost" size="sm" onClick={openLetterhead} className="gap-1.5 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />Briefpapier ansehen
                </Button>
              )}
            </div>

            <TabsContent value="edit" className="mt-3 space-y-3">
              <ContractRichEditor
                value={edit.body_html || ''}
                onChange={html => setEdit(prev => ({ ...prev, body_html: html }))}
                area={area}
              />
              <div className="rounded-lg border p-3 text-xs space-y-2">
                <div className="font-medium text-sm">Platzhalter in dieser Vorlage</div>
                {usedPlaceholders.length === 0 ? (
                  <p className="text-muted-foreground">Noch keine Platzhalter gesetzt.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {usedPlaceholders.map(k => (
                      <Badge key={k} variant="secondary" className="text-[10px]">{placeholderLabel(k)}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-3">
              <div className="rounded-lg border bg-muted/30 p-6 max-h-[70vh] overflow-y-auto">
                <div className="mx-auto bg-white shadow-sm" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}>
                  {previewHtml ? (
                    <div
                      className="contract-page prose prose-sm max-w-none [&_table]:border-collapse [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:p-1.5"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Vorschau erscheint, sobald Inhalt vorhanden ist.</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Die Vorschau zeigt Beispielwerte. Beim Erstellen eines Vertrags werden die echten Daten eingesetzt.
              </p>
            </TabsContent>

            <TabsContent value="pdf" className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={buildPdf} disabled={pdfBusy} className="gap-1.5">
                  {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  PDF neu erzeugen
                </Button>
                {activeLetterhead && (
                  <span className="text-xs text-muted-foreground">Briefpapier «{activeLetterhead.name}» wird beim finalen Vertrag hinterlegt.</span>
                )}
              </div>
              <div className="rounded-lg border overflow-hidden bg-muted/30" style={{ height: '70vh' }}>
                {pdfUrl ? (
                  <iframe src={pdfUrl} title="PDF-Vorschau" className="w-full h-full" />
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    {pdfBusy ? 'PDF wird erzeugt…' : 'Noch keine PDF-Vorschau.'}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button variant="secondary" onClick={() => save(false, 'preview')}>Speichern & Vorschau</Button>
            <Button onClick={() => save(true)}>Speichern & schliessen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
