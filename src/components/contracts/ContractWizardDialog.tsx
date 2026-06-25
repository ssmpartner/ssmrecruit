import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AREA_LABELS, CONTRACT_LANGUAGES,
  renderPlaceholders, DEFAULT_COMPANY, type ContractArea,
} from '@/lib/contract-placeholders';

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
};

export default function ContractWizardDialog({ leadId, leadName, open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [area, setArea] = useState<ContractArea>('sales');
  const [language, setLanguage] = useState('de');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>('');
  const [lead, setLead] = useState<any>(null);
  const [form, setForm] = useState({
    position: '', level: '', careerplan_level: '', start_date: '',
    workload: '100%', salary: '', commission_model: '', location: '', manager_name: '',
  });
  const [saving, setSaving] = useState(false);

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
        .select('id,title,area,language,position,level,careerplan_level,careerplan_linked,body_html,version')
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
    }
  }, [tpl]);

  async function generate() {
    if (!tpl) { toast.error('Vorlage wählen'); return; }
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;

    const body = renderPlaceholders(tpl.body_html, {
      candidate: {
        first_name: lead?.name?.split(' ')[0],
        last_name: lead?.name?.split(' ').slice(1).join(' '),
        address: lead?.address,
        zip: lead?.zip,
        city: lead?.city,
        birth_date: lead?.birth_date,
        email: lead?.email,
        phone: lead?.phone,
      },
      employment: {
        start_date: form.start_date,
        position: form.position,
        level: form.level,
        department: area === 'sales' ? 'Vertrieb' : 'Innendienst',
        workload: form.workload,
        salary: form.salary,
        commission_model: form.commission_model,
      },
      careerplan: area === 'sales' ? {
        level: form.careerplan_level, role: form.position, target_level: form.careerplan_level,
      } : undefined,
      company: DEFAULT_COMPANY,
      manager: { name: form.manager_name },
      contract: { date: new Date().toLocaleDateString('de-CH') },
    }, area);

    const { data, error } = await supabase.from('contracts').insert({
      candidate_lead_id: leadId,
      template_id: tpl.id, template_version: tpl.version,
      area, language, position: form.position || null, level: form.level || null,
      careerplan_level: area === 'sales' ? (form.careerplan_level || null) : null,
      start_date: form.start_date || null, workload: form.workload || null,
      salary: form.salary || null, commission_model: form.commission_model || null,
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

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vertrag generieren – {leadName}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Bereich</Label>
              <Select value={area} onValueChange={(v: any) => { setArea(v); setTemplateId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Vertrieb</SelectItem>
                  <SelectItem value="office">Innendienst</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {area === 'sales' ? 'SSM Karriereplan wird berücksichtigt.' : 'Innendienst – kein Karriereplan.'}
              </p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Position</Label>
              <Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
            </div>
            <div>
              <Label>Stufe</Label>
              <Input value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} />
            </div>
            {area === 'sales' && (
              <div className="col-span-2">
                <Label>Karriereplan-Stufe</Label>
                <Select value={form.careerplan_level} onValueChange={v => setForm({ ...form, careerplan_level: v })}>
                  <SelectTrigger><SelectValue placeholder="Stufe wählen" /></SelectTrigger>
                  <SelectContent>
                    {CAREERPLAN_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Eintrittsdatum</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Pensum</Label>
              <Input value={form.workload} onChange={e => setForm({ ...form, workload: e.target.value })} />
            </div>
            <div>
              <Label>Vergütung</Label>
              <Input value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="z.B. CHF 6'500" />
            </div>
            <div>
              <Label>Provisionsmodell</Label>
              <Input value={form.commission_model} onChange={e => setForm({ ...form, commission_model: e.target.value })} />
            </div>
            <div>
              <Label>Standort</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Vorgesetzter</Label>
              <Input value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Zurück</Button>}
          {step === 1 && <Button onClick={() => setStep(2)} disabled={!templateId}>Weiter</Button>}
          {step === 2 && <Button onClick={generate} disabled={saving}>{saving ? 'Erstelle…' : 'Vertrag erstellen'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
