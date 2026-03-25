import { statusFlow, statusConfig, type LeadStatus } from '@/lib/mock-data';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessStepperProps {
  currentStatus: LeadStatus;
  compact?: boolean;
}

// Only main process steps – granular statuses are escalations within these
const mainFlow: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up', 'hired'];

// Map granular/escalation statuses to their parent main process step
const statusToMainStep: Record<string, LeadStatus> = {
  new: 'new',
  contacted: 'contacted',
  callback: 'contacted',
  not_reached: 'contacted',
  not_interested: 'contacted',
  no_need: 'contacted',
  not_suitable: 'contacted',
  internal: 'contacted',
  appointment: 'appointment',
  interview_1: 'appointment',
  insights: 'appointment',
  interview_2: 'appointment',
  follow_up: 'follow_up',
  hired: 'hired',
  rejected: 'new',
};

export default function ProcessStepper({ currentStatus, compact = false }: ProcessStepperProps) {
  const currentIndex = mainFlow.indexOf(currentStatus);
  const isRejected = currentStatus === 'rejected';

  return (
    <div className="w-full">
      <div className={cn("flex items-center", compact ? "gap-0" : "gap-0")}>
        {mainFlow.map((status, index) => {
          const config = statusConfig[status];
          const isCompleted = !isRejected && currentIndex > index;
          const isCurrent = !isRejected && currentIndex === index;
          const isFuture = isRejected || currentIndex < index;

          return (
            <div key={status} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 transition-all",
                    compact ? "h-7 w-7" : "h-8 w-8",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-primary/10 text-primary ring-2 ring-primary/20",
                    isFuture && "border-muted-foreground/30 bg-muted text-muted-foreground/50",
                    isRejected && index === 0 && "border-destructive bg-destructive/10 text-destructive",
                  )}
                >
                  {isCompleted ? (
                    <Check className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
                  ) : (
                    <span className={cn("font-bold", compact ? "text-[10px]" : "text-xs")}>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1 text-center leading-tight",
                    compact ? "text-[9px] max-w-[60px]" : "text-[10px] max-w-[72px]",
                    isCurrent && "font-semibold text-foreground",
                    isCompleted && "font-medium text-foreground",
                    isFuture && "text-muted-foreground/60",
                  )}
                >
                  {config.label}
                </span>
              </div>
              {index < mainFlow.length - 1 && (
                <div className={cn(
                  "flex-1 mx-1",
                  compact ? "h-[2px]" : "h-[2px]",
                  isCompleted ? "bg-primary" : "bg-muted-foreground/20",
                  "self-start",
                  compact ? "mt-[14px]" : "mt-[16px]",
                )} />
              )}
            </div>
          );
        })}
      </div>

      {isRejected && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-destructive" />
          <span className="text-xs font-medium text-destructive">Abgelehnt</span>
        </div>
      )}
    </div>
  );
}
