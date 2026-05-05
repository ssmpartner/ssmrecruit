import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Phone, PhoneForwarded, PhoneOff, UserX, Ban, ThumbsDown, Building2,
  CalendarIcon, Clock, AlertTriangle, CheckCircle2
} from 'lucide-react';

export type WizardType = 'contacted' | 'callback' | 'not_interested' | 'not_reached' | 'no_need' | 'not_suitable' | 'internal';

const WIZARD_CONFIG: Record<WizardType, { label: string; icon: typeof Phone; color: string; description: string }> = {
  contacted: { label: 'Kontaktiert', icon: Phone, color: 'text-emerald-700', description: 'Dokumentieren Sie den erfolgreichen Kontakt.' },
  callback: { label: 'Rückruf gewünscht', icon: PhoneForwarded, color: 'text-amber-700', description: 'Rückrufdaten und Erinnerung festlegen.' },
  not_interested: { label: 'Nicht interessiert', icon: UserX, color: 'text-red-700', description: 'Grund für das fehlende Interesse dokumentieren.' },
  not_reached: { label: 'Nicht erreicht', icon: PhoneOff, color: 'text-orange-700', description: 'Kontaktversuche dokumentieren.' },
  no_need: { label: 'Kein Bedarf', icon: Ban, color: 'text-rose-700', description: 'Grund dokumentieren, warum kein Bedarf besteht.' },
  not_suitable: { label: 'Nicht passend', icon: ThumbsDown, color: 'text-slate-700', description: 'Begründung für fehlende Eignung dokumentieren.' },
  internal: { label: 'Interne Stelle', icon: Building2, color: 'text-blue-700', description: 'Für interne Position markieren und zuweisen.' },
};

// Statuses that ALWAYS trigger lead withdrawal on submit.
// 'not_reached' is handled separately: only withdraws after 3 attempts (every 48h reminder in between).
const WITHDRAWAL_TYPES: WizardType[] = ['not_interested', 'no_need', 'not_suitable', 'internal'];
const MAX_NOT_REACHED_ATTEMPTS = 3;
const REMINDER_HOURS = 48;

// Superadmin email for reassignment
const SUPERADMIN_EMAIL = 'talent@ssmpartner.ch';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wizardType: WizardType;
  leadId: string;
  leadName: string;
}

export default function StatusWizardDialog({ open, onOpenChange, wizardType, leadId, leadName }: Props) {
  const { updateLead, addActivity, employees, leads, addAppointment } = useLeads();
  const { profile, isSuperadmin } = useAuth();
  const { toast } = useToast();
  const currentUser = profile?.display_name || 'System';

  // Common state
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Contacted wizard (Datum/Uhrzeit werden automatisch beim Submit gesetzt)
  const [contactChannel, setContactChannel] = useState('phone');
  const [contactResult, setContactResult] = useState('appointment');

  // Termin-Felder (nur wenn Ergebnis = "appointment")
  const [aptTitle, setAptTitle] = useState<'BG 1 (Erstgespräch)' | 'BG 2 (Fortsetzung)' | 'Vertragsunterzeichnung' | ''>('');
  const [aptDate, setAptDate] = useState<Date | undefined>(undefined);
  const [aptTime, setAptTime] = useState('09:00');
  const [aptType, setAptType] = useState<'phone' | 'video' | 'onsite'>('video');

  // Callback wizard
  const [callbackDate, setCallbackDate] = useState<Date | undefined>(undefined);
  const [callbackTime, setCallbackTime] = useState('14:00');
  const [callbackReminder, setCallbackReminder] = useState(true);

  // Not interested wizard
  const [notInterestedReason, setNotInterestedReason] = useState('has_job');

  // Not reached wizard
  const [attemptCount, setAttemptCount] = useState(1);

  // No need wizard
  const [noNeedReason, setNoNeedReason] = useState('no_position');

  // Not suitable wizard
  const [matchingFailed, setMatchingFailed] = useState(true);
  const [matchingReason, setMatchingReason] = useState('');
  const [unsuitableLanguages, setUnsuitableLanguages] = useState<string[]>([]);
  const [unsuitableRegisters, setUnsuitableRegisters] = useState<string[]>([]);
  const [unsuitableAgeTooYoung, setUnsuitableAgeTooYoung] = useState(false);
  const [unsuitableAgeTooOld, setUnsuitableAgeTooOld] = useState(false);
  const [unsuitableAge, setUnsuitableAge] = useState('');
  const [unsuitableBirthdate, setUnsuitableBirthdate] = useState('');
  const [unsuitableNoLeads, setUnsuitableNoLeads] = useState(false);
  const [unsuitableNoNetwork, setUnsuitableNoNetwork] = useState(false);

  // Internal wizard
  const [internalConfirmed, setInternalConfirmed] = useState(false);

  const lead = leads.find(l => l.id === leadId);
  const config = WIZARD_CONFIG[wizardType];
  const Icon = config.icon;

  const findSuperadminEmployee = () => {
    return employees.find(e => e.email === SUPERADMIN_EMAIL) || employees[0];
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const answers: Record<string, any> = {};
      let shouldWithdraw = WITHDRAWAL_TYPES.includes(wizardType);
      let newStatus = lead?.status || 'new';
      const originalEmployeeId = lead?.employeeId || '';

      switch (wizardType) {
        case 'contacted': {
          const now = new Date();
          answers.date = format(now, 'yyyy-MM-dd');
          answers.time = format(now, 'HH:mm');
          answers.channel = contactChannel;
          answers.result = contactResult;

          if (contactResult === 'appointment') {
            // Pflichtfelder validieren
            if (!aptTitle || !aptDate) {
              toast({ title: '⚠️ Pflichtfelder', description: 'Bitte Termintyp und Datum auswählen.', variant: 'destructive' });
              setSubmitting(false);
              return;
            }
            // Termin anlegen
            await addAppointment({
              leadId,
              title: aptTitle,
              date: format(aptDate, 'yyyy-MM-dd'),
              time: aptTime,
              duration: 30,
              type: aptType,
              notes: '',
              createdBy: currentUser,
            });
            answers.appointment_title = aptTitle;
            answers.appointment_date = format(aptDate, 'yyyy-MM-dd');
            answers.appointment_time = aptTime;
            answers.appointment_type = aptType;
            // Status wird automatisch durch addAppointment auf 'appointment' gesetzt (autoStatusChange).
            // Falls autoStatusChange aus ist, hier explizit setzen:
            newStatus = 'appointment';
          } else if (contactResult === 'reached_no_appointment') {
            // Erreicht aber ohne Termin → automatisch Rückruf-Status
            newStatus = 'callback';
          } else {
            newStatus = 'contacted';
          }
          break;
        }

        case 'callback': {
          if (!callbackDate) {
            toast({ title: '⚠️ Pflichtfeld', description: 'Bitte Rückrufdatum angeben.', variant: 'destructive' });
            setSubmitting(false);
            return;
          }
          const currentCount = (lead as any)?.callbackCount || 0;
          const newCount = currentCount + 1;
          answers.date = format(callbackDate, 'yyyy-MM-dd');
          answers.time = callbackTime;
          answers.reminder = callbackReminder;
          answers.attempt = newCount;

          if (newCount >= 3) {
            // Max 3 callbacks → escalate
            shouldWithdraw = true;
            newStatus = 'not_reached';
            answers.escalated = true;
            addActivity(leadId, 'status_change', `Rückruflimit erreicht (${newCount}/3) – Lead wird entzogen und Superadmin zugewiesen`);
          } else {
            newStatus = 'callback';
            // Update callback count
            await supabase.from('leads').update({ callback_count: newCount }).eq('id', leadId);
          }
          break;
        }

        case 'not_interested':
          answers.reason = notInterestedReason;
          newStatus = 'not_interested';
          break;

        case 'not_reached': {
          const currentNotReached = (lead as any)?.notReachedCount ?? (lead as any)?.not_reached_count ?? 0;
          const newAttempt = currentNotReached + 1;
          answers.attempt = newAttempt;
          answers.max_attempts = MAX_NOT_REACHED_ATTEMPTS;
          newStatus = 'not_reached';

          const nowIso = new Date().toISOString();
          await supabase.from('leads').update({
            not_reached_count: newAttempt,
            not_reached_last_at: nowIso,
          }).eq('id', leadId);

          if (newAttempt >= MAX_NOT_REACHED_ATTEMPTS) {
            // 3rd attempt → withdraw + archive
            shouldWithdraw = true;
            answers.escalated = true;
            addActivity(leadId, 'status_change', `Limit "Nicht erreicht" erreicht (${newAttempt}/${MAX_NOT_REACHED_ATTEMPTS}) – Lead wird archiviert`);
          } else {
            // Schedule a 48h reminder task for the current owner
            const dueDate = new Date(Date.now() + REMINDER_HOURS * 60 * 60 * 1000);
            await supabase.from('tasks').insert({
              title: `Erneuter Kontaktversuch: ${leadName}`,
              description: `Versuch ${newAttempt}/${MAX_NOT_REACHED_ATTEMPTS} – Lead bitte erneut kontaktieren (Erinnerung nach ${REMINDER_HOURS}h).`,
              lead_id: leadId,
              assigned_to: originalEmployeeId,
              agency_id: lead?.agencyId || null,
              priority: 'medium',
              status: 'open',
              source: 'system',
              due_date: dueDate.toISOString().slice(0, 10),
              lead_status: 'not_reached',
            });
            addActivity(leadId, 'note', `"Nicht erreicht" Versuch ${newAttempt}/${MAX_NOT_REACHED_ATTEMPTS} – Erinnerung in ${REMINDER_HOURS}h geplant`);
          }
          break;
        }

        case 'no_need':
          answers.reason = noNeedReason;
          newStatus = 'no_need';
          break;

        case 'not_suitable':
          answers.matching_failed = matchingFailed;
          answers.reason = matchingReason;
          if (unsuitableLanguages.length > 0) answers.languages = unsuitableLanguages;
          if (unsuitableRegisters.length > 0) answers.registers = unsuitableRegisters;
          if (unsuitableAgeTooYoung) {
            answers.age_too_young = true;
            answers.reactivatable = true;
          }
          if (unsuitableAgeTooOld) {
            answers.age_too_old = true;
          }
          if ((unsuitableAgeTooYoung || unsuitableAgeTooOld)) {
            if (unsuitableAge.trim()) answers.age = unsuitableAge.trim();
            if (unsuitableBirthdate.trim()) answers.birthdate = unsuitableBirthdate.trim();
          }
          if (unsuitableNoLeads) answers.no_leads_150 = true;
          if (unsuitableNoNetwork) answers.no_network = true;
          newStatus = 'not_suitable';
          break;

        case 'internal':
          if (!internalConfirmed) {
            toast({ title: '⚠️ Bestätigung erforderlich', description: 'Bitte bestätigen Sie die interne Stelle.', variant: 'destructive' });
            setSubmitting(false);
            return;
          }
          answers.confirmed = internalConfirmed;
          newStatus = 'internal';
          shouldWithdraw = true;
          break;
      }

      // Save wizard result to DB
      await supabase.from('status_wizard_results').insert({
        lead_id: leadId,
        wizard_type: wizardType,
        answers: answers as any,
        feedback,
        completed_by: currentUser,
        original_employee_id: originalEmployeeId,
        lead_withdrawn: shouldWithdraw,
        reassigned_to: shouldWithdraw ? SUPERADMIN_EMAIL : '',
      });

      // Update lead status
      const statusLabel = config.label;
      updateLead(leadId, { status: newStatus });
      addActivity(leadId, 'status_change', `Wizard "${statusLabel}" abgeschlossen – Status: "${newStatus}"`);

      // Log detailed wizard answers as activity
      const answerDetails = Object.entries(answers)
        .filter(([_, v]) => v !== '' && v !== undefined && v !== null)
        .map(([k, v]) => {
          const labels: Record<string, string> = {
            date: 'Datum', time: 'Uhrzeit', channel: 'Kanal', result: 'Ergebnis',
            reminder: 'Erinnerung', attempt: 'Versuch', reason: 'Grund',
            attempts: 'Versuche', matching_failed: 'Matching fehlgeschlagen',
            confirmed: 'Bestätigt', escalated: 'Eskaliert',
            languages: 'Sprache(n) nicht passend', registers: 'Register-Einträge',
            age_too_young: 'Zu jung', age_too_old: 'Zu alt', age: 'Alter', birthdate: 'Geburtsdatum', reactivatable: 'Später reaktivierbar',
          };
          return `${labels[k] || k}: ${v}`;
        })
        .join(', ');
      if (answerDetails) {
        addActivity(leadId, 'note', `Wizard-Daten (${statusLabel}): ${answerDetails}`);
      }

      if (feedback.trim()) {
        addActivity(leadId, 'note', `Wizard-Feedback (${statusLabel}): ${feedback.trim()}`);
      }

      // Lead withdrawal → archive
      if (shouldWithdraw) {
        const superadmin = findSuperadminEmployee();
        if (superadmin) {
          // Set original_employee_id, reassign, and archive
          await supabase.from('leads').update({
            original_employee_id: originalEmployeeId,
            employee_id: superadmin.id,
            lead_lifecycle: 'archived',
          }).eq('id', leadId);

          updateLead(leadId, { employeeId: superadmin.id, lifecycle: 'archived' });
          addActivity(leadId, 'assignment', `Lead entzogen und an ${superadmin.name} (Superadmin) zugewiesen`);
          addActivity(leadId, 'status_change', `Lead archiviert (Grund: ${statusLabel})`);

          // Create notification
          await supabase.from('notifications').insert({
            type: 'lead_withdrawn',
            title: 'Lead entzogen & archiviert',
            description: `"${leadName}" wurde entzogen und archiviert (${statusLabel}). Neuer Besitzer: ${superadmin.name}`,
            lead_id: leadId,
          });
        }
      }

      // Notification for status change
      await supabase.from('notifications').insert({
        type: 'status_change',
        title: 'Statusänderung via Wizard',
        description: `"${leadName}" – Wizard "${statusLabel}" abgeschlossen von ${currentUser}`,
        lead_id: leadId,
      });

      toast({
        title: `✅ Wizard "${statusLabel}" abgeschlossen`,
        description: shouldWithdraw
          ? `Lead wurde entzogen und dem Superadmin zugewiesen.`
          : `Status wurde aktualisiert.`,
      });

      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error('Wizard submission failed:', err);
      toast({ title: '❌ Fehler', description: 'Wizard konnte nicht gespeichert werden.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFeedback('');
    setContactChannel('phone');
    setContactResult('appointment');
    setAptTitle('');
    setAptDate(undefined);
    setAptTime('09:00');
    setAptType('video');
    setCallbackDate(undefined);
    setCallbackTime('14:00');
    setCallbackReminder(true);
    setNotInterestedReason('has_job');
    setAttemptCount(1);
    setNoNeedReason('no_position');
    setMatchingFailed(true);
    setMatchingReason('');
    setUnsuitableLanguages([]);
    setUnsuitableRegisters([]);
    setUnsuitableAgeTooYoung(false);
    setUnsuitableAgeTooOld(false);
    setUnsuitableAge('');
    setUnsuitableBirthdate('');
    setInternalConfirmed(false);
  };

  const inputCls = "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  const renderWizardFields = () => {
    switch (wizardType) {
      case 'contacted':
        return (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Datum & Uhrzeit werden automatisch erfasst ({format(new Date(), 'dd.MM.yyyy HH:mm')}).
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Kontaktkanal</label>
              <select value={contactChannel} onChange={e => setContactChannel(e.target.value)} className={cn(inputCls, 'mt-1')}>
                <option value="phone">Telefon</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-Mail</option>
                <option value="sms">SMS</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ergebnis</label>
              <select value={contactResult} onChange={e => setContactResult(e.target.value)} className={cn(inputCls, 'mt-1')}>
                <option value="appointment">Termin vereinbart</option>
                <option value="reached_no_appointment">Erreicht ohne Termin (→ Rückruf)</option>
              </select>
            </div>

            {contactResult === 'appointment' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
                <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Termin festlegen (Pflicht)
                </p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Termintyp *</label>
                  <select value={aptTitle} onChange={e => setAptTitle(e.target.value as any)} className={cn(inputCls, 'mt-1')}>
                    <option value="">Bitte wählen…</option>
                    <option value="BG 1 (Erstgespräch)">BG 1 (Erstgespräch)</option>
                    <option value="BG 2 (Fortsetzung)">BG 2 (Fortsetzung)</option>
                    <option value="Vertragsunterzeichnung">Vertragsunterzeichnung</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Datum *</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={cn(inputCls, 'flex items-center gap-1.5 text-left mt-1', !aptDate && 'text-muted-foreground')}>
                          <CalendarIcon className="h-3 w-3" />
                          {aptDate ? format(aptDate, 'dd.MM.yyyy') : 'Wählen'}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={aptDate} onSelect={setAptDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Uhrzeit *</label>
                    <input type="time" value={aptTime} onChange={e => setAptTime(e.target.value)} className={cn(inputCls, 'mt-1')} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Art *</label>
                  <select value={aptType} onChange={e => setAptType(e.target.value as any)} className={cn(inputCls, 'mt-1')}>
                    <option value="phone">Telefon</option>
                    <option value="video">Video</option>
                    <option value="onsite">Vor Ort</option>
                  </select>
                </div>
                <p className="text-[11px] text-emerald-700">
                  → Termin wird unter „Termine" und im Kalender angelegt. Status wird automatisch auf „Termin" gesetzt.
                </p>
              </div>
            )}
          </div>
        );

      case 'callback':
        return (
          <div className="space-y-3">
            {lead && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">
                  Rückruf-Versuch <strong>{((lead as any).callbackCount || 0) + 1}/3</strong> – nach 3 Versuchen wird der Lead automatisch entzogen.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Rückrufdatum *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn(inputCls, 'flex items-center gap-1.5 text-left mt-1', !callbackDate && 'text-muted-foreground')}>
                      <CalendarIcon className="h-3 w-3" />
                      {callbackDate ? format(callbackDate, 'dd.MM.yyyy') : 'Wählen'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={callbackDate} onSelect={setCallbackDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Uhrzeit *</label>
                <input type="time" value={callbackTime} onChange={e => setCallbackTime(e.target.value)} className={cn(inputCls, 'mt-1')} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={callbackReminder} onChange={e => setCallbackReminder(e.target.checked)}
                className="h-4 w-4 rounded border-input" />
              <span className="text-sm">Erinnerung aktivieren</span>
            </label>
          </div>
        );

      case 'not_interested':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Grund *</label>
              <select value={notInterestedReason} onChange={e => setNotInterestedReason(e.target.value)} className={cn(inputCls, 'mt-1')}>
                <option value="has_job">Hat bereits Stelle</option>
                <option value="no_career_change">Kein Quereinsteiger</option>
                <option value="mistake">Irrtümlich</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5">
              <p className="text-xs text-red-800 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Lead wird entzogen und dem Superadmin zugewiesen.
              </p>
            </div>
          </div>
        );

      case 'not_reached': {
        const currentNotReached = (lead as any)?.notReachedCount ?? (lead as any)?.not_reached_count ?? 0;
        const upcomingAttempt = currentNotReached + 1;
        const isFinal = upcomingAttempt >= MAX_NOT_REACHED_ATTEMPTS;
        return (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">Versuch {upcomingAttempt} von {MAX_NOT_REACHED_ATTEMPTS}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bisher dokumentierte Versuche: <strong>{currentNotReached}</strong>
              </p>
            </div>
            {!isFinal ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-2.5">
                <p className="text-xs text-orange-800 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Lead bleibt bei Ihnen. Sie werden in {REMINDER_HOURS}h erneut erinnert.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5">
                <p className="text-xs text-red-800 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Letzter Versuch erreicht – Lead wird archiviert und entzogen.
                </p>
              </div>
            )}
          </div>
        );
      }

      case 'no_need':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Grund *</label>
              <select value={noNeedReason} onChange={e => setNoNeedReason(e.target.value)} className={cn(inputCls, 'mt-1')}>
                <option value="no_position">Keine passende Stelle</option>
                <option value="unfulfillable">Wunsch nicht erfüllbar</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5">
              <p className="text-xs text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Lead wird entzogen und dem Superadmin zugewiesen.
              </p>
            </div>
          </div>
        );

      case 'not_suitable': {
        const toggle = (arr: string[], setter: (v: string[]) => void, val: string) => {
          setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
        };
        const langs = [
          { v: 'de', l: 'Deutsch' },
          { v: 'fr', l: 'Französisch' },
          { v: 'it', l: 'Italienisch' },
          { v: 'en', l: 'Englisch' },
        ];
        const registers = [
          { v: 'betreibung', l: 'Betreibungsregister-Eintrag' },
          { v: 'strafregister', l: 'Strafregister-Eintrag' },
        ];
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={matchingFailed} onChange={e => setMatchingFailed(e.target.checked)}
                className="h-4 w-4 rounded border-input" />
              <span className="text-sm">Matching nicht erfüllt</span>
            </label>

            <div className="rounded-md border bg-muted/30 p-2.5 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Sprache nicht passend (optional, Mehrfachauswahl)</p>
              <div className="grid grid-cols-2 gap-1.5">
                {langs.map(({ v, l }) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={unsuitableLanguages.includes(v)}
                      onChange={() => toggle(unsuitableLanguages, setUnsuitableLanguages, v)}
                      className="h-4 w-4 rounded border-input" />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-2.5 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Register-Einträge (optional)</p>
              {registers.map(({ v, l }) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={unsuitableRegisters.includes(v)}
                    onChange={() => toggle(unsuitableRegisters, setUnsuitableRegisters, v)}
                    className="h-4 w-4 rounded border-input" />
                  {l}
                </label>
              ))}
            </div>

            <div className="rounded-md border bg-muted/30 p-2.5 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Alter (optional)</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={unsuitableAgeTooYoung}
                    onChange={e => setUnsuitableAgeTooYoung(e.target.checked)}
                    className="h-4 w-4 rounded border-input" />
                  Zu jung
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={unsuitableAgeTooOld}
                    onChange={e => setUnsuitableAgeTooOld(e.target.checked)}
                    className="h-4 w-4 rounded border-input" />
                  Zu alt
                </label>
              </div>
              {(unsuitableAgeTooYoung || unsuitableAgeTooOld) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Alter</label>
                    <input type="number" min="0" max="120" value={unsuitableAge}
                      onChange={e => setUnsuitableAge(e.target.value)}
                      placeholder="z.B. 17" className={cn(inputCls, 'mt-1')} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Geburtsdatum</label>
                    <input type="date" value={unsuitableBirthdate}
                      onChange={e => setUnsuitableBirthdate(e.target.value)}
                      className={cn(inputCls, 'mt-1')} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Begründung (optional)</label>
              <textarea value={matchingReason} onChange={e => setMatchingReason(e.target.value)}
                rows={2} placeholder="Weitere Anmerkungen..."
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-xs text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Lead wird entzogen, archiviert und dem Superadmin zugewiesen. Alle Gründe sind in der Aktivität sichtbar – bei „Zu jung" oder Sprache kann der Superadmin später reaktivieren bzw. neu zuweisen.
              </p>
            </div>
          </div>
        );
      }


      case 'internal':
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={internalConfirmed} onChange={e => setInternalConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-input" />
              <span className="text-sm font-medium">Bestätigung Innendienst</span>
            </label>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 space-y-1">
              <p className="text-xs text-blue-800 font-medium">Zuweisung nach Abschluss:</p>
              <p className="text-xs text-blue-700">• Organisation: Hauptsitz Agentur</p>
              <p className="text-xs text-blue-700">• Benutzer: talent@ssmpartner.ch</p>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-muted", config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base">{config.label}</DialogTitle>
              <DialogDescription className="text-xs">{leadName} – {config.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {renderWizardFields()}

          {/* Feedback – always present */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Feedback / Notizen</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
              rows={3} placeholder="Freitext-Feedback zum Lead..."
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={() => { resetForm(); onOpenChange(false); }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted transition-colors">
              Abbrechen
            </button>
            {isSuperadmin && (
              <button
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    const lead = leads.find(l => l.id === leadId);
                    const originalEmployeeId = lead?.employeeId || '';
                    let newStatus = lead?.status || 'new';
                    const shouldWithdraw = WITHDRAWAL_TYPES.includes(wizardType);

                    switch (wizardType) {
                      case 'contacted': newStatus = 'contacted'; break;
                      case 'callback': newStatus = 'callback'; break;
                      case 'not_interested': newStatus = 'not_interested'; break;
                      case 'not_reached': newStatus = 'not_reached'; break;
                      case 'no_need': newStatus = 'no_need'; break;
                      case 'not_suitable': newStatus = 'not_suitable'; break;
                      case 'internal': newStatus = 'internal'; break;
                    }

                    await supabase.from('status_wizard_results').insert({
                      lead_id: leadId,
                      wizard_type: wizardType,
                      answers: { skipped_by_superadmin: true } as any,
                      feedback: '',
                      completed_by: currentUser,
                      original_employee_id: originalEmployeeId,
                      lead_withdrawn: shouldWithdraw,
                      reassigned_to: shouldWithdraw ? SUPERADMIN_EMAIL : '',
                    });

                    updateLead(leadId, { status: newStatus });
                    addActivity(leadId, 'status_change', `Status "${config.label}" ohne Angaben festgelegt (Superadmin)`);

                    if (shouldWithdraw) {
                      const superadmin = findSuperadminEmployee();
                      if (superadmin) {
                        await supabase.from('leads').update({
                          original_employee_id: originalEmployeeId,
                          employee_id: superadmin.id,
                          lead_lifecycle: 'archived',
                        }).eq('id', leadId);
                        updateLead(leadId, { employeeId: superadmin.id, lifecycle: 'archived' });
                        addActivity(leadId, 'status_change', `Lead archiviert (Grund: ${config.label})`);
                      }
                    }

                    toast({ title: '✅ Status festgelegt', description: `"${config.label}" ohne Angaben gesetzt.` });
                    resetForm();
                    onOpenChange(false);
                  } catch (err) {
                    toast({ title: 'Fehler', description: 'Status konnte nicht gesetzt werden.', variant: 'destructive' });
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting}
                className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
              >
                Status ohne Angaben festlegen
              </button>
            )}
            <button onClick={handleSubmit} disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
              {submitting ? 'Speichere...' : 'Status festlegen'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
