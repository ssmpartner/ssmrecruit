import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { statusConfig, type LeadStatus } from '@/lib/mock-data';
import {
  CheckCircle2, XCircle, HelpCircle, Shield, Eye, ClipboardCheck,
  UserCheck, Loader2, AlertTriangle, Brain, FileText, BarChart3, Star
} from 'lucide-react';

export type ApprovalWizardType = 'controlling' | 'management' | 'hr';

type ScoringValue = 'perfekt' | 'sehr_gut' | 'gut' | '';

const SCORING_OPTIONS: { value: ScoringValue; label: string; color: string }[] = [
  { value: 'perfekt', label: 'Perfekt', color: 'text-emerald-700 border-emerald-300 bg-emerald-50' },
  { value: 'sehr_gut', label: 'Sehr gut', color: 'text-blue-700 border-blue-300 bg-blue-50' },
  { value: 'gut', label: 'Gut', color: 'text-amber-700 border-amber-300 bg-amber-50' },
];

const WIZARD_CONFIG: Record<ApprovalWizardType, {
  label: string;
  icon: typeof Shield;
  color: string;
  description: string;
  triggerStatus: LeadStatus;
  approveStatus: LeadStatus;
  rejectStatus: LeadStatus | null;
}> = {
  controlling: {
    label: 'Controlling Prüfung',
    icon: ClipboardCheck,
    color: 'text-cyan-700',
    description: 'Prüfen Sie Insights, Matching-Score und Dokumente.',
    triggerStatus: 'ready_for_controlling',
    approveStatus: 'controlling_approved',
    rejectStatus: 'rejected',
  },
  management: {
    label: 'Management Review',
    icon: Eye,
    color: 'text-purple-700',
    description: 'Übersicht und finale Freigabe oder Rückweisung.',
    triggerStatus: 'management_review',
    approveStatus: 'hr_processing',
    rejectStatus: 'ready_for_controlling',
  },
  hr: {
    label: 'HR Onboarding',
    icon: UserCheck,
    color: 'text-teal-700',
    description: 'Onboarding starten und finalen Status setzen.',
    triggerStatus: 'hr_processing',
    approveStatus: 'hired',
    rejectStatus: null,
  },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wizardType: ApprovalWizardType;
  leadId: string;
  leadName: string;
}

export default function ApprovalWizardDialog({ open, onOpenChange, wizardType, leadId, leadName }: Props) {
  const { updateLead, addActivity } = useLeads();
  const { profile } = useAuth();
  const { toast } = useToast();
  const currentUser = profile?.display_name || 'System';
  const config = WIZARD_CONFIG[wizardType];
  const Icon = config.icon;

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Controlling
  const [controllingAction, setControllingAction] = useState<'selektionieren' | 'ablehnen' | ''>('');
  const [scoring, setScoring] = useState<ScoringValue>('');
  const [rejectReason, setRejectReason] = useState('');

  // Controlling checkboxes
  const [insightsComplete, setInsightsComplete] = useState(false);
  const [matchingOk, setMatchingOk] = useState(false);
  const [docsComplete, setDocsComplete] = useState(false);

  // Management read-only
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [insightsStatus, setInsightsStatus] = useState<string>('—');
  const [controllingDecision, setControllingDecision] = useState<string>('—');

  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    if (!open || wizardType !== 'management') return;
    (async () => {
      const [assessRes, wizRes, insRes] = await Promise.all([
        supabase.from('assessment_results').select('match_result, scores').eq('lead_id', leadId).order('completed_at', { ascending: false }).limit(1),
        supabase.from('status_wizard_results').select('answers, feedback, wizard_type').eq('lead_id', leadId).order('created_at', { ascending: false }),
        supabase.from('insights_requests').select('status').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1),
      ]);

      if (assessRes.data?.[0]) {
        const mr = assessRes.data[0].match_result as any;
        setMatchScore(mr?.overall_score ?? mr?.overallScore ?? null);
      }

      setInsightsStatus(insRes.data?.[0]?.status === 'completed' ? 'Abgeschlossen' : 'Ausstehend');

      const ctrlResult = wizRes.data?.find((w: any) => w.wizard_type === 'controlling_approval');
      if (ctrlResult) {
        const answers = ctrlResult.answers as any;
        setControllingDecision(answers?.scoring ? `Selektioniert (${SCORING_OPTIONS.find(s => s.value === answers.scoring)?.label || answers.scoring})` : 'Freigegeben');
      } else {
        setControllingDecision('Freigegeben (automatisch)');
      }
    })();
  }, [open, wizardType, leadId]);

  const resetForm = () => {
    setFeedback('');
    setInsightsComplete(false);
    setMatchingOk(false);
    setDocsComplete(false);
    setQueryText('');
    setControllingAction('');
    setScoring('');
    setRejectReason('');
  };

  const handleAction = async (action: 'approve' | 'reject' | 'query') => {
    setSubmitting(true);
    try {
      const answers: Record<string, any> = { action };

      if (wizardType === 'controlling') {
        answers.controlling_action = controllingAction;
        answers.scoring = scoring;
        answers.insights_complete = insightsComplete;
        answers.matching_ok = matchingOk;
        answers.docs_complete = docsComplete;
        if (action === 'reject') answers.reject_reason = rejectReason;
      }

      let newStatus: LeadStatus;
      let description: string;

      if (action === 'approve') {
        newStatus = config.approveStatus;
        const scoringLabel = SCORING_OPTIONS.find(s => s.value === scoring)?.label || '';
        description = wizardType === 'controlling'
          ? `Controlling: Selektioniert (${scoringLabel}) → Status: Controlling Approved`
          : `${config.label}: Freigegeben → ${statusConfig[newStatus]?.label || newStatus}`;
      } else if (action === 'reject' && config.rejectStatus) {
        newStatus = config.rejectStatus;
        description = wizardType === 'controlling'
          ? `Controlling: Abgelehnt – ${rejectReason}`
          : `${config.label}: Abgelehnt → zurück an ${statusConfig[newStatus]?.label || newStatus}`;
      } else if (action === 'query') {
        const lead = await supabase.from('leads').select('agency_id, employee_id').eq('id', leadId).single();
        await supabase.from('tasks').insert({
          title: `Rückfrage (Controlling): ${leadName}`,
          description: queryText || 'Rückfrage vom Controlling',
          lead_id: leadId,
          assigned_to: lead.data?.employee_id || '',
          agency_id: lead.data?.agency_id || '',
          priority: 'high',
          source: 'system',
          lead_status: 'ready_for_controlling',
        });
        addActivity(leadId, 'note', `Controlling-Rückfrage erstellt: ${queryText || 'Rückfrage'}`);
        toast({ title: '📋 Rückfrage erstellt', description: 'Task wurde dem zuständigen Mitarbeiter zugewiesen.' });
        onOpenChange(false);
        resetForm();
        setSubmitting(false);
        return;
      } else {
        setSubmitting(false);
        return;
      }

      // Save wizard result
      await supabase.from('status_wizard_results').insert({
        lead_id: leadId,
        wizard_type: `${wizardType}_approval`,
        answers: answers as any,
        feedback: action === 'reject' ? rejectReason : feedback,
        completed_by: currentUser,
        original_employee_id: '',
        lead_withdrawn: false,
        reassigned_to: '',
      });

      // Update lead – on controlling reject, lock lead for employee (read-only via lifecycle)
      const updateData: Record<string, any> = { status: newStatus };
      if (wizardType === 'controlling' && action === 'reject') {
        updateData.lead_lifecycle = 'closed';
      }
      updateLead(leadId, updateData);
      addActivity(leadId, 'status_change', description);

      if (feedback.trim()) {
        addActivity(leadId, 'note', `${config.label} Feedback: ${feedback.trim()}`);
      }

      // Notification – role-specific messages for Controlling
      const notifTitle = wizardType === 'controlling'
        ? (action === 'approve' ? 'Controlling: Selektioniert' : 'Controlling: Abgelehnt')
        : `${config.label} abgeschlossen`;
      const notifDescription = wizardType === 'controlling'
        ? (action === 'approve'
          ? `Dein Kandidat "${leadName}" wurde vom Controlling selektioniert (Status: Controlling Approved).`
          : `Dein Kandidat "${leadName}" wurde vom Controlling abgelehnt.${rejectReason ? ` Begründung: ${rejectReason}` : ''}`)
        : `"${leadName}" – ${action === 'approve' ? 'Freigegeben' : 'Abgelehnt'} von ${currentUser}`;

      await supabase.from('notifications').insert({
        type: wizardType === 'controlling' ? 'lead_status_change' : 'status_change',
        title: notifTitle,
        description: notifDescription,
        lead_id: leadId,
      });

      toast({
        title: action === 'approve'
          ? `✅ Selektioniert (${SCORING_OPTIONS.find(s => s.value === scoring)?.label || ''})`
          : `❌ Abgelehnt`,
        description: action === 'approve'
          ? `${leadName} → Controlling Approved`
          : `${leadName} – Lead gesperrt`,
      });

      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error('Approval wizard failed:', err);
      toast({ title: '❌ Fehler', description: 'Aktion konnte nicht ausgeführt werden.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderControllingFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prüfpunkte</p>
        {[
          { checked: insightsComplete, set: setInsightsComplete, icon: Brain, color: 'text-violet-600', label: 'Insights abgeschlossen', sub: 'DISC & Motivatoren vollständig' },
          { checked: matchingOk, set: setMatchingOk, icon: BarChart3, color: 'text-emerald-600', label: 'Matching Score ausreichend', sub: 'Mindestanforderungen erfüllt' },
          { checked: docsComplete, set: setDocsComplete, icon: FileText, color: 'text-blue-600', label: 'Dokumente vollständig', sub: 'CV, Zeugnisse, Zertifikate vorhanden' },
        ].map(item => (
          <label key={item.label} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <input type="checkbox" checked={item.checked} onChange={e => item.set(e.target.checked)} className="h-4 w-4 rounded border-input" />
            <item.icon className={cn("h-4 w-4 shrink-0", item.color)} />
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.sub}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Aktion */}
      <div className="border-t pt-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entscheidung</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setControllingAction('selektionieren')}
            className={cn("rounded-lg border-2 p-3 text-left transition-all",
              controllingAction === 'selektionieren' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30")}>
            <CheckCircle2 className={cn("h-5 w-5 mb-1", controllingAction === 'selektionieren' ? 'text-primary' : 'text-muted-foreground')} />
            <p className="text-sm font-semibold">Selektionieren</p>
            <p className="text-[10px] text-muted-foreground">Status → Controlling Approved</p>
          </button>
          <button type="button" onClick={() => setControllingAction('ablehnen')}
            className={cn("rounded-lg border-2 p-3 text-left transition-all",
              controllingAction === 'ablehnen' ? "border-destructive bg-destructive/5" : "border-muted hover:border-destructive/30")}>
            <XCircle className={cn("h-5 w-5 mb-1", controllingAction === 'ablehnen' ? 'text-destructive' : 'text-muted-foreground')} />
            <p className="text-sm font-semibold">Ablehnen</p>
            <p className="text-[10px] text-muted-foreground">Lead wird gesperrt</p>
          </button>
        </div>
      </div>

      {/* Scoring */}
      {controllingAction && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Star className="h-3 w-3" /> Scoring
          </p>
          <div className="flex gap-2">
            {SCORING_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setScoring(opt.value)}
                className={cn("flex-1 rounded-lg border-2 py-2 px-3 text-sm font-semibold transition-all",
                  scoring === opt.value ? opt.color : "border-muted text-muted-foreground hover:border-muted-foreground/30")}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Begründung Ablehnung */}
      {controllingAction === 'ablehnen' && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-destructive">Begründung (Pflichtfeld) *</label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
            placeholder="Begründen Sie die Ablehnung..."
            className="w-full rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-destructive/30 resize-none" />
        </div>
      )}

      {/* Rückfrage */}
      <div className="border-t pt-3">
        <label className="text-xs font-medium text-muted-foreground">Rückfrage (optional)</label>
        <textarea value={queryText} onChange={e => setQueryText(e.target.value)} rows={2}
          placeholder="Beschreiben Sie die Rückfrage..."
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
      </div>
    </div>
  );

  const renderFields = () => {
    switch (wizardType) {
      case 'controlling': return renderControllingFields();
      case 'management':
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Read-only Übersicht – Daten aus dem Recruiting-Prozess:</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-600" /><span className="text-sm font-medium">Match Score</span></div>
                <span className="text-sm font-bold">{matchScore !== null ? `${matchScore}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-violet-600" /><span className="text-sm font-medium">Insights</span></div>
                <span className={cn("text-sm font-medium", insightsStatus === 'Abgeschlossen' ? 'text-emerald-700' : 'text-amber-600')}>{insightsStatus}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-cyan-600" /><span className="text-sm font-medium">Controlling</span></div>
                <span className="text-sm font-medium text-emerald-700">{controllingDecision}</span>
              </div>
            </div>
          </div>
        );
      case 'hr':
        return (
          <div className="space-y-3">
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-5 w-5 text-teal-700" />
                <p className="text-sm font-semibold text-teal-800">Onboarding bereit</p>
              </div>
              <p className="text-xs text-teal-700">Alle vorherigen Prüfschritte (Controlling & Management) sind abgeschlossen. Starten Sie den Onboarding-Prozess und setzen Sie den finalen Status.</p>
            </div>
          </div>
        );
    }
  };

  const allChecked = wizardType !== 'controlling' || (insightsComplete && matchingOk && docsComplete);
  const controllingReady = wizardType !== 'controlling' || (controllingAction !== '' && scoring !== '');
  const rejectReady = wizardType !== 'controlling' || controllingAction !== 'ablehnen' || rejectReason.trim().length > 0;
  const canSubmit = allChecked && controllingReady && rejectReady;

  const handleControllingSubmit = () => {
    if (controllingAction === 'selektionieren') handleAction('approve');
    else if (controllingAction === 'ablehnen') handleAction('reject');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
          {renderFields()}

          {wizardType !== 'controlling' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Feedback / Notizen</label>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2}
                placeholder="Optionales Feedback..."
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={() => { resetForm(); onOpenChange(false); }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted transition-colors">Abbrechen</button>

            {wizardType === 'controlling' && queryText.trim() && (
              <button onClick={() => handleAction('query')} disabled={submitting}
                className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" /> Rückfrage
              </button>
            )}

            {wizardType === 'controlling' ? (
              <button onClick={handleControllingSubmit} disabled={submitting || !canSubmit}
                className={cn("rounded-md px-4 py-2 text-sm font-semibold transition-opacity flex items-center gap-1.5 disabled:opacity-50",
                  controllingAction === 'ablehnen' ? "bg-destructive text-destructive-foreground hover:opacity-90" : "bg-primary text-primary-foreground hover:opacity-90")}>
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : controllingAction === 'ablehnen' ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {controllingAction === 'ablehnen' ? 'Ablehnen' : controllingAction === 'selektionieren' ? 'Selektionieren' : 'Entscheidung wählen'}
              </button>
            ) : (
              <>
                {config.rejectStatus && (
                  <button onClick={() => handleAction('reject')} disabled={submitting}
                    className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" /> Ablehnen
                  </button>
                )}
                <button onClick={() => handleAction('approve')} disabled={submitting || !allChecked}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {wizardType === 'hr' ? 'Einstellen' : 'Freigeben'}
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}