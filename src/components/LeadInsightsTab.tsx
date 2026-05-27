import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Brain, CheckCircle2, Clock, Copy, Check, Loader2, X, Link as LinkIcon, Mail, ExternalLink, Eye, EyeOff, Download, History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InsightsTab from './InsightsTab';
import { useLeads } from '@/context/useLeads';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { generateAssessmentPdf, assessmentToPdfData, loadLetterhead } from '@/lib/assessment-pdf';

interface Props {
  leadId: string;
  leadName: string;
}

interface InsightsRequest {
  id: string;
  token: string;
  status: string;
  sent_at: string;
  created_at?: string;
  completed_at: string | null;
  responses: Record<string, string>;
}

interface AppointmentSuggestion {
  id: string;
  lead_id: string;
  suggested_date: string;
  suggested_time: string;
  status: string;
  responded_at: string | null;
}

interface AssessmentSummary {
  id: string;
  completed_at: string;
}

const insightsQuestionLabels: Record<string, string> = {
  motivation: 'Motivation',
  experience: 'Erfahrung',
  availability: 'Verfügbarkeit',
  goals: 'Ziele',
  strengths: 'Stärken',
  salary: 'Gehaltsvorstellung',
};

export default function LeadInsightsTab({ leadId, leadName }: Props) {
  const { discResults, addActivity, leads } = useLeads();
  const lead = useMemo(() => leads.find(l => l.id === leadId), [leads, leadId]);
  const leadEmail = (lead as any)?.email || (lead as any)?.altEmail || '';
  const [showHistory, setShowHistory] = useState(false);
  const [emailSendingId, setEmailSendingId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [insightsRequests, setInsightsRequests] = useState<InsightsRequest[]>([]);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [expandedInsights, setExpandedInsights] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  useEffect(() => {
    loadData();
    const ch = supabase.channel(`insights-tab-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insights_requests', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assessment_results', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [leadId]);

  async function loadData() {
    const [insRes, assRes] = await Promise.all([
      supabase.from('insights_requests').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('assessment_results').select('id, completed_at').eq('lead_id', leadId).order('completed_at', { ascending: false }),
    ]);
    if (insRes.data) setInsightsRequests(insRes.data as any[]);
    if (assRes.data) setAssessments(assRes.data as any[]);
    setLoading(false);
  }

  function getPublicUrl(token: string) {
    return `${window.location.origin}/insights-form?token=${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getPublicUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
    toast({ title: 'Kopiert!', description: 'Link in der Zwischenablage.' });
  }

  function buildMailto(token: string) {
    const url = getPublicUrl(token);
    const subject = encodeURIComponent('Ihr Insights & DISC-Test bei SSM Partner');
    const body = encodeURIComponent(
      `Guten Tag ${leadName},\n\nbitte füllen Sie über den folgenden Link unseren kurzen Insights & DISC-Test aus:\n\n${url}\n\nVielen Dank!\nIhr SSM Partner Team`,
    );
    return `mailto:${leadEmail}?subject=${subject}&body=${body}`;
  }

  function sendByEmail(token: string, reqId: string) {
    if (!leadEmail) {
      toast({ title: 'Keine E-Mail-Adresse', description: 'Für diesen Lead ist keine E-Mail hinterlegt.', variant: 'destructive' });
      return;
    }
    setEmailSendingId(reqId);
    window.location.href = buildMailto(token);
    supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: `Insights-Link per E-Mail an ${leadEmail} gesendet`, user: 'System',
    }).then(() => {
      setTimeout(() => setEmailSendingId(null), 1500);
    });
  }

  const handleGenerateLink = useCallback(async (alsoSendEmail: boolean) => {
    setSendingLink(true);
    const { data, error } = await supabase
      .from('insights_requests')
      .insert({ lead_id: leadId, sent_via: alsoSendEmail ? 'email' : 'manual' })
      .select()
      .single();

    if (error || !data) {
      toast({ title: 'Fehler', description: 'Link konnte nicht erstellt werden.', variant: 'destructive' });
      setSendingLink(false);
      return;
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: alsoSendEmail ? 'Insights-Link erstellt & per E-Mail gesendet' : 'Insights-Link erstellt (manuell)',
      user: 'System',
    });

    const url = getPublicUrl((data as any).token);
    await navigator.clipboard.writeText(url);
    toast({ title: '✅ Link erstellt & kopiert', description: alsoSendEmail ? 'E-Mail-Programm wird geöffnet.' : url });
    if (alsoSendEmail && leadEmail) {
      window.location.href = buildMailto((data as any).token);
    }
    setSendingLink(false);
    loadData();
  }, [leadId, toast, leadEmail, leadName]);


  const handleDownloadPdf = useCallback(async () => {
    setGeneratingPdf(true);
    try {
      const { data: assessment } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('lead_id', leadId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (!assessment) {
        toast({ title: 'Keine Assessment-Daten vorhanden', variant: 'destructive' });
        setGeneratingPdf(false);
        return;
      }

      const letterhead = await loadLetterhead();
      const pdfData = assessmentToPdfData(assessment, leadName, '');
      generateAssessmentPdf(pdfData, letterhead);
    } catch {
      toast({ title: 'Fehler beim PDF-Export', variant: 'destructive' });
    }
    setGeneratingPdf(false);
  }, [leadId, leadName, toast]);

  const hasDisc = discResults.some(d => d.leadId === leadId);
  const hasAssessment = assessments.length > 0;
  const completedInsights = insightsRequests.filter(r => r.status === 'completed');
  const pendingInsights = insightsRequests.filter(r => r.status !== 'completed');
  const hasAnyResults = hasDisc || hasAssessment || completedInsights.length > 0;

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* ── Action Bar ── */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Insights & DISC</span>
            {pendingInsights.length > 0 && (
              <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
                {pendingInsights.length} ausstehend
              </span>
            )}
            {completedInsights.length > 0 && (
              <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                {completedInsights.length} abgeschlossen
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Generate link (anytime, sending optional) */}
            <button
              onClick={() => setShowSendConfirm(true)}
              disabled={sendingLink}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              title="Neuen Insights-Link generieren (Versand optional)"
            >
              {sendingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <LinkIcon className="h-3 w-3" />}
              Link generieren
            </button>

            {/* Completed history toggle */}
            {completedInsights.length > 0 && (
              <button
                onClick={() => setShowHistory(s => !s)}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                title="Abgeschlossene Links anzeigen"
              >
                <History className="h-3 w-3" />
                {showHistory ? 'Verlauf ausblenden' : `Verlauf (${completedInsights.length})`}
              </button>
            )}

            {/* PDF download */}
            {hasAnyResults && (
              <button
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                {generatingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                PDF
              </button>
            )}
          </div>
        </div>

        {/* Active links list */}
        {pendingInsights.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Aktive Links</p>
            {pendingInsights.map(req => (
              <div key={req.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-2">
                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  Erstellt: {new Date(req.created_at || req.sent_at).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewToken(previewToken === req.token ? null : req.token)}
                    className="flex h-6 w-6 items-center justify-center rounded border bg-background hover:bg-muted transition-colors"
                    title="Vorschau"
                  >
                    {previewToken === req.token ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => copyLink(req.token)}
                    className="flex h-6 w-6 items-center justify-center rounded border bg-background hover:bg-muted transition-colors"
                    title="Link kopieren"
                  >
                    {copiedToken === req.token ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => sendByEmail(req.token, req.id)}
                    disabled={!leadEmail}
                    className="flex h-6 w-6 items-center justify-center rounded border bg-background hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={leadEmail ? `Per E-Mail an ${leadEmail} senden` : 'Keine E-Mail-Adresse hinterlegt'}
                  >
                    {emailSendingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                  </button>
                  <a
                    href={getPublicUrl(req.token)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-6 w-6 items-center justify-center rounded border bg-background hover:bg-muted transition-colors"
                    title="In neuem Tab öffnen"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed links history */}
        {showHistory && completedInsights.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Abgeschlossene Links</p>
            {completedInsights.map(req => (
              <div key={`hist-${req.id}`} className="flex items-center gap-2 rounded-md bg-muted/20 border border-dashed px-2.5 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-[11px] text-muted-foreground flex-1 truncate">
                  {new Date(req.created_at || req.sent_at).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}
                  {req.completed_at && ` → abgeschlossen ${new Date(req.completed_at).toLocaleDateString('de-CH')}`}
                </span>
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700">
                  Abgeschlossen
                </span>
                <button
                  onClick={() => copyLink(req.token)}
                  className="flex h-5 w-5 items-center justify-center rounded border bg-background hover:bg-muted transition-colors"
                  title="Link kopieren"
                >
                  {copiedToken === req.token ? <Check className="h-2.5 w-2.5 text-primary" /> : <Copy className="h-2.5 w-2.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* ── Mini Preview ── */}
      {previewToken && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Formular-Vorschau
            </span>
            <button onClick={() => setPreviewToken(null)} className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted">
              <X className="h-3 w-3" />
            </button>
          </div>
          <iframe
            src={getPublicUrl(previewToken)}
            className="w-full h-[400px] border-0"
            title="Insights Formular Vorschau"
          />
        </div>
      )}

      {/* ── DISC Results / Assessment ── */}
      {(hasDisc || hasAssessment) && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-primary" />
            <h5 className="text-sm font-semibold">DISC-Ergebnisse & Assessment</h5>
          </div>
          <InsightsTab leadId={leadId} leadName={leadName} />
        </div>
      )}

      {/* ── Completed Insights Responses ── */}
      {completedInsights.map(req => (
        <div key={req.id} className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Insights-Antworten</span>
              <span className="text-xs text-muted-foreground">
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

      {/* ── Empty State ── */}
      {!hasDisc && !hasAssessment && completedInsights.length === 0 && pendingInsights.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Brain className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Noch keine Insights vorhanden</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Klicken Sie oben auf «Link generieren», um den Insights & DISC-Wizard zu starten.</p>
        </div>
      )}

      {/* ── Generate Link Dialog ── */}
      <Dialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Insights-Link generieren</DialogTitle>
            <DialogDescription>
              Es wird ein neuer Insights & DISC-Test-Link für <strong>{leadName}</strong> erstellt und automatisch in die Zwischenablage kopiert. Der Versand per E-Mail ist optional.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground break-all">
            {leadEmail
              ? <>Hinterlegte E-Mail: <strong className="text-foreground">{leadEmail}</strong></>
              : <>Für diesen Lead ist keine E-Mail-Adresse hinterlegt – Versand per E-Mail nicht möglich.</>}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="outline" onClick={() => setShowSendConfirm(false)} className="w-full sm:w-auto">
              Abbrechen
            </Button>
            <Button variant="secondary" onClick={() => { setShowSendConfirm(false); handleGenerateLink(false); }} className="w-full sm:w-auto">
              <LinkIcon className="h-3.5 w-3.5" /> Nur generieren
            </Button>
            <Button
              disabled={!leadEmail}
              onClick={() => { setShowSendConfirm(false); handleGenerateLink(true); }}
              title={leadEmail ? '' : 'Keine E-Mail-Adresse'}
              className="w-full sm:w-auto"
            >
              <Mail className="h-3.5 w-3.5" /> Generieren & per E-Mail senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
