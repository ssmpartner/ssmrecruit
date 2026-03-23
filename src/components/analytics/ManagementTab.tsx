import React, { useState, useMemo } from 'react';
import { BarChart3, Users, MapPin, AlertTriangle, Clock, Activity, ChevronDown, RefreshCw, UserX, CalendarX, Timer } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { statusConfig, type Lead, type Agency, type Employee } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { StatCardModern, ChartCard, CustomTooltip } from './shared';
import type { ActivityEntry } from '@/context/leads-context';

interface ManagementTabProps {
  filtered: Lead[];
  agencies: Agency[];
  employees: Employee[];
  activities: ActivityEntry[];
}

export default function ManagementTab({ filtered, agencies, employees, activities }: ManagementTabProps) {
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);

  const hiredCount = filtered.filter(l => l.status === 'hired').length;
  const conversionRate = filtered.length > 0 ? ((hiredCount / filtered.length) * 100).toFixed(1) : '0';
  const uniqueCantons = new Set(filtered.map(l => l.cantonCode)).size;

  const agencyData = agencies.map(a => {
    const agencyLeads = filtered.filter(l => l.agencyId === a.id);
    const hired = agencyLeads.filter(l => l.status === 'hired').length;
    const contacted = agencyLeads.filter(l => l.status === 'contacted').length;
    const interview = agencyLeads.filter(l => l.status === 'appointment' || l.status === 'follow_up').length;
    const rejected = agencyLeads.filter(l => l.status === 'rejected').length;
    return {
      id: a.id, name: a.name.length > 14 ? a.name.slice(0, 12) + '…' : a.name, fullName: a.name,
      total: agencyLeads.length, hired, contacted, interview, rejected,
      conversion: agencyLeads.length > 0 ? ((hired / agencyLeads.length) * 100).toFixed(0) : '0',
    };
  }).sort((a, b) => b.total - a.total);

  const employeeData = employees.map(e => ({
    name: e.name.split(' ')[0],
    leads: filtered.filter(l => l.employeeId === e.id).length,
    hired: filtered.filter(l => l.employeeId === e.id && l.status === 'hired').length,
  }));

  const cantonData = useMemo(() => {
    const map = new Map<string, { code: string; name: string; total: number; hired: number }>();
    filtered.forEach(l => {
      const existing = map.get(l.cantonCode);
      if (existing) { existing.total++; if (l.status === 'hired') existing.hired++; }
      else { map.set(l.cantonCode, { code: l.cantonCode, name: l.canton, total: 1, hired: l.status === 'hired' ? 1 : 0 }); }
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);

  const severityColor = (s: string) => s === 'high' ? 'text-destructive bg-destructive/10' : s === 'medium' ? 'text-[hsl(38,80%,50%)] bg-[hsl(38,80%,50%)]/10' : 'text-[hsl(152,55%,40%)] bg-[hsl(152,55%,40%)]/10';

  return (
    <div className="space-y-6">
      {/* Management KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardModern icon={Users} title="Leads gesamt" value={filtered.length} subtitle="Aktive Pipeline" accentColor="hsl(168,17%,23%)" />
        <StatCardModern icon={BarChart3} title="Agenturen" value={agencies.length} subtitle="Aktive Partner" accentColor="hsl(210,60%,52%)" />
        <StatCardModern icon={Users} title="Mitarbeiter" value={employees.length} subtitle="Team-Grösse" accentColor="hsl(38,80%,50%)" />
        <StatCardModern icon={MapPin} title="Kantone" value={uniqueCantons} subtitle={`${conversionRate}% Konversion`} accentColor="hsl(152,55%,40%)" />
      </div>

      {/* Agency + Employee Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Agentur-Performance" subtitle="Leads & Einstellungen" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={agencyData}>
              <defs>
                <linearGradient id="mgmtAgencyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(168,17%,23%)" />
                  <stop offset="100%" stopColor="hsl(168,17%,33%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" fill="url(#mgmtAgencyGrad)" radius={[6, 6, 0, 0]} name="Total" barSize={24} />
              <Bar dataKey="hired" fill="hsl(152,55%,40%)" radius={[6, 6, 0, 0]} name="Eingestellt" barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Mitarbeiter-Performance" subtitle="Leads & Einstellungen" icon={Users}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={employeeData} barCategoryGap="20%">
              <defs>
                <linearGradient id="mgmtEmpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(168,17%,23%)" />
                  <stop offset="100%" stopColor="hsl(168,17%,33%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,89%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(0,0%,80%)" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="leads" fill="url(#mgmtEmpGrad)" radius={[6, 6, 0, 0]} name="Zugewiesen" />
              <Bar dataKey="hired" fill="hsl(67,16%,66%)" radius={[6, 6, 0, 0]} name="Eingestellt" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Agency Detail Table with Problem Analysis */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" /></div>
            <div>
              <h3 className="text-xs font-semibold">Agentur-Übersicht</h3>
              <p className="text-[10px] text-muted-foreground">Klicke für Problem-Analyse</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t bg-muted/30">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Agentur</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kontaktiert</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Eingestellt</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Abgelehnt</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Konversion</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Verteilung</th>
              </tr>
            </thead>
            <tbody>
              {agencyData.map((a, i) => {
                const isExpanded = expandedAgency === a.id;
                const agencyLeads = filtered.filter(l => l.agencyId === a.id);
                const agencyActivities = activities.filter(act => agencyLeads.some(l => l.id === act.leadId));
                const now = new Date();
                const reassignments = agencyActivities.filter(act => act.type === 'assignment').length;
                const statusChanges = agencyActivities.filter(act => act.type === 'status_change').length;
                const rejectedLeads = agencyLeads.filter(l => l.status === 'rejected');
                const staleLeads = agencyLeads.filter(l => { const days = Math.floor((now.getTime() - new Date(l.updatedAt).getTime()) / 86400000); return days > 14 && l.status !== 'hired' && l.status !== 'rejected'; });
                const newUntouched = agencyLeads.filter(l => { const days = Math.floor((now.getTime() - new Date(l.createdAt).getTime()) / 86400000); return l.status === 'new' && days > 3; });
                const avgDaysInProcess = agencyLeads.length > 0 ? Math.round(agencyLeads.reduce((sum, l) => { const ref = l.status === 'hired' || l.status === 'rejected' ? new Date(l.updatedAt) : now; return sum + Math.max(0, Math.floor((ref.getTime() - new Date(l.createdAt).getTime()) / 86400000)); }, 0) / agencyLeads.length) : 0;
                const statusDist = Object.entries(statusConfig).map(([key, cfg]) => ({ status: key, label: cfg.label, count: agencyLeads.filter(l => l.status === key).length })).filter(s => s.count > 0);
                const problems = [
                  { icon: Timer, label: 'Inaktiv >14 Tage', count: staleLeads.length, severity: staleLeads.length > 3 ? 'high' : staleLeads.length > 0 ? 'medium' : 'low' },
                  { icon: CalendarX, label: 'Nicht kontaktiert >3T', count: newUntouched.length, severity: newUntouched.length > 2 ? 'high' : newUntouched.length > 0 ? 'medium' : 'low' },
                  { icon: UserX, label: 'Abgelehnt', count: rejectedLeads.length, severity: rejectedLeads.length > 5 ? 'high' : rejectedLeads.length > 0 ? 'medium' : 'low' },
                  { icon: RefreshCw, label: 'Neuzuweisungen', count: reassignments, severity: reassignments > 5 ? 'high' : reassignments > 0 ? 'medium' : 'low' },
                ].sort((x, y) => y.count - x.count);

                return (
                  <React.Fragment key={a.id}>
                    <tr onClick={() => setExpandedAgency(isExpanded ? null : a.id)} className={cn('border-t transition-colors hover:bg-muted/40 cursor-pointer select-none', i % 2 === 0 && 'bg-muted/10', isExpanded && 'bg-primary/5')}>
                      <td className="px-5 py-3 font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                          {a.fullName}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-xs">{a.total}</td>
                      <td className="px-5 py-3 text-right text-xs">{a.contacted}</td>
                      <td className="px-5 py-3 text-right text-xs">
                        <span className="inline-flex items-center rounded-full bg-[hsl(152,55%,40%)]/10 px-2 py-0.5 text-[10px] font-semibold text-[hsl(152,55%,40%)]">{a.hired}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs">
                        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">{a.rejected}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-xs">{a.conversion}%</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${filtered.length > 0 ? (a.total / filtered.length) * 100 : 0}%`, background: 'linear-gradient(90deg, hsl(168,17%,23%), hsl(162,17%,50%))' }} />
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">{filtered.length > 0 ? ((a.total / filtered.length) * 100).toFixed(0) : 0}%</span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t bg-muted/20">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="grid gap-5 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-2.5">
                              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3" /> Problem-Analyse
                              </h4>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {problems.map((p, pi) => (
                                  <div key={pi} className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm">
                                    <div className={cn('rounded-lg p-1.5', severityColor(p.severity))}><p.icon className="h-3.5 w-3.5" /></div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-muted-foreground truncate">{p.label}</p>
                                      <p className="text-base font-bold">{p.count}</p>
                                    </div>
                                    <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold', severityColor(p.severity))}>
                                      {p.severity === 'high' ? 'Kritisch' : p.severity === 'medium' ? 'Warnung' : 'OK'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Ø Prozess: <strong className="text-foreground">{avgDaysInProcess}T</strong></span>
                                <span className="flex items-center gap-1"><Activity className="h-2.5 w-2.5" /> Wechsel: <strong className="text-foreground">{statusChanges}</strong></span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status-Verteilung</h4>
                              {statusDist.map(s => {
                                const pct = agencyLeads.length > 0 ? (s.count / agencyLeads.length) * 100 : 0;
                                return (
                                  <div key={s.status} className="space-y-0.5">
                                    <div className="flex justify-between text-[10px]">
                                      <span className="font-medium">{s.label}</span>
                                      <span className="text-muted-foreground">{s.count} ({pct.toFixed(0)}%)</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, hsl(168,17%,23%), hsl(162,17%,50%))' }} />
                                    </div>
                                  </div>
                                );
                              })}
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

      {/* Canton Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /></div>
            <h3 className="text-xs font-semibold">Kanton-Übersicht</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t bg-muted/30">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kanton</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Eingestellt</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Konversion</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Verteilung</th>
              </tr>
            </thead>
            <tbody>
              {cantonData.map((c, i) => (
                <tr key={c.code} className={cn('border-t transition-colors hover:bg-muted/40', i % 2 === 0 && 'bg-muted/10')}>
                  <td className="px-5 py-3 font-medium text-xs">{c.name} <span className="text-muted-foreground">({c.code})</span></td>
                  <td className="px-5 py-3 text-right font-bold text-xs">{c.total}</td>
                  <td className="px-5 py-3 text-right text-xs">
                    <span className="inline-flex items-center rounded-full bg-[hsl(152,55%,40%)]/10 px-2 py-0.5 text-[10px] font-semibold text-[hsl(152,55%,40%)]">{c.hired}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-xs">{c.total > 0 ? ((c.hired / c.total) * 100).toFixed(0) : 0}%</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${filtered.length > 0 ? (c.total / filtered.length) * 100 : 0}%`, background: 'linear-gradient(90deg, hsl(168,17%,23%), hsl(162,17%,50%))' }} />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">{filtered.length > 0 ? ((c.total / filtered.length) * 100).toFixed(0) : 0}%</span>
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
