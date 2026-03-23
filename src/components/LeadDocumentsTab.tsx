import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, File, Download, Clock, Copy, Check, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  leadId: string;
}

interface DocumentRequest {
  id: string;
  token: string;
  status: string;
  sent_at: string;
}

interface DocumentUpload {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

const documentTypeLabels: Record<string, string> = {
  cv: 'Lebenslauf',
  certificate: 'Zertifikat',
  reference: 'Arbeitszeugnis',
  id: 'Ausweis',
  other: 'Sonstiges',
};

export default function LeadDocumentsTab({ leadId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [docUploads, setDocUploads] = useState<DocumentUpload[]>([]);
  const [copiedToken, setCopiedToken] = useState('');

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

  async function downloadFile(filePath: string, fileName: string) {
    const { data } = supabase.storage.from('lead-documents').getPublicUrl(filePath);
    if (data?.publicUrl) {
      const a = document.createElement('a');
      a.href = data.publicUrl;
      a.download = fileName;
      a.target = '_blank';
      a.click();
    }
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const pendingRequests = docRequests.filter(r => r.status !== 'completed');
  const hasContent = docUploads.length > 0 || pendingRequests.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Noch keine Dokumente vorhanden</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Senden Sie einen Dokumenten-Upload-Link über das Aktionspanel links.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  {documentTypeLabels[doc.file_type] || doc.file_type} • {(doc.file_size / 1024).toFixed(0)} KB • {new Date(doc.uploaded_at).toLocaleDateString('de-CH')}
                </p>
              </div>
              <button onClick={() => downloadFile(doc.file_path, doc.file_name)}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Document Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-muted-foreground">Ausstehende Anfragen</h5>
          {pendingRequests.map(req => (
            <div key={req.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-xs">Dokument-Upload ausstehend</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(req.sent_at).toLocaleDateString('de-CH')}
                </span>
              </div>
              <button onClick={() => copyLink(req.token)}
                className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors">
                {copiedToken === req.token ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                {copiedToken === req.token ? 'Kopiert' : 'Link'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
