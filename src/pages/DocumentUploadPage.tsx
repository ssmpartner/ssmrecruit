import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, AlertCircle, Upload, X, File, ExternalLink, UserSquare2, Circle, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PersonnelFormFields, { PersonnelData, validatePersonnel } from '@/components/PersonnelFormFields';

type Kind = 'application' | 'employment';

interface SlotDef {
  key: string;
  label: string;
  required: boolean;
  conditional?: (state: { isCH: boolean }) => boolean;
}

const APPLICATION_SLOTS: SlotDef[] = [
  { key: 'cv', label: 'Lebenslauf (CV)', required: true },
  { key: 'reference', label: 'Arbeitszeugnisse', required: true },
  { key: 'betreibungsauszug', label: 'Betreibungsauszug', required: true },
  { key: 'strafregisterauszug', label: 'Strafregisterauszug', required: true },
  { key: 'motivation', label: 'Motivationsschreiben (optional)', required: false },
];

const EMPLOYMENT_SLOTS: SlotDef[] = [
  { key: 'id_front', label: 'ID Vorderseite (in Farbe)', required: true },
  { key: 'id_back', label: 'ID Rückseite (in Farbe)', required: true },
  { key: 'bank_front', label: 'Bankkarte Vorderseite', required: true },
  { key: 'bank_back', label: 'Bankkarte Rückseite', required: true },
  { key: 'vbv', label: 'VBV Zertifikat', required: true },
  { key: 'kk_card', label: 'Kopie Krankenkassen-Karte', required: true },
  { key: 'fuehrerausweis', label: 'Führerausweis (PW)', required: true },
  { key: 'auslaenderbewilligung', label: 'Ausländerbewilligung', required: false, conditional: ({ isCH }) => !isCH },
];

interface PendingUpload {
  slotKey: string;
  file: File;
  uploading: boolean;
  done: boolean;
  error?: string;
}

export default function DocumentUploadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  const [requestId, setRequestId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [leadName, setLeadName] = useState('');
  const [kind, setKind] = useState<Kind>('application');

  // Slot uploads (per-slot tracking)
  const [slotUploads, setSlotUploads] = useState<Record<string, { name: string; path: string; size: number; id?: string; uploadedAt?: string }>>({});
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Employment: Personalstammdaten
  const [isCH, setIsCH] = useState(true);
  const [personnelOpen, setPersonnelOpen] = useState(false);
  const [personnelData, setPersonnelData] = useState<PersonnelData>({ kinder: [] });
  const [personnelErrors, setPersonnelErrors] = useState<Record<string, string>>({});
  const [personnelComplete, setPersonnelComplete] = useState(false);
  const [personnelSubmittedAt, setPersonnelSubmittedAt] = useState<string | null>(null);
  const [personnelVersion, setPersonnelVersion] = useState<number>(0);
  const [personnelSaving, setPersonnelSaving] = useState(false);

  useEffect(() => {
    if (!token) { setError('Ungültiger Link.'); setLoading(false); return; }
    loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadRequest() {
    const { data, error: err } = await supabase
      .from('document_requests')
      .select('*')
      .eq('token', token!)
      .single();

    if (err || !data) { setError('Dieser Link ist ungültig oder abgelaufen.'); setLoading(false); return; }
    const row = data as { id: string; lead_id: string; expires_at: string | null; kind?: Kind };

    if (row.expires_at && new Date(row.expires_at) <= new Date()) {
      setError('Dieser Upload-Link ist abgelaufen. Bitte fordern Sie einen neuen Link an.');
      setLoading(false);
      return;
    }

    setRequestId(row.id);
    setLeadId(row.lead_id);
    setKind((row.kind ?? 'application') as Kind);

    const [{ data: lead }, { data: uploads }, { data: personal }] = await Promise.all([
      supabase.from('leads').select('name').eq('id', row.lead_id).single(),
      supabase.from('document_uploads').select('id, file_name, file_type, file_path, file_size, uploaded_at').eq('lead_id', row.lead_id).order('uploaded_at', { ascending: false }),
      supabase.from('lead_personal_data').select('data, version, updated_at').eq('lead_id', row.lead_id).maybeSingle(),
    ]);
    if (lead) setLeadName((lead as { name: string }).name);

    if (uploads) {
      const map: typeof slotUploads = {};
      // Keep the most recent (already ordered desc) per file_type as the "current version"
      (uploads as Array<{ id: string; file_name: string; file_type: string; file_path: string; file_size: number; uploaded_at: string }>).forEach(u => {
        if (!map[u.file_type]) map[u.file_type] = { name: u.file_name, path: u.file_path, size: u.file_size, id: u.id, uploadedAt: u.uploaded_at };
      });
      setSlotUploads(map);
    }

    if (personal) {
      const pdata = ((personal as { data?: PersonnelData }).data) ?? { kinder: [] };
      const pversion = ((personal as { version?: number }).version ?? 0);
      const pupdated = ((personal as { updated_at?: string }).updated_at) ?? null;
      setPersonnelData(pdata);
      const errs = validatePersonnel(pdata);
      const complete = pversion > 0 && Object.keys(errs).length === 0;
      setPersonnelComplete(complete);
      setPersonnelVersion(pversion);
      setPersonnelSubmittedAt(complete ? pupdated : null);
    }

    setLoading(false);
  }

  const slots = useMemo(() => {
    const base = kind === 'employment' ? EMPLOYMENT_SLOTS : APPLICATION_SLOTS;
    return base.filter(s => !s.conditional || s.conditional({ isCH }));
  }, [kind, isCH]);

  const requiredMissing = slots.filter(s => s.required && !slotUploads[s.key] && !pending.find(p => p.slotKey === s.key));
  const canSubmit = requiredMissing.length === 0 && (kind !== 'employment' || personnelComplete);

  function pickFile(slotKey: string, file: File | null) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError(`Datei zu gross (max. 20 MB): ${file.name}`);
      return;
    }
    setError('');
    setPending(prev => {
      const filtered = prev.filter(p => p.slotKey !== slotKey);
      return [...filtered, { slotKey, file, uploading: false, done: false }];
    });
  }

  function removePending(slotKey: string) {
    setPending(prev => prev.filter(p => p.slotKey !== slotKey));
  }

  async function savePersonnel() {
    const errs = validatePersonnel(personnelData);
    setPersonnelErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError(`Bitte alle Pflichtfelder ausfüllen (${Object.keys(errs).length} fehlend).`);
      return;
    }
    setPersonnelSaving(true);
    setError('');
    const { data, error: fnErr } = await supabase.functions.invoke('submit-employment-personnel', {
      body: { document_token: token, data: personnelData },
    });
    setPersonnelSaving(false);
    if (fnErr || !(data as { ok?: boolean } | null)?.ok) {
      setError('Personalstammdaten konnten nicht gespeichert werden. Bitte erneut versuchen.');
      return;
    }
    setPersonnelComplete(true);
    setPersonnelSubmittedAt(new Date().toISOString());
    setPersonnelVersion(v => v + 1);
    setPersonnelOpen(false);
  }

  function fmtDate(iso?: string | null) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }

  async function handleSubmit() {
    if (!canSubmit) {
      setError('Bitte alle Pflichtangaben vervollständigen.');
      return;
    }
    setSubmitting(true);
    setError('');

    let allOk = true;
    const next = [...pending];
    for (let i = 0; i < next.length; i++) {
      if (next[i].done) continue;
      next[i] = { ...next[i], uploading: true };
      setPending([...next]);

      const file = next[i].file;
      const ext = file.name.split('.').pop() || 'bin';
      const filePath = `${leadId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('lead-documents').upload(filePath, file);
      if (upErr) {
        next[i] = { ...next[i], uploading: false, error: 'Upload fehlgeschlagen' };
        setPending([...next]);
        allOk = false;
        continue;
      }

      await supabase.from('document_uploads').insert({
        request_id: requestId,
        lead_id: leadId,
        file_name: file.name,
        file_type: next[i].slotKey,
        file_path: filePath,
        file_size: file.size,
      });

      next[i] = { ...next[i], uploading: false, done: true };
      setPending([...next]);
    }

    if (allOk) {
      await supabase.functions.invoke('complete-public-form', {
        body: { kind: 'document_request', token: token! },
      });

      await supabase.from('notifications').insert({
        title: kind === 'employment' ? 'Arbeitsdossier eingereicht' : 'Bewerbungsunterlagen hochgeladen',
        type: 'document',
        description: `${leadName || 'Ein Lead'} hat ${next.length} Dokument(e) für ${kind === 'employment' ? 'das Arbeitsdossier' : 'die Bewerbung'} hochgeladen.`,
        lead_id: leadId,
      });

      await supabase.from('activities').insert({
        id: crypto.randomUUID(),
        lead_id: leadId,
        type: 'edit',
        description: `${next.length} Dokument(e) vom Lead hochgeladen (${kind === 'employment' ? 'Arbeitsvertrag' : 'Bewerbung'})`,
        user: 'System',
      });

      setCompleted(true);
    }
    setSubmitting(false);
  }

  const handleDrop = useCallback((slotKey: string, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(slotKey, file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (completed) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {kind === 'employment' ? 'Arbeitsdossier eingereicht' : 'Upload abgeschlossen'}
        </h1>
        <p className="text-muted-foreground">
          {kind === 'employment'
            ? 'Vielen Dank! Ihre Personalstammdaten und Dokumente wurden vollständig übermittelt.'
            : 'Ihre Dokumente wurden erfolgreich hochgeladen. Vielen Dank!'}
        </p>
      </div>
    </div>
  );

  if (error && !requestId) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Link ungültig</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    </div>
  );

  const headerTitle = kind === 'employment' ? 'Arbeitsdossier – Dokumente & Stammdaten' : 'SSM Recruit – Bewerbungsunterlagen';
  const headerHint = kind === 'employment'
    ? 'Um Ihr Arbeitsdossier vorzubereiten, benötigen wir Ihre Personalstammdaten sowie folgende Dokumente.'
    : 'Bitte laden Sie die unten aufgeführten Dokumente hoch.';

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl shadow-lg overflow-hidden border border-border">
          <div className="px-8 py-6 text-primary-foreground" style={{ background: 'var(--gradient-hero)' }}>
            <h1 className="text-2xl font-bold">{headerTitle}</h1>
            <p className="mt-1 opacity-90">
              {leadName ? `Hallo ${leadName.split(' ')[0]} – ` : ''}{headerHint}
            </p>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Alle Unterlagen müssen <strong>sauber als Scan</strong> oder mit <strong>professionellem, scharfem Handyfoto</strong> hochgeladen werden.
                Schräge, abgeschnittene oder unscharfe Dokumente führen dazu, dass Ihr Dossier <strong>nicht bearbeitet wird</strong>.
              </span>
            </div>

            {/* Employment: Personalstammdaten step */}
            {kind === 'employment' && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 ${personnelComplete ? 'bg-success/15 text-success' : 'bg-amber-100 text-amber-700'}`}>
                      <UserSquare2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">1. Personalstammdaten</p>
                      {personnelComplete && personnelSubmittedAt ? (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                          ✓ Eingereicht am {fmtDate(personnelSubmittedAt)}{personnelVersion > 1 ? ` · Version ${personnelVersion}` : ''}. Sie können die Angaben bei Bedarf erneut einreichen — es wird eine neue Version gespeichert.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Bitte füllen Sie Ihre Personalstammdaten aus – diese werden im nächsten Schritt automatisch übernommen.
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${personnelComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {personnelComplete ? '✓ Vollständig' : 'Offen'}
                  </span>
                </div>
                <button
                  onClick={() => setPersonnelOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <UserSquare2 className="h-4 w-4" />
                  {personnelComplete ? 'Personalstammdaten anzeigen / erneut einreichen' : 'Personalstammdaten ausfüllen'}
                </button>

                <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <input type="checkbox" checked={isCH} onChange={e => setIsCH(e.target.checked)} className="h-4 w-4" />
                  Ich bin Schweizer Staatsbürger:in (keine Ausländerbewilligung nötig)
                </label>
              </div>
            )}

            {/* Document slots */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {kind === 'employment' ? '2. Erforderliche Dokumente' : 'Erforderliche Dokumente'}
              </h3>
              {slots.map(slot => {
                const existing = slotUploads[slot.key];
                const queued = pending.find(p => p.slotKey === slot.key);
                const done = !!existing;
                const inputId = `slot-${slot.key}`;
                return (
                  <div
                    key={slot.key}
                    onDrop={e => handleDrop(slot.key, e)}
                    onDragOver={e => e.preventDefault()}
                    className={`rounded-lg border p-3 flex items-center gap-3 ${
                      done ? 'border-success/30 bg-success/10' :
                      queued ? 'border-primary/30 bg-primary/5' :
                      slot.required ? 'border-border' : 'border-dashed border-border'
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> :
                     queued?.uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" /> :
                     queued ? <File className="h-5 w-5 text-primary shrink-0" /> :
                     <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {slot.label}
                        {slot.required && <span className="text-destructive ml-1">*</span>}
                      </p>
                      {(existing || queued) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {existing?.name ?? queued?.file.name}
                          {queued?.error && <span className="text-destructive ml-2">{queued.error}</span>}
                        </p>
                      )}
                    </div>
                    {done ? (
                      <span className="text-xs text-success font-medium">Hochgeladen</span>
                    ) : queued ? (
                      <button onClick={() => removePending(slot.key)} className="text-muted-foreground hover:text-destructive" disabled={queued.uploading}>
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <>
                        <label htmlFor={inputId} className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
                          <Upload className="h-3.5 w-3.5" /> Datei wählen
                        </label>
                        <input
                          id={inputId}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.heic"
                          className="hidden"
                          onChange={e => pickFile(slot.key, e.target.files?.[0] ?? null)}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitting ? 'Wird hochgeladen…' :
               !canSubmit ? `Noch ${requiredMissing.length}${kind === 'employment' && !personnelComplete ? ' + Stammdaten' : ''} offen` :
               kind === 'employment' ? 'Arbeitsdossier einreichen' : 'Bewerbung einreichen'}
            </button>

            {kind === 'application' && (
              <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
                <p className="text-sm text-foreground">
                  Falls Sie noch keinen <strong>Betreibungsauszug</strong> oder <strong>Strafregisterauszug</strong> haben, können Sie diese hier online bestellen:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="https://www.eamt.ch/" target="_blank" rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <ExternalLink className="h-4 w-4" /> eAMT – Betreibungsregisterauszug
                  </a>
                  <a href="https://www.e-service.admin.ch/crex/cms/content/strafregister/uebersicht_de" target="_blank" rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <ExternalLink className="h-4 w-4" /> Strafregisterauszug bestellen
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">© SSM Recruit • Ihre Daten werden vertraulich behandelt.</p>
      </div>

      {/* Personnel modal */}
      <Dialog open={personnelOpen} onOpenChange={(o) => !personnelSaving && setPersonnelOpen(o)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personalstammdaten ausfüllen</DialogTitle>
          </DialogHeader>
          <PersonnelFormFields data={personnelData} onChange={setPersonnelData} errors={personnelErrors} />
          <DialogFooter className="gap-2">
            <button
              onClick={() => setPersonnelOpen(false)}
              disabled={personnelSaving}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              onClick={savePersonnel}
              disabled={personnelSaving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {personnelSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Speichern & übernehmen
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
