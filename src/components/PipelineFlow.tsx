import { useMemo } from 'react';
import { ArrowRight, AlertTriangle, Clock, TrendingUp, Users } from 'lucide-react';
import { statusConfig, type LeadStatus, type Lead } from '@/lib/mock-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const mainFlow: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up', 'hired'];
const ESCALATION_DAYS: Record<string, number> = {
  new: 1,
  contacted: 5,
  appointment: 7,
  follow_up: 3,
};

interface FlowNodeProps {
  status: LeadStatus;
  count: number;
  escalated: number;
  avgDays: number;
  isLast: boolean;
  rejectedFromHere: number;
}

function FlowNode({ status, count, escalated, avgDays, isLast, rejectedFromHere }: FlowNodeProps) {
  const config = statusConfig[status];
  const hasEscalation = escalated > 0;
  const threshold = ESCALATION_DAYS[status];

  return (
    <div className="flex items-center gap-0 flex-1 min-w-0">
      <div className="flex flex-col items-center flex-1 min-w-0">
        {/* Escalation badge */}
        <div className="h-7 flex items-end justify-center mb-1.5">
          {hasEscalation && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 rounded-full bg-destructive/10 border border-destructive/20 px-2.5 py-0.5 text-[11px] font-semibold text-destructive animate-pulse">
                    <AlertTriangle className="h-3 w-3" />
                    {escalated} Eskalation{escalated > 1 ? 'en' : ''}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{escalated} Lead{escalated > 1 ? 's' : ''} seit über {threshold} Tag{threshold !== 1 ? 'en' : ''} in diesem Status</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Main node */}
        <div
          className={`relative w-full rounded-2xl border-2 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
            hasEscalation
              ? 'border-destructive/40 bg-destructive/5 shadow-sm shadow-destructive/10'
              : 'border-border bg-card shadow-sm hover:border-primary/30'
          }`}
        >
          {/* Status indicator dot */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg">{config.label === 'Neuer Lead' ? '🆕' : config.label === 'Kontaktiert' ? '📞' : config.label === 'Termin' ? '📅' : config.label === 'Follow-up' ? '🔄' : config.label === 'Eingestellt' ? '✅' : '❌'}</span>
            {threshold && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {threshold}d
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Max. Verweildauer: {threshold} Tag{threshold !== 1 ? 'e' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <p className="text-xs font-medium text-muted-foreground mb-1 truncate">{config.label}</p>
          <p className="text-3xl font-bold tracking-tight">{count}</p>

          {/* Average days indicator */}
          {count > 0 && status !== 'hired' && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Ø {avgDays.toFixed(1)} Tage</span>
            </div>
          )}

          {/* Rejected from this step */}
          {rejectedFromHere > 0 && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-[10px] text-destructive/70 whitespace-nowrap">
                      <span>↓ {rejectedFromHere} abgelehnt</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{rejectedFromHere} Lead{rejectedFromHere > 1 ? 's' : ''} in dieser Phase abgelehnt</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Conversion rate below */}
        <div className="h-8" />
      </div>

      {/* Arrow connector */}
      {!isLast && (
        <div className="flex flex-col items-center px-1 shrink-0">
          <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}

interface PipelineFlowProps {
  leads: Lead[];
}

export default function PipelineFlow({ leads }: PipelineFlowProps) {
  const activeLeads = useMemo(() => leads.filter(l => l.lifecycle === 'active'), [leads]);

  const flowData = useMemo(() => {
    const now = Date.now();
    return mainFlow.map(status => {
      const inStatus = activeLeads.filter(l => l.status === status);
      const count = inStatus.length;
      const threshold = ESCALATION_DAYS[status] || Infinity;

      // Calculate escalations (leads over threshold days)
      const escalated = inStatus.filter(l => {
        const days = (now - new Date(l.updatedAt || l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return days > threshold;
      }).length;

      // Average days in status
      const avgDays = count > 0
        ? inStatus.reduce((sum, l) => sum + (now - new Date(l.updatedAt || l.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0) / count
        : 0;

      // Rejected leads (simplified – count rejected leads)
      const rejectedFromHere = 0; // Would need historical data to determine origin phase

      return { status, count, escalated, avgDays, rejectedFromHere };
    });
  }, [activeLeads]);

  const rejectedCount = activeLeads.filter(l => l.status === 'rejected').length;
  const totalEscalations = flowData.reduce((sum, d) => sum + d.escalated, 0);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Pipeline-Flow</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {totalEscalations > 0 && (
            <div className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertTriangle className="h-4 w-4" />
              {totalEscalations} Eskalation{totalEscalations > 1 ? 'en' : ''}
            </div>
          )}
          {rejectedCount > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-xs">❌</span>
              {rejectedCount} abgelehnt
            </div>
          )}
        </div>
      </div>

      {/* Flow diagram */}
      <div className="flex items-start gap-0 pt-2">
        {flowData.map((data, i) => (
          <FlowNode
            key={data.status}
            status={data.status}
            count={data.count}
            escalated={data.escalated}
            avgDays={data.avgDays}
            rejectedFromHere={data.rejectedFromHere}
            isLast={i === flowData.length - 1}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 pt-2 border-t text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/60 animate-pulse" />
          <span>Eskalation (Verweildauer überschritten)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>Max. Verweildauer pro Phase</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3" />
          <span>Ø Tage in Status</span>
        </div>
      </div>
    </div>
  );
}
