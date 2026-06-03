import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, Trophy, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLeads } from '@/context/useLeads';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { statusConfig } from '@/lib/mock-data';
import { validatePersonnel, type PersonnelData } from './PersonnelFormFields';

interface Props {
  leadId: string;
}

const REQUIRED_DOC_KEYS = ['id_front', 'id_back', 'bank_front', 'bank_back', 'vbv', 'kk_card', 'fuehrerausweis'];

const REQUIRED_DOC_LABELS: Record<string, string> = {
  id_front: 'Ausweis (Vorderseite)',
  id_back: 'Ausweis (Rückseite)',
  bank_front: 'Bankkarte (Vorderseite)',
  bank_back: 'Bankkarte (Rückseite)',
  vbv: 'VBV-Ausweis',
  kk_card: 'Krankenkassenkarte',
  fuehrerausweis: 'Führerausweis',
};

// Manuell ausgewählte Kategorien → erfüllen welche Required-Slots
// (1 PDF mit beiden Seiten deckt v + r ab)
const MANUAL_TO_REQUIRED: Record<string, string[]> = {
  id: ['id_front', 'id_back'],
  bank: ['bank_front', 'bank_back'],
  vbv: ['vbv'],
  kk_card: ['kk_card'],
  fuehrerausweis: ['fuehrerausweis'],
};

const MANUAL_DOC_LABELS: Record<string, string> = {
  cv: 'Lebenslauf',
  motivation_letter: 'Motivationsschreiben',
  certificate: 'Zertifikat',
  reference: 'Arbeitszeugnis',
  betreibungsauszug: 'Betreibungsauszug',
  strafregisterauszug: 'Strafregisterauszug',
  leadsliste: 'Leadsliste',
  insight_r4: 'Insight R4',
  other: 'Sonstiges',
};

// Match appointment titles loosely to the three milestones
function matchMilestone(title: string): 'bg' | 'bg2' | 'contract' | null {
  const t = title.toLowerCase().trim();
  if (/vertrags|unterzeich|contract/.test(t)) return 'contract';
  if (/\bbg\s*2\b|bg2|bewerbung.*2|zweit/.test(t)) return 'bg2';
  if (/\bbg\b|bewerbungs?gespr|kennenlern|erstgespr/.test(t)) return 'bg';
  return null;
}

export default function LeadHiringReadiness({ leadId }: Props) {
  const { appointments, leads, updateLead, addActivity } = useLeads();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const lead = leads.find(l => l.id === leadId);
  const alreadySubmitted = lead && ['ready_for_controlling', 'controlling_approved', 'management_review', 'management_approved', 'hr_processing', 'hired'].includes(lead.status);
  const [personnelDone, setPersonnelDone] = useState(false);
  const [docsDoneCount, setDocsDoneCount] = useState(0);
  const [missingDocs, setMissingDocs] = useState<string[]>([]);
  const [manualDocTypes, setManualDocTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [pRes, dRes] = await Promise.all([
        supabase.from('lead_personal_data').select('data, version').eq('lead_id', leadId).maybeSingle(),
        supabase.from('document_uploads').select('file_type').eq('lead_id', leadId),
      ]);
      if (!alive) return;
      const row = pRes.data as { data?: PersonnelData; version?: number } | null;
      const complete = !!row && (row.version ?? 0) > 0 && Object.keys(validatePersonnel(row.data ?? {})).length === 0;
      setPersonnelDone(complete);
      const types = new Set((dRes.data ?? []).map((u: { file_type: string }) => u.file_type));
      const expanded = new Set(types);
      for (const t of types) {
        const covers = MANUAL_TO_REQUIRED[t];
        if (covers) covers.forEach(k => expanded.add(k));
      }
      setDocsDoneCount(REQUIRED_DOC_KEYS.filter(k => expanded.has(k)).length);
      setMissingDocs(REQUIRED_DOC_KEYS.filter(k => !expanded.has(k)));
      setManualDocTypes(Array.from(types).filter(t => !REQUIRED_DOC_KEYS.includes(t) && !MANUAL_TO_REQUIRED[t]));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [leadId]);

  const milestones = useMemo(() => {
    const now = Date.now();
    const found: Record<'bg' | 'bg2' | 'contract', { done: boolean; date?: string }> = {
      bg: { done: false }, bg2: { done: false }, contract: { done: false },
    };
    appointments.filter(a => a.leadId === leadId).forEach(a => {
      const m = matchMilestone(a.title);
      if (!m) return;
      const ts = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const isPast = ts <= now;
      if (isPast || found[m].done === false) {
        found[m] = { done: isPast || found[m].done, date: a.date };
      }
      if (isPast) found[m].done = true;
    });
    return found;
  }, [appointments, leadId]);

  const docsDone = docsDoneCount === REQUIRED_DOC_KEYS.length;
  const contractRequired = lead && ['management_approved', 'hr_processing', 'hired'].includes(lead.status);

  const baseItems = [
    { label: 'BG (Bewerbungsgespräch)', done: milestones.bg.done, hint: milestones.bg.date ? new Date(milestones.bg.date).toLocaleDateString('de-CH') : 'Noch kein Termin' },
    { label: 'BG2 (Zweitgespräch)', done: milestones.bg2.done, hint: milestones.bg2.date ? new Date(milestones.bg2.date).toLocaleDateString('de-CH') : 'Noch kein Termin' },
    { label: 'Personalien', done: personnelDone, hint: personnelDone ? 'Vollständig eingereicht' : 'Unvollständig' },
    { label: 'Dokumente (Arbeitsvertrag)', done: docsDone, hint: `${docsDoneCount}/${REQUIRED_DOC_KEYS.length} eingereicht` },
  ];
  const items = contractRequired
    ? [
      ...baseItems,
      { label: 'Vertragsunterzeichnung', done: milestones.contract.done, hint: milestones.contract.date ? new Date(milestones.contract.date).toLocaleDateString('de-CH') : 'Noch kein Termin' },
    ]
    : baseItems;

  const doneCount = items.filter(i => i.done).length;
  const total = items.length;
  const pct = Math.round((doneCount / total) * 100);
  const ready = doneCount === total;
  const handleSubmit = async () => {
    if (!lead || !ready || submitting) return;
    setSubmitting(true);
    try {
      updateLead(leadId, { status: 'ready_for_controlling' });
      addActivity(leadId, 'status_change', `Lead zur Controlling-Prüfung eingereicht (Einstellungs-Readiness 100 %)`);
      toast({ title: '✅ Eingereicht', description: 'Lead wurde an Controlling übergeben.' });
    } catch (e) {
      toast({ title: 'Fehler beim Einreichen', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className={cn(
        'p-3 flex items-center justify-between gap-3 border-b',
        ready ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted/40',
      )}>
        <div className="flex items-center gap-2">
          <Trophy className={cn('h-4 w-4', ready ? 'text-emerald-600' : 'text-muted-foreground')} />
          <div>
            <div className="text-sm font-semibold">Einstellungs-Readiness</div>
            <div className="text-xs text-muted-foreground">
              {ready ? 'Bereit zur Einstellung ✓' : `${doneCount} von ${total} erledigt`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full transition-all', ready ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
          </div>
          <span className={cn('text-sm font-semibold tabular-nums', ready ? 'text-emerald-700' : 'text-foreground')}>{pct}%</span>
        </div>
      </div>

      <div className="divide-y">
        {items.map(it => (
          <div key={it.label} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {loading ? (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              ) : it.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <span className={cn('text-sm font-medium truncate', it.done && 'text-foreground')}>{it.label}</span>
            </div>
            <span className={cn('text-xs shrink-0', it.done ? 'text-emerald-700' : 'text-muted-foreground')}>
              {it.hint}
            </span>
          </div>
        ))}
        {manualDocTypes.length > 0 && (
          <div className="px-3 py-2 bg-muted/20">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Weitere hochgeladene Dokumente
            </div>
            <div className="flex flex-wrap gap-1.5">
              {manualDocTypes.map(t => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-medium border border-emerald-200 dark:border-emerald-900">
                  <CheckCircle2 className="h-3 w-3" />
                  {MANUAL_DOC_LABELS[t] || t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {(ready || alreadySubmitted) && (
        <div className={cn('border-t p-3 flex items-center justify-between gap-3', alreadySubmitted ? 'bg-muted/30' : 'bg-emerald-50/50 dark:bg-emerald-950/20')}>
          <div className="text-xs text-muted-foreground">
            {alreadySubmitted
              ? <>Bereits weitergeleitet · Status: <strong className="text-foreground">{lead && statusConfig[lead.status]?.label}</strong></>
              : 'Alle Anforderungen erfüllt — Lead an Controlling weiterleiten.'}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!ready || submitting || !!alreadySubmitted}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-opacity',
              alreadySubmitted
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:opacity-90 disabled:opacity-50',
            )}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {alreadySubmitted ? 'Bereits eingereicht' : 'An Controlling einreichen'}
          </button>
        </div>
      )}
    </div>
  );
}
