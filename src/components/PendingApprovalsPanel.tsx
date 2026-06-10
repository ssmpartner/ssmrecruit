import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, Loader2, ShieldCheck, ClipboardCheck, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLeads } from '@/context/useLeads';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface RoleUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}
interface MgmtApproval {
  user_id: string;
  decision: 'approved' | 'rejected';
  decided_at: string;
  comment: string | null;
}

interface Props {
  leadId: string;
  leadStatus: string;
  leadUpdatedAt?: string;
  leadCreatedAt?: string;
}

function formatDuration(fromIso?: string): string {
  if (!fromIso) return '';
  const ms = Date.now() - new Date(fromIso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} Min.`;
  const hrs = Math.floor(min / 60);
  if (hrs < 48) return `${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  return `${days} Tag${days === 1 ? '' : 'e'}`;
}


const initials = (n?: string | null) =>
  (n || '?').split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

// Order of statuses through the pipeline
const STATUS_ORDER = ['ready_for_controlling', 'controlling_approved', 'management_review', 'management_approved', 'hr_processing', 'hired'];
const idxOf = (s: string) => STATUS_ORDER.indexOf(s);

function Avatar({ u, state }: { u: RoleUser; state: 'approved' | 'rejected' | 'pending' }) {
  return (
    <div className="relative shrink-0" title={u.display_name || ''}>
      {u.avatar_url ? (
        <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border" />
      ) : (
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border flex items-center justify-center text-[10px] font-bold">
          {initials(u.display_name)}
        </div>
      )}
      {state === 'approved' && (
        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
          <CheckCircle2 className="h-2 w-2 text-white" />
        </div>
      )}
      {state === 'rejected' && (
        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-card flex items-center justify-center">
          <XCircle className="h-2 w-2 text-white" />
        </div>
      )}
      {state === 'pending' && (
        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-card flex items-center justify-center">
          <Clock className="h-2 w-2 text-white" />
        </div>
      )}
    </div>
  );
}

export default function PendingApprovalsPanel({ leadId, leadStatus, leadUpdatedAt, leadCreatedAt }: Props) {
  const [loading, setLoading] = useState(true);
  const [controllingUsers, setControllingUsers] = useState<RoleUser[]>([]);
  const [glUsers, setGlUsers] = useState<RoleUser[]>([]);
  const [hrUsers, setHrUsers] = useState<RoleUser[]>([]);
  const [controllingApprover, setControllingApprover] = useState<string | null>(null);
  const [mgmtApprovals, setMgmtApprovals] = useState<MgmtApproval[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetTarget, setResetTarget] = useState<
    | { kind: 'controlling'; userId: string; name: string }
    | { kind: 'gl'; userId: string; name: string }
    | null
  >(null);
  const { isSuperadmin, user } = useAuth();
  const { updateLead, addActivity } = useLeads();
  const { toast } = useToast();

  function openReset(target: NonNullable<typeof resetTarget>) {
    setResetTarget(target);
    setResetReason('');
    setResetOpen(true);
  }

  async function handleResetApprovals() {
    if (!isSuperadmin || !resetTarget) return;
    const reason = resetReason.trim();
    if (reason.length < 5) return;
    setResetting(true);
    try {
      const actor = (user?.user_metadata as any)?.display_name || user?.email || 'Superadmin';

      if (resetTarget.kind === 'controlling') {
        const { error } = await supabase
          .from('status_wizard_results')
          .delete()
          .eq('lead_id', leadId)
          .eq('wizard_type', 'controlling_approval');
        if (error) throw error;
        // Controlling reset → ganzen Approval-Flow neu starten (alle GL-Entscheidungen ebenfalls weg)
        const { error: e2 } = await supabase
          .from('lead_management_approvals')
          .delete()
          .eq('lead_id', leadId);
        if (e2) throw e2;
        await updateLead(leadId, { status: 'ready_for_controlling' } as any);
        await addActivity(leadId, 'note',
          `🔄 Controlling-Freigabe von ${resetTarget.name} zurückgesetzt durch Superadmin (${actor}) – Begründung: ${reason}. Alle GL-Entscheidungen wurden ebenfalls entfernt, der Lead startet erneut bei Controlling.`);
        await addActivity(leadId, 'status_change', `Status zurückgesetzt auf "Bereit für Controlling" (Superadmin-Reset Controlling).`);
        toast({ title: 'Controlling-Freigabe zurückgesetzt', description: `Freigabe von ${resetTarget.name} entfernt.` });
      } else {
        // GL: nur diese eine Entscheidung entfernen
        const { error } = await supabase
          .from('lead_management_approvals')
          .delete()
          .eq('lead_id', leadId)
          .eq('user_id', resetTarget.userId);
        if (error) throw error;

        // Status neu bestimmen
        const remaining = mgmtApprovals.filter(a => a.user_id !== resetTarget.userId);
        const stillRejected = remaining.some(a => a.decision === 'rejected');
        const allApproved = glUsers.length > 0 && glUsers.every(u =>
          u.user_id === resetTarget.userId ? false : remaining.find(a => a.user_id === u.user_id)?.decision === 'approved'
        );
        let newStatus: string;
        if (allApproved && !stillRejected) newStatus = 'management_approved';
        else if (remaining.length === 0) newStatus = 'controlling_approved';
        else newStatus = 'management_review';

        await updateLead(leadId, { status: newStatus } as any);
        await addActivity(leadId, 'note',
          `🔄 GL-Entscheidung von ${resetTarget.name} zurückgesetzt durch Superadmin (${actor}) – Begründung: ${reason}.`);
        await addActivity(leadId, 'status_change', `GL-Freigabe für ${resetTarget.name} entfernt → Status: "${newStatus}".`);
        toast({ title: 'GL-Entscheidung zurückgesetzt', description: `Entscheidung von ${resetTarget.name} entfernt.` });
      }

      setResetOpen(false);
      setResetReason('');
      setResetTarget(null);
      setReloadKey(k => k + 1);
    } catch (e: any) {
      toast({ title: 'Fehler', description: e?.message ?? 'Reset fehlgeschlagen.', variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [ctrlRes, glRes, hrRes, wizRes, mgmtRes] = await Promise.all([
        supabase.rpc('get_role_users', { _role: 'controlling' }),
        supabase.rpc('get_role_users', { _role: 'geschaeftsleitung' }),
        supabase.rpc('get_role_users', { _role: 'hr' }),
        supabase.from('status_wizard_results').select('completed_by, created_at')
          .eq('lead_id', leadId).eq('wizard_type', 'controlling_approval')
          .order('created_at', { ascending: false }).limit(1),
        supabase.from('lead_management_approvals').select('user_id, decision, decided_at, comment').eq('lead_id', leadId),
      ]);
      setControllingUsers((ctrlRes.data as RoleUser[]) || []);
      setGlUsers((glRes.data as RoleUser[]) || []);
      setHrUsers((hrRes.data as RoleUser[]) || []);
      setControllingApprover((wizRes.data?.[0] as any)?.completed_by ?? null);
      setMgmtApprovals((mgmtRes.data as MgmtApproval[]) || []);
      setLoading(false);
    })();
  }, [leadId, reloadKey]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-4 flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  // === Controlling stage ===
  const ctrlDone = idxOf(leadStatus) >= idxOf('controlling_approved');
  const ctrlPending = leadStatus === 'ready_for_controlling';

  // === GL stage ===
  const glDecisionByUser = new Map(mgmtApprovals.map(a => [a.user_id, a]));
  const allGlDecided = glUsers.length > 0 && glUsers.every(u => glDecisionByUser.has(u.user_id));
  const anyGlRejected = mgmtApprovals.some(a => a.decision === 'rejected');
  const glFullyApproved = allGlDecided && !anyGlRejected && mgmtApprovals.length > 0;
  const glDone = (idxOf(leadStatus) >= idxOf('management_approved') || glFullyApproved) && !anyGlRejected;
  const glActive = !glDone && (leadStatus === 'controlling_approved' || leadStatus === 'management_review');

  // === HR stage ===
  const hrActive = leadStatus === 'hr_processing';
  const hrPending = leadStatus === 'hr_pending';
  const hrDone = leadStatus === 'hired';
  const glSplit = mgmtApprovals.some(a => a.decision === 'approved') && mgmtApprovals.some(a => a.decision === 'rejected');

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-primary" /> Freigabe-Status (Pipeline)
      </h3>

      {/* Controlling */}
      <div className={cn(
        "rounded-lg border p-3",
        ctrlDone ? "bg-emerald-50/40 border-emerald-200" : ctrlPending ? "bg-red-50/40 border-red-200" : "bg-muted/30"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-700" />
            <span className="text-sm font-semibold">Controlling</span>
          </div>
          <span className={cn(
            "text-[11px] font-semibold rounded-full px-2 py-0.5 border",
            ctrlDone ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                     : ctrlPending ? "bg-red-100 text-red-700 border-red-300"
                     : "bg-muted text-muted-foreground"
          )}>
            {ctrlDone ? '✓ Freigegeben' : ctrlPending ? '⏳ Hängig' : '—'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {controllingUsers.length === 0 && <p className="text-xs text-muted-foreground italic">Keine Controlling-User</p>}
          {controllingUsers.map(u => {
            const isApprover = controllingApprover === u.user_id;
            const state: 'approved' | 'pending' = ctrlDone ? (isApprover ? 'approved' : 'pending') : 'pending';
            return (
              <div key={u.user_id} className="flex items-center gap-1.5 rounded-full bg-background border pr-2 pl-0.5 py-0.5">
                <Avatar u={u} state={ctrlDone && !isApprover ? 'pending' : state} />
                <span className="text-[11px] truncate max-w-[120px]">{u.display_name || 'Unbenannt'}</span>
                {isSuperadmin && isApprover && (
                  <button
                    onClick={() => openReset({ kind: 'controlling', userId: u.user_id, name: u.display_name || 'Unbenannt' })}
                    className="ml-0.5 rounded-full p-0.5 text-red-600 hover:bg-red-100"
                    title="Freigabe zurücksetzen"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {ctrlPending && (
          <p className="text-[11px] text-red-700 mt-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Hängig seit {formatDuration(leadUpdatedAt || leadCreatedAt)}
          </p>
        )}
        {ctrlDone && controllingApprover && (
          <p className="text-[11px] text-emerald-700 mt-2">
            Freigegeben durch {controllingUsers.find(u => u.user_id === controllingApprover)?.display_name || '—'}
          </p>
        )}
      </div>


      {/* Geschäftsleitung */}
      <div className={cn(
        "rounded-lg border p-3",
        glDone ? "bg-emerald-50/40 border-emerald-200"
               : anyGlRejected ? "bg-red-50/40 border-red-200"
               : glActive ? "bg-red-50/40 border-red-200"
               : "bg-muted/30"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-700" />
            <span className="text-sm font-semibold">Geschäftsleitung</span>
            <span className="text-[10px] text-muted-foreground">
              ({mgmtApprovals.filter(a => a.decision === 'approved').length}/{glUsers.length})
            </span>
          </div>
          <span className={cn(
            "text-[11px] font-semibold rounded-full px-2 py-0.5 border",
            glDone ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                   : anyGlRejected ? "bg-red-100 text-red-700 border-red-300"
                   : glActive ? "bg-red-100 text-red-700 border-red-300"
                   : "bg-muted text-muted-foreground"
          )}>
            {glDone ? '✓ Alle freigegeben' : anyGlRejected ? '✗ Abgelehnt' : glActive ? '⏳ Hängig' : '— Wartet auf Controlling'}
          </span>
        </div>
        {glActive && (
          <p className="text-[11px] text-red-700 mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Hängig seit {formatDuration(leadUpdatedAt)}
          </p>
        )}

        <div className="space-y-1.5">
          {glUsers.length === 0 && <p className="text-xs text-muted-foreground italic">Keine GL-User</p>}
          {glUsers.map(u => {
            const dec = glDecisionByUser.get(u.user_id);
            const state: 'approved' | 'rejected' | 'pending' =
              dec?.decision === 'approved' ? 'approved' :
              dec?.decision === 'rejected' ? 'rejected' : 'pending';
            return (
              <div key={u.user_id} className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1.5",
                state === 'approved' && "bg-emerald-50/60 border-emerald-200",
                state === 'rejected' && "bg-red-50/60 border-red-200",
                state === 'pending' && "bg-background",
              )}>
                <Avatar u={u} state={state} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{u.display_name || 'Unbenannt'}</p>
                  {dec ? (
                    <p className={cn("text-[10px]", state === 'approved' ? 'text-emerald-700' : 'text-red-700')}>
                      {state === 'approved' ? 'Freigegeben' : 'Abgelehnt'} · {new Date(dec.decided_at).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}
                      {dec.comment && <span className="text-muted-foreground"> – {dec.comment}</span>}
                    </p>
                  ) : (
                    <p className="text-[10px] text-red-700 flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Ausstehend</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HR */}
      <div className={cn(
        "rounded-lg border p-3",
        hrDone ? "bg-emerald-50/40 border-emerald-200"
               : hrActive && glSplit ? "bg-amber-50/40 border-amber-300"
               : hrPending ? "bg-amber-50/40 border-amber-300"
               : hrActive ? "bg-red-50/40 border-red-200"
               : "bg-muted/30"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
            <span className="text-sm font-semibold">HR / Onboarding</span>
          </div>
          <span className={cn(
            "text-[11px] font-semibold rounded-full px-2 py-0.5 border",
            hrDone ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                   : hrActive && glSplit ? "bg-amber-100 text-amber-800 border-amber-300"
                   : hrPending ? "bg-amber-100 text-amber-800 border-amber-300"
                   : hrActive ? "bg-red-100 text-red-700 border-red-300"
                   : "bg-muted text-muted-foreground"
          )}>
            {hrDone ? '✓ Eingestellt'
              : hrActive && glSplit ? '⚠️ GL geteilt – Klärung nötig'
              : hrPending ? '⏳ Pendent (Nachreichung)'
              : hrActive ? '⏳ In Bearbeitung'
              : '— Wartet auf Geschäftsleitung'}
          </span>
        </div>
        {hrActive && glSplit && (
          <div className="mb-2 rounded-md bg-amber-100/70 border border-amber-300 px-2 py-1.5 text-[11px] text-amber-900">
            <span className="font-semibold">Bitte kontaktiere beide Mitglieder der Geschäftsleitung,</span> um das weitere Vorgehen abzustimmen (Freigabe + Ablehnung liegen vor). HR kann anschliessend <em>Einstellen</em> oder <em>Ablehnen</em>.
          </div>
        )}
        {(hrActive || hrPending) && (
          <p className={cn("text-[11px] mb-2 flex items-center gap-1", (hrPending || glSplit) ? 'text-amber-800' : 'text-red-700')}>
            <Clock className="h-3 w-3" /> {hrPending ? 'Pendent seit' : 'Hängig seit'} {formatDuration(leadUpdatedAt)}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {hrUsers.length === 0 && <p className="text-xs text-muted-foreground italic">Keine HR-User</p>}
          {hrUsers.map(u => (
            <div key={u.user_id} className="flex items-center gap-1.5 rounded-full bg-background border pr-2 pl-0.5 py-0.5">
              <Avatar u={u} state={hrDone ? 'approved' : 'pending'} />
              <span className="text-[11px] truncate max-w-[120px]">{u.display_name || 'Unbenannt'}</span>
            </div>
          ))}
        </div>
      </div>

      {isSuperadmin && (mgmtApprovals.length > 0 || controllingApprover) && (
        <div className="rounded-lg border-2 border-dashed border-red-200 bg-red-50/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-800">Superadmin: Freigaben zurücksetzen</p>
                <p className="text-[11px] text-red-700/80">
                  Entfernt Controlling- und Geschäftsleitungs-Freigaben und setzt den Lead auf "Bereit für Controlling". Aktion wird in der Aktivität protokolliert.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 shrink-0"
              onClick={() => { setResetReason(''); setResetOpen(true); }}>
              <RotateCcw className="h-3.5 w-3.5" /> Zurücksetzen
            </Button>
          </div>
        </div>
      )}

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Freigaben zurücksetzen</DialogTitle>
            <DialogDescription>
              Diese Aktion löscht alle Controlling- und Geschäftsleitungs-Freigaben für diesen Lead
              und setzt den Status zurück auf <strong>"Bereit für Controlling"</strong>. Die Aktion
              wird mit deinem Namen und der Begründung in der Aktivität protokolliert.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={resetReason}
            onChange={(e) => setResetReason(e.target.value)}
            placeholder="Begründung (z. B. Falsche Freigabe, neue Unterlagen, Re-Evaluation nötig...)"
            rows={4}
            maxLength={1000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetting}>Abbrechen</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white"
              disabled={resetting || resetReason.trim().length < 5}
              onClick={handleResetApprovals}>
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Freigaben zurücksetzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
