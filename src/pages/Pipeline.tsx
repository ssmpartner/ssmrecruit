import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { statusConfig, statusFlow, type LeadStatus } from '@/lib/mock-data';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import SourceBadge from '@/components/SourceBadge';
import LeadDetailSheet from '@/components/LeadDetailSheet';
import { User } from 'lucide-react';

// Pipeline shows only: Neue Leads, Kontaktiert, Rückruf (callback mapped to "new" with callback_count > 0)
// All other statuses (rejected, hired etc.) are auto-removed from pipeline view
const pipelineStatuses: LeadStatus[] = ['new', 'contacted', 'appointment'];

export default function Pipeline() {
  const { leads, employees, agencies, updateLead, addActivity, setSelectedLead } = useLeads();
  const { isSuperadmin } = useAuth();

  const moveStatus = (leadId: string, newStatus: LeadStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const oldLabel = statusConfig[lead.status].label;
    const newLabel = statusConfig[newStatus].label;
    updateLead(leadId, { status: newStatus });
    addActivity(leadId, 'status_change', `Status geändert: "${oldLabel}" → "${newLabel}"`);
  };

  // Filter only active leads in pipeline-visible statuses
  // Superadmin sees all leads, other roles see only their assigned leads
  const pipelineLeads = leads.filter(l => {
    if (l.lifecycle !== 'active' || !pipelineStatuses.includes(l.status)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground">Nur aktive Leads: Neu, Kontaktiert, Terminiert. Alle anderen werden automatisch entfernt.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {pipelineStatuses.map(status => {
          const columnLeads = pipelineLeads.filter(l => l.status === status);
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
                  const ag = agencies.find(a => a.id === lead.agencyId);
                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-2">
                         <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                          lead.salutation === 'Frau' ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {lead.salutation === 'Frau' ? '♀' : '♂'}
                        </div>
                        <p className="font-medium text-sm">{lead.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.position}</p>
                      <p className="text-xs text-muted-foreground">{lead.plz} {lead.city} ({lead.cantonCode})</p>
                      <div className="mt-2 flex items-center gap-2">
                        <SourceBadge source={lead.source} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ag?.color || '#6B7280' }} />
                          {emp?.name}
                        </span>
                        <div className="flex gap-1">
                          {idx > 0 && (
                            <button
                              onClick={(e) => moveStatus(lead.id, pipelineStatuses[idx - 1], e)}
                              className="rounded px-1.5 py-0.5 text-xs bg-secondary hover:bg-muted text-muted-foreground transition-colors"
                            >
                              ←
                            </button>
                          )}
                          {idx < pipelineStatuses.length - 1 && (
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
