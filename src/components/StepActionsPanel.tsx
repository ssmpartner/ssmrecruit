import { useState } from 'react';
import { 
  Phone, PhoneOff, PhoneForwarded, UserX, Building2, ArrowRight, 
  CalendarPlus, Brain, Send, CheckCircle2, Clock, FileText, Upload, 
  Shield, Sparkles, AlertCircle, Ban, ThumbsDown, ClipboardCheck, Eye, UserCheck, BarChart3, HelpCircle
} from 'lucide-react';
import { type LeadStatus, statusConfig } from '@/lib/mock-data';
import { useLeads } from '@/context/useLeads';
import { useToast } from '@/hooks/use-toast';
import StatusWizardDialog, { type WizardType } from './StatusWizardDialog';
import ApprovalWizardDialog, { type ApprovalWizardType } from './ApprovalWizardDialog';

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

const contactOutcomes: { key: ContactOutcome; label: string; icon: typeof Phone; description: string; color: string }[] = [
  { key: 'contacted', label: 'Kontaktiert', icon: Phone, description: 'Erfolgreich erreicht – Wizard öffnen', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  { key: 'callback', label: 'Rückruf gewünscht', icon: PhoneForwarded, description: 'Rückruf-Wizard öffnen', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { key: 'not_reached', label: 'Nicht erreicht', icon: PhoneOff, description: 'Kontaktversuche dokumentieren', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
  { key: 'not_interested', label: 'Nicht interessiert', icon: UserX, description: 'Grund dokumentieren – Lead wird entzogen', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
  { key: 'no_need', label: 'Kein Bedarf', icon: Ban, description: 'Kein Bedarf dokumentieren – Lead wird entzogen', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
  { key: 'not_suitable', label: 'Nicht Passend', icon: ThumbsDown, description: 'Matching dokumentieren – Lead wird entzogen', color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100' },
  { key: 'internal', label: 'Interne Stelle', icon: Building2, description: 'Für interne Position – Lead wird zugewiesen', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
];

export default function StepActionsPanel({
  leadId, leadName, leadStatus, onScheduleAppointment, onOpenInsights, onOpenDocuments,
  discCompleted, documentsCompleted, insightsSent,
}: StepActionsPanelProps) {
  const { updateLead, addActivity } = useLeads();
  const { toast } = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeWizardType, setActiveWizardType] = useState<WizardType>('contacted');
  const [approvalWizardOpen, setApprovalWizardOpen] = useState(false);
  const [approvalWizardType, setApprovalWizardType] = useState<ApprovalWizardType>('controlling');

  const openWizard = (type: WizardType) => {
    setActiveWizardType(type);
    setWizardOpen(true);
  };

  const openApprovalWizard = (type: ApprovalWizardType) => {
    setApprovalWizardType(type);
    setApprovalWizardOpen(true);
  };

  // Step 1: New Lead
  if (leadStatus === 'new') {
    return (
      <>
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-700">1</span>
            </div>
            <h4 className="text-sm font-semibold">Erstkontakt durchführen</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Prüfen Sie die Lead-Daten und führen Sie den Erstkontakt durch. Jede Aktion öffnet einen Wizard.
          </p>
          
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ergebnis des Kontaktversuchs</p>
            {contactOutcomes.map(outcome => (
              <button
                key={outcome.key}
                onClick={() => openWizard(outcome.key)}
                className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${outcome.color}`}
              >
                <outcome.icon className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{outcome.label}</p>
                  <p className="text-[11px] opacity-75">{outcome.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
              </button>
            ))}
          </div>
        </div>

        <StatusWizardDialog
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          wizardType={activeWizardType}
          leadId={leadId}
          leadName={leadName}
        />
      </>
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
          Vereinbaren Sie einen Termin und versenden Sie den DISC-Persönlichkeitstest.
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
              <p className="text-[11px] text-violet-600">Persönlichkeitstest-Link versenden</p>
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
                Nach DISC-Abschluss wird der Status automatisch auf «Follow-up» gesetzt.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Appointment
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
          Erstgespräch durchführen. DISC-Test läuft parallel.
        </p>

        <div className="space-y-2">
          <div className={`flex items-center gap-3 rounded-lg border p-3 ${discCompleted ? 'border-primary/30 bg-primary/5' : 'border-amber-200 bg-amber-50'}`}>
            <Brain className={`h-5 w-5 shrink-0 ${discCompleted ? 'text-primary' : 'text-amber-600'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${discCompleted ? 'text-primary' : 'text-amber-800'}`}>DISC-Persönlichkeitstest</p>
              <p className={`text-[11px] ${discCompleted ? 'text-primary/70' : 'text-amber-600'}`}>
                {discCompleted ? 'Abgeschlossen' : 'Ausstehend – warten auf Kandidat'}
              </p>
            </div>
            {discCompleted ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Clock className="h-5 w-5 text-amber-500 animate-pulse" />}
          </div>

          {!insightsSent && (
            <button onClick={onOpenInsights}
              className="w-full flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-left hover:bg-violet-100 transition-colors">
              <Send className="h-5 w-5 text-violet-700 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-violet-800">DISC-Test jetzt senden</p>
                <p className="text-[11px] text-violet-600">Falls noch nicht versendet</p>
              </div>
            </button>
          )}

          <button onClick={onOpenDocuments}
            className="w-full flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-left hover:bg-blue-100 transition-colors">
            <Upload className="h-5 w-5 text-blue-700 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Dokumente anfordern</p>
              <p className="text-[11px] text-blue-600">CV, Zeugnisse, Zertifikate</p>
            </div>
          </button>
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
          DISC-Ergebnisse besprechen, Dokumente prüfen, finale Entscheidung treffen.
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Brain className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">DISC-Ergebnisse besprechen</p>
              <p className="text-[11px] text-primary/70">Ergebnisse als Gesprächsgrundlage</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>

          <div className={`flex items-center gap-3 rounded-lg border p-3 ${documentsCompleted ? 'border-primary/30 bg-primary/5' : 'border-amber-200 bg-amber-50'}`}>
            <FileText className={`h-5 w-5 shrink-0 ${documentsCompleted ? 'text-primary' : 'text-amber-600'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${documentsCompleted ? 'text-primary' : 'text-amber-800'}`}>Dokumente</p>
              <p className={`text-[11px] ${documentsCompleted ? 'text-primary/70' : 'text-amber-600'}`}>
                {documentsCompleted ? 'Vollständig' : 'Ausstehend'}
              </p>
            </div>
            {documentsCompleted ? <CheckCircle2 className="h-5 w-5 text-primary" /> : (
              <button onClick={onOpenDocuments} className="text-xs font-medium text-amber-700 underline hover:no-underline">Anfordern</button>
            )}
          </div>

          <button onClick={onScheduleAppointment}
            className="w-full flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left hover:bg-emerald-100 transition-colors">
            <CalendarPlus className="h-5 w-5 text-emerald-700 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-800">Follow-up Termin</p>
              <p className="text-[11px] text-emerald-600">Folgegespräch vereinbaren</p>
            </div>
          </button>

          <div className="border-t pt-3 mt-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Finale Entscheidung</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  updateLead(leadId, { status: 'ready_for_controlling' });
                  addActivity(leadId, 'status_change', 'Lead an Controlling übergeben');
                  toast({ title: '📋 An Controlling übergeben', description: `${leadName} wird jetzt vom Controlling geprüft.` });
                }}
                disabled={!documentsCompleted}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <ClipboardCheck className="h-4 w-4" /> An Controlling übergeben
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
                <AlertCircle className="h-3 w-3" /> Alle Dokumente müssen vorliegen.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Controlling Prüfung
  if (leadStatus === 'ready_for_controlling' || leadStatus === 'controlling_approved') {
    return (
      <>
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-cyan-100 flex items-center justify-center">
              <ClipboardCheck className="h-3.5 w-3.5 text-cyan-700" />
            </div>
            <h4 className="text-sm font-semibold">Controlling Prüfung</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Insights, Matching-Score und Dokumente prüfen. Freigabe oder Rückweisung.
          </p>
          <button onClick={() => openApprovalWizard('controlling')}
            className="w-full flex items-center gap-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-left hover:bg-cyan-100 transition-colors">
            <ClipboardCheck className="h-5 w-5 text-cyan-700 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-cyan-800">Controlling Wizard öffnen</p>
              <p className="text-[11px] text-cyan-600">Prüfung durchführen (Approve / Reject / Rückfrage)</p>
            </div>
          </button>
        </div>
        <ApprovalWizardDialog open={approvalWizardOpen} onOpenChange={setApprovalWizardOpen}
          wizardType="controlling" leadId={leadId} leadName={leadName} />
      </>
    );
  }

  // Step 6: Management Review
  if (leadStatus === 'management_review' || leadStatus === 'management_approved') {
    return (
      <>
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
              <Eye className="h-3.5 w-3.5 text-purple-700" />
            </div>
            <h4 className="text-sm font-semibold">Management Review</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Read-only Übersicht der Ergebnisse. Freigabe oder Rückweisung an Controlling.
          </p>
          <button onClick={() => openApprovalWizard('management')}
            className="w-full flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3 text-left hover:bg-purple-100 transition-colors">
            <Eye className="h-5 w-5 text-purple-700 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-800">Management Wizard öffnen</p>
              <p className="text-[11px] text-purple-600">Übersicht prüfen (Approve / Reject)</p>
            </div>
          </button>
        </div>
        <ApprovalWizardDialog open={approvalWizardOpen} onOpenChange={setApprovalWizardOpen}
          wizardType="management" leadId={leadId} leadName={leadName} />
      </>
    );
  }

  // Step 7: HR Processing
  if (leadStatus === 'hr_processing') {
    return (
      <>
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center">
              <UserCheck className="h-3.5 w-3.5 text-teal-700" />
            </div>
            <h4 className="text-sm font-semibold">HR Bearbeitung</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Onboarding-Prozess starten und finalen Status setzen.
          </p>
          <button onClick={() => openApprovalWizard('hr')}
            className="w-full flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-left hover:bg-teal-100 transition-colors">
            <UserCheck className="h-5 w-5 text-teal-700 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-teal-800">HR Wizard öffnen</p>
              <p className="text-[11px] text-teal-600">Onboarding starten & Einstellen</p>
            </div>
          </button>
        </div>
        <ApprovalWizardDialog open={approvalWizardOpen} onOpenChange={setApprovalWizardOpen}
          wizardType="hr" leadId={leadId} leadName={leadName} />
      </>
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
            <strong>{leadName}</strong> wurde erfolgreich eingestellt. Alle Prozessschritte sind archiviert.
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
            Dieser Lead wurde abgelehnt. Prüfen Sie den Aktivitätsverlauf und die Wizard-Historie für Details.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
