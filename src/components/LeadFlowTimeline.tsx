import { useMemo } from 'react';
import { Check, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { statusConfig, type LeadStatus, type Lead } from '@/lib/mock-data';
import { type ActivityEntry } from '@/context/leads-context';

const mainFlow: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up', 'hired'];
const STEP_EMOJIS: Record<string, string> = { new: '🆕', contacted: '📞', appointment: '📅', follow_up: '🔄', hired: '✅', rejected: '❌' };

const statusToMainStep: Record<string, LeadStatus> = {
  new: 'new', contacted: 'contacted', callback: 'contacted', not_reached: 'contacted',
  not_interested: 'contacted', no_need: 'contacted', not_suitable: 'contacted', internal: 'contacted',
  appointment: 'appointment', interview_1: 'appointment', insights: 'appointment', interview_2: 'appointment',
  follow_up: 'follow_up', hired: 'hired', rejected: 'new',
};

interface LeadFlowTimelineProps {
  lead: Lead;
  activities: ActivityEntry[];
}

export default function LeadFlowTimeline({ lead, activities }: LeadFlowTimelineProps) {
  const currentIdx = mainFlow.indexOf(lead.status as LeadStatus);
  const isRejected = lead.status === 'rejected';

  // Extract status change activities for this lead to show timeline
  const statusChanges = useMemo(() => {
    return activities
      .filter(a => a.leadId === lead.id && a.type === 'status_change')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [activities, lead.id]);

  // Calculate days in current status
  const daysInCurrent = useMemo(() => {
    const since = new Date(lead.updatedAt || lead.createdAt).getTime();
    return Math.floor((Date.now() - since) / (1000 * 60 * 60 * 24));
  }, [lead]);

  // Calculate total process duration
  const totalDays = useMemo(() => {
    const since = new Date(lead.createdAt).getTime();
    return Math.floor((Date.now() - since) / (1000 * 60 * 60 * 24));
  }, [lead]);

  const THRESHOLDS: Record<string, number> = { new: 1, contacted: 5, appointment: 7, follow_up: 3 };
  const isEscalated = !isRejected && lead.status !== 'hired' && THRESHOLDS[lead.status] !== undefined && daysInCurrent > THRESHOLDS[lead.status];

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Im Prozess seit</p>
            <p className="text-sm font-bold">{totalDays} Tage</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${isEscalated ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/30'}`}>
          {isEscalated ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
          <div>
            <p className="text-xs text-muted-foreground">Aktueller Status seit</p>
            <p className={`text-sm font-bold ${isEscalated ? 'text-destructive' : ''}`}>{daysInCurrent} Tage</p>
          </div>
        </div>
        {isEscalated && (
          <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            Eskaliert
          </div>
        )}
      </div>

      {/* Visual flow */}
      <div className="relative">
        {/* Progress bar behind */}
        <div className="absolute top-5 left-6 right-6 h-1 bg-muted rounded-full">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: isRejected ? '0%' : `${(currentIdx / (mainFlow.length - 1)) * 100}%` }}
          />
        </div>

        {/* Nodes */}
        <div className="relative flex justify-between">
          {mainFlow.map((status, idx) => {
            const isCompleted = !isRejected && currentIdx > idx;
            const isCurrent = lead.status === status;
            const isFuture = !isRejected && currentIdx < idx;
            const config = statusConfig[status];

            return (
              <div key={status} className="flex flex-col items-center" style={{ width: `${100 / mainFlow.length}%` }}>
                {/* Circle */}
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCurrent
                      ? isEscalated
                        ? 'border-destructive bg-destructive/10 shadow-md shadow-destructive/20 ring-4 ring-destructive/10'
                        : 'border-primary bg-primary/10 shadow-md shadow-primary/20 ring-4 ring-primary/10'
                      : isCompleted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted bg-card text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <span className="text-sm">{STEP_EMOJIS[status]}</span>
                  )}
                </div>

                {/* Label */}
                <p className={`mt-2 text-[11px] font-medium text-center leading-tight ${
                  isCurrent ? 'text-foreground font-semibold' : isCompleted ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {config.label}
                </p>

                {/* Current indicator */}
                {isCurrent && (
                  <p className={`mt-0.5 text-[10px] font-medium ${isEscalated ? 'text-destructive' : 'text-primary'}`}>
                    {daysInCurrent}d hier
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Rejected overlay */}
        {isRejected && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
            <span>❌</span>
            <div>
              <p className="text-xs font-semibold text-destructive">Abgelehnt</p>
              <p className="text-[11px] text-muted-foreground">Seit {daysInCurrent} Tagen</p>
            </div>
          </div>
        )}
      </div>

      {/* Activity timeline */}
      {statusChanges.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Status-Verlauf</p>
          <div className="space-y-0">
            {statusChanges.map((act, idx) => (
              <div key={act.id} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                  {idx < statusChanges.length - 1 && <div className="w-px flex-1 bg-border min-h-[20px]" />}
                </div>
                <div className="pb-2 min-w-0">
                  <p className="text-xs truncate">{act.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(act.timestamp).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })} – {new Date(act.timestamp).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                    {act.user !== 'System' && ` · ${act.user}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
