import { useState } from 'react';
import { Workflow, Plus, Trash2, Zap, UserCog, Bell, ArrowRight, Check, ChevronRight, ChevronDown, Users, Settings2, Brain, Edit3, Save, X, Shield, BookOpen, BarChart3, Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLeads } from '@/context/useLeads';
import { statusConfig, statusFlow, type LeadStatus } from '@/lib/mock-data';
import { cantons } from '@/lib/swiss-plz';
import { useToast } from '@/hooks/use-toast';
import ProcessStepper from '@/components/ProcessStepper';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──
export type AutomationTrigger = 'status_change' | 'lead_created' | 'disc_completed' | 'time_in_status';
export type AutomationAction = 'change_status' | 'assign_employee' | 'send_notification';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  triggerConfig: { fromStatus?: LeadStatus; toStatus?: LeadStatus; daysInStatus?: number; canton?: string };
  action: AutomationAction;
  actionConfig: { targetStatus?: LeadStatus; targetEmployeeId?: string; notificationMessage?: string };
  createdAt: string;
}

interface ProcessGuideline {
  id: string;
  text: string;
  type: 'rule' | 'guideline';
}

interface ProcessStep {
  status: LeadStatus;
  icon: string;
  title: string;
  description: string;
  features: string[];
  guidelines: ProcessGuideline[];
}

// ── Config ──
const triggerOptions: Record<AutomationTrigger, { label: string; icon: typeof Zap; desc: string }> = {
  status_change: { label: 'Status-Wechsel', icon: ArrowRight, desc: 'Wenn ein Lead einen bestimmten Status erreicht' },
  lead_created: { label: 'Lead erstellt', icon: Users, desc: 'Wenn ein neuer Lead erfasst wird' },
  disc_completed: { label: 'DISC-Test fertig', icon: Brain, desc: 'Wenn der Persönlichkeitstest abgeschlossen wird' },
  time_in_status: { label: 'Verweildauer', icon: Bell, desc: 'Wenn ein Lead zu lange in einem Status bleibt' },
};

const actionOptions: Record<AutomationAction, { label: string; icon: typeof Zap }> = {
  change_status: { label: 'Status ändern', icon: ArrowRight },
  assign_employee: { label: 'Zuweisen', icon: UserCog },
  send_notification: { label: 'Benachrichtigung', icon: Bell },
};

const initialSteps: ProcessStep[] = [
  {
    status: 'new', icon: '🆕', title: 'Neuer Lead',
    description: 'Ein Lead wird über eine der konfigurierten Quellen (Webseite, TikTok, Meta, LinkedIn, CSV) erfasst und landet im System.',
    features: ['Automatische Erfassung via Webhook/API', 'Manuelle Erfassung über Lead-Formular', 'Quelle & Kanton automatisch zugeordnet', 'Auto-Zuweisung an Mitarbeiter möglich'],
    guidelines: [
      { id: 'g1', text: 'Neuer Lead muss innerhalb von 24h erstmalig kontaktiert werden', type: 'rule' },
      { id: 'g2', text: 'Doppelte Leads (gleiche E-Mail) müssen vor Kontaktaufnahme zusammengeführt werden', type: 'rule' },
    ],
  },
  {
    status: 'contacted', icon: '📞', title: 'Kontaktiert',
    description: 'Der zugewiesene Mitarbeiter nimmt den ersten Kontakt mit dem Kandidaten auf – per Telefon, E-Mail oder WhatsApp.',
    features: ['Kontaktversuch wird protokolliert', 'Notizen hinterlegbar', 'Zuweisung änderbar', 'Erinnerung bei Inaktivität'],
    guidelines: [
      { id: 'g3', text: 'Mindestens 3 Kontaktversuche bevor der Lead abgelehnt wird', type: 'rule' },
      { id: 'g4', text: 'Kontaktversuche im Abstand von min. 24h durchführen', type: 'guideline' },
    ],
  },
  {
    status: 'appointment', icon: '📅', title: 'Terminiert',
    description: 'Ein Termin wurde mit dem Kandidaten vereinbart. Das System unterstützt Telefon-, Video- und Vor-Ort-Termine.',
    features: ['Termin mit Datum, Uhrzeit & Typ', 'Video-Link (Jitsi) automatisch', 'Einladung per E-Mail/SMS/WhatsApp', 'Auto-Status «Terminiert»'],
    guidelines: [
      { id: 'g5', text: 'Termin muss innerhalb von 5 Werktagen nach Kontakt vereinbart werden', type: 'rule' },
      { id: 'g6', text: 'Video-Call ist bevorzugte Terminart für Erstgespräche', type: 'guideline' },
    ],
  },
  {
    status: 'interview_1', icon: '🎤', title: 'Gespräch 1',
    description: 'Das erste persönliche oder virtuelle Gespräch. Eignung und Motivation des Kandidaten werden geprüft.',
    features: ['Video-Call aus dem System starten', 'Gesprächsnotizen protokollieren', 'Bewertung hinterlegen', 'Ablehnung bei Nicht-Eignung'],
    guidelines: [
      { id: 'g7', text: 'Strukturierter Interviewleitfaden muss verwendet werden', type: 'rule' },
      { id: 'g8', text: 'Gesprächsbewertung innerhalb 1h nach dem Gespräch eintragen', type: 'guideline' },
    ],
  },
  {
    status: 'insights', icon: '🧠', title: 'Insights (DISC-Test)',
    description: 'Der Kandidat füllt einen DISC-Persönlichkeitstest aus. Die Ergebnisse zeigen Verhaltenspräferenzen.',
    features: ['12-Fragen DISC-Test', 'Automatische Auswertung D/I/S/C', 'Grafische Visualisierung', 'Pflicht vor Gespräch 2 konfigurierbar'],
    guidelines: [
      { id: 'g9', text: 'DISC-Test muss abgeschlossen sein, bevor Gespräch 2 stattfindet', type: 'rule' },
      { id: 'g10', text: 'Ergebnisse werden dem Interviewer vor Gespräch 2 zur Verfügung gestellt', type: 'guideline' },
    ],
  },
  {
    status: 'interview_2', icon: '🤝', title: 'Gespräch 2',
    description: 'Das zweite, vertiefende Gespräch – oft mit Teamleitung oder Management. Basierend auf Insights-Ergebnissen.',
    features: ['DISC als Gesprächsgrundlage', 'Detaillierte Bewertung', 'Finale Entscheidung', 'Ablehnung oder Einstellung'],
    guidelines: [
      { id: 'g11', text: 'Mindestens 2 Interviewer müssen am Zweitgespräch teilnehmen', type: 'rule' },
      { id: 'g12', text: 'Entscheidung (Zusage/Absage) muss innerhalb von 48h kommuniziert werden', type: 'guideline' },
    ],
  },
  {
    status: 'hired', icon: '✅', title: 'Eingestellt',
    description: 'Der Kandidat hat den gesamten Prozess durchlaufen und wurde erfolgreich eingestellt.',
    features: ['Vollständige Prozess-Historie', 'Notizen & DISC archiviert', 'Konversionsrate', 'Pipeline-Abschluss'],
    guidelines: [
      { id: 'g13', text: 'Willkommens-E-Mail wird automatisch nach Einstellung versendet', type: 'guideline' },
    ],
  },
  {
    status: 'rejected', icon: '❌', title: 'Abgelehnt',
    description: 'Der Kandidat wurde in einer beliebigen Phase des Prozesses abgelehnt.',
    features: ['Ablehnungsgrund dokumentierbar', 'Zeitpunkt protokolliert', 'Spätere Referenz möglich', 'Ablehnungsquote pro Phase'],
    guidelines: [
      { id: 'g14', text: 'Absagegrund muss immer dokumentiert werden', type: 'rule' },
      { id: 'g15', text: 'Freundliche Absage-Nachricht innerhalb 24h senden', type: 'guideline' },
    ],
  },
];

const defaultRules: AutomationRule[] = [
  { id: 'rule-1', name: 'DISC-Test → Gespräch 2', enabled: true, trigger: 'disc_completed', triggerConfig: {}, action: 'change_status', actionConfig: { targetStatus: 'interview_2' }, createdAt: new Date().toISOString() },
  { id: 'rule-2', name: 'Erinnerung bei Inaktivität', enabled: false, trigger: 'time_in_status', triggerConfig: { toStatus: 'contacted', daysInStatus: 3 }, action: 'send_notification', actionConfig: { notificationMessage: 'Lead seit 3 Tagen im Status "Kontaktiert" – bitte nachfassen!' }, createdAt: new Date().toISOString() },
];

const mainFlow: LeadStatus[] = statusFlow.filter(s => s !== 'rejected');
const inputCls = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export default function Processes() {
  const { leads, employees } = useLeads();
  const { toast } = useToast();

  const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
  const [steps, setSteps] = useState<ProcessStep[]>(initialSteps);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedStep, setExpandedStep] = useState<LeadStatus | null>(null);
  const [editingGuideline, setEditingGuideline] = useState<string | null>(null);
  const [newGuidelineText, setNewGuidelineText] = useState('');
  const [newGuidelineType, setNewGuidelineType] = useState<'rule' | 'guideline'>('rule');
  const [addingGuidelineFor, setAddingGuidelineFor] = useState<LeadStatus | null>(null);
  const [aiLoadingFor, setAiLoadingFor] = useState<LeadStatus | null>(null);

  // ── AI guideline generation ──
  const generateAiGuidelines = async (step: ProcessStep) => {
    setAiLoadingFor(step.status);
    try {
      const { data, error } = await supabase.functions.invoke('generate-guidelines', {
        body: {
          stepStatus: step.status,
          stepTitle: step.title,
          stepDescription: step.description,
          existingGuidelines: step.guidelines,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: 'KI-Fehler', description: data.error, variant: 'destructive' });
        return;
      }

      const newGuidelines = data?.guidelines || [];
      if (newGuidelines.length === 0) {
        toast({ title: 'Keine neuen Vorschläge', description: 'Die KI konnte keine weiteren Richtlinien vorschlagen.' });
        return;
      }

      setSteps(prev => prev.map(s => s.status === step.status ? {
        ...s, guidelines: [...s.guidelines, ...newGuidelines]
      } : s));

      toast({ title: `${newGuidelines.length} Richtlinien generiert`, description: `KI-Vorschläge für "${step.title}" hinzugefügt.` });
    } catch (err) {
      console.error('AI guidelines error:', err);
      toast({ title: 'Fehler', description: 'KI-Richtlinien konnten nicht generiert werden.', variant: 'destructive' });
    } finally {
      setAiLoadingFor(null);
    }
  };

  const [form, setForm] = useState({
    name: '', trigger: 'status_change' as AutomationTrigger,
    fromStatus: '' as LeadStatus | '', toStatus: '' as LeadStatus | '',
    daysInStatus: 3, canton: '',
    action: 'change_status' as AutomationAction,
    targetStatus: '' as LeadStatus | '', targetEmployeeId: '', notificationMessage: '',
  });

  // ── Automation handlers ──
  const addRule = () => {
    if (!form.name.trim()) { toast({ title: 'Fehler', description: 'Bitte Name eingeben.', variant: 'destructive' }); return; }
    const rule: AutomationRule = {
      id: `rule-${Date.now()}`, name: form.name, enabled: true, trigger: form.trigger,
      triggerConfig: { fromStatus: form.fromStatus || undefined, toStatus: form.toStatus || undefined, daysInStatus: form.trigger === 'time_in_status' ? form.daysInStatus : undefined, canton: form.canton || undefined },
      action: form.action,
      actionConfig: { targetStatus: form.action === 'change_status' ? (form.targetStatus as LeadStatus) : undefined, targetEmployeeId: form.action === 'assign_employee' ? form.targetEmployeeId : undefined, notificationMessage: form.action === 'send_notification' ? form.notificationMessage : undefined },
      createdAt: new Date().toISOString(),
    };
    setRules(prev => [...prev, rule]);
    setDialogOpen(false);
    setForm({ name: '', trigger: 'status_change', fromStatus: '', toStatus: '', daysInStatus: 3, canton: '', action: 'change_status', targetStatus: '', targetEmployeeId: '', notificationMessage: '' });
    toast({ title: 'Regel erstellt', description: `"${rule.name}" hinzugefügt.` });
  };

  const toggleRule = (id: string) => setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const removeRule = (id: string) => { setRules(prev => prev.filter(r => r.id !== id)); toast({ title: 'Entfernt' }); };

  // ── Guideline handlers ──
  const addGuideline = (status: LeadStatus) => {
    if (!newGuidelineText.trim()) return;
    setSteps(prev => prev.map(s => s.status === status ? {
      ...s, guidelines: [...s.guidelines, { id: `g-${Date.now()}`, text: newGuidelineText.trim(), type: newGuidelineType }]
    } : s));
    setNewGuidelineText('');
    setAddingGuidelineFor(null);
    toast({ title: 'Richtlinie hinzugefügt' });
  };

  const removeGuideline = (status: LeadStatus, guidelineId: string) => {
    setSteps(prev => prev.map(s => s.status === status ? { ...s, guidelines: s.guidelines.filter(g => g.id !== guidelineId) } : s));
  };

  const updateGuidelineText = (status: LeadStatus, guidelineId: string, text: string) => {
    setSteps(prev => prev.map(s => s.status === status ? {
      ...s, guidelines: s.guidelines.map(g => g.id === guidelineId ? { ...g, text } : g)
    } : s));
    setEditingGuideline(null);
  };

  const statusCounts = mainFlow.map(status => ({
    status, config: statusConfig[status], count: leads.filter(l => l.status === status).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prozesse & Automatisierungen</h1>
        <p className="text-muted-foreground">Workflow visualisieren, Richtlinien definieren und Automatisierungen verwalten</p>
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-fit">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Übersicht</TabsTrigger>
          <TabsTrigger value="directory" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Verzeichnis & Richtlinien</TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Automatisierungen</TabsTrigger>
        </TabsList>

        {/* ══════════ TAB: Übersicht ══════════ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Recruiting-Prozess</h2>
            </div>
            <div className="py-2">
              <ProcessStepper currentStatus="hired" />
            </div>
            <div className="grid grid-cols-7 gap-3">
              {statusCounts.map(({ status, config, count }) => (
                <div key={status} className="rounded-xl border bg-muted/30 p-3 text-center space-y-1 transition-colors hover:bg-muted/50">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-[11px] font-medium text-muted-foreground leading-tight">{config.label}</p>
                  <div className="mx-auto mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: leads.length > 0 ? `${(count / leads.length) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Aktive Automatisierungen</p>
              <p className="text-3xl font-bold mt-1">{rules.filter(r => r.enabled).length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">von {rules.length} Regeln</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Definierte Richtlinien</p>
              <p className="text-3xl font-bold mt-1">{steps.reduce((acc, s) => acc + s.guidelines.length, 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">über {steps.length} Prozessschritte</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Konversionsrate</p>
              <p className="text-3xl font-bold mt-1">{leads.length > 0 ? ((leads.filter(l => l.status === 'hired').length / leads.length) * 100).toFixed(1) : '0'}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Eingestellt / Gesamt</p>
            </div>
          </div>
        </TabsContent>

        {/* ══════════ TAB: Verzeichnis & Richtlinien ══════════ */}
        <TabsContent value="directory" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Prozess-Verzeichnis</h2>
              <p className="text-sm text-muted-foreground">Klicke auf einen Prozessschritt um Richtlinien und Regeln zu bearbeiten.</p>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map(step => {
              const config = statusConfig[step.status];
              const count = leads.filter(l => l.status === step.status).length;
              const isExpanded = expandedStep === step.status;
              const ruleCount = step.guidelines.filter(g => g.type === 'rule').length;
              const guidelineCount = step.guidelines.filter(g => g.type === 'guideline').length;

              return (
                <div key={step.status} className="rounded-xl border bg-card shadow-sm overflow-hidden transition-all">
                  {/* Header (clickable) */}
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : step.status)}
                    className="flex w-full items-start gap-4 p-5 text-left hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-2xl mt-0.5">{step.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-bold">{step.title}</h3>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${config.color}`}>{config.label}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{count} Leads</span>
                        {ruleCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                            <Shield className="h-2.5 w-2.5" /> {ruleCount} {ruleCount === 1 ? 'Regel' : 'Regeln'}
                          </span>
                        )}
                        {guidelineCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            <BookOpen className="h-2.5 w-2.5" /> {guidelineCount} {guidelineCount === 1 ? 'Richtlinie' : 'Richtlinien'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform mt-1 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t px-5 pb-5 space-y-4">
                      {/* Features */}
                      <div className="pt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Funktionen</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {step.features.map((feature, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-muted/50 border px-2 py-1 text-[11px]">
                              <Check className="h-3 w-3 text-primary shrink-0" />{feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Guidelines & Rules */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Richtlinien & Regeln</h4>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); generateAiGuidelines(step); }}
                              disabled={aiLoadingFor === step.status}
                              className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                              {aiLoadingFor === step.status ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              KI generieren
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setAddingGuidelineFor(step.status); setNewGuidelineText(''); setNewGuidelineType('rule'); }}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                            >
                              <Plus className="h-3 w-3" /> Hinzufügen
                            </button>
                          </div>
                        </div>

                        {step.guidelines.length === 0 && addingGuidelineFor !== step.status && (
                          <p className="text-xs text-muted-foreground italic py-2">Keine Richtlinien definiert. Klicke auf «Hinzufügen» um eine Regel oder Richtlinie festzulegen.</p>
                        )}

                        <div className="space-y-1.5">
                          {step.guidelines.map(g => (
                            <div key={g.id} className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${g.type === 'rule' ? 'bg-destructive/5 border-destructive/20' : 'bg-primary/5 border-primary/20'}`}>
                              {g.type === 'rule' ? (
                                <Shield className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                              ) : (
                                <BookOpen className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              )}
                              {editingGuideline === g.id ? (
                                <div className="flex-1 flex gap-2">
                                  <input
                                    defaultValue={g.text}
                                    onKeyDown={e => { if (e.key === 'Enter') updateGuidelineText(step.status, g.id, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingGuideline(null); }}
                                    autoFocus
                                    className="flex-1 h-7 rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                                  />
                                  <button onClick={() => setEditingGuideline(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                                </div>
                              ) : (
                                <>
                                  <span className="flex-1 text-xs leading-relaxed">{g.text}</span>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button onClick={() => setEditingGuideline(g.id)} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                      <Edit3 className="h-3 w-3" />
                                    </button>
                                    <button onClick={() => removeGuideline(step.status, g.id)} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}

                          {/* Add new guideline inline form */}
                          {addingGuidelineFor === step.status && (
                            <div className="rounded-lg border border-dashed bg-muted/20 p-3 space-y-2">
                              <div className="flex gap-2">
                                <select value={newGuidelineType} onChange={e => setNewGuidelineType(e.target.value as 'rule' | 'guideline')}
                                  className="h-8 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring">
                                  <option value="rule">🛡 Pflicht-Regel</option>
                                  <option value="guideline">📘 Richtlinie</option>
                                </select>
                                <input
                                  value={newGuidelineText}
                                  onChange={e => setNewGuidelineText(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') addGuideline(step.status); if (e.key === 'Escape') setAddingGuidelineFor(null); }}
                                  placeholder={newGuidelineType === 'rule' ? 'z.B. Lead muss innerhalb 24h kontaktiert werden' : 'z.B. Video-Call ist bevorzugt'}
                                  autoFocus
                                  className="flex-1 h-8 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setAddingGuidelineFor(null)} className="rounded-lg px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors">Abbrechen</button>
                                <button onClick={() => addGuideline(step.status)} disabled={!newGuidelineText.trim()} className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">Speichern</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ══════════ TAB: Automatisierungen ══════════ */}
        <TabsContent value="automations" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Automatisierungen</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{rules.length}</span>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4" /> Neue Regel
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Automatisierung erstellen</DialogTitle></DialogHeader>
                <div className="space-y-5 pt-2">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="z.B. Auto-Zuweisung ZH Leads" className={inputCls + ' mt-1'} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Auslöser</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(triggerOptions) as [AutomationTrigger, typeof triggerOptions[AutomationTrigger]][]).map(([key, cfg]) => {
                        const Icon = cfg.icon; const isActive = form.trigger === key;
                        return (
                          <button key={key} onClick={() => setForm(p => ({ ...p, trigger: key }))}
                            className={`rounded-xl border p-3 text-left transition-colors ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className="text-xs font-semibold">{cfg.label}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{cfg.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                    {form.trigger === 'status_change' && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div><label className="text-xs font-medium text-muted-foreground">Von Status</label>
                          <select value={form.fromStatus} onChange={e => setForm(p => ({ ...p, fromStatus: e.target.value as LeadStatus }))} className={inputCls + ' mt-1'}>
                            <option value="">Beliebig</option>{statusFlow.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}</select></div>
                        <div><label className="text-xs font-medium text-muted-foreground">Zu Status</label>
                          <select value={form.toStatus} onChange={e => setForm(p => ({ ...p, toStatus: e.target.value as LeadStatus }))} className={inputCls + ' mt-1'}>
                            <option value="">Beliebig</option>{statusFlow.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}</select></div>
                      </div>
                    )}
                    {form.trigger === 'time_in_status' && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div><label className="text-xs font-medium text-muted-foreground">Im Status</label>
                          <select value={form.toStatus} onChange={e => setForm(p => ({ ...p, toStatus: e.target.value as LeadStatus }))} className={inputCls + ' mt-1'}>
                            {statusFlow.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}</select></div>
                        <div><label className="text-xs font-medium text-muted-foreground">Nach Tagen</label>
                          <input type="number" min={1} max={30} value={form.daysInStatus} onChange={e => setForm(p => ({ ...p, daysInStatus: Number(e.target.value) }))} className={inputCls + ' mt-1'} /></div>
                      </div>
                    )}
                    {form.trigger === 'lead_created' && (
                      <div className="pt-1"><label className="text-xs font-medium text-muted-foreground">Kanton (optional)</label>
                        <select value={form.canton} onChange={e => setForm(p => ({ ...p, canton: e.target.value }))} className={inputCls + ' mt-1'}>
                          <option value="">Alle Kantone</option>{cantons.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}</select></div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Aktion</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.entries(actionOptions) as [AutomationAction, typeof actionOptions[AutomationAction]][]).map(([key, cfg]) => {
                        const Icon = cfg.icon; const isActive = form.action === key;
                        return (
                          <button key={key} onClick={() => setForm(p => ({ ...p, action: key }))}
                            className={`rounded-xl border p-3 text-left transition-colors ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                            <Icon className={`h-3.5 w-3.5 mb-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-xs font-semibold">{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {form.action === 'change_status' && (
                      <div className="pt-1"><label className="text-xs font-medium text-muted-foreground">Ziel-Status</label>
                        <select value={form.targetStatus} onChange={e => setForm(p => ({ ...p, targetStatus: e.target.value as LeadStatus }))} className={inputCls + ' mt-1'}>
                          <option value="">Wählen</option>{statusFlow.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}</select></div>
                    )}
                    {form.action === 'assign_employee' && (
                      <div className="pt-1"><label className="text-xs font-medium text-muted-foreground">Mitarbeiter</label>
                        <select value={form.targetEmployeeId} onChange={e => setForm(p => ({ ...p, targetEmployeeId: e.target.value }))} className={inputCls + ' mt-1'}>
                          <option value="">Wählen</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                    )}
                    {form.action === 'send_notification' && (
                      <div className="pt-1"><label className="text-xs font-medium text-muted-foreground">Nachricht</label>
                        <textarea value={form.notificationMessage} onChange={e => setForm(p => ({ ...p, notificationMessage: e.target.value }))} rows={2} placeholder="z.B. Lead seit X Tagen unbearbeitet..."
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none mt-1" /></div>
                    )}
                  </div>

                  <button onClick={addRule} disabled={!form.name.trim()} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                    Regel erstellen
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {rules.length === 0 && (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
              <Zap className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Noch keine Automatisierungen.</p>
            </div>
          )}

          <div className="space-y-3">
            {rules.map(rule => {
              const trigger = triggerOptions[rule.trigger];
              const action = actionOptions[rule.action];
              const TriggerIcon = trigger.icon;
              const ActionIcon = action.icon;
              return (
                <div key={rule.id} className={`rounded-xl border bg-card p-4 shadow-sm transition-all ${!rule.enabled ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className={`h-4 w-4 ${rule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h3 className="text-sm font-semibold truncate">{rule.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rule.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {rule.enabled ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1">
                          <TriggerIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{trigger.label}</span>
                          {rule.triggerConfig.toStatus && <span className="text-muted-foreground">→ {statusConfig[rule.triggerConfig.toStatus]?.label}</span>}
                          {rule.triggerConfig.daysInStatus && <span className="text-muted-foreground">({rule.triggerConfig.daysInStatus}d)</span>}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1">
                          <ActionIcon className="h-3 w-3 text-primary" />
                          <span className="font-medium text-primary">{action.label}</span>
                          {rule.actionConfig.targetStatus && <span className="text-primary/70">→ {statusConfig[rule.actionConfig.targetStatus]?.label}</span>}
                          {rule.actionConfig.targetEmployeeId && <span className="text-primary/70">→ {employees.find(e => e.id === rule.actionConfig.targetEmployeeId)?.name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleRule(rule.id)} className={`relative h-6 w-11 rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-muted'}`}>
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${rule.enabled ? 'translate-x-5' : ''}`} />
                      </button>
                      <button onClick={() => removeRule(rule.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
