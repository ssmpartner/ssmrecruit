import React, { useMemo } from 'react';
import { Workflow, Clock, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { statusConfig, type LeadStatus, type Lead } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { StatCardModern, ChartCard, CustomTooltip, PIE_COLORS } from './shared';
import type { ActivityEntry } from '@/context/leads-context';

interface FlowAnalysisTabProps {
  filtered: Lead[];
  activities: ActivityEntry[];
}

export default function FlowAnalysisTab({ filtered, activities }: FlowAnalysisTabProps) {
  const statusOrder: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up', 'hired'];

  const flowAnalysis = useMemo(() => {
    const now = new Date();
    const statusDurations: Record<string, number[]> = {};
    statusOrder.forEach(s => { statusDurations[s] = []; });

    filtered.forEach(lead => {
      const leadActs = activities.filter(a => a.leadId === lead.id && a.type === 'status_change').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (leadActs.length > 0) {
        const lastChange = new Date(leadActs[leadActs.length - 1].timestamp);
        const daysInCurrent = Math.max(0, Math.floor((now.getTime() - lastChange.getTime()) / 86400000));
        if (statusDurations[lead.status]) statusDurations[lead.status].push(daysInCurrent);
        for (let i = 1; i < leadActs.length; i++) {
          const days = Math.max(0, Math.floor((new Date(leadActs[i].timestamp).getTime() - new Date(leadActs[i - 1].timestamp).getTime()) / 86400000));
          const match = leadActs[i - 1].description?.match(/→\s*(\w+)/);
          if (match) {
            const prevStatus = Object.keys(statusConfig).find(k => statusConfig[k as LeadStatus]?.label?.toLowerCase().includes(match[1].toLowerCase()));
            if (prevStatus && statusDurations[prevStatus]) statusDurations[prevStatus].push(days);
          }
        }
      } else {
        const days = Math.max(0, Math.floor((now.getTime() - new Date(lead.createdAt).getTime()) / 86400000));
        if (statusDurations[lead.status]) statusDurations[lead.status].push(days);
      }
    });

    const avgDaysPerStatus = statusOrder.map(s => {
      const durations = statusDurations[s];
      const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      return { status: s, label: statusConfig[s]?.label || s, avgDays: Math.round(avg * 10) / 10, count: filtered.filter(l => l.status === s).length, maxDays: durations.length > 0 ? Math.max(...durations) : 0 };
    });

    const bottleneck = avgDaysPerStatus.filter(s => s.count > 0).sort((a, b) => b.avgDays - a.avgDays)[0] || null;

    const transitions: Record<string, number> = {};
    activities.filter(a => a.type === 'status_change').forEach(a => {
      const match = a.description?.match(/(.+?)\s*→\s*(.+)/);
      if (match) { const key = `${match[1].trim()} → ${match[2].trim()}`; transitions[key] = (transitions[key] || 0) + 1; }
    });
    const topTransitions = Object.entries(transitions).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));

    const hiredLeads = filtered.filter(l => l.status === 'hired');
    const avgProcessDays = hiredLeads.length > 0 ? Math.round(hiredLeads.reduce((sum, l) => sum + Math.max(0, Math.floor((new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime()) / 86400000)), 0) / hiredLeads.length) : 0;

    return { avgDaysPerStatus, bottleneck, topTransitions, avgProcessDays };
  }, [filtered, activities]);

  const flowBarData = flowAnalysis.avgDaysPerStatus.map((s, i) => ({ ...s, fill: PIE_COLORS[i % PIE_COLORS.length] }));

  return (
    <div className="space-y-6">
      {/* Flow KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardModern icon={Clock} title="Ø Prozessdauer" value={`${flowAnalysis.avgProcessDays} Tage`} subtitle="Bis zur Einstellung" accentColor="hsl(210,60%,52%)" />
        <StatCardModern icon={AlertTriangle} title="Engpass" value={flowAnalysis.bottleneck?.label || '–'} subtitle={flowAnalysis.bottleneck ? `Ø ${flowAnalysis.bottleneck.avgDays}T · ${flowAnalysis.bottleneck.count} Leads` : 'Kein Engpass'} accentColor="hsl(38,80%,50%)" />
        <StatCardModern icon={ArrowRight} title="Status-Wechsel" value={activities.filter(a => a.type === 'status_change').length} subtitle="Gesamte Übergänge" accentColor="hsl(162,17%,50%)" />
        <StatCardModern icon={Activity} title="Ø Tage in Phase" value={(() => { const all = flowAnalysis.avgDaysPerStatus.filter(s => s.count > 0); if (all.length === 0) return '–'; return `${Math.round(all.reduce((s, x) => s + x.avgDays, 0) / all.length * 10) / 10}`; })()} subtitle="Über alle Status" accentColor="hsl(168,17%,23%)" />
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-5">
        <ChartCard title="Verweildauer pro Status" subtitle="Durchschnittliche Tage" icon={Clock} className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={flowBarData} barCategoryGap="20%">
              <defs>
                <linearGradient id="flowBarGrd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210,60%,52%)" />
                  <stop offset="100%" stopColor="hsl(210,60%,62%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} label={{ value: 'Tage', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(0,0%,60%)' } }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgDays" fill="url(#flowBarGrd)" radius={[6, 6, 0, 0]} name="Ø Tage" barSize={32} />
              <Bar dataKey="count" fill="hsl(168,17%,23%)" radius={[6, 6, 0, 0]} name="Leads" barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Häufigste Übergänge" subtitle="Status-Wechsel" icon={ArrowRight} className="lg:col-span-2">
          {flowAnalysis.topTransitions.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {flowAnalysis.topTransitions.map((t, i) => {
                const maxCount = flowAnalysis.topTransitions[0]?.count || 1;
                return (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-medium truncate flex-1 mr-2">{t.label}</span>
                      <span className="font-bold text-foreground shrink-0">{t.count}×</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(t.count / maxCount) * 100}%`, background: 'linear-gradient(90deg, hsl(168,17%,23%), hsl(162,17%,50%))' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">Keine Status-Wechsel</p>
          )}
        </ChartCard>
      </div>

      {/* Detail Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5"><Workflow className="h-3.5 w-3.5 text-primary" /></div>
            <h3 className="text-xs font-semibold">Status-Verweildauer Detail</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t bg-muted/30">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phase</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Leads</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ø Tage</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Max</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Verteilung</th>
                <th className="px-5 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {flowAnalysis.avgDaysPerStatus.map((s, i) => {
                const isBottleneck = flowAnalysis.bottleneck?.status === s.status;
                const maxAvg = Math.max(...flowAnalysis.avgDaysPerStatus.map(x => x.avgDays), 1);
                return (
                  <tr key={s.status} className={cn('border-t transition-colors hover:bg-muted/40', i % 2 === 0 && 'bg-muted/10', isBottleneck && 'bg-destructive/5')}>
                    <td className="px-5 py-3 font-medium text-xs flex items-center gap-1.5">
                      {isBottleneck && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                      {s.label}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-xs">{s.count}</td>
                    <td className="px-5 py-3 text-right text-xs">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', isBottleneck ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>{s.avgDays}d</span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground">{s.maxDays}d</td>
                    <td className="px-5 py-3">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(s.avgDays / maxAvg) * 100}%`, background: isBottleneck ? 'linear-gradient(90deg, hsl(0,65%,51%), hsl(38,80%,50%))' : 'linear-gradient(90deg, hsl(168,17%,23%), hsl(162,17%,50%))' }} />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {isBottleneck ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive"><AlertTriangle className="h-2.5 w-2.5" /> Engpass</span>
                      ) : s.count > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-[hsl(152,55%,40%)]/10 px-2 py-0.5 text-[10px] font-semibold text-[hsl(152,55%,40%)]">OK</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">–</span>
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
  );
}
