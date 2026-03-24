import React, { useMemo } from 'react';
import { Target, TrendingUp, BarChart3, PieChart as PieChartIcon, Megaphone, Zap, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { statusConfig, type Lead } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { StatCardModern, ChartCard, CustomTooltip, PieTooltip, PIE_COLORS, renderCustomizedLabel } from './shared';
import type { LeadSourceConfig } from '@/context/leads-context';

interface MarketingTabProps {
  filtered: Lead[];
  leadSources: LeadSourceConfig[];
}

export default function MarketingTab({ filtered, leadSources }: MarketingTabProps) {
  const sourcePerformance = useMemo(() => {
    return leadSources.map(src => {
      const leads = filtered.filter(l => l.source === src.id);
      const hired = leads.filter(l => l.status === 'hired').length;
      const contacted = leads.filter(l => l.status !== 'new').length;
      return {
        id: src.id,
        name: src.label,
        total: leads.length,
        hired,
        contacted,
        contactRate: leads.length > 0 ? Math.round((contacted / leads.length) * 100) : 0,
        conversionRate: leads.length > 0 ? Math.round((hired / leads.length) * 100) : 0,
        fill: src.color || '#6B7280',
      };
    }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);
  }, [filtered, leadSources]);

  const campaignData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; hired: number; contacted: number }>();
    filtered.forEach(l => {
      const c = l.campaign || 'Keine Kampagne';
      const entry = map.get(c) || { name: c, total: 0, hired: 0, contacted: 0 };
      entry.total++;
      if (l.status === 'hired') entry.hired++;
      if (l.status !== 'new') entry.contacted++;
      map.set(c, entry);
    });
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filtered]);

  const genderData = useMemo(() => {
    const women = filtered.filter(l => l.salutation === 'Frau').length;
    const men = filtered.filter(l => l.salutation === 'Herr').length;
    const unknown = filtered.length - women - men;
    return [
      { name: 'Frauen', value: women, fill: 'hsl(330, 65%, 50%)' },
      { name: 'Männer', value: men, fill: 'hsl(210, 60%, 52%)' },
      ...(unknown > 0 ? [{ name: 'Keine Angabe', value: unknown, fill: 'hsl(0, 0%, 70%)' }] : []),
    ].filter(g => g.value > 0);
  }, [filtered]);

  const totalLeads = filtered.length;
  const totalHired = filtered.filter(l => l.status === 'hired').length;
  const totalContacted = filtered.filter(l => l.status !== 'new').length;
  const bestSource = sourcePerformance.length > 0 ? sourcePerformance.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b) : null;
  const contactRate = totalLeads > 0 ? Math.round((totalContacted / totalLeads) * 100) : 0;

  const funnelBySource = sourcePerformance.map(s => ({
    name: s.name.length > 12 ? s.name.slice(0, 10) + '…' : s.name,
    'Erfasst': s.total,
    'Kontaktiert': s.contacted,
    'Eingestellt': s.hired,
  }));

  return (
    <div className="space-y-6">
      {/* Marketing KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardModern icon={Megaphone} title="Lead-Quellen" value={sourcePerformance.length} subtitle="Aktive Kanäle" accentColor="hsl(270,40%,50%)" />
        <StatCardModern icon={Target} title="Kontaktrate" value={`${contactRate}%`} subtitle="Leads kontaktiert" accentColor="hsl(210,60%,52%)" />
        <StatCardModern icon={Zap} title="Beste Quelle" value={bestSource?.name || '–'} subtitle={bestSource ? `${bestSource.conversionRate}% Konversion` : ''} accentColor="hsl(152,55%,40%)" />
        <StatCardModern icon={TrendingUp} title="Gesamtkonversion" value={`${totalLeads > 0 ? ((totalHired / totalLeads) * 100).toFixed(1) : 0}%`} subtitle={`${totalHired} von ${totalLeads}`} accentColor="hsl(38,80%,50%)" />
      </div>

      {/* Source Performance */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Quellen-Performance" subtitle="Leads pro Quelle" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sourcePerformance} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} stroke="hsl(0,0%,80%)" width={80} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="total" fill="hsl(210,60%,52%)" radius={[0, 6, 6, 0]} name="Erfasst" barSize={16} />
              <Bar dataKey="hired" fill="hsl(152,55%,40%)" radius={[0, 6, 6, 0]} name="Eingestellt" barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Quellen-Verteilung" subtitle="Anteil pro Quelle" icon={PieChartIcon}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sourcePerformance} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="total" label={renderCustomizedLabel} labelLine={false} strokeWidth={2} stroke="hsl(0,0%,100%)">
                {sourcePerformance.map((s, i) => <Cell key={i} fill={s.fill} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Gender Distribution */}
      {genderData.length > 0 && (
        <ChartCard title="Geschlechterverteilung" subtitle="Frauen / Männer" icon={Users}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={renderCustomizedLabel} labelLine={false} strokeWidth={2} stroke="hsl(0,0%,100%)">
                {genderData.map((g, i) => <Cell key={i} fill={g.fill} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Funnel by Source */}
      {funnelBySource.length > 0 && (
        <ChartCard title="Funnel nach Quelle" subtitle="Conversion pro Kanal" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnelBySource} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Erfasst" fill="hsl(210,60%,52%)" radius={[6, 6, 0, 0]} barSize={20} />
              <Bar dataKey="Kontaktiert" fill="hsl(38,80%,50%)" radius={[6, 6, 0, 0]} barSize={20} />
              <Bar dataKey="Eingestellt" fill="hsl(152,55%,40%)" radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Campaign Table */}
      {campaignData.length > 0 && (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5"><Megaphone className="h-3.5 w-3.5 text-primary" /></div>
              <h3 className="text-xs font-semibold">Kampagnen-Übersicht</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t bg-muted/30">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kampagne</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Leads</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kontaktiert</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Eingestellt</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Konversion</th>
                  <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Verteilung</th>
                </tr>
              </thead>
              <tbody>
                {campaignData.map((c, i) => {
                  const maxTotal = Math.max(...campaignData.map(r => r.total), 1);
                  return (
                    <tr key={c.name} className={cn('border-t transition-colors hover:bg-muted/40', i % 2 === 0 && 'bg-muted/10')}>
                      <td className="px-5 py-3 font-medium text-xs">{c.name}</td>
                      <td className="px-5 py-3 text-right font-bold text-xs">{c.total}</td>
                      <td className="px-5 py-3 text-right text-xs">{c.contacted}</td>
                      <td className="px-5 py-3 text-right text-xs">
                        <span className="inline-flex items-center rounded-full bg-[hsl(152,55%,40%)]/10 px-2 py-0.5 text-[10px] font-semibold text-[hsl(152,55%,40%)]">{c.hired}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-xs">{c.total > 0 ? ((c.hired / c.total) * 100).toFixed(0) : 0}%</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(c.total / maxTotal) * 100}%`, background: 'linear-gradient(90deg, hsl(210,60%,52%), hsl(162,17%,50%))' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Source Detail Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" /></div>
            <h3 className="text-xs font-semibold">Quellen-Detail</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t bg-muted/30">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quelle</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kontaktrate</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Konversion</th>
              </tr>
            </thead>
            <tbody>
              {sourcePerformance.map((s, i) => (
                <tr key={s.id} className={cn('border-t transition-colors hover:bg-muted/40', i % 2 === 0 && 'bg-muted/10')}>
                  <td className="px-5 py-3 font-medium text-xs flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.fill }} />
                    {s.name}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-xs">{s.total}</td>
                  <td className="px-5 py-3 text-right text-xs">{s.contactRate}%</td>
                  <td className="px-5 py-3 text-right text-xs">
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      s.conversionRate > 20 ? 'bg-[hsl(152,55%,40%)]/10 text-[hsl(152,55%,40%)]' : s.conversionRate > 10 ? 'bg-[hsl(38,80%,50%)]/10 text-[hsl(38,80%,50%)]' : 'bg-muted text-muted-foreground'
                    )}>{s.conversionRate}%</span>
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
