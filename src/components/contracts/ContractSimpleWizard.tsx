import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  ChevronLeft, ChevronRight, FileSignature, Search, User, AlertTriangle, Check, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  renderPlaceholders, DEFAULT_COMPANY, CONTRACT_LANGUAGES,
  type ContractArea, type PlaceholderContext,
} from '@/lib/contract-placeholders';
import { useCareerLevels } from '@/hooks/useCareerLevels';

interface Props {
  leadId?: string;
  open: boolean;
  onClose: () => void;
  onCreated?: (contractId: string) => void;
}

const STEPS = ['Person', 'Angaben & Vorlage', 'Vorschau'];

type Candidate = {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  birth_date: string | null;
  position: string | null;
  employee_id: string | null;
  agency_id: string | null;
};

type Manager = { name: string; role: string | null; email: string | null; agency_id: string | null };

type Template = {
  id: string; title: string; area: ContractArea; language: string;
  body_html: string; version: number; contract_type: string;
};

type Letterhead = { id: string; name: string; is_default_for_language: boolean; language: string | null };

const chf = (n?: number) =>
  typeof n === 'number' && n > 0 ? `CHF ${n.toLocaleString('de-CH')}` : '';

function splitName(full: string) {
  const parts = (full || '').trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop()! : '';
  return { first_name: parts.join(' '), last_name: last };
}

function rowToCandidate(l: any): Candidate {
  const { first_name, last_name } = splitName(l.name || '');
  return {
    id: l.id, name: l.name || '', first_name, last_name,
    email: l.email || null, phone: l.phone || null, address: l.address || null,
    zip: l.plz || null, city: l.city || null, birth_date: l.birth_date || null,
    position: l.position || null, employee_id: l.employee_id || null, agency_id: l.agency_id || null,
  };
}

export default function ContractSimpleWizard({ leadId, open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [person, setPerson] = useState<Candidate | null>(null);
  const [manager, setManager] = useState<Manager | null>(null);
  const [agencyName, setAgencyName] = useState('');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [letterheads, setLetterheads] = useState<Letterhead[]>([]);
  const [letterheadId, setLetterheadId] = useState('');
  const [language, setLanguage] = useState('de');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    position: '', level: '', start_date: '', workload: '100%',
    fix_salary: '', expenses: '', score_points: '',
    salary_monthly: '', salary_yearly: '',
    location: '', probation_period: '3 Monate', notice_period: '1 Monat',
    thirteenth_salary: true, contract_place: '',
  });

  const { levelDetails, positions, loading: levelsLoading } = useCareerLevels(form.position || null);

  // ---------- Laden ----------
  useEffect(() => {
    if (!open) return;
    setStep(0); setPerson(null); setManager(null); setSearch(''); setSaving(false);
    setForm({
      position: '', level: '', start_date: '', workload: '100%',
      fix_salary: '', expenses: '', score_points: '',
      salary_monthly: '', salary_yearly: '',
      location: '', probation_period: '3 Monate', notice_period: '1 Monat',
      thirteenth_salary: true, contract_place: '',
    });
    setLoading(true);
    (async () => {
      const [{ data: leads }, { data: tpl }, { data: lh }] = await Promise.all([
        supabase.from('leads')
          .select('id,name,email,phone,address,plz,city,birth_date,position,employee_id,agency_id,status')
          .eq('status', 'hr_processing').order('name'),
        supabase.from('contract_templates').select('*').eq('status', 'active').order('title'),
        supabase.from('contract_letterhead').select('id,name,is_default_for_language,language')
          .eq('is_active', true).order('created_at', { ascending: false }),
      ]);
      const list = (leads ?? []).map(rowToCandidate);
      setCandidates(list);
      setTemplates((tpl ?? []) as Template[]);
      const lhs = (lh ?? []) as Letterhead[];
      setLetterheads(lhs);
      setLetterheadId(lhs.find(l => l.is_default_for_language)?.id || lhs[0]?.id || '');
      setLoading(false);
      if (leadId) {
        const found = list.find(c => c.id === leadId);
        if (found) selectPerson(found);
        else {
          const { data: l } = await supabase.from('leads')
            .select('id,name,email,phone,address,plz,city,birth_date,position,employee_id,agency_id')
            .eq('id', leadId).maybeSingle();
          if (l) selectPerson(rowToCandidate(l));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId]);

  async function selectPerson(c: Candidate) {
    setPerson(c);
    setForm(prev => ({ ...prev, position: c.position || prev.position }));
    if (c.employee_id) {
      const { data: emp } = await supabase.from('employees')
        .select('name,role,email,agency_id').eq('id', c.employee_id).maybeSingle();
      if (emp) setManager(emp as Manager);
    } else setManager(null);
    const agId = c.agency_id;
    if (agId) {
      const { data: ag } = await supabase.from('agencies').select('name,city').eq('id', agId).maybeSingle();
      if (ag) {
        setAgencyName((ag as any).name || '');
        setForm(prev => ({
          ...prev,
          location: prev.location || (ag as any).city || '',
          contract_place: prev.contract_place || (ag as any).city || '',
        }));
      }
    }
  }

  // Stufe gewählt → Lohnangaben aus Karriereplan übernehmen
  function selectLevel(name: string) {
    const lvl = levelDetails.find(l => l.name === name);
    setForm(prev => {
      const fix = lvl?.fixSalary;
      const exp = lvl?.expenses;
      const monthly = (fix ?? 0) + (exp ?? 0);
      return {
        ...prev,
        level: name,
        fix_salary: chf(fix),
        expenses: chf(exp),
        score_points: lvl?.scorePoints ? String(lvl.scorePoints) : '',
        salary_monthly: monthly > 0 ? chf(monthly) : prev.salary_monthly,
        salary_yearly: monthly > 0 ? chf(monthly * (prev.thirteenth_salary ? 13 : 12)) : prev.salary_yearly,
      };
    });
  }

  const positionOptions = useMemo(() => {
    const list = [...positions];
    for (const extra of [person?.position, form.position]) {
      if (extra && !list.includes(extra)) list.unshift(extra);
    }
    return list;
  }, [positions, person?.position, form.position]);

  const template = templates.find(t => t.id === templateId) || null;
  const area: ContractArea = (template?.area as ContractArea) || 'sales';

  const matchingTemplates = useMemo(
    () => templates.filter(t => t.language === language),
    [templates, language],
  );

  useEffect(() => {
    if (!templateId && matchingTemplates.length === 1) setTemplateId(matchingTemplates[0].id);
  }, [matchingTemplates, templateId]);

  function buildContext(): PlaceholderContext {
    const mgr = splitName(manager?.name || '');
    const lvl = levelDetails.find(l => l.name === form.level);
    return {
      candidate: {
        first_name: person?.first_name ?? '', last_name: person?.last_name ?? '',
        full_name: person?.name ?? '', birth_date: person?.birth_date
          ? new Date(person.birth_date).toLocaleDateString('de-CH') : '',
        address: person?.address ?? '', zip: person?.zip ?? '', city: person?.city ?? '',
        email: person?.email ?? '', phone: person?.phone ?? '',
      },
      manager: {
        first_name: mgr.first_name, last_name: mgr.last_name, full_name: manager?.name ?? '',
        role: manager?.role ?? '', email: manager?.email ?? '', phone: '',
        agency: agencyName,
      },
      employment: {
        start_date: form.start_date ? new Date(form.start_date).toLocaleDateString('de-CH') : '',
        position: form.position, level: form.level,
        department: area === 'sales' ? 'Vertrieb' : 'Innendienst',
        workload: form.workload,
        salary_monthly: form.salary_monthly, salary_yearly: form.salary_yearly,
        salary_13_months: form.thirteenth_salary ? 'Ja' : 'Nein',
        location: form.location, agency: agencyName, manager: manager?.name ?? '',
        probation_period: form.probation_period, notice_period: form.notice_period,
      },
      careerlevel: {
        name: form.level, fix_salary: form.fix_salary, expenses: form.expenses,
        total_monthly: form.salary_monthly, score_points: form.score_points,
        requirements: (lvl?.requirements || []).join(', '),
      },
      careerplan: {
        level: form.level, role: form.position, target_level: form.level, commission_model: '',
      },
      company: DEFAULT_COMPANY,
      contract: {
        place: form.contract_place, language,
        type: template?.contract_type || 'Arbeitsvertrag',
      },
    };
  }

  const renderedHtml = useMemo(() => {
    if (!template?.body_html) return '';
    return renderPlaceholders(template.body_html, buildContext(), area);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, person, manager, form, area, language, agencyName, levelDetails]);

  const missingPersonal = useMemo(() => {
    if (!person) return [];
    const list: string[] = [];
    if (!person.birth_date) list.push('Geburtsdatum');
    if (!person.address) list.push('Adresse');
    if (!person.zip || !person.city) list.push('PLZ / Ort');
    if (!person.email) list.push('E-Mail');
    if (!person.phone) list.push('Telefon');
    return list;
  }, [person]);

  const canNext = () => {
    if (step === 0) return !!person;
    if (step === 1) return !!template && !!form.position && !!form.start_date;
    return true;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? candidates.filter(c => c.name.toLowerCase().includes(q)) : candidates;
  }, [candidates, search]);

  async function create() {
    if (!template || !person) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: contract, error } = await supabase.from('contracts').insert({
        candidate_lead_id: person.id,
        template_id: template.id, template_version: template.version,
        area, language, position: form.position || null,
        careerplan_level: form.level || null,
        start_date: form.start_date || null, workload: form.workload || null,
        salary: form.salary_monthly || form.salary_yearly || null,
        location: form.location || null, manager_name: manager?.name || null,
        agency_name: agencyName || null,
        notice_period: form.notice_period || null,
        probation_period: form.probation_period || null,
        thirteenth_salary: form.thirteenth_salary,
        body_html: renderedHtml, status: 'draft', created_by: user?.id,
        letterhead_id: letterheadId || null,
      } as any).select().single();
      if (error) throw error;
      toast.success(`Vertrag ${(contract as any).contract_number ?? ''} erstellt`.trim());
      onCreated?.((contract as any).id);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />Neuer Vertrag
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          {STEPS.map((s, i) => (
            <Badge key={s} variant={i === step ? 'default' : i < step ? 'secondary' : 'outline'}>
              {i + 1}. {s}
            </Badge>
          ))}
        </div>

        {/* Schritt 1: Person */}
        {step === 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Kandidat suchen…" value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="rounded-lg border divide-y max-h-80 overflow-y-auto">
              {loading && <p className="p-4 text-sm text-muted-foreground">Lädt…</p>}
              {!loading && filtered.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Momentan keine Kandidaten vorhanden.</p>
              )}
              {filtered.map(c => (
                <button key={c.id} type="button" onClick={() => selectPerson(c)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-accent transition ${person?.id === c.id ? 'bg-accent' : ''}`}>
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{c.position || 'Position offen'}</span>
                  {person?.id === c.id && <Check className="h-4 w-4 ml-auto text-primary" />}
                </button>
              ))}
            </div>

            {person && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-sm font-medium">Personalien (automatisch übernommen)</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <Info label="Name" value={person.name} />
                  <Info label="Geburtsdatum" value={person.birth_date ? new Date(person.birth_date).toLocaleDateString('de-CH') : ''} />
                  <Info label="Adresse" value={person.address} />
                  <Info label="PLZ / Ort" value={[person.zip, person.city].filter(Boolean).join(' ')} />
                  <Info label="E-Mail" value={person.email} />
                  <Info label="Telefon" value={person.phone} />
                  <Info label="Zuständige Führungskraft" value={manager?.name} />
                  <Info label="Agentur" value={agencyName} />
                </div>
                {missingPersonal.length > 0 && (
                  <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 text-amber-900 px-2 py-1.5 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                    <div>
                      Fehlende Angaben: {missingPersonal.join(', ')}.
                      <div className="opacity-80">Bitte im Kandidatenprofil unter «Personalien» nachtragen.</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Schritt 2: Angaben & Vorlage */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label>Position *</Label>
                <Select value={form.position} onValueChange={v => setForm({ ...form, position: v, level: '' })}>
                  <SelectTrigger><SelectValue placeholder="Position wählen" /></SelectTrigger>
                  <SelectContent>
                    {positionOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Karrierestufe</Label>
                <Select value={form.level} onValueChange={selectLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder={levelsLoading ? 'Lädt…' : (levelDetails.length ? 'Stufe wählen' : 'Keine Stufen hinterlegt')} />
                  </SelectTrigger>
                  <SelectContent>
                    {levelDetails.map(l => (
                      <SelectItem key={l.name} value={l.name}>
                        {l.name}{l.fixSalary ? ` · ${chf(l.fixSalary)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Eintrittsdatum *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Fixlohn (aus Karriereplan)</Label>
                <Input value={form.fix_salary} onChange={e => setForm({ ...form, fix_salary: e.target.value })} />
              </div>
              <div>
                <Label>Spesen (aus Karriereplan)</Label>
                <Input value={form.expenses} onChange={e => setForm({ ...form, expenses: e.target.value })} />
              </div>
              <div>
                <Label>Score-Punkte</Label>
                <Input value={form.score_points} onChange={e => setForm({ ...form, score_points: e.target.value })} />
              </div>
              <div>
                <Label>Monatslohn total</Label>
                <Input value={form.salary_monthly} onChange={e => setForm({ ...form, salary_monthly: e.target.value })} />
              </div>
              <div>
                <Label>Jahreslohn</Label>
                <Input value={form.salary_yearly} onChange={e => setForm({ ...form, salary_yearly: e.target.value })} />
              </div>
              <div>
                <Label>Pensum</Label>
                <Input value={form.workload} onChange={e => setForm({ ...form, workload: e.target.value })} />
              </div>
              <div>
                <Label>Arbeitsort</Label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label>Probezeit</Label>
                <Input value={form.probation_period} onChange={e => setForm({ ...form, probation_period: e.target.value })} />
              </div>
              <div>
                <Label>Kündigungsfrist</Label>
                <Input value={form.notice_period} onChange={e => setForm({ ...form, notice_period: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 col-span-2 md:col-span-1">
                <Label className="text-sm">13. Monatslohn</Label>
                <Switch checked={form.thirteenth_salary} onCheckedChange={v => setForm({ ...form, thirteenth_salary: v })} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border-t pt-3">
              <div>
                <Label>Sprache</Label>
                <Select value={language} onValueChange={v => { setLanguage(v); setTemplateId(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vorlage *</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder={matchingTemplates.length ? 'Vorlage wählen' : 'Keine aktive Vorlage vorhanden'} />
                  </SelectTrigger>
                  <SelectContent>
                    {matchingTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Briefpapier</Label>
                <Select value={letterheadId} onValueChange={setLetterheadId}>
                  <SelectTrigger>
                    <SelectValue placeholder={letterheads.length ? 'Briefpapier wählen' : 'Kein Briefpapier hinterlegt'} />
                  </SelectTrigger>
                  <SelectContent>
                    {letterheads.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}{l.is_default_for_language ? ' (Standard)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {matchingTemplates.length === 0 && (
              <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 text-amber-900 px-2 py-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                <div>Es ist keine aktive Vorlage in dieser Sprache vorhanden. Bitte unter «Einrichtung › Vorlagen» eine Vorlage aktivieren.</div>
              </div>
            )}
          </div>
        )}

        {/* Schritt 3: Vorschau */}
        {step === 2 && (
          <div className="space-y-2">
            <div className="rounded-lg border bg-muted/30 p-4 max-h-[65vh] overflow-y-auto">
              <div className="mx-auto bg-white shadow-sm" style={{ maxWidth: '210mm', padding: '18mm' }}>
                <div
                  className="contract-page prose prose-sm max-w-none [&_table]:border-collapse [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:p-1.5"
                  dangerouslySetInnerHTML={{ __html: renderedHtml || '<p>Keine Vorlage gewählt.</p>' }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Der Vertrag wird als Entwurf gespeichert und kann danach weiter bearbeitet und als PDF finalisiert werden.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />Zurück
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-1.5">
              Weiter<ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={create} disabled={saving || !template} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              Vertrag erstellen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={value ? '' : 'text-muted-foreground'}>{value || 'Keine Angabe'}</div>
    </div>
  );
}
