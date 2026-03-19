import { useState } from 'react';
import { 
  Phone, PhoneOff, PhoneForwarded, UserX, Building2, ArrowRight, 
  CalendarPlus, Brain, Send, CheckCircle2, Clock, FileText, Upload, 
  Shield, Sparkles, AlertCircle, Ban, ThumbsDown
} from 'lucide-react';
import { type LeadStatus, statusConfig } from '@/lib/mock-data';
import { useLeads } from '@/context/useLeads';
import { useToast } from '@/hooks/use-toast';

interface StepActionsPanelProps {
  leadId: string;
  leadName: string;
  leadStatus: LeadStatus;
  onScheduleAppointment: () => void;
  onOpenInsights: () => void;
  onOpenDocuments: () => void;
  discCompleted: boolean;
  documentsCompleted: boolean;
  insightsSent: boolean;
}

type ContactOutcome = 'contacted' | 'callback' | 'not_reached' | 'not_interested' | 'no_need' | 'not_suitable' | 'internal';

const contactOutcomes: { key: ContactOutcome; label: string; icon: typeof Phone; description: string; color: string; action: 'advance' | 'log' | 'reject' | 'special' }[] = [
  { key: 'contacted', label: 'Kontaktiert', icon: Phone, description: 'Erfolgreich erreicht – weiter zum nächsten Schritt', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', action: 'advance' },
  { key: 'callback', label: 'Rückruf gewünscht', icon: PhoneForwarded, description: 'Lead möchte zurückgerufen werden', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', action: 'log' },
  { key: 'not_reached', label: 'Nicht erreicht', icon: PhoneOff, description: 'Erneuten Kontaktversuch planen', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100', action: 'log' },
  { key: 'not_interested', label: 'Nicht interessiert', icon: UserX, description: 'Lead hat kein Interesse – ablehnen', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100', action: 'reject' },
  { key: 'no_need', label: 'Kein Bedarf', icon: Ban, description: 'Lead hat aktuell keinen Bedarf – ablehnen', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100', action: 'reject' },
  { key: 'not_suitable', label: 'Nicht Passend', icon: ThumbsDown, description: 'Lead passt nicht zum Profil – ablehnen', color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100', action: 'reject' },
  { key: 'internal', label: 'Interne Stelle', icon: Building2, description: 'Für interne Position markieren', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', action: 'special' },
];

export default function StepActionsPanel({
  leadId, leadName, leadStatus, onScheduleAppointment, onOpenInsights, onOpenDocuments,
  discCompleted, documentsCompleted, insightsSent,
}: StepActionsPanelProps) {
  const { updateLead, addActivity } = useLeads();
  const { toast } = useToast();
  const [callbackNote, setCallbackNote] = useState('');
  const [showCallbackInput, setShowCallbackInput] = useState(false);

  const handleContactOutcome = (outcome: ContactOutcome) => {
    switch (outcome) {
      case 'contacted':
        updateLead(leadId, { status: 'contacted' });
        addActivity(leadId, 'status_change', `Erstkontakt erfolgreich – Status auf "Kontaktiert" gesetzt`);
        toast({ title: '✅ Kontakt erfolgreich', description: `${leadName} wurde erfolgreich kontaktiert.` });
        break;
      case 'callback':
        setShowCallbackInput(true);
        addActivity(leadId, 'note', `Rückruf gewünscht${callbackNote ? `: ${callbackNote}` : ''}`);
        toast({ title: '📞 Rückruf notiert', description: 'Rückrufwunsch wurde protokolliert.' });
        break;
      case 'not_reached':
        addActivity(leadId, 'note', 'Kontaktversuch: Nicht erreicht');
        toast({ title: '📵 Nicht erreicht', description: 'Kontaktversuch wurde protokolliert.' });
        break;
      case 'not_interested':
        updateLead(leadId, { status: 'rejected' });
        addActivity(leadId, 'status_change', 'Lead nicht interessiert – abgelehnt');
        toast({ title: '❌ Abgelehnt', description: `${leadName} wurde als "Nicht interessiert" markiert.` });
        break;
      case 'no_need':
        updateLead(leadId, { status: 'rejected' });
        addActivity(leadId, 'status_change', 'Kein Bedarf – abgelehnt');
        toast({ title: '🚫 Kein Bedarf', description: `${leadName} wurde als "Kein Bedarf" markiert.` });
        break;
      case 'not_suitable':
        updateLead(leadId, { status: 'rejected' });
        addActivity(leadId, 'status_change', 'Nicht passend – abgelehnt');
        toast({ title: '👎 Nicht Passend', description: `${leadName} wurde als "Nicht Passend" markiert.` });
        break;
      case 'internal':
        addActivity(leadId, 'note', 'Für interne Stelle markiert');
        updateLead(leadId, { notes: `[INTERN] ${leadName}` });
        toast({ title: '🏢 Interne Stelle', description: 'Lead wurde für eine interne Position markiert.' });
        break;
    }
  };

  // Step 1: New Lead
  if (leadStatus === 'new') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-700">1</span>
          </div>
          <h4 className="text-sm font-semibold">Erstkontakt durchführen</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Prüfen Sie die Lead-Daten, weisen Sie den Lead einer Agentur/Mitarbeiter zu und führen Sie den Erstkontakt durch.
        </p>
        
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ergebnis des Kontaktversuchs</p>
          {contactOutcomes.map(outcome => (
            <button
              key={outcome.key}
              onClick={() => handleContactOutcome(outcome.key)}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${outcome.color}`}
            >
              <outcome.icon className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{outcome.label}</p>
                <p className="text-[11px] opacity-75">{outcome.description}</p>
              </div>
              {outcome.action === 'advance' && <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />}
            </button>
          ))}
        </div>

        {showCallbackInput && (
          <div className="rounded-lg border bg-amber-50/50 p-3 space-y-2">
            <label className="text-xs font-medium text-amber-800">Rückruf-Notiz</label>
            <div className="flex gap-2">
              <input
                value={callbackNote}
                onChange={e => setCallbackNote(e.target.value)}
                placeholder="z.B. Morgen 14:00 Uhr anrufen..."
                className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => {
                  if (callbackNote.trim()) {
                    addActivity(leadId, 'note', `Rückruf-Notiz: ${callbackNote.trim()}`);
                    toast({ title: 'Notiz gespeichert' });
                  }
                  setShowCallbackInput(false);
                  setCallbackNote('');
                }}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
              >
                Speichern
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 2: Contacted
  if (leadStatus === 'contacted') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-xs font-bold text-amber-700">2</span>
          </div>
          <h4 className="text-sm font-semibold">Termin & DISC vorbereiten</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Vereinbaren Sie einen Termin und versenden Sie gleichzeitig den DISC-Persönlichkeitstest. Nach Abschluss des Tests wird der Status automatisch aktualisiert.
        </p>

        <div className="space-y-2">
          <button
            onClick={() => {
              onScheduleAppointment();
              updateLead(leadId, { status: 'appointment' });
              addActivity(leadId, 'status_change', 'Termin vereinbart – Status auf "Terminiert" gesetzt');
            }}
            className="w-full flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left hover:bg-emerald-100 transition-colors"
          >
            <CalendarPlus className="h-5 w-5 text-emerald-700 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-800">Termin vereinbaren</p>
              <p className="text-[11px] text-emerald-600">Erstgespräch planen & Status auf "Terminiert" setzen</p>
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-500" />
          </button>

          <button
            onClick={onOpenInsights}
            className="w-full flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-left hover:bg-violet-100 transition-colors"
          >
            <Brain className="h-5 w-5 text-violet-700 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-violet-800">DISC/Insights-Test senden</p>
              <p className="text-[11px] text-violet-600">Persönlichkeitstest-Link an den Kandidaten versenden</p>
            </div>
            {insightsSent ? (
              <span className="flex items-center gap-1 rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                <Clock className="h-3 w-3" /> Gesendet
              </span>
            ) : (
              <Send className="h-4 w-4 text-violet-500" />
            )}
          </button>
        </div>

        <div className="rounded-lg bg-muted/40 border p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">Automatisierung</p>
              <p className="text-[11px] text-muted-foreground">
                Wenn der Kandidat den DISC-Test abschliesst, wird der Status automatisch auf «Follow-up» gesetzt. 
                Der Lead kann dabei Terminvorschläge für das Folgegespräch angeben.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Appointment (waiting for DISC)
  if (leadStatus === 'appointment') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-xs font-bold text-emerald-700">3</span>
          </div>
          <h4 className="text-sm font-semibold">Termin & Qualifizierung</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Führen Sie das Erstgespräch durch. Der DISC-Test läuft parallel – nach Abschluss wird der Lead automatisch zum Follow-up weitergeleitet.
        </p>

        <div className="space-y-2">
          {/* DISC Status */}
          <div className={`flex items-center gap-3 rounded-lg border p-3 ${discCompleted ? 'border-primary/30 bg-primary/5' : 'border-amber-200 bg-amber-50'}`}>
            <Brain className={`h-5 w-5 shrink-0 ${discCompleted ? 'text-primary' : 'text-amber-600'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${discCompleted ? 'text-primary' : 'text-amber-800'}`}>
                DISC-Persönlichkeitstest
              </p>
              <p className={`text-[11px] ${discCompleted ? 'text-primary/70' : 'text-amber-600'}`}>
                {discCompleted ? 'Abgeschlossen – Ergebnisse verfügbar' : 'Ausstehend – warten auf Kandidat'}
              </p>
            </div>
            {discCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
            )}
          </div>

          {!insightsSent && (
            <button
              onClick={onOpenInsights}
              className="w-full flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-left hover:bg-violet-100 transition-colors"
            >
              <Send className="h-5 w-5 text-violet-700 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-violet-800">DISC-Test jetzt senden</p>
                <p className="text-[11px] text-violet-600">Falls noch nicht versendet</p>
              </div>
            </button>
          )}

          <button
            onClick={onOpenDocuments}
            className="w-full flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-left hover:bg-blue-100 transition-colors"
          >
            <Upload className="h-5 w-5 text-blue-700 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Dokumente anfordern</p>
              <p className="text-[11px] text-blue-600">CV, Zeugnisse, Zertifikate vom Kandidaten anfordern</p>
            </div>
          </button>
        </div>

        <div className="rounded-lg bg-muted/40 border p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              <strong>Auto-Transition:</strong> Nach DISC-Abschluss → Status wechselt automatisch auf «Follow-up». 
              Der Kandidat kann Terminvorschläge übermitteln.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Follow-up
  if (leadStatus === 'follow_up') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center">
            <span className="text-xs font-bold text-violet-700">4</span>
          </div>
          <h4 className="text-sm font-semibold">Follow-up & Entscheidung</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Besprechen Sie die DISC-Ergebnisse, prüfen Sie Dokumente und treffen Sie die finale Entscheidung.
        </p>

        <div className="space-y-2">
          {/* DISC Results */}
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Brain className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">DISC-Ergebnisse besprechen</p>
              <p className="text-[11px] text-primary/70">Ergebnisse als Gesprächsgrundlage nutzen</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>

          {/* Documents Status */}
          <div className={`flex items-center gap-3 rounded-lg border p-3 ${documentsCompleted ? 'border-primary/30 bg-primary/5' : 'border-amber-200 bg-amber-50'}`}>
            <FileText className={`h-5 w-5 shrink-0 ${documentsCompleted ? 'text-primary' : 'text-amber-600'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${documentsCompleted ? 'text-primary' : 'text-amber-800'}`}>Dokumente</p>
              <p className={`text-[11px] ${documentsCompleted ? 'text-primary/70' : 'text-amber-600'}`}>
                {documentsCompleted ? 'Vollständig eingereicht' : 'Noch ausstehend – bitte prüfen'}
              </p>
            </div>
            {documentsCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <button onClick={onOpenDocuments} className="text-xs font-medium text-amber-700 underline hover:no-underline">
                Anfordern
              </button>
            )}
          </div>

          <button
            onClick={onScheduleAppointment}
            className="w-full flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left hover:bg-emerald-100 transition-colors"
          >
            <CalendarPlus className="h-5 w-5 text-emerald-700 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-800">Follow-up Termin</p>
              <p className="text-[11px] text-emerald-600">Folgegespräch vereinbaren</p>
            </div>
          </button>

          {/* Approval / Final Decision */}
          <div className="border-t pt-3 mt-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Finale Entscheidung</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  updateLead(leadId, { status: 'hired' });
                  addActivity(leadId, 'status_change', 'Lead eingestellt – Freigabe erteilt');
                  toast({ title: '🎉 Eingestellt!', description: `${leadName} wurde erfolgreich eingestellt.` });
                }}
                disabled={!documentsCompleted}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Shield className="h-4 w-4" /> Freigabe & Einstellen
              </button>
              <button
                onClick={() => {
                  updateLead(leadId, { status: 'rejected' });
                  addActivity(leadId, 'status_change', 'Lead abgelehnt im Follow-up');
                  toast({ title: '❌ Abgelehnt', description: `${leadName} wurde abgelehnt.` });
                }}
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                Ablehnen
              </button>
            </div>
            {!documentsCompleted && (
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Alle Dokumente müssen vorliegen, bevor die Freigabe erteilt werden kann.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Hired
  if (leadStatus === 'hired') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-green-700" />
          </div>
          <h4 className="text-sm font-semibold text-green-800">Erfolgreich eingestellt</h4>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">
            <strong>{leadName}</strong> wurde erfolgreich durch den Recruiting-Prozess geführt und eingestellt. 
            Alle Prozessschritte und Dokumente sind archiviert.
          </p>
        </div>
      </div>
    );
  }

  // Rejected
  if (leadStatus === 'rejected') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
            <UserX className="h-4 w-4 text-red-700" />
          </div>
          <h4 className="text-sm font-semibold text-red-800">Abgelehnt</h4>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Dieser Lead wurde abgelehnt. Prüfen Sie den Aktivitätsverlauf für Details.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
