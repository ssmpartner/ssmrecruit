import { useState, useMemo, useCallback, useEffect } from 'react';
import { Download, Upload, Filter, MapPin, CalendarIcon, X, Archive, Trash2, Copy, ChevronLeft, ChevronRight, GitMerge } from 'lucide-react';
import { format } from 'date-fns';
import { type LeadStatus, type LeadLifecycle, statusConfig } from '@/lib/mock-data';
import { cantons } from '@/lib/swiss-plz';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import SourceBadge from '@/components/SourceBadge';
import LeadDetailSheet from '@/components/LeadDetailSheet';
import AddLeadDialog from '@/components/AddLeadDialog';
import LeadActions from '@/components/LeadActions';
import DuplicateLeads from '@/components/DuplicateLeads';
import CsvImportDialog from '@/components/CsvImportDialog';
import BulkActionsBar from '@/components/BulkActionsBar';
import AddressEnrichment from '@/components/AddressEnrichment';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { detectDuplicates } from '@/lib/duplicate-detection';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type TabKey = 'active' | 'archived' | 'deleted' | 'duplicates' | 'demo';
type PageSize = 10 | 20 | 30 | 50 | 100 | 'all';

const PAGE_SIZES: { value: PageSize; label: string }[] = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 30, label: '30' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 'all', label: 'Alle' },
];

export default function LeadsTable() {
  const { leads, employees, agencies, leadSources, activities, setSelectedLead, updateLead } = useLeads();
  const { isSuperadmin, role, isControlling, isGeschaeftsleitung, isHR, isReviewRole, isAgencyManager, isAgencyScoped, isTeamleiter, user } = useAuth();
  const canManageLeads = !isReviewRole;

  // Restrict filter options: agency-scoped roles (agency_manager, backoffice) → own agency; teamleiter → own agency + only self
  const myEmployee = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase();
    return employees.find(e => (e.email || '').toLowerCase() === userEmail);
  }, [employees, user]);
  const isRestricted = isAgencyScoped || isTeamleiter;
  const visibleAgencies = useMemo(() => isRestricted && myEmployee ? agencies.filter(a => a.id === myEmployee.agencyId) : agencies, [isRestricted, myEmployee, agencies]);
  const visibleEmployees = useMemo(() => {
    if (isTeamleiter && myEmployee) return employees.filter(e => e.id === myEmployee.id);
    if (isAgencyScoped && myEmployee) return employees.filter(e => e.agencyId === myEmployee.agencyId);
    return employees;
  }, [isAgencyScoped, isTeamleiter, myEmployee, employees]);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [cantonFilter, setCantonFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);

  const markLeadViewed = useCallback((lead: Parameters<typeof setSelectedLead>[0]) => {
    if (lead && !isSuperadmin && !lead.isRead) {
      updateLead(lead.id, { isRead: true });
    }
    setSelectedLead(lead);
  }, [setSelectedLead, isSuperadmin, updateLead]);

  const lifecycleLeads = useMemo(() => {
    if (activeTab === 'demo') {
      return leads.filter(l => l.isDemo);
    }
    const lifecycle: LeadLifecycle = activeTab === 'active' ? 'active' : activeTab === 'archived' ? 'archived' : 'deleted';
    let filtered = leads.filter(l => l.lifecycle === lifecycle);

    // Role-based status filtering for review roles
    if (isControlling) {
      filtered = filtered.filter(l => l.status === 'ready_for_controlling');
    } else if (isGeschaeftsleitung) {
      filtered = filtered.filter(l => ['controlling_approved','management_review'].includes(l.status));
    } else if (isHR) {
      filtered = filtered.filter(l => ['management_approved','hr_processing','hr_pending'].includes(l.status));
    }

    return filtered;
  }, [leads, activeTab, isControlling, isGeschaeftsleitung, isHR]);

  const filtered = useMemo(() => {
    return lifecycleLeads.filter(l => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      if (agencyFilter && l.agencyId !== agencyFilter) return false;
      if (employeeFilter && l.employeeId !== employeeFilter) return false;
      if (cantonFilter && l.cantonCode !== cantonFilter) return false;
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
      if (search) {
        const q = search.toLowerCase();
        const phoneDigits = (l.phone || '').replace(/\D/g, '');
        const qDigits = q.replace(/\D/g, '');
        const phoneMatch = qDigits.length > 0 && phoneDigits.includes(qDigits);
        if (!l.name.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q) && !l.city.toLowerCase().includes(q) && !l.plz.includes(q) && !phoneMatch) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lifecycleLeads, statusFilter, sourceFilter, agencyFilter, employeeFilter, cantonFilter, search, dateFrom, dateTo]);

  // Pagination
  const totalItems = filtered.length;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedLeads = useMemo(() => {
    if (pageSize === 'all') return filtered;
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [statusFilter, sourceFilter, agencyFilter, employeeFilter, cantonFilter, search, dateFrom, dateTo, activeTab, pageSize]);

  // Duplikat-Erkennung (nur für Superadmin sichtbar)
  const duplicateInfo = useMemo(() => {
    if (!isSuperadmin) return new Map<string, { confidence: number; reason: string; partners: string[] }>();
    const scanLeads = leads
      .filter(l => l.lifecycle === 'active')
      .map(l => ({
        id: l.id, name: l.name, email: l.email ?? '', phone: l.phone ?? '',
        plz: l.plz ?? '', city: l.city ?? '', position: l.position ?? '',
      }));
    const map = new Map<string, { confidence: number; reason: string; partners: string[] }>();
    const nameById = new Map(leads.map(l => [l.id, l.name]));
    for (const pair of detectDuplicates(scanLeads)) {
      for (const [id, otherId] of [[pair.leadId1, pair.leadId2], [pair.leadId2, pair.leadId1]] as const) {
        const existing = map.get(id);
        const partnerName = nameById.get(otherId) || '';
        if (existing) {
          existing.partners.push(partnerName);
          if (pair.confidence > existing.confidence) {
            existing.confidence = pair.confidence;
            existing.reason = pair.reason;
          }
        } else {
          map.set(id, { confidence: pair.confidence, reason: pair.reason, partners: [partnerName] });
        }
      }
    }
    return map;
  }, [leads, isSuperadmin]);

  const hasFilters = statusFilter || sourceFilter || agencyFilter || employeeFilter || cantonFilter || search || dateFrom || dateTo;

  const clearFilters = () => {
    setStatusFilter(''); setSourceFilter(''); setAgencyFilter(''); setEmployeeFilter(''); setCantonFilter(''); setSearch(''); setDateFrom(undefined); setDateTo(undefined);
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === paginatedLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedLeads.map(l => l.id));
    }
  }, [selectedIds.length, paginatedLeads]);

  const exportCSV = () => {
    const header = 'Name,Email,Telefon,Adresse,PLZ,Ort,Kanton,Position,Quelle,Status,Agentur,Mitarbeiter,Datum\n';
    const rows = filtered.map(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      const ag = agencies.find(a => a.id === l.agencyId);
      return `"${l.name}","${l.email}","${l.phone}","${l.address}","${l.plz}","${l.city}","${l.canton}","${l.position}","${l.source}","${l.status}","${ag?.name}","${emp?.name}","${l.createdAt}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leads_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const selectCls = "h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  // Role-filtered counts
  const roleFilteredActive = useMemo(() => {
    let items = leads.filter(l => l.lifecycle === 'active');
    if (isControlling) items = items.filter(l => l.status === 'ready_for_controlling');
    else if (isGeschaeftsleitung) items = items.filter(l => ['controlling_approved','management_review'].includes(l.status));
    else if (isHR) items = items.filter(l => ['management_approved','hr_processing','hr_pending'].includes(l.status));
    return items.length;
  }, [leads, isControlling, isGeschaeftsleitung, isHR]);

  const activeCount = roleFilteredActive;
  const archivedCount = leads.filter(l => l.lifecycle === 'archived').length;
  const deletedCount = leads.filter(l => l.lifecycle === 'deleted').length;

  const demoCount = leads.filter(l => l.isDemo).length;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number; superadminOnly?: boolean; hideForReview?: boolean }[] = [
    { key: 'active', label: isControlling ? 'Zu prüfen' : isGeschaeftsleitung ? 'Freigaben offen' : isHR ? 'Onboarding' : 'Aktiv', icon: null, count: activeCount },
    { key: 'archived', label: 'Archiviert', icon: <Archive className="h-3.5 w-3.5" />, count: archivedCount, superadminOnly: true, hideForReview: true },
    { key: 'deleted', label: 'Gelöscht', icon: <Trash2 className="h-3.5 w-3.5" />, count: deletedCount, superadminOnly: true, hideForReview: true },
    { key: 'duplicates', label: 'Doppelte Leads', icon: <Copy className="h-3.5 w-3.5" />, count: 0, hideForReview: true },
    { key: 'demo', label: 'Demo', icon: null, count: demoCount, superadminOnly: true, hideForReview: true },
  ];

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            {isReviewRole
              ? `${filtered.length} Lead${filtered.length !== 1 ? 's' : ''} zur Bearbeitung`
              : activeTab === 'duplicates' ? 'KI-basierte Duplikat-Erkennung'
              : activeTab === 'demo' ? `${filtered.length} Demo-/Muster-Lead${filtered.length !== 1 ? 's' : ''}`
              : `${filtered.length} von ${lifecycleLeads.length} Leads`
            }
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'active' && canManageLeads && (
            <>
              <CsvImportDialog />
              {isSuperadmin && (
                <>
                  <AddressEnrichment />
                  <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                    <Download className="h-4 w-4" /> Export
                  </button>
                </>
              )}
              <AddLeadDialog />
            </>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl border bg-card p-1 shadow-sm">
        {tabs.filter(tab => (!tab.superadminOnly || isSuperadmin) && (!tab.hideForReview || !isReviewRole)).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <Badge variant={activeTab === tab.key ? 'secondary' : 'outline'} className="ml-1 text-[10px] h-5 px-1.5">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Duplicates Tab */}
      {activeTab === 'duplicates' && <DuplicateLeads />}

      {/* Table Tabs */}
      {activeTab !== 'duplicates' && (
        <>
          {isSuperadmin && !isReviewRole && <BulkActionsBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, E-Mail, Ort oder PLZ..."
              className="h-9 w-56 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {!isReviewRole && (
              <>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as LeadStatus | '')} className={selectCls}>
                  <option value="">Alle Status</option>
                  {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className={selectCls}>
                  <option value="">Alle Quellen</option>
                  {leadSources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                {!isRestricted && (
                  <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className={selectCls}>
                    <option value="">Alle Agenturen</option>
                    {visibleAgencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
                <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className={selectCls}>
                  <option value="">{isTeamleiter ? 'Nur ich' : isAgencyScoped ? 'Mein Team' : 'Alle Mitarbeiter'}</option>
                  {visibleEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select value={cantonFilter} onChange={e => setCantonFilter(e.target.value)} className={selectCls}>
                  <option value="">Alle Kantone</option>
                  {cantons.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select>
              </>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(selectCls, 'inline-flex items-center gap-2', !dateFrom && 'text-muted-foreground')}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, 'dd.MM.yyyy') : 'Von'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
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
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                <X className="h-3 w-3" /> Zurücksetzen
              </button>
            )}
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  {isSuperadmin && !isReviewRole && (
                    <th className="px-3 py-3 w-10">
                      <Checkbox
                        checked={paginatedLeads.length > 0 && selectedIds.length === paginatedLeads.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-5 py-3 font-medium">Name</th>
                  {!isControlling && <th className="px-5 py-3 font-medium">Telefon</th>}
                  <th className="px-5 py-3 font-medium">Ort</th>
                  <th className="px-5 py-3 font-medium">Kanton</th>
                  <th className="px-5 py-3 font-medium">Quelle</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Agentur</th>
                  <th className="px-5 py-3 font-medium">Zugewiesen</th>
                  <th className="px-5 py-3 font-medium">Datum</th>
                  {!isReviewRole && <th className="px-5 py-3 font-medium">Aktionen</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.length === 0 && (
                  <tr>
                    <td colSpan={isSuperadmin && !isReviewRole ? 11 : isReviewRole ? 9 : 10} className="px-5 py-12 text-center text-muted-foreground">
                      {activeTab === 'archived' ? 'Keine archivierten Leads vorhanden.' : activeTab === 'deleted' ? 'Keine gelöschten Leads vorhanden.' : activeTab === 'demo' ? 'Keine Demo-/Muster-Leads vorhanden.' : 'Keine Leads gefunden.'}
                    </td>
                  </tr>
                )}
                {paginatedLeads.map(lead => {
                  const emp = employees.find(e => e.id === lead.employeeId);
                  const agency = agencies.find(a => a.id === lead.agencyId);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => markLeadViewed(lead)}
                      className={cn(
                        "cursor-pointer border-b last:border-0 hover:bg-muted/50 transition-colors",
                        selectedIds.includes(lead.id) && "bg-primary/5"
                      )}
                    >
                      {isSuperadmin && !isReviewRole && (
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                          />
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={cn(
                            "shrink-0 text-lg font-bold",
                            lead.salutation === 'Frau' ? "text-pink-500 dark:text-pink-400" : "text-blue-500 dark:text-blue-400"
                          )}>
                            {lead.salutation === 'Frau' ? '♀' : '♂'}
                          </span>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.position}</p>
                          </div>
                          {lead.status === 'new' && !lead.isRead && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Neu
                            </span>
                          )}
                          {lead.isDemo && (
                            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              Demo
                            </span>
                          )}
                          {(() => {
                            const dup = duplicateInfo.get(lead.id);
                            if (!dup) return null;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      onClick={e => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive"
                                    >
                                      <GitMerge className="h-3 w-3" />
                                      Duplikat {dup.confidence}%
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-semibold">{dup.reason}</p>
                                    <p className="text-xs mt-1">Ähnlich zu: {dup.partners.filter(Boolean).join(', ') || '—'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </div>
                      </td>
                      {!isControlling && <td className="px-5 py-3 text-muted-foreground text-xs">{lead.phone}</td>}
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {lead.plz} {lead.city}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">{lead.cantonCode}</span>
                      </td>
                      <td className="px-5 py-3"><SourceBadge source={lead.source} /></td>
                      <td className="px-5 py-3"><LeadStatusBadge status={lead.status} /></td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: agency?.color || '#6B7280' }} />
                          {agency?.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{emp?.name}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString('de-CH')}</td>
                      {!isReviewRole && (
                        <td className="px-5 py-3">
                          <LeadActions lead={lead} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between border-t px-5 py-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Zeilen pro Seite:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    const v = e.target.value;
                    setPageSize(v === 'all' ? 'all' : Number(v) as PageSize);
                  }}
                  className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {PAGE_SIZES.map(ps => (
                    <option key={ps.label} value={ps.value}>{ps.label}</option>
                  ))}
                </select>
                <span>
                  {pageSize === 'all'
                    ? `${totalItems} Einträge`
                    : `${Math.min((safePage - 1) * pageSize + 1, totalItems)}–${Math.min(safePage * pageSize, totalItems)} von ${totalItems}`
                  }
                </span>
              </div>

              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-sm disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {getPageNumbers().map((p, i) =>
                    p === 'ellipsis' ? (
                      <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
                          safePage === p
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border bg-background hover:bg-muted'
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-sm disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <LeadDetailSheet />
    </div>
  );
}
