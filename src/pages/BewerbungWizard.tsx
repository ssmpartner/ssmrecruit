import { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Upload, X, File, ChevronRight, ChevronLeft, Briefcase, TrendingUp, ArrowRight, Info } from 'lucide-react';
import bewerbungHero from '@/assets/bewerbung-hero.jpg';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

type ApplicationType = '' | 'operations' | 'finanzcoach';
type OperationsChoice = '' | 'spontan' | 'finanzcoach_switch' | 'exit';
type EducationStatus = '' | 'vbv' | 'iaf' | 'hoehere_ausbildung' | 'quereinsteiger';

interface WizardConfig {
  operations_open: boolean;
  hiring_periods: { label: string; value: string }[];
  agencies: { id: string; name: string }[];
}

const SOURCE_OPTIONS = [
  { value: '', label: 'Bitte wählen' },
  { value: 'ssm_website', label: 'SSM Website' },
  { value: 'mitarbeiterempfehlung', label: 'Mitarbeiterempfehlung' },
  { value: 'jobs_ch', label: 'jobs.ch' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'suchmaschine', label: 'Suchmaschine' },
  { value: 'social_media_other', label: 'Andere Social Media' },
  { value: 'messe_event', label: 'Messe/Event' },
  { value: 'empfehlung', label: 'Empfehlung' },
];

const SIDE_JOB_OPTIONS = [
  { value: '', label: 'Bitte wählen' },
  { value: 'ja', label: 'Ja' },
  { value: 'nein', label: 'Nein' },
];

export default function BewerbungWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Config loaded from backend
  const [config, setConfig] = useState<WizardConfig>({ operations_open: false, hiring_periods: [], agencies: [] });
  const [configLoading, setConfigLoading] = useState(true);

  // Step 1: Position
  const [applicationType, setApplicationType] = useState<ApplicationType>('');
  const [operationsChoice, setOperationsChoice] = useState<OperationsChoice>('');
  const [educationStatus, setEducationStatus] = useState<EducationStatus>('');

  // Step 2: Personal
  const [form, setForm] = useState({
    salutation: '', first_name: '', last_name: '', birth_date: '',
    address: '', zip: '', city: '', country: 'Schweiz',
    email: '', phone: '',
  });

  // Step 3: Documents
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [motivationFile, setMotivationFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Step 4: Details
  const [details, setDetails] = useState({
    strengths: '', video_link: '', referral: '', side_job: '',
    source: '', desired_agency: '',
  });

  // Step 5: Finanzcoach hiring period
  const [hiringPeriod, setHiringPeriod] = useState('');

  // Step 6: Confirmation
  const [consents, setConsents] = useState({
    email_contract: '', visana: '', captcha_answer: '', privacy: false,
  });

  // Captcha
  const [captchaA] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [captchaB] = useState(() => Math.floor(Math.random() * 20) + 1);
  const captchaCorrect = captchaA + captchaB;

  // Load config
  useEffect(() => {
    async function load() {
      try {
        const headers: Record<string, string> = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };

        // Load agencies
        const agenciesRes = await fetch(`${SUPABASE_URL}/rest/v1/agencies?select=id,name&order=name`, { headers });
        const agenciesData = await agenciesRes.json();

        // Load wizard config from app_settings
        const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?key=eq.application_wizard`, { headers });
        const settingsData = await settingsRes.json();

        const wizardConfig = settingsData?.[0]?.value || {};
        setConfig({
          operations_open: wizardConfig.operations_open ?? false,
          hiring_periods: wizardConfig.hiring_periods ?? [],
          agencies: Array.isArray(agenciesData) ? agenciesData : [],
        });
      } catch (e) {
        console.error('Config load error:', e);
      } finally {
        setConfigLoading(false);
      }
    }
    load();
  }, []);

  const isFinanzcoach = applicationType === 'finanzcoach' ||
    (applicationType === 'operations' && operationsChoice === 'finanzcoach_switch');

  // Dynamic steps based on selection
  const steps = useMemo(() => {
    const base = ['Position', 'Persönliches', 'Dokumente', 'Angaben'];
    if (isFinanzcoach && config.hiring_periods.length > 0) base.push('Zeitraum');
    base.push('Bestätigung');
    return base;
  }, [isFinanzcoach, config.hiring_periods.length]);

  const totalSteps = steps.length;

  const set = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const setDetail = (key: string, value: string) => {
    setDetails(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!applicationType) errs.applicationType = 'Bitte wähle eine Option';
      if (applicationType === 'operations' && !config.operations_open && !operationsChoice) errs.operationsChoice = 'Bitte wähle eine Option';
      if (applicationType === 'operations' && operationsChoice === 'exit') return false;
      if (isFinanzcoach && !educationStatus) errs.educationStatus = 'Bitte wähle eine Option';
    }
    if (s === 1) {
      if (!form.salutation) errs.salutation = 'Bitte wählen';
      if (!form.first_name.trim()) errs.first_name = 'Vorname ist erforderlich';
      if (!form.last_name.trim()) errs.last_name = 'Nachname ist erforderlich';
      if (!form.email.trim()) errs.email = 'E-Mail ist erforderlich';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Ungültige E-Mail-Adresse';
      if (!form.phone.trim()) errs.phone = 'Telefon ist erforderlich';
    }
    if (s === 2) {
      if (!cvFile) errs.cv = 'Lebenslauf ist erforderlich';
    }
    // Step for confirmation (last step)
    const confirmStep = totalSteps - 1;
    if (s === confirmStep) {
      if (!consents.email_contract) errs.email_contract = 'Bitte wählen';
      if (!consents.visana) errs.visana = 'Bitte wählen';
      if (String(consents.captcha_answer).trim() !== String(captchaCorrect)) errs.captcha = 'Falsche Antwort';
      if (!consents.privacy) errs.privacy = 'Datenschutzerklärung muss akzeptiert werden';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep(s => Math.min(s + 1, totalSteps - 1));
  };
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0));

  const handleFileSelect = (setter: (f: File | null) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > MAX_FILE_SIZE) { setError('Datei zu gross (max. 10 MB)'); return; }
      setter(f);
      setError('');
    };

  const addAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setAttachments(prev => [...prev, ...Array.from(files).filter(f => f.size <= MAX_FILE_SIZE)]);
  };

  async function handleSubmit() {
    if (!validateStep(totalSteps - 1)) return;
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();

      // Personal data
      Object.entries(form).forEach(([key, value]) => formData.append(key, String(value)));

      // Application metadata
      formData.append('application_type', isFinanzcoach ? 'finanzcoach' : 'operations');
      formData.append('education_status', educationStatus);
      formData.append('strengths', details.strengths);
      formData.append('video_link', details.video_link);
      formData.append('employee_referral', details.referral);
      formData.append('side_job', details.side_job);
      formData.append('source', details.source);
      formData.append('wunschagentur', details.desired_agency);
      formData.append('hiring_period', hiringPeriod);
      formData.append('consent_email_contract', consents.email_contract === 'ja' ? 'true' : 'false');
      formData.append('consent_privacy', consents.privacy ? 'true' : 'false');
      formData.append('consent_visana', consents.visana);
      formData.append('captcha_valid', 'true');
      formData.append('form_source', 'bewerbung_wizard');

      // Files
      if (cvFile) formData.append('cv', cvFile);
      if (motivationFile) formData.append('motivation_letter', motivationFile);
      attachments.forEach(f => formData.append('attachments', f));

      const res = await fetch(`${SUPABASE_URL}/functions/v1/application-webhook`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY },
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Übermittlung fehlgeschlagen');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setSubmitting(false);
    }
  }

  if (configLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3 font-heading">
            Vielen Dank für deine Bewerbung!
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Wir haben deine Unterlagen erhalten und werden diese sorgfältig prüfen.
            Du erhältst in Kürze eine Bestätigung per E-Mail.
          </p>
          <div className="bg-muted/50 rounded-xl p-5 max-w-md mx-auto text-left space-y-2">
            <h3 className="font-semibold text-sm text-foreground">Nächste Schritte:</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">1.</span> Bestätigungs-E-Mail erhalten</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">2.</span> Prüfung deiner Unterlagen</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">3.</span> Einladung zum persönlichen Gespräch</li>
            </ul>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {steps.map((label, i) => (
            <div key={i} className="flex flex-col items-center flex-1 relative">
              <button
                onClick={() => { if (i < currentStep) setCurrentStep(i); }}
                disabled={i > currentStep}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-heading transition-all z-10 ${
                  i < currentStep
                    ? 'bg-accent text-accent-foreground cursor-pointer hover:ring-2 hover:ring-accent/50'
                    : i === currentStep
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground cursor-default'
                }`}
              >
                {i < currentStep ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  i + 1
                )}
              </button>
              <span className={`mt-2 text-[11px] font-medium text-center leading-tight max-w-[80px] font-heading ${
                i === currentStep ? 'text-primary' : i < currentStep ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className={`absolute top-[18px] left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5 ${
                  i < currentStep ? 'bg-accent' : 'bg-border'
                }`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Schritt {currentStep + 1} von {totalSteps}
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex items-center gap-2 mb-6">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* STEP 0: Position Selection */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-foreground font-heading mb-1">
              Wo möchtest du dich bei der SSM bewerben?
            </h3>
            <p className="text-sm text-muted-foreground">Wähle den Bereich, der am besten zu dir passt.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <OptionCard
              selected={applicationType === 'operations'}
              onClick={() => { setApplicationType('operations'); setOperationsChoice(''); setEducationStatus(''); }}
              icon={<Briefcase className="h-6 w-6" />}
              title="Operations / Innendienst"
              description="Verwaltung, Organisation und Backoffice"
            />
            <OptionCard
              selected={applicationType === 'finanzcoach'}
              onClick={() => { setApplicationType('finanzcoach'); setOperationsChoice(''); setEducationStatus(''); }}
              icon={<TrendingUp className="h-6 w-6" />}
              title="Finanzcoach / Aussendienst"
              description="Beratung, Kundenkontakt und Vertrieb"
            />
          </div>
          {fieldErrors.applicationType && <p className="text-xs text-destructive">{fieldErrors.applicationType}</p>}

          {/* Operations: No open positions */}
          {applicationType === 'operations' && !config.operations_open && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground text-sm">Zurzeit haben wir keine offene Stelle in diesem Bereich.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wir freuen uns jedoch über deine spontane Bewerbung. Alternativ kannst du dich unverbindlich über den Finanzcoach informieren.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => setOperationsChoice('spontan')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    operationsChoice === 'spontan' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                  }`}>
                  Spontanbewerbung fortsetzen
                </button>
                <button onClick={() => { setOperationsChoice('finanzcoach_switch'); setApplicationType('operations'); }}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    operationsChoice === 'finanzcoach_switch' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                  }`}>
                  Zum Finanzcoach wechseln
                </button>
                <button onClick={() => setOperationsChoice('exit')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    operationsChoice === 'exit' ? 'bg-destructive/10 text-destructive border-destructive/30' : 'border-border hover:bg-muted text-muted-foreground'
                  }`}>
                  Wizard beenden
                </button>
              </div>
              {fieldErrors.operationsChoice && <p className="text-xs text-destructive">{fieldErrors.operationsChoice}</p>}
            </div>
          )}

          {/* Finanzcoach: Education question */}
          {isFinanzcoach && (
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Hast du bereits Erfahrung oder Ausbildung im Finanzbereich?</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: 'vbv' as EducationStatus, label: 'Ja – VBV', desc: 'Versicherungs-Vermittler' },
                  { value: 'iaf' as EducationStatus, label: 'Ja – IAF', desc: 'Intermediär-Aufsicht' },
                  { value: 'hoehere_ausbildung' as EducationStatus, label: 'Ja – Höhere Ausbildung', desc: 'Fachausweis o.Ä.' },
                  { value: 'quereinsteiger' as EducationStatus, label: 'Nein – Quereinsteiger', desc: 'Ich starte neu im Finanzbereich' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setEducationStatus(opt.value)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      educationStatus === opt.value ? 'bg-primary/5 border-primary' : 'border-border hover:bg-muted'
                    }`}>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {fieldErrors.educationStatus && <p className="text-xs text-destructive">{fieldErrors.educationStatus}</p>}
            </div>
          )}

          {operationsChoice === 'exit' && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Vielen Dank für dein Interesse. Besuche unsere Website für aktuelle Stellenangebote.
            </div>
          )}

          {operationsChoice !== 'exit' && (
            <div className="flex justify-end pt-2">
              <BtnPrimary onClick={nextStep}>Weiter <ChevronRight className="h-4 w-4" /></BtnPrimary>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: Personal Data */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-foreground font-heading">Persönliche Angaben</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldSelect label="Anrede" required value={form.salutation} onChange={v => set('salutation', v)} error={fieldErrors.salutation}
              options={[{ value: '', label: 'Bitte wählen' }, { value: 'Herr', label: 'Herr' }, { value: 'Frau', label: 'Frau' }]} />
            <FieldInput label="Vorname" required value={form.first_name} onChange={v => set('first_name', v)} error={fieldErrors.first_name} />
            <FieldInput label="Nachname" required value={form.last_name} onChange={v => set('last_name', v)} error={fieldErrors.last_name} />
          </div>

          <FieldInput label="Geburtsdatum" type="date" value={form.birth_date} onChange={v => set('birth_date', v)} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1"><FieldInput label="Strasse / Nr." value={form.address} onChange={v => set('address', v)} /></div>
            <FieldInput label="PLZ" value={form.zip} onChange={v => set('zip', v)} />
            <FieldInput label="Wohnort" value={form.city} onChange={v => set('city', v)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="Land" value={form.country} onChange={v => set('country', v)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="E-Mail" required type="email" value={form.email} onChange={v => set('email', v)} error={fieldErrors.email} />
            <FieldInput label="Telefon" required type="tel" value={form.phone} onChange={v => set('phone', v)} error={fieldErrors.phone} />
          </div>

          <StepNav onBack={prevStep} onNext={nextStep} />
        </div>
      )}

      {/* STEP 2: Documents */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-foreground font-heading">Dokumente</h3>

          <FileUpload label="Lebenslauf (CV)" required file={cvFile} onSelect={handleFileSelect(setCvFile)} onRemove={() => setCvFile(null)} error={fieldErrors.cv} />
          <FileUpload label="Motivationsschreiben (optional)" file={motivationFile} onSelect={handleFileSelect(setMotivationFile)} onRemove={() => setMotivationFile(null)} />

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Weitere Beilagen</label>
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 bg-muted rounded-lg px-3 py-2">
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground truncate flex-1">{f.name}</span>
                <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <label className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 cursor-pointer font-medium">
              <Upload className="h-4 w-4" /> Datei hinzufügen
              <input type="file" multiple accept={ALLOWED_TYPES.join(',')} onChange={addAttachment} className="hidden" />
            </label>
          </div>

          <StepNav onBack={prevStep} onNext={nextStep} />
        </div>
      )}

      {/* STEP 3: Details */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-foreground font-heading">Weitere Angaben</h3>

          <FieldTextarea label="Was zeichnet dich für diese Stelle aus?" value={details.strengths} onChange={v => setDetail('strengths', v)} />
          <FieldInput label="Link zur digitalen Bewerbung (optional)" value={details.video_link} onChange={v => setDetail('video_link', v)} placeholder="https://..." />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="Weiterempfohlen von" value={details.referral} onChange={v => setDetail('referral', v)} placeholder="Name" />
            <FieldSelect label="Nebenbeschäftigung" value={details.side_job} onChange={v => setDetail('side_job', v)} options={SIDE_JOB_OPTIONS} />
          </div>

          <FieldSelect label="Wie hast du von uns erfahren?" value={details.source} onChange={v => setDetail('source', v)} options={SOURCE_OPTIONS} />

          <FieldSelect label="Wunschagentur" value={details.desired_agency} onChange={v => setDetail('desired_agency', v)}
            options={[{ value: '', label: 'Bitte wählen' }, ...config.agencies.map(a => ({ value: a.name, label: a.name }))]} />

          <StepNav onBack={prevStep} onNext={nextStep} />
        </div>
      )}

      {/* STEP 4 (optional): Finanzcoach Hiring Period */}
      {currentStep === 4 && isFinanzcoach && config.hiring_periods.length > 0 && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-foreground font-heading">Gewünschter Einstellungszeitraum</h3>
          <p className="text-sm text-muted-foreground">Wähle den Zeitraum, in dem du starten möchtest.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.hiring_periods.map(p => (
              <button key={p.value} onClick={() => setHiringPeriod(p.value)}
                className={`text-left p-4 rounded-lg border transition-colors ${
                  hiringPeriod === p.value ? 'bg-primary/5 border-primary' : 'border-border hover:bg-muted'
                }`}>
                <p className="text-sm font-medium">{p.label}</p>
              </button>
            ))}
          </div>

          <StepNav onBack={prevStep} onNext={nextStep} />
        </div>
      )}

      {/* CONFIRMATION STEP (always last) */}
      {currentStep === totalSteps - 1 && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-foreground font-heading">Bestätigung</h3>

          {/* Summary */}
          <div className="bg-muted/50 rounded-xl p-5 space-y-2 text-sm">
            <SummaryRow label="Bereich" value={isFinanzcoach ? 'Finanzcoach / Aussendienst' : 'Operations / Innendienst'} />
            {educationStatus && <SummaryRow label="Ausbildung" value={educationStatus === 'quereinsteiger' ? 'Quereinsteiger' : educationStatus.toUpperCase()} />}
            <SummaryRow label="Name" value={`${form.salutation} ${form.first_name} ${form.last_name}`.trim()} />
            <SummaryRow label="E-Mail" value={form.email} />
            {form.phone && <SummaryRow label="Telefon" value={form.phone} />}
            {form.city && <SummaryRow label="Ort" value={`${form.zip} ${form.city}`.trim()} />}
            <SummaryRow label="Lebenslauf" value={cvFile?.name || '—'} />
            {motivationFile && <SummaryRow label="Motivationsschreiben" value={motivationFile.name} />}
            {attachments.length > 0 && <SummaryRow label="Beilagen" value={`${attachments.length} Datei(en)`} />}
            {details.desired_agency && <SummaryRow label="Wunschagentur" value={details.desired_agency} />}
            {hiringPeriod && <SummaryRow label="Zeitraum" value={hiringPeriod} />}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Sollte es zu einer Anstellung kommen, bin ich damit einverstanden, dass mir SSM die Vertragsunterlagen per E-Mail zustellt.
              </p>
              <div className="flex gap-3">
                {['ja', 'nein'].map(v => (
                  <button key={v} onClick={() => setConsents(c => ({ ...c, email_contract: v }))}
                    className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      consents.email_contract === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    }`}>
                    {v === 'ja' ? 'Ja' : 'Nein'}
                  </button>
                ))}
              </div>
              {fieldErrors.email_contract && <p className="text-xs text-destructive mt-1">{fieldErrors.email_contract}</p>}
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Dürfen wir deine Daten an Unternehmen der VISANA Gruppe weiterleiten?
              </p>
              <div className="flex gap-3">
                {['ja', 'nein'].map(v => (
                  <button key={v} onClick={() => setConsents(c => ({ ...c, visana: v }))}
                    className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      consents.visana === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    }`}>
                    {v === 'ja' ? 'Ja' : 'Nein'}
                  </button>
                ))}
              </div>
              {fieldErrors.visana && <p className="text-xs text-destructive mt-1">{fieldErrors.visana}</p>}
            </div>

            {/* Captcha */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Ich bin kein Roboter: {captchaA} + {captchaB} = ?
              </label>
              <input
                type="number"
                value={consents.captcha_answer}
                onChange={e => setConsents(c => ({ ...c, captcha_answer: e.target.value }))}
                className="w-32 h-10 rounded-lg border border-input px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
              {fieldErrors.captcha && <p className="text-xs text-destructive mt-1">{fieldErrors.captcha}</p>}
            </div>

            {/* Privacy */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consents.privacy}
                  onChange={e => setConsents(c => ({ ...c, privacy: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-input accent-primary" />
                <span className="text-sm text-foreground">
                  Ich habe die <a href="#" className="text-primary underline font-medium">Datenschutzerklärung</a> gelesen und akzeptiere diese. <span className="text-destructive">*</span>
                </span>
              </label>
              {fieldErrors.privacy && <p className="text-xs text-destructive mt-1">{fieldErrors.privacy}</p>}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <BtnSecondary onClick={prevStep}><ChevronLeft className="h-4 w-4" /> Zurück</BtnSecondary>
            <BtnPrimary onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet...</> : 'Bewerbung absenden'}
            </BtnPrimary>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ─── Sub-components ────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 sm:py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
          <div className="relative h-44 sm:h-52 overflow-hidden">
            <img src={bewerbungHero} alt="SSM Team bei der Arbeit" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
            <div className="absolute bottom-0 left-0 px-6 sm:px-8 pb-5">
              <h1 className="text-2xl font-bold tracking-tight font-heading text-primary-foreground drop-shadow-md">SSM Recruit</h1>
              <p className="text-primary-foreground/80 mt-1 text-sm drop-shadow-sm">Jetzt bewerben – einfach, schnell und sicher.</p>
            </div>
          </div>
          <div className="p-5 sm:p-8">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">© {new Date().getFullYear()} SSM Partner AG • Deine Daten werden vertraulich behandelt.</p>
      </div>
    </div>
  );
}

function OptionCard({ selected, onClick, icon, title, description }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <button onClick={onClick} className={`text-left p-5 rounded-xl border-2 transition-all ${
      selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30 hover:bg-muted/50'
    }`}>
      <div className={`mb-3 ${selected ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</div>
      <p className="font-semibold text-foreground text-sm font-heading">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </button>
  );
}

function FieldInput({ label, required, error, onChange, ...props }: {
  label: string; required?: boolean; error?: string; onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        className={`w-full h-10 rounded-lg border px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-ring transition-shadow ${error ? 'border-destructive' : 'border-input'}`}
        onChange={e => onChange(e.target.value)}
        {...props}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function FieldTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <textarea className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[80px]"
        value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function FieldSelect({ label, required, value, onChange, options, error }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select className={`w-full h-10 rounded-lg border px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-ring transition-shadow ${error ? 'border-destructive' : 'border-input'}`}
        value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
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
      <label className="block text-sm font-medium text-foreground mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {file ? (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <File className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
          <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-5 cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5 ${error ? 'border-destructive/40 bg-destructive/5' : 'border-border'}`}>
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Datei auswählen</span>
          <input type="file" accept={ALLOWED_TYPES.join(',')} onChange={onSelect} className="hidden" />
        </label>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function StepNav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex justify-between pt-2">
      <BtnSecondary onClick={onBack}><ChevronLeft className="h-4 w-4" /> Zurück</BtnSecondary>
      <BtnPrimary onClick={onNext}>Weiter <ChevronRight className="h-4 w-4" /></BtnPrimary>
    </div>
  );
}

function BtnPrimary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm font-heading">
      {children}
    </button>
  );
}

function BtnSecondary({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors">
      {children}
    </button>
  );
}
