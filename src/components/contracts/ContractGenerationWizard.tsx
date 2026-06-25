import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  renderPlaceholders, findMissingRequired, DEFAULT_COMPANY,
  type ContractArea, type TargetGroupCode, type PlaceholderContext,
} from '@/lib/contract-placeholders';
import { useCareerLevels } from '@/hooks/useCareerLevels';

interface Props {
  leadId: string;
  leadName: string;
  open: boolean;
  onClose: () => void;
  onCreated?: (contractId: string) => void;
}

const LANGUAGES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Französisch' },
  { value: 'it', label: 'Italienisch' },
];

const POSITIONS = [
  'Versicherungsberater',
  'Senior Versicherungsberater',
  'Teamleiter',
  'Sales Leader',
  'General Agent',
  'Sachbearbeiter Innendienst',
  'Operations Manager',
  'Finanzcoach',
  'Trainee',
  'Kooperationspartner',
  'Leadlieferant',
];

const STEPS = [
  'Vertragsart', 'Position', 'Bereich', 'Sprache', 'Vertragsset',
  'Kandidatendaten', 'Beschäftigung', 'Anhänge', 'Vorschau',
];

export default function ContractGenerationWizard({ leadId, leadName, open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [lead, setLead] = useState<any>(null);

  // Lookups
  const [kinds, setKinds] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [setItems, setSetItems] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [template, setTemplate] = useState<any>(null);

  // Selections
  const [kindCode, setKindCode] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [area, setArea] = useState<ContractArea>('sales');
  const [language, setLanguage] = useState('de');
  const [setId, setSetId] = useState<string>('');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Beschäftigungsdaten
  const [form, setForm] = useState({
    start_date: '', workload: '100%', salary_monthly: '', salary_yearly: '',
    location: '', agency: '', manager_name: '',
    notice_period: '1 Monat', probation_period: '3 Monate',
    thirteenth_salary: true,
    careerplan_level: '', careerplan_role: '', careerplan_target_level: '',
    commission_model: '',
    leadership_type: '', leadership_allowance: '', leadership_team_size: '',
    leadership_role: '', leadership_level: '',
    contract_place: '',
  });

  const [preview, setPreview] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0); setKindCode(''); setPosition(''); setArea('sales');
      setLanguage('de'); setSetId(''); setSelectedDocs(new Set());
      setTemplate(null); setPreview(''); setMissing([]);
    }
  }, [open]);

  // Lead laden
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from('leads').select('*').eq('id', leadId).single();
      setLead(data);
    })();
  }, [open, leadId]);

  // Vertragsarten + Sets laden
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: k } = await supabase.from('contract_kinds')
        .select('*').eq('is_active', true).order('sort_order');
      setKinds(k ?? []);
      const { data: s } = await supabase.from('contract_sets')
        .select('*').eq('is_active', true).order('sort_order');
      setSets(s ?? []);
    })();
  }, [open]);

  // Default-Bereich aus Vertragsart
  useEffect(() => {
    if (!kindCode) return;
    const isOffice = ['INNENDIENST', 'OPERATIONS', 'FINANZCOACH'].some(c => kindCode.toUpperCase().includes(c));
    setArea(isOffice ? 'office' : 'sales');
  }, [kindCode]);

  // Sets passend zu Auswahl
  const filteredSets = useMemo(() => {
    return sets.filter(s => {
      if (s.kind_code && kindCode && s.kind_code !== kindCode) return false;
      if (s.area && s.area !== area) return false;
      if (s.language && s.language !== language) return false;
      if (s.position_codes?.length && position && !s.position_codes.includes(position)) return false;
      return true;
    });
  }, [sets, kindCode, area, language, position]);

  // Vertragsset → Items + Vorlage + Dokumente laden
  useEffect(() => {
    if (!setId) { setSetItems([]); setDocuments([]); setTemplate(null); setSelectedDocs(new Set()); return; }
    (async () => {
      const { data: items } = await supabase
        .from('contract_set_items')
        .select('*, contract_categories(code,label_de,is_attachment)')
        .eq('set_id', setId)
        .order('sort_order');
      setSetItems(items ?? []);

      const catCodes = (items ?? []).map((i: any) => i.category_code);
      if (catCodes.length) {
        const { data: docs } = await supabase.from('contract_documents')
          .select('*')
          .eq('status', 'active')
          .eq('language', language)
          .in('category_code', catCodes);
        setDocuments(docs ?? []);

        // Pflichtanhänge vorauswählen (erstes passendes aktives Dokument pro Pflichtkategorie)
        const pre = new Set<string>();
        for (const item of items || []) {
          if (!item.is_mandatory) continue;
          const doc = (docs || []).find((d: any) => d.category_code === item.category_code);
          if (doc) pre.add(doc.id);
        }
        setSelectedDocs(pre);

        // Hauptvertrag-Template (role = main) als Vorlage
        const mainItem = (items || []).find((i: any) => i.role === 'main');
        if (mainItem) {
          const { data: tpl } = await supabase.from('contract_templates')
            .select('*')
            .eq('status', 'active')
            .eq('area', area)
            .eq('language', language)
            .limit(1).maybeSingle();
          setTemplate(tpl);
        }
      } else {
        setDocuments([]);
      }
    })();
  }, [setId, language, area]);

  function buildContext(): PlaceholderContext {
    const fn = lead?.name?.split(' ')[0];
    const ln = lead?.name?.split(' ').slice(1).join(' ');
    const targetGroup = (sets.find(s => s.id === setId)?.target_group_code || '') as TargetGroupCode;
    return {
      candidate: {
        first_name: fn, last_name: ln, full_name: lead?.name,
        address: lead?.address, zip: lead?.zip, city: lead?.city,
        birth_date: lead?.birth_date, email: lead?.email, phone: lead?.phone,
      },
      employment: {
        start_date: form.start_date, position,
        department: area === 'sales' ? 'Vertrieb' : 'Innendienst',
        workload: form.workload,
        salary_monthly: form.salary_monthly,
        salary_yearly: form.salary_yearly,
        salary_13_months: form.thirteenth_salary ? 'Ja' : 'Nein',
        location: form.location, agency: form.agency,
        manager: form.manager_name,
        probation_period: form.probation_period,
        notice_period: form.notice_period,
      },
      careerplan: area === 'sales' ? {
        level: form.careerplan_level,
        role: form.careerplan_role || position,
        target_level: form.careerplan_target_level || form.careerplan_level,
        commission_model: form.commission_model,
      } : {},
      leadership: targetGroup === 'FK' ? {
        type: form.leadership_type, allowance: form.leadership_allowance,
        team_size: form.leadership_team_size, role: form.leadership_role,
        level: form.leadership_level,
      } : {},
      company: DEFAULT_COMPANY,
      contract: { place: form.contract_place, language, type: 'Arbeitsvertrag' },
    };
  }

  function generatePreview() {
    if (!template?.body_html) { toast.error('Keine aktive Hauptvorlage gefunden.'); return; }
    const tg = sets.find(s => s.id === setId)?.target_group_code as TargetGroupCode | undefined;
    const ctx = buildContext();
    const m = findMissingRequired(template.body_html, ctx, area, tg);
    setMissing(m.map(x => `${x.label} ({{${x.key}}})`));
    setPreview(renderPlaceholders(template.body_html, ctx, area, tg));
  }

  async function generateContract() {
    if (!template) { toast.error('Keine Vorlage'); return; }
    if (missing.length > 0) { toast.error('Bitte zuerst Pflichtfelder ausfüllen.'); return; }
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const setRow = sets.find(s => s.id === setId);

    const { data: contract, error } = await supabase.from('contracts').insert({
      candidate_lead_id: leadId,
      template_id: template.id, template_version: template.version,
      area, language, position: position || null,
      careerplan_level: area === 'sales' ? (form.careerplan_level || null) : null,
      start_date: form.start_date || null, workload: form.workload || null,
      salary: form.salary_monthly || form.salary_yearly || null,
      commission_model: form.commission_model || null,
      location: form.location || null, manager_name: form.manager_name || null,
      body_html: preview, status: 'draft', created_by: user?.id,
      kind_code: kindCode || null,
      target_group_code: setRow?.target_group_code || null,
      set_id: setId || null,
      agency_name: form.agency || null,
      notice_period: form.notice_period || null,
      probation_period: form.probation_period || null,
      thirteenth_salary: form.thirteenth_salary,
    }).select().single();

    if (error) { setSaving(false); toast.error(error.message); return; }

    // Anhänge anlegen
    if (selectedDocs.size > 0) {
      const docsArr = documents.filter(d => selectedDocs.has(d.id));
      const rows = docsArr
        .filter(d => d.template_storage_path || d.original_storage_path)
        .map(d => ({
          contract_id: (contract as any).id,
          name: d.name,
          storage_path: d.template_storage_path || d.original_storage_path,
          mime_type: d.template_mime_type || d.original_mime_type,
          size_bytes: d.template_size_bytes ?? d.original_size_bytes ?? null,
        }));
      if (rows.length) await supabase.from('contract_attachments').insert(rows);
    }

    setSaving(false);
    toast.success('Vertrag erstellt');
    onCreated?.((contract as any).id);
    onClose();
  }

  const canNext = () => {
    switch (step) {
      case 0: return !!kindCode;
      case 1: return !!position;
      case 2: return !!area;
      case 3: return !!language;
      case 4: return !!setId;
      default: return true;
    }
  };

  const targetGroup = sets.find(s => s.id === setId)?.target_group_code as TargetGroupCode | undefined;
  const showCareer = area === 'sales';
  const showLeadership = targetGroup === 'FK';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Vertrag generieren – {leadName}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex flex-wrap gap-1 text-[11px]">
          {STEPS.map((s, i) => (
            <Badge key={s} variant={i === step ? 'default' : i < step ? 'secondary' : 'outline'}>
              {i + 1}. {s}
            </Badge>
          ))}
        </div>

        <div className="mt-4">
          {step === 0 && (
            <div className="space-y-3">
              <Label>Vertragsart</Label>
              <Select value={kindCode} onValueChange={setKindCode}>
                <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                <SelectContent>
                  {kinds.map(k => <SelectItem key={k.code} value={k.code}>{k.label_de}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <Label>Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label>Bereich</Label>
              <Select value={area} onValueChange={(v: any) => setArea(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Vertrieb</SelectItem>
                  <SelectItem value="office">Innendienst</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {area === 'office'
                  ? 'Innendienst – Karriereplan-, Score- und Leadership-Felder werden ausgeblendet.'
                  : 'Vertrieb – Karriereplan und ggf. Leadership werden angezeigt.'}
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Label>Sprache</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Label>Vertragsset</Label>
              {filteredSets.length === 0 ? (
                <p className="text-xs text-muted-foreground">Keine passenden Sets gefunden. Bitte unter „Vertragssets" anlegen.</p>
              ) : (
                <Select value={setId} onValueChange={setSetId}>
                  <SelectTrigger><SelectValue placeholder="Set wählen…" /></SelectTrigger>
                  <SelectContent>
                    {filteredSets.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {setItems.length > 0 && (
                <div className="rounded border p-2 text-xs">
                  <div className="font-medium mb-1">Bestandteile</div>
                  <ul className="space-y-0.5">
                    {setItems.map(i => (
                      <li key={i.id} className="flex items-center gap-2">
                        <Badge variant={i.role === 'main' ? 'default' : i.is_mandatory ? 'secondary' : 'outline'} className="text-[10px]">
                          {i.role === 'main' ? 'Haupt' : i.is_mandatory ? 'Pflicht' : 'Optional'}
                        </Badge>
                        <span>{i.contract_categories?.label_de ?? i.category_code}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-2">
              <Label>Kandidatendaten</Label>
              <div className="rounded border p-3 text-sm grid grid-cols-2 gap-2">
                <Row k="Name" v={lead?.name} />
                <Row k="Geburtsdatum" v={lead?.birth_date} />
                <Row k="E-Mail" v={lead?.email} />
                <Row k="Telefon" v={lead?.phone} />
                <Row k="Adresse" v={lead?.address} />
                <Row k="PLZ / Ort" v={[lead?.zip, lead?.city].filter(Boolean).join(' ')} />
              </div>
              <p className="text-xs text-muted-foreground">Daten werden aus dem Kandidatenprofil gelesen und nicht verändert.</p>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <section>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Beschäftigung</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Eintrittsdatum" type="date" value={form.start_date} onChange={v => setForm({ ...form, start_date: v })} />
                  <Field label="Pensum" value={form.workload} onChange={v => setForm({ ...form, workload: v })} />
                  <Field label="Monatslohn" value={form.salary_monthly} onChange={v => setForm({ ...form, salary_monthly: v })} placeholder="CHF 6'500" />
                  <Field label="Jahreslohn" value={form.salary_yearly} onChange={v => setForm({ ...form, salary_yearly: v })} />
                  <Field label="Arbeitsort" value={form.location} onChange={v => setForm({ ...form, location: v })} />
                  <Field label="Agentur" value={form.agency} onChange={v => setForm({ ...form, agency: v })} />
                  <Field label="Vorgesetzter" value={form.manager_name} onChange={v => setForm({ ...form, manager_name: v })} />
                  <Field label="Kündigungsfrist" value={form.notice_period} onChange={v => setForm({ ...form, notice_period: v })} />
                  <Field label="Probezeit" value={form.probation_period} onChange={v => setForm({ ...form, probation_period: v })} />
                  <div className="col-span-2 flex items-center justify-between rounded border p-2">
                    <div>
                      <Label className="text-sm">13. Monatslohn</Label>
                      <p className="text-xs text-muted-foreground">Falls aktiviert, wird ein 13. Monatslohn vereinbart.</p>
                    </div>
                    <Switch checked={form.thirteenth_salary} onCheckedChange={v => setForm({ ...form, thirteenth_salary: v })} />
                  </div>
                </div>
              </section>

              {showCareer && (
                <section>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Karriereplan</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Karriereplan-Stufe</Label>
                      <CareerSelect position={position} value={form.careerplan_level} onChange={v => setForm({ ...form, careerplan_level: v })} />
                    </div>
                    <Field label="Rolle" value={form.careerplan_role} onChange={v => setForm({ ...form, careerplan_role: v })} />
                    <Field label="Zielstufe" value={form.careerplan_target_level} onChange={v => setForm({ ...form, careerplan_target_level: v })} />
                    <Field label="Provisionsmodell" value={form.commission_model} onChange={v => setForm({ ...form, commission_model: v })} />
                  </div>
                </section>
              )}

              {showLeadership && (
                <section>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Leadership</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Führungsart" value={form.leadership_type} onChange={v => setForm({ ...form, leadership_type: v })} />
                    <Field label="Führungszulage" value={form.leadership_allowance} onChange={v => setForm({ ...form, leadership_allowance: v })} />
                    <Field label="Teamgrösse" value={form.leadership_team_size} onChange={v => setForm({ ...form, leadership_team_size: v })} />
                    <Field label="Führungsrolle" value={form.leadership_role} onChange={v => setForm({ ...form, leadership_role: v })} />
                    <Field label="Führungsstufe" value={form.leadership_level} onChange={v => setForm({ ...form, leadership_level: v })} />
                  </div>
                </section>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-2">
              <Label>Anhänge</Label>
              {setItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Keine Anhänge im Set definiert.</p>
              ) : (
                <div className="space-y-2">
                  {setItems.map(item => {
                    const docs = documents.filter(d => d.category_code === item.category_code);
                    return (
                      <div key={item.id} className="rounded border p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={item.is_mandatory ? 'secondary' : 'outline'} className="text-[10px]">
                            {item.is_mandatory ? 'Pflicht' : 'Optional'}
                          </Badge>
                          <span className="text-sm font-medium">{item.contract_categories?.label_de ?? item.category_code}</span>
                        </div>
                        {docs.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Keine Dokumente in dieser Kategorie ({language.toUpperCase()}).</p>
                        ) : (
                          <ul className="space-y-1">
                            {docs.map(d => (
                              <li key={d.id} className="flex items-center gap-2 text-xs">
                                <Checkbox
                                  checked={selectedDocs.has(d.id)}
                                  disabled={item.is_mandatory && docs.length === 1}
                                  onCheckedChange={(v) => {
                                    const next = new Set(selectedDocs);
                                    if (v) next.add(d.id); else next.delete(d.id);
                                    setSelectedDocs(next);
                                  }}
                                />
                                <span>{d.name}</span>
                                <span className="text-muted-foreground">v{d.version}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 8 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Vorschau</Label>
                <Button size="sm" variant="outline" onClick={generatePreview}>Vorschau aktualisieren</Button>
              </div>
              {missing.length > 0 && (
                <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-destructive mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" />Fehlende Pflichtfelder
                  </div>
                  <ul>{missing.map(m => <li key={m}>• {m}</li>)}</ul>
                </div>
              )}
              <ScrollArea className="h-72 rounded border bg-muted/30 p-3">
                {preview
                  ? <div className="prose prose-sm max-w-none bg-background p-3 rounded" dangerouslySetInnerHTML={{ __html: preview }} />
                  : <p className="text-xs text-muted-foreground text-center py-8">Noch keine Vorschau – „Vorschau aktualisieren" klicken.</p>}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}><ChevronLeft className="h-4 w-4" />Zurück</Button>}
          {step < STEPS.length - 1 && (
            <Button onClick={() => { if (step === 7) generatePreview(); setStep(s => s + 1); }} disabled={!canNext()}>
              Weiter<ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {step === STEPS.length - 1 && (
            <Button onClick={generateContract} disabled={saving || !preview}>
              {saving ? 'Erstelle…' : 'Vertrag erstellen & öffnen'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{k}: </span>
      <span className="font-medium">{v || '–'}</span>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function CareerSelect({ position, value, onChange }: { position: string; value: string; onChange: (v: string) => void }) {
  const { levels, loading } = useCareerLevels(position);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? 'Lade Stufen…' : (levels.length ? 'Stufe wählen' : 'Keine Stufen hinterlegt')} />
      </SelectTrigger>
      <SelectContent>
        {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
