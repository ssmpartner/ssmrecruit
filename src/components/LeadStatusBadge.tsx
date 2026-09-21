import { type LeadStatus, statusConfig } from '@/lib/mock-data';

export default function LeadStatusBadge({ status, queryOpen }: { status: LeadStatus; queryOpen?: boolean }) {
  // Bei abgeschlossenen Kandidaten (abgelehnt / eingestellt) ist eine offene
  // Rückfrage nicht mehr relevant – es zählt nur noch der Endstatus.
  const closed = status === 'rejected' || status === 'hired';
  if (queryOpen && !closed) {
    return (
      <span className="query-badge-blink inline-flex items-center gap-1 rounded-full border border-destructive/50 px-2.5 py-0.5 text-xs font-bold text-destructive">
        <span className="query-dot-blink h-1.5 w-1.5 rounded-full bg-destructive" />
        Rückfrage
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
