import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import ApprovalLeadView from './ApprovalLeadView';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { type ActivityEntry } from '@/context/leads-context';
import { useLeads } from '@/context/useLeads';
import { statusConfig, getAllowedNextStatuses, type LeadStatus } from '@/lib/mock-data';
import { lookupPlz, searchPlz, cantons, type SwissLocation } from '@/lib/swiss-plz';
import LeadStatusBadge from './LeadStatusBadge';
import SourceBadge from './SourceBadge';
import {
  Save, Clock, UserCog, Edit3, MessageSquare, ArrowRight, MapPin, User,
  FileText, Activity, CalendarIcon, Phone, Video, Building2, Trash2, Plus,
  Link2, Send, Copy, ChevronLeft, ChevronRight, X, Workflow, Brain, Upload, EyeOff, Eye, Shield, CheckCircle2, AlertTriangle, GitMerge
} from 'lucide-react';
import { detectDuplicates, type DuplicatePair } from '@/lib/duplicate-detection';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import VideoCallDialog from './VideoCallDialog';
import ProcessStepper from './ProcessStepper';
import LeadActionPanel from './LeadActionPanel';
import LeadFlowTimeline from './LeadFlowTimeline';
import LeadInsightsTab from './LeadInsightsTab';
import LeadDocumentsTab from './LeadDocumentsTab';
import AddressAutocomplete, { type AddressSuggestion } from './AddressAutocomplete';

const statusKeys: LeadStatus[] = ['new', 'contacted', 'appointment', 'follow_up', 'hired', 'rejected'];

const activityIcon: Record<ActivityEntry['type'], typeof Clock> = {
  status_change: ArrowRight,
  assignment: UserCog,
  edit: Edit3,
  note: MessageSquare,
  appointment: CalendarIcon,
};

const appointmentTypeConfig = {
  phone: { label: 'Telefon', icon: Phone },
  video: { label: 'Video-Call', icon: Video },
  onsite: { label: 'Vor Ort', icon: Building2 },
} as const;

export default function LeadDetailSheet() {
  const { selectedLead, setSelectedLead, updateLead, addActivity, activities, employees, agencies, appointments, addAppointment, removeAppointment, sendAppointmentNotification, appointmentSettings, leads, leadSources, mergeLead } = useLeads();
  const { toast } = useToast();
  const { isSuperadmin, profile, isReviewRole, isControlling, isGeschaeftsleitung, isHR } = useAuth();
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [plzSuggestions, setPlzSuggestions] = useState<SwissLocation[]>([]);
  const [showPlzDropdown, setShowPlzDropdown] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', salutation: '', email: '', phone: '', position: '', address: '', plz: '', city: '', canton: '', cantonCode: '', notes: '', source: '' as string, createdAt: '', altEmail: '', altPhone: '' });
  const [showAptForm, setShowAptForm] = useState(false);
  const [aptForm, setAptForm] = useState({ title: '', date: undefined as Date | undefined, time: '09:00', duration: 30, type: 'phone' as 'phone' | 'video' | 'onsite', notes: '' });
  const [activeCallAptId, setActiveCallAptId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'info' | 'appointments' | 'activity' | 'flow' | 'status' | 'insights' | 'documents'>('info');
  const [confirmReset, setConfirmReset] = useState(false);
  const leadIsNew = selectedLead?.status === 'new';
  const isMarkedViewed = selectedLead?.isRead ?? false;

  // Freeze logic: after Controlling decision, employees lose access to phone/email/docs and lead is read-only
  const isFrozenForEmployee = !isSuperadmin && !isReviewRole && selectedLead != null &&
    (selectedLead.status === 'controlling_approved' || selectedLead.status === 'rejected' ||
     selectedLead.status === 'management_review' || selectedLead.status === 'hr_processing' || selectedLead.status === 'hired');

  // Load controlling wizard result for leads that went through controlling (scoring + reason)
  const hasControllingStatus = selectedLead != null &&
    ['controlling_approved', 'rejected', 'management_review', 'hr_processing', 'hired'].includes(selectedLead.status);
  const [controllingResult, setControllingResult] = useState<{ scoring?: string; reason?: string; action?: string } | null>(null);
  useEffect(() => {
    if (!selectedLead || !hasControllingStatus) { setControllingResult(null); return; }
    supabase.from('status_wizard_results').select('answers, feedback, wizard_type')
      .eq('lead_id', selectedLead.id).eq('wizard_type', 'controlling_approval')
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          const a = data[0].answers as any;
          setControllingResult({ scoring: a?.scoring, reason: data[0].feedback || a?.reject_reason, action: a?.controlling_action || a?.action });
        } else { setControllingResult(null); }
      });
  }, [selectedLead?.id, hasControllingStatus]);

  const leadAppointments = useMemo(() =>
    selectedLead ? appointments.filter(a => a.leadId === selectedLead.id).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)) : [],
    [selectedLead, appointments]
  );

  const activeLeads = useMemo(() => leads.filter(l => l.lifecycle === 'active'), [leads]);

  // Duplicate detection for current lead
  const duplicatesForLead = useMemo(() => {
    if (!selectedLead) return [];
    const otherLeads = activeLeads.filter(l => l.id !== selectedLead.id);
    if (otherLeads.length === 0) return [];
    const allForScan = [selectedLead, ...otherLeads].map(l => ({
      id: l.id, name: l.name, email: l.email, phone: l.phone,
      plz: l.plz, city: l.city, position: l.position,
    }));
    const results = detectDuplicates(allForScan);
    return results.filter(d => d.leadId1 === selectedLead.id || d.leadId2 === selectedLead.id);
  }, [selectedLead, activeLeads]);
  const currentIndex = useMemo(() => selectedLead ? activeLeads.findIndex(l => l.id === selectedLead.id) : -1, [selectedLead, activeLeads]);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < activeLeads.length - 1;

  const goToPrev = () => { if (hasPrev) { setEditing(false); setSelectedLead(activeLeads[currentIndex - 1]); } };
  const goToNext = () => { if (hasNext) { setEditing(false); setSelectedLead(activeLeads[currentIndex + 1]); } };

  const open = !!selectedLead;
  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) { setSelectedLead(null); setEditing(false); setShowPlzDropdown(false); }
  };

  const startEdit = () => {
    if (!selectedLead) return;
    setForm({
      name: selectedLead.name, salutation: selectedLead.salutation || '', email: selectedLead.email, phone: selectedLead.phone,
      position: selectedLead.position, address: selectedLead.address, plz: selectedLead.plz,
      city: selectedLead.city, canton: selectedLead.canton, cantonCode: selectedLead.cantonCode,
      notes: selectedLead.notes, source: selectedLead.source, createdAt: selectedLead.createdAt,
      altEmail: selectedLead.altEmail || '', altPhone: selectedLead.altPhone || '',
    });
    setEditing(true);
  };

  const handlePlzChange = (value: string) => {
    setForm(prev => ({ ...prev, plz: value }));
    if (value.length >= 2) {
      const results = searchPlz(value);
      setPlzSuggestions(results);
      setShowPlzDropdown(results.length > 0);
    } else { setShowPlzDropdown(false); }
    const exact = lookupPlz(value);
    if (exact) setForm(prev => ({ ...prev, city: exact.city, canton: exact.canton, cantonCode: exact.cantonCode }));
  };

  const selectPlzSuggestion = (loc: SwissLocation) => {
    setForm(prev => ({ ...prev, plz: loc.plz, city: loc.city, canton: loc.canton, cantonCode: loc.cantonCode }));
    setShowPlzDropdown(false);
  };

  const saveEdit = () => {
    if (!selectedLead) return;
    const errors: Record<string, string> = {};
    const phoneClean = form.phone.replace(/\s/g, '');
    if (phoneClean && !phoneClean.startsWith('+41') && !phoneClean.startsWith('041') && !phoneClean.startsWith('0')) errors.phone = 'Ungültige Schweizer Nummer';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Ungültige E-Mail-Adresse';
    if (!form.name.trim()) errors.name = 'Name ist erforderlich';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({ title: '⚠️ Validierungsfehler', description: Object.values(errors).join(', '), variant: 'destructive' });
      return;
    }
    setFieldErrors({});

    const changes: string[] = [];
    if (form.name !== selectedLead.name) changes.push(`Name → "${form.name}"`);
    if (form.salutation !== (selectedLead.salutation || '')) changes.push(`Anrede → "${form.salutation || '—'}"`);
    if (form.email !== selectedLead.email) changes.push(`Email → "${form.email}"`);
    if (form.phone !== selectedLead.phone) changes.push(`Telefon aktualisiert`);
    if (form.position !== selectedLead.position) changes.push(`Position → "${form.position}"`);
    if (form.address !== selectedLead.address) changes.push(`Adresse aktualisiert`);
    if (form.plz !== selectedLead.plz) changes.push(`PLZ → ${form.plz} ${form.city}`);
    if (form.notes !== selectedLead.notes) changes.push(`Notizen aktualisiert`);
    if (isSuperadmin && form.source !== selectedLead.source) changes.push(`Quelle → "${leadSources.find(s => s.id === form.source)?.label || form.source}"`);
    if (isSuperadmin && form.createdAt !== selectedLead.createdAt) changes.push(`Leaddatum geändert`);
    if (form.altEmail && form.altEmail !== (selectedLead.altEmail || '')) changes.push(`Alt. E-Mail hinzugefügt: "${form.altEmail}"`);
    if (form.altPhone && form.altPhone !== (selectedLead.altPhone || '')) changes.push(`Alt. Telefon hinzugefügt: "${form.altPhone}"`);

    const updates: Partial<Record<string, any>> = { ...form };
    if (!isSuperadmin) {
      delete updates.source;
      delete updates.createdAt;
      // Non-superadmins cannot change original email/phone/name
      delete updates.email;
      delete updates.phone;
      delete updates.name;
    }
    updateLead(selectedLead.id, updates);
    if (changes.length > 0) addActivity(selectedLead.id, 'edit', changes.join(', '));
    setEditing(false);
    toast({
      title: '✅ Gespeichert',
      description: changes.length > 0 ? `${changes.length} Änderung${changes.length > 1 ? 'en' : ''} gespeichert.` : 'Keine Änderungen.',
    });
  };

  const changeStatus = (newStatus: LeadStatus) => {
    if (!selectedLead || selectedLead.status === newStatus) return;
    updateLead(selectedLead.id, { status: newStatus });
    addActivity(selectedLead.id, 'status_change', `Status: "${statusConfig[selectedLead.status].label}" → "${statusConfig[newStatus].label}"`);
  };

  const changeEmployee = (empId: string) => {
    if (!selectedLead || selectedLead.employeeId === empId) return;
    const oldEmp = employees.find(e => e.id === selectedLead.employeeId);
    const newEmp = employees.find(e => e.id === empId);
    updateLead(selectedLead.id, { employeeId: empId });
    addActivity(selectedLead.id, 'assignment', `Zugewiesen: ${oldEmp?.name ?? '—'} → ${newEmp?.name ?? '—'}`);
  };

  const changeAgency = (agencyId: string) => {
    if (!selectedLead || selectedLead.agencyId === agencyId) return;
    const oldAg = agencies.find(a => a.id === selectedLead.agencyId);
    const newAg = agencies.find(a => a.id === agencyId);
    updateLead(selectedLead.id, { agencyId });
    addActivity(selectedLead.id, 'assignment', `Agentur: ${oldAg?.name ?? '—'} → ${newAg?.name ?? '—'}`);
  };

  const addNote = () => {
    if (!selectedLead || !noteText.trim()) return;
    addActivity(selectedLead.id, 'note', noteText.trim());
    setNoteText('');
  };

  const leadActivities = selectedLead ? activities.filter(a => a.leadId === selectedLead.id) : [];
  const inputCls = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
  const inputErr = (field: string) => fieldErrors[field] ? inputCls + ' border-destructive ring-1 ring-destructive/30' : inputCls;

  const allRightTabs = [
    { key: 'info' as const, label: 'Info', icon: User, hideForReview: false, hideWhenFrozen: false },
    { key: 'insights' as const, label: 'Insights', icon: Brain, hideForReview: false, hideWhenFrozen: false },
    { key: 'documents' as const, label: 'Dokumente', icon: Upload, hideForReview: false, hideWhenFrozen: true },
    { key: 'flow' as const, label: 'Flow', icon: Workflow, hideForReview: true, hideWhenFrozen: false },
    { key: 'appointments' as const, label: 'Termine', icon: CalendarIcon, count: leadAppointments.length, hideForReview: true, hideWhenFrozen: false },
    { key: 'activity' as const, label: 'Aktivität', icon: Activity, hideForReview: false, hideWhenFrozen: false },
    { key: 'status' as const, label: 'Status', icon: FileText, hideForReview: false, hideWhenFrozen: false },
  ];
  const rightTabs = isReviewRole
    ? allRightTabs.filter(t => !t.hideForReview)
    : isFrozenForEmployee
      ? allRightTabs.filter(t => !t.hideWhenFrozen)
      : allRightTabs;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl">
          {selectedLead && isReviewRole ? (
            <ApprovalLeadView onClose={() => onOpenChange(false)} />
          ) : selectedLead ? (
            <>
              {/* Header */}
              <div className="border-b px-5 py-3 flex items-center gap-4 shrink-0 bg-card">
                <div className="flex items-center gap-1">
                  <button onClick={goToPrev} disabled={!hasPrev}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted disabled:opacity-25 transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={goToNext} disabled={!hasNext}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted disabled:opacity-25 transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  {currentIndex >= 0 && (
                      <span className="ml-1 text-xs text-muted-foreground tabular-nums">
                       {currentIndex + 1}/{activeLeads.length}
                     </span>
                  )}
                </div>

                <div className="h-5 w-px bg-border" />

                <div className="min-w-0 flex-1 flex items-center gap-2.5">
                  <span className={cn(
                    "shrink-0 text-xl font-bold",
                    selectedLead.salutation === 'Frau'
                      ? "text-pink-500 dark:text-pink-400"
                      : "text-blue-500 dark:text-blue-400"
                  )}>
                    {selectedLead.salutation === 'Frau' ? '♀' : '♂'}
                  </span>
                  <DialogHeader className="space-y-0">
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-lg font-bold tracking-tight leading-tight">{selectedLead.name}</DialogTitle>
                      {leadIsNew && !isMarkedViewed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Neu
                        </span>
                      )}
                    </div>
                    <DialogDescription className="text-sm text-muted-foreground leading-tight">{selectedLead.position || 'Keine Position'}</DialogDescription>
                  </DialogHeader>
                </div>

                <div className="flex items-center gap-2 shrink-0 mr-8">
                  <LeadStatusBadge status={selectedLead.status} />
                  <SourceBadge source={selectedLead.source} />
                    <span className="hidden xl:inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                     <MapPin className="h-3.5 w-3.5" /> {selectedLead.plz} {selectedLead.city}
                   </span>
                </div>
              </div>

              {/* Process Stepper - more compact */}
              <div className="border-b px-5 py-1.5 shrink-0 bg-muted/30">
                <ProcessStepper currentStatus={selectedLead.status} compact />
              </div>

              {/* Two Column Layout */}
              <div className="flex-1 flex overflow-hidden">
                {/* LEFT: Actions Panel */}
                <div className="w-[360px] shrink-0 border-r overflow-y-auto">
                  {isFrozenForEmployee ? (
                    <div className="p-4 space-y-4">
                      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <EyeOff className="h-5 w-5 text-amber-700" />
                          <h3 className="text-sm font-bold text-amber-800">Lead gesperrt (Read-Only)</h3>
                        </div>
                        <p className="text-xs text-amber-700 mb-3">
                          Dieser Lead wurde vom Controlling geprüft. Telefon, E-Mail und Dokumente sind nicht mehr zugänglich.
                        </p>
                        {controllingResult && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between rounded-lg bg-background p-2.5 border">
                              <span className="text-xs text-muted-foreground">Status</span>
                              <span className={cn("text-xs font-bold",
                                controllingResult.action === 'selektionieren' ? 'text-emerald-700' : 'text-destructive'
                              )}>
                                {controllingResult.action === 'selektionieren' ? 'Selektioniert' : 'Abgelehnt'}
                              </span>
                            </div>
                            {controllingResult.scoring && (
                              <div className="flex items-center justify-between rounded-lg bg-background p-2.5 border">
                                <span className="text-xs text-muted-foreground">Scoring</span>
                                <span className="text-xs font-bold">
                                  {controllingResult.scoring === 'perfekt' ? 'Perfekt' : controllingResult.scoring === 'sehr_gut' ? 'Sehr gut' : 'Gut'}
                                </span>
                              </div>
                            )}
                            {controllingResult.reason && (
                              <div className="rounded-lg bg-background p-2.5 border">
                                <span className="text-xs text-muted-foreground block mb-1">Begründung</span>
                                <p className="text-xs">{controllingResult.reason}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                  <div className="p-4 space-y-4">
                    <LeadActionPanel
                      leadId={selectedLead.id}
                      leadName={selectedLead.name}
                      leadStatus={selectedLead.status as LeadStatus}
                      onScheduleAppointment={() => {
                        setRightTab('appointments');
                        setShowAptForm(true);
                      }}
                      onNavigateToTab={(tab) => setRightTab(tab as any)}
                    />
                    {/* Controlling Scoring & Begründung for superadmins/review roles */}
                    {controllingResult && !isFrozenForEmployee && (
                      <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-cyan-700" />
                          <h4 className="text-xs font-bold text-cyan-800">Controlling Entscheid</h4>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-background p-2.5 border">
                          <span className="text-xs text-muted-foreground">Entscheid</span>
                          <span className={cn("text-xs font-bold",
                            controllingResult.action === 'selektionieren' ? 'text-emerald-700' : 'text-destructive'
                          )}>
                            {controllingResult.action === 'selektionieren' ? 'Selektioniert' : 'Abgelehnt'}
                          </span>
                        </div>
                        {controllingResult.scoring && (
                          <div className="flex items-center justify-between rounded-lg bg-background p-2.5 border">
                            <span className="text-xs text-muted-foreground">Scoring</span>
                            <span className="text-xs font-bold">
                              {controllingResult.scoring === 'perfekt' ? 'Perfekt' : controllingResult.scoring === 'sehr_gut' ? 'Sehr gut' : 'Gut'}
                            </span>
                          </div>
                        )}
                        {controllingResult.reason && (
                          <div className="rounded-lg bg-background p-2.5 border">
                            <span className="text-xs text-muted-foreground block mb-1">Begründung</span>
                            <p className="text-xs">{controllingResult.reason}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )}

                  {/* Quick Video Call CTA */}
                  {(() => {
                    const nextVideoApt = leadAppointments.find(a => a.type === 'video' && a.meetingLink && new Date(`${a.date}T${a.time}`) >= new Date());
                    if (!nextVideoApt) return null;
                    return (
                      <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                        <Video className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{nextVideoApt.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(nextVideoApt.date).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: 'short' })} • {nextVideoApt.time}
                          </p>
                        </div>
                        <button onClick={() => setActiveCallAptId(nextVideoApt.id)}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                          Starten
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* RIGHT: Tabs */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  {/* Tab bar */}
                  <div className="border-b bg-card px-3 flex items-center shrink-0">
                    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
                      {rightTabs.map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setRightTab(tab.key)}
                          className={cn(
                            'flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap',
                            rightTab === tab.key
                              ? 'border-primary text-primary'
                              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                          )}
                        >
                          <tab.icon className={cn("h-4 w-4", rightTab === tab.key && "text-primary")} />
                          {tab.label}
                          {tab.count ? (
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-bold leading-none",
                              rightTab === tab.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>{tab.count}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                    {/* Edit/Save in header - hidden for review roles */}
                    <div className="ml-auto shrink-0 pl-2">
                      {rightTab === 'info' && !isReviewRole && !isFrozenForEmployee && (
                        !editing ? (
                           <button onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                             <Edit3 className="h-3.5 w-3.5" /> Bearbeiten
                           </button>
                         ) : (
                           <button onClick={saveEdit} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all">
                             <Save className="h-3.5 w-3.5" /> Speichern
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5">
                    {/* Info Tab */}
                    {rightTab === 'info' && (
                      <div className="space-y-4">
                        {/* Duplicate Warning */}
                        {duplicatesForLead.length > 0 && (
                          <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              {duplicatesForLead.length} mögliche{duplicatesForLead.length > 1 ? ' Duplikate' : 's Duplikat'} erkannt
                            </h4>
                            {duplicatesForLead.map((dup, i) => {
                              const otherId = dup.leadId1 === selectedLead!.id ? dup.leadId2 : dup.leadId1;
                              const otherLead = leads.find(l => l.id === otherId);
                              if (!otherLead) return null;
                              return (
                                <div key={i} className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium truncate">{otherLead.name}</span>
                                      <span className={cn(
                                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                        dup.confidence >= 80 ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                      )}>
                                        {dup.confidence}%
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{otherLead.email} • {otherLead.phone || '—'}</p>
                                    <p className="text-xs text-muted-foreground">{dup.reason}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    <button
                                      onClick={() => { setSelectedLead(otherLead); }}
                                      className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
                                    >
                                      <Eye className="h-3 w-3" /> Ansehen
                                    </button>
                                    <button
                                      onClick={() => {
                                        mergeLead(selectedLead!.id, otherId, {});
                                        toast({ title: '✅ Zusammengeführt', description: `"${otherLead.name}" wurde als Duplikat markiert.` });
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md bg-destructive/10 text-destructive px-2.5 py-1 text-xs font-semibold hover:bg-destructive/20 transition-colors"
                                    >
                                      <GitMerge className="h-3 w-3" /> Zusammenführen
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </section>
                        )}
                        {/* Assignment - hidden for review roles and frozen leads */}
                        {!isReviewRole && !isFrozenForEmployee && (
                          <section className="rounded-lg border bg-muted/30 p-3 space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5"><UserCog className="h-4 w-4" /> Zuweisung</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm text-muted-foreground">Agentur</label>
                                <select value={selectedLead.agencyId} onChange={e => changeAgency(e.target.value)} className={inputCls + ' mt-0.5'}>
                                  {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Mitarbeiter</label>
                                <select value={selectedLead.employeeId} onChange={e => changeEmployee(e.target.value)} className={inputCls + ' mt-0.5'}>
                                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                              </div>
                            </div>
                          </section>
                        )}

                        {editing && !isReviewRole ? (
                          <div className="space-y-2.5">
                          <div className="grid grid-cols-3 gap-2.5">
                              <div>
                                <label className="text-sm text-muted-foreground">Anrede</label>
                                <select value={form.salutation} onChange={e => setForm(prev => ({ ...prev, salutation: e.target.value }))} className={inputCls}>
                                  <option value="">— Keine —</option>
                                  <option value="Herr">Herr</option>
                                  <option value="Frau">Frau</option>
                                </select>
                              </div>
                              <div>
                                <label className={`text-sm ${fieldErrors.name ? 'text-destructive' : 'text-muted-foreground'}`}>Name *</label>
                                {isSuperadmin ? (
                                  <input value={form.name} onChange={e => { setForm(prev => ({ ...prev, name: e.target.value })); setFieldErrors(prev => { const n = {...prev}; delete n.name; return n; }); }} className={inputErr('name')} />
                                ) : (
                                  <input value={form.name} readOnly className="h-10 w-full rounded-md border bg-muted px-3 text-sm cursor-not-allowed" />
                                )}
                                {fieldErrors.name && <p className="text-sm text-destructive mt-0.5">{fieldErrors.name}</p>}
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Position</label>
                                <input value={form.position} onChange={e => setForm(prev => ({ ...prev, position: e.target.value }))} className={inputCls} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                 <label className={`text-sm ${fieldErrors.email ? 'text-destructive' : 'text-muted-foreground'}`}>E-Mail {!isSuperadmin && <span className="text-xs text-muted-foreground">(gesperrt)</span>}</label>
                                 {isSuperadmin ? (
                                   <input value={form.email} onChange={e => { setForm(prev => ({ ...prev, email: e.target.value })); setFieldErrors(prev => { const n = {...prev}; delete n.email; return n; }); }} className={inputErr('email')} />
                                 ) : (
                                   <input value={form.email} readOnly className="h-10 w-full rounded-md border bg-muted px-3 text-sm cursor-not-allowed" />
                                 )}
                                 {fieldErrors.email && <p className="text-sm text-destructive mt-0.5">{fieldErrors.email}</p>}
                               </div>
                               <div>
                                 <label className={`text-sm ${fieldErrors.phone ? 'text-destructive' : 'text-muted-foreground'}`}>Telefon {!isSuperadmin && <span className="text-xs text-muted-foreground">(gesperrt)</span>}</label>
                                 {isSuperadmin ? (
                                   <input value={form.phone} onChange={e => { setForm(prev => ({ ...prev, phone: e.target.value })); setFieldErrors(prev => { const n = {...prev}; delete n.phone; return n; }); }} placeholder="+41 44 123 45 67" className={inputErr('phone')} />
                                 ) : (
                                   <input value={form.phone} readOnly className="h-10 w-full rounded-md border bg-muted px-3 text-sm cursor-not-allowed" placeholder="+41 44 123 45 67" />
                                 )}
                                 {fieldErrors.phone && <p className="text-sm text-destructive mt-0.5">{fieldErrors.phone}</p>}
                              </div>
                            </div>
                            {/* Alternative contact fields for non-superadmins */}
                            {!isSuperadmin && (
                              <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2.5">
                                <div>
                                  <label className="text-sm text-primary font-medium">Alt. E-Mail (neu)</label>
                                  <input value={form.altEmail} onChange={e => setForm(prev => ({ ...prev, altEmail: e.target.value }))} placeholder="Korrekte E-Mail eingeben..." className={inputCls} />
                                </div>
                                <div>
                                  <label className="text-sm text-primary font-medium">Alt. Telefon (neu)</label>
                                  <input value={form.altPhone} onChange={e => setForm(prev => ({ ...prev, altPhone: e.target.value }))} placeholder="Korrekte Nr. eingeben..." className={inputCls} />
                                </div>
                                <p className="col-span-2 text-xs text-muted-foreground">Falls die Originaldaten falsch sind, hier die korrekten Kontaktdaten eintragen.</p>
                              </div>
                            )}
                            <div>
                              <label className="text-sm text-muted-foreground">Strasse & Nr.</label>
                              <AddressAutocomplete
                                value={form.address}
                                onChange={val => setForm(prev => ({ ...prev, address: val }))}
                                onSelect={(s: AddressSuggestion) => {
                                  setForm(prev => ({
                                    ...prev,
                                    address: s.street,
                                    plz: s.plz || prev.plz,
                                    city: s.city || prev.city,
                                    canton: s.canton || prev.canton,
                                    cantonCode: s.cantonCode || prev.cantonCode,
                                  }));
                                }}
                                placeholder="Adresse suchen..."
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                              <div className="relative">
                                <label className="text-sm text-muted-foreground">PLZ</label>
                                <input value={form.plz} onChange={e => handlePlzChange(e.target.value)}
                                  onFocus={() => form.plz.length >= 2 && setShowPlzDropdown(plzSuggestions.length > 0)}
                                  onBlur={() => setTimeout(() => setShowPlzDropdown(false), 200)}
                                  placeholder="8001" className={inputCls} />
                                {showPlzDropdown && (
                                  <div className="absolute z-50 mt-1 w-56 rounded-lg border bg-card shadow-lg max-h-40 overflow-y-auto">
                                    {plzSuggestions.map(loc => (
                                      <button key={loc.plz + loc.city} onMouseDown={() => selectPlzSuggestion(loc)}
                                        className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs hover:bg-muted transition-colors text-left">
                                        <span className="font-medium">{loc.plz} {loc.city}</span>
                                        <span className="text-muted-foreground">{loc.cantonCode}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div>
                                 <label className="text-sm text-muted-foreground">Ort</label>
                                 <input value={form.city} onChange={isSuperadmin ? e => setForm(prev => ({ ...prev, city: e.target.value })) : undefined} readOnly={!isSuperadmin} className={isSuperadmin ? inputCls : "h-10 w-full rounded-md border bg-muted px-3 text-sm"} />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Kanton</label>
                                {isSuperadmin ? (
                                  <select value={form.cantonCode} onChange={e => {
                                    const c = cantons.find(ct => ct.code === e.target.value);
                                    if (c) setForm(prev => ({ ...prev, canton: c.name, cantonCode: c.code }));
                                  }} className={inputCls}>
                                    <option value="">—</option>
                                    {cantons.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                                  </select>
                                ) : (
                                  <input value={form.canton ? `${form.canton} (${form.cantonCode})` : ''} readOnly className="h-10 w-full rounded-md border bg-muted px-3 text-sm" />
                                )}
                              </div>
                            </div>
                            {isSuperadmin && (
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="text-sm text-muted-foreground">Quelle</label>
                                  <select value={form.source} onChange={e => setForm(prev => ({ ...prev, source: e.target.value }))} className={inputCls}>
                                    {leadSources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm text-muted-foreground">Leaddatum</label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className={cn(inputCls, 'flex items-center gap-1.5 text-left')}>
                                        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                        {form.createdAt ? new Date(form.createdAt).toLocaleDateString('de-CH') : 'Datum'}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar mode="single" selected={form.createdAt ? new Date(form.createdAt) : undefined}
                                        onSelect={(date) => date && setForm(prev => ({ ...prev, createdAt: date.toISOString() }))}
                                        disabled={(date) => date >= new Date(2026, 0, 1)}
                                        className={cn("p-3 pointer-events-auto")} />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                            )}
                            <div>
                               <label className="text-sm text-muted-foreground">Notizen</label>
                               <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={3}
                                 className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                            </div>
                          </div>
                        ) : (
                           <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                             {[
                                ['Anrede', selectedLead.salutation],
                                ...(!isFrozenForEmployee ? [['E-Mail', selectedLead.email]] : []),
                                ...(!isFrozenForEmployee ? [['Telefon', selectedLead.phone]] : []),
                                ['Position', selectedLead.position],
                                ['Leaddatum', new Date(selectedLead.createdAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
                               ['Adresse', selectedLead.address],
                               ['Ort', selectedLead.plz || selectedLead.city ? `${selectedLead.plz} ${selectedLead.city}`.trim() : ''],
                               ['Kanton', selectedLead.canton ? `${selectedLead.canton} (${selectedLead.cantonCode})` : ''],
                             ].map(([label, value]) => (
                               <div key={label} className="flex justify-between py-2 border-b">
                                 <span className="text-muted-foreground text-sm">{label}</span>
                                 <span className={`font-medium text-sm text-right ${!value?.toString().trim() ? 'text-muted-foreground italic' : ''}`}>{value?.toString().trim() || 'Keine Angabe'}</span>
                               </div>
                             ))}
                             {selectedLead.notes && (
                               <div className="col-span-2 pt-3">
                                 <span className="text-muted-foreground text-sm">Notizen</span>
                                 <p className="mt-1 text-sm">{selectedLead.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Appointments Tab */}
                    {rightTab === 'appointments' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-semibold">Termine</h4>
                          <button onClick={() => { setShowAptForm(!showAptForm); setAptForm({ title: '', date: undefined, time: '09:00', duration: 30, type: 'phone', notes: '' }); }}
                             className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                             <Plus className="h-3.5 w-3.5" /> Neu
                          </button>
                        </div>

                        {showAptForm && (
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                 <label className="text-sm text-muted-foreground">Titel *</label>
                                 <input value={aptForm.title} onChange={e => setAptForm(prev => ({ ...prev, title: e.target.value }))} placeholder="z.B. Erstgespräch" className={inputCls} />
                               </div>
                               <div>
                                 <label className="text-sm text-muted-foreground">Art</label>
                                <select value={aptForm.type} onChange={e => setAptForm(prev => ({ ...prev, type: e.target.value as any }))} className={inputCls}>
                                  {Object.entries(appointmentTypeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                              <div>
                                <label className="text-sm text-muted-foreground">Datum *</label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className={cn(inputCls, 'flex items-center gap-1.5 text-left', !aptForm.date && 'text-muted-foreground')}>
                                      <CalendarIcon className="h-3 w-3" />
                                      {aptForm.date ? format(aptForm.date, 'dd.MM.yyyy') : 'Wählen'}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={aptForm.date} onSelect={(d) => setAptForm(prev => ({ ...prev, date: d }))}
                                      disabled={isSuperadmin ? undefined : (date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                      initialFocus className={cn("p-3 pointer-events-auto")} />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Uhrzeit</label>
                                <input type="time" value={aptForm.time} onChange={e => setAptForm(prev => ({ ...prev, time: e.target.value }))} className={inputCls} />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Dauer</label>
                                <select value={aptForm.duration} onChange={e => setAptForm(prev => ({ ...prev, duration: Number(e.target.value) }))} className={inputCls}>
                                  {[15, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} Min.</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                               <label className="text-sm text-muted-foreground">Notizen</label>
                               <textarea value={aptForm.notes} onChange={e => setAptForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="Optional..."
                                 className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setShowAptForm(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">Abbrechen</button>
                              <button disabled={!aptForm.title.trim() || !aptForm.date}
                                onClick={() => {
                                  if (!aptForm.title.trim() || !aptForm.date || !selectedLead) return;
                                  addAppointment({ leadId: selectedLead.id, title: aptForm.title.trim(), date: format(aptForm.date, 'yyyy-MM-dd'), time: aptForm.time, duration: aptForm.duration, type: aptForm.type, notes: aptForm.notes.trim(), createdBy: profile?.display_name || 'System' });
                                  setShowAptForm(false);
                                  setAptForm({ title: '', date: undefined, time: '09:00', duration: 30, type: 'phone', notes: '' });
                                }}
                                 className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                                 Speichern
                              </button>
                            </div>
                          </div>
                        )}

                        {leadAppointments.length === 0 && !showAptForm && (
                          <p className="text-sm text-muted-foreground py-8 text-center">Noch keine Termine</p>
                        )}
                        <div className="space-y-2">
                          {leadAppointments.map(apt => {
                            const TypeIcon = appointmentTypeConfig[apt.type].icon;
                            const isPast = new Date(`${apt.date}T${apt.time}`) < new Date();
                            const methodLabels: Record<string, string> = { email: 'E-Mail', sms: 'SMS', whatsapp: 'WhatsApp' };
                            return (
                              <div key={apt.id} className={cn("rounded-lg border p-2.5 space-y-1.5 transition-colors", isPast ? 'opacity-60 bg-muted/30' : 'bg-card hover:bg-muted/20')}>
                                <div className="flex items-start gap-2.5">
                                  <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", isPast ? 'bg-muted' : 'bg-primary/10')}>
                                    <TypeIcon className={cn("h-3.5 w-3.5", isPast ? 'text-muted-foreground' : 'text-primary')} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <p className="text-sm font-medium">{apt.title}</p>
                                     <p className="text-sm text-muted-foreground">
                                       {new Date(apt.date).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: 'short' })} • {apt.time} • {apt.duration}min • {appointmentTypeConfig[apt.type].label}
                                     </p>
                                     {apt.notes && <p className="text-sm mt-0.5 text-muted-foreground">{apt.notes}</p>}
                                  </div>
                                  <button onClick={() => removeAppointment(apt.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                                {apt.meetingLink && (
                                  <div className="ml-9 flex items-center gap-2 flex-wrap">
                                    <button onClick={() => setActiveCallAptId(apt.id)}
                                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                                      <Video className="h-3 w-3" /> Starten
                                    </button>
                                    <button onClick={() => { navigator.clipboard.writeText(apt.meetingLink!); toast({ title: 'Kopiert' }); }}
                                      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs hover:bg-muted transition-colors">
                                      <Copy className="h-3 w-3" /> Link
                                    </button>
                                    <button onClick={() => { sendAppointmentNotification(apt.id); toast({ title: 'Gesendet' }); }}
                                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 text-xs hover:bg-primary/20 transition-colors">
                                      <Send className="h-3 w-3" /> {methodLabels[appointmentSettings.notificationMethod]}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Insights Tab */}
                    {rightTab === 'insights' && (
                      <LeadInsightsTab leadId={selectedLead.id} leadName={selectedLead.name} />
                    )}

                    {/* Documents Tab */}
                    {rightTab === 'documents' && (
                      <LeadDocumentsTab leadId={selectedLead.id} />
                    )}

                    {/* Flow Tab */}
                    {rightTab === 'flow' && (
                      <LeadFlowTimeline lead={selectedLead} activities={activities} />
                    )}

                    {rightTab === 'status' && (
                      <div className="space-y-4">
                        {/* Approval History */}
                        {(() => {
                          const approvalStatuses = ['ready_for_controlling', 'controlling_approved', 'management_review', 'management_approved', 'hr_processing', 'hired'];
                          const approvalActivities = leadActivities.filter(a =>
                            a.type === 'status_change' && approvalStatuses.some(s => a.description.toLowerCase().includes(s.replace(/_/g, ' ')) || a.description.includes('Controlling') || a.description.includes('Management') || a.description.includes('HR') || a.description.includes('Eingestellt') || a.description.includes('übergeben') || a.description.includes('Approved') || a.description.includes('freigegeben'))
                          );
                          if (approvalActivities.length === 0) return null;
                          return (
                            <section>
                              <h4 className="text-base font-semibold mb-3 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                Approval-Verlauf
                              </h4>
                              <div className="space-y-2">
                                {approvalActivities.map(act => (
                                  <div key={act.id} className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm">{act.description}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {act.user} • {new Date(act.timestamp).toLocaleString('de-CH')}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          );
                        })()}

                        {!isReviewRole && (
                          <section>
                            <h4 className="text-base font-semibold mb-3">Status ändern</h4>
                            <div className="mb-3">
                              <p className="text-sm text-muted-foreground mb-2">Admin (frei wählbar)</p>
                              <div className="flex flex-wrap gap-1">
                                {statusKeys.map(s => (
                                  <button key={s} onClick={() => changeStatus(s)}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                                      selectedLead.status === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-transparent hover:border-primary/30'
                                    }`}>
                                    {statusConfig[s].label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Nächster Schritt</p>
                              {(() => {
                                const allowed = getAllowedNextStatuses(selectedLead.status, false);
                                return allowed.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {allowed.map(s => (
                                       <button key={s} onClick={() => changeStatus(s)}
                                         className="rounded-full px-3 py-1.5 text-sm font-medium border border-primary/30 bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-colors">
                                        → {statusConfig[s].label}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">Endstatus erreicht</p>
                                );
                              })()}
                            </div>
                           </section>
                        )}

                         {isSuperadmin && selectedLead.status !== 'new' && (
                           <section className="pt-3 border-t border-border">
                             <button
                               onClick={() => setConfirmReset(true)}
                               className="w-full rounded-md px-3 py-2 text-sm font-medium border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                             >
                               ↺ Auf «Neuer Lead» zurücksetzen
                             </button>
                           </section>
                         )}
                      </div>
                    )}

                    {/* Reset Confirmation */}
                    <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Lead zurücksetzen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Der Status von «{selectedLead.name}» wird auf «Neuer Lead» zurückgesetzt. Alle bisherigen Aktivitäten bleiben erhalten.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { changeStatus('new'); setConfirmReset(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Zurücksetzen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Activity Tab */}
                    {rightTab === 'activity' && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex gap-2">
                            <input value={noteText} onChange={e => setNoteText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addNote()}
                              placeholder="Notiz schreiben..." className={inputCls + ' flex-1'} />
                            <button onClick={addNote} disabled={!noteText.trim()}
                              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                              +
                            </button>
                          </div>
                        </div>
                        <div className="space-y-0">
                          {leadActivities.length === 0 && (
                            <p className="text-sm text-muted-foreground py-4 text-center">Noch keine Aktivitäten</p>
                          )}
                          {leadActivities.map((act, i) => {
                            const Icon = activityIcon[act.type];
                            return (
                              <div key={act.id} className="relative flex gap-2.5 pb-3">
                                {i < leadActivities.length - 1 && (
                                  <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                                )}
                                 <div className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                                   <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <p className="text-sm">{act.description}</p>
                                   <p className="text-xs text-muted-foreground mt-0.5">
                                    {act.user} • {new Date(act.timestamp).toLocaleString('de-CH')}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            {/* Superadmin: Toggle new marking */}
            {isSuperadmin && leadIsNew && (
              <div className="flex justify-end px-6 pb-4">
                <button
                  onClick={() => {
                    updateLead(selectedLead.id, { isRead: !isMarkedViewed });
                    toast({ title: 'Erledigt', description: isMarkedViewed ? 'Lead wird wieder als "Neu" gekennzeichnet.' : 'Lead wird nicht mehr als "Neu" gekennzeichnet.' });
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    isMarkedViewed
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                      : "border-border bg-secondary text-foreground hover:bg-muted"
                  )}
                >
                  {isMarkedViewed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {isMarkedViewed ? 'Als neu kennzeichnen' : 'Nicht mehr als Neu kennzeichnen'}
                </button>
              </div>
            )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Video Call Dialog */}
      {(() => {
        const activeApt = appointments.find(a => a.id === activeCallAptId);
        if (!activeApt?.meetingLink) return null;
        return (
          <VideoCallDialog
            open={!!activeCallAptId}
            onOpenChange={(v) => { if (!v) setActiveCallAptId(null); }}
            meetingLink={activeApt.meetingLink}
            title={activeApt.title}
            leadName={selectedLead?.name ?? ''}
          />
        );
      })()}
    </>
  );
}
