import { useState, useEffect, useMemo } from 'react';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { statusConfig, type LeadStatus } from '@/lib/mock-data';
import LeadStatusBadge from './LeadStatusBadge';
import SourceBadge from './SourceBadge';
import ApprovalWizardDialog, { type ApprovalWizardType } from './ApprovalWizardDialog';
import {
  User, MapPin, Mail, Phone, Briefcase, Brain, FileText, BarChart3,
  ClipboardCheck, Shield, CheckCircle2, XCircle, HelpCircle,
  UserCheck, Calendar, Eye, Upload, Clock, ChevronLeft, ChevronRight,
  Building2, GraduationCap, TrendingUp, Award
} from 'lucide-react';

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
  const [discScores, setDiscScores] = useState<Record<string, number> | null>(null);
  const [motivatorScores, setMotivatorScores] = useState<Record<string, number> | null>(null);

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
        supabase.from('document_uploads').select('id').eq('lead_id', selectedLead.id),
        supabase.from('status_wizard_results').select('wizard_type, answers').eq('lead_id', selectedLead.id).order('created_at', { ascending: false }),
      ]);

      if (assessRes.data?.[0]) {
        const mr = assessRes.data[0].match_result as any;
        setMatchScore(mr?.overall_score ?? mr?.overallScore ?? null);
        setDiscScores(assessRes.data[0].disc_scores as Record<string, number> | null);
        setMotivatorScores(assessRes.data[0].motivator_scores as Record<string, number> | null);
      } else { setMatchScore(null); setDiscScores(null); setMotivatorScores(null); }

      setInsightsStatus(insRes.data?.[0]?.status === 'completed' ? 'Abgeschlossen' : 'Ausstehend');
      setDiscType(discRes.data?.[0]?.dominant_type ?? '—');
      setDocsCount(docsRes.data?.length ?? 0);

      const ctrlResult = wizRes.data?.find((w: any) => w.wizard_type === 'controlling_approval');
      setControllingDecision(ctrlResult ? 'Freigegeben' : (isGeschaeftsleitung || isHR ? 'Freigegeben (auto)' : '—'));
    })();
  }, [selectedLead?.id]);

  // Load career plan matching the lead's position
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Lead-Kurzinfo Card */}
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
                ].filter(item => !(isControlling && (item as any).hideForControlling)).map(item => (
                  <div key={item.label} className="rounded-lg bg-muted/40 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                      <item.icon className="h-3 w-3" />{item.label}
                    </div>
                    <p className={cn("text-sm font-medium truncate", !item.value?.trim() && "text-muted-foreground italic")}>{item.value?.trim() || 'Keine Angabe'}</p>
                  </div>
                ))}
              </div>
              {selectedLead.notes && (
                <div className="mt-3 rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">Notizen</p>
                  <p className="text-sm">{selectedLead.notes}</p>
                </div>
              )}
            </div>

            {/* Controlling: Matching + Insights + Dokumente */}
            {(isControlling || isGeschaeftsleitung) && (
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-600" /> Prüfergebnisse</h3>
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
              </div>
            )}

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
                <p className="text-xs text-teal-700">Alle Prüfschritte (Controlling & Management) sind abgeschlossen. Starten Sie den Onboarding-Prozess und setzen Sie den finalen Status «Eingestellt».</p>
              </div>
            )}

            {/* Approval History */}
            {approvalActivities.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Approval-Verlauf</h3>
                <div className="space-y-2">
                  {approvalActivities.map(act => (
                    <div key={act.id} className="flex items-start gap-2.5 rounded-lg bg-muted/30 p-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{act.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{act.user} • {new Date(act.timestamp).toLocaleString('de-CH')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button - prominent */}
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
