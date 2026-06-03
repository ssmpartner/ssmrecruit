import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, File, Download, Clock, Copy, Check, Loader2, Upload, AlertTriangle, RefreshCw, CheckCircle2, Trash2, Eye, X, ShieldCheck, CircleSlash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Pflichtdokumente für Arbeitsvertrag-Readiness (Single Source of Truth – synchron zu LeadHiringReadiness)
const REQUIRED_DOC_KEYS = ['id', 'bank', 'vbv', 'kk_card', 'fuehrerausweis', 'leadsliste', 'insight_r4'];
const REQUIRED_DOC_LABELS: Record<string, string> = {
  id: 'Ausweis',
  bank: 'Bankkarte',
  vbv: 'VBV-Ausweis',
  kk_card: 'Krankenkasse',
  fuehrerausweis: 'Führerausweis',
  leadsliste: 'Leadsliste',
  insight_r4: 'Insight R4',
};
const UPLOAD_TO_REQUIRED: Record<string, string> = {
  id: 'id', id_front: 'id', id_back: 'id',
  bank: 'bank', bank_front: 'bank', bank_back: 'bank',
  vbv: 'vbv',
  kk_card: 'kk_card',
  fuehrerausweis: 'fuehrerausweis',
  leadsliste: 'leadsliste',
  insight_r4: 'insight_r4',
};

interface Props {
  leadId: string;
}

interface DocumentRequest {
  id: string;
  token: string;
  status: string;
  sent_at: string;
  expires_at: string;
  kind?: 'application' | 'employment' | null;
}

interface DocumentUpload {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  request_id: string;
}

const documentTypeLabels: Record<string, string> = {
  cv: 'Lebenslauf',
  motivation_letter: 'Motivationsschreiben',
  certificate: 'Zertifikat',
  reference: 'Arbeitszeugnis',
  betreibungsauszug: 'Betreibungsauszug',
  strafregisterauszug: 'Strafregisterauszug',
  leadsliste: 'Leadsliste',
  insight_r4: 'Insight R4',
  // Arbeitsvertrag-Dokumente (zählen für Readiness — decken jeweils v/r ab)
  id: 'Ausweis (ID / Pass)',
  bank: 'Bankkarte / IBAN',
  vbv: 'VBV-Ausweis',
  kk_card: 'Krankenkassenkarte',
  fuehrerausweis: 'Führerausweis',
  other: 'Sonstiges',
};

export default function LeadDocumentsTab({ leadId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [docUploads, setDocUploads] = useState<DocumentUpload[]>([]);
  const [waivedKeys, setWaivedKeys] = useState<Set<string>>(new Set());
  const [copiedToken, setCopiedToken] = useState('');
  const [resending, setResending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<string>('cv');
  const [pendingDelete, setPendingDelete] = useState<DocumentUpload | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentUpload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: 'Datei zu gross', description: `${file.name}: max. 20 MB`, variant: 'destructive' });
          continue;
        }
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${leadId}/internal/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('lead-documents').upload(path, file, {
          contentType: file.type || 'application/octet-stream',
        });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from('document_uploads').insert({
          lead_id: leadId,
          file_name: file.name,
          file_type: uploadType,
          file_path: path,
          file_size: file.size,
        } as any);
        if (insErr) throw insErr;
        await supabase.from('activities').insert({
          id: crypto.randomUUID(), lead_id: leadId, type: 'note',
          description: `Dokument "${file.name}" intern hochgeladen (${documentTypeLabels[uploadType] || uploadType})`,
          user: 'System',
        });
      }
      toast({ title: '✅ Upload abgeschlossen', description: `${files.length} Datei(en)` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Upload fehlgeschlagen', description: err.message || 'Unbekannter Fehler', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) uploadFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  async function handleInternalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await uploadFiles(files);
  }


  useEffect(() => {
    loadData();
    const ch = supabase.channel(`docs-tab-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_uploads', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [leadId]);

  async function loadData() {
    const [docRes, uploadsRes, waiversRes] = await Promise.all([
      supabase.from('document_requests').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('document_uploads').select('*').eq('lead_id', leadId).order('uploaded_at', { ascending: false }),
      supabase.from('lead_document_waivers').select('doc_key').eq('lead_id', leadId),
    ]);
    if (docRes.data) setDocRequests(docRes.data as any[]);
    if (uploadsRes.data) setDocUploads(uploadsRes.data as any[]);
    if (waiversRes.data) setWaivedKeys(new Set((waiversRes.data as any[]).map(w => w.doc_key)));
    setLoading(false);
  }

  function getPublicUrl(token: string) {
    return `${window.location.origin}/document-upload?token=${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getPublicUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
    toast({ title: 'Kopiert!', description: 'Link in der Zwischenablage.' });
  }

  async function resendLink(kind: 'application' | 'employment' = 'application') {
    setResending(true);
    const { data, error } = await supabase
      .from('document_requests')
      .insert({ lead_id: leadId, sent_via: 'manual', kind } as any)
      .select()
      .single();

    if (error || !data) {
      toast({ title: 'Fehler', description: 'Link konnte nicht erstellt werden.', variant: 'destructive' });
      setResending(false);
      return;
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: kind === 'employment'
        ? 'Arbeitsvertrag-Dokumenten-Link erstellt (mit Personalstammdaten)'
        : 'Bewerbungs-Dokumenten-Link erstellt',
      user: 'System',
    });

    const url = `${window.location.origin}/document-upload?token=${(data as any).token}`;
    await navigator.clipboard.writeText(url);
    toast({
      title: kind === 'employment' ? '✅ Arbeitsvertrag-Link erstellt & kopiert' : '✅ Bewerbungs-Link erstellt & kopiert',
      description: 'Gültig für 48 Stunden.',
    });
    setResending(false);
    loadData();
  }

  async function downloadFile(filePath: string, fileName: string) {
    const { data, error } = await supabase.storage
      .from('lead-documents')
      .createSignedUrl(filePath, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: 'Download fehlgeschlagen', description: error?.message || 'Datei nicht verfügbar', variant: 'destructive' });
      return;
    }
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = fileName;
    a.target = '_blank';
    a.click();
  }

  async function previewFile(doc: DocumentUpload) {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewUrl(null);
    const { data, error } = await supabase.storage
      .from('lead-documents')
      .createSignedUrl(doc.file_path, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: 'Vorschau fehlgeschlagen', description: error?.message || 'Datei nicht verfügbar', variant: 'destructive' });
      setPreviewDoc(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewUrl(data.signedUrl);
    setPreviewLoading(false);
  }

  function closePreview() {
    setPreviewDoc(null);
    setPreviewUrl(null);
    setPreviewLoading(false);
  }

  function isPreviewable(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.pdf') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.webp') || lower.endsWith('.svg');
  }

  async function confirmDeleteFile() {
    const doc = pendingDelete;
    if (!doc) return;
    setDeleting(true);
    try {
      const { error: delStErr } = await supabase.storage.from('lead-documents').remove([doc.file_path]);
      if (delStErr && !/not found/i.test(delStErr.message)) throw delStErr;
      const { error: delDbErr } = await supabase.from('document_uploads').delete().eq('id', doc.id);
      if (delDbErr) throw delDbErr;
      await supabase.from('activities').insert({
        id: crypto.randomUUID(), lead_id: leadId, type: 'note',
        description: `Dokument "${doc.file_name}" gelöscht (${documentTypeLabels[doc.file_type] || doc.file_type})`,
        user: 'System',
      });
      toast({ title: '🗑️ Gelöscht', description: doc.file_name });
      setPendingDelete(null);
      loadData();
    } catch (err: any) {
      toast({ title: 'Löschen fehlgeschlagen', description: err.message || 'Unbekannter Fehler', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  async function updateDocType(doc: DocumentUpload, newType: string) {
    if (newType === doc.file_type) return;
    const oldLabel = documentTypeLabels[doc.file_type] || doc.file_type;
    const newLabel = documentTypeLabels[newType] || newType;
    const { error } = await supabase.from('document_uploads').update({ file_type: newType }).eq('id', doc.id);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: `Dokument "${doc.file_name}" neu klassifiziert: ${oldLabel} → ${newLabel}`,
      user: 'System',
    });
    toast({ title: '✅ Aktualisiert', description: newLabel });
    loadData();
  }

  function getRequestStatus(req: DocumentRequest): 'expired' | 'used' | 'pending' {
    const uploadsForRequest = docUploads.filter(u => u.request_id === req.id);
    if (uploadsForRequest.length > 0) return 'used';
    if (req.status === 'completed') return 'used';
    const now = new Date();
    const expires = new Date(req.expires_at);
    if (expires <= now) return 'expired';
    return 'pending';
  }

  function formatTimeLeft(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return 'Abgelaufen';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `Noch ${hours}h ${mins}m gültig`;
    return `Noch ${mins}m gültig`;
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const hasContent = docUploads.length > 0 || docRequests.length > 0;

  // Welche Pflicht-Slots sind durch einen Upload abgedeckt?
  const uploadedRequiredSlots = new Set<string>();
  docUploads.forEach(u => {
    const slot = UPLOAD_TO_REQUIRED[u.file_type];
    if (slot) uploadedRequiredSlots.add(slot);
  });
  const docResolvedCount = REQUIRED_DOC_KEYS.filter(k => uploadedRequiredSlots.has(k) || waivedKeys.has(k)).length;
  const docTotalCount = REQUIRED_DOC_KEYS.length;

  const requiredDocsPanel = (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h5 className="text-sm font-semibold">Pflichtdokumente (Arbeitsvertrag)</h5>
        </div>
        <span className={`text-xs font-semibold ${docResolvedCount === docTotalCount ? 'text-emerald-600' : 'text-amber-600'}`}>
          {docResolvedCount}/{docTotalCount} erledigt
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Verzicht («Hat er nicht») wird in der Einstellungs-Readiness gesetzt.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {REQUIRED_DOC_KEYS.map(k => {
          const uploaded = uploadedRequiredSlots.has(k);
          const waived = waivedKeys.has(k);
          const label = REQUIRED_DOC_LABELS[k];
          if (uploaded) {
            return (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> {label}
              </span>
            );
          }
          if (waived) {
            return (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground line-through">
                <CircleSlash className="h-3.5 w-3.5" /> {label}
              </span>
            );
          }
          return (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" /> {label} fehlt
            </span>
          );
        })}
      </div>
    </div>
  );

  const uploadBar = (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`rounded-xl border-2 border-dashed p-6 transition-colors ${
        isDragging ? 'border-primary bg-primary/15 ring-2 ring-primary/40' : 'border-primary/30 bg-primary/5'
      }`}
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div className={`rounded-full bg-primary/10 p-3 ${isDragging ? 'animate-bounce' : ''}`}>
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="text-base font-semibold text-primary">
            {isDragging ? 'Dateien hier ablegen…' : 'Dokumente hochladen'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Dateien per Drag & Drop hierher ziehen oder unten auswählen · max. 20 MB pro Datei
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          <select
            value={uploadType}
            onChange={e => setUploadType(e.target.value)}
            disabled={uploading}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            {Object.entries(documentTypeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <label className={`inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Datei(en) wählen
            <input type="file" multiple className="hidden" disabled={uploading} onChange={handleInternalUpload} />
          </label>
        </div>
      </div>
    </div>
  );

  const linkGenerator = (
    <div className="space-y-2">
      <h5 className="text-sm font-semibold text-muted-foreground">Upload-Link generieren</h5>
      <div className="grid sm:grid-cols-2 gap-2">
        <button
          onClick={() => resendLink('application')}
          disabled={resending}
          className="flex items-start gap-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-left hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin mt-0.5 text-primary shrink-0" /> : <RefreshCw className="h-4 w-4 mt-0.5 text-primary shrink-0" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-primary">Bewerbungs-Link</div>
            <div className="text-[11px] text-muted-foreground">Lebenslauf, Arbeitszeugnis, Betreibungs- & Strafregisterauszug (+ optional Motivation)</div>
          </div>
        </button>
        <button
          onClick={() => resendLink('employment')}
          disabled={resending}
          className="flex items-start gap-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-left hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin mt-0.5 text-primary shrink-0" /> : <Upload className="h-4 w-4 mt-0.5 text-primary shrink-0" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-primary">Arbeitsvertrag-Link</div>
            <div className="text-[11px] text-muted-foreground">Personalstammdaten + ID, Bankkarte, VBV, KK-Karte, Führerausweis (+ Ausländerbewilligung)</div>
          </div>
        </button>
      </div>
    </div>
  );



  if (!hasContent) {
    return (
      <div className="space-y-4">
        {uploadBar}
        {linkGenerator}
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Noch keine Dokumente vorhanden</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Direkt oben hochladen oder einen Upload-Link an den Lead senden.</p>
        </div>
      </div>
    );
  }

  // Check if there's any active (non-expired, non-used) link
  const hasActiveLink = docRequests.some(r => getRequestStatus(r) === 'pending');
  const hasExpiredOrUsedAll = docRequests.length > 0 && !hasActiveLink;

  return (
    <>
    <div className="space-y-4">
      {uploadBar}
      {linkGenerator}
      {/* Uploaded Documents */}
      {docUploads.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h5 className="text-sm font-semibold">Hochgeladene Dokumente ({docUploads.length})</h5>
          </div>
          {docUploads.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 rounded-lg bg-muted/30 border p-3">
              <File className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <select
                    value={documentTypeLabels[doc.file_type] ? doc.file_type : 'other'}
                    onChange={e => updateDocType(doc, e.target.value)}
                    className="h-6 rounded border bg-background px-1.5 text-[11px] font-medium text-primary focus:ring-1 focus:ring-ring"
                    title="Dokumenttyp ändern"
                  >
                    {Object.entries(documentTypeLabels).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">
                    {(doc.file_size / 1024).toFixed(0)} KB • {new Date(doc.uploaded_at).toLocaleDateString('de-CH')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isPreviewable(doc.file_name) && (
                  <button onClick={() => previewFile(doc)}
                    className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                    <Eye className="h-3.5 w-3.5" /> Ansehen
                  </button>
                )}
                <button onClick={() => downloadFile(doc.file_path, doc.file_name)}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button onClick={() => setPendingDelete(doc)}
                  title="Löschen"
                  className="inline-flex items-center justify-center rounded-md border border-destructive/30 bg-background px-2 py-1.5 text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Request Links */}
      {docRequests.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-muted-foreground">Upload-Links</h5>
          {docRequests.map(req => {
            const status = getRequestStatus(req);
            return (
              <div key={req.id} className={`flex items-center justify-between rounded-lg border p-3 ${
                status === 'expired' ? 'bg-destructive/5 border-destructive/20' :
                status === 'used' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' :
                'bg-card'
              }`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {status === 'expired' ? (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  ) : status === 'used' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">
                        {new Date(req.sent_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {req.kind === 'employment' ? 'Arbeitsvertrag' : 'Bewerbung'}
                      </Badge>
                      {status === 'expired' ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Abgelaufen</Badge>
                      ) : status === 'used' ? (
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-600 border-0">
                          Benutzt ({docUploads.filter(u => u.request_id === req.id).length} Datei(en))
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Ausstehend</Badge>
                      )}
                    </div>
                    {status === 'pending' && req.expires_at && (
                      <p className="text-[11px] text-muted-foreground">{formatTimeLeft(req.expires_at)}</p>
                    )}
                    {status === 'expired' && (
                      <p className="text-[11px] text-destructive/70">Keine Dokumente hochgeladen</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {status === 'pending' && (
                    <button onClick={() => copyLink(req.token)}
                      className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors">
                      {copiedToken === req.token ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                      {copiedToken === req.token ? 'Kopiert' : 'Link'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && !deleting && setPendingDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie die Datei <strong>{pendingDelete?.file_name}</strong> wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={(e) => { e.preventDefault(); confirmDeleteFile(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={!!previewDoc} onOpenChange={(o) => !o && closePreview()}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base truncate">{previewDoc?.file_name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4 bg-muted/30 flex items-center justify-center">
          {previewLoading && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
          {!previewLoading && previewUrl && previewDoc && (
            previewDoc.file_name.toLowerCase().endsWith('.pdf') ? (
              <iframe src={previewUrl} className="w-full h-full rounded border bg-white" title={previewDoc.file_name} />
            ) : (
              <img src={previewUrl} alt={previewDoc.file_name} className="max-w-full max-h-full rounded shadow-lg object-contain" />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
