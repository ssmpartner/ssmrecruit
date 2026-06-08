import { useState, useCallback } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Upload, X, File, ChevronRight } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface FileEntry {
  file: File;
  field: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

export default function ApplicationFormPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form state
  const [form, setForm] = useState({
    salutation: '',
    first_name: '',
    last_name: '',
    birth_date: '',
    address: '',
    zip: '',
    city: '',
    country: 'Schweiz',
    email: '',
    phone: '',
    strengths: '',
    video_link: '',
    employee_referral: '',
    side_job: '',
    source: '',
    desired_region: '',
    consent_privacy: false,
    consent_email_contract: false,
  });

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [motivationFile, setMotivationFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  const set = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!form.first_name.trim()) errs.first_name = 'Vorname ist erforderlich';
      if (!form.last_name.trim()) errs.last_name = 'Nachname ist erforderlich';
      if (!form.email.trim()) errs.email = 'E-Mail ist erforderlich';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Ungültige E-Mail-Adresse';
    }
    if (s === 1 && !cvFile) {
      errs.cv = 'Lebenslauf ist erforderlich';
    }
    if (s === 2 && !form.consent_privacy) {
      errs.consent_privacy = 'Datenschutzerklärung muss akzeptiert werden';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 2));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleFileSelect = (setter: (f: File | null) => void, maxOne: true) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > MAX_FILE_SIZE) { setError('Datei zu gross (max. 20 MB)'); return; }
      setter(f);
      setError('');
    };

  const addAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const valid = Array.from(files).filter(f => f.size <= MAX_FILE_SIZE);
    setAttachments(prev => [...prev, ...valid]);
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  async function handleSubmit() {
    if (!validateStep(2)) return;
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();

      // Candidate fields
      Object.entries(form).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          formData.append(key, value ? 'true' : 'false');
        } else {
          formData.append(key, String(value));
        }
      });

      // Files
      if (cvFile) formData.append('cv', cvFile);
      if (motivationFile) formData.append('motivation_letter', motivationFile);
      attachments.forEach(f => formData.append('attachments', f));

      const res = await fetch(`${SUPABASE_URL}/functions/v1/application-webhook`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY },
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Übermittlung fehlgeschlagen');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Shell>
        <div className="text-center py-12">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Bewerbung eingereicht</h2>
          <p className="text-slate-600 max-w-md mx-auto">
            Vielen Dank für Ihre Bewerbung. Wir werden uns in Kürze bei Ihnen melden.
          </p>
        </div>
      </Shell>
    );
  }

  const steps = ['Persönliche Daten', 'Dokumente & Details', 'Bestätigung'];

  return (
    <Shell>
      {/* Stepper */}
      <div className="flex items-center justify-center gap-1 mb-8">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <button
              onClick={() => { if (i < step) setStep(i); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2 mb-6">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Step 0: Personal Data */}
      {step === 0 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-slate-900">Persönliche Daten</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldSelect label="Anrede" value={form.salutation} onChange={v => set('salutation', v)}
              options={[{ value: '', label: 'Bitte wählen' }, { value: 'Herr', label: 'Herr' }, { value: 'Frau', label: 'Frau' }]} />
            <FieldInput label="Vorname" required value={form.first_name} onChange={v => set('first_name', v)} error={fieldErrors.first_name} />
            <FieldInput label="Nachname" required value={form.last_name} onChange={v => set('last_name', v)} error={fieldErrors.last_name} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="E-Mail" required type="email" value={form.email} onChange={v => set('email', v)} error={fieldErrors.email} />
            <FieldInput label="Telefon" type="tel" value={form.phone} onChange={v => set('phone', v)} />
          </div>

          <FieldInput label="Geburtsdatum" type="date" value={form.birth_date} onChange={v => set('birth_date', v)} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <FieldInput label="Strasse / Hausnummer" value={form.address} onChange={v => set('address', v)} />
            </div>
            <FieldInput label="PLZ" value={form.zip} onChange={v => set('zip', v)} />
            <FieldInput label="Wohnort" value={form.city} onChange={v => set('city', v)} />
          </div>

          <FieldInput label="Land" value={form.country} onChange={v => set('country', v)} />

          <div className="flex justify-end pt-2">
            <button onClick={nextStep} className="btn-primary">Weiter</button>
          </div>
        </div>
      )}

      {/* Step 1: Documents & Details */}
      {step === 1 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-slate-900">Dokumente & weitere Angaben</h3>

          <FileUpload label="Lebenslauf (CV)" required file={cvFile} onSelect={handleFileSelect(setCvFile, true)} onRemove={() => setCvFile(null)} error={fieldErrors.cv} />
          <FileUpload label="Motivationsschreiben" file={motivationFile} onSelect={handleFileSelect(setMotivationFile, true)} onRemove={() => setMotivationFile(null)} />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Weitere Beilagen</label>
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 bg-slate-50 rounded-lg px-3 py-2">
                <File className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-700 truncate flex-1">{f.name}</span>
                <button onClick={() => removeAttachment(i)} className="text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <label className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
              <Upload className="h-4 w-4" /> Datei hinzufügen
              <input type="file" multiple accept={ALLOWED_TYPES.join(',')} onChange={addAttachment} className="hidden" />
            </label>
          </div>

          <FieldTextarea label="Was zeichnet dich für diese Stelle aus?" value={form.strengths} onChange={v => set('strengths', v)} />
          <FieldInput label="Link auf Videobewerbung (optional)" value={form.video_link} onChange={v => set('video_link', v)} placeholder="https://..." />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="Mitarbeiterempfehlung" value={form.employee_referral} onChange={v => set('employee_referral', v)} placeholder="Name des Mitarbeiters" />
            <FieldInput label="Nebenbeschäftigung" value={form.side_job} onChange={v => set('side_job', v)} />
          </div>

          <FieldSelect label="Wie hast du von dieser Stelle erfahren?" value={form.source} onChange={v => set('source', v)}
            options={[
              { value: '', label: 'Bitte wählen' },
              { value: 'website', label: 'Website' },
              { value: 'social_media', label: 'Social Media' },
              { value: 'empfehlung', label: 'Empfehlung' },
              { value: 'jobportal', label: 'Jobportal' },
              { value: 'messe', label: 'Messe / Event' },
              { value: 'sonstiges', label: 'Sonstiges' },
            ]}
          />

          <FieldInput label="Wunschagentur oder Region" value={form.desired_region} onChange={v => set('desired_region', v)} placeholder="z.B. Zürich, Bern, Luzern..." />

          <div className="flex justify-between pt-2">
            <button onClick={prevStep} className="btn-secondary">Zurück</button>
            <button onClick={nextStep} className="btn-primary">Weiter</button>
          </div>
        </div>
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-slate-900">Bestätigung</h3>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-5 space-y-3 text-sm">
            <SummaryRow label="Name" value={`${form.salutation} ${form.first_name} ${form.last_name}`.trim()} />
            <SummaryRow label="E-Mail" value={form.email} />
            {form.phone && <SummaryRow label="Telefon" value={form.phone} />}
            {form.city && <SummaryRow label="Ort" value={`${form.zip} ${form.city}`.trim()} />}
            <SummaryRow label="Lebenslauf" value={cvFile?.name || '—'} />
            {motivationFile && <SummaryRow label="Motivationsschreiben" value={motivationFile.name} />}
            {attachments.length > 0 && <SummaryRow label="Beilagen" value={`${attachments.length} Datei(en)`} />}
          </div>

          {/* Consents */}
          <div className="space-y-3">
            <Checkbox
              label="Ich bin damit einverstanden, Vertragsunterlagen per E-Mail zu erhalten."
              checked={form.consent_email_contract}
              onChange={v => set('consent_email_contract', v)}
            />
            <Checkbox
              label={<>Ich akzeptiere die <a href="#" className="text-blue-600 underline">Datenschutzerklärung</a>. <span className="text-red-500">*</span></>}
              checked={form.consent_privacy}
              onChange={v => set('consent_privacy', v)}
              error={fieldErrors.consent_privacy}
            />
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={prevStep} className="btn-secondary">Zurück</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet...</> : 'Bewerbung absenden'}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ─── Sub-components ────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold tracking-tight">SSM Recruit</h1>
            <p className="text-blue-100 mt-1 text-sm">Jetzt bewerben – einfach, schnell und sicher.</p>
          </div>
          <div className="p-6 sm:p-8">{children}</div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">© SSM Recruit • Ihre Daten werden vertraulich behandelt.</p>
      </div>
    </div>
  );
}

function FieldInput({ label, required, error, onChange, ...props }: {
  label: string; required?: boolean; error?: string; onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        className={`w-full h-10 rounded-lg border px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${error ? 'border-red-400' : 'border-slate-200'}`}
        onChange={e => onChange(e.target.value)}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function FieldTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <textarea
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow min-h-[80px]"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function FileUpload({ label, required, file, onSelect, onRemove, error }: {
  label: string; required?: boolean; file: File | null;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void; error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {file ? (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <File className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-slate-700 truncate flex-1">{file.name}</span>
          <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</span>
          <button onClick={onRemove} className="text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-4 cursor-pointer transition-colors hover:border-blue-400 hover:bg-blue-50/30 ${error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
          <Upload className="h-5 w-5 text-slate-400" />
          <span className="text-sm text-slate-500">Datei auswählen</span>
          <input type="file" accept={ALLOWED_TYPES.join(',')} onChange={onSelect} className="hidden" />
        </label>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function Checkbox({ label, checked, onChange, error }: {
  label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; error?: string;
}) {
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-slate-700">{label}</span>
      </label>
      {error && <p className="text-xs text-red-600 mt-1 ml-7">{error}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
