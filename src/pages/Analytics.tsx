import React, { useState, useMemo } from 'react';
import { Filter, CalendarIcon, X, Users, UserCheck, MapPin, Target, TrendingUp, TrendingDown, BarChart3, PieChartIcon, Activity, Workflow, AlertTriangle, Clock, ArrowRight, ChevronDown, RefreshCw, UserX, CalendarX, Timer } from 'lucide-react';
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
  const { leads, agencies, employees, leadSources, activities } = useLeads();
  const [cantonFilter, setCantonFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);

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
    const interview = agencyLeads.filter(l => l.status === 'appointment' || l.status === 'follow_up').length;
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

  const sourceData = leadSources.map(src => ({
    name: src.label,
    value: filtered.filter(l => l.source === src.id).length,
    fill: src.color || '#6B7280',
  })).filter(d => d.value > 0);

  const statusData = Object.entries(statusConfig).map(([key, cfg]) => ({
    name: cfg.label,
    value: filtered.filter(l => l.status === key).length,
    fill: PIE_COLORS[Object.keys(statusConfig).indexOf(key) % PIE_COLORS.length],
  })).filter(d => d.value > 0);

  const hiredCount = filtered.filter(l => l.status === 'hired').length;
  const contactedCount = filtered.filter(l => l.status === 'contacted').length;
  const interviewCount = filtered.filter(l => l.status === 'appointment' || l.status === 'follow_up').length;
  const conversionRate = filtered.length > 0 ? ((hiredCount / filtered.length) * 100).toFixed(1) : '0';
  const uniqueCantons = new Set(filtered.map(l => l.cantonCode)).size;

  const funnelData = [
    { name: 'Total Leads', value: filtered.length, fill: 'hsl(168,17%,23%)' },
    { name: 'Kontaktiert', value: contactedCount, fill: 'hsl(210,60%,52%)' },
    { name: 'Interview', value: interviewCount, fill: 'hsl(38,80%,50%)' },
    { name: 'Eingestellt', value: hiredCount, fill: 'hsl(152,55%,40%)' },
  ];

  // Flow Analysis Data
  const statusOrder: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up', 'hired'];

  const flowAnalysis = useMemo(() => {
    const now = new Date();

    // Calculate avg days per status based on status change activities
    const statusDurations: Record<string, number[]> = {};
    statusOrder.forEach(s => { statusDurations[s] = []; });

    // For each lead, compute days in current status
    filtered.forEach(lead => {
      const leadActivities = activities
        .filter(a => a.leadId === lead.id && a.type === 'status_change')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (leadActivities.length > 0) {
        // Time from last status change to now (current status duration)
        const lastChange = new Date(leadActivities[leadActivities.length - 1].timestamp);
        const daysInCurrent = Math.max(0, Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24)));
        if (statusDurations[lead.status]) {
          statusDurations[lead.status].push(daysInCurrent);
        }

        // Time between consecutive status changes
        for (let i = 1; i < leadActivities.length; i++) {
          const prev = new Date(leadActivities[i - 1].timestamp);
          const curr = new Date(leadActivities[i].timestamp);
          const days = Math.max(0, Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)));
          // Try to extract status from description
          const match = leadActivities[i - 1].description?.match(/→\s*(\w+)/);
          if (match) {
            const prevStatus = Object.keys(statusConfig).find(k => statusConfig[k as LeadStatus]?.label?.toLowerCase().includes(match[1].toLowerCase()));
            if (prevStatus && statusDurations[prevStatus]) {
              statusDurations[prevStatus].push(days);
            }
          }
        }
      } else {
        // No activity: use days since creation
        const created = new Date(lead.createdAt);
        const days = Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
        if (statusDurations[lead.status]) {
          statusDurations[lead.status].push(days);
        }
      }
    });

    const avgDaysPerStatus = statusOrder.map(s => {
      const durations = statusDurations[s];
      const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      return {
        status: s,
        label: statusConfig[s]?.label || s,
        avgDays: Math.round(avg * 10) / 10,
        count: filtered.filter(l => l.status === s).length,
        maxDays: durations.length > 0 ? Math.max(...durations) : 0,
      };
    });

    // Bottleneck: status with highest avg days and >0 leads
    const bottleneck = avgDaysPerStatus
      .filter(s => s.count > 0)
      .sort((a, b) => b.avgDays - a.avgDays)[0] || null;

    // Status transitions from activities
    const transitions: Record<string, number> = {};
    activities
      .filter(a => a.type === 'status_change')
      .forEach(a => {
        const match = a.description?.match(/(.+?)\s*→\s*(.+)/);
        if (match) {
          const key = `${match[1].trim()} → ${match[2].trim()}`;
          transitions[key] = (transitions[key] || 0) + 1;
        }
      });

    const topTransitions = Object.entries(transitions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));

    // Avg total process duration for hired leads
    const hiredLeads = filtered.filter(l => l.status === 'hired');
    const avgProcessDays = hiredLeads.length > 0
      ? Math.round(hiredLeads.reduce((sum, l) => {
          const created = new Date(l.createdAt);
          const updated = new Date(l.updatedAt);
          return sum + Math.max(0, Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0) / hiredLeads.length)
      : 0;

    return { avgDaysPerStatus, bottleneck, topTransitions, avgProcessDays };
  }, [filtered, activities]);

  const flowBarData = flowAnalysis.avgDaysPerStatus.map((s, i) => ({
    ...s,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

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
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className={selectCls}>
            <option value="">Alle Quellen</option>
            {leadSources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
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
                {sourceData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
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
              <p className="text-xs text-muted-foreground">Klicke auf eine Agentur für die Problem-Analyse</p>
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
              {agencyData.map((a, i) => {
                const isExpanded = expandedAgency === a.id;
                const agencyLeads = filtered.filter(l => l.agencyId === a.id);
                const agencyActivities = activities.filter(act => agencyLeads.some(l => l.id === act.leadId));

                // Problem metrics
                const now = new Date();
                const reassignments = agencyActivities.filter(act => act.type === 'assignment').length;
                const statusChanges = agencyActivities.filter(act => act.type === 'status_change').length;
                const rejectedLeads = agencyLeads.filter(l => l.status === 'rejected');
                const staleLeads = agencyLeads.filter(l => {
                  const updated = new Date(l.updatedAt);
                  const days = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
                  return days > 14 && l.status !== 'hired' && l.status !== 'rejected';
                });
                const newUntouched = agencyLeads.filter(l => {
                  const created = new Date(l.createdAt);
                  const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                  return l.status === 'new' && days > 3;
                });
                const avgDaysInProcess = agencyLeads.length > 0
                  ? Math.round(agencyLeads.reduce((sum, l) => {
                      const created = new Date(l.createdAt);
                      const ref = l.status === 'hired' || l.status === 'rejected' ? new Date(l.updatedAt) : now;
                      return sum + Math.max(0, Math.floor((ref.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
                    }, 0) / agencyLeads.length)
                  : 0;

                // Status distribution for this agency
                const statusDist = Object.entries(statusConfig).map(([key, cfg]) => ({
                  status: key,
                  label: cfg.label,
                  count: agencyLeads.filter(l => l.status === key).length,
                })).filter(s => s.count > 0);

                // Problem items sorted by severity
                const problems = [
                  { icon: Timer, label: 'Inaktive Leads (>14 Tage)', count: staleLeads.length, severity: staleLeads.length > 3 ? 'high' : staleLeads.length > 0 ? 'medium' : 'low' },
                  { icon: CalendarX, label: 'Nicht kontaktiert (>3 Tage)', count: newUntouched.length, severity: newUntouched.length > 2 ? 'high' : newUntouched.length > 0 ? 'medium' : 'low' },
                  { icon: UserX, label: 'Abgelehnte Leads', count: rejectedLeads.length, severity: rejectedLeads.length > 5 ? 'high' : rejectedLeads.length > 0 ? 'medium' : 'low' },
                  { icon: RefreshCw, label: 'Neuzuweisungen', count: reassignments, severity: reassignments > 5 ? 'high' : reassignments > 0 ? 'medium' : 'low' },
                ].sort((x, y) => y.count - x.count);

                const severityColor = (s: string) => s === 'high' ? 'text-destructive bg-destructive/10' : s === 'medium' ? 'text-[hsl(38,80%,50%)] bg-[hsl(38,80%,50%)]/10' : 'text-[hsl(152,55%,40%)] bg-[hsl(152,55%,40%)]/10';

                return (
                  <React.Fragment key={a.id}>
                    <tr
                      onClick={() => setExpandedAgency(isExpanded ? null : a.id)}
                      onClick={() => setExpandedAgency(isExpanded ? null : a.id)}
                      className={cn('border-t transition-colors hover:bg-muted/40 cursor-pointer select-none', i % 2 === 0 && 'bg-muted/10', isExpanded && 'bg-primary/5')}
                    >
                      <td className="px-6 py-3.5 font-medium">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                          {a.fullName}
                        </div>
                      </td>
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
                    {isExpanded && (
                      <tr key={`${a.id}-detail`} className="border-t bg-muted/20">
                        <td colSpan={8} className="px-6 py-5">
                          <div className="grid gap-6 lg:grid-cols-3">
                            {/* Problems */}
                            <div className="lg:col-span-2 space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5" /> Problem-Analyse
                              </h4>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {problems.map((p, pi) => (
                                  <div key={pi} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
                                    <div className={cn('rounded-lg p-2', severityColor(p.severity))}>
                                      <p.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-muted-foreground truncate">{p.label}</p>
                                      <p className="text-lg font-bold">{p.count}</p>
                                    </div>
                                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', severityColor(p.severity))}>
                                      {p.severity === 'high' ? 'Kritisch' : p.severity === 'medium' ? 'Warnung' : 'OK'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Ø Prozessdauer: <strong className="text-foreground">{avgDaysInProcess} Tage</strong></span>
                                <span className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> Status-Wechsel: <strong className="text-foreground">{statusChanges}</strong></span>
                              </div>
                            </div>

                            {/* Status Distribution */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status-Verteilung</h4>
                              <div className="space-y-2">
                                {statusDist.map(s => {
                                  const pct = agencyLeads.length > 0 ? (s.count / agencyLeads.length) * 100 : 0;
                                  return (
                                    <div key={s.status} className="space-y-1">
                                      <div className="flex justify-between text-xs">
                                        <span className="font-medium">{s.label}</span>
                                        <span className="text-muted-foreground">{s.count} ({pct.toFixed(0)}%)</span>
                                      </div>
                                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, hsl(168,17%,23%), hsl(162,17%,50%))' }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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

      {/* Flow Analysis Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Workflow className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Flow-Analyse</h2>
            <p className="text-xs text-muted-foreground">Verweildauer, Engpässe und Status-Übergänge</p>
          </div>
        </div>

        {/* Flow KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardModern
            icon={Clock}
            title="Ø Prozessdauer"
            value={`${flowAnalysis.avgProcessDays} Tage`}
            subtitle="Bis zur Einstellung"
            accentColor="hsl(210,60%,52%)"
          />
          <StatCardModern
            icon={AlertTriangle}
            title="Engpass"
            value={flowAnalysis.bottleneck?.label || '–'}
            subtitle={flowAnalysis.bottleneck ? `Ø ${flowAnalysis.bottleneck.avgDays} Tage · ${flowAnalysis.bottleneck.count} Leads` : 'Kein Engpass'}
            accentColor="hsl(38,80%,50%)"
          />
          <StatCardModern
            icon={ArrowRight}
            title="Status-Wechsel"
            value={activities.filter(a => a.type === 'status_change').length}
            subtitle="Gesamte Übergänge"
            accentColor="hsl(162,17%,50%)"
          />
          <StatCardModern
            icon={Activity}
            title="Ø Tage in aktueller Phase"
            value={(() => {
              const all = flowAnalysis.avgDaysPerStatus.filter(s => s.count > 0);
              if (all.length === 0) return '–';
              const avg = all.reduce((s, x) => s + x.avgDays, 0) / all.length;
              return `${Math.round(avg * 10) / 10}`;
            })()}
            subtitle="Über alle Status"
            accentColor="hsl(168,17%,23%)"
          />
        </div>

        {/* Avg Days per Status Chart + Top Transitions */}
        <div className="grid gap-6 lg:grid-cols-5">
          <ChartCard title="Verweildauer pro Status" subtitle="Durchschnittliche Tage" icon={Clock} className="lg:col-span-3">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={flowBarData} barCategoryGap="20%">
                <defs>
                  <linearGradient id="flowBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210,60%,52%)" />
                    <stop offset="100%" stopColor="hsl(210,60%,62%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} label={{ value: 'Tage', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(0,0%,60%)' } }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgDays" fill="url(#flowBarGrad)" radius={[6, 6, 0, 0]} name="Ø Tage" barSize={36} />
                <Bar dataKey="count" fill="hsl(168,17%,23%)" radius={[6, 6, 0, 0]} name="Leads" barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Häufigste Übergänge" subtitle="Status-Wechsel" icon={ArrowRight} className="lg:col-span-2">
            {flowAnalysis.topTransitions.length > 0 ? (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                {flowAnalysis.topTransitions.map((t, i) => {
                  const maxCount = flowAnalysis.topTransitions[0]?.count || 1;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate flex-1 mr-2">{t.label}</span>
                        <span className="font-bold text-foreground shrink-0">{t.count}×</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(t.count / maxCount) * 100}%`,
                            background: `linear-gradient(90deg, hsl(168,17%,23%), hsl(162,17%,50%))`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Keine Status-Wechsel vorhanden</p>
            )}
          </ChartCard>
        </div>

        {/* Detailed Status Flow Table */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Workflow className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Status-Verweildauer Detail</h3>
                <p className="text-xs text-muted-foreground">Detaillierte Aufschlüsselung pro Pipeline-Phase</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phase</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leads</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ø Tage</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Tage</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verteilung</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {flowAnalysis.avgDaysPerStatus.map((s, i) => {
                  const isBottleneck = flowAnalysis.bottleneck?.status === s.status;
                  const maxAvg = Math.max(...flowAnalysis.avgDaysPerStatus.map(x => x.avgDays), 1);
                  return (
                    <tr key={s.status} className={cn('border-t transition-colors hover:bg-muted/40', i % 2 === 0 && 'bg-muted/10', isBottleneck && 'bg-destructive/5')}>
                      <td className="px-6 py-3.5 font-medium flex items-center gap-2">
                        {isBottleneck && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        {s.label}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold">{s.count}</td>
                      <td className="px-6 py-3.5 text-right">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', isBottleneck ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
                          {s.avgDays}d
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right text-muted-foreground">{s.maxDays}d</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(s.avgDays / maxAvg) * 100}%`,
                                background: isBottleneck
                                  ? 'linear-gradient(90deg, hsl(0,65%,51%), hsl(38,80%,50%))'
                                  : 'linear-gradient(90deg, hsl(168,17%,23%), hsl(162,17%,50%))',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {isBottleneck ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                            <AlertTriangle className="h-3 w-3" /> Engpass
                          </span>
                        ) : s.count > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-[hsl(152,55%,40%)]/10 px-2 py-0.5 text-xs font-semibold text-[hsl(152,55%,40%)]">OK</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
