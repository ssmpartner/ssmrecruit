import { useMemo, useState } from 'react';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import SourceBadge from '@/components/SourceBadge';
import LeadDetailSheet from '@/components/LeadDetailSheet';
import { Kanban, FilterX } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// Pipeline shows only: Neue Leads, Kontaktiert, Rückruf (callback mapped to "new" with callback_count > 0)
// All other statuses (rejected, hired etc.) are auto-removed from pipeline view
const pipelineStatuses: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up', 'hired'];

const DATE_PRESETS = [
  { value: 'all', label: 'Ganzer Zeitraum' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: '90d', label: 'Letzte 90 Tage' },
] as const;

type DatePreset = (typeof DATE_PRESETS)[number]['value'];

export default function Pipeline() {
  const { leads, employees, agencies, updateLead, addActivity, setSelectedLead } = useLeads();
  const { isSuperadmin } = useAuth();

  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DatePreset>('all');

  const moveStatus = (leadId: string, newStatus: LeadStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const oldLabel = statusConfig[lead.status].label;
    const newLabel = statusConfig[newStatus].label;
    updateLead(leadId, { status: newStatus });
    addActivity(leadId, 'status_change', `Status geändert: "${oldLabel}" → "${newLabel}"`);
  };

  const hasActiveFilters =
    employeeFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all';

  const resetFilters = () => {
    setEmployeeFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
  };

  // Filter only active leads in pipeline-visible statuses
  // Superadmin sees all leads, other roles see only their assigned leads
  const pipelineLeads = useMemo(() => {
    const cutoff = (() => {
      if (dateFilter === 'all') return null;
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const d = new Date();
      d.setDate(d.getDate() - days);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();

    return leads.filter(l => {
      if (l.lifecycle !== 'active' || !pipelineStatuses.includes(l.status)) return false;
      if (employeeFilter !== 'all' && l.employeeId !== employeeFilter) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (cutoff !== null) {
        const created = l.createdAt ? new Date(l.createdAt).getTime() : NaN;
        if (!Number.isNaN(created) && created < cutoff) return false;
      }
      return true;
    });
  }, [leads, employeeFilter, statusFilter, dateFilter]);

  // Employees that actually appear in the pipeline (for the filter dropdown)
  const filterEmployees = useMemo(() => {
    const ids = new Set(leads.filter(l => l.lifecycle === 'active' && pipelineStatuses.includes(l.status)).map(l => l.employeeId).filter(Boolean));
    return employees.filter(e => ids.has(e.id));
  }, [leads, employees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Kanban className="h-8 w-8 text-primary" strokeWidth={2} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-muted-foreground">Aktive Leads im gesamten Prozess: Neu, Kontaktiert, Terminiert, Follow-Up, Eingestellt.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Mitarbeiter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Mitarbeiter</SelectItem>
              {filterEmployees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              {pipelineStatuses.map(s => (
                <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={v => setDateFilter(v as DatePreset)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Zeitraum" />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
              <FilterX className="h-4 w-4" />
              Zurücksetzen
            </Button>
          )}
        </div>
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
                        <span className={`shrink-0 text-base font-bold ${
                          lead.salutation === 'Frau' ? 'text-pink-500 dark:text-pink-400' : 'text-blue-500 dark:text-blue-400'
                        }`}>
                          {lead.salutation === 'Frau' ? '♀' : '♂'}
                        </span>
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
