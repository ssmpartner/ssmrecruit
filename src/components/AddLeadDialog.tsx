import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import AddressAutocomplete, { type AddressSuggestion } from './AddressAutocomplete';
import { Plus, CalendarIcon, Phone, Video, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useLeads } from '@/context/useLeads';
import { searchPlz, lookupPlz, swissLocations } from '@/lib/swiss-plz';
import { type LeadStatus } from '@/lib/mock-data';
import { useAuth } from '@/context/AuthContext';

const SWISS_PHONE_REGEX = /^\+41\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/;

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  plz: string;
  city: string;
  canton: string;
  cantonCode: string;
  position: string;
  source: string;
  notes: string;
  agencyId: string;
  employeeId: string;
  birthDate: string;
}

const emptyForm: FormState = {
  name: '', email: '', phone: '+41 ', address: '', plz: '', city: '', canton: '', cantonCode: '',
  position: '', source: 'website', notes: '', agencyId: '', employeeId: '', birthDate: '',
};

type Step = 'lead' | 'ask' | 'appointment';

const appointmentTypeConfig = {
  phone: { label: 'Telefon', icon: Phone },
  video: { label: 'Video-Call', icon: Video },
  onsite: { label: 'Vor Ort', icon: Building2 },
} as const;

// Dropdown suggestion component
function SuggestionDropdown({ items, onSelect, visible }: { items: { label: string; sub?: string }[]; onSelect: (idx: number) => void; visible: boolean }) {
  if (!visible || items.length === 0) return null;
  return (
    <div className="absolute z-50 top-full left-0 right-0 mt-0.5 rounded-lg border bg-popover shadow-md max-h-40 overflow-y-auto">
      {items.map((item, i) => (
        <button key={i} type="button" onMouseDown={(e) => { e.preventDefault(); onSelect(i); }}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors flex items-center justify-between">
          <span>{item.label}</span>
          {item.sub && <span className="text-xs text-muted-foreground">{item.sub}</span>}
        </button>
      ))}
    </div>
  );
}

export default function AddLeadDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const { addLead, agencies, employees, addAppointment, leads, leadSources } = useLeads();
  const { profile, isSuperadmin, user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [step, setStep] = useState<Step>('lead');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);

  // Resolve current user's employee record (used to auto-assign for non-superadmins
  // so manually created leads always land in their own scope and stay findable).
  const myEmployee = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase();
    if (!userEmail) return undefined;
    return employees.find(e => (e.email || '').toLowerCase() === userEmail);
  }, [employees, user]);

  // Auto-fill agency + employee for non-superadmins whenever the dialog opens
  // or the employee record becomes available.
  useEffect(() => {
    if (!open) return;
    if (isSuperadmin) return;
    if (!myEmployee) return;
    setForm(prev => {
      if (prev.agencyId === myEmployee.agencyId && prev.employeeId === myEmployee.id) return prev;
      return { ...prev, agencyId: myEmployee.agencyId, employeeId: myEmployee.id };
    });
  }, [open, isSuperadmin, myEmployee]);

  // Suggestion states
  const [plzFocused, setPlzFocused] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);
  const [cantonFocused, setCantonFocused] = useState(false);

  // Appointment form
  const [aptForm, setAptForm] = useState({ title: '', date: undefined as Date | undefined, time: '09:00', duration: 30, type: 'phone' as 'phone' | 'video' | 'onsite', notes: '' });

  // Build unique city/canton lists from DB leads + swiss-plz
  const dbLocations = useMemo(() => {
    const map = new Map<string, { city: string; canton: string; cantonCode: string; plz: string }>();
    for (const l of leads) {
      if (l.city && l.plz) {
        const key = `${l.plz}-${l.city}`;
        if (!map.has(key)) map.set(key, { city: l.city, canton: l.canton, cantonCode: l.cantonCode, plz: l.plz });
      }
    }
    return Array.from(map.values());
  }, [leads]);

  const set = useCallback((key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  // PLZ suggestions: from swiss-plz + DB leads
  const plzSuggestions = useMemo(() => {
    if (!form.plz || form.plz.length < 1) return [];
    const q = form.plz;
    const fromSwiss = searchPlz(q).map(l => ({ plz: l.plz, city: l.city, canton: l.canton, cantonCode: l.cantonCode }));
    const fromDb = dbLocations.filter(l => l.plz.startsWith(q)).slice(0, 5);
    // Merge, deduplicate by plz
    const seen = new Set<string>();
    const merged: typeof fromSwiss = [];
    for (const item of [...fromDb, ...fromSwiss]) {
      if (!seen.has(item.plz)) { seen.add(item.plz); merged.push(item); }
    }
    return merged.slice(0, 8);
  }, [form.plz, dbLocations]);

  // City suggestions
  const citySuggestions = useMemo(() => {
    if (!form.city || form.city.length < 1) return [];
    const q = form.city.toLowerCase();
    const fromSwiss = swissLocations.filter(l => l.city.toLowerCase().includes(q)).map(l => ({ city: l.city, canton: l.canton, cantonCode: l.cantonCode, plz: l.plz }));
    const fromDb = dbLocations.filter(l => l.city.toLowerCase().includes(q));
    const seen = new Set<string>();
    const merged: typeof fromSwiss = [];
    for (const item of [...fromDb, ...fromSwiss]) {
      const key = `${item.city}-${item.cantonCode}`;
      if (!seen.has(key)) { seen.add(key); merged.push(item); }
    }
    return merged.slice(0, 8);
  }, [form.city, dbLocations]);

  // Canton suggestions
  const cantonSuggestions = useMemo(() => {
    if (!form.canton || form.canton.length < 1) return [];
    const q = form.canton.toLowerCase();
    const allCantons = [...new Set(swissLocations.map(l => l.canton))].sort();
    const dbCantons = [...new Set(dbLocations.map(l => l.canton).filter(Boolean))];
    const merged = [...new Set([...dbCantons, ...allCantons])];
    return merged.filter(c => c.toLowerCase().includes(q)).slice(0, 8);
  }, [form.canton, dbLocations]);

  const handlePlzSelect = useCallback((item: { plz: string; city: string; canton: string; cantonCode: string }) => {
    setForm(prev => ({ ...prev, plz: item.plz, city: item.city, canton: item.canton, cantonCode: item.cantonCode }));
    setPlzFocused(false);
    setErrors(prev => ({ ...prev, plz: undefined, city: undefined }));
  }, []);

  const handlePlzChange = useCallback((value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    set('plz', clean);
    if (clean.length === 4) {
      const match = lookupPlz(clean);
      if (match) {
        setForm(prev => ({ ...prev, plz: clean, city: match.city, canton: match.canton, cantonCode: match.cantonCode }));
      }
    }
  }, [set]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = 'Name ist erforderlich';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Gültige E-Mail erforderlich';
    if (!SWISS_PHONE_REGEX.test(form.phone.replace(/\s+/g, ' ').trim())) errs.phone = 'Format: +41 XX XXX XX XX';
    if (!form.plz || form.plz.length !== 4) errs.plz = 'Gültige PLZ erforderlich';
    if (!form.city) errs.city = 'Ort wird benötigt';
    // position (Anrede) is optional now
    if (!form.agencyId) errs.agencyId = 'Agentur wählen';
    if (!form.employeeId) errs.employeeId = 'Mitarbeiter wählen';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitLead = () => {
    if (!validate()) return;
    addLead({
      name: form.name.trim(),
      salutation: '',
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      plz: form.plz,
      city: form.city,
      canton: form.canton,
      cantonCode: form.cantonCode,
      position: form.position.trim(),
      source: form.source as any,
      status: 'new' as LeadStatus,
      agencyId: form.agencyId,
      employeeId: form.employeeId,
      notes: form.notes.trim(),
      campaign: '',
      lifecycle: 'active',
    });
    // Find the newly created lead ID (latest one)
    setTimeout(() => {
      // The lead was just added, grab it from context on next render
      setStep('ask');
    }, 0);
    setStep('ask');
  };

  const handleCreateAppointment = () => {
    if (!aptForm.title.trim() || !aptForm.date) return;
    // Find the latest lead (the one just created)
    const latestLead = leads[0];
    if (!latestLead) return;
    addAppointment({
      leadId: latestLead.id,
      title: aptForm.title.trim(),
      date: format(aptForm.date, 'yyyy-MM-dd'),
      time: aptForm.time,
      duration: aptForm.duration,
      type: aptForm.type,
      notes: aptForm.notes.trim(),
      createdBy: profile?.display_name || 'System',
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setForm(emptyForm);
    setStep('lead');
    setCreatedLeadId(null);
    setAptForm({ title: '', date: undefined, time: '09:00', duration: 30, type: 'phone', notes: '' });
    setOpen(false);
  };

  const inputCls = (key: keyof FormState) =>
    `h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring ${errors[key] ? 'border-destructive' : ''}`;
  const fieldCls = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Neuer Lead
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Step 1: Lead form */}
        {step === 'lead' && (
          <>
            <DialogHeader>
              <DialogTitle>Lead manuell erfassen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Anrede</label>
                  <select value={form.position} onChange={e => set('position', e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                    <option value="">–</option>
                    <option value="Herr">Herr</option>
                    <option value="Frau">Frau</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls('name')} placeholder="Max Muster" maxLength={100} />
                  {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">E-Mail *</label>
                  <input value={form.email} onChange={e => set('email', e.target.value)} className={inputCls('email')} type="email" placeholder="max@example.ch" maxLength={255} />
                  {errors.email && <p className="text-xs text-destructive mt-0.5">{errors.email}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Telefon *</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls('phone')} placeholder="+41 79 123 45 67" maxLength={20} />
                  {errors.phone && <p className="text-xs text-destructive mt-0.5">{errors.phone}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Strasse / Nr.</label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={val => set('address', val)}
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
                  placeholder="Bahnhofstrasse 1"
                  className={errors.address ? 'border-destructive ring-1 ring-destructive/30' : ''}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <label className="text-xs font-medium text-muted-foreground">PLZ *</label>
                  <input value={form.plz} onChange={e => handlePlzChange(e.target.value)}
                    onFocus={() => setPlzFocused(true)} onBlur={() => setTimeout(() => setPlzFocused(false), 150)}
                    className={inputCls('plz')} placeholder="8001" maxLength={4} autoComplete="off" />
                  {errors.plz && <p className="text-xs text-destructive mt-0.5">{errors.plz}</p>}
                  <SuggestionDropdown visible={plzFocused && plzSuggestions.length > 0 && form.plz.length >= 1 && form.plz.length < 4}
                    items={plzSuggestions.map(s => ({ label: `${s.plz} ${s.city}`, sub: s.cantonCode }))}
                    onSelect={(i) => handlePlzSelect(plzSuggestions[i])} />
                </div>
                <div className="relative">
                  <label className="text-xs font-medium text-muted-foreground">Ort</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)}
                    onFocus={() => setCityFocused(true)} onBlur={() => setTimeout(() => setCityFocused(false), 150)}
                    className={inputCls('city')} placeholder="Zürich" maxLength={100} autoComplete="off" />
                  {errors.city && <p className="text-xs text-destructive mt-0.5">{errors.city}</p>}
                  <SuggestionDropdown visible={cityFocused && citySuggestions.length > 0 && form.city.length >= 1}
                    items={citySuggestions.map(s => ({ label: s.city, sub: `${s.plz} ${s.cantonCode}` }))}
                    onSelect={(i) => {
                      const s = citySuggestions[i];
                      setForm(prev => ({ ...prev, city: s.city, plz: s.plz, canton: s.canton, cantonCode: s.cantonCode }));
                      setCityFocused(false);
                    }} />
                </div>
                <div className="relative">
                  <label className="text-xs font-medium text-muted-foreground">Kanton</label>
                  <input value={form.canton} onChange={e => set('canton', e.target.value)}
                    onFocus={() => setCantonFocused(true)} onBlur={() => setTimeout(() => setCantonFocused(false), 150)}
                    className={inputCls('canton')} placeholder="Zürich" maxLength={50} autoComplete="off" />
                  <SuggestionDropdown visible={cantonFocused && cantonSuggestions.length > 0 && form.canton.length >= 1}
                    items={cantonSuggestions.map(c => ({ label: c }))}
                    onSelect={(i) => {
                      const canton = cantonSuggestions[i];
                      const loc = swissLocations.find(l => l.canton === canton);
                      setForm(prev => ({ ...prev, canton, cantonCode: loc?.cantonCode || prev.cantonCode }));
                      setCantonFocused(false);
                    }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Quelle</label>
                  <select value={form.source} onChange={e => set('source', e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none">
                    {leadSources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Agentur *</label>
                  <select
                    value={form.agencyId}
                    onChange={e => set('agencyId', e.target.value)}
                    className={inputCls('agencyId') + (!isSuperadmin ? ' opacity-70 cursor-not-allowed' : '')}
                    disabled={!isSuperadmin}
                  >
                    <option value="">Wählen…</option>
                    {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {errors.agencyId && <p className="text-xs text-destructive mt-0.5">{errors.agencyId}</p>}
                  {!isSuperadmin && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Automatisch deine Agentur</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Mitarbeiter *</label>
                  <select
                    value={form.employeeId}
                    onChange={e => set('employeeId', e.target.value)}
                    className={inputCls('employeeId') + (!isSuperadmin ? ' opacity-70 cursor-not-allowed' : '')}
                    disabled={!isSuperadmin}
                  >
                    <option value="">Wählen…</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  {errors.employeeId && <p className="text-xs text-destructive mt-0.5">{errors.employeeId}</p>}
                  {!isSuperadmin && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Automatisch dir zugewiesen</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notizen</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} maxLength={1000} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Zusätzliche Informationen…" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => resetAndClose()} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                  Abbrechen
                </button>
                <button onClick={handleSubmitLead} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                  Lead erfassen
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Ask */}
        {step === 'ask' && (
          <>
            <DialogHeader>
              <DialogTitle>Lead erfolgreich erstellt ✓</DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="rounded-lg border bg-success/10 p-4 text-center">
                <p className="text-sm font-medium text-success">
                  <strong>{form.name}</strong> wurde als neuer Lead erfasst.
                </p>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Was möchten Sie als Nächstes tun?
              </p>
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-3">
                  <button onClick={() => { setForm(emptyForm); setErrors({}); setStep('lead'); }}
                    className="inline-flex items-center gap-2 rounded-lg border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors">
                    <Plus className="h-4 w-4" /> Weiteren Lead erfassen
                  </button>
                  <button onClick={() => setStep('appointment')}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                    <CalendarIcon className="h-4 w-4" /> Termin erstellen
                  </button>
                </div>
                <button onClick={resetAndClose}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1">
                  Fertig
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Appointment form */}
        {step === 'appointment' && (
          <>
            <DialogHeader>
              <DialogTitle>Termin für {form.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Titel *</label>
                  <input value={aptForm.title} onChange={e => setAptForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="z.B. Erstgespräch" maxLength={100} className={fieldCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Art</label>
                  <select value={aptForm.type} onChange={e => setAptForm(prev => ({ ...prev, type: e.target.value as 'phone' | 'video' | 'onsite' }))}
                    className={fieldCls}>
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
                      <button className={cn(fieldCls, 'flex items-center gap-2 text-left', !aptForm.date && 'text-muted-foreground')}>
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {aptForm.date ? format(aptForm.date, 'dd.MM.yyyy') : 'Datum wählen'}
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
                  <label className="text-xs font-medium text-muted-foreground">Uhrzeit *</label>
                  <input type="time" value={aptForm.time} onChange={e => setAptForm(prev => ({ ...prev, time: e.target.value }))}
                    className={fieldCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Dauer (Min.)</label>
                  <select value={aptForm.duration} onChange={e => setAptForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
                    className={fieldCls}>
                    <option value={15}>15 Min.</option>
                    <option value={30}>30 Min.</option>
                    <option value={45}>45 Min.</option>
                    <option value={60}>60 Min.</option>
                    <option value={90}>90 Min.</option>
                  </select>
                </div>
              </div>
              {aptForm.type === 'video' && (
                <div className="rounded-lg border bg-info/10 p-3 flex items-center gap-2">
                  <Video className="h-4 w-4 text-info" />
                  <p className="text-xs text-info">Ein Video-Call Link wird automatisch generiert.</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notizen</label>
                <textarea value={aptForm.notes} onChange={e => setAptForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2} maxLength={500} placeholder="Zusätzliche Infos..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={resetAndClose}
                  className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                  Überspringen
                </button>
                <button disabled={!aptForm.title.trim() || !aptForm.date}
                  onClick={handleCreateAppointment}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                  Termin speichern
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
