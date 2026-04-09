import { useState, useEffect, useMemo } from 'react';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import LeadStatusBadge from './LeadStatusBadge';
import SourceBadge from './SourceBadge';
import ApprovalWizardDialog, { type ApprovalWizardType } from './ApprovalWizardDialog';
import PersonalityProfile from './PersonalityProfile';
import {
  User, MapPin, Mail, Phone, Briefcase, Brain, FileText, BarChart3,
  ClipboardCheck, Shield, CheckCircle2, XCircle,
  UserCheck, Calendar, Eye, Upload, Clock, ChevronLeft, ChevronRight,
  Building2, GraduationCap, TrendingUp, Award, Download, Loader2,
  Target, Users, BookOpen, DollarSign, ThumbsUp, AlertTriangle
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface CareerLevel { name: string; fixSalary: number; expenses: number; scorePoints: number; requirements: string[]; }
interface CareerPlan { id: string; position: string; levels: CareerLevel[]; is_active: boolean; }
interface AssessmentData {
  disc_scores: Record<string, number>;
  motivator_scores: Record<string, number>;
  scores: Record<string, number>;
  match_result: { score: number; level: string; strengths: string[]; risks: string[] };
  recommendation: string;
  report_sections: any;
  summary: { headline: string; description: string; dominant_disc: string; dominant_motivator: string };
  wizard_answers: Record<string, string>;
  completed_at: string;
  raw_ai_response?: any;
}

const motivatorLabels: Record<string, string> = { individualistisch: 'Individualistisch', theoretisch: 'Theoretisch', oekonomisch: 'Ökonomisch', traditionell: 'Traditionell', aesthetisch: 'Ästhetisch', sozial: 'Sozial' };
const motivatorColors: Record<string, string> = { individualistisch: '#8B5CF6', theoretisch: '#3B82F6', oekonomisch: '#F59E0B', traditionell: '#6B7280', aesthetisch: '#EC4899', sozial: '#10B981' };
const discLabels: Record<string, string> = { D: 'Dominant', I: 'Initiativ', S: 'Stetig', C: 'Gewissenhaft' };
const discColors: Record<string, string> = { D: '#dc2626', I: '#d97706', S: '#059669', C: '#2563eb' };
const scoreConfig = [
  { key: 'performance', label: 'Performance', icon: TrendingUp, color: '#EF4444' },
  { key: 'team_fit', label: 'Team Fit', icon: Users, color: '#10B981' },
  { key: 'learning', label: 'Lernfähigkeit', icon: BookOpen, color: '#3B82F6' },
  { key: 'sales', label: 'Sales Potential', icon: DollarSign, color: '#F59E0B' },
  { key: 'culture_fit', label: 'Culture Fit', icon: Shield, color: '#8B5CF6' },
];
const matchLevelConfig: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  perfect: { label: 'Perfekter Match', emoji: '🔥', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  very_good: { label: 'Sehr guter Match', emoji: '✅', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  conditional: { label: 'Bedingt geeignet', emoji: '⚠️', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  no_match: { label: 'Kein Match', emoji: '❌', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};
const recConfig: Record<string, { label: string; color: string; bg: string }> = {
  einstellen: { label: '✅ Einstellen', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-300' },
  weiter_pruefen: { label: '🔍 Weiter prüfen', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-300' },
  ablehnen: { label: '❌ Ablehnen', color: 'text-red-700', bg: 'bg-red-50 border-red-300' },
};

export default function ApprovalLeadView({ onClose }: { onClose: () => void }) {
  const { selectedLead, setSelectedLead, activities, leads, employees, agencies } = useLeads();
  const { isControlling, isGeschaeftsleitung, isHR } = useAuth();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(true);
  const [insightsStatus, setInsightsStatus] = useState('—');
  const [docsCount, setDocsCount] = useState(0);
  const [controllingDecision, setControllingDecision] = useState('—');
  const [careerPlan, setCareerPlan] = useState<CareerPlan | null>(null);
  const [documentUploads, setDocumentUploads] = useState<any[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const wizardType: ApprovalWizardType = isControlling ? 'controlling' : isGeschaeftsleitung ? 'management' : 'hr';

  const queueLeads = useMemo(() => {
    const sf = isControlling ? 'ready_for_controlling' : isGeschaeftsleitung ? 'management_review' : 'hr_processing';
    return leads.filter(l => l.lifecycle === 'active' && l.status === sf);
  }, [leads, isControlling, isGeschaeftsleitung, isHR]);

  const currentIndex = useMemo(() => selectedLead ? queueLeads.findIndex(l => l.id === selectedLead.id) : -1, [selectedLead, queueLeads]);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < queueLeads.length - 1;

  useEffect(() => {
    if (!selectedLead) return;
    setAssessmentLoading(true);
    (async () => {
      const [assessRes, insRes, docsRes, wizRes] = await Promise.all([
        supabase.from('assessment_results').select('*').eq('lead_id', selectedLead.id).order('completed_at', { ascending: false }).limit(1),
        supabase.from('insights_requests').select('status').eq('lead_id', selectedLead.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('document_uploads').select('*').eq('lead_id', selectedLead.id),
        supabase.from('status_wizard_results').select('wizard_type, answers').eq('lead_id', selectedLead.id).order('created_at', { ascending: false }),
      ]);
      setAssessment(assessRes.data?.[0] as unknown as AssessmentData ?? null);
      setAssessmentLoading(false);
      setInsightsStatus(insRes.data?.[0]?.status === 'completed' ? 'Abgeschlossen' : 'Ausstehend');
      setDocsCount(docsRes.data?.length ?? 0);
      setDocumentUploads(docsRes.data ?? []);
      const ctrlResult = wizRes.data?.find((w: any) => w.wizard_type === 'controlling_approval');
      setControllingDecision(ctrlResult ? 'Freigegeben' : (isGeschaeftsleitung || isHR ? 'Freigegeben (auto)' : '—'));
    })();
  }, [selectedLead?.id]);

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

  const approvalActivities = useMemo(() => {
    if (!selectedLead) return [];
    return activities.filter(a => a.leadId === selectedLead.id && a.type === 'status_change' &&
      (a.description.includes('Controlling') || a.description.includes('Management') || a.description.includes('HR') || a.description.includes('Freigegeben') || a.description.includes('Abgelehnt')));
  }, [selectedLead, activities]);

  if (!selectedLead) return null;

  const employee = employees.find(e => e.id === selectedLead.employeeId);
  const agency = agencies.find(a => a.id === selectedLead.agencyId);
  const roleLabel = isControlling ? 'Controlling' : isGeschaeftsleitung ? 'Geschäftsleitung' : 'HR';
  const roleColor = isControlling ? 'text-cyan-700' : isGeschaeftsleitung ? 'text-purple-700' : 'text-teal-700';
  const roleBgColor = isControlling ? 'bg-cyan-50 border-cyan-200' : isGeschaeftsleitung ? 'bg-purple-50 border-purple-200' : 'bg-teal-50 border-teal-200';
  const matchScore = assessment?.match_result?.score ?? null;
  const discType = assessment?.summary?.dominant_disc ?? '—';

  // PDF download
  async function handleDownloadPdf() {
    if (!assessment || !selectedLead) return;
    setGeneratingPdf(true);
    try {
      const { disc_scores, motivator_scores, scores, match_result, summary, report_sections } = assessment;
      const pw = window.open('', '_blank');
      if (!pw) { setGeneratingPdf(false); return; }
      pw.document.write(`<!DOCTYPE html><html><head><title>Assessment – ${selectedLead.name}</title>
      <style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px 30px;color:#1a1a1a;font-size:13px;line-height:1.6}h1{font-size:22px;border-bottom:2px solid #2563eb;padding-bottom:8px}h2{font-size:16px;color:#2563eb;margin-top:28px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.c{border:1px solid #e5e7eb;border-radius:8px;padding:12px}.bw{height:10px;background:#f3f4f6;border-radius:5px;overflow:hidden;margin-top:4px}.b{height:100%;border-radius:5px}ul{padding-left:18px}li{margin-bottom:4px}.m{color:#6b7280;font-size:11px}@media print{body{padding:20px}}</style></head><body>
      <h1>Assessment-Report: ${selectedLead.name}</h1>
      <p class="m">Position: ${selectedLead.position||'—'} • ${new Date(assessment.completed_at).toLocaleDateString('de-CH')}</p>
      ${summary.headline?`<h2>Zusammenfassung</h2><p><strong>${summary.headline}</strong></p><p>${summary.description||''}</p>`:''}
      <h2>Match Score: ${match_result.score}/100</h2>
      <div class="g2"><div class="c"><strong>Stärken</strong><ul>${(match_result.strengths||[]).map((s:string)=>`<li>${s}</li>`).join('')}</ul></div><div class="c"><strong>Risiken</strong><ul>${(match_result.risks||[]).map((r:string)=>`<li>${r}</li>`).join('')}</ul></div></div>
      <h2>Performance Scores</h2>
      ${scoreConfig.map(s=>{const v=(scores as any)[s.key]||0;return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><span>${s.label}</span><strong>${v}%</strong></div><div class="bw"><div class="b" style="width:${v}%;background:${s.color}"></div></div></div>`}).join('')}
      <h2>DISC-Profil</h2>
      <div class="g2">${['D','I','S','C'].map(k=>{const v=(disc_scores as any)[k]||0;return `<div class="c"><strong>${k} – ${discLabels[k]}</strong><div style="font-size:20px;font-weight:bold;color:${discColors[k]}">${v}%</div><div class="bw"><div class="b" style="width:${v}%;background:${discColors[k]}"></div></div></div>`}).join('')}</div>
      ${report_sections.disc_analysis?`<p>${report_sections.disc_analysis}</p>`:''}
      <h2>Motivatoren</h2>
      ${Object.entries(motivator_scores).map(([k,v])=>`<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><span style="text-transform:capitalize">${k}</span><strong>${v}%</strong></div><div class="bw"><div class="b" style="width:${v}%;background:${motivatorColors[k]||'#2563eb'}"></div></div></div>`).join('')}
      ${report_sections.motivator_analysis?`<p>${report_sections.motivator_analysis}</p>`:''}
      ${report_sections.integration?`<h2>Integration</h2><p>${report_sections.integration}</p>`:''}
      ${report_sections.strengths_profile?.length?`<h2>Stärkenprofil</h2><ul>${report_sections.strengths_profile.map((s:string)=>`<li>${s}</li>`).join('')}</ul>`:''}
      ${report_sections.improvement_areas?.length?`<h2>Verbesserungsbereiche</h2><ul>${report_sections.improvement_areas.map((s:string)=>`<li>${s}</li>`).join('')}</ul>`:''}
      ${(report_sections.communication_do?.length||report_sections.communication_dont?.length)?`<h2>Kommunikation</h2><div class="g2"><div class="c"><strong>✅ DO</strong><ul>${(report_sections.communication_do||[]).map((s:string)=>`<li>${s}</li>`).join('')}</ul></div><div class="c"><strong>❌ DON'T</strong><ul>${(report_sections.communication_dont||[]).map((s:string)=>`<li>${s}</li>`).join('')}</ul></div></div>`:''}
      ${report_sections.company_value?`<h2>Unternehmenswert</h2><p>${report_sections.company_value}</p>`:''}
      <p class="m" style="margin-top:32px;text-align:center">SSM Recruit – ${new Date().toLocaleDateString('de-CH')}</p></body></html>`);
      pw.document.close();
      pw.print();
    } catch(e) { console.error(e); }
    setGeneratingPdf(false);
  }

  // Radar data
  const discRadarData = assessment ? Object.entries(assessment.disc_scores).map(([k, v]) => ({ dimension: discLabels[k] || k, value: v })) : [];
  const motivatorRadarData = assessment ? Object.entries(assessment.motivator_scores).map(([k, v]) => ({ dimension: motivatorLabels[k] || k, value: v })) : [];
  const matchLevel = assessment ? (matchLevelConfig[assessment.match_result.level] || matchLevelConfig.conditional) : null;
  const rec = assessment ? (recConfig[assessment.recommendation] || recConfig.weiter_pruefen) : null;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
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
            {currentIndex >= 0 && <span className="ml-1 text-xs text-muted-foreground tabular-nums">{currentIndex + 1}/{queueLeads.length}</span>}
          </div>
          <div className="h-5 w-px bg-border" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("shrink-0 text-xl font-bold", selectedLead.salutation === 'Frau' ? "text-pink-500" : "text-blue-500")}>
                {selectedLead.salutation === 'Frau' ? '♀' : '♂'}
              </span>
              <h2 className="text-lg font-bold tracking-tight truncate">{selectedLead.name}</h2>
              <LeadStatusBadge status={selectedLead.status} />
              <SourceBadge source={selectedLead.source} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedLead.position || 'Keine Position'} • {selectedLead.plz} {selectedLead.city}</p>
          </div>
          <div className={cn("shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold mr-10", roleBgColor, roleColor)}>
            <Shield className="h-3 w-3 inline mr-1" />{roleLabel}-Ansicht
          </div>
        </div>

        {/* Tabs */}
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
                {approvalActivities.length > 0 && (
                  <TabsTrigger value="history" className="rounded-t-lg rounded-b-none border border-b-0 data-[state=active]:bg-background data-[state=active]:shadow-none px-4 py-2 text-xs">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />Verlauf
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* ─── TAB: Übersicht ─── */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto p-5 mt-0">
              <div className="max-w-4xl mx-auto space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Left: Lead info */}
                  <div className="lg:col-span-2 rounded-xl border bg-card p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Lead-Kurzinfo</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { icon: Mail, label: 'E-Mail', value: selectedLead.email, hide: isControlling },
                        { icon: Phone, label: 'Telefon', value: selectedLead.phone, hide: isControlling },
                        { icon: Briefcase, label: 'Position', value: selectedLead.position },
                        { icon: MapPin, label: 'Standort', value: `${selectedLead.plz} ${selectedLead.city}`.trim() },
                        { icon: Calendar, label: 'Leaddatum', value: new Date(selectedLead.createdAt).toLocaleDateString('de-CH') },
                        { icon: User, label: 'Betreuer', value: employee?.name || '—' },
                        { icon: Building2, label: 'Agentur', value: agency?.name || '—' },
                      ].filter(i => !i.hide).map(item => (
                        <div key={item.label} className="rounded-lg bg-muted/40 p-2.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5"><item.icon className="h-3 w-3" />{item.label}</div>
                          <p className={cn("text-sm font-medium truncate", !item.value?.trim() && "text-muted-foreground italic")}>{item.value?.trim() || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Right: Quick Stats */}
                  <div className="space-y-3">
                    <div className="rounded-xl border p-4 text-center">
                      <BarChart3 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold">{matchScore !== null ? `${matchScore}%` : '—'}</p>
                      <p className="text-xs text-muted-foreground">Match Score</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border p-2.5 text-center">
                        <Brain className="h-4 w-4 text-violet-600 mx-auto mb-0.5" />
                        <p className={cn("text-[11px] font-bold", insightsStatus === 'Abgeschlossen' ? 'text-emerald-700' : 'text-amber-600')}>{insightsStatus}</p>
                        <p className="text-[9px] text-muted-foreground">Insights</p>
                      </div>
                      <div className="rounded-lg border p-2.5 text-center">
                        <Brain className="h-4 w-4 text-indigo-600 mx-auto mb-0.5" />
                        <p className="text-[11px] font-bold">{discType}</p>
                        <p className="text-[9px] text-muted-foreground">DISC</p>
                      </div>
                      <div className="rounded-lg border p-2.5 text-center">
                        <Upload className="h-4 w-4 text-blue-600 mx-auto mb-0.5" />
                        <p className="text-[11px] font-bold">{docsCount}</p>
                        <p className="text-[9px] text-muted-foreground">Docs</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GL/HR: Previous approvals */}
                {(isGeschaeftsleitung || isHR) && (
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-cyan-600" /> Vorherige Freigaben</h3>
                    <div className="flex gap-3">
                      <div className="flex-1 flex items-center justify-between rounded-lg bg-muted/40 p-3">
                        <span className="text-sm font-medium flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Controlling</span>
                        <span className="text-sm font-medium text-emerald-700">{controllingDecision}</span>
                      </div>
                      {isHR && (
                        <div className="flex-1 flex items-center justify-between rounded-lg bg-muted/40 p-3">
                          <span className="text-sm font-medium flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />GL</span>
                          <span className="text-sm font-medium text-emerald-700">Freigegeben</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Karriereplan inline */}
                {careerPlan && (
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-amber-600" /> SSM Karriereplan – {careerPlan.position}</h3>
                    <div className="space-y-2">
                      {careerPlan.levels.map((level, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-600" />{level.name}</span>
                            <span className="text-xs font-medium rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">{level.scorePoints} Score-Punkte</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded bg-muted/40 p-2"><span className="text-muted-foreground">Fixlohn:</span> <span className="font-medium">CHF {level.fixSalary.toLocaleString('de-CH')}</span></div>
                            <div className="rounded bg-muted/40 p-2"><span className="text-muted-foreground">Spesen:</span> <span className="font-medium">CHF {level.expenses.toLocaleString('de-CH')}</span></div>
                          </div>
                          {level.requirements.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground"><span className="font-medium">Anforderungen:</span> {level.requirements.join(' • ')}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    {isControlling && 'Prüfen Sie Insights, Matching und Dokumente und treffen Sie Ihre Entscheidung.'}
                    {isGeschaeftsleitung && 'Überprüfen Sie die Zusammenfassung und geben Sie den Lead frei oder lehnen Sie ihn ab.'}
                    {isHR && 'Starten Sie den Onboarding-Prozess und setzen Sie den finalen Status.'}
                  </p>
                  <button onClick={() => setWizardOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm">
                    {isControlling && <><ClipboardCheck className="h-4 w-4" /> Controlling Prüfung starten</>}
                    {isGeschaeftsleitung && <><Eye className="h-4 w-4" /> Management Review starten</>}
                    {isHR && <><UserCheck className="h-4 w-4" /> Onboarding & Einstellung</>}
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* ─── TAB: Insights & DISC – Two-column layout ─── */}
            <TabsContent value="insights" className="flex-1 overflow-y-auto p-5 mt-0">
              {assessmentLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : !assessment ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium">Assessment ausstehend</p>
                  <p className="text-xs text-muted-foreground mt-1">Für diesen Kandidaten liegt noch kein Assessment vor.</p>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-5">
                  {/* Top: Summary + Download */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 border border-orange-200 shrink-0">
                        <Brain className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{assessment.summary.headline}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Abgeschlossen am {new Date(assessment.completed_at).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <button onClick={handleDownloadPdf} disabled={generatingPdf}
                      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50 shrink-0">
                      {generatingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Report drucken / PDF
                    </button>
                  </div>

                  {/* Description */}
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs leading-relaxed text-muted-foreground">{assessment.summary.description}</p>
                  </div>

                  {/* ── Personality Profile (ADD-ONLY) ── */}
                  <PersonalityProfile data={assessment as any} />

                  {/* Row 1: Match + Recommendation + Scores */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className={cn("rounded-xl border p-4", matchLevel?.bg)}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Match Score</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{assessment.match_result.score}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      <p className={cn("text-xs font-semibold mt-1", matchLevel?.color)}>{matchLevel?.emoji} {matchLevel?.label}</p>
                    </div>
                    <div className={cn("rounded-xl border p-4", rec?.bg)}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Empfehlung</p>
                      <p className={cn("text-lg font-bold", rec?.color)}>{rec?.label}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Dominante Profile</p>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-lg" style={{ backgroundColor: discColors[assessment.summary.dominant_disc] || '#6B7280' }}>
                          {assessment.summary.dominant_disc}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{discLabels[assessment.summary.dominant_disc]}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">Motivator: {motivatorLabels[assessment.summary.dominant_motivator] || assessment.summary.dominant_motivator}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Left = DISC + Motivators Radar, Right = Performance Scores */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Radar Charts */}
                    <div className="space-y-4">
                      <div className="rounded-xl border p-4">
                        <p className="text-xs font-semibold mb-2">DISC Verhaltensanalyse</p>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={discRadarData} cx="50%" cy="50%" outerRadius="70%">
                              <PolarGrid stroke="hsl(var(--border))" />
                              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar name="DISC" dataKey="value" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} strokeWidth={2} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        {/* DISC bars */}
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {(['D', 'I', 'S', 'C'] as const).map(k => {
                            const val = assessment.disc_scores[k] || 0;
                            return (
                              <div key={k} className="text-center">
                                <div className="h-12 flex items-end justify-center mb-1">
                                  <div className="w-5 rounded-t" style={{ height: `${Math.max(val, 5)}%`, backgroundColor: discColors[k] }} />
                                </div>
                                <p className="text-xs font-bold" style={{ color: discColors[k] }}>{val}%</p>
                                <p className="text-[9px] text-muted-foreground">{discLabels[k]}</p>
                              </div>
                            );
                          })}
                        </div>
                        {assessment.report_sections.disc_analysis && (
                          <p className="text-xs text-muted-foreground leading-relaxed mt-3 border-t pt-3">{assessment.report_sections.disc_analysis}</p>
                        )}
                      </div>

                      <div className="rounded-xl border p-4">
                        <p className="text-xs font-semibold mb-2">Motivatoren Analyse</p>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={motivatorRadarData} cx="50%" cy="50%" outerRadius="70%">
                              <PolarGrid stroke="hsl(var(--border))" />
                              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9 }} />
                              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar name="Motivatoren" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} strokeWidth={2} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-1.5 mt-3">
                          {Object.entries(assessment.motivator_scores).sort(([,a],[,b]) => (b as number) - (a as number)).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="text-[10px] w-28 text-muted-foreground">{motivatorLabels[k] || k}</span>
                              <div className="flex-1 h-2 rounded-full bg-muted">
                                <div className="h-2 rounded-full" style={{ width: `${v}%`, backgroundColor: motivatorColors[k] || '#6B7280' }} />
                              </div>
                              <span className="text-[10px] font-bold w-8 text-right">{v as number}%</span>
                            </div>
                          ))}
                        </div>
                        {assessment.report_sections.motivator_analysis && (
                          <p className="text-xs text-muted-foreground leading-relaxed mt-3 border-t pt-3">{assessment.report_sections.motivator_analysis}</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Performance + Stärken/Risiken + Kommunikation */}
                    <div className="space-y-4">
                      {/* Performance Scores */}
                      <div className="rounded-xl border p-4">
                        <p className="text-xs font-semibold mb-3">Performance Scores</p>
                        <div className="space-y-3">
                          {scoreConfig.map(s => {
                            const val = (assessment.scores as any)[s.key] || 0;
                            const Icon = s.icon;
                            return (
                              <div key={s.key}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                                    <span className="text-xs font-medium">{s.label}</span>
                                  </div>
                                  <span className="text-xs font-bold">{val}%</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, backgroundColor: s.color }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Strengths + Risks */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border p-4">
                          <p className="text-xs font-semibold flex items-center gap-1 mb-2"><ThumbsUp className="h-3.5 w-3.5 text-emerald-600" /> Stärken</p>
                          <ul className="space-y-1">
                            {assessment.match_result.strengths?.map((s, i) => (
                              <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5">•</span>{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border p-4">
                          <p className="text-xs font-semibold flex items-center gap-1 mb-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Risiken</p>
                          <ul className="space-y-1">
                            {assessment.match_result.risks?.map((r, i) => (
                              <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <span className="text-amber-500 mt-0.5">•</span>{r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Communication Guidelines */}
                      {(assessment.report_sections.communication_do?.length > 0 || assessment.report_sections.communication_dont?.length > 0) && (
                        <div className="rounded-xl border p-4">
                          <p className="text-xs font-semibold mb-2">Kommunikations-Guidelines</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-semibold text-emerald-700 mb-1">✅ DO</p>
                              <ul className="space-y-0.5">
                                {assessment.report_sections.communication_do?.map((s: string, i: number) => (
                                  <li key={i} className="text-[10px] text-muted-foreground">• {s}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-red-700 mb-1">❌ DON'T</p>
                              <ul className="space-y-0.5">
                                {assessment.report_sections.communication_dont?.map((s: string, i: number) => (
                                  <li key={i} className="text-[10px] text-muted-foreground">• {s}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Strengths Profile */}
                      {assessment.report_sections.strengths_profile?.length > 0 && (
                        <div className="rounded-xl border p-4">
                          <p className="text-xs font-semibold mb-2">Stärkenprofil</p>
                          <ul className="space-y-1">
                            {assessment.report_sections.strengths_profile.map((s: string, i: number) => (
                              <li key={i} className="text-[11px] flex items-start gap-2">
                                <Award className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Improvement Areas */}
                      {assessment.report_sections.improvement_areas?.length > 0 && (
                        <div className="rounded-xl border p-4">
                          <p className="text-xs font-semibold mb-2">Verbesserungsbereiche</p>
                          <ul className="space-y-1">
                            {assessment.report_sections.improvement_areas.map((s: string, i: number) => (
                              <li key={i} className="text-[11px] flex items-start gap-2">
                                <Target className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Bottom full-width sections */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {assessment.report_sections.integration && (
                      <div className="rounded-xl border p-4">
                        <p className="text-xs font-semibold mb-2">Integration Verhalten + Motivatoren</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{assessment.report_sections.integration}</p>
                      </div>
                    )}
                    {assessment.report_sections.natural_vs_adapted && (
                      <div className="rounded-xl border p-4">
                        <p className="text-xs font-semibold mb-2">Natürlicher vs. Adaptierter Stil</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{assessment.report_sections.natural_vs_adapted}</p>
                      </div>
                    )}
                  </div>
                  {assessment.report_sections.company_value && (
                    <div className="rounded-xl border p-4">
                      <p className="text-xs font-semibold mb-2">Wert für das Unternehmen</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{assessment.report_sections.company_value}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ─── TAB: Dokumente ─── */}
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
                            <p className="text-xs text-muted-foreground">{doc.file_type} • {(doc.file_size / 1024).toFixed(0)} KB • {new Date(doc.uploaded_at).toLocaleDateString('de-CH')}</p>
                          </div>
                        </div>
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Vorhanden</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>


            {/* ─── TAB: Verlauf ─── */}
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

      <ApprovalWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} wizardType={wizardType} leadId={selectedLead.id} leadName={selectedLead.name} />
    </>
  );
}
