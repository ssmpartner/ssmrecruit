import { useState, useMemo } from 'react';
import { Filter, CalendarIcon, X, Users, UserCheck, MapPin, Target, TrendingUp, TrendingDown, BarChart3, PieChartIcon, Activity } from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts';
import { useLeads } from '@/context/useLeads';
import { statusConfig, type LeadStatus } from '@/lib/mock-data';
import { cantons } from '@/lib/swiss-plz';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const PIE_COLORS = [
  'hsl(168,17%,23%)', 'hsl(162,17%,50%)', 'hsl(67,16%,66%)',
  'hsl(38,80%,50%)', 'hsl(210,60%,52%)', 'hsl(152,55%,40%)',
  'hsl(0,65%,51%)', 'hsl(270,40%,50%)',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.payload.fill }} />
        <span className="font-semibold text-foreground">{d.name}:</span>
        <span className="text-muted-foreground">{d.value}</span>
      </div>
    </div>
  );
};

interface StatCardModernProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  accentColor: string;
}

function StatCardModern({ icon: Icon, title, value, subtitle, trend, accentColor }: StatCardModernProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.07] -translate-y-8 translate-x-8 transition-transform group-hover:scale-125" style={{ background: accentColor }} />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-xl p-2.5 transition-colors" style={{ background: `${accentColor}15` }}>
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn('mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', trend >= 0 ? 'bg-[hsl(152,55%,40%)]/10 text-[hsl(152,55%,40%)]' : 'bg-destructive/10 text-destructive')}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children, className }: { title: string; subtitle?: string; icon?: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border bg-card shadow-sm overflow-hidden', className)}>
      <div className="flex items-center gap-3 px-6 pt-6 pb-2">
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6 pt-4">{children}</div>
    </div>
  );
}

export default function Analytics() {
  const { leads, agencies, employees } = useLeads();
  const [cantonFilter, setCantonFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | ''>('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (cantonFilter && l.cantonCode !== cantonFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      if (agencyFilter && l.agencyId !== agencyFilter) return false;
      if (employeeFilter && l.employeeId !== employeeFilter) return false;
      if (dateFrom) {
        const created = new Date(l.createdAt);
        if (created < new Date(dateFrom.setHours(0, 0, 0, 0))) return false;
      }
      if (dateTo) {
        const created = new Date(l.createdAt);
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (created > end) return false;
      }
      return true;
    });
  }, [leads, cantonFilter, sourceFilter, statusFilter, agencyFilter, employeeFilter, dateFrom, dateTo]);

  const hasFilters = cantonFilter || sourceFilter || statusFilter || agencyFilter || employeeFilter || dateFrom || dateTo;

  const clearFilters = () => {
    setCantonFilter(''); setSourceFilter(''); setStatusFilter(''); setAgencyFilter(''); setEmployeeFilter(''); setDateFrom(undefined); setDateTo(undefined);
  };

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

  const agencyData = agencies.map(a => {
    const agencyLeads = filtered.filter(l => l.agencyId === a.id);
    const hired = agencyLeads.filter(l => l.status === 'hired').length;
    const contacted = agencyLeads.filter(l => l.status === 'contacted').length;
    const interview = agencyLeads.filter(l => l.status === 'interview_1' || l.status === 'interview_2').length;
    const rejected = agencyLeads.filter(l => l.status === 'rejected').length;
    return {
      id: a.id,
      name: a.name.length > 14 ? a.name.slice(0, 12) + '…' : a.name,
      fullName: a.name,
      total: agencyLeads.length,
      hired, contacted, interview, rejected,
      conversion: agencyLeads.length > 0 ? ((hired / agencyLeads.length) * 100).toFixed(0) : '0',
    };
  }).sort((a, b) => b.total - a.total);

  const employeeData = employees.map(e => ({
    name: e.name.split(' ')[0],
    leads: filtered.filter(l => l.employeeId === e.id).length,
    hired: filtered.filter(l => l.employeeId === e.id && l.status === 'hired').length,
  }));

  const sourceData = Object.entries(sourceConfig).map(([key, cfg]) => ({
    name: cfg.label,
    value: filtered.filter(l => l.source === key).length,
  })).filter(d => d.value > 0);

  const statusData = Object.entries(statusConfig).map(([key, cfg]) => ({
    name: cfg.label,
    value: filtered.filter(l => l.status === key).length,
    fill: PIE_COLORS[Object.keys(statusConfig).indexOf(key) % PIE_COLORS.length],
  })).filter(d => d.value > 0);

  const hiredCount = filtered.filter(l => l.status === 'hired').length;
  const contactedCount = filtered.filter(l => l.status === 'contacted').length;
  const interviewCount = filtered.filter(l => l.status === 'interview_1' || l.status === 'interview_2').length;
  const conversionRate = filtered.length > 0 ? ((hiredCount / filtered.length) * 100).toFixed(1) : '0';
  const uniqueCantons = new Set(filtered.map(l => l.cantonCode)).size;

  const funnelData = [
    { name: 'Total Leads', value: filtered.length, fill: 'hsl(168,17%,23%)' },
    { name: 'Kontaktiert', value: contactedCount, fill: 'hsl(210,60%,52%)' },
    { name: 'Interview', value: interviewCount, fill: 'hsl(38,80%,50%)' },
    { name: 'Eingestellt', value: hiredCount, fill: 'hsl(152,55%,40%)' },
  ];

  const selectCls = "h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring transition-colors";

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + (outerRadius + 24) * Math.cos(-midAngle * RADIAN);
    const y = cy + (outerRadius + 24) * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="hsl(0,0%,45%)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[11px] font-medium">
        {name} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">Kennzahlen, Trends und detaillierte Auswertungen</p>
        </div>
        <div className="text-xs text-muted-foreground">
          {filtered.length} von {leads.length} Leads
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </div>
          <div className="h-6 w-px bg-border" />
          <select value={cantonFilter} onChange={e => setCantonFilter(e.target.value)} className={selectCls}>
            <option value="">Alle Kantone</option>
            {cantons.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as LeadSource | '')} className={selectCls}>
            <option value="">Alle Quellen</option>
            {Object.entries(sourceConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as LeadStatus | '')} className={selectCls}>
            <option value="">Alle Status</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className={selectCls}>
            <option value="">Alle Agenturen</option>
            {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className={selectCls}>
            <option value="">Alle Mitarbeiter</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(selectCls, 'inline-flex items-center gap-2', !dateFrom && 'text-muted-foreground')}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, 'dd.MM.yyyy') : 'Von'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(selectCls, 'inline-flex items-center gap-2', !dateTo && 'text-muted-foreground')}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateTo ? format(dateTo, 'dd.MM.yyyy') : 'Bis'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-semibold hover:bg-destructive/20 transition-colors">
              <X className="h-3 w-3" /> Zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardModern icon={Users} title="Leads gesamt" value={filtered.length} subtitle="Gefilterte Ergebnisse" accentColor="hsl(168,17%,23%)" trend={12} />
        <StatCardModern icon={UserCheck} title="Eingestellt" value={hiredCount} subtitle={`${conversionRate}% Konversion`} accentColor="hsl(152,55%,40%)" trend={8} />
        <StatCardModern icon={Target} title="Konversionsrate" value={`${conversionRate}%`} subtitle="Hire-Rate" accentColor="hsl(162,17%,50%)" />
        <StatCardModern icon={MapPin} title="Aktive Kantone" value={uniqueCantons} subtitle="Regionale Abdeckung" accentColor="hsl(38,80%,50%)" />
      </div>

      {/* Funnel + Source Pie */}
      <div className="grid gap-6 lg:grid-cols-5">
        <ChartCard title="Recruiting-Funnel" subtitle="Conversion-Trichter" icon={TrendingUp} className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={funnelData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="funnelGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(168,17%,23%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(168,17%,23%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="hsl(168,17%,23%)" strokeWidth={2.5} fill="url(#funnelGradient)" name="Leads" dot={{ r: 5, fill: 'hsl(168,17%,23%)', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 7 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Quellen-Verteilung" subtitle="Lead-Herkunft" icon={PieChartIcon} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={renderCustomizedLabel}
                labelLine={false}
                strokeWidth={2}
                stroke="hsl(0,0%,100%)"
              >
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Canton + Agency Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Leads nach Kanton" subtitle="Regionale Verteilung" icon={MapPin}>
          {cantonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={cantonData.slice(0, 10)} layout="vertical" margin={{ left: 0 }}>
                <defs>
                  <linearGradient id="cantonBarGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(168,17%,23%)" />
                    <stop offset="100%" stopColor="hsl(162,17%,50%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="code" tick={{ fontSize: 12, fontWeight: 600 }} stroke="hsl(0,0%,80%)" width={40} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill="url(#cantonBarGradient)" radius={[0, 8, 8, 0]} name="Total" barSize={20} />
                <Bar dataKey="hired" fill="hsl(152,55%,40%)" radius={[0, 8, 8, 0]} name="Eingestellt" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">Keine Daten für diese Filter</p>
          )}
        </ChartCard>

        <ChartCard title="Leads nach Agentur" subtitle="Agentur-Performance" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={agencyData}>
              <defs>
                <linearGradient id="agencyBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(168,17%,23%)" />
                  <stop offset="100%" stopColor="hsl(168,17%,33%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" fill="url(#agencyBarGradient)" radius={[6, 6, 0, 0]} name="Total" barSize={28} />
              <Bar dataKey="hired" fill="hsl(152,55%,40%)" radius={[6, 6, 0, 0]} name="Eingestellt" barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Employee Performance */}
      <ChartCard title="Mitarbeiter-Performance" subtitle="Leads & Einstellungen pro Mitarbeiter" icon={Users}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={employeeData} barCategoryGap="20%">
            <defs>
              <linearGradient id="empBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(168,17%,23%)" />
                <stop offset="100%" stopColor="hsl(168,17%,33%)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
            <Bar dataKey="leads" fill="url(#empBarGradient)" radius={[6, 6, 0, 0]} name="Zugewiesen" />
            <Bar dataKey="hired" fill="hsl(67,16%,66%)" radius={[6, 6, 0, 0]} name="Eingestellt" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Agency Detail Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Agentur-Übersicht</h3>
              <p className="text-xs text-muted-foreground">Detaillierte Aufschlüsselung pro Agentur</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t bg-muted/30">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agentur</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kontaktiert</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interview</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eingestellt</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Abgelehnt</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Konversion</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verteilung</th>
              </tr>
            </thead>
            <tbody>
              {agencyData.map((a, i) => (
                <tr key={a.id} className={cn('border-t transition-colors hover:bg-muted/40', i % 2 === 0 && 'bg-muted/10')}>
                  <td className="px-6 py-3.5 font-medium">{a.fullName}</td>
                  <td className="px-6 py-3.5 text-right font-bold">{a.total}</td>
                  <td className="px-6 py-3.5 text-right">{a.contacted}</td>
                  <td className="px-6 py-3.5 text-right">{a.interview}</td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="inline-flex items-center rounded-full bg-[hsl(152,55%,40%)]/10 px-2 py-0.5 text-xs font-semibold text-[hsl(152,55%,40%)]">{a.hired}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">{a.rejected}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-semibold">{a.conversion}%</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${filtered.length > 0 ? (a.total / filtered.length) * 100 : 0}%`, background: 'linear-gradient(90deg, hsl(168,17%,23%), hsl(162,17%,50%))' }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-10 text-right">{filtered.length > 0 ? ((a.total / filtered.length) * 100).toFixed(0) : 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Canton Detail Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Kanton-Übersicht</h3>
              <p className="text-xs text-muted-foreground">Regionale Verteilung und Konversionsraten</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t bg-muted/30">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kanton</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eingestellt</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Konversion</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verteilung</th>
              </tr>
            </thead>
            <tbody>
              {cantonData.map((c, i) => (
                <tr key={c.code} className={cn('border-t transition-colors hover:bg-muted/40', i % 2 === 0 && 'bg-muted/10')}>
                  <td className="px-6 py-3.5 font-medium">{c.name} <span className="text-muted-foreground text-xs">({c.code})</span></td>
                  <td className="px-6 py-3.5 text-right font-bold">{c.total}</td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="inline-flex items-center rounded-full bg-[hsl(152,55%,40%)]/10 px-2 py-0.5 text-xs font-semibold text-[hsl(152,55%,40%)]">{c.hired}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-semibold">{c.total > 0 ? ((c.hired / c.total) * 100).toFixed(0) : 0}%</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${filtered.length > 0 ? (c.total / filtered.length) * 100 : 0}%`, background: 'linear-gradient(90deg, hsl(168,17%,23%), hsl(162,17%,50%))' }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-10 text-right">{filtered.length > 0 ? ((c.total / filtered.length) * 100).toFixed(0) : 0}%</span>
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
