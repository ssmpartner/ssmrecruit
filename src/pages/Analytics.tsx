import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useLeads } from '@/context/LeadsContext';
import { sourceConfig, statusConfig } from '@/lib/mock-data';

export default function Analytics() {
  const { leads } = useLeads();

  const agencyData = agencies.map(a => ({
    name: a.name,
    total: leads.filter(l => l.agencyId === a.id).length,
    hired: leads.filter(l => l.agencyId === a.id && l.status === 'hired').length,
  }));

  const employeeData = employees.map(e => ({
    name: e.name.split(' ')[0],
    leads: leads.filter(l => l.employeeId === e.id).length,
    hired: leads.filter(l => l.employeeId === e.id && l.status === 'hired').length,
  }));

  const weeklyData = Array.from({ length: 8 }, (_, i) => ({
    week: `W${i + 1}`,
    leads: Math.floor(Math.random() * 10) + 5,
    hired: Math.floor(Math.random() * 4) + 1,
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Performance metrics and insights</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4">Leads by Agency</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={agencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220,10%,46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220,13%,91%)', fontSize: 13 }} />
              <Bar dataKey="total" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="hired" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} name="Hired" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4">Employee Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={employeeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220,10%,46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220,13%,91%)', fontSize: 13 }} />
              <Bar dataKey="leads" fill="hsl(166,72%,40%)" radius={[4, 4, 0, 0]} name="Assigned" />
              <Bar dataKey="hired" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} name="Hired" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm lg:col-span-2">
          <h3 className="text-base font-semibold mb-4">Weekly Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,10%,46%)" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220,13%,91%)', fontSize: 13 }} />
              <Line type="monotone" dataKey="leads" stroke="hsl(166,72%,40%)" strokeWidth={2.5} dot={{ r: 4 }} name="New Leads" />
              <Line type="monotone" dataKey="hired" stroke="hsl(142,71%,45%)" strokeWidth={2.5} dot={{ r: 4 }} name="Hired" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
