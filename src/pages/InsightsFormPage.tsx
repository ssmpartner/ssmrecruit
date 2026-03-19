import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, AlertCircle, Send } from 'lucide-react';

const questions = [
  { key: 'motivation', label: 'Motivation', question: 'Was motiviert Sie, eine neue berufliche Herausforderung zu suchen?' },
  { key: 'experience', label: 'Erfahrung', question: 'Beschreiben Sie Ihre relevanteste berufliche Erfahrung.' },
  { key: 'availability', label: 'Verfügbarkeit', question: 'Ab wann sind Sie verfügbar und wie flexibel sind Sie bezüglich Arbeitszeiten?' },
  { key: 'goals', label: 'Ziele', question: 'Was sind Ihre beruflichen Ziele für die nächsten 2-3 Jahre?' },
  { key: 'strengths', label: 'Stärken', question: 'Was sind Ihre grössten Stärken und wie setzen Sie diese im Beruf ein?' },
  { key: 'salary', label: 'Gehaltsvorstellung', question: 'Was sind Ihre Gehaltsvorstellungen?' },
];

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
  const [answers, setAnswers] = useState<Record<string, string>>({});

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

    // Get lead name
    const { data: lead } = await supabase.from('leads').select('name').eq('id', data.lead_id).single();
    if (lead) setLeadName(lead.name);

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const unanswered = questions.filter(q => !answers[q.key]?.trim());
    if (unanswered.length > 0) { setError(`Bitte beantworten Sie alle Fragen.`); return; }

    setSubmitting(true);
    setError('');

    // Update insights request
    const { error: updateErr } = await supabase
      .from('insights_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString(), responses: answers })
      .eq('id', requestId);

    if (updateErr) { setError('Fehler beim Speichern. Bitte versuchen Sie es erneut.'); setSubmitting(false); return; }

    // Update lead status to qualified (via activities too)
    await supabase.from('leads').update({ status: 'insights' }).eq('id', leadId);

    // Add activity
    await supabase.from('activities').insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      type: 'status_change',
      description: 'Insights-Formular ausgefüllt – Status automatisch aktualisiert',
      user: 'System',
    });

    // Create notification
    await supabase.from('notifications').insert({
      title: 'Insights abgeschlossen',
      type: 'insights',
      description: `${leadName || 'Ein Lead'} hat das Insights-Formular ausgefüllt.`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold">SSM Recruit – Insights</h1>
            <p className="text-emerald-100 mt-1">
              {leadName ? `Hallo ${leadName.split(' ')[0]}, b` : 'B'}itte beantworten Sie die folgenden Fragen.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {questions.map((q, i) => (
              <div key={q.key} className="space-y-2">
                <label className="flex items-baseline gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{i + 1}</span>
                  <span className="text-sm font-semibold text-slate-800">{q.question}</span>
                </label>
                <textarea
                  value={answers[q.key] || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                  rows={3}
                  placeholder="Ihre Antwort..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none resize-none transition-colors"
                  maxLength={2000}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Wird gespeichert...' : 'Antworten absenden'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">© SSM Recruit • Ihre Daten werden vertraulich behandelt.</p>
      </div>
    </div>
  );
}
