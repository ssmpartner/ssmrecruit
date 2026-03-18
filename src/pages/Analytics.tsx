import { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useLeads } from '@/context/LeadsContext';
import { sourceConfig, statusConfig, type LeadSource, type LeadStatus } from '@/lib/mock-data';
import { cantons } from '@/lib/swiss-plz';
import StatCard from '@/components/StatCard';
import { Users, UserCheck, MapPin, Target } from 'lucide-react';

const CHART_STYLE = { borderRadius: 8, border: '1px solid hsl(220,13%,91%)', fontSize: 13 };
const AXIS_STROKE = 'hsl(220,10%,46%)';
const GRID_STROKE = 'hsl(220,13%,91%)';
const PIE_COLORS = ['hsl(166,72%,40%)', 'hsl(217,91%,60%)', 'hsl(38,92%,50%)', 'hsl(330,80%,55%)', 'hsl(142,71%,45%)', 'hsl(270,60%,55%)', 'hsl(0,72%,51%)', 'hsl(190,80%,45%)'];

export default function Analytics() {
  const { leads, agencies, employees } = useLeads();
  const [cantonFilter, setCantonFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | ''>('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [agencyFilter, setAgencyFilter] = useState('');

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (cantonFilter && l.cantonCode !== cantonFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      if (agencyFilter && l.agencyId !== agencyFilter) return false;
      return true;
    });
  }, [leads, cantonFilter, sourceFilter, statusFilter, agencyFilter]);

  // Canton data
  const cantonData = useMemo(() => {
    const map = new Map<string, { code: string; name: string; total: number; hired: number }>();
    filtered.forEach(l => {
      const existing = map.get(l.cantonCode);
      if (existing) {
        existing.total++;
        if (l.status === 'hired') existing.hired++;
      } else {
        map.set(l.cantonCode, { code: l.cantonCode, name: l.canton, total: 1, hired: l.status === 'hired' ? 1 : 0 });
      }
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);

  const agencyData = agencies.map(a => ({
    name: a.name.length > 14 ? a.name.slice(0, 12) + '…' : a.name,
    total: filtered.filter(l => l.agencyId === a.id).length,
    hired: filtered.filter(l => l.agencyId === a.id && l.status === 'hired').length,
  }));

  const employeeData = employees.map(e => ({
    name: e.name.split(' ')[0],
    leads: filtered.filter(l => l.employeeId === e.id).length,
    hired: filtered.filter(l => l.employeeId === e.id && l.status === 'hired').length,
  }));

  const sourceData = Object.entries(sourceConfig).map(([key, cfg]) => ({
    name: cfg.label,
    value: filtered.filter(l => l.source === key).length,
  })).filter(d => d.value > 0);

  const hiredCount = filtered.filter(l => l.status === 'hired').length;
  const conversionRate = filtered.length > 0 ? ((hiredCount / filtered.length) * 100).toFixed(1) : '0';
  const uniqueCantons = new Set(filtered.map(l => l.cantonCode)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Kennzahlen und Auswertungen</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select value={cantonFilter} onChange={e => setCantonFilter(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option value="">Alle Kantone</option>
          {cantons.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as LeadSource | '')} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none">
          <option value="">Alle Quellen</option>
          {Object.entries(sourceConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as LeadStatus | '')} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none">
          <option value="">Alle Status</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none">
          <option value="">Alle Agenturen</option>
          {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {(cantonFilter || sourceFilter || statusFilter || agencyFilter) && (
          <button
            onClick={() => { setCantonFilter(''); setSourceFilter(''); setStatusFilter(''); setAgencyFilter(''); }}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} title="Leads (gefiltert)" value={filtered.length} />
        <StatCard icon={UserCheck} title="Eingestellt" value={hiredCount} />
        <StatCard icon={Target} title="Konversionsrate" value={`${conversionRate}%`} />
        <StatCard icon={MapPin} title="Kantone" value={uniqueCantons} />
      </div>

      {/* Canton chart */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-base font-semibold mb-4">Leads nach Kanton</h3>
        {cantonData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cantonData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke={AXIS_STROKE} />
              <YAxis type="category" dataKey="code" tick={{ fontSize: 12 }} stroke={AXIS_STROKE} width={40} />
              <Tooltip
                contentStyle={CHART_STYLE}
                formatter={(value: number, name: string) => [value, name === 'total' ? 'Total' : 'Eingestellt']}
                labelFormatter={(label) => {
                  const c = cantonData.find(d => d.code === label);
                  return c ? `${c.name} (${c.code})` : label;
                }}
              />
              <Bar dataKey="total" fill="hsl(217,91%,60%)" radius={[0, 4, 4, 0]} name="total" />
              <Bar dataKey="hired" fill="hsl(142,71%,45%)" radius={[0, 4, 4, 0]} name="hired" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">Keine Daten für diese Filter</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Source pie */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4">Leads nach Quelle</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Agency bar */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4">Leads nach Agentur</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={agencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
              <YAxis tick={{ fontSize: 12 }} stroke={AXIS_STROKE} />
              <Tooltip contentStyle={CHART_STYLE} />
              <Bar dataKey="total" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="hired" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} name="Eingestellt" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Employee performance */}
        <div className="rounded-xl border bg-card p-6 shadow-sm lg:col-span-2">
          <h3 className="text-base font-semibold mb-4">Mitarbeiter-Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={employeeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={AXIS_STROKE} />
              <YAxis tick={{ fontSize: 12 }} stroke={AXIS_STROKE} />
              <Tooltip contentStyle={CHART_STYLE} />
              <Bar dataKey="leads" fill="hsl(166,72%,40%)" radius={[4, 4, 0, 0]} name="Zugewiesen" />
              <Bar dataKey="hired" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} name="Eingestellt" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Canton table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 pb-3">
          <h3 className="text-base font-semibold">Kanton-Übersicht</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Kanton</th>
                <th className="px-6 py-3 font-medium text-right">Total Leads</th>
                <th className="px-6 py-3 font-medium text-right">Eingestellt</th>
                <th className="px-6 py-3 font-medium text-right">Konversion</th>
                <th className="px-6 py-3 font-medium">Verteilung</th>
              </tr>
            </thead>
            <tbody>
              {cantonData.map(c => (
                <tr key={c.code} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-3 font-medium">{c.name} <span className="text-muted-foreground">({c.code})</span></td>
                  <td className="px-6 py-3 text-right">{c.total}</td>
                  <td className="px-6 py-3 text-right text-success font-medium">{c.hired}</td>
                  <td className="px-6 py-3 text-right">{c.total > 0 ? ((c.hired / c.total) * 100).toFixed(0) : 0}%</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${filtered.length > 0 ? (c.total / filtered.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {filtered.length > 0 ? ((c.total / filtered.length) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
