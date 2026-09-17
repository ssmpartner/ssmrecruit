import { type LeadStatus, statusConfig } from '@/lib/mock-data';

export default function LeadStatusBadge({ status, queryOpen }: { status: LeadStatus; queryOpen?: boolean }) {
  if (queryOpen) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        Controlling-Rückfrage
      </span>
    );
  }
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
}
