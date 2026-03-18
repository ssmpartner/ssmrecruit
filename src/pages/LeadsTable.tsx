import { useState, useMemo } from 'react';
import { Download, Upload, Filter, MapPin } from 'lucide-react';
import { type LeadStatus, type LeadSource, statusConfig, sourceConfig } from '@/lib/mock-data';
import { cantons } from '@/lib/swiss-plz';
import { useLeads } from '@/context/LeadsContext';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import SourceBadge from '@/components/SourceBadge';
import LeadDetailSheet from '@/components/LeadDetailSheet';

export default function LeadsTable() {
  const { leads, employees, agencies, setSelectedLead } = useLeads();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | ''>('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [cantonFilter, setCantonFilter] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      if (agencyFilter && l.agencyId !== agencyFilter) return false;
      if (cantonFilter && l.cantonCode !== cantonFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q) && !l.city.toLowerCase().includes(q) && !l.plz.includes(q)) return false;
      }
      return true;
    });
  }, [leads, statusFilter, sourceFilter, agencyFilter, cantonFilter, search]);

  const exportCSV = () => {
    const header = 'Name,Email,Telefon,Adresse,PLZ,Ort,Kanton,Position,Quelle,Status,Agentur,Mitarbeiter,Datum\n';
    const rows = filtered.map(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      const ag = agencies.find(a => a.id === l.agencyId);
      return `"${l.name}","${l.email}","${l.phone}","${l.address}","${l.plz}","${l.city}","${l.canton}","${l.position}","${l.source}","${l.status}","${ag?.name}","${emp?.name}","${l.createdAt}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
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
          <p className="text-muted-foreground">{filtered.length} von {leads.length} Leads</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
            <Upload className="h-4 w-4" /> CSV Import
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
          placeholder="Name, E-Mail, Ort oder PLZ..."
          className="h-9 w-56 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as LeadStatus | '')} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none">
          <option value="">Alle Status</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as LeadSource | '')} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none">
          <option value="">Alle Quellen</option>
          {Object.entries(sourceConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none">
          <option value="">Alle Agenturen</option>
          {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={cantonFilter} onChange={e => setCantonFilter(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none">
          <option value="">Alle Kantone</option>
          {cantons.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Telefon</th>
              <th className="px-5 py-3 font-medium">Ort</th>
              <th className="px-5 py-3 font-medium">Kanton</th>
              <th className="px-5 py-3 font-medium">Quelle</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Agentur</th>
              <th className="px-5 py-3 font-medium">Zugewiesen</th>
              <th className="px-5 py-3 font-medium">Datum</th>
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
                  <td className="px-5 py-3">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.position}</p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{lead.phone}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {lead.plz} {lead.city}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">{lead.cantonCode}</span>
                  </td>
                  <td className="px-5 py-3"><SourceBadge source={lead.source} /></td>
                  <td className="px-5 py-3"><LeadStatusBadge status={lead.status} /></td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{agency?.name}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{emp?.name}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString('de-CH')}</td>
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
