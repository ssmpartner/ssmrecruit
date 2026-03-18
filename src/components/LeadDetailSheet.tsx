import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useLeads, type ActivityEntry } from '@/context/LeadsContext';
import { statusConfig, type LeadStatus } from '@/lib/mock-data';
import { lookupPlz, searchPlz, type SwissLocation } from '@/lib/swiss-plz';
import LeadStatusBadge from './LeadStatusBadge';
import SourceBadge from './SourceBadge';
import { Save, Clock, UserCog, Edit3, MessageSquare, ArrowRight, MapPin } from 'lucide-react';

const statusKeys: LeadStatus[] = ['new', 'contacted', 'appointment', 'interview', 'hired', 'rejected'];

const activityIcon: Record<ActivityEntry['type'], typeof Clock> = {
  status_change: ArrowRight,
  assignment: UserCog,
  edit: Edit3,
  note: MessageSquare,
};

export default function LeadDetailSheet() {
  const { selectedLead, setSelectedLead, updateLead, addActivity, activities, employees, agencies } = useLeads();
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [plzSuggestions, setPlzSuggestions] = useState<SwissLocation[]>([]);
  const [showPlzDropdown, setShowPlzDropdown] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', phone: '', position: '', address: '', plz: '', city: '', canton: '', cantonCode: '', notes: '' });

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
      name: selectedLead.name,
      email: selectedLead.email,
      phone: selectedLead.phone,
      position: selectedLead.position,
      address: selectedLead.address,
      plz: selectedLead.plz,
      city: selectedLead.city,
      canton: selectedLead.canton,
      cantonCode: selectedLead.cantonCode,
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
    // Auto-fill on exact match
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
    // Validate Swiss phone
    const phoneClean = form.phone.replace(/\s/g, '');
    if (phoneClean && !phoneClean.startsWith('+41') && !phoneClean.startsWith('041') && !phoneClean.startsWith('0')) {
      return; // silently reject non-Swiss numbers for now
    }

    const changes: string[] = [];
    if (form.name !== selectedLead.name) changes.push(`Name → "${form.name}"`);
    if (form.email !== selectedLead.email) changes.push(`Email → "${form.email}"`);
    if (form.phone !== selectedLead.phone) changes.push(`Telefon aktualisiert`);
    if (form.position !== selectedLead.position) changes.push(`Position → "${form.position}"`);
    if (form.address !== selectedLead.address) changes.push(`Adresse aktualisiert`);
    if (form.plz !== selectedLead.plz) changes.push(`PLZ → ${form.plz} ${form.city}`);
    if (form.notes !== selectedLead.notes) changes.push(`Notizen aktualisiert`);

    updateLead(selectedLead.id, form);
    if (changes.length > 0) {
      addActivity(selectedLead.id, 'edit', changes.join(', '));
    }
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto scrollbar-thin p-0">
        {selectedLead && (
          <>
            <div className="sticky top-0 z-10 border-b bg-card px-6 pt-6 pb-4">
              <SheetHeader>
                <SheetTitle className="text-xl">{selectedLead.name}</SheetTitle>
                <SheetDescription>{selectedLead.position}</SheetDescription>
              </SheetHeader>
              <div className="mt-3 flex items-center gap-2">
                <LeadStatusBadge status={selectedLead.status} />
                <SourceBadge source={selectedLead.source} />
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                  <MapPin className="h-3 w-3" /> {selectedLead.plz} {selectedLead.city} ({selectedLead.cantonCode})
                </span>
              </div>
            </div>

            <div className="space-y-6 p-6">
              {/* Info / Edit */}
              <section>
                <div className="flex items-center justify-between mb-3">
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
                    {(['name', 'email', 'phone', 'position'] as const).map(field => (
                      <div key={field}>
                        <label className="text-xs font-medium text-muted-foreground">
                          {field === 'name' ? 'Name' : field === 'email' ? 'E-Mail' : field === 'phone' ? 'Telefon (+41)' : 'Position'}
                        </label>
                        <input
                          value={form[field]}
                          onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                          placeholder={field === 'phone' ? '+41 44 123 45 67' : ''}
                          className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                    {/* Address */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Strasse & Nr.</label>
                      <input
                        value={form.address}
                        onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    {/* PLZ with auto-complete */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative">
                        <label className="text-xs font-medium text-muted-foreground">PLZ</label>
                        <input
                          value={form.plz}
                          onChange={e => handlePlzChange(e.target.value)}
                          onFocus={() => form.plz.length >= 2 && setShowPlzDropdown(plzSuggestions.length > 0)}
                          onBlur={() => setTimeout(() => setShowPlzDropdown(false), 200)}
                          placeholder="z.B. 8001"
                          className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                        {showPlzDropdown && (
                          <div className="absolute z-50 mt-1 w-64 rounded-lg border bg-card shadow-lg max-h-48 overflow-y-auto">
                            {plzSuggestions.map(loc => (
                              <button
                                key={loc.plz + loc.city}
                                onMouseDown={() => selectPlzSuggestion(loc)}
                                className="flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                              >
                                <span className="font-medium">{loc.plz} {loc.city}</span>
                                <span className="text-muted-foreground">{loc.cantonCode}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Ort</label>
                        <input
                          value={form.city}
                          readOnly
                          className="mt-1 h-9 w-full rounded-lg border bg-muted px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Kanton</label>
                        <input
                          value={form.canton ? `${form.canton} (${form.cantonCode})` : ''}
                          readOnly
                          className="mt-1 h-9 w-full rounded-lg border bg-muted px-3 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Notizen</label>
                      <textarea
                        value={form.notes}
                        onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">E-Mail</span>
                      <span className="font-medium">{selectedLead.email}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Telefon</span>
                      <span className="font-medium">{selectedLead.phone}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Adresse</span>
                      <span className="font-medium text-right">{selectedLead.address}<br />{selectedLead.plz} {selectedLead.city}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Kanton</span>
                      <span className="font-medium">{selectedLead.canton} ({selectedLead.cantonCode})</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Erstellt</span>
                      <span className="font-medium">{new Date(selectedLead.createdAt).toLocaleDateString('de-CH')}</span>
                    </div>
                    {selectedLead.notes && (
                      <div className="pt-1">
                        <span className="text-muted-foreground">Notizen: </span>
                        <span>{selectedLead.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Status */}
              <section>
                <h4 className="text-sm font-semibold mb-3">Status ändern</h4>
                <div className="flex flex-wrap gap-1.5">
                  {statusKeys.map(s => (
                    <button
                      key={s}
                      onClick={() => changeStatus(s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        selectedLead.status === s
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-secondary-foreground border-transparent hover:border-primary/30'
                      }`}
                    >
                      {statusConfig[s].label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Assignment */}
              <section>
                <h4 className="text-sm font-semibold mb-3">Zuweisung</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Agentur</label>
                    <select
                      value={selectedLead.agencyId}
                      onChange={e => changeAgency(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Mitarbeiter</label>
                    <select
                      value={selectedLead.employeeId}
                      onChange={e => changeEmployee(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Add Note */}
              <section>
                <h4 className="text-sm font-semibold mb-3">Notiz hinzufügen</h4>
                <div className="flex gap-2">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNote()}
                    placeholder="Notiz schreiben..."
                    className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={addNote}
                    disabled={!noteText.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Hinzufügen
                  </button>
                </div>
              </section>

              {/* Activity History */}
              <section>
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
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
