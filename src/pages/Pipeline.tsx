import { useState } from 'react';
import { leads as initialLeads, statusConfig, employees, agencies, type Lead, type LeadStatus } from '@/lib/mock-data';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import SourceBadge from '@/components/SourceBadge';

const pipelineStatuses: LeadStatus[] = ['new', 'contacted', 'appointment', 'interview', 'hired', 'rejected'];

export default function Pipeline() {
  const [allLeads, setAllLeads] = useState<Lead[]>(initialLeads);

  const moveStatus = (leadId: string, newStatus: LeadStatus) => {
    setAllLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, updatedAt: new Date().toISOString() } : l));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground">Drag-free Kanban view — click arrows to move leads</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {pipelineStatuses.map(status => {
          const config = statusConfig[status];
          const columnLeads = allLeads.filter(l => l.status === status);
          const idx = pipelineStatuses.indexOf(status);

          return (
            <div key={status} className="flex w-72 shrink-0 flex-col rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-2">
                  <LeadStatusBadge status={status} />
                  <span className="text-xs text-muted-foreground font-medium">{columnLeads.length}</span>
                </div>
              </div>
              <div className="flex-1 space-y-2 p-3 pt-1 overflow-y-auto max-h-[calc(100vh-260px)] scrollbar-thin">
                {columnLeads.map(lead => {
                  const emp = employees.find(e => e.id === lead.employeeId);
                  const agency = agencies.find(a => a.id === lead.agencyId);
                  return (
                    <div key={lead.id} className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.position}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <SourceBadge source={lead.source} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{emp?.name}</span>
                        <div className="flex gap-1">
                          {idx > 0 && (
                            <button
                              onClick={() => moveStatus(lead.id, pipelineStatuses[idx - 1])}
                              className="rounded px-1.5 py-0.5 text-xs bg-secondary hover:bg-muted text-muted-foreground transition-colors"
                            >
                              ←
                            </button>
                          )}
                          {idx < pipelineStatuses.length - 1 && (
                            <button
                              onClick={() => moveStatus(lead.id, pipelineStatuses[idx + 1])}
                              className="rounded px-1.5 py-0.5 text-xs bg-secondary hover:bg-muted text-muted-foreground transition-colors"
                            >
                              →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {columnLeads.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">No leads</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
