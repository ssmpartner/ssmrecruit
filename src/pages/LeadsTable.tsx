import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Filter, MapPin, CalendarIcon, X, Archive, Trash2, Copy, ChevronLeft, ChevronRight, GitMerge, Eye, FileText, LayoutList, KanbanSquare, Settings2, Contact, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { type LeadStatus, type LeadLifecycle, statusConfig, sourceConfig } from '@/lib/mock-data';
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
import ImportExportDialog from '@/components/ImportExportDialog';
import BulkActionsBar from '@/components/BulkActionsBar';
import AddressEnrichment from '@/components/AddressEnrichment';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { detectDuplicates } from '@/lib/duplicate-detection';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { supabase } from '@/integrations/supabase/client';
import { CONTRACT_APPOINTMENT_TITLE } from '@/components/ContractAppointmentPanel';

type RoleUser = { user_id: string; display_name: string | null; avatar_url: string | null };

// Farbwelt der Kanban-Spalten (analog zur Pipeline-Ansicht)
const KANBAN_THEME: Record<LeadStatus, { head: string; accent: string; text: string; card: string; dot: string }> = {
  new:                   { head: 'bg-blue-50 dark:bg-blue-950/40',       accent: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-300',       card: 'border-blue-200 dark:border-blue-900',       dot: 'bg-blue-500' },
  contacted:             { head: 'bg-amber-50 dark:bg-amber-950/40',     accent: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-300',     card: 'border-amber-200 dark:border-amber-900',     dot: 'bg-amber-500' },
  callback:              { head: 'bg-yellow-50 dark:bg-yellow-950/40',   accent: 'bg-yellow-500',  text: 'text-yellow-700 dark:text-yellow-300',   card: 'border-yellow-200 dark:border-yellow-900',   dot: 'bg-yellow-500' },
  not_reached:           { head: 'bg-orange-50 dark:bg-orange-950/40',   accent: 'bg-orange-500',  text: 'text-orange-700 dark:text-orange-300',   card: 'border-orange-200 dark:border-orange-900',   dot: 'bg-orange-500' },
  not_interested:        { head: 'bg-red-50 dark:bg-red-950/40',         accent: 'bg-red-500',     text: 'text-red-700 dark:text-red-300',         card: 'border-red-200 dark:border-red-900',         dot: 'bg-red-500' },
  no_need:               { head: 'bg-rose-50 dark:bg-rose-950/40',       accent: 'bg-rose-500',    text: 'text-rose-700 dark:text-rose-300',       card: 'border-rose-200 dark:border-rose-900',       dot: 'bg-rose-500' },
  not_suitable:          { head: 'bg-slate-50 dark:bg-slate-900/60',     accent: 'bg-slate-500',   text: 'text-slate-700 dark:text-slate-300',     card: 'border-slate-200 dark:border-slate-800',     dot: 'bg-slate-500' },
  internal:              { head: 'bg-indigo-50 dark:bg-indigo-950/40',   accent: 'bg-indigo-500',  text: 'text-indigo-700 dark:text-indigo-300',   card: 'border-indigo-200 dark:border-indigo-900',   dot: 'bg-indigo-500' },
  appointment:           { head: 'bg-emerald-50 dark:bg-emerald-950/40', accent: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', card: 'border-emerald-200 dark:border-emerald-900', dot: 'bg-emerald-500' },
  follow_up:             { head: 'bg-violet-50 dark:bg-violet-950/40',   accent: 'bg-violet-500',  text: 'text-violet-700 dark:text-violet-300',   card: 'border-violet-200 dark:border-violet-900',   dot: 'bg-violet-500' },
  ready_for_controlling: { head: 'bg-cyan-50 dark:bg-cyan-950/40',       accent: 'bg-cyan-500',    text: 'text-cyan-700 dark:text-cyan-300',       card: 'border-cyan-200 dark:border-cyan-900',       dot: 'bg-cyan-500' },
  controlling_approved:  { head: 'bg-cyan-100 dark:bg-cyan-900/50',      accent: 'bg-cyan-600',    text: 'text-cyan-800 dark:text-cyan-200',       card: 'border-cyan-300 dark:border-cyan-800',       dot: 'bg-cyan-600' },
  management_review:     { head: 'bg-purple-50 dark:bg-purple-950/40',   accent: 'bg-purple-500',  text: 'text-purple-700 dark:text-purple-300',   card: 'border-purple-200 dark:border-purple-900',   dot: 'bg-purple-500' },
  management_approved:   { head: 'bg-purple-100 dark:bg-purple-900/50',  accent: 'bg-purple-600',  text: 'text-purple-800 dark:text-purple-200',   card: 'border-purple-300 dark:border-purple-800',   dot: 'bg-purple-600' },
  hr_processing:         { head: 'bg-teal-50 dark:bg-teal-950/40',       accent: 'bg-teal-500',    text: 'text-teal-700 dark:text-teal-300',       card: 'border-teal-200 dark:border-teal-900',       dot: 'bg-teal-500' },
  hr_pending:            { head: 'bg-amber-100 dark:bg-amber-900/50',    accent: 'bg-amber-600',   text: 'text-amber-800 dark:text-amber-200',     card: 'border-amber-300 dark:border-amber-800',     dot: 'bg-amber-600' },
  hired:                 { head: 'bg-green-50 dark:bg-green-950/40',     accent: 'bg-green-500',   text: 'text-green-700 dark:text-green-300',     card: 'border-green-200 dark:border-green-900',     dot: 'bg-green-500' },
  rejected:              { head: 'bg-red-50 dark:bg-red-950/40',        accent: 'bg-destructive', text: 'text-red-700 dark:text-red-300',         card: 'border-red-200 dark:border-red-900',         dot: 'bg-destructive' },
};

const ALL_STATUSES = Object.keys(statusConfig) as LeadStatus[];
const KANBAN_STATUS_KEY = 'leads-kanban-statuses';
const DEFAULT_KANBAN_STATUSES: LeadStatus[] = ['new', 'contacted', 'callback', 'not_reached', 'appointment', 'follow_up', 'ready_for_controlling', 'hr_processing', 'hired'];

const initialsOf = (n?: string | null) =>
  (n || '?').split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

function ApprovalAvatar({ u, state, roleLabel }: { u: RoleUser; state: 'approved' | 'rejected' | 'pending'; roleLabel: string }) {
  const ring = state === 'approved' ? 'ring-emerald-500' : state === 'rejected' ? 'ring-destructive' : 'ring-border';
  const stateLabel = state === 'approved' ? 'freigegeben' : state === 'rejected' ? 'abgelehnt' : 'ausstehend';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span onClick={e => e.stopPropagation()} className="relative inline-flex shrink-0">
            {u.avatar_url ? (
              <img
                src={u.avatar_url}
                alt={u.display_name || ''}
                className={cn('h-8 w-8 rounded-full object-cover ring-2', ring, state === 'pending' && 'opacity-60')}
              />
            ) : (
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary ring-2', ring, state === 'pending' && 'opacity-60')}>
                {initialsOf(u.display_name)}
              </span>
            )}
            {state !== 'pending' && (
              <span className={cn(
                'absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card text-[8px] font-bold text-white',
                state === 'approved' ? 'bg-emerald-500' : 'bg-destructive',
              )}>
                {state === 'approved' ? '✓' : '✕'}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{roleLabel}: {u.display_name || 'Unbenannt'} – {stateLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ApprovalGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col items-start gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

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
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'controlling_query' | ''>('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter per URL übernehmen (z.B. Rückfragen-Kachel im Dashboard)
  useEffect(() => {
    const f = searchParams.get('filter');
    if (f === 'controlling_query') {
      setStatusFilter('controlling_query');
      searchParams.delete('filter');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sourceFilter, setSourceFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [cantonFilter, setCantonFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  // Mitarbeiterliste zusätzlich auf die gewählte Agentur einschränken
  const employeeOptions = useMemo(
    () => (agencyFilter ? visibleEmployees.filter(e => e.agencyId === agencyFilter) : visibleEmployees),
    [visibleEmployees, agencyFilter],
  );
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [enrichmentOpen, setEnrichmentOpen] = useState(false);
  const [kanbanStatuses, setKanbanStatuses] = useState<LeadStatus[]>(() => {
    try {
      const raw = localStorage.getItem(KANBAN_STATUS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LeadStatus[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(s => ALL_STATUSES.includes(s));
      }
    } catch { /* ignore */ }
    return DEFAULT_KANBAN_STATUSES;
  });
  const toggleKanbanStatus = (status: LeadStatus) => {
    setKanbanStatuses(prev => {
      const next = prev.includes(status) ? prev.filter(s => s !== status) : [...ALL_STATUSES.filter(s => prev.includes(s) || s === status)];
      try { localStorage.setItem(KANBAN_STATUS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const setKanbanStatusPreset = (next: LeadStatus[]) => {
    setKanbanStatuses(next);
    try { localStorage.setItem(KANBAN_STATUS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

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
    let filtered = leads.filter(l => l.lifecycle === lifecycle && !l.isDemo);


    // Role-based status filtering for review roles
    if (isControlling) {
      // Bei offener Rückfrage liegt der Lead beim Mitarbeiter → nicht in der Controlling-Queue
      filtered = filtered.filter(l => l.status === 'ready_for_controlling' && !l.controllingQueryOpen);
    } else if (isGeschaeftsleitung) {
      filtered = filtered.filter(l => ['controlling_approved','management_review'].includes(l.status));
    } else if (isHR) {
      filtered = filtered.filter(l => ['management_approved','hr_processing','hr_pending'].includes(l.status));
    }

    return filtered;
  }, [leads, activeTab, isControlling, isGeschaeftsleitung, isHR]);

  const filtered = useMemo(() => {
    return lifecycleLeads.filter(l => {
      if (statusFilter === 'controlling_query') { if (!l.controllingQueryOpen) return false; } else if (statusFilter && l.status !== statusFilter) return false;
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
    for (const pair of detectDuplicates(scanLeads, { limit: Infinity })) {
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

  // === HR-Ansicht: Vertragstermin + Freigaben (Controlling / GL / HR) ===
  const [hrContractApts, setHrContractApts] = useState<Map<string, { date: string; time: string | null; proposed?: boolean }>>(new Map());
  const [hrCtrlApprovers, setHrCtrlApprovers] = useState<Map<string, string>>(new Map());
  const [hrGlApprovals, setHrGlApprovals] = useState<Map<string, { user_id: string; decision: string }[]>>(new Map());
  const [roleUsers, setRoleUsers] = useState<{ controlling: RoleUser[]; gl: RoleUser[]; hr: RoleUser[] }>({ controlling: [], gl: [], hr: [] });

  useEffect(() => {
    if (!isHR) return;
    let cancelled = false;
    (async () => {
      const [aptRes, sugRes, wizRes, mgmtRes, ctrlU, glU, hrU] = await Promise.all([
        supabase.from('appointments').select('lead_id,date,time,title').eq('title', CONTRACT_APPOINTMENT_TITLE),
        supabase.from('appointment_suggestions').select('lead_id,suggested_date,suggested_time,status').eq('purpose', 'contract_signing'),
        supabase.from('status_wizard_results').select('lead_id,completed_by,created_at').eq('wizard_type', 'controlling_approval'),
        supabase.from('lead_management_approvals').select('lead_id,user_id,decision'),
        supabase.rpc('get_role_users', { _role: 'controlling' }),
        supabase.rpc('get_role_users', { _role: 'geschaeftsleitung' }),
        supabase.rpc('get_role_users', { _role: 'hr' }),
      ]);
      if (cancelled) return;
      const apts = new Map<string, { date: string; time: string | null; proposed?: boolean }>();
      for (const row of (sugRes.data ?? []) as any[]) {
        if (row.lead_id && row.status !== 'rejected' && !apts.has(row.lead_id)) {
          apts.set(row.lead_id, { date: row.suggested_date, time: row.suggested_time, proposed: true });
        }
      }
      for (const row of (aptRes.data ?? []) as any[]) {
        if (row.lead_id) apts.set(row.lead_id, { date: row.date, time: row.time });
      }
      const ctrl = new Map<string, string>();
      for (const row of (wizRes.data ?? []) as any[]) {
        if (row.lead_id && row.completed_by && !ctrl.has(row.lead_id)) ctrl.set(row.lead_id, row.completed_by);
      }
      const gl = new Map<string, { user_id: string; decision: string }[]>();
      for (const row of (mgmtRes.data ?? []) as any[]) {
        const list = gl.get(row.lead_id) ?? [];
        list.push({ user_id: row.user_id, decision: row.decision });
        gl.set(row.lead_id, list);
      }
      setHrContractApts(apts);
      setHrCtrlApprovers(ctrl);
      setHrGlApprovals(gl);
      setRoleUsers({
        controlling: (ctrlU.data as RoleUser[]) ?? [],
        gl: (glU.data as RoleUser[]) ?? [],
        hr: (hrU.data as RoleUser[]) ?? [],
      });
    })();
    return () => { cancelled = true; };
  }, [isHR]);

  // Controlling-Freigabe (wer hat freigegeben) – für alle Rollen in der Statusspalte sichtbar
  const [ctrlApprovers, setCtrlApprovers] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('status_wizard_results')
        .select('lead_id,completed_by,created_at')
        .eq('wizard_type', 'controlling_approval')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const m = new Map<string, string>();
      for (const row of (data ?? []) as any[]) {
        if (row.lead_id && row.completed_by && !m.has(row.lead_id)) m.set(row.lead_id, row.completed_by);
      }
      setCtrlApprovers(m);
    })();
    return () => { cancelled = true; };
  }, [leads.length]);

  // === Insights-R4-Dokument (Controlling & HR): ansehen + herunterladen ===
  type R4Doc = { id: string; file_name: string; file_path: string };
  const [r4Docs, setR4Docs] = useState<Map<string, R4Doc>>(new Map());
  const [r4Busy, setR4Busy] = useState<string | null>(null);
  const showR4Column = isControlling;

  useEffect(() => {
    if (!showR4Column) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('document_uploads')
        .select('id,lead_id,file_name,file_path,file_type,uploaded_at')
        .order('uploaded_at', { ascending: false });
      if (cancelled) return;
      const map = new Map<string, R4Doc>();
      for (const row of (data ?? []) as any[]) {
        const isR4 = (row.file_type || '').toLowerCase() === 'insight_r4' || /insight.*r4/i.test(row.file_name || '');
        if (isR4 && row.lead_id && row.file_path && !map.has(row.lead_id)) {
          map.set(row.lead_id, { id: row.id, file_name: row.file_name, file_path: row.file_path });
        }
      }
      setR4Docs(map);
    })();
    return () => { cancelled = true; };
  }, [showR4Column]);

  const [r4Viewer, setR4Viewer] = useState<{ url: string; name: string } | null>(null);

  const viewR4 = useCallback(async (doc: R4Doc) => {
    setR4Busy(doc.id);
    const { data, error } = await supabase.storage.from('lead-documents').createSignedUrl(doc.file_path, 3600);
    setR4Busy(null);
    if (error || !data?.signedUrl) return;
    setR4Viewer({ url: data.signedUrl, name: doc.file_name || 'Insights R4' });
  }, []);

  const downloadR4 = useCallback(async (doc: R4Doc) => {
    setR4Busy(doc.id);
    const { data, error } = await supabase.storage.from('lead-documents').download(doc.file_path);
    setR4Busy(null);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = doc.file_name || 'insights-r4.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }, []);

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
    if (isControlling) items = items.filter(l => l.status === 'ready_for_controlling' && !l.controllingQueryOpen);
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
    { key: 'duplicates', label: 'Duplikate', icon: <Copy className="h-3.5 w-3.5" />, count: 0, hideForReview: true },
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
        <div className="flex items-center gap-3">
          <Contact className="h-8 w-8 text-primary" strokeWidth={2} />
          <h1 className="text-2xl font-bold tracking-tight">{isReviewRole ? 'Kandidaten' : 'Leads'}</h1>
        </div>
        <div className="flex gap-2">
          {activeTab === 'active' && canManageLeads && (
            <>
              <ImportExportDialog
                open={importExportOpen}
                onOpenChange={setImportExportOpen}
                onExport={exportCSV}
                onOpenImport={() => setCsvImportOpen(true)}
                onOpenEnrichment={() => setEnrichmentOpen(true)}
                showExport={isSuperadmin}
                showEnrichment={isSuperadmin}
              />
              <CsvImportDialog open={csvImportOpen} onOpenChange={setCsvImportOpen} />
              {isSuperadmin && (
                <AddressEnrichment open={enrichmentOpen} onOpenChange={setEnrichmentOpen} />
              )}
              <AddLeadDialog />
            </>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm">
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
        <span className="ml-auto pr-2 text-xs text-muted-foreground whitespace-nowrap">
          {isReviewRole
            ? `${filtered.length} Lead${filtered.length !== 1 ? 's' : ''} zur Bearbeitung`
            : activeTab === 'duplicates' ? 'KI-basierte Duplikat-Erkennung'
            : activeTab === 'demo' ? `${filtered.length} Demo-/Muster-Lead${filtered.length !== 1 ? 's' : ''}`
            : `${filtered.length} von ${lifecycleLeads.length} Leads`
          }
        </span>
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setViewMode('list')}
            title="Listenansicht"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutList className="h-3.5 w-3.5" /> Liste
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            title="Kanban-Ansicht"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              viewMode === 'kanban' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <KanbanSquare className="h-3.5 w-3.5" /> Kanban
          </button>
          {viewMode === 'kanban' && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  title="Spalten / Status auswählen"
                  className="flex items-center rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold">Angezeigte Status</p>
                  <div className="flex gap-1">
                    <button onClick={() => setKanbanStatusPreset(ALL_STATUSES)} className="rounded-md border px-2 py-0.5 text-[10px] hover:bg-muted">Alle</button>
                    <button onClick={() => setKanbanStatusPreset(DEFAULT_KANBAN_STATUSES)} className="rounded-md border px-2 py-0.5 text-[10px] hover:bg-muted">Standard</button>
                  </div>
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {ALL_STATUSES.map(s => (
                    <label key={s} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted">
                      <Checkbox checked={kanbanStatuses.includes(s)} onCheckedChange={() => toggleKanbanStatus(s)} />
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', KANBAN_THEME[s].dot)} />
                      <span className="truncate text-xs">{statusConfig[s].label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
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
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as LeadStatus | 'controlling_query' | '')} className={cn(selectCls, statusFilter === 'controlling_query' && 'border-red-300 text-red-700')}>
                  <option value="">Alle Status</option>
                  {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  <option value="controlling_query">Rückfrage</option>
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
                  {employeeOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
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

          {viewMode === 'list' && (
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
                  {!isControlling && !isHR && <th className="px-5 py-3 font-medium">Telefon</th>}
                  {isHR ? (
                    <>
                      <th className="px-5 py-3 font-medium">Vertragstermin</th>
                      <th className="px-5 py-3 font-medium">Freigaben</th>
                    </>
                  ) : (
                    <th className="px-5 py-3 font-medium">Ort</th>
                  )}
                  {isHR ? (
                    <th className="px-5 py-3 font-medium">Wunschposition</th>
                  ) : (
                    <th className="px-5 py-3 font-medium">Kanton</th>
                  )}
                  {showR4Column && <th className="px-5 py-3 font-medium">Insights R4</th>}
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
                    <td colSpan={(isSuperadmin && !isReviewRole ? 11 : isReviewRole ? 9 : 10) + (showR4Column ? 1 : 0)} className="px-5 py-12 text-center text-muted-foreground">
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
                      {!isControlling && !isHR && <td className="px-5 py-3 text-muted-foreground text-xs">{lead.phone}</td>}
                      {isHR ? (
                        <>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {(() => {
                              const apt = hrContractApts.get(lead.id);
                              if (!apt) {
                                return (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
                                    <CalendarIcon className="h-3 w-3" /> Noch nicht festgelegt
                                  </span>
                                );
                              }
                              return (
                                <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold', apt.proposed ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800')}>
                                  <CalendarIcon className="h-3.5 w-3.5" />
                                  {new Date(apt.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  {apt.time && <span className="font-normal">{apt.time.slice(0, 5)} Uhr</span>}
                                  {apt.proposed && <span className="font-normal">(Vorschlag)</span>}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-start gap-4 whitespace-nowrap">
                              <ApprovalGroup label="Controlling">
                                {(() => {
                                  const by = hrCtrlApprovers.get(lead.id) || null;
                                  const norm = (s?: string | null) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
                                  const matched = by
                                    ? roleUsers.controlling.find(u => u.user_id === by || norm(u.display_name) === norm(by))
                                    : undefined;
                                  const avatars = roleUsers.controlling.map(u => (
                                    <ApprovalAvatar
                                      key={`c-${u.user_id}`}
                                      u={u}
                                      roleLabel="Controlling"
                                      state={matched && matched.user_id === u.user_id ? 'approved' : 'pending'}
                                    />
                                  ));
                                  // Freigabe wurde von einer Person ausserhalb der Controlling-Liste erteilt
                                  if (by && !matched) {
                                    avatars.unshift(
                                      <ApprovalAvatar
                                        key="c-ext"
                                        u={{ user_id: 'ext', display_name: by, avatar_url: null }}
                                        roleLabel="Controlling-Freigabe"
                                        state="approved"
                                      />,
                                    );
                                  }
                                  return avatars;
                                })()}
                              </ApprovalGroup>
                              <ApprovalGroup label="GL">
                                {roleUsers.gl.map(u => {
                                  const dec = (hrGlApprovals.get(lead.id) ?? []).find(a => a.user_id === u.user_id);
                                  return (
                                    <ApprovalAvatar
                                      key={`g-${u.user_id}`}
                                      u={u}
                                      roleLabel="Geschäftsleitung"
                                      state={dec?.decision === 'approved' ? 'approved' : dec?.decision === 'rejected' ? 'rejected' : 'pending'}
                                    />
                                  );
                                })}
                              </ApprovalGroup>
                              <ApprovalGroup label="HR">
                                {roleUsers.hr.map(u => (
                                  <ApprovalAvatar
                                    key={`h-${u.user_id}`}
                                    u={u}
                                    roleLabel="HR"
                                    state={lead.status === 'hired' ? 'approved' : 'pending'}
                                  />
                                ))}
                              </ApprovalGroup>
                            </div>
                          </td>
                        </>
                      ) : (
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {lead.plz} {lead.city}
                          </span>
                        </td>
                      )}
                      {isHR ? (
                        <td className="px-5 py-3">
                          <span className={cn(
                            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                            lead.position
                              ? 'bg-primary/10 text-primary'
                              : 'border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                          )}>
                            {lead.position || 'Keine Angabe'}
                          </span>
                        </td>
                      ) : (
                        <td className="px-5 py-3">
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">{lead.cantonCode}</span>
                        </td>
                      )}
                      {showR4Column && (() => {
                        const doc = r4Docs.get(lead.id);
                        return (
                          <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                            {doc ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => viewR4(doc)}
                                  disabled={r4Busy === doc.id}
                                  title={`${doc.file_name} ansehen`}
                                  className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300"
                                >
                                  <Eye className="h-3 w-3" /> Ansehen
                                </button>
                                <button
                                  onClick={() => downloadR4(doc)}
                                  disabled={r4Busy === doc.id}
                                  title={`${doc.file_name} herunterladen`}
                                  className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
                                >
                                  <Download className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <FileText className="h-3 w-3" /> Nicht vorhanden
                              </span>
                            )}
                          </td>
                        );
                      })()}
                      <td className="px-5 py-3"><SourceBadge source={lead.source} /></td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span title={lead.controllingQueryOpen ? (lead.controllingQueryText || 'Rückfrage vom Controlling') : undefined}>
                            <LeadStatusBadge status={lead.status} queryOpen={lead.controllingQueryOpen} />
                          </span>
                          {!lead.controllingQueryOpen && ctrlApprovers.get(lead.id) && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                              title={`Controlling-Freigabe durch ${ctrlApprovers.get(lead.id)}`}
                            >
                              <CheckCircle2 className="h-3 w-3" /> {ctrlApprovers.get(lead.id)}
                            </span>
                          )}
                        </div>
                      </td>

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
          )}

          {viewMode === 'kanban' && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {kanbanStatuses.length === 0 && (
                <p className="py-8 text-sm text-muted-foreground">Keine Status ausgewählt – über das Zahnrad Spalten einblenden.</p>
              )}
              {ALL_STATUSES.filter(s => kanbanStatuses.includes(s)).map(status => {
                const col = filtered.filter(l => l.status === status);
                const cfg = statusConfig[status];
                const th = KANBAN_THEME[status];
                return (
                  <div key={status} className="w-64 shrink-0 self-start overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                      <span className={cn('truncate text-xs font-semibold', th.text)}>{cfg.label}</span>
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">{col.length}</span>
                    </div>
                    <div className="max-h-[60vh] space-y-2 overflow-y-auto p-2">
                      {col.length === 0 && (
                        <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">Keine Leads</p>
                      )}
                      {col.map(lead => {
                        const isSelected = selectedIds.includes(lead.id);
                        const emp = employees.find(e => e.id === lead.employeeId);
                        const agency = agencies.find(a => a.id === lead.agencyId);
                        return (
                          <div
                            key={lead.id}
                            onClick={() => markLeadViewed(lead)}
                            style={{ '--agency': agency?.color || 'var(--primary)' } as React.CSSProperties}
                            className={cn(
                              'group relative w-full cursor-pointer rounded-lg border bg-background p-2.5 text-left transition-colors hover:border-[color-mix(in_srgb,var(--agency)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--agency)_10%,var(--background))]',
                              isSelected && 'border-primary bg-primary/5'
                            )}
                          >
                            <div
                              className={cn(
                                'absolute right-2 top-2 z-10 transition-opacity',
                                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              )}
                              onClick={e => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(lead.id)}
                                aria-label={`${lead.name} auswählen`}
                                className="bg-background"
                              />
                            </div>
                            <div className="flex items-center gap-2 pr-6">
                              <span className="truncate text-xs font-medium">{lead.name}</span>
                              {lead.controllingQueryOpen && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title="Rückfrage offen" />
                              )}
                            </div>
                            {(lead.city || lead.plz) && (
                              <div className="mt-1 truncate text-[11px] text-muted-foreground">{lead.plz} {lead.city}</div>
                            )}
                            <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                              <span className="flex min-w-0 items-center gap-1.5">
                                {agency && (
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                                    style={{ backgroundColor: agency.color }}
                                    title={agency.name}
                                  />
                                )}
                                <span className="truncate">{emp?.name || '–'}</span>
                              </span>
                              <span className="shrink-0">{new Date(lead.createdAt).toLocaleDateString('de-CH')}</span>
                            </div>
                            <div className="mt-2 hidden space-y-1 border-t pt-2 text-[10px] text-muted-foreground group-hover:block">
                              {lead.position && <div className="truncate"><span className="font-medium text-foreground">Position:</span> {lead.position}</div>}
                              {lead.phone && <div className="truncate"><span className="font-medium text-foreground">Tel:</span> {lead.phone}</div>}
                              {lead.email && <div className="truncate"><span className="font-medium text-foreground">E-Mail:</span> {lead.email}</div>}
                              {agency && <div className="truncate"><span className="font-medium text-foreground">Agentur:</span> {agency.name}</div>}
                              {lead.source && <div className="truncate"><span className="font-medium text-foreground">Quelle:</span> {sourceConfig[lead.source]?.label || lead.source}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <LeadDetailSheet />

      <Dialog open={!!r4Viewer} onOpenChange={open => { if (!open) setR4Viewer(null); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b shrink-0">
            <DialogTitle className="text-sm font-semibold truncate pr-8">
              {r4Viewer?.name}
            </DialogTitle>
          </DialogHeader>
          {r4Viewer && (
            <iframe
              src={r4Viewer.url}
              title={r4Viewer.name}
              className="flex-1 w-full bg-background"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
