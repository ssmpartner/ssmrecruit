import { useState, useMemo } from 'react';
import { useLeads } from '@/context/useLeads';
import { discQuestions, discDimensionConfig, type DiscDimension } from '@/lib/mock-data';
import { Brain, CheckCircle2, Send, RotateCcw } from 'lucide-react';

interface InsightsTabProps {
  leadId: string;
  leadName: string;
}

export default function InsightsTab({ leadId, leadName }: InsightsTabProps) {
  const { discResults, submitDiscTest } = useLeads();
  const [answers, setAnswers] = useState<number[]>(new Array(discQuestions.length).fill(0));
  const [currentStep, setCurrentStep] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const result = useMemo(() => discResults.find(r => r.leadId === leadId), [discResults, leadId]);

  const setAnswer = (index: number, value: number) => {
    setAnswers(prev => { const n = [...prev]; n[index] = value; return n; });
  };

  const canSubmit = answers.every(a => a > 0);

  const handleSubmit = () => {
    submitDiscTest(leadId, answers);
    setShowForm(false);
  };

  const scaleLabels = ['Trifft nicht zu', 'Trifft kaum zu', 'Neutral', 'Trifft eher zu', 'Trifft voll zu'];

  if (result) {
    const sorted = (Object.entries(result.scores) as [DiscDimension, number][]).sort((a, b) => b[1] - a[1]);
    const dominant = discDimensionConfig[result.dominantType];

    return (
      <div className="space-y-5">
        {/* Result header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 border border-orange-200">
            <Brain className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">DISC-Profil von {leadName}</h4>
            <p className="text-xs text-muted-foreground">
              Abgeschlossen am {new Date(result.completedAt).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Dominant type card */}
        <div className={`rounded-xl border p-4 ${dominant.color}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">{result.dominantType}</span>
            <div>
              <p className="font-semibold text-sm">{dominant.fullLabel}</p>
              <p className="text-xs opacity-80">{dominant.description}</p>
            </div>
          </div>
        </div>

        {/* Score bars */}
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
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${score}%`,
                      backgroundColor: dim === 'D' ? '#dc2626' : dim === 'I' ? '#d97706' : dim === 'S' ? '#059669' : '#2563eb',
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{cfg.description}</p>
              </div>
            );
          })}
        </div>

        {/* Interpretation */}
        <div className="rounded-xl border bg-gray-50 p-4 space-y-2">
          <h5 className="text-sm font-semibold">Interpretation</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {result.dominantType === 'D' && `${leadName} zeigt ein stark ergebnisorientiertes Profil. Diese Person trifft Entscheidungen schnell, übernimmt gerne Verantwortung und arbeitet am besten in einem Umfeld, das Autonomie und Herausforderungen bietet.`}
            {result.dominantType === 'I' && `${leadName} ist ein kommunikativer Typ mit hoher sozialer Kompetenz. Diese Person motiviert andere, arbeitet gerne im Team und bringt Energie in Projekte. Am besten geeignet für Rollen mit viel Kundenkontakt.`}
            {result.dominantType === 'S' && `${leadName} zeigt ein stabiles, teamorientiertes Profil. Diese Person ist zuverlässig, geduldig und bringt Ruhe ins Team. Ideal für Positionen, die Beständigkeit und Zusammenarbeit erfordern.`}
            {result.dominantType === 'C' && `${leadName} hat ein analytisches Profil mit hohem Qualitätsbewusstsein. Diese Person arbeitet präzise, plant voraus und hinterfragt kritisch. Bestens geeignet für Rollen, die Genauigkeit und Struktur erfordern.`}
          </p>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200">
          <Brain className="h-8 w-8 text-orange-500" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">DISC-Persönlichkeitstest</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Führe den DISC-Test für {leadName} durch, um Persönlichkeitsmerkmale zu erfassen und den Recruiting-Prozess zu optimieren.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Brain className="h-4 w-4" /> Test starten
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-orange-500" />
          <h4 className="text-sm font-semibold">DISC-Test für {leadName}</h4>
        </div>
        <span className="text-xs text-muted-foreground">
          {answers.filter(a => a > 0).length} / {discQuestions.length} beantwortet
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-300"
          style={{ width: `${(answers.filter(a => a > 0).length / discQuestions.length) * 100}%` }}
        />
      </div>

      {/* Questions */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
        {discQuestions.map((q, i) => (
          <div key={i} className={`rounded-xl border p-4 transition-colors ${answers[i] > 0 ? 'bg-gray-50 border-gray-200' : 'bg-card'}`}>
            <p className="text-sm font-medium mb-3">
              <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
              {q.text}
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={val}
                  onClick={() => setAnswer(i, val)}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium border transition-all ${
                    answers[i] === val
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground">{scaleLabels[0]}</span>
              <span className="text-[10px] text-muted-foreground">{scaleLabels[4]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <button
          onClick={() => { setAnswers(new Array(discQuestions.length).fill(0)); }}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="h-3 w-3" /> Zurücksetzen
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <CheckCircle2 className="h-4 w-4" /> Test abschliessen
        </button>
      </div>
    </div>
  );
}
