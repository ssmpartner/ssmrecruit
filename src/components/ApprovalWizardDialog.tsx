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
  UserCheck, Loader2, AlertTriangle, Brain, FileText, BarChart3
} from 'lucide-react';

export type ApprovalWizardType = 'controlling' | 'management' | 'hr';

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
    approveStatus: 'management_review',
    rejectStatus: 'follow_up',
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

  // Controlling checkboxes
  const [insightsComplete, setInsightsComplete] = useState(false);
  const [matchingOk, setMatchingOk] = useState(false);
  const [docsComplete, setDocsComplete] = useState(false);

  // Management read-only data
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [insightsStatus, setInsightsStatus] = useState<string>('—');
  const [controllingDecision, setControllingDecision] = useState<string>('—');

  // Query task text
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    if (!open || wizardType !== 'management') return;
    // Load assessment data for management review
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
        setControllingDecision('Freigegeben');
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
  };

  const handleAction = async (action: 'approve' | 'reject' | 'query') => {
    setSubmitting(true);
    try {
      const answers: Record<string, any> = { action };

      if (wizardType === 'controlling') {
        answers.insights_complete = insightsComplete;
        answers.matching_ok = matchingOk;
        answers.docs_complete = docsComplete;
      }

      let newStatus: LeadStatus;
      let description: string;

      if (action === 'approve') {
        newStatus = config.approveStatus;
        description = `${config.label}: Freigegeben → ${statusConfig[newStatus].label}`;
      } else if (action === 'reject' && config.rejectStatus) {
        newStatus = config.rejectStatus;
        description = `${config.label}: Abgelehnt → zurück an ${statusConfig[newStatus].label}`;
      } else if (action === 'query') {
        // Create task instead of status change
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
        feedback,
        completed_by: currentUser,
        original_employee_id: '',
        lead_withdrawn: false,
        reassigned_to: '',
      });

      // Update status
      updateLead(leadId, { status: newStatus });
      addActivity(leadId, 'status_change', description);

      if (feedback.trim()) {
        addActivity(leadId, 'note', `${config.label} Feedback: ${feedback.trim()}`);
      }

      // Notification
      await supabase.from('notifications').insert({
        type: 'status_change',
        title: `${config.label} abgeschlossen`,
        description: `"${leadName}" – ${action === 'approve' ? 'Freigegeben' : 'Abgelehnt'} von ${currentUser}`,
        lead_id: leadId,
      });

      toast({
        title: action === 'approve' ? `✅ ${config.label}: Freigegeben` : `↩️ ${config.label}: Zurückgewiesen`,
        description: `Status → ${statusConfig[newStatus].label}`,
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

  const renderFields = () => {
    switch (wizardType) {
      case 'controlling':
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Bitte prüfen Sie die folgenden Punkte:</p>
            <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="checkbox" checked={insightsComplete} onChange={e => setInsightsComplete(e.target.checked)}
                className="h-4 w-4 rounded border-input" />
              <Brain className="h-4 w-4 text-violet-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">Insights abgeschlossen</p>
                <p className="text-[11px] text-muted-foreground">DISC & Motivatoren vollständig</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="checkbox" checked={matchingOk} onChange={e => setMatchingOk(e.target.checked)}
                className="h-4 w-4 rounded border-input" />
              <BarChart3 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">Matching Score ausreichend</p>
                <p className="text-[11px] text-muted-foreground">Mindestanforderungen erfüllt</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="checkbox" checked={docsComplete} onChange={e => setDocsComplete(e.target.checked)}
                className="h-4 w-4 rounded border-input" />
              <FileText className="h-4 w-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">Dokumente vollständig</p>
                <p className="text-[11px] text-muted-foreground">CV, Zeugnisse, Zertifikate vorhanden</p>
              </div>
            </label>

            {/* Query section */}
            <div className="border-t pt-3">
              <label className="text-xs font-medium text-muted-foreground">Rückfrage (optional)</label>
              <textarea value={queryText} onChange={e => setQueryText(e.target.value)}
                rows={2} placeholder="Beschreiben Sie die Rückfrage..."
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </div>
        );

      case 'management':
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Read-only Übersicht – Daten aus dem Recruiting-Prozess:</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">Match Score</span>
                </div>
                <span className="text-sm font-bold">{matchScore !== null ? `${matchScore}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-600" />
                  <span className="text-sm font-medium">Insights</span>
                </div>
                <span className={cn("text-sm font-medium", insightsStatus === 'Abgeschlossen' ? 'text-emerald-700' : 'text-amber-600')}>
                  {insightsStatus}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-cyan-600" />
                  <span className="text-sm font-medium">Controlling</span>
                </div>
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
              <p className="text-xs text-teal-700">
                Alle vorherigen Prüfschritte (Controlling & Management) sind abgeschlossen. 
                Starten Sie den Onboarding-Prozess und setzen Sie den finalen Status.
              </p>
            </div>
          </div>
        );
    }
  };

  const allChecked = wizardType !== 'controlling' || (insightsComplete && matchingOk && docsComplete);

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
          {renderFields()}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Feedback / Notizen</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
              rows={2} placeholder="Optionales Feedback..."
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={() => { resetForm(); onOpenChange(false); }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted transition-colors">
              Abbrechen
            </button>

            {wizardType === 'controlling' && queryText.trim() && (
              <button onClick={() => handleAction('query')} disabled={submitting}
                className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" /> Rückfrage
              </button>
            )}

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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
