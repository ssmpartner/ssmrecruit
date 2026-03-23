import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle2, Loader2, AlertCircle, Brain, ClipboardList,
  CalendarPlus, Plus, Trash2, Target, User, Sparkles, ChevronRight, ChevronLeft,
} from 'lucide-react';

/* ───── types ───── */
interface InsightsQuestion { key: string; label: string; question: string }
interface DiscQuestionItem { text: string; dimension: 'D' | 'I' | 'S' | 'C' }
interface MotivatorQuestion { text: string; dimension: string }
interface TimeSlot { date: string; time: string }

/* ───── defaults ───── */
const defaultInsightsQuestions: InsightsQuestion[] = [
  { key: 'motivation', label: 'Motivation', question: 'Was motiviert Sie, eine neue berufliche Herausforderung zu suchen?' },
  { key: 'experience', label: 'Erfahrung', question: 'Beschreiben Sie Ihre relevanteste berufliche Erfahrung.' },
  { key: 'availability', label: 'Verfügbarkeit', question: 'Ab wann sind Sie verfügbar und wie flexibel sind Sie bezüglich Arbeitszeiten?' },
  { key: 'goals', label: 'Ziele', question: 'Was sind Ihre beruflichen Ziele für die nächsten 2-3 Jahre?' },
  { key: 'strengths', label: 'Stärken', question: 'Was sind Ihre grössten Stärken und wie setzen Sie diese im Beruf ein?' },
  { key: 'salary', label: 'Gehaltsvorstellung', question: 'Was sind Ihre Gehaltsvorstellungen?' },
];
const defaultDiscQuestions: DiscQuestionItem[] = [
  { text: 'Ich treffe Entscheidungen schnell und entschlossen.', dimension: 'D' },
  { text: 'Ich arbeite gerne mit anderen Menschen zusammen und bin gesellig.', dimension: 'I' },
  { text: 'Ich bevorzuge ein stabiles und vorhersehbares Arbeitsumfeld.', dimension: 'S' },
  { text: 'Ich achte auf Details und arbeite sehr genau.', dimension: 'C' },
  { text: 'Ich übernehme gerne die Führung in Gruppen.', dimension: 'D' },
  { text: 'Ich kann andere leicht begeistern und motivieren.', dimension: 'I' },
  { text: 'Ich bin geduldig und höre anderen aufmerksam zu.', dimension: 'S' },
  { text: 'Ich plane sorgfältig, bevor ich handle.', dimension: 'C' },
  { text: 'Herausforderungen spornen mich an.', dimension: 'D' },
  { text: 'Ich kommuniziere offen und ausdrucksstark.', dimension: 'I' },
  { text: 'Konflikte versuche ich zu vermeiden und Harmonie zu bewahren.', dimension: 'S' },
  { text: 'Ich hinterfrage Dinge kritisch und prüfe Fakten.', dimension: 'C' },
];
const defaultMotivatorQuestions: MotivatorQuestion[] = [
  { text: 'Ich übernehme gerne Verantwortung und treffe Entscheidungen.', dimension: 'individualistisch' },
  { text: 'Es motiviert mich, Einfluss auf andere oder Ergebnisse zu haben.', dimension: 'individualistisch' },
  { text: 'Ein hoher finanzieller Erfolg ist für mich ein wichtiger Antrieb.', dimension: 'oekonomisch' },
  { text: 'Ich denke oft daran, wie ich meine Leistung in konkrete Ergebnisse umwandeln kann.', dimension: 'oekonomisch' },
  { text: 'Ich habe Freude daran, neue Dinge zu lernen und zu verstehen.', dimension: 'theoretisch' },
  { text: 'Ich hinterfrage gerne Zusammenhänge, um ein tieferes Verständnis zu bekommen.', dimension: 'theoretisch' },
  { text: 'Ich unterstütze gerne andere Menschen, auch ohne direkten Vorteil für mich.', dimension: 'sozial' },
  { text: 'Es ist mir wichtig, dass sich andere in meinem Umfeld wohlfühlen.', dimension: 'sozial' },
  { text: 'Ein angenehmes und harmonisches Umfeld steigert meine Motivation.', dimension: 'aesthetisch' },
  { text: 'Ich lege Wert auf Ausgleich und eine gute Balance im Alltag.', dimension: 'aesthetisch' },
  { text: 'Klare Regeln und Strukturen helfen mir, effektiv zu arbeiten.', dimension: 'traditionell' },
  { text: 'Ich orientiere mich gerne an bewährten Vorgehensweisen.', dimension: 'traditionell' },
];
const workstyleQuestions = [
  { key: 'work_experience', label: 'Berufserfahrung', question: 'Wie viele Jahre Berufserfahrung haben Sie in Ihrem Fachgebiet?', type: 'select' as const, options: ['< 1 Jahr', '1-3 Jahre', '3-5 Jahre', '5-10 Jahre', '10+ Jahre'] },
  { key: 'career_goal', label: 'Karriereziel', question: 'Was ist Ihr wichtigstes berufliches Ziel?', type: 'select' as const, options: ['Karriereaufstieg', 'Finanzielle Sicherheit', 'Work-Life-Balance', 'Fachliche Expertise', 'Eigenes Unternehmen'] },
  { key: 'work_style', label: 'Arbeitsstil', question: 'Wie arbeiten Sie am liebsten?', type: 'select' as const, options: ['Im Team', 'Alleine', 'Flexibel – je nach Aufgabe', 'In Führungsrolle'] },
  { key: 'change_readiness', label: 'Veränderungsbereitschaft', question: 'Wie stehen Sie zu Veränderungen im Beruf?', type: 'select' as const, options: ['Ich liebe Veränderung', 'Offen, wenn begründet', 'Eher vorsichtig', 'Bevorzuge Stabilität'] },
  { key: 'communication_style', label: 'Kommunikation', question: 'Wie würden Sie Ihren Kommunikationsstil beschreiben?', type: 'select' as const, options: ['Direkt und klar', 'Diplomatisch und einfühlsam', 'Analytisch und sachlich', 'Begeisternd und motivierend'] },
  { key: 'availability', label: 'Verfügbarkeit', question: 'Wie schnell könnten Sie eine neue Stelle antreten?', type: 'select' as const, options: ['Sofort', 'In 1-2 Wochen', 'In 1 Monat', 'In 2-3 Monaten', 'Ab einem bestimmten Datum'] },
];
const selfAssessmentQuestions = [
  { key: 'self_strength', label: 'Grösste Stärke', question: 'Was ist Ihre grösste berufliche Stärke?', type: 'text' as const },
  { key: 'self_weakness', label: 'Entwicklungsfeld', question: 'In welchem Bereich möchten Sie sich am meisten verbessern?', type: 'text' as const },
  { key: 'ideal_role', label: 'Idealrolle', question: 'Beschreiben Sie Ihre ideale berufliche Rolle in einem Satz.', type: 'text' as const },
  { key: 'team_contribution', label: 'Teamwert', question: 'Was bringen Sie in ein Team ein, das andere nicht haben?', type: 'text' as const },
];

const scaleLabels = ['Trifft nicht zu', 'Trifft kaum zu', 'Neutral', 'Trifft eher zu', 'Trifft voll zu'];

const motivatorMeta: Record<string, { label: string; color: string; bg: string; border: string; text: string }> = {
  individualistisch: { label: 'Individualistisch', color: '#8B5CF6', bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700' },
  oekonomisch: { label: 'Ökonomisch', color: '#F97316', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  theoretisch: { label: 'Theoretisch', color: '#3B82F6', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  sozial: { label: 'Sozial', color: '#22C55E', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  aesthetisch: { label: 'Ästhetisch', color: '#EC4899', bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
  traditionell: { label: 'Traditionell', color: '#6B7280', bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' },
};

type WizardStep = 'basics' | 'disc' | 'motivators' | 'workstyle' | 'selfassessment' | 'appointments';

const stepConfig: { key: WizardStep; label: string; shortLabel: string; icon: any }[] = [
  { key: 'basics', label: 'Basisdaten', shortLabel: '1', icon: ClipboardList },
  { key: 'disc', label: 'DISC Verhalten', shortLabel: '2', icon: Brain },
  { key: 'motivators', label: 'Motivatoren', shortLabel: '3', icon: Target },
  { key: 'workstyle', label: 'Arbeitsstil & Ziele', shortLabel: '4', icon: Sparkles },
  { key: 'selfassessment', label: 'Selbstbild', shortLabel: '5', icon: User },
  { key: 'appointments', label: 'Abschluss', shortLabel: '6', icon: CalendarPlus },
];

function computeDiscScores(answers: number[], questions: DiscQuestionItem[]) {
  const dims: Record<'D' | 'I' | 'S' | 'C', number[]> = { D: [], I: [], S: [], C: [] };
  questions.forEach((q, i) => { if (answers[i] > 0) dims[q.dimension].push(answers[i]); });
  const scores: Record<string, number> = {};
  for (const [dim, vals] of Object.entries(dims)) {
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    scores[dim] = Math.round((avg / 5) * 100);
  }
  const dominant = (Object.entries(scores) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0];
  return { scores, dominant };
}

function computeMotivatorScores(answers: number[], questions: MotivatorQuestion[]) {
  const dims: Record<string, number[]> = {};
  questions.forEach((q, i) => {
    if (!dims[q.dimension]) dims[q.dimension] = [];
    if (answers[i] > 0) dims[q.dimension].push(answers[i]);
  });
  const scores: Record<string, number> = {};
  for (const [dim, vals] of Object.entries(dims)) {
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    scores[dim] = Math.round((avg / 5) * 100);
  }
  return scores;
}

function getMinDate() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/* ───── scale button row ───── */
function ScaleRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(val => (
          <button key={val} type="button" onClick={() => onChange(val)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium border transition-all ${
              value === val
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-white text-muted-foreground border-border hover:border-ring hover:bg-muted'
            }`}
          >{val}</button>
        ))}
      </div>
      <div className="flex justify-between mt-1"><span className="text-[10px] text-muted-foreground">{scaleLabels[0]}</span><span className="text-[10px] text-muted-foreground">{scaleLabels[4]}</span></div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
export default function InsightsFormPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [requestId, setRequestId] = useState('');
  const [leadId, setLeadId] = useState('');

  // questions from DB or defaults
  const [insightsQuestions, setInsightsQuestions] = useState<InsightsQuestion[]>(defaultInsightsQuestions);
  const [discQuestions, setDiscQuestions] = useState<DiscQuestionItem[]>(defaultDiscQuestions);
  const [motivatorQuestions, setMotivatorQuestions] = useState<MotivatorQuestion[]>(defaultMotivatorQuestions);

  // answers
  const [insightsAnswers, setInsightsAnswers] = useState<Record<string, string>>({});
  const [discAnswers, setDiscAnswers] = useState<number[]>([]);
  const [motivatorAnswers, setMotivatorAnswers] = useState<number[]>([]);
  const [workstyleAnswers, setWorkstyleAnswers] = useState<Record<string, string>>({});
  const [selfAssessmentAnswers, setSelfAssessmentAnswers] = useState<Record<string, string>>({});
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ date: '', time: '' }]);

  const [step, setStep] = useState<WizardStep>('basics');
  const [motivatorPage, setMotivatorPage] = useState(0);
  useEffect(() => {
    if (!token) { setError('Ungültiger Link.'); setLoading(false); return; }
    loadRequest();
  }, [token]);

  async function loadRequest() {
    const { data: settingsData } = await supabase
      .from('app_settings').select('key,value')
      .in('key', ['insights_questions', 'disc_questions', 'motivator_questions']);

    let loadedDisc = defaultDiscQuestions;
    let loadedMotivators = defaultMotivatorQuestions;
    if (settingsData) {
      for (const row of settingsData) {
        if (row.key === 'insights_questions' && Array.isArray(row.value) && row.value.length > 0)
          setInsightsQuestions(row.value as unknown as InsightsQuestion[]);
        if (row.key === 'disc_questions' && Array.isArray(row.value) && row.value.length > 0) {
          loadedDisc = row.value as unknown as DiscQuestionItem[];
          setDiscQuestions(loadedDisc);
        }
        if (row.key === 'motivator_questions' && Array.isArray(row.value) && row.value.length > 0) {
          loadedMotivators = row.value as unknown as MotivatorQuestion[];
          setMotivatorQuestions(loadedMotivators);
        }
      }
    }
    setDiscAnswers(new Array(loadedDisc.length).fill(0));
    setMotivatorAnswers(new Array(loadedMotivators.length).fill(0));

    const { data, error: err } = await supabase
      .from('insights_requests').select('*').eq('token', token!).single();
    if (err || !data) { setError('Dieser Link ist ungültig oder abgelaufen.'); setLoading(false); return; }
    if (data.status === 'completed') { setAlreadyDone(true); setLoading(false); return; }

    setRequestId(data.id);
    setLeadId(data.lead_id);
    const { data: lead } = await supabase.from('leads').select('name').eq('id', data.lead_id).single();
    if (lead) setLeadName(lead.name);
    setLoading(false);
  }

  /* ── navigation helpers ── */
  const stepIndex = stepConfig.findIndex(s => s.key === step);

  function validateStep(s: WizardStep): string | null {
    if (s === 'basics') {
      const unanswered = insightsQuestions.filter(q => !insightsAnswers[q.key]?.trim());
      return unanswered.length > 0 ? 'Bitte beantworten Sie alle Fragen.' : null;
    }
    if (s === 'disc') {
      const missing = discAnswers.filter(a => a === 0).length;
      return missing > 0 ? `Bitte beantworten Sie alle ${missing} verbleibenden DISC-Fragen.` : null;
    }
    if (s === 'motivators') {
      const missing = motivatorAnswers.filter(a => a === 0).length;
      return missing > 0 ? `Bitte beantworten Sie alle ${missing} verbleibenden Motivator-Fragen.` : null;
    }
    if (s === 'workstyle') {
      const missing = workstyleQuestions.filter(q => !workstyleAnswers[q.key]);
      return missing.length > 0 ? 'Bitte beantworten Sie alle Fragen.' : null;
    }
    if (s === 'selfassessment') {
      const missing = selfAssessmentQuestions.filter(q => !selfAssessmentAnswers[q.key]?.trim());
      return missing.length > 0 ? 'Bitte beantworten Sie alle Fragen.' : null;
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    const next = stepConfig[stepIndex + 1];
    if (next) { setStep(next.key); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  function goBack() {
    setError('');
    const prev = stepConfig[stepIndex - 1];
    if (prev) { setStep(prev.key); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  function goToStep(target: WizardStep) {
    const targetIdx = stepConfig.findIndex(s => s.key === target);
    // validate all previous steps
    for (let i = 0; i < targetIdx; i++) {
      const err = validateStep(stepConfig[i].key);
      if (err) { setError(`Bitte füllen Sie zuerst "${stepConfig[i].label}" aus.`); return; }
    }
    setError('');
    setStep(target);
  }

  /* ── submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validSlots = timeSlots.filter(s => s.date && s.time);
    if (validSlots.length === 0) { setError('Bitte geben Sie mindestens einen Terminvorschlag an.'); return; }
    setSubmitting(true);
    setError('');

    const discResult = computeDiscScores(discAnswers, discQuestions);
    const motivatorScores = computeMotivatorScores(motivatorAnswers, motivatorQuestions);

    // Save insights responses
    await supabase.from('insights_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString(), responses: insightsAnswers })
      .eq('id', requestId);

    // Save DISC results
    await supabase.from('disc_results').insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      dominant_type: discResult.dominant,
      scores: discResult.scores,
      answers: discAnswers,
    });

    // Save appointment suggestions
    for (const slot of validSlots) {
      await supabase.from('appointment_suggestions').insert({
        lead_id: leadId,
        insights_request_id: requestId,
        suggested_date: slot.date,
        suggested_time: slot.time,
      });
    }

    // Combine all wizard answers
    const allWizardAnswers = { ...workstyleAnswers, ...selfAssessmentAnswers };

    // Load SSM criteria from settings
    const { data: criteriaData } = await supabase
      .from('app_settings').select('value').eq('key', 'ssm_criteria').single();
    const ssmCriteria = criteriaData?.value || null;

    // Trigger AI analysis
    try {
      const { data: analysisData, error: analysisErr } = await supabase.functions.invoke('analyze-candidate', {
        body: {
          disc_scores: discResult.scores,
          motivator_scores: motivatorScores,
          wizard_answers: allWizardAnswers,
          ssm_criteria: ssmCriteria,
          lead_name: leadName,
        },
      });

      if (!analysisErr && analysisData && !analysisData.error) {
        await supabase.from('assessment_results').insert({
          lead_id: leadId,
          disc_scores: discResult.scores,
          motivator_scores: motivatorScores,
          wizard_answers: allWizardAnswers,
          scores: analysisData.scores || {},
          match_result: analysisData.match_result || {},
          recommendation: analysisData.recommendation || '',
          report_sections: analysisData.report_sections || {},
          summary: analysisData.summary || {},
          raw_ai_response: analysisData,
        });
      }
    } catch (aiErr) {
      console.error('AI analysis failed (non-blocking):', aiErr);
    }

    // Update lead status
    await supabase.from('leads').update({ status: 'follow_up' }).eq('id', leadId);

    // Activity + notification
    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'status_change',
      description: `Assessment (6-Step), DISC-Test, Motivatoren & ${validSlots.length} Terminvorschlag/vorschläge abgeschlossen`,
      user: 'System',
    });
    await supabase.from('notifications').insert({
      title: 'Assessment komplett eingegangen',
      type: 'insights',
      description: `${leadName || 'Ein Lead'} hat das vollständige Assessment ausgefüllt.`,
      lead_id: leadId,
    });

    setCompleted(true);
    setSubmitting(false);
  }

  /* ── loading / error / done states ── */
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (alreadyDone) return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Bereits ausgefüllt</h1>
        <p className="text-muted-foreground">Sie haben dieses Formular bereits ausgefüllt. Vielen Dank!</p>
      </div>
    </div>
  );
  if (completed) return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Vielen Dank!</h1>
        <p className="text-muted-foreground">Ihre Antworten wurden erfolgreich gespeichert. Wir analysieren Ihr Profil und melden uns bei Ihnen.</p>
      </div>
    </div>
  );
  if (error && !requestId) return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Link ungültig</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    </div>
  );

  /* ── progress calculation ── */
  const answeredBasics = insightsQuestions.filter(q => insightsAnswers[q.key]?.trim()).length;
  const answeredDisc = discAnswers.filter(a => a > 0).length;
  const answeredMotivators = motivatorAnswers.filter(a => a > 0).length;
  const answeredWorkstyle = workstyleQuestions.filter(q => workstyleAnswers[q.key]).length;
  const answeredSelf = selfAssessmentQuestions.filter(q => selfAssessmentAnswers[q.key]?.trim()).length;
  const answeredAppointments = timeSlots.filter(s => s.date && s.time).length;
  const totalAnswered = answeredBasics + answeredDisc + answeredMotivators + answeredWorkstyle + answeredSelf + Math.min(answeredAppointments, 1);
  const totalQuestions = insightsQuestions.length + discQuestions.length + motivatorQuestions.length + workstyleQuestions.length + selfAssessmentQuestions.length + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 text-primary-foreground" style={{ background: 'var(--gradient-hero)' }}>
            <h1 className="text-2xl font-bold">SSM Recruit – Assessment</h1>
            <p className="text-primary-foreground/70 mt-1">
              {leadName ? `Hallo ${leadName.split(' ')[0]}, b` : 'B'}itte füllen Sie alle Schritte vollständig aus.
            </p>
            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-primary-foreground/60">
                <span>Fortschritt</span>
                <span>{Math.round((totalAnswered / totalQuestions) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                <div className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${(totalAnswered / totalQuestions) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex border-b overflow-x-auto">
            {stepConfig.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.key;
              const isPast = i < stepIndex;
              return (
                <button key={s.key} type="button" onClick={() => goToStep(s.key)}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-3 text-xs font-medium transition-colors whitespace-nowrap px-2 ${
                    isActive ? 'border-b-2 border-primary text-primary bg-primary/5'
                    : isPast ? 'text-ring' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.shortLabel}</span>
                  {isPast && <CheckCircle2 className="h-3 w-3 text-ring shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Form content */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {/* ── STEP 1: Basisdaten ── */}
            {step === 'basics' && (
              <>
                <p className="text-sm text-muted-foreground">Beantworten Sie die folgenden Fragen zu Ihrer beruflichen Situation.</p>
                {insightsQuestions.map((q, i) => (
                  <div key={q.key} className="space-y-2">
                    <label className="flex items-baseline gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                      <span className="text-sm font-semibold text-foreground">{q.question}</span>
                    </label>
                    <textarea value={insightsAnswers[q.key] || ''}
                      onChange={e => setInsightsAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                      rows={3} placeholder="Ihre Antwort..." maxLength={2000}
                      className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none resize-none" />
                  </div>
                ))}
              </>
            )}

            {/* ── STEP 2: DISC ── */}
            {step === 'disc' && (
              <>
                <p className="text-sm text-muted-foreground">Bewerten Sie die folgenden Aussagen zu Ihrem Verhalten. 1 = trifft nicht zu, 5 = trifft voll zu.</p>
                {discQuestions.map((q, i) => (
                  <div key={i} className={`rounded-xl border p-4 transition-colors ${discAnswers[i] > 0 ? 'bg-muted border-border' : 'bg-card'}`}>
                    <p className="text-sm font-medium text-foreground mb-3">
                      <span className="text-muted-foreground mr-1.5">{i + 1}.</span>{q.text}
                    </p>
                    <ScaleRow value={discAnswers[i]} onChange={v => { const n = [...discAnswers]; n[i] = v; setDiscAnswers(n); }} />
                  </div>
                ))}
              </>
            )}

            {/* ── STEP 3: Motivatoren (paginated, color-coded) ── */}
            {step === 'motivators' && (() => {
              const questionsPerPage = 2;
              const totalPages = Math.ceil(motivatorQuestions.length / questionsPerPage);
              const pageQuestions = motivatorQuestions.slice(motivatorPage * questionsPerPage, (motivatorPage + 1) * questionsPerPage);
              const globalOffset = motivatorPage * questionsPerPage;
              const answeredOnPage = pageQuestions.every((_, qi) => motivatorAnswers[globalOffset + qi] > 0);

              return (
                <>
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-bold text-foreground">Was motiviert dich wirklich?</h2>
                    <p className="text-sm text-muted-foreground">Beantworte die folgenden Aussagen ehrlich – es gibt keine richtigen oder falschen Antworten.</p>
                  </div>

                  {/* Sub-progress */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }).map((_, pi) => {
                      const pageStart = pi * questionsPerPage;
                      const pageEnd = Math.min(pageStart + questionsPerPage, motivatorQuestions.length);
                      const allAnswered = motivatorAnswers.slice(pageStart, pageEnd).every(a => a > 0);
                      return (
                        <button key={pi} type="button" onClick={() => setMotivatorPage(pi)}
                          className={`h-2 flex-1 rounded-full transition-all ${
                            pi === motivatorPage ? 'bg-primary' : allAnswered ? 'bg-ring' : 'bg-muted'
                          }`} />
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{motivatorPage + 1} / {totalPages}</p>

                  {/* Questions */}
                  <div className="space-y-4">
                    {pageQuestions.map((q, qi) => {
                      const idx = globalOffset + qi;
                      const meta = motivatorMeta[q.dimension] || motivatorMeta.traditionell;
                      return (
                        <div key={idx} className={`rounded-xl border-2 p-5 transition-all ${meta.bg} ${motivatorAnswers[idx] > 0 ? meta.border : 'border-transparent'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${meta.text} ${meta.bg}`} style={{ backgroundColor: meta.color + '20' }}>
                              {meta.label}
                            </span>
                            <span className="text-xs text-muted-foreground">Frage {idx + 1} von {motivatorQuestions.length}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground mb-4">{q.text}</p>

                          {/* Likert scale buttons */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map(val => (
                                <button key={val} type="button"
                                  onClick={() => { const n = [...motivatorAnswers]; n[idx] = val; setMotivatorAnswers(n); }}
                                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold border-2 transition-all ${
                                    motivatorAnswers[idx] === val
                                      ? 'text-white shadow-md scale-105'
                                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                  style={motivatorAnswers[idx] === val ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
                                >{val}</button>
                              ))}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] text-slate-400">Trifft nicht zu</span>
                              <span className="text-[10px] text-slate-400">Trifft voll zu</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Page navigation */}
                  <div className="flex items-center justify-between pt-2">
                    {motivatorPage > 0 ? (
                      <button type="button" onClick={() => setMotivatorPage(p => p - 1)}
                        className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-800">
                        <ChevronLeft className="h-4 w-4" /> Vorherige
                      </button>
                    ) : <div />}
                    {motivatorPage < totalPages - 1 ? (
                      <button type="button" onClick={() => { if (answeredOnPage) setMotivatorPage(p => p + 1); }}
                        disabled={!answeredOnPage}
                        className={`flex items-center gap-1 text-sm font-medium ${answeredOnPage ? 'text-primary hover:text-primary/80' : 'text-muted-foreground/40 cursor-not-allowed'}`}>
                        Nächste <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : <div />}
                  </div>
                </>
              );
            })()}

            {/* ── STEP 4: Arbeitsstil & Ziele ── */}
            {step === 'workstyle' && (
              <>
                <p className="text-sm text-slate-500">Wählen Sie die passendste Antwort zu Ihrem Arbeitsstil.</p>
                {workstyleQuestions.map((q, i) => (
                  <div key={q.key} className="space-y-2">
                    <label className="flex items-baseline gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                      <span className="text-sm font-semibold text-foreground">{q.question}</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map(opt => (
                        <button key={opt} type="button" onClick={() => setWorkstyleAnswers(prev => ({ ...prev, [q.key]: opt }))}
                          className={`text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                            workstyleAnswers[q.key] === opt
                              ? 'bg-primary/5 border-ring text-primary font-medium'
                              : 'bg-card border-border text-foreground hover:border-ring/50'
                          }`}
                        >{opt}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ── STEP 5: Selbstbild ── */}
            {step === 'selfassessment' && (
              <>
                <p className="text-sm text-slate-500">Beschreiben Sie sich selbst in eigenen Worten.</p>
                {selfAssessmentQuestions.map((q, i) => (
                  <div key={q.key} className="space-y-2">
                    <label className="flex items-baseline gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                      <span className="text-sm font-semibold text-foreground">{q.question}</span>
                    </label>
                    <textarea value={selfAssessmentAnswers[q.key] || ''}
                      onChange={e => setSelfAssessmentAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                      rows={2} placeholder="Ihre Antwort..." maxLength={1000}
                      className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none resize-none" />
                  </div>
                ))}
              </>
            )}

            {/* ── STEP 6: Termine ── */}
            {step === 'appointments' && (
              <>
                <p className="text-sm text-slate-500">Schlagen Sie bis zu 5 Termine vor, an denen Sie für ein Gespräch verfügbar wären.</p>
                <div className="space-y-3">
                  {timeSlots.map((slot, i) => (
                    <div key={i} className="flex items-end gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Datum</label>
                        <input type="date" min={getMinDate()} value={slot.date}
                          onChange={e => { const u = [...timeSlots]; u[i] = { ...u[i], date: e.target.value }; setTimeSlots(u); }}
                          className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Uhrzeit</label>
                        <input type="time" value={slot.time}
                          onChange={e => { const u = [...timeSlots]; u[i] = { ...u[i], time: e.target.value }; setTimeSlots(u); }}
                          className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none" />
                      </div>
                      {timeSlots.length > 1 && (
                        <button type="button" onClick={() => setTimeSlots(timeSlots.filter((_, j) => j !== i))}
                          className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-600 hover:bg-red-100">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {timeSlots.length < 5 && (
                    <button type="button" onClick={() => setTimeSlots([...timeSlots, { date: '', time: '' }])}
                      className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80">
                      <Plus className="h-4 w-4" /> Weiteren Termin hinzufügen
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── Navigation ── */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {stepIndex > 0 ? (
                <button type="button" onClick={goBack}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
                  <ChevronLeft className="h-4 w-4" /> Zurück
                </button>
              ) : <div />}

              {step === 'appointments' ? (
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? 'Wird analysiert...' : 'Assessment abschliessen'}
                </button>
              ) : (
                <button type="button" onClick={goNext}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90">
                  Weiter <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
