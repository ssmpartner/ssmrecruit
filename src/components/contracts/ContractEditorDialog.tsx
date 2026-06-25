import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Download, FileDown, Save, History, Paperclip, Eye, Pencil, Trash2,
  ArrowUp, ArrowDown, Upload, FileText, Send, CheckCircle2, Archive, ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';
import { CONTRACT_STATUS_LABELS, PLACEHOLDER_GROUPS } from '@/lib/contract-placeholders';

interface Props {
  contractId: string;
  open: boolean;
  onClose: () => void;
}

type Attachment = {
  id: string;
  contract_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number;
  source: string | null;
};

type ChangeEntry = {
  id: string;
  field: string;
  old_value: any;
  new_value: any;
  changed_by_name: string | null;
  created_at: string;
};

const STATUS_ORDER = ['draft', 'in_review', 'finalized', 'sent', 'signed', 'archived'];

const STATUS_ICONS: Record<string, any> = {
  draft: Pencil, in_review: ListChecks, finalized: CheckCircle2,
  sent: Send, signed: CheckCircle2, archived: Archive,
};

export default function ContractEditorDialog({ contractId, open, onClose }: Props) {
  const [contract, setContract] = useState<any>(null);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [notes, setNotes] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [changeLog, setChangeLog] = useState<ChangeEntry[]>([]);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('edit');
  const [dirty, setDirty] = useState(false);

  async function load() {
    const [{ data: c }, { data: att }, { data: ver }, { data: log }] = await Promise.all([
      supabase.from('contracts').select('*').eq('id', contractId).maybeSingle(),
      supabase.from('contract_attachments').select('*').eq('contract_id', contractId).order('sort_order', { ascending: true }),
      supabase.from('contract_versions').select('*').eq('contract_id', contractId).order('version', { ascending: false }),
      supabase.from('contract_change_log').select('*').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(200),
    ]);
    setContract(c);
    setBody((c as any)?.body_html ?? '');
    setStatus((c as any)?.status ?? 'draft');
    setNotes((c as any)?.internal_notes ?? '');
    setOverrides(((c as any)?.placeholder_overrides as Record<string, string>) ?? {});
    setAttachments((att as Attachment[]) ?? []);
    setVersions(ver ?? []);
    setChangeLog((log as ChangeEntry[]) ?? []);
    setDirty(false);
  }

  useEffect(() => { if (contractId && open) load(); /* eslint-disable-next-line */ }, [contractId, open]);

  // Auto-snapshot before save
  async function snapshotCurrent() {
    if (!contract) return;
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from('contract_versions').insert({
      contract_id: contractId,
      version: contract.current_version ?? 1,
      body_html: contract.body_html,
      pdf_path: contract.pdf_path,
      snapshot: {
        status: contract.status,
        placeholder_overrides: contract.placeholder_overrides ?? {},
        internal_notes: contract.internal_notes ?? null,
      },
      created_by: user?.id,
    });
  }

  async function save(nextStatus?: string) {
    if (!contract) return;
    await snapshotCurrent();
    const newStatus = nextStatus ?? status;
    const { error } = await supabase.from('contracts').update({
      body_html: body,
      status: newStatus,
      internal_notes: notes,
      placeholder_overrides: overrides,
      current_version: (contract.current_version ?? 1) + 1,
    } as any).eq('id', contractId);
    if (error) { toast.error(error.message); return; }
    toast.success(nextStatus ? `Status: ${CONTRACT_STATUS_LABELS[newStatus]}` : 'Gespeichert');
    await load();
  }

  async function finalize() {
    setExporting(true);
    const { data, error } = await supabase.functions.invoke('finalize-contract', {
      body: { contract_id: contractId },
    });
    setExporting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Vertrag generiert (Word + PDF + Gesamt-PDF)');
    if ((data as any)?.merged_pdf_path) {
      const { data: s } = await supabase.storage.from('contracts').createSignedUrl((data as any).merged_pdf_path, 300);
      if (s?.signedUrl) window.open(s.signedUrl, '_blank');
    }
    await load();
  }

  async function openStored(path?: string | null) {
    if (!path) return;
    const { data } = await supabase.storage.from('contracts').createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  async function updateLetterheadMode(mode: string) {
    await supabase.from('contracts').update({ letterhead_mode: mode } as any).eq('id', contractId);
    toast.success('CI-Quelle aktualisiert');
    load();
  }

  async function uploadAttachment(file: File) {
    setUploading(true);
    const path = `contracts/${contractId}/attachments/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('contracts').upload(path, file, { upsert: false });
    if (error) { setUploading(false); toast.error(error.message); return; }
    const maxOrder = attachments.reduce((m, a) => Math.max(m, a.sort_order ?? 0), 0);
    const { error: insErr } = await supabase.from('contract_attachments').insert({
      contract_id: contractId, name: file.name, storage_path: path,
      mime_type: file.type, size_bytes: file.size, sort_order: maxOrder + 10, source: 'manual',
    } as any);
    setUploading(false);
    if (insErr) { toast.error(insErr.message); return; }
    toast.success('Anhang hinzugefügt');
    load();
  }

  async function deleteAttachment(a: Attachment) {
    await supabase.storage.from('contracts').remove([a.storage_path]);
    await supabase.from('contract_attachments').delete().eq('id', a.id);
    toast.success('Anhang entfernt');
    load();
  }

  async function moveAttachment(a: Attachment, dir: -1 | 1) {
    const idx = attachments.findIndex(x => x.id === a.id);
    const swap = attachments[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from('contract_attachments').update({ sort_order: swap.sort_order } as any).eq('id', a.id),
      supabase.from('contract_attachments').update({ sort_order: a.sort_order } as any).eq('id', swap.id),
    ]);
    load();
  }

  async function downloadAttachment(a: Attachment) {
    const { data } = await supabase.storage.from('contracts').createSignedUrl(a.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  async function restoreVersion(v: any) {
    if (!confirm(`Version ${v.version} wiederherstellen? Die aktuelle Version wird vorher gesichert.`)) return;
    await snapshotCurrent();
    const { error } = await supabase.from('contracts').update({
      body_html: v.body_html,
      current_version: (contract.current_version ?? 1) + 1,
    } as any).eq('id', contractId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Version ${v.version} wiederhergestellt`);
    load();
  }

  const previewHtml = useMemo(() => {
    // Apply manual overrides on top of stored body
    let out = body;
    for (const [k, v] of Object.entries(overrides)) {
      if (!v) continue;
      out = out.split(`{{${k}}}`).join(String(v));
    }
    return out;
  }, [body, overrides]);

  const visiblePlaceholders = useMemo(() => {
    const area = contract?.area as 'sales' | 'office' | undefined;
    const tg = contract?.target_group_code as string | undefined;
    return PLACEHOLDER_GROUPS.flatMap(g => g.placeholders.map(p => ({ ...p, group: g.label })))
      .filter(p => {
        if (p.areaScope && area && !p.areaScope.includes(area)) return false;
        if (p.targetGroups && tg && !p.targetGroups.includes(tg)) return false;
        return true;
      });
  }, [contract]);

  const StatusIcon = STATUS_ICONS[status] ?? Pencil;

  function setField<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); };
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Vertragseditor
            <Badge variant="outline" className="gap-1.5">
              <StatusIcon className="h-3 w-3" /> {CONTRACT_STATUS_LABELS[status] ?? status}
            </Badge>
            <Badge variant="secondary">v{contract?.current_version ?? 1}</Badge>
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground pt-1">
            <span className="rounded bg-muted px-1.5 py-0.5">Originalvorlage: unveränderlich</span>
            <span>→</span>
            <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5">Diese Instanz: bearbeitbar</span>
            <span>→</span>
            <span className="rounded bg-muted px-1.5 py-0.5">PDF: finale Ausgabe</span>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-y py-2">
          <Label className="text-xs">Status:</Label>
          <Select value={status} onValueChange={setField(setStatus)}>
            <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map(k => <SelectItem key={k} value={k}>{CONTRACT_STATUS_LABELS[k]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Separator orientation="vertical" className="h-6" />
          <Button size="sm" variant="outline" onClick={() => save('in_review')} className="gap-1.5">
            <ListChecks className="h-3.5 w-3.5" /> In Prüfung
          </Button>
          <Button size="sm" variant="outline" onClick={() => save('finalized')} className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Finalisieren
          </Button>
          <Button size="sm" variant="outline" onClick={() => save('sent')} className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Versendet
          </Button>
          <Button size="sm" variant="outline" onClick={() => save('signed')} className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Unterzeichnet
          </Button>
          <Button size="sm" variant="ghost" onClick={() => save('archived')} className="gap-1.5">
            <Archive className="h-3.5 w-3.5" /> Archivieren
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="edit" className="gap-1.5"><Pencil className="h-3.5 w-3.5" />Inhalt</TabsTrigger>
            <TabsTrigger value="fields" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Felder</TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5"><Paperclip className="h-3.5 w-3.5" />Anhänge ({attachments.length})</TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Vorschau</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />Verlauf ({changeLog.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-3">
            <div>
              <Label>Vertragsinhalt (HTML)</Label>
              <Textarea rows={20} value={body} onChange={e => setField(setBody)(e.target.value)} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground mt-1">
                Änderungen gelten nur für diese Vertragsinstanz. Die Originalvorlage bleibt unverändert.
              </p>
            </div>
            <div>
              <Label>Interne Notizen</Label>
              <Textarea rows={3} value={notes} onChange={e => setField(setNotes)(e.target.value)} placeholder="Nicht im PDF sichtbar" />
            </div>
          </TabsContent>

          <TabsContent value="fields" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Platzhalterwerte hier überschreiben (manuelle Korrektur). Leere Felder verwenden den automatischen Wert.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {visiblePlaceholders.map(p => (
                <div key={p.key}>
                  <Label className="text-xs">
                    {p.label}
                    <span className="text-muted-foreground ml-1">({p.group})</span>
                    {p.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Input
                    value={overrides[p.key] ?? ''}
                    onChange={e => setField(setOverrides)({ ...overrides, [p.key]: e.target.value })}
                    placeholder={`{{${p.key}}}`}
                    className="h-8"
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Reihenfolge bestimmt die PDF-Anhangsfolge.</p>
              <label className="inline-flex">
                <input type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.currentTarget.value = ''; }} />
                <Button size="sm" variant="outline" asChild disabled={uploading}>
                  <span className="cursor-pointer gap-1.5 inline-flex items-center">
                    <Upload className="h-3.5 w-3.5" /> {uploading ? 'Lädt…' : 'Anhang hinzufügen'}
                  </span>
                </Button>
              </label>
            </div>
            {attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Anhänge.</p>
            ) : (
              <ul className="space-y-1.5">
                {attachments.map((a, i) => (
                  <li key={a.id} className="flex items-center justify-between rounded border p-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground w-5">{i + 1}.</span>
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{a.name}</span>
                      {a.source && a.source !== 'manual' && <Badge variant="outline" className="text-[10px]">{a.source}</Badge>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => moveAttachment(a, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === attachments.length - 1} onClick={() => moveAttachment(a, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadAttachment(a)}><Download className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteAttachment(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="preview">
            <div className="rounded-lg border bg-background p-6 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-muted-foreground">Kein Inhalt</p>' }} />
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            <div>
              <h4 className="text-xs font-semibold mb-1.5">Versionen</h4>
              {versions.length === 0 ? <p className="text-xs text-muted-foreground">Noch keine Snapshots.</p> : (
                <ul className="space-y-1">
                  {versions.map(v => (
                    <li key={v.id} className="flex items-center justify-between rounded border p-2 text-xs">
                      <span>v{v.version} · {new Date(v.created_at).toLocaleString('de-CH')}</span>
                      <Button size="sm" variant="ghost" onClick={() => restoreVersion(v)}>Wiederherstellen</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Separator />
            <div>
              <h4 className="text-xs font-semibold mb-1.5">Änderungsprotokoll</h4>
              {changeLog.length === 0 ? <p className="text-xs text-muted-foreground">Keine Einträge.</p> : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {changeLog.map(e => (
                    <div key={e.id} className="rounded border p-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{e.field}</span>
                        <span className="text-muted-foreground">
                          {new Date(e.created_at).toLocaleString('de-CH')} · {e.changed_by_name ?? '–'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1 font-mono">
                        <div className="bg-destructive/5 p-1 rounded truncate">vorher: {fmt(e.old_value)}</div>
                        <div className="bg-primary/5 p-1 rounded truncate">nachher: {fmt(e.new_value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-lg border bg-muted/40 p-3 flex flex-wrap items-center gap-2 text-xs">
          <Label className="text-xs">CI-Quelle:</Label>
          <Select value={(contract?.letterhead_mode as string) ?? 'auto'} onValueChange={updateLetterheadMode}>
            <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatisch (Word wenn vorhanden, sonst PDF)</SelectItem>
              <SelectItem value="word">CI aus Word übernehmen (kein Overlay)</SelectItem>
              <SelectItem value="pdf">PDF-Briefpapier verwenden</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">
            Doppelte Kopf-/Fusszeilen werden im Word-Modus vermieden.
          </span>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {contract?.docx_path && (
            <Button variant="outline" onClick={() => openStored(contract.docx_path)} className="gap-2">
              <FileText className="h-4 w-4" />Word herunterladen
            </Button>
          )}
          {contract?.pdf_path && (
            <Button variant="outline" onClick={() => openStored(contract.pdf_path)} className="gap-2">
              <Download className="h-4 w-4" />PDF Hauptvertrag
            </Button>
          )}
          {contract?.merged_pdf_path && (
            <Button variant="outline" onClick={() => openStored(contract.merged_pdf_path)} className="gap-2">
              <Download className="h-4 w-4" />Gesamt-PDF (mit Anhängen)
            </Button>
          )}
          <Button variant="default" onClick={finalize} disabled={exporting} className="gap-2">
            <FileDown className="h-4 w-4" />{exporting ? 'Generiere…' : 'Final generieren (Word + PDF + Gesamt)'}
          </Button>
          <Button onClick={() => save()} className="gap-2" disabled={!dirty} variant="secondary">
            <Save className="h-4 w-4" />Entwurf speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fmt(v: any): string {
  if (v === null || v === undefined) return '–';
  if (typeof v === 'string') return v.length > 120 ? v.slice(0, 120) + '…' : v;
  try { const s = JSON.stringify(v); return s.length > 120 ? s.slice(0, 120) + '…' : s; } catch { return String(v); }
}
