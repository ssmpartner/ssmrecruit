import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Brain, CheckCircle2, Clock, Copy, Check, Loader2, CalendarPlus,
  CalendarCheck, X, Send, ExternalLink, Eye, EyeOff, Download, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InsightsTab from './InsightsTab';
import { useLeads } from '@/context/useLeads';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  leadId: string;
  leadName: string;
}

interface InsightsRequest {
  id: string;
  token: string;
  status: string;
  sent_at: string;
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

const insightsQuestionLabels: Record<string, string> = {
  motivation: 'Motivation',
  experience: 'Erfahrung',
  availability: 'Verfügbarkeit',
  goals: 'Ziele',
  strengths: 'Stärken',
  salary: 'Gehaltsvorstellung',
};

export default function LeadInsightsTab({ leadId, leadName }: Props) {
  const { discResults, addActivity } = useLeads();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [insightsRequests, setInsightsRequests] = useState<InsightsRequest[]>([]);
  const [appointmentSuggestions, setAppointmentSuggestions] = useState<AppointmentSuggestion[]>([]);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_suggestions', filter: `lead_id=eq.${leadId}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [leadId]);

  async function loadData() {
    const [insRes, sugRes] = await Promise.all([
      supabase.from('insights_requests').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('appointment_suggestions').select('*').eq('lead_id', leadId).order('suggested_date', { ascending: true }),
    ]);
    if (insRes.data) setInsightsRequests(insRes.data as any[]);
    if (sugRes.data) setAppointmentSuggestions(sugRes.data as any[]);
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

  const handleSendInsightsLink = useCallback(async () => {
    setSendingLink(true);
    const { data, error } = await supabase
      .from('insights_requests')
      .insert({ lead_id: leadId, sent_via: 'manual' })
      .select()
      .single();

    if (error || !data) {
      toast({ title: 'Fehler', description: 'Link konnte nicht erstellt werden.', variant: 'destructive' });
      setSendingLink(false);
      return;
    }

    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: 'Insights & DISC-Test-Link erstellt', user: 'System',
    });

    const url = getPublicUrl((data as any).token);
    await navigator.clipboard.writeText(url);
    toast({ title: '✅ Link erstellt & kopiert', description: url });
    setSendingLink(false);
    loadData();
  }, [leadId, toast]);

  async function handleSuggestionAction(id: string, action: 'accepted' | 'declined') {
    await supabase.from('appointment_suggestions').update({
      status: action,
      responded_at: new Date().toISOString(),
    }).eq('id', id);

    if (action === 'accepted') {
      const suggestion = appointmentSuggestions.find(s => s.id === id);
      if (suggestion) {
        addActivity(leadId, 'appointment', `Terminvorschlag angenommen: ${new Date(suggestion.suggested_date).toLocaleDateString('de-CH')} um ${suggestion.suggested_time}`);
        const otherPending = appointmentSuggestions.filter(s => s.id !== id && s.status === 'pending');
        for (const other of otherPending) {
          await supabase.from('appointment_suggestions').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', other.id);
        }
      }
    } else {
      addActivity(leadId, 'note', 'Terminvorschlag abgelehnt');
    }
    toast({ title: action === 'accepted' ? '✅ Termin angenommen' : '❌ Termin abgelehnt' });
    loadData();
  }

  const handleDownloadPdf = useCallback(async () => {
    setGeneratingPdf(true);
    try {
      // Use browser print to generate a "PDF" of the insights content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ title: 'Pop-up blockiert', description: 'Bitte erlauben Sie Pop-ups für den PDF-Download.', variant: 'destructive' });
        setGeneratingPdf(false);
        return;
      }

      // Gather all data for the PDF
      const completedReqs = insightsRequests.filter(r => r.status === 'completed');
      const discResult = discResults.find(d => d.leadId === leadId);

      // Fetch assessment results
      const { data: assessment } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('lead_id', leadId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      let insightsHtml = '';

      // Insights responses
      completedReqs.forEach(req => {
        if (req.responses) {
          insightsHtml += '<h3>Insights-Antworten</h3>';
          Object.entries(req.responses).forEach(([key, value]) => {
            insightsHtml += `<div class="qa"><strong>${insightsQuestionLabels[key] || key}:</strong> <span>${value}</span></div>`;
          });
        }
      });

      // DISC
      if (discResult) {
        insightsHtml += '<h3>DISC-Ergebnisse</h3>';
        insightsHtml += `<p><strong>Dominanter Typ:</strong> ${discResult.dominantType?.toUpperCase()}</p>`;
        if (discResult.scores) {
          insightsHtml += '<div class="scores">';
          Object.entries(discResult.scores as Record<string, number>).forEach(([dim, score]) => {
            insightsHtml += `<div class="score-bar"><span>${dim.toUpperCase()}</span><div class="bar"><div class="fill" style="width:${score}%"></div></div><span>${score}%</span></div>`;
          });
          insightsHtml += '</div>';
        }
      }

      // Assessment
      if (assessment) {
        const a = assessment as any;
        if (a.summary?.headline) insightsHtml += `<h3>${a.summary.headline}</h3>`;
        if (a.summary?.description) insightsHtml += `<p>${a.summary.description}</p>`;
        if (a.match_result?.score != null) {
          insightsHtml += `<div class="match"><strong>Match Score:</strong> ${a.match_result.score}/100 — ${a.match_result.level}</div>`;
        }
        if (a.recommendation) insightsHtml += `<div class="rec"><strong>Empfehlung:</strong> ${a.recommendation}</div>`;
        if (a.report_sections?.strengths_profile?.length) {
          insightsHtml += '<h4>Stärken</h4><ul>' + a.report_sections.strengths_profile.map((s: string) => `<li>${s}</li>`).join('') + '</ul>';
        }
        if (a.report_sections?.improvement_areas?.length) {
          insightsHtml += '<h4>Verbesserungsbereiche</h4><ul>' + a.report_sections.improvement_areas.map((s: string) => `<li>${s}</li>`).join('') + '</ul>';
        }
        // Personality profile in PDF
        if (a.personality_title) {
          insightsHtml += `<h3>Persönlichkeitsprofil: ${a.personality_title}</h3>`;
          if (a.personality_summary) insightsHtml += `<p>${a.personality_summary}</p>`;
          if (a.personality_meaning) insightsHtml += `<h4>Was dieses Profil bedeutet</h4><p>${a.personality_meaning}</p>`;
          if (a.match_interpretation) insightsHtml += `<h4>SSM Match-Interpretation</h4><p>${a.match_interpretation}</p>`;
          if (a.personality_strengths_extended?.length) insightsHtml += '<h4>Erweiterte Stärken</h4><ul>' + a.personality_strengths_extended.map((s: string) => `<li>${s}</li>`).join('') + '</ul>';
          if (a.personality_risks_extended?.length) insightsHtml += '<h4>Mögliche Risiken</h4><ul>' + a.personality_risks_extended.map((r: string) => `<li>${r}</li>`).join('') + '</ul>';
        }
      }

      printWindow.document.write(`<!DOCTYPE html><html><head><title>Insights Report – ${leadName}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
          h1 { font-size: 22px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
          h3 { font-size: 16px; margin-top: 24px; color: #2563eb; }
          h4 { font-size: 14px; margin-top: 16px; }
          .qa { margin: 8px 0; padding: 8px 12px; background: #f8f9fa; border-radius: 6px; font-size: 13px; }
          .qa strong { display: block; font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 2px; }
          .scores { margin: 12px 0; }
          .score-bar { display: flex; align-items: center; gap: 8px; margin: 6px 0; font-size: 13px; }
          .score-bar .bar { flex: 1; height: 12px; background: #e5e7eb; border-radius: 6px; overflow: hidden; }
          .score-bar .fill { height: 100%; background: #2563eb; border-radius: 6px; }
          .match, .rec { padding: 10px 14px; margin: 8px 0; background: #eff6ff; border-radius: 8px; font-size: 13px; }
          ul { font-size: 13px; }
          li { margin: 4px 0; }
          .meta { font-size: 12px; color: #888; margin-top: 4px; }
          @media print { body { margin: 20px; } }
        </style>
      </head><body>
        <h1>Insights Report</h1>
        <p><strong>${leadName}</strong></p>
        <p class="meta">Erstellt am ${new Date().toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        ${insightsHtml || '<p>Keine Insights-Daten vorhanden.</p>'}
      </body></html>`);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        setGeneratingPdf(false);
      }, 500);
    } catch {
      setGeneratingPdf(false);
      toast({ title: 'Fehler beim PDF-Export', variant: 'destructive' });
    }
  }, [insightsRequests, discResults, leadId, leadName, toast]);

  const hasDisc = discResults.some(d => d.leadId === leadId);
  const completedInsights = insightsRequests.filter(r => r.status === 'completed');
  const pendingInsights = insightsRequests.filter(r => r.status !== 'completed');
  const hasAnyResults = hasDisc || completedInsights.length > 0;

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
            {/* Send new link */}
            <button
              onClick={() => setShowSendConfirm(true)}
              disabled={sendingLink}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {sendingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Link senden
            </button>

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
                  Gesendet: {new Date(req.sent_at).toLocaleDateString('de-CH')}
                </span>
                <div className="flex items-center gap-1">
                  {/* Preview */}
                  <button
                    onClick={() => setPreviewToken(previewToken === req.token ? null : req.token)}
                    className="flex h-6 w-6 items-center justify-center rounded border bg-background hover:bg-muted transition-colors"
                    title="Vorschau"
                  >
                    {previewToken === req.token ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  {/* Copy */}
                  <button
                    onClick={() => copyLink(req.token)}
                    className="flex h-6 w-6 items-center justify-center rounded border bg-background hover:bg-muted transition-colors"
                    title="Link kopieren"
                  >
                    {copiedToken === req.token ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                  </button>
                  {/* Open in new tab */}
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

      {/* ── DISC Results ── */}
      {hasDisc && (
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

      {/* ── Appointment Suggestions ── */}
      {appointmentSuggestions.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <CalendarPlus className="h-4 w-4 text-primary" />
            <h5 className="text-sm font-semibold">Terminvorschläge vom Kandidaten</h5>
          </div>
          {appointmentSuggestions.map(s => {
            const dateStr = new Date(s.suggested_date).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
            return (
              <div key={s.id} className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                s.status === 'accepted' ? 'bg-primary/5 border-primary/30' :
                s.status === 'declined' ? 'bg-muted/30 border-muted opacity-60' :
                'bg-background border-border'
              }`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s.status === 'declined' ? 'line-through text-muted-foreground' : ''}`}>
                    {dateStr} um {s.suggested_time} Uhr
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.status === 'pending' && 'Ausstehend'}
                    {s.status === 'accepted' && '✅ Angenommen'}
                    {s.status === 'declined' && '❌ Abgelehnt'}
                  </p>
                </div>
                {s.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleSuggestionAction(s.id, 'accepted')}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                      <CalendarCheck className="h-3 w-3" /> Annehmen
                    </button>
                    <button onClick={() => handleSuggestionAction(s.id, 'declined')}
                      className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                      <X className="h-3 w-3" /> Ablehnen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty State ── */}
      {!hasDisc && completedInsights.length === 0 && pendingInsights.length === 0 && appointmentSuggestions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Brain className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Noch keine Insights vorhanden</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Klicken Sie oben auf «Link senden», um den Insights & DISC-Wizard zu starten.</p>
        </div>
      )}

      {/* ── Send Confirmation Dialog ── */}
      <Dialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insights-Link senden</DialogTitle>
            <DialogDescription>
              Möchten Sie einen neuen Insights & DISC-Test-Link für <strong>{leadName}</strong> erstellen? Der Link wird automatisch in die Zwischenablage kopiert.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSendConfirm(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => { setShowSendConfirm(false); handleSendInsightsLink(); }}>
              Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
