import React, { useMemo, useState } from 'react';
import { Users, UserCheck, Target, MapPin, TrendingUp, PieChart as PieChartIcon, BarChart3, Calendar as CalendarIconSolid } from 'lucide-react';
import { getYear, getMonth, getQuarter } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { statusConfig, type LeadStatus, type Lead } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { StatCardModern, ChartCard, CustomTooltip, PieTooltip, PIE_COLORS, renderCustomizedLabel } from './shared';
import type { LeadSourceConfig, ActivityEntry } from '@/context/leads-context';

interface OverviewTabProps {
  filtered: Lead[];
  leadSources: LeadSourceConfig[];
}

export default function OverviewTab({ filtered, leadSources }: OverviewTabProps) {
  const [timeView, setTimeView] = useState<'month' | 'quarter' | 'year'>('month');

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

  const sourceData = leadSources.map(src => ({
    name: src.label, value: filtered.filter(l => l.source === src.id).length, fill: src.color || '#6B7280',
  })).filter(d => d.value > 0);

  const statusData = Object.entries(statusConfig).map(([key, cfg]) => ({
    name: cfg.label, value: filtered.filter(l => l.status === key).length,
    fill: PIE_COLORS[Object.keys(statusConfig).indexOf(key) % PIE_COLORS.length],
  })).filter(d => d.value > 0);

  const timeData = useMemo(() => {
    const monthMap = new Map<string, { label: string; total: number; hired: number; sortKey: number }>();
    const quarterMap = new Map<string, { label: string; total: number; hired: number; sortKey: number }>();
    const yearMap = new Map<string, { label: string; total: number; hired: number; sortKey: number }>();
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

    filtered.forEach(l => {
      const d = new Date(l.createdAt);
      const y = getYear(d), m = getMonth(d), q = getQuarter(d);
      const isHired = l.status === 'hired';
      const mKey = `${y}-${String(m + 1).padStart(2, '0')}`;
      const mEntry = monthMap.get(mKey) || { label: `${monthNames[m]} ${y}`, total: 0, hired: 0, sortKey: y * 100 + m };
      mEntry.total++; if (isHired) mEntry.hired++; monthMap.set(mKey, mEntry);
      const qKey = `${y}-Q${q}`;
      const qEntry = quarterMap.get(qKey) || { label: `Q${q} ${y}`, total: 0, hired: 0, sortKey: y * 10 + q };
      qEntry.total++; if (isHired) qEntry.hired++; quarterMap.set(qKey, qEntry);
      const yKey = `${y}`;
      const yEntry = yearMap.get(yKey) || { label: `${y}`, total: 0, hired: 0, sortKey: y };
      yEntry.total++; if (isHired) yEntry.hired++; yearMap.set(yKey, yEntry);
    });
    return {
      month: [...monthMap.values()].sort((a, b) => a.sortKey - b.sortKey),
      quarter: [...quarterMap.values()].sort((a, b) => a.sortKey - b.sortKey),
      year: [...yearMap.values()].sort((a, b) => a.sortKey - b.sortKey),
    };
  }, [filtered]);

  const activeTimeData = timeData[timeView];
  const currentYear = new Date().getFullYear();
  const thisMonthCount = filtered.filter(l => { const d = new Date(l.createdAt); return getYear(d) === currentYear && getMonth(d) === new Date().getMonth(); }).length;
  const thisQuarterCount = filtered.filter(l => { const d = new Date(l.createdAt); return getYear(d) === currentYear && getQuarter(d) === getQuarter(new Date()); }).length;
  const thisYearCount = filtered.filter(l => { const d = new Date(l.createdAt); return getYear(d) === currentYear; }).length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardModern icon={Users} title="Leads gesamt" value={filtered.length} subtitle="Gefilterte Ergebnisse" accentColor="hsl(168,17%,23%)" trend={12} />
        <StatCardModern icon={UserCheck} title="Eingestellt" value={hiredCount} subtitle={`${conversionRate}% Konversion`} accentColor="hsl(152,55%,40%)" trend={8} />
        <StatCardModern icon={Target} title="Konversionsrate" value={`${conversionRate}%`} subtitle="Hire-Rate" accentColor="hsl(162,17%,50%)" />
        <StatCardModern icon={MapPin} title="Aktive Kantone" value={uniqueCantons} subtitle="Regionale Abdeckung" accentColor="hsl(38,80%,50%)" />
      </div>

      {/* Funnel + Source */}
      <div className="grid gap-5 lg:grid-cols-5">
        <ChartCard title="Recruiting-Funnel" subtitle="Conversion-Trichter" icon={TrendingUp} className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={funnelData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(168,17%,23%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(168,17%,23%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="hsl(168,17%,23%)" strokeWidth={2.5} fill="url(#funnelGrad)" name="Leads" dot={{ r: 4, fill: 'hsl(168,17%,23%)', strokeWidth: 2, stroke: 'white' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Quellen" subtitle="Lead-Herkunft" icon={PieChartIcon} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" label={renderCustomizedLabel} labelLine={false} strokeWidth={2} stroke="hsl(0,0%,100%)">
                {sourceData.map((_, i) => <Cell key={i} fill={sourceData[i].fill} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Status Pie */}
      <ChartCard title="Status-Verteilung" subtitle="Leads nach aktuellem Status" icon={PieChartIcon}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" label={renderCustomizedLabel} labelLine={false} strokeWidth={2} stroke="hsl(0,0%,100%)">
              {statusData.map((_, i) => <Cell key={i} fill={statusData[i].fill} />)}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Time-based */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5"><CalendarIconSolid className="h-3.5 w-3.5 text-primary" /></div>
            <h3 className="text-sm font-semibold">Leads nach Zeitraum</h3>
          </div>
          <div className="flex rounded-lg border bg-muted p-0.5">
            {(['month', 'quarter', 'year'] as const).map(v => (
              <button key={v} onClick={() => setTimeView(v)} className={cn('px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all', timeView === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {v === 'month' ? 'Monat' : v === 'quarter' ? 'Quartal' : 'Jahr'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCardModern icon={CalendarIconSolid} title="Dieser Monat" value={thisMonthCount} subtitle={new Date().toLocaleString('de', { month: 'long', year: 'numeric' })} accentColor="hsl(210,60%,52%)" />
          <StatCardModern icon={CalendarIconSolid} title="Dieses Quartal" value={thisQuarterCount} subtitle={`Q${getQuarter(new Date())} ${currentYear}`} accentColor="hsl(38,80%,50%)" />
          <StatCardModern icon={CalendarIconSolid} title="Dieses Jahr" value={thisYearCount} subtitle={`${currentYear}`} accentColor="hsl(152,55%,40%)" />
        </div>
        <ChartCard title={timeView === 'month' ? 'Leads pro Monat' : timeView === 'quarter' ? 'Leads pro Quartal' : 'Leads pro Jahr'} subtitle="Erfasst vs. Eingestellt" icon={BarChart3}>
          {activeTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={activeTimeData} barCategoryGap="15%">
                <defs>
                  <linearGradient id="timeBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210,60%,52%)" />
                    <stop offset="100%" stopColor="hsl(210,60%,62%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} angle={timeView === 'month' && activeTimeData.length > 8 ? -35 : 0} textAnchor={timeView === 'month' && activeTimeData.length > 8 ? 'end' : 'middle'} height={timeView === 'month' && activeTimeData.length > 8 ? 60 : 30} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                <Bar dataKey="total" fill="url(#timeBarGrad)" radius={[6, 6, 0, 0]} name="Erfasst" barSize={timeView === 'year' ? 48 : 24} />
                <Bar dataKey="hired" fill="hsl(152,55%,40%)" radius={[6, 6, 0, 0]} name="Eingestellt" barSize={timeView === 'year' ? 48 : 24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Daten</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
