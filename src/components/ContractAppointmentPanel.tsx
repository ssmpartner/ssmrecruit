import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarCheck, CalendarPlus, CalendarIcon, Loader2, Plus, X, CheckCircle2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isSwissHoliday, getHolidayForDate } from '@/lib/swiss-holidays';

export const CONTRACT_APPOINTMENT_TITLE = 'Vertragsunterzeichnung';
const MAX_SUGGESTIONS = 3;

export interface ContractSuggestion {
  id: string;
  lead_id: string;
  suggested_date: string;
  suggested_time: string;
  status: string;
  duration: number | null;
  appointment_type: string | null;
  notes: string | null;
  created_by_name: string | null;
  responded_at: string | null;
}

const typeLabels: Record<string, string> = { phone: 'Telefon', video: 'Video-Call', onsite: 'Vor Ort' };

interface Props {
  leadId: string;
  /** 'hr' = HR plant/schlägt vor · 'employee' = Bearbeiter bestätigt */
  mode: 'hr' | 'employee';
}

export default function ContractAppointmentPanel({ leadId, mode }: Props) {
  const { leads, employees, addAppointment } = useLeads();
  const { profile } = useAuth();
  const { toast } = useToast();
  const lead = leads.find(l => l.id === leadId);
  const assignedEmployee = employees.find(e => e.id === lead?.employeeId);

  const [suggestions, setSuggestions] = useState<ContractSuggestion[]>([]);
  const [hasAppointment, setHasAppointment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ date?: Date; time: string; duration: number; type: string; notes: string }>({
    date: undefined, time: '09:00', duration: 60, type: 'onsite', notes: '',
  });

  const load = useCallback(async () => {
    const [sRes, aRes] = await Promise.all([
      (supabase as any).from('appointment_suggestions')
        .select('*').eq('lead_id', leadId).eq('purpose', 'contract_signing')
        .order('suggested_date', { ascending: true }),
      supabase.from('appointments').select('id,title').eq('lead_id', leadId),
    ]);
    setSuggestions((sRes.data ?? []) as ContractSuggestion[]);
    setHasAppointment(((aRes.data ?? []) as { title: string }[]).some(a => a.title === CONTRACT_APPOINTMENT_TITLE));
  }, [leadId]);

  useEffect(() => {
    load();
    const ch = supabase.channel(`contract-apt-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_suggestions', filter: `lead_id=eq.${leadId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `lead_id=eq.${leadId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [leadId, load]);

  const pending = useMemo(() => suggestions.filter(s => s.status === 'pending'), [suggestions]);
  const accepted = useMemo(() => suggestions.find(s => s.status === 'accepted'), [suggestions]);

  async function notify(type: string, title: string, description: string) {
    try {
      await supabase.functions.invoke('notify-event', {
        body: {
          notification_type: type,
          entity_type: 'appointment',
          entity_id: leadId,
          lead_id: leadId,
          title,
          description,
          trigger_label: type,
        },
      });
    } catch {
      // Benachrichtigung darf den Ablauf nicht blockieren
    }
  }

  async function addSuggestion() {
    if (!form.date || busy) return;
    if (pending.length >= MAX_SUGGESTIONS) {
      toast({ title: 'Maximal 3 Vorschläge', description: 'Bitte einen offenen Vorschlag entfernen.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('appointment_suggestions').insert({
        lead_id: leadId,
        suggested_date: format(form.date, 'yyyy-MM-dd'),
        suggested_time: form.time,
        status: 'pending',
        source: 'hr',
        purpose: 'contract_signing',
        appointment_title: CONTRACT_APPOINTMENT_TITLE,
        appointment_type: form.type,
        duration: form.duration,
        notes: form.notes.trim(),
        created_by_user_id: user?.id ?? null,
        created_by_name: profile?.display_name ?? 'HR',
      });
      if (error) throw error;
      await supabase.from('activities').insert({
        id: crypto.randomUUID(), lead_id: leadId, type: 'appointment',
        description: `HR-Terminvorschlag Vertragsunterzeichnung: ${format(form.date, 'dd.MM.yyyy')} um ${form.time} (${typeLabels[form.type] ?? form.type})`,
        user: profile?.display_name ?? 'HR',
      });
      await notify(
        'contract_appointment_proposed',
        `Vertragstermin-Vorschlag: ${lead?.name ?? leadId}`,
        `HR schlägt ${format(form.date, 'dd.MM.yyyy')} um ${form.time} Uhr für die Vertragsunterzeichnung vor. Bitte im Reiter «Termine» bestätigen.`,
      );
      setShowForm(false);
      setForm({ date: undefined, time: '09:00', duration: 60, type: 'onsite', notes: '' });
      toast({ title: '✅ Vorschlag gesendet', description: `${assignedEmployee?.name ?? 'Der Bearbeiter'} wurde benachrichtigt.` });
      await load();
    } catch (e) {
      toast({ title: 'Fehler', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function removeSuggestion(id: string) {
    setBusy(true);
    try {
      await (supabase as any).from('appointment_suggestions').delete().eq('id', id);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function confirmSuggestion(s: ContractSuggestion) {
    if (busy) return;
    setBusy(true);
    try {
      await addAppointment({
        leadId,
        title: CONTRACT_APPOINTMENT_TITLE,
        date: s.suggested_date,
        time: s.suggested_time,
        duration: s.duration ?? 60,
        type: (s.appointment_type ?? 'onsite') as 'phone' | 'video' | 'onsite',
        notes: s.notes ?? '',
        createdBy: profile?.display_name || 'System',
      });
      await (supabase as any).from('appointment_suggestions')
        .update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', s.id);
      for (const other of pending.filter(p => p.id !== s.id)) {
        await (supabase as any).from('appointment_suggestions')
          .update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', other.id);
      }
      await notify(
        'contract_appointment_confirmed',
        `Vertragstermin bestätigt: ${lead?.name ?? leadId}`,
        `${profile?.display_name ?? 'Der Bearbeiter'} hat den Termin am ${new Date(s.suggested_date).toLocaleDateString('de-CH')} um ${s.suggested_time} Uhr bestätigt.`,
      );
      toast({ title: '✅ Termin bestätigt', description: 'Der Termin ist im Kalender eingetragen.' });
      await load();
    } catch (e) {
      toast({ title: 'Fehler', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'h-9 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring';
  const holiday = form.date ? getHolidayForDate(form.date) : undefined;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">Vertragsunterzeichnung</div>
            <div className="text-[11px] text-muted-foreground">
              Wird durch HR festgelegt · {assignedEmployee?.name ? `Bearbeiter: ${assignedEmployee.name}` : 'kein Bearbeiter'}
            </div>
          </div>
        </div>
        {mode === 'hr' && !hasAppointment && (
          <button
            type="button"
            onClick={() => setShowForm(v => !v)}
            disabled={pending.length >= MAX_SUGGESTIONS}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Vorschlag ({pending.length}/{MAX_SUGGESTIONS})
          </button>
        )}
      </div>

      <div className="space-y-3 p-3">
        {hasAppointment && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Termin ist fix eingetragen und im Kalender sichtbar.
          </div>
        )}

        {mode === 'hr' && showForm && !hasAppointment && (
          <div className="space-y-2.5 rounded-md border bg-muted/30 p-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs text-muted-foreground">Datum *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn(inputCls, 'flex items-center gap-1.5 text-left', !form.date && 'text-muted-foreground')}>
                      <CalendarIcon className="h-3 w-3" />
                      {form.date ? format(form.date, 'dd.MM.yyyy') : 'Wählen'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.date}
                      onSelect={d => setForm(p => ({ ...p, date: d }))}
                      disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      modifiers={{ holiday: (date: Date) => isSwissHoliday(date) }}
                      modifiersClassNames={{ holiday: 'text-destructive font-semibold' }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Uhrzeit</label>
                <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Art</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Dauer</label>
                <select value={form.duration} onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))} className={inputCls}>
                  {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} Min.</option>)}
                </select>
              </div>
            </div>
            {holiday && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                <strong>Achtung – Feiertag:</strong> «{holiday.name}»
                {holiday.national ? ' (ganze Schweiz)' : ` (nur in: ${(holiday.cantons ?? []).join(', ')})`}
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Notiz für den Bearbeiter</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                placeholder="Optional, z. B. Ort oder Unterlagen"
                className="w-full resize-none rounded-md border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">Abbrechen</button>
              <button
                onClick={addSuggestion}
                disabled={!form.date || busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                Vorschlag senden
              </button>
            </div>
          </div>
        )}

        {suggestions.length === 0 && !hasAppointment && (
          <div className="flex items-start gap-2 rounded-md border border-dashed px-2.5 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {mode === 'hr'
              ? 'Noch keine Vorschläge. HR kann bis zu 3 Terminvorschläge senden – der Bearbeiter bestätigt einen davon.'
              : 'Der Termin für die Vertragsunterzeichnung wird vom HR vorgeschlagen. Sobald Vorschläge vorliegen, erscheinen sie hier zur Bestätigung.'}
          </div>
        )}

        {suggestions.map(s => {
          const dateStr = new Date(s.suggested_date).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
          return (
            <div
              key={s.id}
              className={cn(
                'flex items-center gap-3 rounded-md border p-2.5',
                s.status === 'accepted' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20'
                  : s.status === 'declined' ? 'border-muted bg-muted/30 opacity-60'
                  : 'bg-background',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', s.status === 'declined' && 'line-through text-muted-foreground')}>
                  {dateStr} um {s.suggested_time} Uhr
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {typeLabels[s.appointment_type ?? 'onsite'] ?? s.appointment_type} · {s.duration ?? 60} Min.
                  {s.created_by_name ? ` · von ${s.created_by_name}` : ''}
                  {' · '}
                  {s.status === 'pending' ? 'Wartet auf Bestätigung' : s.status === 'accepted' ? 'Bestätigt' : 'Abgelehnt'}
                </p>
                {s.notes && <p className="mt-0.5 text-[11px] text-muted-foreground">{s.notes}</p>}
              </div>
              {s.status === 'pending' && mode === 'employee' && (
                <button
                  onClick={() => confirmSuggestion(s)}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarCheck className="h-3 w-3" />} Bestätigen
                </button>
              )}
              {s.status === 'pending' && mode === 'hr' && (
                <button
                  onClick={() => removeSuggestion(s.id)}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" /> Entfernen
                </button>
              )}
            </div>
          );
        })}

        {accepted && !hasAppointment && (
          <p className="text-[11px] text-muted-foreground">Bestätigter Vorschlag – Termin wird im Kalender geführt.</p>
        )}
      </div>
    </div>
  );
}
