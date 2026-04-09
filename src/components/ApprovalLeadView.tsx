import { useState, useEffect, useMemo } from 'react';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { statusConfig, type LeadStatus } from '@/lib/mock-data';
import LeadStatusBadge from './LeadStatusBadge';
import SourceBadge from './SourceBadge';
import ApprovalWizardDialog, { type ApprovalWizardType } from './ApprovalWizardDialog';
import InsightsTab from './InsightsTab';
import {
  User, MapPin, Mail, Phone, Briefcase, Brain, FileText, BarChart3,
  ClipboardCheck, Shield, CheckCircle2, XCircle, HelpCircle,
  UserCheck, Calendar, Eye, Upload, Clock, ChevronLeft, ChevronRight,
  Building2, GraduationCap, TrendingUp, Award, Download, Loader2
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface CareerLevel {
  name: string;
  fixSalary: number;
  expenses: number;
  scorePoints: number;
  requirements: string[];
}

interface CareerPlan {
  id: string;
  position: string;
  levels: CareerLevel[];
  is_active: boolean;
}

interface ApprovalLeadViewProps {
  onClose: () => void;
}

export default function ApprovalLeadView({ onClose }: ApprovalLeadViewProps) {
  const { selectedLead, setSelectedLead, activities, leads, employees, agencies } = useLeads();
  const { isControlling, isGeschaeftsleitung, isHR, profile } = useAuth();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [insightsStatus, setInsightsStatus] = useState<string>('—');
  const [discType, setDiscType] = useState<string>('—');
  const [docsCount, setDocsCount] = useState(0);
  const [controllingDecision, setControllingDecision] = useState<string>('—');
  const [careerPlan, setCareerPlan] = useState<CareerPlan | null>(null);
  const [documentUploads, setDocumentUploads] = useState<any[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const wizardType: ApprovalWizardType = isControlling ? 'controlling' : isGeschaeftsleitung ? 'management' : 'hr';

  // Navigation through approval queue
  const queueLeads = useMemo(() => {
    const statusFilter = isControlling ? 'ready_for_controlling' : isGeschaeftsleitung ? 'management_review' : 'hr_processing';
    return leads.filter(l => l.lifecycle === 'active' && l.status === statusFilter);
  }, [leads, isControlling, isGeschaeftsleitung, isHR]);

  const currentIndex = useMemo(() => selectedLead ? queueLeads.findIndex(l => l.id === selectedLead.id) : -1, [selectedLead, queueLeads]);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < queueLeads.length - 1;

  // Load supplementary data
  useEffect(() => {
    if (!selectedLead) return;
    (async () => {
      const [assessRes, insRes, discRes, docsRes, wizRes] = await Promise.all([
        supabase.from('assessment_results').select('match_result, disc_scores, motivator_scores').eq('lead_id', selectedLead.id).order('completed_at', { ascending: false }).limit(1),
        supabase.from('insights_requests').select('status').eq('lead_id', selectedLead.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('disc_results').select('dominant_type, scores').eq('lead_id', selectedLead.id).order('completed_at', { ascending: false }).limit(1),
        supabase.from('document_uploads').select('*').eq('lead_id', selectedLead.id),
        supabase.from('status_wizard_results').select('wizard_type, answers').eq('lead_id', selectedLead.id).order('created_at', { ascending: false }),
      ]);

      if (assessRes.data?.[0]) {
        const mr = assessRes.data[0].match_result as any;
        setMatchScore(mr?.overall_score ?? mr?.overallScore ?? mr?.score ?? null);
      } else { setMatchScore(null); }

      setInsightsStatus(insRes.data?.[0]?.status === 'completed' ? 'Abgeschlossen' : 'Ausstehend');
      setDiscType(discRes.data?.[0]?.dominant_type ?? '—');
      setDocsCount(docsRes.data?.length ?? 0);
      setDocumentUploads(docsRes.data ?? []);

      const ctrlResult = wizRes.data?.find((w: any) => w.wizard_type === 'controlling_approval');
      setControllingDecision(ctrlResult ? 'Freigegeben' : (isGeschaeftsleitung || isHR ? 'Freigegeben (auto)' : '—'));
    })();
  }, [selectedLead?.id]);

  // Load career plan
  useEffect(() => {
    if (!selectedLead?.position) { setCareerPlan(null); return; }
    supabase.from('career_plans').select('*').eq('is_active', true)
      .then(({ data }) => {
        const match = (data as unknown as CareerPlan[] | null)?.find(p =>
          selectedLead.position.toLowerCase().includes(p.position.toLowerCase()) ||
          p.position.toLowerCase().includes(selectedLead.position.toLowerCase())
        );
        setCareerPlan(match ?? null);
      });
  }, [selectedLead?.position]);

  const leadActivities = selectedLead ? activities.filter(a => a.leadId === selectedLead.id) : [];
  const approvalActivities = leadActivities.filter(a =>
    a.type === 'status_change' && (a.description.includes('Controlling') || a.description.includes('Management') || a.description.includes('HR') || a.description.includes('Freigegeben') || a.description.includes('Abgelehnt'))
  );

  if (!selectedLead) return null;

  const employee = employees.find(e => e.id === selectedLead.employeeId);
  const agency = agencies.find(a => a.id === selectedLead.agencyId);

  const roleLabel = isControlling ? 'Controlling' : isGeschaeftsleitung ? 'Geschäftsleitung' : 'HR';
  const roleColor = isControlling ? 'text-cyan-700' : isGeschaeftsleitung ? 'text-purple-700' : 'text-teal-700';
  const roleBgColor = isControlling ? 'bg-cyan-50 border-cyan-200' : isGeschaeftsleitung ? 'bg-purple-50 border-purple-200' : 'bg-teal-50 border-teal-200';

  // PDF download handler
  async function handleDownloadPdf() {
    setGeneratingPdf(true);
    try {
      const { data } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('lead_id', selectedLead!.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (!data) {
        setGeneratingPdf(false);
        return;
      }

      const assess = data as any;
      const printWindow = window.open('', '_blank');
      if (!printWindow) { setGeneratingPdf(false); return; }

      const discScores = assess.disc_scores || {};
      const motivatorScores = assess.motivator_scores || {};
      const scores = assess.scores || {};
      const matchResult = assess.match_result || {};
      const summary = assess.summary || {};
      const report = assess.report_sections || {};

      printWindow.document.write(`<!DOCTYPE html><html><head><title>Assessment – ${selectedLead!.name}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 30px; color: #1a1a1a; font-size: 13px; line-height: 1.6; }
        h1 { font-size: 22px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
        h2 { font-size: 16px; color: #2563eb; margin-top: 28px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
        .bar-wrap { height: 10px; background: #f3f4f6; border-radius: 5px; overflow: hidden; margin-top: 4px; }
        .bar { height: 100%; border-radius: 5px; }
        ul { padding-left: 18px; }
        li { margin-bottom: 4px; }
        .meta { color: #6b7280; font-size: 11px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>Assessment-Report: ${selectedLead!.name}</h1>
      <p class="meta">Position: ${selectedLead!.position || '—'} • Abgeschlossen: ${new Date(assess.completed_at).toLocaleDateString('de-CH')}</p>

      ${summary.headline ? `<h2>Zusammenfassung</h2><p><strong>${summary.headline}</strong></p><p>${summary.description || ''}</p>` : ''}

      <h2>Match Score: ${matchResult.score ?? '—'}/100</h2>
      <div class="grid2">
        <div class="card"><strong>Stärken</strong><ul>${(matchResult.strengths || []).map((s: string) => `<li>${s}</li>`).join('')}</ul></div>
        <div class="card"><strong>Risiken</strong><ul>${(matchResult.risks || []).map((r: string) => `<li>${r}</li>`).join('')}</ul></div>
      </div>

      <h2>Performance Scores</h2>
      ${['performance', 'team_fit', 'learning', 'sales', 'culture_fit'].map(k => {
        const v = scores[k] || 0;
        const labels: Record<string, string> = { performance: 'Performance', team_fit: 'Team Fit', learning: 'Lernfähigkeit', sales: 'Sales Potential', culture_fit: 'Culture Fit' };
        return `<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;"><span>${labels[k]}</span><strong>${v}%</strong></div><div class="bar-wrap"><div class="bar" style="width:${v}%;background:#2563eb;"></div></div></div>`;
      }).join('')}

      <h2>DISC-Profil</h2>
      <div class="grid2">
      ${['D', 'I', 'S', 'C'].map(k => {
        const v = discScores[k] || 0;
        const labels: Record<string, string> = { D: 'Dominant', I: 'Initiativ', S: 'Stetig', C: 'Gewissenhaft' };
        const colors: Record<string, string> = { D: '#dc2626', I: '#d97706', S: '#059669', C: '#2563eb' };
        return `<div class="card"><strong>${k} – ${labels[k]}</strong><div style="font-size:20px;font-weight:bold;color:${colors[k]}">${v}%</div><div class="bar-wrap"><div class="bar" style="width:${v}%;background:${colors[k]};"></div></div></div>`;
      }).join('')}
      </div>
      ${report.disc_analysis ? `<p>${report.disc_analysis}</p>` : ''}

      <h2>Motivatoren</h2>
      ${Object.entries(motivatorScores).map(([k, v]) => {
        const colors: Record<string, string> = { individualistisch: '#8B5CF6', oekonomisch: '#F59E0B', theoretisch: '#3B82F6', sozial: '#10B981', aesthetisch: '#EC4899', traditionell: '#6B7280' };
        return `<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;"><span style="text-transform:capitalize;">${k}</span><strong>${v}%</strong></div><div class="bar-wrap"><div class="bar" style="width:${v}%;background:${colors[k] || '#2563eb'};"></div></div></div>`;
      }).join('')}
      ${report.motivator_analysis ? `<p>${report.motivator_analysis}</p>` : ''}

      ${report.integration ? `<h2>Integration Verhalten + Motivatoren</h2><p>${report.integration}</p>` : ''}
      ${report.strengths_profile?.length ? `<h2>Stärkenprofil</h2><ul>${report.strengths_profile.map((s: string) => `<li>${s}</li>`).join('')}</ul>` : ''}
      ${report.improvement_areas?.length ? `<h2>Verbesserungsbereiche</h2><ul>${report.improvement_areas.map((s: string) => `<li>${s}</li>`).join('')}</ul>` : ''}
      ${report.natural_vs_adapted ? `<h2>Natürlicher vs. Adaptierter Stil</h2><p>${report.natural_vs_adapted}</p>` : ''}
      ${(report.communication_do?.length || report.communication_dont?.length) ? `<h2>Kommunikations-Guidelines</h2><div class="grid2"><div class="card"><strong>✅ DO</strong><ul>${(report.communication_do || []).map((s: string) => `<li>${s}</li>`).join('')}</ul></div><div class="card"><strong>❌ DON'T</strong><ul>${(report.communication_dont || []).map((s: string) => `<li>${s}</li>`).join('')}</ul></div></div>` : ''}
      ${report.company_value ? `<h2>Wert für das Unternehmen</h2><p>${report.company_value}</p>` : ''}

      <p class="meta" style="margin-top:32px;text-align:center;">SSM Recruit – Assessment-Report generiert am ${new Date().toLocaleDateString('de-CH')}</p>
      </body></html>`);
      printWindow.document.close();
      printWindow.print();
    } catch (e) {
      console.error('PDF generation error:', e);
    }
    setGeneratingPdf(false);
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Compact Header */}
        <div className="border-b px-5 py-3 flex items-center gap-4 shrink-0 bg-card">
          <div className="flex items-center gap-1">
            <button onClick={() => { if (hasPrev) setSelectedLead(queueLeads[currentIndex - 1]); }} disabled={!hasPrev}
              className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted disabled:opacity-25 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { if (hasNext) setSelectedLead(queueLeads[currentIndex + 1]); }} disabled={!hasNext}
              className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted disabled:opacity-25 transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            {currentIndex >= 0 && (
              <span className="ml-1 text-xs text-muted-foreground tabular-nums">{currentIndex + 1}/{queueLeads.length}</span>
            )}
          </div>
          <div className="h-5 w-px bg-border" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("shrink-0 text-xl font-bold", selectedLead.salutation === 'Frau' ? "text-pink-500" : "text-blue-500")}>
                {selectedLead.salutation === 'Frau' ? '♀' : '♂'}
              </span>
              <h2 className="text-lg font-bold tracking-tight truncate">{selectedLead.name}</h2>
              <LeadStatusBadge status={selectedLead.status} />
              <SourceBadge source={selectedLead.source} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedLead.position || 'Keine Position'} • {selectedLead.plz} {selectedLead.city}</p>
          </div>
          <div className={cn("shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold", roleBgColor, roleColor)}>
            <Shield className="h-3 w-3 inline mr-1" />{roleLabel}-Ansicht
          </div>
        </div>

        {/* Content with Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="flex flex-col h-full">
            <div className="border-b px-5 pt-2 shrink-0 bg-card">
              <TabsList className="bg-transparent gap-1 h-auto p-0">
                <TabsTrigger value="overview" className="rounded-t-lg rounded-b-none border border-b-0 data-[state=active]:bg-background data-[state=active]:shadow-none px-4 py-2 text-xs">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Übersicht
                </TabsTrigger>
                <TabsTrigger value="insights" className="rounded-t-lg rounded-b-none border border-b-0 data-[state=active]:bg-background data-[state=active]:shadow-none px-4 py-2 text-xs">
                  <Brain className="h-3.5 w-3.5 mr-1.5" />Insights & DISC
                </TabsTrigger>
                <TabsTrigger value="documents" className="rounded-t-lg rounded-b-none border border-b-0 data-[state=active]:bg-background data-[state=active]:shadow-none px-4 py-2 text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />Dokumente ({docsCount})
                </TabsTrigger>
                {careerPlan && (
                  <TabsTrigger value="career" className="rounded-t-lg rounded-b-none border border-b-0 data-[state=active]:bg-background data-[state=active]:shadow-none px-4 py-2 text-xs">
                    <GraduationCap className="h-3.5 w-3.5 mr-1.5" />Karriereplan
                  </TabsTrigger>
                )}
                {approvalActivities.length > 0 && (
                  <TabsTrigger value="history" className="rounded-t-lg rounded-b-none border border-b-0 data-[state=active]:bg-background data-[state=active]:shadow-none px-4 py-2 text-xs">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />Verlauf
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* TAB: Übersicht */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto p-5 mt-0">
              <div className="max-w-3xl mx-auto space-y-5">
                {/* Lead-Kurzinfo */}
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Lead-Kurzinfo</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { icon: Mail, label: 'E-Mail', value: selectedLead.email, hideForControlling: true },
                      { icon: Phone, label: 'Telefon', value: selectedLead.phone, hideForControlling: true },
                      { icon: Briefcase, label: 'Position', value: selectedLead.position },
                      { icon: MapPin, label: 'Standort', value: `${selectedLead.plz} ${selectedLead.city}`.trim() },
                      { icon: Calendar, label: 'Leaddatum', value: new Date(selectedLead.createdAt).toLocaleDateString('de-CH') },
                      { icon: User, label: 'Betreuer', value: employee?.name || '—' },
                      { icon: Building2, label: 'Agentur', value: agency?.name || '—' },
                    ].filter(item => !(isControlling && (item as any).hideForControlling)).map(item => (
                      <div key={item.label} className="rounded-lg bg-muted/40 p-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                          <item.icon className="h-3 w-3" />{item.label}
                        </div>
                        <p className={cn("text-sm font-medium truncate", !item.value?.trim() && "text-muted-foreground italic")}>{item.value?.trim() || 'Keine Angabe'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <BarChart3 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                    <p className="text-lg font-bold">{matchScore !== null ? `${matchScore}%` : '—'}</p>
                    <p className="text-[10px] text-muted-foreground">Match Score</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <Brain className="h-5 w-5 text-violet-600 mx-auto mb-1" />
                    <p className={cn("text-sm font-bold", insightsStatus === 'Abgeschlossen' ? 'text-emerald-700' : 'text-amber-600')}>{insightsStatus}</p>
                    <p className="text-[10px] text-muted-foreground">Insights</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <Brain className="h-5 w-5 text-indigo-600 mx-auto mb-1" />
                    <p className="text-sm font-bold">{discType}</p>
                    <p className="text-[10px] text-muted-foreground">DISC Typ</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <Upload className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-lg font-bold">{docsCount}</p>
                    <p className="text-[10px] text-muted-foreground">Dokumente</p>
                  </div>
                </div>

                {/* GL: Controlling-Entscheidung */}
                {(isGeschaeftsleitung || isHR) && (
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-cyan-600" /> Vorherige Freigaben</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-medium">Controlling</span>
                        </div>
                        <span className="text-sm font-medium text-emerald-700">{controllingDecision}</span>
                      </div>
                      {isHR && (
                        <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-medium">Geschäftsleitung</span>
                          </div>
                          <span className="text-sm font-medium text-emerald-700">Freigegeben</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* HR: Onboarding-Info */}
                {isHR && (
                  <div className={cn("rounded-xl border p-4", "border-teal-200 bg-teal-50/50")}>
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-5 w-5 text-teal-700" />
                      <h3 className="text-sm font-semibold text-teal-800">Onboarding bereit</h3>
                    </div>
                    <p className="text-xs text-teal-700">Alle Prüfschritte (Controlling & Management) sind abgeschlossen.</p>
                  </div>
                )}

                {/* Action Button */}
                <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    {isControlling && 'Prüfen Sie Insights, Matching und Dokumente und treffen Sie Ihre Entscheidung.'}
                    {isGeschaeftsleitung && 'Überprüfen Sie die Zusammenfassung und geben Sie den Lead frei oder lehnen Sie ihn ab.'}
                    {isHR && 'Starten Sie den Onboarding-Prozess und setzen Sie den finalen Status.'}
                  </p>
                  <button
                    onClick={() => setWizardOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
                  >
                    {isControlling && <><ClipboardCheck className="h-4 w-4" /> Controlling Prüfung starten</>}
                    {isGeschaeftsleitung && <><Eye className="h-4 w-4" /> Management Review starten</>}
                    {isHR && <><UserCheck className="h-4 w-4" /> Onboarding & Einstellung</>}
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Insights & DISC – Full view */}
            <TabsContent value="insights" className="flex-1 overflow-y-auto p-5 mt-0">
              <div className="max-w-3xl mx-auto">
                {/* Download button */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={generatingPdf}
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {generatingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Assessment-Report herunterladen
                  </button>
                </div>
                <InsightsTab leadId={selectedLead.id} leadName={selectedLead.name} />
              </div>
            </TabsContent>

            {/* TAB: Dokumente */}
            <TabsContent value="documents" className="flex-1 overflow-y-auto p-5 mt-0">
              <div className="max-w-3xl mx-auto space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Hochgeladene Dokumente</h3>
                {documentUploads.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Keine Dokumente vorhanden</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentUploads.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.file_type} • {(doc.file_size / 1024).toFixed(0)} KB • {new Date(doc.uploaded_at).toLocaleDateString('de-CH')}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Vorhanden
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB: Karriereplan */}
            {careerPlan && (
              <TabsContent value="career" className="flex-1 overflow-y-auto p-5 mt-0">
                <div className="max-w-3xl mx-auto">
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-amber-600" /> SSM Karriereplan – {careerPlan.position}</h3>
                    <div className="space-y-2">
                      {careerPlan.levels.map((level, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold flex items-center gap-1.5">
                              <Award className="h-3.5 w-3.5 text-amber-600" />{level.name}
                            </span>
                            <span className="text-xs font-medium rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                              {level.scorePoints} Score-Punkte
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded bg-muted/40 p-2">
                              <span className="text-muted-foreground">Fixlohn:</span>{' '}
                              <span className="font-medium">CHF {level.fixSalary.toLocaleString('de-CH')}</span>
                            </div>
                            <div className="rounded bg-muted/40 p-2">
                              <span className="text-muted-foreground">Spesen:</span>{' '}
                              <span className="font-medium">CHF {level.expenses.toLocaleString('de-CH')}</span>
                            </div>
                          </div>
                          {level.requirements.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <span className="font-medium">Anforderungen:</span> {level.requirements.join(' • ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* TAB: Verlauf */}
            {approvalActivities.length > 0 && (
              <TabsContent value="history" className="flex-1 overflow-y-auto p-5 mt-0">
                <div className="max-w-3xl mx-auto space-y-2">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Approval-Verlauf</h3>
                  {approvalActivities.map(act => (
                    <div key={act.id} className="flex items-start gap-2.5 rounded-lg bg-muted/30 p-3 border">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{act.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{act.user} • {new Date(act.timestamp).toLocaleString('de-CH')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      <ApprovalWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        wizardType={wizardType}
        leadId={selectedLead.id}
        leadName={selectedLead.name}
      />
    </>
  );
}
