import { useLeads } from '@/context/useLeads';
import { statusConfig, statusFlow, getAllowedNextStatuses, type LeadStatus } from '@/lib/mock-data';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import SourceBadge from '@/components/SourceBadge';
import LeadDetailSheet from '@/components/LeadDetailSheet';

const pipelineStatuses: LeadStatus[] = statusFlow;

export default function Pipeline() {
  const { leads, employees, updateLead, addActivity, setSelectedLead } = useLeads();

  const moveStatus = (leadId: string, newStatus: LeadStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const oldLabel = statusConfig[lead.status].label;
    const newLabel = statusConfig[newStatus].label;
    updateLead(leadId, { status: newStatus });
    addActivity(leadId, 'status_change', `Status geändert: "${oldLabel}" → "${newLabel}"`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground">Lead anklicken für Details und Bearbeitung</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {pipelineStatuses.map(status => {
          const columnLeads = leads.filter(l => l.status === status);
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
                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.position}</p>
                      <p className="text-xs text-muted-foreground">{lead.plz} {lead.city} ({lead.cantonCode})</p>
                      <div className="mt-2 flex items-center gap-2">
                        <SourceBadge source={lead.source} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{emp?.name}</span>
                        <div className="flex gap-1">
                          {idx > 0 && status !== 'rejected' && (
                            <button
                              onClick={(e) => moveStatus(lead.id, pipelineStatuses[idx - 1], e)}
                              className="rounded px-1.5 py-0.5 text-xs bg-secondary hover:bg-muted text-muted-foreground transition-colors"
                            >
                              ←
                            </button>
                          )}
                          {idx < pipelineStatuses.length - 1 && status !== 'hired' && status !== 'rejected' && (
                            <button
                              onClick={(e) => moveStatus(lead.id, pipelineStatuses[idx + 1], e)}
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
                  <p className="py-8 text-center text-xs text-muted-foreground">Keine Leads</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <LeadDetailSheet />
    </div>
  );
}
