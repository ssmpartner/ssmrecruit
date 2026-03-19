import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, AlertCircle, Send, Brain, ClipboardList } from 'lucide-react';

const insightsQuestions = [
  { key: 'motivation', label: 'Motivation', question: 'Was motiviert Sie, eine neue berufliche Herausforderung zu suchen?' },
  { key: 'experience', label: 'Erfahrung', question: 'Beschreiben Sie Ihre relevanteste berufliche Erfahrung.' },
  { key: 'availability', label: 'Verfügbarkeit', question: 'Ab wann sind Sie verfügbar und wie flexibel sind Sie bezüglich Arbeitszeiten?' },
  { key: 'goals', label: 'Ziele', question: 'Was sind Ihre beruflichen Ziele für die nächsten 2-3 Jahre?' },
  { key: 'strengths', label: 'Stärken', question: 'Was sind Ihre grössten Stärken und wie setzen Sie diese im Beruf ein?' },
  { key: 'salary', label: 'Gehaltsvorstellung', question: 'Was sind Ihre Gehaltsvorstellungen?' },
];

const discQuestions: { text: string; dimension: 'D' | 'I' | 'S' | 'C' }[] = [
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

const scaleLabels = ['Trifft nicht zu', 'Trifft kaum zu', 'Neutral', 'Trifft eher zu', 'Trifft voll zu'];

function computeDiscScores(answers: number[]) {
  const dims: Record<'D' | 'I' | 'S' | 'C', number[]> = { D: [], I: [], S: [], C: [] };
  discQuestions.forEach((q, i) => {
    if (answers[i] > 0) dims[q.dimension].push(answers[i]);
  });
  const scores: Record<string, number> = {};
  for (const [dim, vals] of Object.entries(dims)) {
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    scores[dim] = Math.round((avg / 5) * 100);
  }
  const dominant = (Object.entries(scores) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0];
  return { scores, dominant };
}

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
  const [insightsAnswers, setInsightsAnswers] = useState<Record<string, string>>({});
  const [discAnswers, setDiscAnswers] = useState<number[]>(new Array(discQuestions.length).fill(0));
  const [step, setStep] = useState<'insights' | 'disc'>('insights');

  useEffect(() => {
    if (!token) { setError('Ungültiger Link.'); setLoading(false); return; }
    loadRequest();
  }, [token]);

  async function loadRequest() {
    const { data, error: err } = await supabase
      .from('insights_requests')
      .select('*')
      .eq('token', token!)
      .single();

    if (err || !data) { setError('Dieser Link ist ungültig oder abgelaufen.'); setLoading(false); return; }
    if (data.status === 'completed') { setAlreadyDone(true); setLoading(false); return; }

    setRequestId(data.id);
    setLeadId(data.lead_id);

    const { data: lead } = await supabase.from('leads').select('name').eq('id', data.lead_id).single();
    if (lead) setLeadName(lead.name);

    setLoading(false);
  }

  function goToDisc() {
    const unanswered = insightsQuestions.filter(q => !insightsAnswers[q.key]?.trim());
    if (unanswered.length > 0) { setError('Bitte beantworten Sie alle Fragen.'); return; }
    setError('');
    setStep('disc');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const unansweredDisc = discAnswers.filter(a => a === 0).length;
    if (unansweredDisc > 0) { setError(`Bitte beantworten Sie alle ${unansweredDisc} verbleibenden Fragen.`); return; }

    setSubmitting(true);
    setError('');

    // Compute DISC scores
    const { scores, dominant } = computeDiscScores(discAnswers);

    // Save insights responses
    const { error: updateErr } = await supabase
      .from('insights_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString(), responses: insightsAnswers })
      .eq('id', requestId);

    if (updateErr) { setError('Fehler beim Speichern. Bitte versuchen Sie es erneut.'); setSubmitting(false); return; }

    // Save DISC results
    await supabase.from('disc_results').insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      dominant_type: dominant,
      scores,
      answers: discAnswers,
    });

    // Update lead status to follow_up
    await supabase.from('leads').update({ status: 'follow_up' }).eq('id', leadId);

    // Add activity
    await supabase.from('activities').insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      type: 'status_change',
      description: 'Insights & DISC-Test abgeschlossen – Status automatisch auf Follow-up gesetzt',
      user: 'System',
    });

    // Create notification
    await supabase.from('notifications').insert({
      title: 'Insights & DISC abgeschlossen',
      type: 'insights',
      description: `${leadName || 'Ein Lead'} hat das Insights-Formular und den DISC-Persönlichkeitstest ausgefüllt.`,
      lead_id: leadId,
    });

    setCompleted(true);
    setSubmitting(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );

  if (alreadyDone) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Bereits ausgefüllt</h1>
        <p className="text-slate-600">Sie haben dieses Formular bereits ausgefüllt. Vielen Dank!</p>
      </div>
    </div>
  );

  if (completed) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Vielen Dank!</h1>
        <p className="text-slate-600">Ihre Antworten wurden erfolgreich gespeichert. Wir werden uns bei Ihnen melden.</p>
      </div>
    </div>
  );

  if (error && !requestId) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Link ungültig</h1>
        <p className="text-slate-600">{error}</p>
      </div>
    </div>
  );

  const insightsProgress = insightsQuestions.filter(q => insightsAnswers[q.key]?.trim()).length;
  const discProgress = discAnswers.filter(a => a > 0).length;
  const totalProgress = insightsProgress + discProgress;
  const totalQuestions = insightsQuestions.length + discQuestions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold">SSM Recruit – Bewerberfragebogen</h1>
            <p className="text-emerald-100 mt-1">
              {leadName ? `Hallo ${leadName.split(' ')[0]}, b` : 'B'}itte füllen Sie beide Teile vollständig aus.
            </p>
            {/* Progress */}
            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-200">
                <span>Fortschritt</span>
                <span>{totalProgress} / {totalQuestions} beantwortet</span>
              </div>
              <div className="h-2 rounded-full bg-emerald-800/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/80 transition-all duration-300"
                  style={{ width: `${(totalProgress / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Step Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setStep('insights')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                step === 'insights'
                  ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Teil 1: Fragen
              {insightsProgress === insightsQuestions.length && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
            </button>
            <button
              onClick={() => {
                const unanswered = insightsQuestions.filter(q => !insightsAnswers[q.key]?.trim());
                if (unanswered.length > 0) { setError('Bitte beantworten Sie zuerst alle Fragen in Teil 1.'); return; }
                setError('');
                setStep('disc');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                step === 'disc'
                  ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Brain className="h-4 w-4" />
              Teil 2: Persönlichkeit
              {discProgress === discQuestions.length && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {/* Part 1: Insights Questions */}
            {step === 'insights' && (
              <>
                <p className="text-sm text-slate-500">Beantworten Sie die folgenden Fragen zu Ihrer beruflichen Situation und Ihren Zielen.</p>
                {insightsQuestions.map((q, i) => (
                  <div key={q.key} className="space-y-2">
                    <label className="flex items-baseline gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{i + 1}</span>
                      <span className="text-sm font-semibold text-slate-800">{q.question}</span>
                    </label>
                    <textarea
                      value={insightsAnswers[q.key] || ''}
                      onChange={e => setInsightsAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                      rows={3}
                      placeholder="Ihre Antwort..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none resize-none transition-colors"
                      maxLength={2000}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={goToDisc}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-colors"
                >
                  Weiter zu Teil 2: Persönlichkeitstest <Brain className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Part 2: DISC Questions */}
            {step === 'disc' && (
              <>
                <p className="text-sm text-slate-500">
                  Bewerten Sie die folgenden Aussagen auf einer Skala von 1 bis 5. Es gibt keine richtigen oder falschen Antworten.
                </p>
                {discQuestions.map((q, i) => (
                  <div key={i} className={`rounded-xl border p-4 transition-colors ${discAnswers[i] > 0 ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                    <p className="text-sm font-medium text-slate-800 mb-3">
                      <span className="text-slate-400 mr-1.5">{i + 1}.</span>
                      {q.text}
                    </p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            const newAnswers = [...discAnswers];
                            newAnswers[i] = val;
                            setDiscAnswers(newAnswers);
                          }}
                          className={`flex-1 rounded-lg py-2 text-xs font-medium border transition-all ${
                            discAnswers[i] === val
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-slate-400">{scaleLabels[0]}</span>
                      <span className="text-[10px] text-slate-400">{scaleLabels[4]}</span>
                    </div>
                  </div>
                ))}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('insights')}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    ← Zurück zu Teil 1
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? 'Wird gespeichert...' : 'Alles absenden'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">© SSM Recruit • Ihre Daten werden vertraulich behandelt.</p>
      </div>
    </div>
  );
}
