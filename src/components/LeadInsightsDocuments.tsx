import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Brain, FileText, Send, Copy, Check, Loader2, Clock, CheckCircle2, File, Download, ChevronDown, ChevronUp, ClipboardList, Upload, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InsightsTab from './InsightsTab';

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

const insightsQuestionLabels: Record<string, string> = {
  motivation: 'Motivation',
  experience: 'Erfahrung',
  availability: 'Verfügbarkeit',
  goals: 'Ziele',
  strengths: 'Stärken',
  salary: 'Gehaltsvorstellung',
};

// Process phase config to show contextual guidance
const processPhases = [
  { key: 'disc_test', label: 'DISC-Persönlichkeitstest', icon: Brain, statuses: ['appointment', 'follow_up'] },
  { key: 'documents', label: 'Dokumente', icon: FileText, statuses: ['appointment', 'follow_up'] },
] as const;

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
  const [expandedSection, setExpandedSection] = useState<string | null>('insights_form');
  const [showDiscTest, setShowDiscTest] = useState(false);

  useEffect(() => {
    loadData();
    const ch = supabase.channel(`lead-${leadId}-process`)
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
    return `${window.location.origin}/${type === 'insights' ? 'insights-form' : 'document-upload'}?token=${token}`;
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
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: 'Insights-Formular-Link erstellt', user: 'System',
    });

    const url = getPublicUrl('insights', (data as any).token);
    await navigator.clipboard.writeText(url);
    toast({ title: '✅ Insights-Link erstellt', description: 'Der Link wurde in die Zwischenablage kopiert. Versenden Sie ihn per E-Mail, SMS oder WhatsApp.' });
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
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: 'Dokumenten-Upload-Link erstellt', user: 'System',
    });

    const url = getPublicUrl('documents', (data as any).token);
    await navigator.clipboard.writeText(url);
    toast({ title: '✅ Upload-Link erstellt', description: 'Der Link wurde in die Zwischenablage kopiert.' });
    setSendingDocs(false);
    loadData();
  }

  async function copyLink(type: 'insights' | 'documents', token: string) {
    const url = getPublicUrl(type, token);
    await navigator.clipboard.writeText(url);
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

  const latestInsights = insightsRequests[0];
  const latestDocReq = docRequests[0];
  const insightsCompleted = latestInsights?.status === 'completed';
  const docsCompleted = latestDocReq?.status === 'completed';

  const canSendInsights = ['contacted', 'appointment', 'interview_1'].includes(leadStatus);
  const canRequestDocs = ['insights', 'interview_1', 'interview_2', 'appointment'].includes(leadStatus);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  // Compute overall process completion
  const processSteps = [
    { label: 'Insights-Formular', done: insightsCompleted },
    { label: 'Dokumente', done: docsCompleted },
  ];
  const completedSteps = processSteps.filter(s => s.done).length;

  return (
    <div className="space-y-4">
      {/* Process Overview Banner */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Prozess-Fortschritt</h4>
          <span className="text-xs font-medium text-muted-foreground">{completedSteps} / {processSteps.length} abgeschlossen</span>
        </div>
        <div className="flex gap-2">
          {processSteps.map((step, i) => (
            <div key={i} className="flex-1">
              <div className={`h-2 rounded-full transition-colors ${step.done ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`text-[10px] mt-1 ${step.done ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1: Insights Form */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'insights_form' ? null : 'insights_form')}
          className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${insightsCompleted ? 'bg-primary/10' : canSendInsights ? 'bg-accent/30' : 'bg-muted'}`}>
            <ClipboardList className={`h-5 w-5 ${insightsCompleted ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">Insights-Formular</h4>
            <p className="text-xs text-muted-foreground">
              {insightsCompleted
                ? `Abgeschlossen am ${new Date(latestInsights.completed_at!).toLocaleDateString('de-CH')}`
                : latestInsights ? 'Link gesendet – Antwort ausstehend'
                : canSendInsights ? 'Bereit zum Versenden' : 'Verfügbar ab Status "Kontaktiert"'}
            </p>
          </div>
          {insightsCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          ) : latestInsights ? (
            <Clock className="h-5 w-5 text-accent shrink-0" />
          ) : null}
          {expandedSection === 'insights_form' ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {expandedSection === 'insights_form' && (
          <div className="border-t px-4 pb-4 space-y-3">
            {/* Send button */}
            {canSendInsights && !insightsCompleted && (
              <button
                onClick={createInsightsRequest}
                disabled={sendingInsights}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {sendingInsights ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Insights-Formular senden
              </button>
            )}

            {!canSendInsights && !insightsCompleted && !latestInsights && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Das Insights-Formular kann ab dem Status «Kontaktiert» versendet werden.
                </p>
              </div>
            )}

            {/* Existing requests */}
            {insightsRequests.map(req => (
              <div key={req.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {req.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Clock className="h-4 w-4 text-accent" />
                    )}
                    <span className="text-xs font-medium">
                      {req.status === 'completed' ? 'Abgeschlossen' : 'Ausstehend'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {new Date(req.sent_at).toLocaleDateString('de-CH')}
                    </span>
                  </div>
                  <button
                    onClick={() => copyLink('insights', req.token)}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors"
                  >
                    {copiedToken === req.token ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    {copiedToken === req.token ? 'Kopiert' : 'Link kopieren'}
                  </button>
                </div>

                {/* Completed responses */}
                {req.status === 'completed' && req.responses && (
                  <div>
                    <button
                      onClick={() => setExpandedInsights(expandedInsights === req.id ? null : req.id)}
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {expandedInsights === req.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {expandedInsights === req.id ? 'Antworten ausblenden' : 'Antworten anzeigen'}
                    </button>
                    {expandedInsights === req.id && (
                      <div className="mt-2 space-y-2">
                        {Object.entries(req.responses).map(([key, value]) => (
                          <div key={key} className="rounded-lg bg-background border p-3">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {insightsQuestionLabels[key] || key}
                            </p>
                            <p className="text-sm mt-1 leading-relaxed">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {req.reminder_sent_at && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Erinnerung gesendet am {new Date(req.reminder_sent_at).toLocaleDateString('de-CH')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: DISC Test */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'disc_test' ? null : 'disc_test')}
          className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-accent/30`}>
            <Brain className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">DISC-Persönlichkeitstest</h4>
            <p className="text-xs text-muted-foreground">
              Verhaltenspräferenzen des Kandidaten (intern durchgeführt)
            </p>
          </div>
          {expandedSection === 'disc_test' ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {expandedSection === 'disc_test' && (
          <div className="border-t">
            <InsightsTab leadId={leadId} leadName={leadName} />
          </div>
        )}
      </section>

      {/* Section 3: Documents */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'documents' ? null : 'documents')}
          className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${docsCompleted ? 'bg-primary/10' : docUploads.length > 0 ? 'bg-accent/30' : 'bg-muted'}`}>
            <FileText className={`h-5 w-5 ${docsCompleted ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">Dokumente</h4>
            <p className="text-xs text-muted-foreground">
              {docsCompleted
                ? `${docUploads.length} Dokument(e) erhalten`
                : latestDocReq ? 'Upload-Link gesendet – ausstehend'
                : canRequestDocs ? 'Bereit zur Anforderung' : 'Verfügbar ab Status "Insights" oder "Terminiert"'}
            </p>
          </div>
          {docsCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          ) : latestDocReq ? (
            <Clock className="h-5 w-5 text-accent shrink-0" />
          ) : null}
          {expandedSection === 'documents' ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {expandedSection === 'documents' && (
          <div className="border-t px-4 pb-4 space-y-3">
            {/* Request button */}
            {canRequestDocs && !docsCompleted && (
              <button
                onClick={createDocumentRequest}
                disabled={sendingDocs}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {sendingDocs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Dokumente anfordern
              </button>
            )}

            {!canRequestDocs && !docsCompleted && !latestDocReq && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Dokumente können ab dem Status «Terminiert» oder «Insights» angefordert werden.
                </p>
              </div>
            )}

            {/* Existing requests */}
            {docRequests.map(req => (
              <div key={req.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {req.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Clock className="h-4 w-4 text-accent" />
                    )}
                    <span className="text-xs font-medium">
                      {req.status === 'completed' ? 'Hochgeladen' : 'Ausstehend'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {new Date(req.sent_at).toLocaleDateString('de-CH')}
                    </span>
                  </div>
                  <button
                    onClick={() => copyLink('documents', req.token)}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors"
                  >
                    {copiedToken === req.token ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    {copiedToken === req.token ? 'Kopiert' : 'Link kopieren'}
                  </button>
                </div>
                {req.reminder_sent_at && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    Erinnerung gesendet am {new Date(req.reminder_sent_at).toLocaleDateString('de-CH')}
                  </p>
                )}
              </div>
            ))}

            {/* Uploaded documents */}
            {docUploads.length > 0 && (
              <div className="space-y-2 pt-1">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hochgeladene Dateien</h5>
                {docUploads.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                    <File className="h-5 w-5 text-primary/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {documentTypeLabels[doc.file_type] || doc.file_type} • {(doc.file_size / 1024).toFixed(0)} KB • {new Date(doc.uploaded_at).toLocaleDateString('de-CH')}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadFile(doc.file_path, doc.file_name)}
                      className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs hover:bg-muted/80 transition-colors"
                    >
                      <Download className="h-3 w-3" /> Öffnen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
