import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLeads } from '@/context/useLeads';
import { toast } from 'sonner';

interface CsvRow {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  plz?: string;
  city?: string;
  canton?: string;
  cantonCode?: string;
  position?: string;
  source?: string;
  notes?: string;
  createdAt?: string;
  status?: string;
  employeeId?: string;
  agencyId?: string;
  campaign?: string;
}

const REQUIRED_FIELDS = ['name', 'email'];
const OPTIONAL_FIELDS = ['phone', 'address', 'plz', 'city', 'canton', 'cantonCode', 'position', 'source', 'notes', 'createdAt', 'status', 'employeeId', 'agencyId', 'campaign'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const FIELD_LABELS: Record<string, string> = {
  name: 'Name', email: 'E-Mail', phone: 'Telefon', address: 'Adresse',
  plz: 'PLZ', city: 'Ort', canton: 'Kanton', cantonCode: 'Kanton-Code',
  position: 'Position', source: 'Quelle', notes: 'Notizen',
  createdAt: 'Lead-Datum', status: 'Status', employeeId: 'Mitarbeiter',
  agencyId: 'Agentur', campaign: 'Kampagne',
};

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(/[;,\t]/).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (!inQuotes && (char === ',' || char === ';' || char === '\t')) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    parts.push(current.trim());
    return parts;
  });
  return { headers, rows };
}

function autoMapHeaders(csvHeaders: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  const aliases: Record<string, string[]> = {
    name: ['name', 'vorname', 'nachname', 'full_name', 'fullname', 'vor- und nachname', 'kandidat'],
    email: ['email', 'e-mail', 'mail', 'e_mail', 'email_address'],
    phone: ['phone', 'telefon', 'tel', 'phone_number', 'mobiltelefon', 'handy'],
    address: ['address', 'adresse', 'strasse', 'street'],
    plz: ['plz', 'postleitzahl', 'zip', 'zip_code', 'postal_code'],
    city: ['city', 'ort', 'stadt', 'town'],
    canton: ['canton', 'kanton', 'state', 'province'],
    cantonCode: ['canton_code', 'kanton_code', 'cantoncode', 'kantoncode'],
    position: ['position', 'job', 'job_title', 'stelle', 'beruf'],
    source: ['source', 'quelle', 'herkunft', 'lead_source', 'leadquelle', 'lead_quelle'],
    notes: ['notes', 'notizen', 'bemerkungen', 'kommentar', 'comment'],
    createdAt: ['created_at', 'createdat', 'datum', 'date', 'lead_datum', 'leaddatum', 'erstelldatum', 'eingangsdatum', 'erfasst_am'],
    status: ['status', 'lead_status', 'leadstatus', 'phase', 'stufe'],
    employeeId: ['employee', 'berater', 'zugewiesen', 'assigned', 'assigned_to', 'assignedto', 'mitarbeiter', 'betreuer', 'zugewiesen_an', 'consultant'],
    agencyId: ['agency', 'agentur', 'niederlassung', 'filiale', 'standort', 'agency_id'],
    campaign: ['campaign', 'kampagne', 'werbekampagne', 'utm_campaign', 'marketing_campaign'],
  };
  csvHeaders.forEach((h, i) => {
    const lower = h.toLowerCase().replace(/[^a-zäöü0-9_]/g, '');
    for (const [field, aliasList] of Object.entries(aliases)) {
      if (aliasList.some(a => lower.includes(a)) && !Object.values(mapping).includes(field)) {
        mapping[i] = field;
        break;
      }
    }
  });
  return mapping;
}

export default function CsvImportDialog() {
  const { addLead, agencies, employees } = useLeads();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [importCount, setImportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload'); setCsvHeaders([]); setCsvRows([]); setMapping({}); setErrors([]); setImportCount(0);
  };

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0 || rows.length === 0) {
        toast.error('Die CSV-Datei ist leer oder ungültig.');
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      setMapping(autoMapHeaders(headers));
      setStep('map');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) handleFile(file);
    else toast.error('Bitte eine CSV-Datei hochladen.');
  }, [handleFile]);

  const mappedRows = csvRows.map(row => {
    const obj: Record<string, string> = {};
    Object.entries(mapping).forEach(([colIdx, field]) => {
      obj[field] = row[Number(colIdx)] || '';
    });
    return obj;
  });

  const validateMapping = () => {
    const errs: string[] = [];
    const mappedFields = Object.values(mapping);
    if (!mappedFields.includes('name')) errs.push('Pflichtfeld "Name" ist nicht zugewiesen.');
    if (!mappedFields.includes('email')) errs.push('Pflichtfeld "E-Mail" ist nicht zugewiesen.');
    // Check for rows with empty required fields
    const invalidRows = mappedRows.filter(r => !r.name?.trim() || !r.email?.trim());
    if (invalidRows.length > 0) errs.push(`${invalidRows.length} Zeile(n) ohne Name oder E-Mail.`);
    setErrors(errs);
    if (errs.length === 0) setStep('preview');
  };

  const doImport = async () => {
    setStep('importing');
    const defaultAgency = agencies[0]?.id || 'default';
    const defaultEmployee = employees[0]?.id || 'default';
    let count = 0;
    const validRows = mappedRows.filter(r => r.name?.trim() && r.email?.trim());

    const resolveEmployee = (val?: string) => {
      if (!val) return defaultEmployee;
      const match = employees.find(e => e.name.toLowerCase() === val.toLowerCase() || e.id === val || e.email.toLowerCase() === val.toLowerCase());
      return match?.id || defaultEmployee;
    };
    const resolveAgency = (val?: string) => {
      if (!val) return defaultAgency;
      const match = agencies.find(a => a.name.toLowerCase() === val.toLowerCase() || a.id === val);
      return match?.id || defaultAgency;
    };
    const validStatuses = ['new', 'contacted', 'appointment', 'follow_up', 'hired', 'rejected'];
    const resolveStatus = (val?: string) => {
      if (!val) return 'new';
      const lower = val.toLowerCase().trim();
      return validStatuses.includes(lower) ? lower : 'new';
    };

    for (const row of validRows) {
      try {
        const campaignNote = row.campaign ? `Kampagne: ${row.campaign}` : '';
        const combinedNotes = [row.notes, campaignNote].filter(Boolean).join(' | ');

        await addLead({
          name: row.name,
          email: row.email,
          phone: row.phone || '',
          address: row.address || '',
          plz: row.plz || '',
          city: row.city || '',
          canton: row.canton || '',
          cantonCode: row.cantonCode || '',
          position: row.position || '',
          source: (row.source as any) || 'csv_import',
          status: resolveStatus(row.status) as any,
          agencyId: resolveAgency(row.agencyId),
          employeeId: resolveEmployee(row.employeeId),
          notes: row.notes || '',
          campaign: row.campaign || '',
          lifecycle: 'active',
        });
        count++;
      } catch {
        // skip failed rows
      }
    }
    setImportCount(count);
    toast.success(`${count} Lead(s) erfolgreich importiert.`);
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
          <Upload className="h-4 w-4" /> CSV Import
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Leads per CSV importieren
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-12 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">CSV-Datei hierher ziehen oder klicken</p>
            <p className="text-xs text-muted-foreground">Unterstützt: .csv (Komma, Semikolon oder Tab-getrennt)</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{csvRows.length} Zeilen erkannt. Ordnen Sie die Spalten den Lead-Feldern zu.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {csvHeaders.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm font-medium">{h}</span>
                  <span className="text-muted-foreground">→</span>
                  <select
                    value={mapping[i] || ''}
                    onChange={e => setMapping(prev => {
                      const next = { ...prev };
                      if (e.target.value) next[i] = e.target.value;
                      else delete next[i];
                      return next;
                    })}
                    className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Nicht zuweisen —</option>
                    {ALL_FIELDS.map(f => (
                      <option key={f} value={f} disabled={Object.values(mapping).includes(f) && mapping[i] !== f}>
                        {FIELD_LABELS[f]} {REQUIRED_FIELDS.includes(f) ? '*' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {errors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 p-3 space-y-1">
                {errors.map((e, i) => (
                  <p key={i} className="flex items-center gap-2 text-xs text-destructive"><AlertTriangle className="h-3 w-3" /> {e}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={reset} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">Zurück</button>
              <button onClick={validateMapping} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">Weiter</button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              {mappedRows.filter(r => r.name?.trim() && r.email?.trim()).length} Leads bereit zum Import
            </p>
            <div className="rounded-xl border overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {Object.values(mapping).map(f => <th key={f} className="px-3 py-2 text-left font-medium">{FIELD_LABELS[f]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {Object.values(mapping).map(f => <td key={f} className="px-3 py-2 truncate max-w-[150px]">{row[f]}</td>)}
                    </tr>
                  ))}
                  {mappedRows.length > 10 && (
                    <tr><td colSpan={Object.keys(mapping).length} className="px-3 py-2 text-center text-muted-foreground">… und {mappedRows.length - 10} weitere</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep('map')} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">Zurück</button>
              <button onClick={doImport} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                Importieren
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Leads werden importiert…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
