import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLeads } from '@/context/useLeads';
import { cn } from '@/lib/utils';
import { validatePersonnel, type PersonnelData } from './PersonnelFormFields';

interface Props {
  leadId: string;
}

const REQUIRED_DOC_KEYS = ['id_front', 'id_back', 'bank_front', 'bank_back', 'vbv', 'kk_card', 'fuehrerausweis'];

// Match appointment titles loosely to the three milestones
function matchMilestone(title: string): 'bg' | 'bg2' | 'contract' | null {
  const t = title.toLowerCase().trim();
  if (/vertrags|unterzeich|contract/.test(t)) return 'contract';
  if (/\bbg\s*2\b|bg2|bewerbung.*2|zweit/.test(t)) return 'bg2';
  if (/\bbg\b|bewerbungs?gespr|kennenlern|erstgespr/.test(t)) return 'bg';
  return null;
}

export default function LeadHiringReadiness({ leadId }: Props) {
  const { appointments } = useLeads();
  const [personnelDone, setPersonnelDone] = useState(false);
  const [docsDoneCount, setDocsDoneCount] = useState(0);
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
      setDocsDoneCount(REQUIRED_DOC_KEYS.filter(k => types.has(k)).length);
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

  const items = [
    { label: 'BG (Bewerbungsgespräch)', done: milestones.bg.done, hint: milestones.bg.date ? new Date(milestones.bg.date).toLocaleDateString('de-CH') : 'Noch kein Termin' },
    { label: 'BG2 (Zweitgespräch)', done: milestones.bg2.done, hint: milestones.bg2.date ? new Date(milestones.bg2.date).toLocaleDateString('de-CH') : 'Noch kein Termin' },
    { label: 'Vertragsunterzeichnung', done: milestones.contract.done, hint: milestones.contract.date ? new Date(milestones.contract.date).toLocaleDateString('de-CH') : 'Noch kein Termin' },
    { label: 'Personalien', done: personnelDone, hint: personnelDone ? 'Vollständig eingereicht' : 'Unvollständig' },
    { label: 'Dokumente (Arbeitsvertrag)', done: docsDone, hint: `${docsDoneCount}/${REQUIRED_DOC_KEYS.length} eingereicht` },
  ];

  const doneCount = items.filter(i => i.done).length;
  const total = items.length;
  const pct = Math.round((doneCount / total) * 100);
  const ready = doneCount === total;

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
      </div>
    </div>
  );
}
