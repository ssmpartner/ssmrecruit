import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle, ChevronLeft, ChevronRight, Eye, FileText, GripVertical,
  Pencil, Search, User, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  renderPlaceholders, findMissingRequired, DEFAULT_COMPANY,
  type ContractArea, type TargetGroupCode, type PlaceholderContext,
} from '@/lib/contract-placeholders';
import { useCareerLevels } from '@/hooks/useCareerLevels';
import LibraryPreviewDialog from './LibraryPreviewDialog';

interface Props {
  leadId?: string;
  leadName?: string;
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
  'Versicherungsberater', 'Senior Versicherungsberater', 'Teamleiter', 'Sales Leader',
  'General Agent', 'Sachbearbeiter Innendienst', 'Operations Manager', 'Finanzcoach',
  'Trainee', 'Kooperationspartner', 'Leadlieferant',
];

const STEPS = ['Für wen?', 'Angaben', 'Dokumente', 'Prüfen & Generieren'];

type Person = {
  type: 'lead' | 'employee';
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  birth_date?: string | null;
};

type AttachmentRow = {
  itemId: string;
  categoryCode: string;
  categoryLabel: string;
  mandatory: boolean;
  doc: any | null;
};

export default function ContractGenerationWizard({ leadId, leadName, open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);

  // Schritt 1
  const [person, setPerson] = useState<Person | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [kinds, setKinds] = useState<any[]>([]);
  const [kindCode, setKindCode] = useState('');
  const [language, setLanguage] = useState('de');
  const [sets, setSets] = useState<any[]>([]);
  const [setId, setSetId] = useState('');

  // Geladene Daten zum Set
  const [setItems, setSetItems] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [template, setTemplate] = useState<any>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Schritt 2
  const [personal, setPersonal] = useState({
    first_name: '', last_name: '', birth_date: '', email: '', phone: '',
    address: '', zip: '', city: '',
  });
  const [form, setForm] = useState({
    start_date: '', position: '', workload: '100%',
    salary_monthly: '', salary_yearly: '',
    location: '', agency: '', manager_name: '',
    notice_period: '1 Monat', probation_period: '3 Monate',
    thirteenth_salary: true,
    careerplan_level: '', careerplan_role: '', careerplan_target_level: '', commission_model: '',
    leadership_type: '', leadership_allowance: '', leadership_team_size: '',
    leadership_role: '', leadership_level: '',
    contract_place: '',
  });

  // Schritt 3
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>([]); // itemIds der Anhänge
  const [editedHtml, setEditedHtml] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [mainPreviewOpen, setMainPreviewOpen] = useState(false);
  const dragId = useRef<string | null>(null);

  const [saving, setSaving] = useState(false);

  // ---------- Initialisierung ----------
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPerson(null); setSearch(''); setResults([]);
    setKindCode(''); setLanguage('de'); setSetId('');
    setSetItems([]); setDocuments([]); setTemplate(null); setTemplateError(null);
    setSelectedDocs(new Set()); setOrder([]); setEditedHtml(null);
    setSaving(false);
    (async () => {
      const [{ data: k }, { data: s }] = await Promise.all([
        supabase.from('contract_kinds').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('contract_sets').select('*').eq('is_active', true).order('sort_order'),
      ]);
      setKinds(k ?? []); setSets(s ?? []);
      if (leadId) {
        const { data: l } = await supabase.from('leads').select('*').eq('id', leadId).single();
        if (l) selectPerson(leadToPerson(l));
      }
    })();
  }, [open, leadId]);

  function leadToPerson(l: any): Person {
    return {
      type: 'lead', id: l.id, name: l.name || '',
      first_name: l.name?.split(' ')[0] || '',
      last_name: l.name?.split(' ').slice(1).join(' ') || '',
      email: l.email, phone: l.phone, address: l.address,
      zip: l.zip, city: l.city, birth_date: l.birth_date,
    };
  }
  function employeeToPerson(e: any): Person {
    return {
      type: 'employee', id: e.id, name: e.name || '',
      first_name: e.name?.split(' ')[0] || '',
      last_name: e.name?.split(' ').slice(1).join(' ') || '',
      email: e.email, phone: e.phone, address: e.address,
      zip: e.zip, city: e.city, birth_date: e.birth_date,
    };
  }

  function selectPerson(p: Person) {
    setPerson(p);
    setPersonal({
      first_name: p.first_name || '', last_name: p.last_name || '',
      birth_date: p.birth_date || '', email: p.email || '', phone: p.phone || '',
      address: p.address || '', zip: p.zip || '', city: p.city || '',
    });
    setSearch(''); setResults([]);
  }

  // Personensuche (Leads + Mitarbeiter)
  useEffect(() => {
    if (!search || search.trim().length < 2) { setResults([]); return; }
    const q = search.trim();
    setSearching(true);
    const t = setTimeout(async () => {
      const [{ data: leads }, { data: emps }] = await Promise.all([
        supabase.from('leads').select('id,name,email,phone,address,zip,city,birth_date')
          .or(`name.ilike.%${q}%,email.ilike.%${q}%`).limit(6),
        supabase.from('employees').select('*')
          .or(`name.ilike.%${q}%,email.ilike.%${q}%`).limit(6),
      ]);
      setResults([
        ...(leads ?? []).map(leadToPerson),
        ...(emps ?? []).map(employeeToPerson),
      ]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Bereich aus Vertragsart ableiten
  const area: ContractArea = useMemo(() => {
    const isOffice = ['INNENDIENST', 'OPERATIONS', 'FINANZCOACH'].some(c => kindCode.toUpperCase().includes(c));
    return isOffice ? 'office' : 'sales';
  }, [kindCode]);

  // Passende Sets
  const matchingSets = useMemo(() => sets.filter(s => {
    if (s.kind_code && kindCode && s.kind_code !== kindCode) return false;
    if (s.area && s.area !== area) return false;
    if (s.language && s.language !== language) return false;
    return true;
  }), [sets, kindCode, area, language]);

  // Bestes Set automatisch wählen (exakte Übereinstimmung zuerst)
  useEffect(() => {
    if (!matchingSets.length) { setSetId(''); return; }
    const exact = matchingSets.find(s => s.kind_code === kindCode && s.language === language && s.area === area);
    const best = exact ?? matchingSets[0];
    if (!matchingSets.some(s => s.id === setId)) setSetId(best.id);
  }, [matchingSets, kindCode, language, area, setId]);

  const activeSet = sets.find(s => s.id === setId);
  const targetGroup = activeSet?.target_group_code as TargetGroupCode | undefined;

  // Set-Items, Dokumente, Hauptvorlage laden
  useEffect(() => {
    if (!setId) { setSetItems([]); setDocuments([]); setTemplate(null); setTemplateError(null); return; }
    (async () => {
      const { data: items } = await supabase
        .from('contract_set_items')
        .select('*, contract_categories(code,label_de,is_attachment)')
        .eq('set_id', setId)
        .order('sort_order');
      setSetItems(items ?? []);
      setOrder((items ?? []).filter((i: any) => i.role !== 'main').map((i: any) => i.id));

      const catCodes = (items ?? []).map((i: any) => i.category_code);
      if (!catCodes.length) { setDocuments([]); return; }

      const { data: docs } = await supabase.from('contract_documents')
        .select('*').eq('status', 'active').eq('language', language).in('category_code', catCodes);
      setDocuments(docs ?? []);

      // Pflichtdokumente vorauswählen
      const pre = new Set<string>();
      for (const item of items || []) {
        if (item.role === 'main' || !item.is_mandatory) continue;
        const doc = (docs || []).find((d: any) => d.category_code === item.category_code);
        if (doc) pre.add(doc.id);
      }
      setSelectedDocs(pre);
      setEditedHtml(null);

      // Hauptvorlage: stufige Suche
      const mainItem = (items || []).find((i: any) => i.role === 'main');
      if (!mainItem) {
        setTemplate(null);
        setTemplateError('Dieses Vertragsset enthält keinen Hauptvertrag. Bitte unter „Vertragssets" ein Haupt-Element hinterlegen.');
        return;
      }
      const catCode = mainItem.category_code as string | null;
      const catLabel = mainItem.contract_categories?.label_de || catCode || '–';
      const kindLabel = kinds.find(k => k.code === kindCode)?.label_de || kindCode || '–';
      const langLabel = LANGUAGES.find(l => l.value === language)?.label || language;

      const attempts: { kind?: string; cat?: string }[] = [
        ...(kindCode ? [{ kind: kindCode, cat: catCode ?? undefined }] : []),
        ...(kindCode ? [{ kind: kindCode }] : []),
        ...(catCode ? [{ cat: catCode }] : []),
        {},
      ];
      let tpl: any = null;
      for (const a of attempts) {
        let q = supabase.from('contract_templates').select('*')
          .eq('status', 'active').eq('area', area).eq('language', language);
        if (a.kind) q = q.eq('kind_code', a.kind);
        if (a.cat) q = q.eq('category_code', a.cat);
        const { data } = await q.order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if (data) { tpl = data; break; }
      }
      setTemplate(tpl);
      setTemplateError(tpl ? null
        : `Es wurde keine aktive Vorlage gefunden für: Vertragsart „${kindLabel}", Kategorie „${catLabel}", Sprache „${langLabel}" (Bereich: ${area === 'sales' ? 'Vertrieb' : 'Innendienst'}). Bitte unter „Vorlagen" eine entsprechende Vorlage hinterlegen.`);
    })();
  }, [setId, language, area, kindCode, kinds]);

  const effectiveHtml = editedHtml ?? template?.body_html ?? '';

  function buildContext(): PlaceholderContext {
    return {
      candidate: {
        first_name: personal.first_name, last_name: personal.last_name,
        full_name: `${personal.first_name} ${personal.last_name}`.trim(),
        address: personal.address, zip: personal.zip, city: personal.city,
        birth_date: personal.birth_date, email: personal.email, phone: personal.phone,
      },
      employment: {
        start_date: form.start_date, position: form.position,
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
        role: form.careerplan_role || form.position,
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

  // Pflichtfeld-Prüfung (Schritt 2)
  const missing = useMemo(() => {
    if (!effectiveHtml) return [];
    return findMissingRequired(effectiveHtml, buildContext(), area, targetGroup);
  }, [effectiveHtml, personal, form, area, targetGroup]); // eslint-disable-line react-hooks/exhaustive-deps
  const missingKeys = useMemo(() => new Set(missing.map(m => m.key)), [missing]);

  const miss = (...keys: string[]) => keys.some(k => missingKeys.has(k));

  // Anhänge in gewählter Reihenfolge
  const attachments: AttachmentRow[] = useMemo(() => {
    const items = setItems.filter(i => i.role !== 'main');
    const sorted = [...items].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    return sorted.map(item => ({
      itemId: item.id,
      categoryCode: item.category_code,
      categoryLabel: item.contract_categories?.label_de ?? item.category_code,
      mandatory: !!item.is_mandatory,
      doc: documents.filter(d => d.category_code === item.category_code)
        .find(d => selectedDocs.has(d.id))
        ?? documents.find(d => d.category_code === item.category_code)
        ?? null,
    }));
  }, [setItems, order, documents, selectedDocs]);

  function toggleDoc(row: AttachmentRow) {
    if (!row.doc || row.mandatory) return;
    const next = new Set(selectedDocs);
    if (next.has(row.doc.id)) next.delete(row.doc.id); else next.add(row.doc.id);
    setSelectedDocs(next);
  }

  function onDropItem(targetId: string) {
    const src = dragId.current;
    if (!src || src === targetId) return;
    const next = order.filter(id => id !== src);
    next.splice(next.indexOf(targetId), 0, src);
    setOrder(next);
    dragId.current = null;
  }

  const canNext = () => {
    switch (step) {
      case 0: return !!person && !!kindCode && !!language && !!setId;
      case 1: return missing.length === 0 && !!template;
      default: return true;
    }
  };

  const renderedPreview = useMemo(() => {
    if (!effectiveHtml) return '';
    return renderPlaceholders(effectiveHtml, buildContext(), area, targetGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveHtml, personal, form, area, targetGroup]);

  async function generateContract() {
    if (!template || !person) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const overrides: Record<string, string> = {
        'candidate.first_name': personal.first_name, 'candidate.last_name': personal.last_name,
        'candidate.full_name': `${personal.first_name} ${personal.last_name}`.trim(),
        'candidate.address': personal.address, 'candidate.zip': personal.zip,
        'candidate.city': personal.city, 'candidate.birth_date': personal.birth_date,
        'candidate.email': personal.email, 'candidate.phone': personal.phone,
        'employment.start_date': form.start_date, 'employment.position': form.position,
        'employment.workload': form.workload,
        'employment.salary_monthly': form.salary_monthly, 'employment.salary_yearly': form.salary_yearly,
        'employment.salary_13_months': form.thirteenth_salary ? 'Ja' : 'Nein',
        'employment.location': form.location, 'employment.agency': form.agency,
        'employment.manager': form.manager_name,
        'employment.probation_period': form.probation_period, 'employment.notice_period': form.notice_period,
        'careerplan.level': form.careerplan_level, 'careerplan.commission_model': form.commission_model,
      };

      const { data: contract, error } = await supabase.from('contracts').insert({
        candidate_lead_id: person.type === 'lead' ? person.id : null,
        employee_id: person.type === 'employee' ? person.id : null,
        template_id: template.id, template_version: template.version,
        area, language, position: form.position || null,
        careerplan_level: area === 'sales' ? (form.careerplan_level || null) : null,
        start_date: form.start_date || null, workload: form.workload || null,
        salary: form.salary_monthly || form.salary_yearly || null,
        commission_model: form.commission_model || null,
        location: form.location || null, manager_name: form.manager_name || null,
        body_html: renderedPreview, status: 'draft', created_by: user?.id,
        kind_code: kindCode || null,
        target_group_code: activeSet?.target_group_code || null,
        set_id: setId || null,
        agency_name: form.agency || null,
        notice_period: form.notice_period || null,
        probation_period: form.probation_period || null,
        thirteenth_salary: form.thirteenth_salary,
        placeholder_overrides: overrides,
      } as any).select().single();

      if (error) throw error;

      const rows = attachments
        .filter(a => a.doc && selectedDocs.has(a.doc.id) && (a.doc.template_storage_path || a.doc.original_storage_path))
        .map((a, idx) => ({
          contract_id: (contract as any).id,
          name: a.doc.name,
          storage_path: a.doc.template_storage_path || a.doc.original_storage_path,
          mime_type: a.doc.template_mime_type || a.doc.original_mime_type,
          size_bytes: a.doc.template_size_bytes ?? a.doc.original_size_bytes ?? null,
          sort_order: idx + 1,
        }));
      if (rows.length) await supabase.from('contract_attachments').insert(rows);

      toast.success(`Vertrag ${(contract as any).contract_number ?? ''} erstellt`.trim());
      onCreated?.((contract as any).id);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  }

  const showCareer = area === 'sales';
  const showLeadership = targetGroup === 'FK';

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Neuer Vertrag{person && ` – ${`${personal.first_name} ${personal.last_name}`.trim()}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-1 text-[11px]">
            {STEPS.map((s, i) => (
              <Badge key={s} variant={i === step ? 'default' : i < step ? 'secondary' : 'outline'}>
                {i + 1}. {s}
              </Badge>
            ))}
          </div>

          <div className="mt-4">
            {/* ============ SCHRITT 1: Für wen? ============ */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label>Person</Label>
                  {person ? (
                    <div className="flex items-center justify-between rounded border p-2.5 mt-1">
                      <div className="flex items-center gap-2">
                        {person.type === 'lead' ? <User className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4 text-primary" />}
                        <div>
                          <div className="text-sm font-medium">{person.name || `${personal.first_name} ${personal.last_name}`}</div>
                          <div className="text-xs text-muted-foreground">
                            {person.type === 'lead' ? 'Kandidat' : 'Mitarbeiter'}{person.email ? ` · ${person.email}` : ''}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setPerson(null)}>Ändern</Button>
                    </div>
                  ) : (
                    <div className="relative mt-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Name oder E-Mail eingeben (Kandidaten und Mitarbeiter)…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                      {(results.length > 0 || searching) && (
                        <div className="absolute z-10 mt-1 w-full rounded border bg-popover shadow-md">
                          {searching && <div className="p-2 text-xs text-muted-foreground">Suche…</div>}
                          {results.map(r => (
                            <button
                              key={`${r.type}-${r.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent flex items-center gap-2"
                              onClick={() => selectPerson(r)}
                            >
                              {r.type === 'lead' ? <User className="h-3.5 w-3.5 shrink-0" /> : <Users className="h-3.5 w-3.5 shrink-0" />}
                              <span className="text-sm">{r.name}</span>
                              <Badge variant="outline" className="text-[10px]">{r.type === 'lead' ? 'Kandidat' : 'Mitarbeiter'}</Badge>
                              {r.email && <span className="text-xs text-muted-foreground truncate">{r.email}</span>}
                            </button>
                          ))}
                          {!searching && results.length === 0 && (
                            <div className="p-2 text-xs text-muted-foreground">Keine Treffer.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Vertragsart</Label>
                    <Select value={kindCode} onValueChange={v => { setKindCode(v); setSetId(''); }}>
                      <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                      <SelectContent>
                        {kinds.map(k => <SelectItem key={k.code} value={k.code}>{k.label_de}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sprache</Label>
                    <Select value={language} onValueChange={v => { setLanguage(v); setSetId(''); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {kindCode && (
                  <div>
                    <Label>Vertragspaket</Label>
                    {matchingSets.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Für diese Vertragsart und Sprache ist noch kein Vertragspaket hinterlegt. Bitte unter „Vertragssets" anlegen.
                      </p>
                    ) : (
                      <div className="mt-1 space-y-1">
                        <div className="rounded border border-primary/40 bg-primary/5 p-2.5 text-sm font-medium">
                          {activeSet?.name}
                          <span className="block text-xs font-normal text-muted-foreground">Automatisch ausgewählt</span>
                        </div>
                        {matchingSets.filter(s => s.id !== setId).map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSetId(s.id)}
                            className="w-full text-left rounded border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                          >
                            Stattdessen: {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ============ SCHRITT 2: Angaben ============ */}
            {step === 1 && (
              <div className="space-y-4">
                {templateError && (
                  <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-destructive mb-1">
                      <AlertTriangle className="h-4 w-4" />Vorlage fehlt
                    </div>
                    <p className="text-xs">{templateError}</p>
                  </div>
                )}

                <section>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Persönliche Daten</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vorname" value={personal.first_name} error={miss('candidate.first_name', 'candidate.full_name')}
                      onChange={v => setPersonal({ ...personal, first_name: v })} />
                    <Field label="Nachname" value={personal.last_name} error={miss('candidate.last_name', 'candidate.full_name')}
                      onChange={v => setPersonal({ ...personal, last_name: v })} />
                    <Field label="Geburtsdatum" type="date" value={personal.birth_date} error={miss('candidate.birth_date')}
                      onChange={v => setPersonal({ ...personal, birth_date: v })} />
                    <Field label="E-Mail" value={personal.email} error={miss('candidate.email')}
                      onChange={v => setPersonal({ ...personal, email: v })} />
                    <Field label="Telefon" value={personal.phone} error={miss('candidate.phone')}
                      onChange={v => setPersonal({ ...personal, phone: v })} />
                    <Field label="Adresse" value={personal.address} error={miss('candidate.address')}
                      onChange={v => setPersonal({ ...personal, address: v })} />
                    <Field label="PLZ" value={personal.zip} error={miss('candidate.zip')}
                      onChange={v => setPersonal({ ...personal, zip: v })} />
                    <Field label="Ort" value={personal.city} error={miss('candidate.city')}
                      onChange={v => setPersonal({ ...personal, city: v })} />
                  </div>
                </section>

                <section>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Beschäftigung</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Eintrittsdatum" type="date" value={form.start_date} error={miss('employment.start_date')}
                      onChange={v => setForm({ ...form, start_date: v })} />
                    <div>
                      <Label>Position{miss('employment.position') && <span className="text-destructive"> *</span>}</Label>
                      <Select value={form.position} onValueChange={v => setForm({ ...form, position: v })}>
                        <SelectTrigger className={miss('employment.position') ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Wählen…" />
                        </SelectTrigger>
                        <SelectContent>
                          {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {showCareer && (
                      <div className="col-span-2">
                        <Label>Karrierestufe{miss('careerplan.level') && <span className="text-destructive"> *</span>}</Label>
                        <CareerSelect position={form.position} value={form.careerplan_level}
                          onChange={v => setForm({ ...form, careerplan_level: v })} />
                      </div>
                    )}
                    <Field label="Pensum" value={form.workload} error={miss('employment.workload')}
                      onChange={v => setForm({ ...form, workload: v })} />
                    <Field label="Monatslohn" value={form.salary_monthly} error={miss('employment.salary_monthly')}
                      onChange={v => setForm({ ...form, salary_monthly: v })} placeholder="CHF 6'500" />
                    <Field label="Jahreslohn" value={form.salary_yearly} error={miss('employment.salary_yearly')}
                      onChange={v => setForm({ ...form, salary_yearly: v })} />
                    <div className="col-span-2 flex items-center justify-between rounded border p-2">
                      <div>
                        <Label className="text-sm">13. Monatslohn</Label>
                        <p className="text-xs text-muted-foreground">Falls aktiviert, wird ein 13. Monatslohn vereinbart.</p>
                      </div>
                      <Switch checked={form.thirteenth_salary} onCheckedChange={v => setForm({ ...form, thirteenth_salary: v })} />
                    </div>
                    <Field label="Probezeit" value={form.probation_period} error={miss('employment.probation_period')}
                      onChange={v => setForm({ ...form, probation_period: v })} />
                    <Field label="Kündigungsfrist" value={form.notice_period} error={miss('employment.notice_period')}
                      onChange={v => setForm({ ...form, notice_period: v })} />
                    <Field label="Arbeitsort" value={form.location} error={miss('employment.location')}
                      onChange={v => setForm({ ...form, location: v })} />
                    <Field label="Agentur" value={form.agency} error={miss('employment.agency')}
                      onChange={v => setForm({ ...form, agency: v })} />
                    <Field label="Vorgesetzter" value={form.manager_name} error={miss('employment.manager')}
                      onChange={v => setForm({ ...form, manager_name: v })} />
                  </div>
                </section>

                {showCareer && (
                  <section>
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Karriereplan</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Rolle" value={form.careerplan_role} onChange={v => setForm({ ...form, careerplan_role: v })} />
                      <Field label="Zielstufe" value={form.careerplan_target_level} onChange={v => setForm({ ...form, careerplan_target_level: v })} />
                      <Field label="Provisionsmodell" value={form.commission_model} error={miss('careerplan.commission_model')}
                        onChange={v => setForm({ ...form, commission_model: v })} />
                    </div>
                  </section>
                )}

                {showLeadership && (
                  <section>
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Führung</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Führungsart" value={form.leadership_type} onChange={v => setForm({ ...form, leadership_type: v })} />
                      <Field label="Führungszulage" value={form.leadership_allowance} onChange={v => setForm({ ...form, leadership_allowance: v })} />
                      <Field label="Teamgrösse" value={form.leadership_team_size} onChange={v => setForm({ ...form, leadership_team_size: v })} />
                      <Field label="Führungsrolle" value={form.leadership_role} onChange={v => setForm({ ...form, leadership_role: v })} />
                      <Field label="Führungsstufe" value={form.leadership_level} onChange={v => setForm({ ...form, leadership_level: v })} />
                    </div>
                  </section>
                )}

                {missing.length > 0 && (
                  <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-destructive mb-1">
                      <AlertTriangle className="h-4 w-4" />Fehlende Pflichtangaben
                    </div>
                    <ul className="text-xs space-y-0.5">
                      {missing.map(m => <li key={m.key}>• {m.label}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ============ SCHRITT 3: Dokumente ============ */}
            {step === 2 && (
              <div className="space-y-2">
                {/* Hauptvertrag */}
                <div className="rounded border-2 border-primary/30 p-2.5 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Hauptvertrag</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {template?.title ?? 'Keine Vorlage'}
                      {editedHtml != null && ' · (individuell angepasst)'}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" title="Vorschau" onClick={() => setMainPreviewOpen(true)} disabled={!template}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Text für diesen Vertrag anpassen" onClick={() => setEditorOpen(true)} disabled={!template}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <Label className="pt-2 block">Anhänge <span className="text-xs text-muted-foreground font-normal">(Reihenfolge per Ziehen ändern)</span></Label>
                {attachments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Dieses Vertragspaket enthält keine Anhänge.</p>
                ) : (
                  <div className="space-y-1.5">
                    {attachments.map(row => (
                      <div
                        key={row.itemId}
                        draggable
                        onDragStart={() => { dragId.current = row.itemId; }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => onDropItem(row.itemId)}
                        className="rounded border p-2 flex items-center gap-2 bg-card"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                        <Checkbox
                          checked={!!row.doc && selectedDocs.has(row.doc.id)}
                          disabled={row.mandatory || !row.doc}
                          onCheckedChange={() => toggleDoc(row)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{row.doc?.name ?? row.categoryLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.categoryLabel}
                            {row.mandatory ? ' · Pflicht' : ' · Optional'}
                            {!row.doc && ' · kein Dokument in dieser Sprache hinterlegt'}
                          </div>
                        </div>
                        {row.mandatory && <Badge variant="secondary" className="text-[10px]">Pflicht</Badge>}
                        <Button
                          size="icon" variant="ghost" title="Vorschau"
                          disabled={!row.doc}
                          onClick={() => setPreviewDoc(row.doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ============ SCHRITT 4: Prüfen & Generieren ============ */}
            {step === 3 && (
              <div className="space-y-3">
                <Label>Vertrag mit eingesetzten Daten</Label>
                <ScrollArea className="h-80 rounded border bg-muted/30">
                  <div className="prose prose-sm max-w-none bg-background p-4 m-2 rounded"
                    dangerouslySetInnerHTML={{ __html: renderedPreview }} />
                </ScrollArea>
                <div className="rounded border p-2.5">
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Anhänge (Reihenfolge im Gesamtdokument)</div>
                  {attachments.filter(a => a.doc && selectedDocs.has(a.doc.id)).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Keine Anhänge ausgewählt.</p>
                  ) : (
                    <ol className="text-sm space-y-0.5 list-decimal list-inside">
                      {attachments.filter(a => a.doc && selectedDocs.has(a.doc.id)).map(a => (
                        <li key={a.itemId}>{a.doc.name}</li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="h-4 w-4" />Zurück
              </Button>
            )}
            {step < STEPS.length - 1 && (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
                Weiter<ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {step === STEPS.length - 1 && (
              <Button onClick={generateContract} disabled={saving || !renderedPreview}>
                {saving ? 'Erstelle…' : 'Vertrag generieren'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vorschau Hauptvertrag */}
      <Dialog open={mainPreviewOpen} onOpenChange={setMainPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Vorschau Hauptvertrag</DialogTitle></DialogHeader>
          <ScrollArea className="h-[70vh] rounded border bg-muted/30">
            <div className="prose prose-sm max-w-none bg-background p-4 m-2 rounded"
              dangerouslySetInnerHTML={{ __html: renderedPreview }} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Individueller Text für diesen Vertrag */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vertragstext anpassen</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Änderungen gelten nur für diesen einen Vertrag. Die Vorlage bleibt unverändert.
          </p>
          <Textarea
            className="flex-1 min-h-[50vh] font-mono text-xs"
            value={editedHtml ?? template?.body_html ?? ''}
            onChange={e => setEditedHtml(e.target.value)}
          />
          <DialogFooter className="gap-2">
            {editedHtml != null && (
              <Button variant="outline" onClick={() => setEditedHtml(null)}>Auf Vorlage zurücksetzen</Button>
            )}
            <Button onClick={() => setEditorOpen(false)}>Übernehmen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vorschau Anhang */}
      {previewDoc && (
        <LibraryPreviewDialog
          open={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          docName={previewDoc.name}
          originalPath={previewDoc.original_storage_path}
          originalFilename={previewDoc.original_filename}
          templatePath={previewDoc.template_storage_path}
          templateFilename={previewDoc.template_filename}
        />
      )}
    </>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, error }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; error?: boolean;
}) {
  return (
    <div>
      <Label>{label}{error && <span className="text-destructive"> *</span>}</Label>
      <Input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={error ? 'border-destructive' : ''}
      />
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
