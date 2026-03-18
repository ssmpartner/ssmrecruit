import { Users, UserCheck, Clock, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '@/components/StatCard';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import SourceBadge from '@/components/SourceBadge';
import LeadDetailSheet from '@/components/LeadDetailSheet';
import { useLeads } from '@/context/LeadsContext';
import { statusConfig } from '@/lib/mock-data';

const PIE_COLORS = ['hsl(168, 17%, 23%)', 'hsl(162, 17%, 50%)', 'hsl(67, 16%, 66%)', 'hsl(38, 80%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(162, 40%, 42%)', 'hsl(0, 65%, 51%)'];

export default function Dashboard() {
  const { leads, employees, setSelectedLead } = useLeads();

  const sourceData = [
    { name: 'Webseite', value: leads.filter(l => l.source === 'website').length },
    { name: 'TikTok', value: leads.filter(l => l.source === 'tiktok').length },
    { name: 'Meta', value: leads.filter(l => l.source === 'meta').length },
    { name: 'LinkedIn', value: leads.filter(l => l.source === 'linkedin').length },
    { name: 'CSV', value: leads.filter(l => l.source === 'csv_import').length },
  ];

  const statusData = Object.entries(statusConfig).map(([key, config]) => ({
    name: config.label,
    value: leads.filter(l => l.status === key).length,
  }));

  const hiredCount = leads.filter(l => l.status === 'hired').length;
  const conversionRate = leads.length > 0 ? ((hiredCount / leads.length) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Übersicht Ihrer Recruiting-Pipeline</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} title="Leads gesamt" value={leads.length} change="12% ggü. Vormonat" positive />
        <StatCard icon={UserCheck} title="Eingestellt" value={hiredCount} change="8% ggü. Vormonat" positive />
        <StatCard icon={Target} title="Konversionsrate" value={`${conversionRate}%`} />
        <StatCard icon={Clock} title="Ø Bearbeitungszeit" value="4.2 Tage" change="0.5 Tage schneller" positive />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4">Leads nach Quelle</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220,13%,91%)', fontSize: 13 }} />
              <Bar dataKey="value" fill="hsl(166,72%,40%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4">Pipeline-Verteilung</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220,13%,91%)', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-base font-semibold">Neueste Leads</h3>
          <a href="/leads" className="text-sm font-medium text-primary hover:underline">Alle anzeigen →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Position</th>
                <th className="px-6 py-3 font-medium">Quelle</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Zugewiesen</th>
                <th className="px-6 py-3 font-medium">Datum</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map(lead => {
                const emp = employees.find(e => e.id === lead.employeeId);
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="cursor-pointer border-t hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium">{lead.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{lead.position}</td>
                    <td className="px-6 py-3"><SourceBadge source={lead.source} /></td>
                    <td className="px-6 py-3"><LeadStatusBadge status={lead.status} /></td>
                    <td className="px-6 py-3 text-muted-foreground">{emp?.name ?? '—'}</td>
                    <td className="px-6 py-3 text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString('de-CH')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <LeadDetailSheet />
    </div>
  );
}
