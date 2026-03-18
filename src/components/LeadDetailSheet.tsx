import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useLeads, type ActivityEntry } from '@/context/LeadsContext';
import { statusConfig, type LeadStatus } from '@/lib/mock-data';
import { lookupPlz, searchPlz, type SwissLocation } from '@/lib/swiss-plz';
import LeadStatusBadge from './LeadStatusBadge';
import SourceBadge from './SourceBadge';
import { Save, Clock, UserCog, Edit3, MessageSquare, ArrowRight, MapPin, User, FileText, Activity, CalendarIcon, Phone, Video, Building2, Trash2, Plus } from 'lucide-react';

const statusKeys: LeadStatus[] = ['new', 'contacted', 'appointment', 'interview', 'hired', 'rejected'];

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
  const { selectedLead, setSelectedLead, updateLead, addActivity, activities, employees, agencies, appointments, addAppointment, removeAppointment } = useLeads();
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [plzSuggestions, setPlzSuggestions] = useState<SwissLocation[]>([]);
  const [showPlzDropdown, setShowPlzDropdown] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', position: '', address: '', plz: '', city: '', canton: '', cantonCode: '', notes: '' });

  // Appointment form
  const [showAptForm, setShowAptForm] = useState(false);
  const [aptForm, setAptForm] = useState({ title: '', date: undefined as Date | undefined, time: '09:00', duration: 30, type: 'phone' as 'phone' | 'video' | 'onsite', notes: '' });

  const leadAppointments = useMemo(() =>
    selectedLead ? appointments.filter(a => a.leadId === selectedLead.id).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)) : [],
    [selectedLead, appointments]
  );

  const open = !!selectedLead;

  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedLead(null);
      setEditing(false);
      setShowPlzDropdown(false);
    }
  };

  const startEdit = () => {
    if (!selectedLead) return;
    setForm({
      name: selectedLead.name, email: selectedLead.email, phone: selectedLead.phone,
      position: selectedLead.position, address: selectedLead.address, plz: selectedLead.plz,
      city: selectedLead.city, canton: selectedLead.canton, cantonCode: selectedLead.cantonCode,
      notes: selectedLead.notes,
    });
    setEditing(true);
  };

  const handlePlzChange = (value: string) => {
    setForm(prev => ({ ...prev, plz: value }));
    if (value.length >= 2) {
      const results = searchPlz(value);
      setPlzSuggestions(results);
      setShowPlzDropdown(results.length > 0);
    } else {
      setShowPlzDropdown(false);
    }
    const exact = lookupPlz(value);
    if (exact) {
      setForm(prev => ({ ...prev, city: exact.city, canton: exact.canton, cantonCode: exact.cantonCode }));
    }
  };

  const selectPlzSuggestion = (loc: SwissLocation) => {
    setForm(prev => ({ ...prev, plz: loc.plz, city: loc.city, canton: loc.canton, cantonCode: loc.cantonCode }));
    setShowPlzDropdown(false);
  };

  const saveEdit = () => {
    if (!selectedLead) return;
    const phoneClean = form.phone.replace(/\s/g, '');
    if (phoneClean && !phoneClean.startsWith('+41') && !phoneClean.startsWith('041') && !phoneClean.startsWith('0')) return;

    const changes: string[] = [];
    if (form.name !== selectedLead.name) changes.push(`Name → "${form.name}"`);
    if (form.email !== selectedLead.email) changes.push(`Email → "${form.email}"`);
    if (form.phone !== selectedLead.phone) changes.push(`Telefon aktualisiert`);
    if (form.position !== selectedLead.position) changes.push(`Position → "${form.position}"`);
    if (form.address !== selectedLead.address) changes.push(`Adresse aktualisiert`);
    if (form.plz !== selectedLead.plz) changes.push(`PLZ → ${form.plz} ${form.city}`);
    if (form.notes !== selectedLead.notes) changes.push(`Notizen aktualisiert`);

    updateLead(selectedLead.id, form);
    if (changes.length > 0) addActivity(selectedLead.id, 'edit', changes.join(', '));
    setEditing(false);
  };

  const changeStatus = (newStatus: LeadStatus) => {
    if (!selectedLead || selectedLead.status === newStatus) return;
    const oldLabel = statusConfig[selectedLead.status].label;
    const newLabel = statusConfig[newStatus].label;
    updateLead(selectedLead.id, { status: newStatus });
    addActivity(selectedLead.id, 'status_change', `Status geändert: "${oldLabel}" → "${newLabel}"`);
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
  const inputCls = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {selectedLead && (
          <>
            {/* Header */}
            <div className="border-b bg-card px-6 pt-6 pb-4">
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedLead.name}</DialogTitle>
                <DialogDescription>{selectedLead.position}</DialogDescription>
              </DialogHeader>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <LeadStatusBadge status={selectedLead.status} />
                <SourceBadge source={selectedLead.source} />
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                  <MapPin className="h-3 w-3" /> {selectedLead.plz} {selectedLead.city} ({selectedLead.cantonCode})
                </span>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="mx-6 mt-4 w-fit">
                <TabsTrigger value="details" className="gap-1.5">
                  <User className="h-3.5 w-3.5" /> Details
                </TabsTrigger>
                <TabsTrigger value="appointments" className="gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" /> Termine
                  {leadAppointments.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground leading-none">{leadAppointments.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="status" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Status
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Aktivität
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {/* Tab: Details */}
                <TabsContent value="details" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Lead-Informationen</h4>
                    {!editing ? (
                      <button onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                        <Edit3 className="h-3 w-3" /> Bearbeiten
                      </button>
                    ) : (
                      <button onClick={saveEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                        <Save className="h-3 w-3" /> Speichern
                      </button>
                    )}
                  </div>

                  {editing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {(['name', 'position'] as const).map(field => (
                          <div key={field}>
                            <label className="text-xs font-medium text-muted-foreground">{field === 'name' ? 'Name' : 'Position'}</label>
                            <input value={form[field]} onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))} className={inputCls} />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">E-Mail</label>
                          <input value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Telefon (+41)</label>
                          <input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="+41 44 123 45 67" className={inputCls} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Strasse & Nr.</label>
                        <input value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} className={inputCls} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="relative">
                          <label className="text-xs font-medium text-muted-foreground">PLZ</label>
                          <input value={form.plz} onChange={e => handlePlzChange(e.target.value)}
                            onFocus={() => form.plz.length >= 2 && setShowPlzDropdown(plzSuggestions.length > 0)}
                            onBlur={() => setTimeout(() => setShowPlzDropdown(false), 200)}
                            placeholder="8001" className={inputCls} />
                          {showPlzDropdown && (
                            <div className="absolute z-50 mt-1 w-64 rounded-lg border bg-card shadow-lg max-h-48 overflow-y-auto">
                              {plzSuggestions.map(loc => (
                                <button key={loc.plz + loc.city} onMouseDown={() => selectPlzSuggestion(loc)}
                                  className="flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-muted transition-colors text-left">
                                  <span className="font-medium">{loc.plz} {loc.city}</span>
                                  <span className="text-muted-foreground">{loc.cantonCode}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Ort</label>
                          <input value={form.city} readOnly className="h-9 w-full rounded-lg border bg-muted px-3 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Kanton</label>
                          <input value={form.canton ? `${form.canton} (${form.cantonCode})` : ''} readOnly className="h-9 w-full rounded-lg border bg-muted px-3 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Notizen</label>
                        <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={3}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      {[
                        ['E-Mail', selectedLead.email],
                        ['Telefon', selectedLead.phone],
                        ['Position', selectedLead.position],
                        ['Erstellt', new Date(selectedLead.createdAt).toLocaleDateString('de-CH')],
                        ['Adresse', `${selectedLead.address}`],
                        ['Ort', `${selectedLead.plz} ${selectedLead.city}`],
                        ['Kanton', `${selectedLead.canton} (${selectedLead.cantonCode})`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-right">{value}</span>
                        </div>
                      ))}
                      {selectedLead.notes && (
                        <div className="col-span-2 pt-2">
                          <span className="text-muted-foreground text-xs">Notizen</span>
                          <p className="mt-1 text-sm">{selectedLead.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Appointments */}
                <TabsContent value="appointments" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Termine für {selectedLead.name}</h4>
                    <button onClick={() => { setShowAptForm(!showAptForm); setAptForm({ title: '', date: undefined, time: '09:00', duration: 30, type: 'phone', notes: '' }); }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                      <Plus className="h-3 w-3" /> Termin erstellen
                    </button>
                  </div>

                  {showAptForm && (
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Titel *</label>
                          <input value={aptForm.title} onChange={e => setAptForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="z.B. Erstgespräch" maxLength={100}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Art</label>
                          <select value={aptForm.type} onChange={e => setAptForm(prev => ({ ...prev, type: e.target.value as 'phone' | 'video' | 'onsite' }))}
                            className={inputCls}>
                            {Object.entries(appointmentTypeConfig).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Datum *</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className={cn(inputCls, 'flex items-center gap-2 text-left', !aptForm.date && 'text-muted-foreground')}>
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {aptForm.date ? format(aptForm.date, 'dd.MM.yyyy') : 'Datum wählen'}
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
                          <label className="text-xs font-medium text-muted-foreground">Uhrzeit *</label>
                          <input type="time" value={aptForm.time} onChange={e => setAptForm(prev => ({ ...prev, time: e.target.value }))}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Dauer (Min.)</label>
                          <select value={aptForm.duration} onChange={e => setAptForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
                            className={inputCls}>
                            <option value={15}>15 Min.</option>
                            <option value={30}>30 Min.</option>
                            <option value={45}>45 Min.</option>
                            <option value={60}>60 Min.</option>
                            <option value={90}>90 Min.</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Notizen</label>
                        <textarea value={aptForm.notes} onChange={e => setAptForm(prev => ({ ...prev, notes: e.target.value }))}
                          rows={2} maxLength={500} placeholder="Zusätzliche Infos..."
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAptForm(false)}
                          className="rounded-lg border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors">Abbrechen</button>
                        <button disabled={!aptForm.title.trim() || !aptForm.date}
                          onClick={() => {
                            if (!aptForm.title.trim() || !aptForm.date || !selectedLead) return;
                            addAppointment({
                              leadId: selectedLead.id,
                              title: aptForm.title.trim(),
                              date: format(aptForm.date, 'yyyy-MM-dd'),
                              time: aptForm.time,
                              duration: aptForm.duration,
                              type: aptForm.type,
                              notes: aptForm.notes.trim(),
                              createdBy: 'Sarah Chen',
                            });
                            setShowAptForm(false);
                            setAptForm({ title: '', date: undefined, time: '09:00', duration: 30, type: 'phone', notes: '' });
                          }}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                          Termin speichern
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Appointment list */}
                  {leadAppointments.length === 0 && !showAptForm && (
                    <p className="text-sm text-muted-foreground py-8 text-center">Noch keine Termine für diesen Lead</p>
                  )}
                  <div className="space-y-2">
                    {leadAppointments.map(apt => {
                      const TypeIcon = appointmentTypeConfig[apt.type].icon;
                      const isPast = new Date(`${apt.date}T${apt.time}`) < new Date();
                      return (
                        <div key={apt.id} className={cn("rounded-lg border p-3 flex items-start gap-3 transition-colors", isPast ? 'opacity-60 bg-muted/30' : 'bg-card hover:bg-muted/30')}>
                          <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", isPast ? 'bg-muted' : 'bg-primary/10')}>
                            <TypeIcon className={cn("h-4 w-4", isPast ? 'text-muted-foreground' : 'text-primary')} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{apt.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(apt.date).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} • {apt.time} Uhr • {apt.duration} Min. • {appointmentTypeConfig[apt.type].label}
                            </p>
                            {apt.notes && <p className="text-xs mt-1 text-muted-foreground">{apt.notes}</p>}
                          </div>
                          <button onClick={() => removeAppointment(apt.id)}
                            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>


                <TabsContent value="status" className="mt-4 space-y-6">
                  <section>
                    <h4 className="text-sm font-semibold mb-3">Status ändern</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {statusKeys.map(s => (
                        <button key={s} onClick={() => changeStatus(s)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                            selectedLead.status === s
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-secondary text-secondary-foreground border-transparent hover:border-primary/30'
                          }`}>
                          {statusConfig[s].label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-sm font-semibold mb-3">Zuweisung</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Agentur</label>
                        <select value={selectedLead.agencyId} onChange={e => changeAgency(e.target.value)} className={inputCls + ' mt-1'}>
                          {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Mitarbeiter</label>
                        <select value={selectedLead.employeeId} onChange={e => changeEmployee(e.target.value)} className={inputCls + ' mt-1'}>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </section>
                </TabsContent>

                {/* Tab: Activity */}
                <TabsContent value="activity" className="mt-4 space-y-4">
                  {/* Add Note */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Notiz hinzufügen</h4>
                    <div className="flex gap-2">
                      <input value={noteText} onChange={e => setNoteText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addNote()}
                        placeholder="Notiz schreiben..." className={inputCls + ' flex-1'} />
                      <button onClick={addNote} disabled={!noteText.trim()}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                        Hinzufügen
                      </button>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Aktivitätsverlauf</h4>
                    <div className="space-y-0">
                      {leadActivities.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">Noch keine Aktivitäten</p>
                      )}
                      {leadActivities.map((act, i) => {
                        const Icon = activityIcon[act.type];
                        return (
                          <div key={act.id} className="relative flex gap-3 pb-4">
                            {i < leadActivities.length - 1 && (
                              <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
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
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
