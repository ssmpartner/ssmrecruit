import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Brain, FileText, Send, Copy, Check, Loader2, Clock, CheckCircle2, ExternalLink, RefreshCw, File, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  leadId: string;
  leadName: string;
  leadStatus: string;
}

interface InsightsRequest {
  id: string;
  token: string;
  status: string;
  sent_via: string;
  sent_at: string;
  completed_at: string | null;
  responses: Record<string, string>;
  reminder_sent_at: string | null;
}

interface DocumentRequest {
  id: string;
  token: string;
  status: string;
  sent_via: string;
  sent_at: string;
  reminder_sent_at: string | null;
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

export default function LeadInsightsDocuments({ leadId, leadName, leadStatus }: Props) {
  const { toast } = useToast();
  const [insightsRequests, setInsightsRequests] = useState<InsightsRequest[]>([]);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [docUploads, setDocUploads] = useState<DocumentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingInsights, setSendingInsights] = useState(false);
  const [sendingDocs, setSendingDocs] = useState(false);
  const [copiedToken, setCopiedToken] = useState('');
  const [expandedInsights, setExpandedInsights] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    // Realtime subscriptions
    const ch = supabase.channel(`lead-${leadId}-insights-docs`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insights_requests', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_uploads', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [leadId]);

  async function loadData() {
    const [insRes, docRes, uploadsRes] = await Promise.all([
      supabase.from('insights_requests').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('document_requests').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('document_uploads').select('*').eq('lead_id', leadId).order('uploaded_at', { ascending: false }),
    ]);
    if (insRes.data) setInsightsRequests(insRes.data as any[]);
    if (docRes.data) setDocRequests(docRes.data as any[]);
    if (uploadsRes.data) setDocUploads(uploadsRes.data as any[]);
    setLoading(false);
  }

  function getPublicUrl(type: 'insights' | 'documents', token: string) {
    const base = window.location.origin;
    return `${base}/${type === 'insights' ? 'insights-form' : 'document-upload'}?token=${token}`;
  }

  async function createInsightsRequest() {
    setSendingInsights(true);
    const { data, error } = await supabase
      .from('insights_requests')
      .insert({ lead_id: leadId, sent_via: 'manual' })
      .select()
      .single();

    if (error || !data) {
      toast({ title: 'Fehler', description: 'Insights-Link konnte nicht erstellt werden.', variant: 'destructive' });
      setSendingInsights(false);
      return;
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      type: 'note',
      description: 'Insights-Formular-Link erstellt und versendet',
      user: 'System',
    });

    const url = getPublicUrl('insights', (data as any).token);
    await navigator.clipboard.writeText(url);
    toast({ title: '✅ Insights-Link erstellt', description: 'Link wurde in die Zwischenablage kopiert.' });
    setSendingInsights(false);
    loadData();
  }

  async function createDocumentRequest() {
    setSendingDocs(true);
    const { data, error } = await supabase
      .from('document_requests')
      .insert({ lead_id: leadId, sent_via: 'manual' })
      .select()
      .single();

    if (error || !data) {
      toast({ title: 'Fehler', description: 'Dokumenten-Link konnte nicht erstellt werden.', variant: 'destructive' });
      setSendingDocs(false);
      return;
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      type: 'note',
      description: 'Dokumenten-Upload-Link erstellt und versendet',
      user: 'System',
    });

    const url = getPublicUrl('documents', (data as any).token);
    await navigator.clipboard.writeText(url);
    toast({ title: '✅ Upload-Link erstellt', description: 'Link wurde in die Zwischenablage kopiert.' });
    setSendingDocs(false);
    loadData();
  }

  async function copyLink(type: 'insights' | 'documents', token: string) {
    const url = getPublicUrl(type, token);
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
    toast({ title: 'Kopiert!', description: 'Link wurde in die Zwischenablage kopiert.' });
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

  const latestInsights = insightsRequests[0];
  const latestDocReq = docRequests[0];
  const insightsCompleted = latestInsights?.status === 'completed';
  const docsCompleted = latestDocReq?.status === 'completed';

  const canSendInsights = ['contacted', 'appointment', 'interview_1'].includes(leadStatus);
  const canRequestDocs = ['insights', 'interview_1', 'interview_2', 'appointment'].includes(leadStatus);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Insights Section */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${insightsCompleted ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <Brain className={`h-5 w-5 ${insightsCompleted ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Insights-Formular</h4>
              <p className="text-xs text-muted-foreground">
                {insightsCompleted ? 'Abgeschlossen' : latestInsights ? 'Ausstehend' : 'Nicht gesendet'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {insightsCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Abgeschlossen
              </span>
            ) : latestInsights ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <Clock className="h-3.5 w-3.5" /> Ausstehend
              </span>
            ) : null}
          </div>
        </div>

        {/* Action buttons */}
        {canSendInsights && !insightsCompleted && (
          <button
            onClick={createInsightsRequest}
            disabled={sendingInsights}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {sendingInsights ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Insights-Link senden
          </button>
        )}

        {/* Existing requests */}
        {insightsRequests.length > 0 && (
          <div className="space-y-2">
            {insightsRequests.map(req => (
              <div key={req.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Gesendet am {new Date(req.sent_at).toLocaleDateString('de-CH')} • {req.sent_via}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyLink('insights', req.token)}
                      className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors"
                    >
                      {copiedToken === req.token ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copiedToken === req.token ? 'Kopiert' : 'Link'}
                    </button>
                  </div>
                </div>

                {req.status === 'completed' && req.responses && (
                  <div>
                    <button
                      onClick={() => setExpandedInsights(expandedInsights === req.id ? null : req.id)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {expandedInsights === req.id ? 'Antworten ausblenden' : 'Antworten anzeigen'}
                    </button>
                    {expandedInsights === req.id && (
                      <div className="mt-2 space-y-2">
                        {Object.entries(req.responses).map(([key, value]) => (
                          <div key={key} className="rounded-md bg-background p-2">
                            <p className="text-xs font-semibold text-muted-foreground capitalize">{key}</p>
                            <p className="text-sm mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {req.completed_at && (
                  <p className="text-xs text-emerald-600 font-medium">
                    ✓ Abgeschlossen am {new Date(req.completed_at).toLocaleDateString('de-CH')} um {new Date(req.completed_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Documents Section */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${docsCompleted ? 'bg-emerald-100' : docUploads.length > 0 ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <FileText className={`h-5 w-5 ${docsCompleted ? 'text-emerald-600' : docUploads.length > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Dokumente</h4>
              <p className="text-xs text-muted-foreground">
                {docsCompleted ? `${docUploads.length} Dokument(e) hochgeladen` : latestDocReq ? 'Upload ausstehend' : 'Nicht angefordert'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {docsCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Hochgeladen
              </span>
            ) : latestDocReq ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <Clock className="h-3.5 w-3.5" /> Ausstehend
              </span>
            ) : null}
          </div>
        </div>

        {canRequestDocs && !docsCompleted && (
          <button
            onClick={createDocumentRequest}
            disabled={sendingDocs}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {sendingDocs ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Dokumente anfordern
          </button>
        )}

        {/* Existing document requests */}
        {docRequests.length > 0 && (
          <div className="space-y-2">
            {docRequests.map(req => (
              <div key={req.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Angefordert am {new Date(req.sent_at).toLocaleDateString('de-CH')} • {req.sent_via}
                  </span>
                  <button
                    onClick={() => copyLink('documents', req.token)}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors"
                  >
                    {copiedToken === req.token ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copiedToken === req.token ? 'Kopiert' : 'Link'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded documents */}
        {docUploads.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground">Hochgeladene Dateien</h5>
            {docUploads.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <File className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {documentTypeLabels[doc.file_type] || doc.file_type} • {(doc.file_size / 1024).toFixed(0)} KB • {new Date(doc.uploaded_at).toLocaleDateString('de-CH')}
                  </p>
                </div>
                <button
                  onClick={() => downloadFile(doc.file_path, doc.file_name)}
                  className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs hover:bg-muted/80 transition-colors"
                >
                  <Download className="h-3 w-3" /> Download
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
