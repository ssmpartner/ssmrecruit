import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Upload, File as FileIcon, X, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PersonnelFormFields, {
  PersonnelData, validatePersonnel,
} from '@/components/PersonnelFormFields';

// ---------------------------------------------------------------------------
// Step definitions — render a *slice* of PersonnelFormFields per step.
// We don't carve the fields component up; we just hide everything but the
// relevant section using a CSS approach via wrapping PersonnelFormFields in
// a step-aware filter. To keep things explicit and reliable, each step also
// owns its own validation subset.
// ---------------------------------------------------------------------------

type StepKey =
  | 'personalien' | 'zivilstand' | 'bank' | 'versicherung'
  | 'anstellung' | 'erwerb' | 'kinder' | 'docs_check' | 'docs_upload';

interface StepDef {
  key: StepKey;
  title: string;
  subtitle: string;
  fields: (keyof PersonnelData)[]; // required fields validated at this step
}

const BASE_STEPS: StepDef[] = [
  { key: 'personalien', title: 'Persönliche Angaben', subtitle: 'AHV, Nationalität, Sprache & Heimatort', fields: ['ahvNr','nationalitaet','sprache','heimatortCH','auslaenderausweis'] },
  { key: 'zivilstand',  title: 'Zivilstand & Konfession', subtitle: 'Familienstand und Religion', fields: ['zivilstand','konfession'] },
  { key: 'bank',        title: 'Lohnüberweisung', subtitle: 'Ihre Bankverbindung', fields: ['bankName','bic','iban','bankPlzOrt'] },
  { key: 'versicherung',title: 'Versicherungen', subtitle: 'Krankenkasse & Pensionskasse', fields: ['krankenkasse','pensionskasse'] },
  { key: 'anstellung',  title: 'Anstellung & Ausbildung', subtitle: 'Eintritt, Karriere und Ausbildung', fields: ['arbeitsbeginn','anstellungsdauer','arbeitsortAgentur','karrierestufe','hoechsteAusbildung'] },
  { key: 'erwerb',      title: 'Erwerbstätigkeit', subtitle: 'Zusatzeinkünfte und weitere Arbeitgeber', fields: ['bezugLohnTaggeld','bezugLohnRente','selbststaendig','salaerMin'] },
  { key: 'kinder',      title: 'Kinder', subtitle: 'Angaben zu Ihren Kindern', fields: ['anzahlKinder'] },
  { key: 'docs_check',  title: 'Dokumente', subtitle: 'Haben Sie Ihre Unterlagen schon hochgeladen?', fields: [] },
];

const documentTypes = [
  { value: 'cv', label: 'Lebenslauf (CV)' },
  { value: 'certificate', label: 'Zertifikate / Diplome' },
  { value: 'reference', label: 'Arbeitszeugnisse' },
  { value: 'id', label: 'Ausweis / Pass' },
  { value: 'betreibungsauszug', label: 'Betreibungsauszug' },
  { value: 'strafregister', label: 'Strafregisterauszug' },
  { value: 'other', label: 'Sonstiges' },
];

type Phase = 'loading' | 'invalid' | 'expired' | 'completed' | 'ready' | 'submitting' | 'success';

interface LookupResult {
  id: string;
  lead_id: string;
  status: string;
  expires_at: string | null;
  lead_name: string | null;
}

interface UploadFile {
  file: File;
  type: string;
  uploading: boolean;
  done: boolean;
  error?: string;
}

export default function PersonnelFormPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [info, setInfo] = useState<LookupResult | null>(null);
  const [data, setData] = useState<PersonnelData>({ kinder: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [docsAlreadyUploaded, setDocsAlreadyUploaded] = useState<'yes' | 'no' | null>(null);
  const [docRequest, setDocRequest] = useState<{ id: string; token: string } | null>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [pageError, setPageError] = useState('');

  const steps: StepDef[] = (() => {
    if (docsAlreadyUploaded === 'no') {
      return [...BASE_STEPS, { key: 'docs_upload', title: 'Dokumente hochladen', subtitle: 'Bitte laden Sie Ihre Unterlagen hoch', fields: [] }];
    }
    return BASE_STEPS;
  })();
  const currentStep = steps[stepIdx];

  // ---- Load token + prefill -----------------------------------------------
  useEffect(() => {
    if (!token) { setPhase('invalid'); return; }
    (async () => {
      const { data: res, error } = await supabase.functions.invoke('lookup-public-form', {
        body: { kind: 'personnel_request', token },
      });
      if (error || !res || (res as { error?: string }).error) { setPhase('invalid'); return; }
      const lookup = res as LookupResult;
      setInfo(lookup);
      if (lookup.status === 'completed') { setPhase('completed'); return; }
      if (lookup.expires_at && new Date(lookup.expires_at).getTime() < Date.now()) { setPhase('expired'); return; }
      const { data: cur } = await supabase
        .from('lead_personal_data').select('data')
        .eq('lead_id', lookup.lead_id).maybeSingle();
      if (cur?.data) setData(cur.data as PersonnelData);
      setPhase('ready');
    })();
  }, [token]);

  // ---- Per-step validation ------------------------------------------------
  const validateStep = (idx: number): Record<string, string> => {
    const step = steps[idx];
    if (!step || step.fields.length === 0) return {};
    const all = validatePersonnel(data);
    const subset: Record<string, string> = {};
    // Field-level errors
    for (const f of step.fields) {
      if (all[f]) subset[f] = all[f];
    }
    // Conditional: zivilstand step also covers Ehepartner block
    if (step.key === 'zivilstand' && (data.zivilstand === 'verheiratet' || data.zivilstand === 'eingetragene_partnerschaft')) {
      for (const k of Object.keys(all)) {
        if (k.startsWith('ep') || k === 'zivilstandDatum') subset[k] = all[k];
      }
    }
    // Kinder step also covers child rows
    if (step.key === 'kinder') {
      for (const k of Object.keys(all)) {
        if (k.startsWith('kinder')) subset[k] = all[k];
      }
    }
    return subset;
  };

  const goNext = async () => {
    setPageError('');
    const errs = validateStep(stepIdx);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setPageError(`Bitte alle Pflichtfelder ausfüllen (${Object.keys(errs).length} fehlend).`);
      return;
    }
    // Transition from docs_check
    if (currentStep.key === 'docs_check') {
      if (docsAlreadyUploaded === null) {
        setPageError('Bitte beantworten Sie die Frage.');
        return;
      }
      if (docsAlreadyUploaded === 'yes') {
        await submitPersonnelAndFinish();
        return;
      }
      // "no" → ensure doc request exists then move to upload step
      if (!docRequest && info) {
        const { data: res, error } = await supabase.functions.invoke('create-personnel-doc-request', {
          body: { personnel_token: token },
        });
        if (error || !res || (res as { error?: string }).error) {
          setPageError('Dokumenten-Anfrage konnte nicht erstellt werden.');
          return;
        }
        setDocRequest(res as { id: string; token: string });
      }
      setStepIdx(stepIdx + 1);
      return;
    }
    setStepIdx(Math.min(stepIdx + 1, steps.length - 1));
  };

  const goBack = () => {
    setPageError('');
    setErrors({});
    setStepIdx(Math.max(0, stepIdx - 1));
  };

  // ---- Submit personnel ---------------------------------------------------
  const submitPersonnelAndFinish = async () => {
    if (!info) return;
    setPhase('submitting');
    const allErrs = validatePersonnel(data);
    if (Object.keys(allErrs).length > 0) {
      setErrors(allErrs);
      setPageError(`Bitte alle Pflichtfelder ausfüllen (${Object.keys(allErrs).length} fehlend).`);
      setPhase('ready');
      // Jump back to first step containing errors
      const firstBad = BASE_STEPS.findIndex(s => s.fields.some(f => allErrs[f]));
      if (firstBad >= 0) setStepIdx(firstBad);
      return;
    }

    const { data: res, error: fnErr } = await supabase.functions.invoke('submit-employment-personnel', {
      body: { personnel_token: token, data },
    });
    if (fnErr || !(res as { ok?: boolean } | null)?.ok) {
      setPageError('Ihre Angaben konnten leider nicht gespeichert werden. Bitte versuchen Sie es in einem Moment erneut.');
      setPhase('ready');
      return;
    }

    setPhase('success');
  };

  // ---- Upload helpers ------------------------------------------------------
  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles).map(f => ({
      file: f, type: guessType(f.name), uploading: false, done: false,
    }));
    setFiles(prev => [...prev, ...arr]);
  };
  function guessType(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('cv') || lower.includes('lebenslauf')) return 'cv';
    if (lower.includes('zeugnis') || lower.includes('reference')) return 'reference';
    if (lower.includes('zertifikat') || lower.includes('diplom') || lower.includes('certificate')) return 'certificate';
    if (lower.includes('betreibung')) return 'betreibungsauszug';
    if (lower.includes('strafregister')) return 'strafregister';
    return 'other';
  }
  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const setFileType = (idx: number, type: string) => setFiles(prev => prev.map((f, i) => i === idx ? { ...f, type } : f));
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); addFiles(e.dataTransfer.files);
  }, []);

  const submitDocsAndFinish = async () => {
    if (!info || !docRequest) return;
    if (files.length === 0) {
      setPageError('Bitte laden Sie mindestens eine Datei hoch oder gehen Sie zurück.');
      return;
    }
    setPhase('submitting');
    setPageError('');

    // Upload each file
    let allOk = true;
    for (let i = 0; i < files.length; i++) {
      if (files[i].done) continue;
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: true } : f));
      const file = files[i].file;
      const ext = file.name.split('.').pop() || 'bin';
      const filePath = `${info.lead_id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('lead-documents').upload(filePath, file);
      if (uploadErr) {
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: false, error: 'Upload fehlgeschlagen' } : f));
        allOk = false;
        continue;
      }
      await supabase.from('document_uploads').insert({
        request_id: docRequest.id, lead_id: info.lead_id,
        file_name: file.name, file_type: files[i].type,
        file_path: filePath, file_size: file.size,
      });
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: false, done: true } : f));
    }

    if (!allOk) {
      setPhase('ready');
      setPageError('Einige Dateien konnten nicht hochgeladen werden. Bitte erneut versuchen.');
      return;
    }

    // Complete document request
    await supabase.functions.invoke('complete-public-form', {
      body: { kind: 'document_request', token: docRequest.token },
    });
    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: info.lead_id, type: 'edit',
      description: `${files.length} Dokument(e) vom Kandidaten hochgeladen`,
      user: info.lead_name ? `${info.lead_name} (Kandidat)` : 'Kandidat',
    });

    // Now persist personnel + mark complete
    await submitPersonnelAndFinish();
  };

  // ---- Render states -------------------------------------------------------
  if (phase === 'loading') return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (phase === 'invalid') return (
    <FinalMessage icon={<AlertCircle className="h-16 w-16 text-destructive" />} title="Link ungültig" body="Dieser Link ist nicht gültig oder wurde widerrufen." />
  );
  if (phase === 'expired') return (
    <FinalMessage icon={<AlertCircle className="h-16 w-16 text-amber-500" />} title="Link abgelaufen" body="Dieser Link war 14 Tage gültig und ist nun abgelaufen. Bitte fordern Sie einen neuen Link an." />
  );
  if (phase === 'completed') return (
    <FinalMessage icon={<CheckCircle2 className="h-16 w-16 text-success" />} title="Bereits eingereicht" body="Vielen Dank – wir haben Ihre Personalien bereits erhalten." />
  );
  if (phase === 'success') return (
    <FinalMessage icon={<CheckCircle2 className="h-16 w-16 text-success" />} title="Vielen Dank!" body="Ihre Personalien wurden erfolgreich übermittelt." />
  );

  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;
  const totalSteps = steps.length;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl shadow-lg overflow-hidden border border-border">
          {/* Hero header (matches DocumentUploadPage) */}
          <div className="px-8 py-6 text-primary-foreground" style={{ background: 'var(--gradient-hero)' }}>
            <h1 className="text-2xl font-bold">SSM Recruit – Personalblatt</h1>
            <p className="mt-1 opacity-90">
              {info?.lead_name ? `Hallo ${info.lead_name.split(' ')[0]}, b` : 'B'}itte füllen Sie Ihre Personalien Schritt für Schritt aus.
            </p>
          </div>

          {/* Stepper */}
          <div className="px-8 pt-5">
            <div className="flex items-center gap-1.5">
              {steps.map((s, i) => (
                <div key={s.key} className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i < stepIdx ? 'bg-primary'
                    : i === stepIdx ? 'bg-primary'
                    : 'bg-muted',
                )} />
              ))}
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">{currentStep.title}</h2>
                <p className="text-xs text-muted-foreground">{currentStep.subtitle}</p>
              </div>
              <span className="text-xs text-muted-foreground">Schritt {stepIdx + 1} / {totalSteps}</span>
            </div>
          </div>

          <div className="p-8 pt-5 space-y-5">
            {pageError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {pageError}
              </div>
            )}

            {/* Step body */}
            {currentStep.key === 'docs_check' ? (
              <DocsCheckStep value={docsAlreadyUploaded} onChange={setDocsAlreadyUploaded} />
            ) : currentStep.key === 'docs_upload' ? (
              <DocsUploadStep
                files={files}
                onAdd={addFiles}
                onRemove={removeFile}
                onChangeType={setFileType}
                onDrop={handleDrop}
              />
            ) : (
              <StepSlice stepKey={currentStep.key} data={data} onChange={setData} errors={errors} disabled={phase === 'submitting'} />
            )}
          </div>

          {/* Footer nav */}
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-8 py-4">
            <button
              type="button"
              onClick={goBack}
              disabled={isFirst || phase === 'submitting'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Zurück
            </button>

            {currentStep.key === 'docs_check' && docsAlreadyUploaded === 'yes' ? (
              <button
                type="button"
                onClick={submitPersonnelAndFinish}
                disabled={phase === 'submitting'}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50"
              >
                {phase === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Personalien einreichen
              </button>
            ) : currentStep.key === 'docs_upload' ? (
              <button
                type="button"
                onClick={submitDocsAndFinish}
                disabled={phase === 'submitting' || files.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50"
              >
                {phase === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Alles einreichen
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={phase === 'submitting' || (currentStep.key === 'docs_check' && docsAlreadyUploaded === null)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50"
              >
                Weiter <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © SSM Recruit • Ihre Daten werden vertraulich behandelt.
          {info?.expires_at && (
            <> Gültig bis {new Date(info.expires_at).toLocaleDateString('de-CH')}.</>
          )}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step body components
// ---------------------------------------------------------------------------

/**
 * Renders only the relevant section(s) of PersonnelFormFields for the active
 * step. We use a CSS trick: render the full component inside a hidden wrapper
 * for steps we DON'T want, and a visible wrapper for the active section.
 * To keep DOM small we use a per-step include map below.
 */
function StepSlice({ stepKey, data, onChange, errors, disabled }: {
  stepKey: StepKey;
  data: PersonnelData;
  onChange: (n: PersonnelData) => void;
  errors: Record<string, string>;
  disabled: boolean;
}) {
  // We render the full form but visually scope it via section visibility.
  // The PersonnelFormFields component renders <Section> blocks in order — we
  // hide siblings using a CSS class. Cheap, predictable, and keeps validation
  // identical to the internal version.
  return (
    <div className={cn('personnel-step', `personnel-step-${stepKey}`)}>
      <style>{`
        .personnel-step fieldset > div[data-group] { display: none; }
        .personnel-step-personalien fieldset > div[data-group="personalien"] { display: block; }
        .personnel-step-zivilstand fieldset > div[data-group="zivilstand"] { display: block; }
        .personnel-step-bank fieldset > div[data-group="bank"] { display: block; }
        .personnel-step-versicherung fieldset > div[data-group="versicherung"] { display: block; }
        .personnel-step-anstellung fieldset > div[data-group="anstellung"] { display: block; }
        .personnel-step-erwerb fieldset > div[data-group="erwerb"] { display: block; }
        .personnel-step-kinder fieldset > div[data-group="kinder"] { display: block; }
      `}</style>
      <PersonnelFormFields data={data} onChange={onChange} errors={errors} disabled={disabled} />
    </div>
  );
}

function DocsCheckStep({ value, onChange }: { value: 'yes' | 'no' | null; onChange: (v: 'yes' | 'no') => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground">
        Damit wir Ihre Bewerbung abschliessen können, benötigen wir noch Ihre Unterlagen
        (z. B. Lebenslauf, Ausweis, Arbeitszeugnisse, Betreibungs- und Strafregisterauszug).
      </p>
      <p className="text-sm font-medium text-foreground">
        Haben Sie diese Dokumente bereits hochgeladen?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('yes')}
          className={cn(
            'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors',
            value === 'yes' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          )}
        >
          <CheckCircle2 className={cn('h-5 w-5 mt-0.5 shrink-0', value === 'yes' ? 'text-primary' : 'text-muted-foreground')} />
          <div>
            <p className="text-sm font-semibold text-foreground">Ja, alle Dokumente sind hochgeladen</p>
            <p className="text-xs text-muted-foreground mt-1">Ich habe die geforderten Unterlagen bereits über einen früheren Link eingereicht.</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange('no')}
          className={cn(
            'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors',
            value === 'no' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          )}
        >
          <Upload className={cn('h-5 w-5 mt-0.5 shrink-0', value === 'no' ? 'text-primary' : 'text-muted-foreground')} />
          <div>
            <p className="text-sm font-semibold text-foreground">Nein, ich möchte sie jetzt hochladen</p>
            <p className="text-xs text-muted-foreground mt-1">Im nächsten Schritt können Sie alle Unterlagen direkt hochladen.</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function DocsUploadStep({ files, onAdd, onRemove, onChangeType, onDrop }: {
  files: UploadFile[];
  onAdd: (f: FileList | null) => void;
  onRemove: (idx: number) => void;
  onChangeType: (idx: number, t: string) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div className="space-y-5">
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary hover:bg-accent/10 transition-colors cursor-pointer"
        onClick={() => document.getElementById('personnel-file-input')?.click()}
      >
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">Dateien hierhin ziehen oder klicken</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOCX (max. 20 MB pro Datei)</p>
        <input
          id="personnel-file-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
          onChange={e => onAdd(e.target.files)}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Ausgewählte Dateien</h3>
          {files.map((f, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
              {f.done ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> :
               f.uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" /> :
               <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.file.name}</p>
                <p className="text-xs text-muted-foreground">{(f.file.size / 1024).toFixed(0)} KB</p>
                {f.error && <p className="text-xs text-destructive">{f.error}</p>}
              </div>
              <select
                value={f.type}
                onChange={e => onChangeType(idx, e.target.value)}
                disabled={f.done}
                className="h-8 rounded border border-border bg-background px-2 text-xs"
              >
                {documentTypes.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
              </select>
              {!f.done && (
                <button onClick={() => onRemove(idx)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
        <p className="text-sm text-foreground">
          Falls Sie noch keinen <strong>Betreibungs-</strong> oder <strong>Strafregisterauszug</strong> haben, können Sie diese hier bestellen:
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="https://www.eamt.ch/" target="_blank" rel="noopener noreferrer"
             className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <ExternalLink className="h-4 w-4" /> eAMT – Betreibungsauszug
          </a>
          <a href="https://www.e-service.admin.ch/crex/cms/content/strafregister/uebersicht_de" target="_blank" rel="noopener noreferrer"
             className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <ExternalLink className="h-4 w-4" /> Strafregisterauszug
          </a>
        </div>
      </div>
    </div>
  );
}

function FinalMessage({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
        <div className="flex justify-center mb-4">{icon}</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
