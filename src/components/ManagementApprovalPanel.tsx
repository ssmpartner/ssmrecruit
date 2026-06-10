import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useLeads } from '@/context/useLeads';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, Loader2, ShieldCheck } from 'lucide-react';

type Decision = 'approved' | 'rejected';

interface GLUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ApprovalRow {
  user_id: string;
  decision: Decision;
  comment: string | null;
  decided_at: string;
}

interface Props {
  leadId: string;
  leadStatus: string;
  leadName: string;
}

const initials = (n?: string | null) =>
  (n || '?').split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export default function ManagementApprovalPanel({ leadId, leadStatus, leadName }: Props) {
  const { user, isGeschaeftsleitung } = useAuth();
  const { updateLead, addActivity } = useLeads();
  const { toast } = useToast();

  const [glUsers, setGlUsers] = useState<GLUser[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<Decision | null>(null);
  const [comment, setComment] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const [usersRes, approvalsRes] = await Promise.all([
      supabase.rpc('get_geschaeftsleitung_users'),
      supabase.from('lead_management_approvals').select('user_id, decision, comment, decided_at').eq('lead_id', leadId),
    ]);
    setGlUsers((usersRes.data as GLUser[]) || []);
    setApprovals((approvalsRes.data as ApprovalRow[]) || []);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { refresh(); }, [refresh]);

  const myDecision = approvals.find(a => a.user_id === user?.id);
  const isOpenForGL = leadStatus === 'controlling_approved' || leadStatus === 'management_review';
  const canDecide = isGeschaeftsleitung && isOpenForGL && !myDecision;

  const submit = async (decision: Decision) => {
    if (!user) return;
    setSubmitting(decision);
    try {
      const { error } = await supabase.from('lead_management_approvals').upsert({
        lead_id: leadId,
        user_id: user.id,
        decision,
        comment: comment.trim() || null,
        decided_at: new Date().toISOString(),
      }, { onConflict: 'lead_id,user_id' });
      if (error) throw error;

      // Re-fetch latest list to compute status transition
      const [usersRes, approvalsRes] = await Promise.all([
        supabase.rpc('get_geschaeftsleitung_users'),
        supabase.from('lead_management_approvals').select('user_id, decision, comment, decided_at').eq('lead_id', leadId),
      ]);
      const gl = (usersRes.data as GLUser[]) || [];
      const rows = (approvalsRes.data as ApprovalRow[]) || [];
      setGlUsers(gl);
      setApprovals(rows);

      // Status transition
      const allDecided = gl.length > 0 && gl.every(g => rows.some(r => r.user_id === g.user_id));
      let newStatus: string | null = null;
      let activityText = '';

      if (allDecided) {
        const anyApproved = rows.some(r => r.decision === 'approved');
        const anyRejected = rows.some(r => r.decision === 'rejected');
        const allRejected = !anyApproved && anyRejected;
        if (allRejected) {
          newStatus = 'rejected';
          activityText = `Geschäftsleitung: Alle Stimmen abgelehnt (${gl.length}/${gl.length}) → Abgelehnt`;
        } else if (anyApproved && anyRejected) {
          // Split decision → forward to HR with warning, HR decides final outcome
          newStatus = 'hr_processing';
          activityText = `Geschäftsleitung: Geteilte Entscheidung (Freigabe + Ablehnung) → HR zur Klärung mit beiden GL-Mitgliedern`;
        } else {
          newStatus = 'hr_processing';
          activityText = `Geschäftsleitung: Vollständig freigegeben (${gl.length}/${gl.length}) → HR-Bearbeitung`;
        }
      } else if (leadStatus === 'controlling_approved') {
        newStatus = 'management_review';
        activityText = `Geschäftsleitung: Erste Stimme abgegeben → Management Review`;
      }

      // Always log the individual decision
      addActivity(
        leadId,
        'note',
        `GL-${decision === 'approved' ? 'Freigabe' : 'Ablehnung'} durch ${user.user_metadata?.display_name || user.email}${comment.trim() ? ` – ${comment.trim()}` : ''}`,
      );

      if (newStatus && newStatus !== leadStatus) {
        await updateLead(leadId, { status: newStatus as any });
        addActivity(leadId, 'status_change', activityText);

        // Notification
        const splitDecision = rows.some(r => r.decision === 'approved') && rows.some(r => r.decision === 'rejected');
        await supabase.from('notifications').insert({
          type: 'status_change',
          title: newStatus === 'hr_processing'
            ? (splitDecision ? '⚠️ Geteilte GL-Entscheidung → HR' : '✅ Freigegeben → HR-Bearbeitung')
            : newStatus === 'rejected' ? '❌ Lead abgelehnt' : '👀 Management Review',
          description: `${leadName} – ${activityText}`,
          lead_id: leadId,
        });
      }

      const anyApprovedFinal = (await supabase.from('lead_management_approvals').select('decision').eq('lead_id', leadId)).data?.some((r: any) => r.decision === 'approved') ?? false;
      const anyRejectedFinal = (await supabase.from('lead_management_approvals').select('decision').eq('lead_id', leadId)).data?.some((r: any) => r.decision === 'rejected') ?? false;
      toast({
        title: decision === 'approved' ? '✅ Freigegeben' : '❌ Abgelehnt',
        description: allDecided
          ? (anyApprovedFinal && anyRejectedFinal
              ? `${leadName} → HR (geteilte Entscheidung – bitte klären)`
              : anyRejectedFinal ? `${leadName} → Abgelehnt` : `${leadName} → HR-Bearbeitung`)
          : `Warte auf ${gl.length - rows.length} weitere Stimme(n).`,
      });
      setComment('');
    } catch (err: any) {
      console.error('GL decision failed:', err);
      toast({ title: '❌ Fehler', description: err.message || 'Entscheidung konnte nicht gespeichert werden.', variant: 'destructive' });
    } finally {
      setSubmitting(null);
    }
  };

  const approvedCount = approvals.filter(a => a.decision === 'approved').length;
  const rejectedCount = approvals.filter(a => a.decision === 'rejected').length;
  const pendingCount = Math.max(0, glUsers.length - approvals.length);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Geschäftsleitung – Freigaben
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-medium">{approvedCount} ✓</span>
          {rejectedCount > 0 && <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 font-medium">{rejectedCount} ✗</span>}
          {pendingCount > 0 && <span className="rounded-full bg-muted text-muted-foreground border px-2 py-0.5 font-medium">{pendingCount} offen</span>}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : glUsers.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Keine Geschäftsleitung-User konfiguriert.</p>
      ) : (
        <div className="space-y-2">
          {glUsers.map(gl => {
            const dec = approvals.find(a => a.user_id === gl.user_id);
            const isApproved = dec?.decision === 'approved';
            const isRejected = dec?.decision === 'rejected';
            const isMe = user?.id === gl.user_id;
            return (
              <div key={gl.user_id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-2.5',
                  isApproved && 'bg-emerald-50/50 border-emerald-200',
                  isRejected && 'bg-red-50/50 border-red-200',
                  !dec && 'bg-muted/30',
                )}>
                <div className="relative">
                  {gl.avatar_url ? (
                    <img src={gl.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover border" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border flex items-center justify-center text-xs font-bold">
                      {initials(gl.display_name)}
                    </div>
                  )}
                  {isApproved && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                      <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  {isRejected && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 border-2 border-card flex items-center justify-center">
                      <XCircle className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {gl.display_name || 'Unbenannt'} {isMe && <span className="text-xs text-muted-foreground">(Sie)</span>}
                  </p>
                  {dec ? (
                    <p className={cn('text-xs', isApproved ? 'text-emerald-700' : 'text-red-700')}>
                      {isApproved ? 'Freigegeben' : 'Abgelehnt'} · {new Date(dec.decided_at).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}
                      {dec.comment && <span className="text-muted-foreground"> – {dec.comment}</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Ausstehend</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canDecide && (
        <div className="mt-4 pt-4 border-t space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ihre Entscheidung</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="Kommentar (optional)..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => submit('rejected')}
              disabled={submitting !== null}
              className="flex-1 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {submitting === 'rejected' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Ablehnen
            </button>
            <button
              onClick={() => submit('approved')}
              disabled={submitting !== null}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {submitting === 'approved' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Freigeben
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Status wechselt auf „Management Approved", sobald alle {glUsers.length} GL-Stimmen vorliegen und keine Ablehnung dabei ist.
          </p>
        </div>
      )}

      {isGeschaeftsleitung && myDecision && (
        <p className="mt-3 text-xs text-muted-foreground italic">Ihre Entscheidung wurde erfasst. Status wechselt, sobald alle GL-User entschieden haben.</p>
      )}
    </div>
  );
}
