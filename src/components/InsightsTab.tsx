import { useState, useEffect, useMemo } from 'react';
import { useLeads } from '@/context/useLeads';
import { discDimensionConfig, type DiscDimension } from '@/lib/mock-data';
import { supabase } from '@/integrations/supabase/client';
import { Brain, CheckCircle2, RotateCcw, Loader2, Target, TrendingUp, Users, BookOpen, DollarSign, Shield, ThumbsUp, ThumbsDown, AlertTriangle, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import PersonalityProfile from './PersonalityProfile';

interface InsightsTabProps {
  leadId: string;
  leadName: string;
}

interface AssessmentResult {
  id: string;
  disc_scores: Record<string, number>;
  motivator_scores: Record<string, number>;
  wizard_answers: Record<string, string>;
  scores: { performance: number; team_fit: number; learning: number; sales: number; culture_fit: number };
  match_result: { score: number; level: string; strengths: string[]; risks: string[] };
  recommendation: string;
  recommendation_reason?: string;
  report_sections: {
    disc_analysis: string;
    motivator_analysis: string;
    integration: string;
    strengths_profile: string[];
    improvement_areas: string[];
    natural_vs_adapted: string;
    communication_do: string[];
    communication_dont: string[];
    company_value: string;
  };
  summary: { headline: string; description: string; dominant_disc: string; dominant_motivator: string };
  raw_ai_response?: any;
  completed_at: string;
}

const motivatorLabels: Record<string, string> = {
  individualistisch: 'Individualistisch',
  theoretisch: 'Theoretisch',
  oekonomisch: 'Ökonomisch',
  traditionell: 'Traditionell',
  aesthetisch: 'Ästhetisch',
  sozial: 'Sozial',
};

const motivatorColors: Record<string, string> = {
  individualistisch: '#8B5CF6',
  theoretisch: '#3B82F6',
  oekonomisch: '#F59E0B',
  traditionell: '#6B7280',
  aesthetisch: '#EC4899',
  sozial: '#10B981',
};

const scoreConfig: { key: string; label: string; icon: any; color: string }[] = [
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

const recommendationConfig: Record<string, { label: string; color: string; bg: string }> = {
  einstellen: { label: '✅ Einstellen', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-300' },
  weiter_pruefen: { label: '🔍 Weiter prüfen', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-300' },
  ablehnen: { label: '❌ Ablehnen', color: 'text-red-700', bg: 'bg-red-50 border-red-300' },
};

export default function InsightsTab({ leadId, leadName }: InsightsTabProps) {
  const { discResults } = useLeads();
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ scores: true, match: true });

  const discResult = useMemo(() => discResults.find(r => r.leadId === leadId), [discResults, leadId]);

  useEffect(() => {
    loadAssessment();
  }, [leadId]);

  async function loadAssessment() {
    setLoadingAssessment(true);
    const { data } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('lead_id', leadId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    if (data) setAssessment(data as unknown as AssessmentResult);
    setLoadingAssessment(false);
  }

  function toggleSection(key: string) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  if (loadingAssessment) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  /* ── No assessment yet, show basic DISC if available ── */
  if (!assessment) {
    if (!discResult) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200">
            <Brain className="h-8 w-8 text-orange-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Assessment ausstehend</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Für {leadName} liegt noch kein Assessment vor. Sende den Insights-Link, um den 6-Step-Wizard zu starten.
            </p>
          </div>
        </div>
      );
    }

    // Show basic DISC only
    return <BasicDiscView result={discResult} leadName={leadName} />;
  }

  /* ── Full assessment view ── */
  const { scores, match_result, recommendation, report_sections, summary } = assessment;
  const matchLevel = matchLevelConfig[match_result.level] || matchLevelConfig.conditional;
  const recConfig = recommendationConfig[recommendation] || recommendationConfig.weiter_pruefen;

  // Radar data for DISC
  const discRadarData = Object.entries(assessment.disc_scores).map(([key, value]) => ({
    dimension: discDimensionConfig[key as DiscDimension]?.fullLabel || key,
    value,
  }));

  // Radar data for motivators
  const motivatorRadarData = Object.entries(assessment.motivator_scores).map(([key, value]) => ({
    dimension: motivatorLabels[key] || key,
    value,
  }));

  // Score bar data
  const scoreBarData = scoreConfig.map(s => ({
    name: s.label,
    value: (scores as any)[s.key] || 0,
    color: s.color,
  }));

  return (
    <div className="space-y-5 text-sm">
      {/* ── Header: Summary ── */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 border border-orange-200 shrink-0">
          <Brain className="h-6 w-6 text-orange-600" />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold">{summary.headline || `Assessment von ${leadName}`}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Abgeschlossen am {new Date(assessment.completed_at).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Summary description */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">{summary.description}</p>
      </div>

      {/* ── Personality Profile (ADD-ONLY) ── */}
      <PersonalityProfile data={{ ...(assessment as any), match_interpretation: (assessment as any).raw_ai_response?.match_interpretation }} />

      {/* ── Match Score + Recommendation ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl border p-4 ${matchLevel.bg}`}>
          <p className="text-xs font-medium text-muted-foreground mb-1">Match Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{match_result.score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <p className={`text-xs font-semibold mt-1 ${matchLevel.color}`}>{matchLevel.emoji} {matchLevel.label}</p>
        </div>
        <div className={`rounded-xl border p-4 ${recConfig.bg}`}>
          <p className="text-xs font-medium text-muted-foreground mb-1">Empfehlung</p>
          <p className={`text-lg font-bold ${recConfig.color}`}>{recConfig.label}</p>
          {assessment.raw_ai_response?.recommendation_reason && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{(assessment.raw_ai_response as any).recommendation_reason}</p>
          )}
        </div>
      </div>

      {/* ── Scores Section ── */}
      <CollapsibleSection title="Performance Scores" expanded={expandedSections.scores} onToggle={() => toggleSection('scores')}>
        <div className="space-y-3">
          {scoreConfig.map(s => {
            const val = (scores as any)[s.key] || 0;
            const Icon = s.icon;
            return (
              <div key={s.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: s.color }} />
                    <span className="font-medium text-xs">{s.label}</span>
                  </div>
                  <span className="font-bold text-xs">{val}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, backgroundColor: s.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* ── DISC Radar ── */}
      <CollapsibleSection title="DISC Verhaltensanalyse" expanded={expandedSections.disc} onToggle={() => toggleSection('disc')}>
        <div className="h-[220px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={discRadarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="DISC" dataKey="value" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {report_sections.disc_analysis && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">{report_sections.disc_analysis}</p>
        )}
      </CollapsibleSection>

      {/* ── Motivatoren Radar ── */}
      <CollapsibleSection title="Motivatoren Analyse" expanded={expandedSections.motivators} onToggle={() => toggleSection('motivators')}>
        <div className="h-[220px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={motivatorRadarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Motivatoren" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {report_sections.motivator_analysis && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">{report_sections.motivator_analysis}</p>
        )}
      </CollapsibleSection>

      {/* ── Match Details ── */}
      <CollapsibleSection title="Match Details" expanded={expandedSections.match} onToggle={() => toggleSection('match')}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5 text-emerald-600" /> Stärken</p>
            <ul className="space-y-1">
              {match_result.strengths?.map((s, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Risiken</p>
            <ul className="space-y-1">
              {match_result.risks?.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Report Sections ── */}
      {report_sections.integration && (
        <CollapsibleSection title="Integration Verhalten + Motivatoren" expanded={expandedSections.integration} onToggle={() => toggleSection('integration')}>
          <p className="text-xs text-muted-foreground leading-relaxed">{report_sections.integration}</p>
        </CollapsibleSection>
      )}

      {report_sections.strengths_profile?.length > 0 && (
        <CollapsibleSection title="Stärkenprofil" expanded={expandedSections.strengths_profile} onToggle={() => toggleSection('strengths_profile')}>
          <ul className="space-y-1.5">
            {report_sections.strengths_profile.map((s, i) => (
              <li key={i} className="text-xs flex items-start gap-2">
                <Award className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {report_sections.improvement_areas?.length > 0 && (
        <CollapsibleSection title="Verbesserungsbereiche" expanded={expandedSections.improvement} onToggle={() => toggleSection('improvement')}>
          <ul className="space-y-1.5">
            {report_sections.improvement_areas.map((s, i) => (
              <li key={i} className="text-xs flex items-start gap-2">
                <Target className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {report_sections.natural_vs_adapted && (
        <CollapsibleSection title="Natürlicher vs Adaptierter Stil" expanded={expandedSections.natural} onToggle={() => toggleSection('natural')}>
          <p className="text-xs text-muted-foreground leading-relaxed">{report_sections.natural_vs_adapted}</p>
        </CollapsibleSection>
      )}

      {(report_sections.communication_do?.length > 0 || report_sections.communication_dont?.length > 0) && (
        <CollapsibleSection title="Kommunikations-Guidelines" expanded={expandedSections.communication} onToggle={() => toggleSection('communication')}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-700">✅ DO</p>
              <ul className="space-y-1">
                {report_sections.communication_do?.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-700">❌ DON'T</p>
              <ul className="space-y-1">
                {report_sections.communication_dont?.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                ))}
              </ul>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {report_sections.company_value && (
        <CollapsibleSection title="Wert für das Unternehmen" expanded={expandedSections.company_value} onToggle={() => toggleSection('company_value')}>
          <p className="text-xs text-muted-foreground leading-relaxed">{report_sections.company_value}</p>
        </CollapsibleSection>
      )}
    </div>
  );
}

/* ── Collapsible Section ── */
function CollapsibleSection({ title, expanded, onToggle, children }: { title: string; expanded?: boolean; onToggle: () => void; children: React.ReactNode }) {
  const isOpen = expanded ?? false;
  return (
    <div className="rounded-xl border">
      <button type="button" onClick={onToggle} className="flex items-center justify-between w-full px-4 py-3 text-left">
        <span className="text-xs font-semibold">{title}</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ── Basic DISC View (fallback when no AI assessment) ── */
function BasicDiscView({ result, leadName }: { result: any; leadName: string }) {
  const sorted = (Object.entries(result.scores) as [DiscDimension, number][]).sort((a, b) => b[1] - a[1]);
  const dominant = discDimensionConfig[result.dominantType];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 border border-orange-200">
          <Brain className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">DISC-Profil von {leadName}</h4>
          <p className="text-xs text-muted-foreground">
            Abgeschlossen am {new Date(result.completedAt).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-[10px] text-amber-600 mt-0.5">Nur DISC – kein vollständiges Assessment vorhanden</p>
        </div>
      </div>
      <div className={`rounded-xl border p-4 ${dominant.color}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold">{result.dominantType}</span>
          <div>
            <p className="font-semibold text-sm">{dominant.fullLabel}</p>
            <p className="text-xs opacity-80">{dominant.description}</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {sorted.map(([dim, score]) => {
          const cfg = discDimensionConfig[dim];
          return (
            <div key={dim} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold border ${cfg.color}`}>{dim}</span>
                  <span className="font-medium">{cfg.fullLabel}</span>
                </div>
                <span className="font-semibold">{score}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${score}%`, backgroundColor: dim === 'D' ? '#dc2626' : dim === 'I' ? '#d97706' : dim === 'S' ? '#059669' : '#2563eb' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
