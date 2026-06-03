import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, Trophy, Send, Loader2, MinusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLeads } from '@/context/useLeads';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { statusConfig } from '@/lib/mock-data';
import { validatePersonnel, type PersonnelData } from './PersonnelFormFields';

interface Props {
  leadId: string;
}

const REQUIRED_DOC_KEYS = [
  'id', 'bank', 'vbv', 'kk_card', 'fuehrerausweis',
  'betreibungsauszug', 'strafregisterauszug',
  'leadsliste', 'insight_r4',
];

const REQUIRED_DOC_LABELS: Record<string, string> = {
  id: 'Ausweis',
  bank: 'Bankkarte',
  vbv: 'VBV-Ausweis',
  kk_card: 'Krankenkasse',
  fuehrerausweis: 'Führerausweis',
  betreibungsauszug: 'Betreibungsauszug',
  strafregisterauszug: 'Strafregisterauszug',
  leadsliste: 'Leadsliste',
  insight_r4: 'Insight R4',
};

// Hochgeladener file_type → erfüllt welchen Required-Slot
// (Vorder-/Rückseite zählen alle als ein erfülltes Dokument)
const UPLOAD_TO_REQUIRED: Record<string, string> = {
  id: 'id', id_front: 'id', id_back: 'id',
  bank: 'bank', bank_front: 'bank', bank_back: 'bank',
  vbv: 'vbv',
  kk_card: 'kk_card',
  fuehrerausweis: 'fuehrerausweis',
  betreibungsauszug: 'betreibungsauszug',
  strafregisterauszug: 'strafregisterauszug',
  leadsliste: 'leadsliste',
  insight_r4: 'insight_r4',
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
  const [uploadedKeys, setUploadedKeys] = useState<Set<string>>(new Set());
  const [waivedKeys, setWaivedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadAll() {
    const [pRes, dRes, wRes] = await Promise.all([
      supabase.from('lead_personal_data').select('data, version').eq('lead_id', leadId).maybeSingle(),
      supabase.from('document_uploads').select('file_type').eq('lead_id', leadId),
      (supabase as any).from('lead_document_waivers').select('doc_key').eq('lead_id', leadId),
    ]);
    const row = pRes.data as { data?: PersonnelData; version?: number } | null;
    setPersonnelDone(!!row && (row.version ?? 0) > 0 && Object.keys(validatePersonnel(row.data ?? {})).length === 0);
    const fulfilled = new Set<string>();
    for (const u of (dRes.data ?? []) as { file_type: string }[]) {
      const slot = UPLOAD_TO_REQUIRED[u.file_type];
      if (slot) fulfilled.add(slot);
    }
    setUploadedKeys(new Set(REQUIRED_DOC_KEYS.filter(k => fulfilled.has(k))));
    setWaivedKeys(new Set(((wRes.data ?? []) as { doc_key: string }[]).map(w => w.doc_key)));
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await loadAll();
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  async function toggleWaiver(key: string, currentlyWaived: boolean) {
    setBusyKey(key);
    try {
      if (currentlyWaived) {
        const { error } = await (supabase as any).from('lead_document_waivers').delete().eq('lead_id', leadId).eq('doc_key', key);
        if (error) throw error;
        await supabase.from('activities').insert({
          id: crypto.randomUUID(), lead_id: leadId, type: 'note',
          description: `Verzicht zurückgenommen: "${REQUIRED_DOC_LABELS[key] || key}" wird wieder benötigt`,
          user: 'System',
        });
        toast({ title: 'Verzicht aufgehoben', description: REQUIRED_DOC_LABELS[key] || key });
      } else {
        const { error } = await (supabase as any).from('lead_document_waivers').insert({
          lead_id: leadId, doc_key: key, waived_by: 'manual', reason: 'Hat er nicht',
        });
        if (error) throw error;
        await supabase.from('activities').insert({
          id: crypto.randomUUID(), lead_id: leadId, type: 'note',
          description: `Dokument als "Hat er nicht" markiert: ${REQUIRED_DOC_LABELS[key] || key}`,
          user: 'System',
        });
        toast({ title: '✓ Markiert', description: `${REQUIRED_DOC_LABELS[key] || key} – Hat er nicht` });
      }
      await loadAll();
    } catch (err) {
      toast({ title: 'Fehler', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusyKey(null);
    }
  }

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

  const docsResolved = REQUIRED_DOC_KEYS.filter(k => uploadedKeys.has(k) || waivedKeys.has(k)).length;
  const contractRequired = lead && ['management_approved', 'hr_processing', 'hired'].includes(lead.status);

  type DocStatus = 'uploaded' | 'waived' | 'missing';
  const docStatuses: { key: string; label: string; status: DocStatus }[] = REQUIRED_DOC_KEYS.map(k => ({
    key: k,
    label: REQUIRED_DOC_LABELS[k] || k,
    status: uploadedKeys.has(k) ? 'uploaded' : waivedKeys.has(k) ? 'waived' : 'missing',
  }));

  type ReadinessItem = { label: string; progress: number; hint: string; renderExtra?: () => JSX.Element };

  const baseItems: ReadinessItem[] = [
    { label: 'BG (Bewerbungsgespräch)', progress: milestones.bg.done ? 1 : 0, hint: milestones.bg.date ? new Date(milestones.bg.date).toLocaleDateString('de-CH') : 'Noch kein Termin' },
    { label: 'BG2 (Zweitgespräch)', progress: milestones.bg2.done ? 1 : 0, hint: milestones.bg2.date ? new Date(milestones.bg2.date).toLocaleDateString('de-CH') : 'Noch kein Termin' },
    { label: 'Personalien', progress: personnelDone ? 1 : 0, hint: personnelDone ? 'Vollständig eingereicht' : 'Unvollständig' },
    {
      label: 'Dokumente (Arbeitsvertrag)',
      progress: docsResolved / REQUIRED_DOC_KEYS.length,
      hint: `${docsResolved}/${REQUIRED_DOC_KEYS.length} erledigt`,
      renderExtra: () => (
        <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
          {docStatuses.map(d => {
            const busy = busyKey === d.key;
            const isUploaded = d.status === 'uploaded';
            const isWaived = d.status === 'waived';
            return (
              <button
                key={d.key}
                type="button"
                disabled={busy || isUploaded}
                onClick={() => !isUploaded && toggleWaiver(d.key, isWaived)}
                title={
                  isUploaded ? 'Hochgeladen'
                    : isWaived ? 'Verzicht aufheben'
                    : 'Klick: als "Hat er nicht" markieren'
                }
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                  isUploaded
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300 cursor-default'
                    : isWaived
                    ? 'border-muted bg-muted/50 text-muted-foreground line-through hover:bg-muted'
                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300',
                  busy && 'opacity-50',
                )}
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" />
                  : isUploaded ? <CheckCircle2 className="h-3 w-3" />
                  : isWaived ? <MinusCircle className="h-3 w-3" />
                  : <Circle className="h-3 w-3" />}
                <span>{d.label}</span>
              </button>
            );
          })}
        </div>
      ),
    },
  ];
  const items: ReadinessItem[] = contractRequired
    ? [
      ...baseItems,
      { label: 'Vertragsunterzeichnung', progress: milestones.contract.done ? 1 : 0, hint: milestones.contract.date ? new Date(milestones.contract.date).toLocaleDateString('de-CH') : 'Noch kein Termin' },
    ]
    : baseItems;

  const totalProgress = items.reduce((s, i) => s + i.progress, 0);
  const total = items.length;
  const pct = Math.round((totalProgress / total) * 100);
  const ready = totalProgress >= total;

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
              {ready ? 'Bereit zur Einstellung ✓' : `${pct}% abgeschlossen`}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
              Nur bei 100 % kann das gesamte Dossier an Controlling weitergeleitet werden!
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
        {items.map(it => {
          const done = it.progress >= 1;
          const partial = it.progress > 0 && it.progress < 1;
          return (
            <div key={it.label} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {loading ? (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  ) : done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className={cn('h-4 w-4 shrink-0', partial ? 'text-primary' : 'text-amber-500')} />
                  )}
                  <span className="text-sm font-medium truncate">{it.label}</span>
                </div>
                <span className={cn('text-xs shrink-0 tabular-nums', done ? 'text-emerald-700' : partial ? 'text-primary' : 'text-muted-foreground')}>
                  {it.hint}
                </span>
              </div>
              {it.progress < 1 && (
                <div className="mt-1.5 ml-6 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={cn('h-full transition-all', partial ? 'bg-primary' : 'bg-amber-400/60')} style={{ width: `${Math.max(it.progress * 100, partial ? 8 : 0)}%` }} />
                </div>
              )}
              {it.renderExtra?.()}
            </div>
          );
        })}
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
