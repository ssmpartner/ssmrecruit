import { useState, useEffect, useCallback } from 'react';
import { Mail, Plus, Pencil, Trash2, Zap, Clock, ArrowRightLeft, FileText, Users, UserPlus, CheckCircle2, XCircle, Save, Eye, ChevronDown, ChevronUp, Send, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ExternalEmailMasterSwitch from '@/components/ExternalEmailMasterSwitch';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  placeholders: string[];
  is_active: boolean;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  template_id: string | null;
  recipient_type: string;
  is_active: boolean;
  delay_minutes: number;
}

const categoryLabels: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  lead_communication: { label: 'Lead-Kommunikation', icon: Send, color: 'text-blue-500 bg-blue-500/10' },
  internal: { label: 'Intern', icon: Users, color: 'text-violet-500 bg-violet-500/10' },
  notification: { label: 'Benachrichtigung', icon: Mail, color: 'text-amber-500 bg-amber-500/10' },
};

const triggerLabels: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  status_change: { label: 'Statusänderung', icon: ArrowRightLeft, color: 'text-amber-500 bg-amber-500/10' },
  time_based: { label: 'Zeitbasiert', icon: Clock, color: 'text-blue-500 bg-blue-500/10' },
  event: { label: 'Ereignis', icon: Zap, color: 'text-emerald-500 bg-emerald-500/10' },
};

const recipientLabels: Record<string, string> = {
  lead: 'Lead (Kandidat)',
  recruiter: 'Zuständiger Recruiter',
  team: 'Ganzes Team',
};

const statusOptions = [
  { value: 'new', label: 'Neu' },
  { value: 'contacted', label: 'Kontaktiert' },
  { value: 'qualified', label: 'Qualifiziert' },
  { value: 'appointment', label: 'Termin' },
  { value: 'won', label: 'Gewonnen' },
  { value: 'lost', label: 'Verloren' },
];

const eventOptions = [
  { value: 'lead_created', label: 'Neuer Lead erstellt' },
  { value: 'appointment_created', label: 'Termin erstellt' },
  { value: 'insights_completed', label: 'Insights-Formular abgeschlossen' },
  { value: 'document_uploaded', label: 'Dokument hochgeladen' },
  { value: 'task_assigned', label: 'Aufgabe zugewiesen' },
  { value: 'disc_completed', label: 'DISC-Test abgeschlossen' },
];

export default function EmailSettingsTab() {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'automations'>('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Template editing
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '', category: 'lead_communication', placeholders: '' });

  // Rule editing
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: '', description: '', trigger_type: 'status_change', trigger_config: {} as Record<string, any>,
    template_id: '', recipient_type: 'lead', delay_minutes: 0,
  });

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tRes, rRes] = await Promise.all([
      supabase.from('email_templates').select('*').order('created_at', { ascending: true }),
      supabase.from('email_automation_rules').select('*').order('created_at', { ascending: true }),
    ]);
    if (tRes.data) setTemplates(tRes.data as any);
    if (rRes.data) setRules(rRes.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ────── Template CRUD ──────
  const openTemplateDialog = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name, subject: template.subject, body: template.body,
        category: template.category, placeholders: template.placeholders.join(', '),
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: '', subject: '', body: '', category: 'lead_communication', placeholders: '' });
    }
    setTemplateDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.subject.trim()) {
      toast({ title: 'Fehler', description: 'Name und Betreff sind Pflichtfelder', variant: 'destructive' });
      return;
    }
    const placeholders = templateForm.placeholders.split(',').map(p => p.trim()).filter(Boolean);
    const payload = { name: templateForm.name, subject: templateForm.subject, body: templateForm.body, category: templateForm.category, placeholders, updated_at: new Date().toISOString() };

    if (editingTemplate) {
      const { error } = await supabase.from('email_templates').update(payload).eq('id', editingTemplate.id);
      if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Template aktualisiert' });
    } else {
      const { error } = await supabase.from('email_templates').insert(payload);
      if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Template erstellt' });
    }
    setTemplateDialogOpen(false);
    loadData();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Template gelöscht' });
    loadData();
  };

  const toggleTemplate = async (id: string, active: boolean) => {
    await supabase.from('email_templates').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id);
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: active } : t));
  };

  // ────── Rule CRUD ──────
  const openRuleDialog = (rule?: AutomationRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({
        name: rule.name, description: rule.description, trigger_type: rule.trigger_type,
        trigger_config: rule.trigger_config, template_id: rule.template_id || '',
        recipient_type: rule.recipient_type, delay_minutes: rule.delay_minutes,
      });
    } else {
      setEditingRule(null);
      setRuleForm({ name: '', description: '', trigger_type: 'status_change', trigger_config: {}, template_id: '', recipient_type: 'lead', delay_minutes: 0 });
    }
    setRuleDialogOpen(true);
  };

  const saveRule = async () => {
    if (!ruleForm.name.trim()) {
      toast({ title: 'Fehler', description: 'Name ist ein Pflichtfeld', variant: 'destructive' });
      return;
    }
    const payload = {
      name: ruleForm.name, description: ruleForm.description, trigger_type: ruleForm.trigger_type,
      trigger_config: ruleForm.trigger_config, template_id: ruleForm.template_id || null,
      recipient_type: ruleForm.recipient_type, delay_minutes: ruleForm.delay_minutes,
      updated_at: new Date().toISOString(),
    };

    if (editingRule) {
      const { error } = await supabase.from('email_automation_rules').update(payload).eq('id', editingRule.id);
      if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Regel aktualisiert' });
    } else {
      const { error } = await supabase.from('email_automation_rules').insert(payload);
      if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Regel erstellt' });
    }
    setRuleDialogOpen(false);
    loadData();
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from('email_automation_rules').delete().eq('id', id);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Regel gelöscht' });
    loadData();
  };

  const toggleRule = async (id: string, active: boolean) => {
    await supabase.from('email_automation_rules').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: active } : r));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Mail className="h-5 w-5" /> E-Mail Automationen</h2>
        <p className="text-sm text-muted-foreground">Templates erstellen und Automatisierungsregeln verwalten</p>
      </div>

      <ExternalEmailMasterSwitch />


      {/* Sub-tabs */}
      <div className="flex gap-2 border-b pb-0">
        {[
          { id: 'templates' as const, label: 'Vorlagen', icon: FileText, count: templates.length },
          { id: 'automations' as const, label: 'Regeln', icon: Zap, count: rules.length },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeSubTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ TEMPLATES TAB ═══ */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{templates.length} Vorlagen konfiguriert</p>
            <button onClick={() => openTemplateDialog()}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Neue Vorlage
            </button>
          </div>

          <div className="space-y-3">
            {templates.map(template => {
              const cat = categoryLabels[template.category] || categoryLabels.notification;
              const CatIcon = cat.icon;
              return (
                <div key={template.id} className={`rounded-xl border bg-card p-4 shadow-sm transition-opacity ${!template.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cat.color}`}>
                        <CatIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{template.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.color}`}>{cat.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">Betreff: {template.subject}</p>
                        {template.placeholders.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {template.placeholders.map(p => (
                              <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{`{{${p}}}`}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => { setPreviewTemplate(template); setPreviewOpen(true); }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors" title="Vorschau">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => openTemplateDialog(template)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors" title="Bearbeiten">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleTemplate(template.id, !template.is_active)}
                        className={`rounded-lg p-1.5 transition-colors ${template.is_active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted'}`} title={template.is_active ? 'Deaktivieren' : 'Aktivieren'}>
                        {template.is_active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteTemplate(template.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Löschen">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {templates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Keine Vorlagen vorhanden</p>
                <p className="text-xs">Erstellen Sie Ihre erste E-Mail-Vorlage</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ AUTOMATIONS TAB ═══ */}
      {activeSubTab === 'automations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{rules.length} Regeln konfiguriert</p>
            <button onClick={() => openRuleDialog()}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Neue Regel
            </button>
          </div>

          <div className="space-y-3">
            {rules.map(rule => {
              const trigger = triggerLabels[rule.trigger_type] || triggerLabels.event;
              const TriggerIcon = trigger.icon;
              const tpl = templates.find(t => t.id === rule.template_id);
              return (
                <div key={rule.id} className={`rounded-xl border bg-card p-4 shadow-sm transition-opacity ${!rule.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${trigger.color}`}>
                        <TriggerIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{rule.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${trigger.color}`}>{trigger.label}</span>
                        </div>
                        {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {tpl?.name || '—'}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {recipientLabels[rule.recipient_type] || rule.recipient_type}</span>
                          {rule.delay_minutes > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rule.delay_minutes} Min. Verzögerung</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => openRuleDialog(rule)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors" title="Bearbeiten">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleRule(rule.id, !rule.is_active)}
                        className={`rounded-lg p-1.5 transition-colors ${rule.is_active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted'}`}>
                        {rule.is_active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteRule(rule.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Löschen">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {rules.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Zap className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Keine Regeln vorhanden</p>
                <p className="text-xs">Erstellen Sie Ihre erste Automatisierungsregel</p>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">E-Mail-Versand</p>
              <p className="text-xs text-muted-foreground">Um E-Mails tatsächlich zu versenden, muss eine E-Mail-Domain unter Cloud → Emails konfiguriert werden. Die Regeln und Vorlagen können unabhängig davon angelegt werden.</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TEMPLATE DIALOG ═══ */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="z.B. Willkommen" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Kategorie</label>
              <select value={templateForm.category} onChange={e => setTemplateForm(f => ({ ...f, category: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="lead_communication">Lead-Kommunikation</option>
                <option value="internal">Intern</option>
                <option value="notification">Benachrichtigung</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Betreff</label>
              <input value={templateForm.subject} onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="z.B. Willkommen, {{name}}!" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Inhalt</label>
              <textarea value={templateForm.body} onChange={e => setTemplateForm(f => ({ ...f, body: e.target.value }))} rows={8}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y font-mono" placeholder="Hallo {{name}},&#10;&#10;vielen Dank..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Platzhalter (kommagetrennt)</label>
              <input value={templateForm.placeholders} onChange={e => setTemplateForm(f => ({ ...f, placeholders: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="name, email, recruiter_name" />
              <p className="text-[10px] text-muted-foreground mt-1">Verwenden Sie {'{{platzhalter}}'} im Betreff und Inhalt</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setTemplateDialogOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Abbrechen</button>
              <button onClick={saveTemplate}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save className="h-4 w-4" /> Speichern
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ RULE DIALOG ═══ */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Regel bearbeiten' : 'Neue Regel erstellen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="z.B. Willkommen bei Statuswechsel" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Beschreibung</label>
              <input value={ruleForm.description} onChange={e => setRuleForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Optionale Beschreibung" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Trigger-Typ</label>
                <select value={ruleForm.trigger_type} onChange={e => setRuleForm(f => ({ ...f, trigger_type: e.target.value, trigger_config: {} }))}
                  className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="status_change">Statusänderung</option>
                  <option value="time_based">Zeitbasiert</option>
                  <option value="event">Ereignis</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Empfänger</label>
                <select value={ruleForm.recipient_type} onChange={e => setRuleForm(f => ({ ...f, recipient_type: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="lead">Lead (Kandidat)</option>
                  <option value="recruiter">Zuständiger Recruiter</option>
                  <option value="team">Ganzes Team</option>
                </select>
              </div>
            </div>

            {/* Trigger-specific config */}
            {ruleForm.trigger_type === 'status_change' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Von Status</label>
                  <select value={ruleForm.trigger_config.from_status || ''} onChange={e => setRuleForm(f => ({ ...f, trigger_config: { ...f.trigger_config, from_status: e.target.value } }))}
                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Beliebig</option>
                    {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Zu Status</label>
                  <select value={ruleForm.trigger_config.to_status || ''} onChange={e => setRuleForm(f => ({ ...f, trigger_config: { ...f.trigger_config, to_status: e.target.value } }))}
                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Beliebig</option>
                    {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            {ruleForm.trigger_type === 'time_based' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Bedingung</label>
                  <select value={ruleForm.trigger_config.condition || ''} onChange={e => setRuleForm(f => ({ ...f, trigger_config: { ...f.trigger_config, condition: e.target.value } }))}
                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Wählen...</option>
                    <option value="no_response">Keine Antwort seit</option>
                    <option value="in_status_since">Im Status seit</option>
                    <option value="before_appointment">Vor Termin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Stunden</label>
                  <input type="number" min={1} value={ruleForm.trigger_config.hours || ''} onChange={e => setRuleForm(f => ({ ...f, trigger_config: { ...f.trigger_config, hours: parseInt(e.target.value) || 0 } }))}
                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="z.B. 24" />
                </div>
              </div>
            )}

            {ruleForm.trigger_type === 'event' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Ereignis</label>
                <select value={ruleForm.trigger_config.event || ''} onChange={e => setRuleForm(f => ({ ...f, trigger_config: { ...f.trigger_config, event: e.target.value } }))}
                  className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Wählen...</option>
                  {eventOptions.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">E-Mail Vorlage</label>
                <select value={ruleForm.template_id} onChange={e => setRuleForm(f => ({ ...f, template_id: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Keine Vorlage</option>
                  {templates.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Verzögerung (Min.)</label>
                <input type="number" min={0} value={ruleForm.delay_minutes} onChange={e => setRuleForm(f => ({ ...f, delay_minutes: parseInt(e.target.value) || 0 }))}
                  className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="0" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setRuleDialogOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Abbrechen</button>
              <button onClick={saveRule}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save className="h-4 w-4" /> Speichern
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ PREVIEW DIALOG ═══ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Vorschau: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Betreff:</p>
                <p className="text-sm font-semibold">{previewTemplate.subject}</p>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <pre className="whitespace-pre-wrap text-sm font-sans text-foreground leading-relaxed">{previewTemplate.body}</pre>
              </div>
              {previewTemplate.placeholders.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Verfügbare Platzhalter:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewTemplate.placeholders.map(p => (
                      <span key={p} className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-mono text-primary">{`{{${p}}}`}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
