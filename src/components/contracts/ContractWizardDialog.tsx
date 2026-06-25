import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  CONTRACT_LANGUAGES,
  renderPlaceholders, DEFAULT_COMPANY, findMissingRequired,
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

type Template = {
  id: string; title: string; area: ContractArea; language: string;
  position: string | null; level: string | null; careerplan_level: string | null;
  careerplan_linked: boolean; body_html: string; version: number;
  target_group_code?: string | null;
};

const TARGET_GROUPS: { code: TargetGroupCode; label: string }[] = [
  { code: 'MA', label: 'Mitarbeiter (Vertrieb)' },
  { code: 'FK', label: 'Führungskraft' },
  { code: 'ID', label: 'Innendienst' },
  { code: 'PARTNER', label: 'Kooperationspartner' },
  { code: 'LEAD', label: 'Leadlieferant' },
];

export default function ContractWizardDialog({ leadId, leadName, open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [area, setArea] = useState<ContractArea>('sales');
  const [targetGroup, setTargetGroup] = useState<TargetGroupCode>('MA');
  const [language, setLanguage] = useState('de');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>('');
  const [lead, setLead] = useState<any>(null);
  const [form, setForm] = useState({
    // Beschäftigung
    position: '', level: '', start_date: '', old_start_date: '',
    workload: '100%', salary_monthly: '', salary_yearly: '', salary_13_months: '',
    location: '', agency: '', manager_name: '',
    probation_period: '3 Monate', notice_period: '1 Monat',
    // Karriereplan
    careerplan_level: '', careerplan_role: '', careerplan_target_level: '',
    careerplan_score_point_value: '', commission_model: '',
    // Leadership
    leadership_type: '', leadership_allowance: '', leadership_team_size: '',
    leadership_role: '', leadership_level: '',
    // Partner
    partner_company_name: '', partner_contact_person: '',
    partner_address: '', partner_zip: '', partner_city: '',
    partner_email: '', partner_phone: '',
    // Vertrag
    contract_place: '',
  });
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from('leads').select('*').eq('id', leadId).single();
      setLead(data);
    })();
  }, [open, leadId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('contract_templates')
        .select('id,title,area,language,position,level,careerplan_level,careerplan_linked,body_html,version,target_group_code')
        .eq('status', 'active')
        .eq('area', area)
        .eq('language', language);
      setTemplates((data ?? []) as Template[]);
    })();
  }, [area, language]);

  const tpl = useMemo(() => templates.find(t => t.id === templateId) || null, [templates, templateId]);

  useEffect(() => {
    if (tpl) {
      setForm(f => ({
        ...f,
        position: f.position || tpl.position || '',
        level: f.level || tpl.level || '',
        careerplan_level: f.careerplan_level || tpl.careerplan_level || '',
      }));
      if ((tpl as any).target_group_code) setTargetGroup((tpl as any).target_group_code);
    }
  }, [tpl]);

  function buildContext(): PlaceholderContext {
    const fn = lead?.name?.split(' ')[0];
    const ln = lead?.name?.split(' ').slice(1).join(' ');
    return {
      candidate: {
        first_name: fn, last_name: ln,
        full_name: lead?.name,
        address: lead?.address, zip: lead?.zip, city: lead?.city,
        birth_date: lead?.birth_date, email: lead?.email, phone: lead?.phone,
      },
      employment: {
        start_date: form.start_date, old_start_date: form.old_start_date,
        position: form.position, level: form.level,
        department: area === 'sales' ? 'Vertrieb' : 'Innendienst',
        workload: form.workload,
        salary_monthly: form.salary_monthly,
        salary_yearly: form.salary_yearly,
        salary_13_months: form.salary_13_months,
        location: form.location, agency: form.agency,
        manager: form.manager_name,
        probation_period: form.probation_period,
        notice_period: form.notice_period,
      },
      careerplan: {
        level: form.careerplan_level,
        role: form.careerplan_role || form.position,
        target_level: form.careerplan_target_level || form.careerplan_level,
        score_point_value: form.careerplan_score_point_value,
        commission_model: form.commission_model,
      },
      leadership: {
        type: form.leadership_type, allowance: form.leadership_allowance,
        team_size: form.leadership_team_size, role: form.leadership_role,
        level: form.leadership_level,
      },
      partner: {
        company_name: form.partner_company_name, contact_person: form.partner_contact_person,
        address: form.partner_address, zip: form.partner_zip, city: form.partner_city,
        email: form.partner_email, phone: form.partner_phone,
      },
      company: DEFAULT_COMPANY,
      contract: {
        place: form.contract_place,
        language,
        type: 'Arbeitsvertrag',
      },
    };
  }

  function validate(): boolean {
    if (!tpl) { toast.error('Vorlage wählen'); return false; }
    const m = findMissingRequired(tpl.body_html, buildContext(), area, targetGroup);
    setMissing(m.map(x => `${x.label} ({{${x.key}}})`));
    if (m.length > 0) {
      toast.error('Fehlende Pflichtfelder');
      return false;
    }
    return true;
  }

  async function generate() {
    if (!validate()) return;
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;

    const body = renderPlaceholders(tpl!.body_html, buildContext(), area, targetGroup);

    const { data, error } = await supabase.from('contracts').insert({
      candidate_lead_id: leadId,
      template_id: tpl!.id, template_version: tpl!.version,
      area, language, position: form.position || null, level: form.level || null,
      careerplan_level: area === 'sales' ? (form.careerplan_level || null) : null,
      start_date: form.start_date || null, workload: form.workload || null,
      salary: form.salary_monthly || form.salary_yearly || null,
      commission_model: form.commission_model || null,
      location: form.location || null, manager_name: form.manager_name || null,
      body_html: body, status: 'draft', created_by: user?.id,
    }).select().single();

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Vertrag erstellt');
    onCreated?.((data as any).id);
    onClose();
    setStep(1);
  }

  const showCareerplan = area === 'sales';
  const showLeadership = targetGroup === 'FK';
  const showPartner = targetGroup === 'PARTNER' || targetGroup === 'LEAD';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vertrag generieren – {leadName}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bereich</Label>
                <Select value={area} onValueChange={(v: any) => { setArea(v); setTemplateId(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Vertrieb</SelectItem>
                    <SelectItem value="office">Innendienst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zielgruppe</Label>
                <Select value={targetGroup} onValueChange={(v: any) => setTargetGroup(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_GROUPS.map(t => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
              <Label>Vertragsvorlage</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder={templates.length ? 'Wählen…' : 'Keine aktive Vorlage'} /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}{t.careerplan_level ? ` · ${t.careerplan_level}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <section>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Beschäftigung</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Position</Label><Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></div>
                <div><Label>Stufe</Label><Input value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} /></div>
                <div><Label>Eintrittsdatum</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>Bisheriges Eintrittsdatum</Label><Input type="date" value={form.old_start_date} onChange={e => setForm({ ...form, old_start_date: e.target.value })} /></div>
                <div><Label>Pensum</Label><Input value={form.workload} onChange={e => setForm({ ...form, workload: e.target.value })} /></div>
                <div><Label>Arbeitsort</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                <div><Label>Monatslohn</Label><Input value={form.salary_monthly} onChange={e => setForm({ ...form, salary_monthly: e.target.value })} placeholder="CHF 6'500" /></div>
                <div><Label>Jahreslohn</Label><Input value={form.salary_yearly} onChange={e => setForm({ ...form, salary_yearly: e.target.value })} /></div>
                <div><Label>Lohn 13 Monate</Label><Input value={form.salary_13_months} onChange={e => setForm({ ...form, salary_13_months: e.target.value })} /></div>
                <div><Label>Agentur</Label><Input value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })} /></div>
                <div><Label>Vorgesetzter</Label><Input value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} /></div>
                <div><Label>Probezeit</Label><Input value={form.probation_period} onChange={e => setForm({ ...form, probation_period: e.target.value })} /></div>
                <div><Label>Kündigungsfrist</Label><Input value={form.notice_period} onChange={e => setForm({ ...form, notice_period: e.target.value })} /></div>
              </div>
            </section>

            {showCareerplan && (
              <section>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Karriereplan</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Karriereplan-Stufe</Label>
                    <CareerLevelSelect
                      position={form.position}
                      value={form.careerplan_level}
                      onChange={v => setForm({ ...form, careerplan_level: v })}
                    />
                  </div>
                  <div><Label>Rolle</Label><Input value={form.careerplan_role} onChange={e => setForm({ ...form, careerplan_role: e.target.value })} /></div>
                  <div><Label>Zielstufe</Label><Input value={form.careerplan_target_level} onChange={e => setForm({ ...form, careerplan_target_level: e.target.value })} /></div>
                  <div><Label>Wert pro Score-Punkt</Label><Input value={form.careerplan_score_point_value} onChange={e => setForm({ ...form, careerplan_score_point_value: e.target.value })} /></div>
                  <div><Label>Provisionsmodell</Label><Input value={form.commission_model} onChange={e => setForm({ ...form, commission_model: e.target.value })} /></div>
                </div>
              </section>
            )}

            {showLeadership && (
              <section>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Leadership</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Führungsart</Label><Input value={form.leadership_type} onChange={e => setForm({ ...form, leadership_type: e.target.value })} /></div>
                  <div><Label>Führungszulage</Label><Input value={form.leadership_allowance} onChange={e => setForm({ ...form, leadership_allowance: e.target.value })} /></div>
                  <div><Label>Teamgrösse</Label><Input value={form.leadership_team_size} onChange={e => setForm({ ...form, leadership_team_size: e.target.value })} /></div>
                  <div><Label>Führungsrolle</Label><Input value={form.leadership_role} onChange={e => setForm({ ...form, leadership_role: e.target.value })} /></div>
                  <div><Label>Führungsstufe</Label><Input value={form.leadership_level} onChange={e => setForm({ ...form, leadership_level: e.target.value })} /></div>
                </div>
              </section>
            )}

            {showPartner && (
              <section>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Partner / Leadlieferant</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Firma</Label><Input value={form.partner_company_name} onChange={e => setForm({ ...form, partner_company_name: e.target.value })} /></div>
                  <div><Label>Ansprechperson</Label><Input value={form.partner_contact_person} onChange={e => setForm({ ...form, partner_contact_person: e.target.value })} /></div>
                  <div><Label>Adresse</Label><Input value={form.partner_address} onChange={e => setForm({ ...form, partner_address: e.target.value })} /></div>
                  <div><Label>PLZ</Label><Input value={form.partner_zip} onChange={e => setForm({ ...form, partner_zip: e.target.value })} /></div>
                  <div><Label>Ort</Label><Input value={form.partner_city} onChange={e => setForm({ ...form, partner_city: e.target.value })} /></div>
                  <div><Label>E-Mail</Label><Input value={form.partner_email} onChange={e => setForm({ ...form, partner_email: e.target.value })} /></div>
                  <div><Label>Telefon</Label><Input value={form.partner_phone} onChange={e => setForm({ ...form, partner_phone: e.target.value })} /></div>
                </div>
              </section>
            )}

            <section>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Vertrag</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Vertragsort</Label><Input value={form.contract_place} onChange={e => setForm({ ...form, contract_place: e.target.value })} /></div>
              </div>
            </section>

            {missing.length > 0 && (
              <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-destructive mb-1">
                  <AlertTriangle className="h-4 w-4" />Fehlende Pflichtfelder
                </div>
                <ul className="text-xs space-y-0.5">
                  {missing.map(m => <li key={m}>• {m}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Zurück</Button>}
          {step === 1 && <Button onClick={() => setStep(2)} disabled={!templateId}>Weiter</Button>}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => validate()}>Pflichtfelder prüfen</Button>
              <Button onClick={generate} disabled={saving}>{saving ? 'Erstelle…' : 'Vertrag erstellen'}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CareerLevelSelect({ position, value, onChange }: { position: string; value: string; onChange: (v: string) => void }) {
  const { levels, loading } = useCareerLevels(position);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={loading ? 'Lade Stufen…' : (levels.length ? 'Stufe wählen' : 'Keine Stufen hinterlegt')} /></SelectTrigger>
      <SelectContent>
        {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
