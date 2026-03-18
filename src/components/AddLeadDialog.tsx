import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLeads } from '@/context/LeadsContext';
import { lookupPlz } from '@/lib/swiss-plz';
import { type LeadSource, type LeadStatus, sourceConfig } from '@/lib/mock-data';

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
  source: LeadSource;
  notes: string;
  agencyId: string;
  employeeId: string;
}

const emptyForm: FormState = {
  name: '', email: '', phone: '+41 ', address: '', plz: '', city: '', canton: '', cantonCode: '',
  position: '', source: 'website', notes: '', agencyId: '', employeeId: '',
};

export default function AddLeadDialog() {
  const { addLead, agencies, employees } = useLeads();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = useCallback((key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  const handlePlzChange = useCallback((value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    set('plz', clean);
    if (clean.length === 4) {
      const match = lookupPlz(clean);
      if (match) {
        setForm(prev => ({ ...prev, plz: clean, city: match.city, canton: match.canton, cantonCode: match.cantonCode }));
      }
    } else {
      setForm(prev => ({ ...prev, city: '', canton: '', cantonCode: '' }));
    }
  }, [set]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = 'Name ist erforderlich';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Gültige E-Mail erforderlich';
    if (!SWISS_PHONE_REGEX.test(form.phone.replace(/\s+/g, ' ').trim())) errs.phone = 'Format: +41 XX XXX XX XX';
    if (!form.plz || form.plz.length !== 4) errs.plz = 'Gültige PLZ erforderlich';
    if (!form.city) errs.city = 'Ort wird benötigt';
    if (!form.position.trim()) errs.position = 'Position erforderlich';
    if (!form.agencyId) errs.agencyId = 'Agentur wählen';
    if (!form.employeeId) errs.employeeId = 'Mitarbeiter wählen';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    addLead({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      plz: form.plz,
      city: form.city,
      canton: form.canton,
      cantonCode: form.cantonCode,
      position: form.position.trim(),
      source: form.source,
      status: 'new' as LeadStatus,
      agencyId: form.agencyId,
      employeeId: form.employeeId,
      notes: form.notes.trim(),
    });
    setForm(emptyForm);
    setOpen(false);
  };

  const inputCls = (key: keyof FormState) =>
    `h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring ${errors[key] ? 'border-destructive' : ''}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Neuer Lead
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead manuell erfassen</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name & Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls('name')} placeholder="Max Muster" maxLength={100} />
              {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Position *</label>
              <input value={form.position} onChange={e => set('position', e.target.value)} className={inputCls('position')} placeholder="z.B. Pflegefachperson" maxLength={100} />
              {errors.position && <p className="text-xs text-destructive mt-0.5">{errors.position}</p>}
            </div>
          </div>

          {/* Email & Phone */}
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

          {/* Address */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Strasse / Nr.</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls('address')} placeholder="Bahnhofstrasse 1" maxLength={200} />
          </div>

          {/* PLZ, City, Canton */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">PLZ *</label>
              <input value={form.plz} onChange={e => handlePlzChange(e.target.value)} className={inputCls('plz')} placeholder="8001" maxLength={4} />
              {errors.plz && <p className="text-xs text-destructive mt-0.5">{errors.plz}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ort</label>
              <input value={form.city} readOnly className="h-9 w-full rounded-lg border bg-muted px-3 text-sm outline-none" />
              {errors.city && <p className="text-xs text-destructive mt-0.5">{errors.city}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Kanton</label>
              <input value={form.cantonCode ? `${form.canton} (${form.cantonCode})` : ''} readOnly className="h-9 w-full rounded-lg border bg-muted px-3 text-sm outline-none" />
            </div>
          </div>

          {/* Source, Agency, Employee */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Quelle</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none">
                {Object.entries(sourceConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Agentur *</label>
              <select value={form.agencyId} onChange={e => set('agencyId', e.target.value)} className={inputCls('agencyId')}>
                <option value="">Wählen…</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.agencyId && <p className="text-xs text-destructive mt-0.5">{errors.agencyId}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mitarbeiter *</label>
              <select value={form.employeeId} onChange={e => set('employeeId', e.target.value)} className={inputCls('employeeId')}>
                <option value="">Wählen…</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {errors.employeeId && <p className="text-xs text-destructive mt-0.5">{errors.employeeId}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notizen</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} maxLength={1000} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Zusätzliche Informationen…" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
              Abbrechen
            </button>
            <button onClick={handleSubmit} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              Lead erfassen
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
