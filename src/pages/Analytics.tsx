import React, { useState, useMemo } from 'react';
import { Filter, CalendarIcon, X, Activity, BarChart3, Megaphone, Briefcase, Workflow, Map as MapIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useLeads } from '@/context/useLeads';
import { statusConfig, type LeadStatus } from '@/lib/mock-data';
import { cantons } from '@/lib/swiss-plz';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import OverviewTab from '@/components/analytics/OverviewTab';
import MarketingTab from '@/components/analytics/MarketingTab';
import ManagementTab from '@/components/analytics/ManagementTab';
import FlowAnalysisTab from '@/components/analytics/FlowAnalysisTab';
import MapTab from '@/components/analytics/MapTab';
import ExportActions from '@/components/analytics/ExportActions';

export default function Analytics() {
  const { leads, agencies, employees, leadSources, activities } = useLeads();
  const [cantonFilter, setCantonFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState('overview');

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

  const selectCls = "h-8 rounded-lg border bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring transition-colors";

  const tabItems = [
    { value: 'overview', label: 'Übersicht', icon: BarChart3 },
    { value: 'marketing', label: 'Marketing', icon: Megaphone },
    { value: 'management', label: 'Geschäftsleitung', icon: Briefcase },
    { value: 'flow', label: 'Flow-Analyse', icon: Workflow },
  ];

  return (
    <div className="space-y-5 print:space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="rounded-xl bg-primary/10 p-2">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
          </div>
          <p className="text-xs text-muted-foreground ml-[44px]">Kennzahlen, Trends und Auswertungen</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportActions filtered={filtered} agencies={agencies} employees={employees} leadSources={leadSources} activeTab={activeTab} />
          <span className="text-[10px] text-muted-foreground">{filtered.length}/{leads.length} Leads</span>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-3 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3 w-3" />
            Filter
          </div>
          <div className="h-5 w-px bg-border" />
          <select value={cantonFilter} onChange={e => setCantonFilter(e.target.value)} className={selectCls}>
            <option value="">Alle Kantone</option>
            {cantons.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
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
              <button className={cn(selectCls, 'inline-flex items-center gap-1.5', !dateFrom && 'text-muted-foreground')}>
                <CalendarIcon className="h-3 w-3" />
                {dateFrom ? format(dateFrom, 'dd.MM.yy') : 'Von'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(selectCls, 'inline-flex items-center gap-1.5', !dateTo && 'text-muted-foreground')}>
                <CalendarIcon className="h-3 w-3" />
                {dateTo ? format(dateTo, 'dd.MM.yy') : 'Bis'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 text-destructive px-2.5 py-1 text-[10px] font-semibold hover:bg-destructive/20 transition-colors">
              <X className="h-2.5 w-2.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl print:hidden">
          {tabItems.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3 py-1.5">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="overview" className="m-0">
            <OverviewTab filtered={filtered} leadSources={leadSources} />
          </TabsContent>
          <TabsContent value="marketing" className="m-0">
            <MarketingTab filtered={filtered} leadSources={leadSources} />
          </TabsContent>
          <TabsContent value="management" className="m-0">
            <ManagementTab filtered={filtered} agencies={agencies} employees={employees} activities={activities} />
          </TabsContent>
          <TabsContent value="flow" className="m-0">
            <FlowAnalysisTab filtered={filtered} activities={activities} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
