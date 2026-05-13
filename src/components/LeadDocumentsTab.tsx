import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, File, Download, Clock, Copy, Check, Loader2, Upload, AlertTriangle, RefreshCw, CheckCircle2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Props {
  leadId: string;
}

interface DocumentRequest {
  id: string;
  token: string;
  status: string;
  sent_at: string;
  expires_at: string;
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
  certificate: 'Zertifikat',
  reference: 'Arbeitszeugnis',
  id: 'Ausweis',
  betreibungsauszug: 'Betreibungsauszug',
  strafregisterauszug: 'Strafregisterauszug',
  leadsliste: 'Leadsliste',
  other: 'Sonstiges',
};

export default function LeadDocumentsTab({ leadId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [docUploads, setDocUploads] = useState<DocumentUpload[]>([]);
  const [copiedToken, setCopiedToken] = useState('');
  const [resending, setResending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<string>('cv');

  async function handleInternalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
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

  useEffect(() => {
    loadData();
    const ch = supabase.channel(`docs-tab-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_uploads', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [leadId]);

  async function loadData() {
    const [docRes, uploadsRes] = await Promise.all([
      supabase.from('document_requests').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('document_uploads').select('*').eq('lead_id', leadId).order('uploaded_at', { ascending: false }),
    ]);
    if (docRes.data) setDocRequests(docRes.data as any[]);
    if (uploadsRes.data) setDocUploads(uploadsRes.data as any[]);
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

  async function resendLink() {
    setResending(true);
    const { data, error } = await supabase
      .from('document_requests')
      .insert({ lead_id: leadId, sent_via: 'manual' })
      .select()
      .single();

    if (error || !data) {
      toast({ title: 'Fehler', description: 'Link konnte nicht erstellt werden.', variant: 'destructive' });
      setResending(false);
      return;
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: 'Neuer Dokumenten-Upload-Link erstellt (erneut gesendet)', user: 'System',
    });

    const url = `${window.location.origin}/document-upload?token=${(data as any).token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: '✅ Neuer Link erstellt & kopiert', description: 'Gültig für 48 Stunden.' });
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

  async function deleteFile(doc: DocumentUpload) {
    if (!confirm(`Datei "${doc.file_name}" wirklich löschen?`)) return;
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
      loadData();
    } catch (err: any) {
      toast({ title: 'Löschen fehlgeschlagen', description: err.message || 'Unbekannter Fehler', variant: 'destructive' });
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

  const uploadBar = (
    <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3 flex flex-wrap items-center gap-2">
      <Upload className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-primary">Intern hochladen:</span>
      <select
        value={uploadType}
        onChange={e => setUploadType(e.target.value)}
        disabled={uploading}
        className="h-8 rounded-md border bg-background px-2 text-xs"
      >
        {Object.entries(documentTypeLabels).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <label className={`inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Datei(en) wählen
        <input type="file" multiple className="hidden" disabled={uploading} onChange={handleInternalUpload} />
      </label>
      <span className="text-[11px] text-muted-foreground ml-auto">Max. 20 MB pro Datei</span>
    </div>
  );

  if (!hasContent) {
    return (
      <div className="space-y-4">
        {uploadBar}
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
    <div className="space-y-4">
      {uploadBar}
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
                <button onClick={() => downloadFile(doc.file_path, doc.file_name)}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button onClick={() => deleteFile(doc)}
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {new Date(req.sent_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
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

      {/* Resend button when all links expired or used */}
      {hasExpiredOrUsedAll && (
        <button
          onClick={resendLink}
          disabled={resending}
          className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Neuen Upload-Link senden
        </button>
      )}
    </div>
  );
}
