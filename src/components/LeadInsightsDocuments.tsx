import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Brain, FileText, Send, Copy, Check, Loader2, Clock, CheckCircle2, File, Download, ChevronDown, ChevronUp, Upload, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InsightsTab from './InsightsTab';
import StepActionsPanel from './StepActionsPanel';
import { useLeads } from '@/context/useLeads';
import { type LeadStatus } from '@/lib/mock-data';

interface Props {
  leadId: string;
  leadName: string;
  leadStatus: string;
}

interface PropsWithActions extends Props {
  onScheduleAppointment: () => void;
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

// Combined component with step actions panel - shown directly in lead detail
export function LeadInsightsDocumentsWithActions({ leadId, leadName, leadStatus, onScheduleAppointment }: PropsWithActions) {
  const { discResults } = useLeads();
  const { toast } = useToast();
  const [processData, setProcessData] = useState({ insightsSent: false, insightsCompleted: false, docsCompleted: false });
  const [loading, setLoading] = useState(true);
  const [insightsRequests, setInsightsRequests] = useState<InsightsRequest[]>([]);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [docUploads, setDocUploads] = useState<DocumentUpload[]>([]);
  const [sendingInsights, setSendingInsights] = useState(false);
  const [sendingDocs, setSendingDocs] = useState(false);
  const [copiedToken, setCopiedToken] = useState('');
  const [expandedInsights, setExpandedInsights] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadData();
    const ch = supabase.channel(`step-actions-${leadId}`)
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
    
    setProcessData({
      insightsSent: !!(insRes.data && insRes.data.length > 0),
      insightsCompleted: insRes.data?.[0]?.status === 'completed',
      docsCompleted: docRes.data?.[0]?.status === 'completed',
    });
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
      toast({ title: 'Fehler', description: 'Link konnte nicht erstellt werden.', variant: 'destructive' });
      setSendingInsights(false);
      return;
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: 'Insights & DISC-Test-Link erstellt', user: 'System',
    });

    const url = getPublicUrl('insights', (data as any).token);
    await navigator.clipboard.writeText(url);
    toast({ title: '✅ Link erstellt', description: 'Der Insights & DISC-Link wurde in die Zwischenablage kopiert.' });
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

  const hasDisc = discResults.some(d => d.leadId === leadId);
  const latestInsights = insightsRequests[0];
  const latestDocReq = docRequests[0];
  const insightsCompleted = latestInsights?.status === 'completed';
  const docsCompleted = latestDocReq?.status === 'completed';
  const canSendInsights = ['contacted', 'appointment'].includes(leadStatus);
  const canRequestDocs = ['contacted', 'appointment', 'follow_up'].includes(leadStatus);

  if (loading) return <div className="flex items-center justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {/* Step Actions Panel - main workflow guidance */}
      <StepActionsPanel
        leadId={leadId}
        leadName={leadName}
        leadStatus={leadStatus as LeadStatus}
        onScheduleAppointment={onScheduleAppointment}
        onOpenInsights={createInsightsRequest}
        onOpenDocuments={createDocumentRequest}
        discCompleted={hasDisc || processData.insightsCompleted}
        documentsCompleted={processData.docsCompleted}
        insightsSent={processData.insightsSent}
      />

      {/* Compact status indicators for sent links / completed items */}
      {(insightsRequests.length > 0 || docUploads.length > 0 || hasDisc) && (
        <div className="space-y-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Details & Ergebnisse anzeigen
          </button>

          {showDetails && (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              {/* DISC Results */}
              {hasDisc && (
                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <h5 className="text-xs font-semibold">DISC-Ergebnisse</h5>
                  </div>
                  <InsightsTab leadId={leadId} leadName={leadName} />
                </div>
              )}

              {/* Insights Responses */}
              {insightsRequests.filter(r => r.status === 'completed').map(req => (
                <div key={req.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold">Insights-Antworten</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(req.completed_at!).toLocaleDateString('de-CH')}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedInsights(expandedInsights === req.id ? null : req.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      {expandedInsights === req.id ? 'Ausblenden' : 'Anzeigen'}
                    </button>
                  </div>
                  {expandedInsights === req.id && req.responses && (
                    <div className="space-y-2 mt-2">
                      {Object.entries(req.responses).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-muted/30 border p-3">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {insightsQuestionLabels[key] || key}
                          </p>
                          <p className="text-sm mt-1 leading-relaxed">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Pending links */}
              {insightsRequests.filter(r => r.status !== 'completed').map(req => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" />
                    <span className="text-xs">Insights & DISC-Link ausstehend</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(req.sent_at).toLocaleDateString('de-CH')}
                    </span>
                  </div>
                  <button
                    onClick={() => copyLink('insights', req.token)}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors"
                  >
                    {copiedToken === req.token ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    {copiedToken === req.token ? 'Kopiert' : 'Link'}
                  </button>
                </div>
              ))}

              {/* Document uploads */}
              {docUploads.length > 0 && (
                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h5 className="text-xs font-semibold">Dokumente ({docUploads.length})</h5>
                  </div>
                  {docUploads.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 rounded-lg bg-muted/30 border p-2">
                      <File className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{doc.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {documentTypeLabels[doc.file_type] || doc.file_type} • {(doc.file_size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => downloadFile(doc.file_path, doc.file_name)}
                        className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] hover:bg-muted transition-colors"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending doc requests */}
              {docRequests.filter(r => r.status !== 'completed').map(req => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" />
                    <span className="text-xs">Dokument-Upload ausstehend</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(req.sent_at).toLocaleDateString('de-CH')}
                    </span>
                  </div>
                  <button
                    onClick={() => copyLink('documents', req.token)}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors"
                  >
                    {copiedToken === req.token ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    {copiedToken === req.token ? 'Kopiert' : 'Link'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Keep default export for backward compatibility
export default function LeadInsightsDocuments({ leadId, leadName, leadStatus }: Props) {
  return <LeadInsightsDocumentsWithActions leadId={leadId} leadName={leadName} leadStatus={leadStatus} onScheduleAppointment={() => {}} />;
}
