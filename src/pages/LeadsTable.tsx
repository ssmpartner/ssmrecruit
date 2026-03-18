import { useState, useMemo } from 'react';
import { Download, Upload, Filter } from 'lucide-react';
import { type LeadStatus, type LeadSource, statusConfig, sourceConfig } from '@/lib/mock-data';
import { useLeads } from '@/context/LeadsContext';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import SourceBadge from '@/components/SourceBadge';
import LeadDetailSheet from '@/components/LeadDetailSheet';

export default function LeadsTable() {
  const { leads, setSelectedLead } = useLeads();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | ''>('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      if (agencyFilter && l.agencyId !== agencyFilter) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [leads, statusFilter, sourceFilter, agencyFilter, search]);

  const exportCSV = () => {
    const header = 'Name,Email,Phone,Position,Source,Status,Agency,Employee,Date\n';
    const rows = filtered.map(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      const ag = agencies.find(a => a.id === l.agencyId);
      return `"${l.name}","${l.email}","${l.phone}","${l.position}","${l.source}","${l.status}","${ag?.name}","${emp?.name}","${l.createdAt}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leads_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">{filtered.length} of {leads.length} leads</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="h-9 w-56 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as LeadStatus | '')} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none">
          <option value="">All Statuses</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as LeadSource | '')} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none">
          <option value="">All Sources</option>
          {Object.entries(sourceConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none">
          <option value="">All Agencies</option>
          {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Position</th>
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Agency</th>
              <th className="px-6 py-3 font-medium">Assigned To</th>
              <th className="px-6 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(lead => {
              const emp = employees.find(e => e.id === lead.employeeId);
              const agency = agencies.find(a => a.id === lead.agencyId);
              return (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-3 font-medium">{lead.name}</td>
                  <td className="px-6 py-3 text-muted-foreground">{lead.email}</td>
                  <td className="px-6 py-3 text-muted-foreground">{lead.position}</td>
                  <td className="px-6 py-3"><SourceBadge source={lead.source} /></td>
                  <td className="px-6 py-3"><LeadStatusBadge status={lead.status} /></td>
                  <td className="px-6 py-3 text-muted-foreground">{agency?.name}</td>
                  <td className="px-6 py-3 text-muted-foreground">{emp?.name}</td>
                  <td className="px-6 py-3 text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LeadDetailSheet />
    </div>
  );
}
