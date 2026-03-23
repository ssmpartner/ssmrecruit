import { useState, useMemo } from 'react';
import { format } from 'date-fns';
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
  Link2, Send, Copy, ChevronLeft, ChevronRight, X, Workflow, Wand2, Brain, Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import VideoCallDialog from './VideoCallDialog';
import ProcessStepper from './ProcessStepper';
import LeadActionPanel from './LeadActionPanel';
import LeadFlowTimeline from './LeadFlowTimeline';
import WizardHistoryPanel from './WizardHistoryPanel';
import LeadInsightsTab from './LeadInsightsTab';
import LeadDocumentsTab from './LeadDocumentsTab';

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
  const { selectedLead, setSelectedLead, updateLead, addActivity, activities, employees, agencies, appointments, addAppointment, removeAppointment, sendAppointmentNotification, appointmentSettings, leads, leadSources } = useLeads();
  const { toast } = useToast();
  const { isSuperadmin, profile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [plzSuggestions, setPlzSuggestions] = useState<SwissLocation[]>([]);
  const [showPlzDropdown, setShowPlzDropdown] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', email: '', phone: '', position: '', address: '', plz: '', city: '', canton: '', cantonCode: '', notes: '', source: '' as string, createdAt: '' });
  const [showAptForm, setShowAptForm] = useState(false);
  const [aptForm, setAptForm] = useState({ title: '', date: undefined as Date | undefined, time: '09:00', duration: 30, type: 'phone' as 'phone' | 'video' | 'onsite', notes: '' });
  const [activeCallAptId, setActiveCallAptId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'info' | 'appointments' | 'activity' | 'flow' | 'status' | 'wizard' | 'insights' | 'documents'>('info');
  const [confirmReset, setConfirmReset] = useState(false);

  const leadAppointments = useMemo(() =>
    selectedLead ? appointments.filter(a => a.leadId === selectedLead.id).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)) : [],
    [selectedLead, appointments]
  );

  const activeLeads = useMemo(() => leads.filter(l => l.lifecycle === 'active'), [leads]);
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
      name: selectedLead.name, email: selectedLead.email, phone: selectedLead.phone,
      position: selectedLead.position, address: selectedLead.address, plz: selectedLead.plz,
      city: selectedLead.city, canton: selectedLead.canton, cantonCode: selectedLead.cantonCode,
      notes: selectedLead.notes, source: selectedLead.source, createdAt: selectedLead.createdAt,
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
    if (form.email !== selectedLead.email) changes.push(`Email → "${form.email}"`);
    if (form.phone !== selectedLead.phone) changes.push(`Telefon aktualisiert`);
    if (form.position !== selectedLead.position) changes.push(`Position → "${form.position}"`);
    if (form.address !== selectedLead.address) changes.push(`Adresse aktualisiert`);
    if (form.plz !== selectedLead.plz) changes.push(`PLZ → ${form.plz} ${form.city}`);
    if (form.notes !== selectedLead.notes) changes.push(`Notizen aktualisiert`);
    if (isSuperadmin && form.source !== selectedLead.source) changes.push(`Quelle → "${leadSources.find(s => s.id === form.source)?.label || form.source}"`);
    if (isSuperadmin && form.createdAt !== selectedLead.createdAt) changes.push(`Erstelldatum geändert`);

    const updates: Partial<Record<string, any>> = { ...form };
    if (!isSuperadmin) { delete updates.source; delete updates.createdAt; }
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
  const inputCls = "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
  const inputErr = (field: string) => fieldErrors[field] ? inputCls + ' border-destructive ring-1 ring-destructive/30' : inputCls;

  const rightTabs = [
    { key: 'info' as const, label: 'Info', icon: User },
    { key: 'insights' as const, label: 'Insights', icon: Brain },
    { key: 'documents' as const, label: 'Dokumente', icon: Upload },
    { key: 'flow' as const, label: 'Flow', icon: Workflow },
    { key: 'wizard' as const, label: 'Wizards', icon: Wand2 },
    { key: 'appointments' as const, label: 'Termine', icon: CalendarIcon, count: leadAppointments.length },
    { key: 'activity' as const, label: 'Aktivität', icon: Activity },
    { key: 'status' as const, label: 'Status', icon: FileText },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[85vw] max-h-[85vh] h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          {selectedLead && (
            <>
              {/* Compact Header */}
              <div className="border-b px-5 py-3 flex items-center gap-3 shrink-0" style={{ background: 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--background)))' }}>
                <div className="flex items-center gap-1.5">
                  <button onClick={goToPrev} disabled={!hasPrev}
                    className="flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={goToNext} disabled={!hasNext}
                    className="flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <DialogHeader className="space-y-0">
                    <DialogTitle className="text-lg font-bold tracking-tight">{selectedLead.name}</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">{selectedLead.position || 'Kein Titel'}</DialogDescription>
                  </DialogHeader>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <LeadStatusBadge status={selectedLead.status} />
                  <SourceBadge source={selectedLead.source} />
                  <span className="hidden md:inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {selectedLead.plz} {selectedLead.city}
                  </span>
                  {currentIndex >= 0 && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary font-semibold tabular-nums">
                      {currentIndex + 1}/{activeLeads.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Process Stepper */}
              <div className="border-b px-5 py-2 shrink-0">
                <ProcessStepper currentStatus={selectedLead.status} compact />
              </div>

              {/* Two Column Layout */}
              <div className="flex-1 flex overflow-hidden">
                {/* LEFT: Step Actions + Workflow */}
                <div className="w-[400px] shrink-0 border-r overflow-y-auto bg-muted/20">
                  <div className="p-4">
                    <LeadInsightsDocumentsWithActions
                      leadId={selectedLead.id}
                      leadName={selectedLead.name}
                      leadStatus={selectedLead.status}
                      onScheduleAppointment={() => {
                        setRightTab('appointments');
                        setShowAptForm(true);
                      }}
                    />
                  </div>

                  {/* Quick Video Call CTA */}
                  {(() => {
                    const nextVideoApt = leadAppointments.find(a => a.type === 'video' && a.meetingLink && new Date(`${a.date}T${a.time}`) >= new Date());
                    if (!nextVideoApt) return null;
                    return (
                      <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                        <Video className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{nextVideoApt.title}</p>
                          <p className="text-xs text-muted-foreground">
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

                {/* RIGHT: Info / Appointments / Activity / Status */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  {/* Right tab bar */}
                  <div className="border-b px-4 flex items-center gap-1 shrink-0">
                    {rightTabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setRightTab(tab.key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2',
                          rightTab === tab.key
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                        {tab.count ? (
                          <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground leading-none">{tab.count}</span>
                        ) : null}
                      </button>
                    ))}
                    {/* Edit/Save in header */}
                    <div className="ml-auto">
                      {rightTab === 'info' && (
                        !editing ? (
                          <button onClick={startEdit} className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors">
                            <Edit3 className="h-3 w-3" /> Bearbeiten
                          </button>
                        ) : (
                          <button onClick={saveEdit} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all">
                            <Save className="h-3 w-3" /> Speichern
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {/* Info Tab */}
                    {rightTab === 'info' && (
                      <div className="space-y-4">
                        {/* Assignment */}
                        <section className="rounded-lg border bg-muted/30 p-3 space-y-2">
                          <h4 className="text-xs font-semibold flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5" /> Zuweisung</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground">Agentur</label>
                              <select value={selectedLead.agencyId} onChange={e => changeAgency(e.target.value)} className={inputCls + ' mt-0.5'}>
                                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Mitarbeiter</label>
                              <select value={selectedLead.employeeId} onChange={e => changeEmployee(e.target.value)} className={inputCls + ' mt-0.5'}>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                              </select>
                            </div>
                          </div>
                        </section>

                        {editing ? (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2.5">
                              {(['name', 'position'] as const).map(field => (
                                <div key={field}>
                                  <label className={`text-xs ${fieldErrors[field] ? 'text-destructive' : 'text-muted-foreground'}`}>{field === 'name' ? 'Name *' : 'Position'}</label>
                                  <input value={form[field]} onChange={e => { setForm(prev => ({ ...prev, [field]: e.target.value })); setFieldErrors(prev => { const n = {...prev}; delete n[field]; return n; }); }} className={inputErr(field)} />
                                  {fieldErrors[field] && <p className="text-xs text-destructive mt-0.5">{fieldErrors[field]}</p>}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className={`text-xs ${fieldErrors.email ? 'text-destructive' : 'text-muted-foreground'}`}>E-Mail</label>
                                <input value={form.email} onChange={e => { setForm(prev => ({ ...prev, email: e.target.value })); setFieldErrors(prev => { const n = {...prev}; delete n.email; return n; }); }} className={inputErr('email')} />
                                {fieldErrors.email && <p className="text-xs text-destructive mt-0.5">{fieldErrors.email}</p>}
                              </div>
                              <div>
                                <label className={`text-xs ${fieldErrors.phone ? 'text-destructive' : 'text-muted-foreground'}`}>Telefon</label>
                                <input value={form.phone} onChange={e => { setForm(prev => ({ ...prev, phone: e.target.value })); setFieldErrors(prev => { const n = {...prev}; delete n.phone; return n; }); }} placeholder="+41 44 123 45 67" className={inputErr('phone')} />
                                {fieldErrors.phone && <p className="text-xs text-destructive mt-0.5">{fieldErrors.phone}</p>}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Strasse & Nr.</label>
                              <input value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} className={inputCls} />
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                              <div className="relative">
                                <label className="text-xs text-muted-foreground">PLZ</label>
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
                                <label className="text-xs text-muted-foreground">Ort</label>
                                <input value={form.city} onChange={isSuperadmin ? e => setForm(prev => ({ ...prev, city: e.target.value })) : undefined} readOnly={!isSuperadmin} className={isSuperadmin ? inputCls : "h-8 w-full rounded-md border bg-muted px-2.5 text-sm"} />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Kanton</label>
                                {isSuperadmin ? (
                                  <select value={form.cantonCode} onChange={e => {
                                    const c = cantons.find(ct => ct.code === e.target.value);
                                    if (c) setForm(prev => ({ ...prev, canton: c.name, cantonCode: c.code }));
                                  }} className={inputCls}>
                                    <option value="">—</option>
                                    {cantons.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                                  </select>
                                ) : (
                                  <input value={form.canton ? `${form.canton} (${form.cantonCode})` : ''} readOnly className="h-8 w-full rounded-md border bg-muted px-2.5 text-sm" />
                                )}
                              </div>
                            </div>
                            {isSuperadmin && (
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="text-xs text-muted-foreground">Quelle</label>
                                  <select value={form.source} onChange={e => setForm(prev => ({ ...prev, source: e.target.value }))} className={inputCls}>
                                    {leadSources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Erstelldatum</label>
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
                                        className={cn("p-3 pointer-events-auto")} />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                            )}
                            <div>
                              <label className="text-xs text-muted-foreground">Notizen</label>
                              <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2}
                                className="w-full rounded-md border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
                            {[
                              ['E-Mail', selectedLead.email],
                              ['Telefon', selectedLead.phone],
                              ['Position', selectedLead.position],
                              ['Erstellt', new Date(selectedLead.createdAt).toLocaleDateString('de-CH')],
                              ['Adresse', selectedLead.address],
                              ['Ort', `${selectedLead.plz} ${selectedLead.city}`],
                              ['Kanton', `${selectedLead.canton} (${selectedLead.cantonCode})`],
                            ].map(([label, value]) => (
                              <div key={label} className="flex justify-between py-1.5 border-b">
                                <span className="text-muted-foreground text-xs">{label}</span>
                                <span className="font-medium text-xs text-right">{value || '—'}</span>
                              </div>
                            ))}
                            {selectedLead.notes && (
                              <div className="col-span-2 pt-2">
                                <span className="text-muted-foreground text-xs">Notizen</span>
                                <p className="mt-0.5 text-xs">{selectedLead.notes}</p>
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
                          <h4 className="text-sm font-semibold">Termine</h4>
                          <button onClick={() => { setShowAptForm(!showAptForm); setAptForm({ title: '', date: undefined, time: '09:00', duration: 30, type: 'phone', notes: '' }); }}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                            <Plus className="h-3 w-3" /> Neu
                          </button>
                        </div>

                        {showAptForm && (
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-xs text-muted-foreground">Titel *</label>
                                <input value={aptForm.title} onChange={e => setAptForm(prev => ({ ...prev, title: e.target.value }))} placeholder="z.B. Erstgespräch" className={inputCls} />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Art</label>
                                <select value={aptForm.type} onChange={e => setAptForm(prev => ({ ...prev, type: e.target.value as any }))} className={inputCls}>
                                  {Object.entries(appointmentTypeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                              <div>
                                <label className="text-xs text-muted-foreground">Datum *</label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className={cn(inputCls, 'flex items-center gap-1.5 text-left', !aptForm.date && 'text-muted-foreground')}>
                                      <CalendarIcon className="h-3 w-3" />
                                      {aptForm.date ? format(aptForm.date, 'dd.MM.yyyy') : 'Wählen'}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={aptForm.date} onSelect={(d) => setAptForm(prev => ({ ...prev, date: d }))}
                                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                      initialFocus className={cn("p-3 pointer-events-auto")} />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Uhrzeit</label>
                                <input type="time" value={aptForm.time} onChange={e => setAptForm(prev => ({ ...prev, time: e.target.value }))} className={inputCls} />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Dauer</label>
                                <select value={aptForm.duration} onChange={e => setAptForm(prev => ({ ...prev, duration: Number(e.target.value) }))} className={inputCls}>
                                  {[15, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} Min.</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Notizen</label>
                              <textarea value={aptForm.notes} onChange={e => setAptForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="Optional..."
                                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setShowAptForm(false)} className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted transition-colors">Abbrechen</button>
                              <button disabled={!aptForm.title.trim() || !aptForm.date}
                                onClick={() => {
                                  if (!aptForm.title.trim() || !aptForm.date || !selectedLead) return;
                                  addAppointment({ leadId: selectedLead.id, title: aptForm.title.trim(), date: format(aptForm.date, 'yyyy-MM-dd'), time: aptForm.time, duration: aptForm.duration, type: aptForm.type, notes: aptForm.notes.trim(), createdBy: profile?.display_name || 'System' });
                                  setShowAptForm(false);
                                  setAptForm({ title: '', date: undefined, time: '09:00', duration: 30, type: 'phone', notes: '' });
                                }}
                                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                                Speichern
                              </button>
                            </div>
                          </div>
                        )}

                        {leadAppointments.length === 0 && !showAptForm && (
                          <p className="text-xs text-muted-foreground py-8 text-center">Noch keine Termine</p>
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
                                    <p className="text-xs font-medium">{apt.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(apt.date).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: 'short' })} • {apt.time} • {apt.duration}min • {appointmentTypeConfig[apt.type].label}
                                    </p>
                                    {apt.notes && <p className="text-xs mt-0.5 text-muted-foreground">{apt.notes}</p>}
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

                    {/* Wizard History Tab */}
                    {rightTab === 'wizard' && (
                      <WizardHistoryPanel leadId={selectedLead.id} />
                    )}
                    {rightTab === 'status' && (
                      <div className="space-y-4">
                        <section>
                          <h4 className="text-sm font-semibold mb-2">Status ändern</h4>
                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground mb-1.5">Admin (frei wählbar)</p>
                            <div className="flex flex-wrap gap-1">
                              {statusKeys.map(s => (
                                <button key={s} onClick={() => changeStatus(s)}
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                                    selectedLead.status === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-transparent hover:border-primary/30'
                                  }`}>
                                  {statusConfig[s].label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Nächster Schritt</p>
                            {(() => {
                              const allowed = getAllowedNextStatuses(selectedLead.status, false);
                              return allowed.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {allowed.map(s => (
                                    <button key={s} onClick={() => changeStatus(s)}
                                      className="rounded-full px-2.5 py-1 text-xs font-medium border border-primary/30 bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-colors">
                                      → {statusConfig[s].label}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">Endstatus erreicht</p>
                              );
                            })()}
                          </div>
                         </section>

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
                            <p className="text-xs text-muted-foreground py-4 text-center">Noch keine Aktivitäten</p>
                          )}
                          {leadActivities.map((act, i) => {
                            const Icon = activityIcon[act.type];
                            return (
                              <div key={act.id} className="relative flex gap-2.5 pb-3">
                                {i < leadActivities.length - 1 && (
                                  <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                                )}
                                <div className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs">{act.description}</p>
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
            </>
          )}
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
