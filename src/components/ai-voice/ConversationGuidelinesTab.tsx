import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare, Plus, Shield, AlertTriangle, CheckCircle2, Hand,
  Mic, MicOff, UserCheck, Clock, Ban, HelpCircle, Frown, PhoneOff,
  Volume2, Eye, TriangleAlert, Settings2
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────── */

type GuidelineCategory =
  | 'greeting' | 'disclosure' | 'objection' | 'no_interest'
  | 'callback_request' | 'silence' | 'frustration' | 'unknown_question'
  | 'human_request' | 'closing' | 'forbidden' | 'blocked_topics';

type RiskLevel = 'info' | 'warning' | 'critical';
type Priority = 1 | 2 | 3;

interface Guideline {
  id: string;
  title: string;
  category: GuidelineCategory;
  content: string;
  example?: string;
  isActive: boolean;
  priority: Priority;
  risk_level: RiskLevel;
  mandatory: boolean;
  applies_to: string[];
  notes?: string;
}

/* ── Category config ─────────────────────────────────── */

const CAT_CONFIG: Record<GuidelineCategory, { label: string; cls: string; icon: React.ElementType; group: 'conversation' | 'safety' }> = {
  greeting:         { label: 'Begrüssung',              cls: 'bg-blue-500/10 text-blue-700 border-blue-500/20',        icon: Volume2,      group: 'conversation' },
  disclosure:       { label: 'KI-Offenlegung',           cls: 'bg-purple-500/10 text-purple-700 border-purple-500/20',  icon: Eye,          group: 'safety' },
  objection:        { label: 'Einwandbehandlung',        cls: 'bg-amber-500/10 text-amber-700 border-amber-500/20',    icon: AlertTriangle, group: 'conversation' },
  no_interest:      { label: 'Desinteresse',             cls: 'bg-orange-500/10 text-orange-700 border-orange-500/20',  icon: PhoneOff,     group: 'conversation' },
  callback_request: { label: 'Rückrufwunsch',            cls: 'bg-sky-500/10 text-sky-700 border-sky-500/20',           icon: Clock,        group: 'conversation' },
  silence:          { label: 'Schweigen / Stille',       cls: 'bg-slate-500/10 text-slate-700 border-slate-500/20',     icon: MicOff,       group: 'conversation' },
  frustration:      { label: 'Frustration / Ärger',      cls: 'bg-red-500/10 text-red-700 border-red-500/20',          icon: Frown,        group: 'conversation' },
  unknown_question: { label: 'Unbekannte Fragen',        cls: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',  icon: HelpCircle,   group: 'conversation' },
  human_request:    { label: 'Wunsch nach Mensch',       cls: 'bg-teal-500/10 text-teal-700 border-teal-500/20',       icon: UserCheck,    group: 'conversation' },
  closing:          { label: 'Gesprächsabschluss',       cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20', icon: CheckCircle2, group: 'conversation' },
  forbidden:        { label: 'Verbotene Zusagen',        cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: Ban,         group: 'safety' },
  blocked_topics:   { label: 'Gesperrte Themen',         cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: Shield,      group: 'safety' },
};

const RISK_BADGE: Record<RiskLevel, { label: string; variant: 'outline' | 'secondary' | 'destructive' }> = {
  info: { label: 'Info', variant: 'outline' },
  warning: { label: 'Warnung', variant: 'secondary' },
  critical: { label: 'Kritisch', variant: 'destructive' },
};

/* ── Demo guidelines ─────────────────────────────────── */

const DEMO_GUIDELINES: Guideline[] = [
  // Greeting
  {
    id: '1', title: 'Standard-Begrüssung', category: 'greeting',
    content: 'Guten Tag, mein Name ist [Agent-Name]. Ich rufe im Auftrag von SSM Partner an bezüglich Ihrer Bewerbung. Haben Sie gerade einen Moment Zeit?',
    example: '„Guten Tag, hier ist der digitale Recruiting-Assistent von SSM Partner. Ich rufe an bezüglich Ihrer kürzlich eingereichten Bewerbung. Passt es Ihnen gerade?"',
    isActive: true, priority: 1, risk_level: 'info', mandatory: true,
    applies_to: ['outbound', 'inbound', 'callback'],
    notes: 'Immer den Firmennamen nennen. Immer fragen, ob es gerade passt.'
  },
  {
    id: '2', title: 'Begrüssung Reaktivierung', category: 'greeting',
    content: 'Guten Tag, hier ist der Recruiting-Assistent von SSM Partner. Wir hatten vor einiger Zeit Kontakt bezüglich einer Karrieremöglichkeit. Ich wollte mich erkundigen, ob das Thema noch aktuell für Sie ist.',
    isActive: true, priority: 2, risk_level: 'info', mandatory: false,
    applies_to: ['reactivation'],
  },
  // Disclosure
  {
    id: '3', title: 'Pflicht-Offenlegung: Digitaler Assistent', category: 'disclosure',
    content: 'PFLICHT: Innerhalb der ersten 30 Sekunden muss offengelegt werden, dass das Gespräch durch einen digitalen Assistenten (KI) geführt wird.',
    example: '„Ich möchte Sie kurz darauf hinweisen, dass dieses Gespräch durch einen digitalen Assistenten unterstützt wird. Sie können jederzeit um ein Gespräch mit einem menschlichen Mitarbeiter bitten."',
    isActive: true, priority: 1, risk_level: 'critical', mandatory: true,
    applies_to: ['outbound', 'inbound', 'callback', 'qualification', 'reactivation'],
    notes: '⚠️ Rechtliche Pflicht gemäss Compliance-Richtlinien. Nichtbeachtung = Compliance-Verstoss.'
  },
  {
    id: '4', title: 'Aufnahmehinweis', category: 'disclosure',
    content: 'PFLICHT: Hinweis auf Gesprächsaufzeichnung zu Qualitätszwecken, sofern Recording aktiv ist.',
    example: '„Dieses Gespräch wird zu Qualitätssicherungszwecken aufgezeichnet. Sind Sie damit einverstanden?"',
    isActive: true, priority: 1, risk_level: 'critical', mandatory: true,
    applies_to: ['outbound', 'inbound', 'callback', 'qualification', 'reactivation'],
    notes: 'Bei Ablehnung: Aufnahme sofort stoppen und Gespräch ohne Recording fortsetzen.'
  },
  // Objection
  {
    id: '5', title: 'Einwand: Kein Interesse', category: 'objection',
    content: 'Verständnisvoll reagieren. Nicht insistieren. Einmal nachfragen, was der Hauptgrund ist. Bei klarer Absage respektieren.',
    example: '„Ich verstehe das vollkommen. Darf ich kurz fragen, was der Hauptgrund ist? Vielleicht können wir eine passendere Option finden. Falls nicht, respektiere ich das natürlich."',
    isActive: true, priority: 1, risk_level: 'info', mandatory: true,
    applies_to: ['outbound', 'reactivation'],
    notes: 'Maximal 1x nachfragen. Bei zweiter Ablehnung sofort akzeptieren.'
  },
  {
    id: '6', title: 'Einwand: Keine Zeit', category: 'objection',
    content: 'Verständnis zeigen und konkreten Rückruftermin anbieten.',
    example: '„Kein Problem, ich verstehe. Wann würde es Ihnen besser passen? Ich kann gerne einen Rückruf zu einem für Sie passenden Zeitpunkt einplanen."',
    isActive: true, priority: 2, risk_level: 'info', mandatory: false,
    applies_to: ['outbound', 'callback'],
  },
  {
    id: '7', title: 'Einwand: Ist das ein Callcenter / MLM?', category: 'objection',
    content: 'Sachlich und transparent aufklären über SSM Partner. Seriösität betonen.',
    example: '„Nein, SSM Partner ist ein etabliertes Schweizer Finanzdienstleistungsunternehmen. Wir suchen qualifizierte Mitarbeitende für den Aussen- und Innendienst. Gerne erkläre ich Ihnen mehr."',
    isActive: true, priority: 2, risk_level: 'info', mandatory: false,
    applies_to: ['outbound'],
  },
  // No interest
  {
    id: '8', title: 'Verhalten bei Desinteresse', category: 'no_interest',
    content: 'Bei klarem, wiederholtem Desinteresse: Gespräch freundlich beenden, Lead als „Kein Interesse" vorschlagen, keine weiteren Argumente.',
    example: '„Ich verstehe und respektiere Ihre Entscheidung. Vielen Dank für Ihre Zeit. Sollte sich Ihre Situation ändern, stehen wir Ihnen gerne zur Verfügung. Auf Wiederhören!"',
    isActive: true, priority: 1, risk_level: 'warning', mandatory: true,
    applies_to: ['outbound', 'reactivation'],
    notes: 'Niemals Druck ausüben. Sofort akzeptieren bei zweiter Ablehnung.'
  },
  // Callback
  {
    id: '9', title: 'Rückrufwunsch erkennen und behandeln', category: 'callback_request',
    content: 'Bei Rückrufwunsch: konkreten Termin und Uhrzeit erfragen, bestätigen und als Aufgabe erstellen.',
    example: '„Sehr gerne. Wann würde es Ihnen am besten passen? Vormittags oder nachmittags? Ich trage den Rückruf direkt für Sie ein."',
    isActive: true, priority: 1, risk_level: 'info', mandatory: true,
    applies_to: ['outbound', 'inbound'],
  },
  // Silence
  {
    id: '10', title: 'Verhalten bei Schweigen', category: 'silence',
    content: 'Bei Stille > 5 Sekunden: höflich nachfragen. Bei Stille > 15 Sekunden: Verbindungsproblem ansprechen. Bei Stille > 30 Sekunden: Gespräch beenden.',
    example: '„Hallo? Sind Sie noch da? Es scheint, als hätten wir ein Verbindungsproblem. Ich versuche es gerne zu einem anderen Zeitpunkt erneut."',
    isActive: true, priority: 2, risk_level: 'info', mandatory: true,
    applies_to: ['outbound', 'inbound', 'callback', 'qualification', 'reactivation'],
  },
  // Frustration
  {
    id: '11', title: 'Verhalten bei Frustration / Ärger', category: 'frustration',
    content: 'Bei erkennbarer Frustration oder Ärger: Verständnis zeigen, deeskalieren. Bei Beschimpfungen oder Drohungen: sofort an Menschen eskalieren.',
    example: '„Es tut mir leid, dass Sie frustriert sind. Ich möchte Ihnen gerne einen menschlichen Mitarbeiter vermitteln, der Ihnen besser helfen kann."',
    isActive: true, priority: 1, risk_level: 'critical', mandatory: true,
    applies_to: ['outbound', 'inbound', 'callback', 'qualification', 'reactivation'],
    notes: '⚠️ Bei aggressivem Verhalten SOFORT Eskalation auslösen.'
  },
  // Unknown questions
  {
    id: '12', title: 'Verhalten bei unbekannten Fragen', category: 'unknown_question',
    content: 'Ehrlich kommunizieren, dass die Frage nicht beantwortet werden kann. Rückruf durch Fachperson anbieten.',
    example: '„Das ist eine gute Frage, die ich Ihnen leider nicht direkt beantworten kann. Ich notiere mir das und ein Fachberater wird sich bei Ihnen melden."',
    isActive: true, priority: 2, risk_level: 'info', mandatory: true,
    applies_to: ['outbound', 'inbound', 'qualification'],
    notes: 'Niemals Informationen erfinden oder raten.'
  },
  // Human request
  {
    id: '13', title: 'Wunsch nach Mensch', category: 'human_request',
    content: 'Sofort akzeptieren. Nicht versuchen, den Kandidaten umzustimmen. Eskalation auslösen und Rückruf zusichern.',
    example: '„Natürlich, ich verstehe. Ich leite Ihre Anfrage sofort an einen menschlichen Mitarbeiter weiter. Sie werden schnellstmöglich zurückgerufen."',
    isActive: true, priority: 1, risk_level: 'warning', mandatory: true,
    applies_to: ['outbound', 'inbound', 'callback', 'qualification', 'reactivation'],
    notes: '⚠️ Niemals den Wunsch nach einem Menschen ignorieren oder relativieren.'
  },
  // Closing
  {
    id: '14', title: 'Standard-Verabschiedung', category: 'closing',
    content: 'Zusammenfassung der besprochenen Punkte, nächste Schritte nennen, Dank aussprechen.',
    example: '„Vielen Dank für das Gespräch. Ich fasse zusammen: [Zusammenfassung]. Als nächstes [nächster Schritt]. Bei Fragen erreichen Sie uns jederzeit. Auf Wiederhören!"',
    isActive: true, priority: 1, risk_level: 'info', mandatory: true,
    applies_to: ['outbound', 'inbound', 'callback', 'qualification', 'reactivation'],
  },
  // Forbidden
  {
    id: '15', title: 'Keine Gehaltsversprechen', category: 'forbidden',
    content: 'STRIKT VERBOTEN: Konkrete Gehaltszahlen nennen, Einkommensversprechen machen oder auf Provisionshöhen eingehen.',
    isActive: true, priority: 1, risk_level: 'critical', mandatory: true,
    applies_to: ['outbound', 'inbound', 'callback', 'qualification', 'reactivation'],
    notes: '⚠️ Verstoss = Compliance-Verletzung. Immer an Fachberater verweisen.'
  },
  {
    id: '16', title: 'Keine Einstellungszusagen', category: 'forbidden',
    content: 'STRIKT VERBOTEN: Zusagen zur Einstellung, zu Vertragsdetails oder Startdaten machen.',
    isActive: true, priority: 1, risk_level: 'critical', mandatory: true,
    applies_to: ['outbound', 'inbound', 'qualification'],
  },
  {
    id: '17', title: 'Keine Konkurrenz-Kritik', category: 'forbidden',
    content: 'STRIKT VERBOTEN: Negative Aussagen über Wettbewerber oder andere Arbeitgeber.',
    isActive: true, priority: 1, risk_level: 'critical', mandatory: true,
    applies_to: ['outbound', 'inbound', 'qualification', 'reactivation'],
  },
  // Blocked topics
  {
    id: '18', title: 'Gesundheit & Vorerkrankungen', category: 'blocked_topics',
    content: 'GESPERRT: Keine Fragen zu Gesundheit, Krankheitsgeschichte oder körperlichen Einschränkungen stellen.',
    isActive: true, priority: 1, risk_level: 'critical', mandatory: true,
    applies_to: ['outbound', 'inbound', 'qualification'],
    notes: 'Datenschutzrechtlich nicht zulässig im Recruiting-Erstgespräch.'
  },
  {
    id: '19', title: 'Religion & politische Einstellung', category: 'blocked_topics',
    content: 'GESPERRT: Keine Fragen zu Religion, politischer Einstellung, Familienplanung oder ethnischer Herkunft.',
    isActive: true, priority: 1, risk_level: 'critical', mandatory: true,
    applies_to: ['outbound', 'inbound', 'qualification'],
  },
];

/* ── Component ───────────────────────────────────────── */

export default function ConversationGuidelinesTab() {
  const [guidelines] = useState<Guideline[]>(DEMO_GUIDELINES);
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const conversationCats = Object.entries(CAT_CONFIG).filter(([, v]) => v.group === 'conversation').map(([k]) => k as GuidelineCategory);
  const safetyCats = Object.entries(CAT_CONFIG).filter(([, v]) => v.group === 'safety').map(([k]) => k as GuidelineCategory);

  const mandatoryCount = guidelines.filter(g => g.mandatory && g.isActive).length;
  const criticalCount = guidelines.filter(g => g.risk_level === 'critical' && g.isActive).length;
  const inactiveRequired = guidelines.filter(g => g.mandatory && !g.isActive);

  function openDetail(g: Guideline) {
    setSelectedGuideline(g);
    setDetailOpen(true);
  }

  function renderCategory(cat: GuidelineCategory) {
    const cfg = CAT_CONFIG[cat];
    const items = guidelines.filter(g => g.category === cat);
    if (items.length === 0) return null;
    const CatIcon = cfg.icon;

    return (
      <Card key={cat}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CatIcon className="h-4 w-4" />
            {cfg.label}
            <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map(g => {
            const risk = RISK_BADGE[g.risk_level];
            return (
              <div
                key={g.id}
                className={`border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow ${cfg.cls} ${!g.isActive ? 'opacity-50' : ''}`}
                onClick={() => openDetail(g)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{g.title}</p>
                      {g.mandatory && <Badge variant="default" className="text-[10px]">Pflicht</Badge>}
                      <Badge variant={risk.variant} className="text-[10px]">{risk.label}</Badge>
                    </div>
                    <p className="text-xs opacity-80 mt-1 line-clamp-2">{g.content}</p>
                  </div>
                  <Badge variant={g.isActive ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                    {g.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Warning: Inactive mandatory ── */}
      {inactiveRequired.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <TriangleAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Pflichtrichtlinien deaktiviert</p>
              {inactiveRequired.map(g => (
                <p key={g.id} className="text-xs text-destructive/80 mt-1">• {g.title} ({CAT_CONFIG[g.category].label})</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{guidelines.length}</p><p className="text-[10px] text-muted-foreground">Richtlinien gesamt</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{mandatoryCount}</p><p className="text-[10px] text-muted-foreground">Pflichtrichtlinien</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-destructive">{criticalCount}</p><p className="text-[10px] text-muted-foreground">Kritisch</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{guidelines.filter(g => g.isActive).length}</p><p className="text-[10px] text-muted-foreground">Aktiv</p></CardContent></Card>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gesprächsrichtlinien</h2>
          <p className="text-sm text-muted-foreground">Vorlagen und Regeln für KI-gestützte Gespräche</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Richtlinie hinzufügen</Button>
      </div>

      <Tabs defaultValue="conversation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conversation" className="text-xs"><MessageSquare className="h-3.5 w-3.5 mr-1" />Gesprächsführung</TabsTrigger>
          <TabsTrigger value="safety" className="text-xs"><Shield className="h-3.5 w-3.5 mr-1" />Sicherheit & Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="conversation" className="space-y-4">
          {conversationCats.map(renderCategory)}
        </TabsContent>

        <TabsContent value="safety" className="space-y-4">
          {safetyCats.map(renderCategory)}
        </TabsContent>
      </Tabs>

      {/* ── Detail Sheet ── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedGuideline && (() => {
            const g = selectedGuideline;
            const cfg = CAT_CONFIG[g.category];
            const CatIcon = cfg.icon;
            const risk = RISK_BADGE[g.risk_level];
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <CatIcon className="h-5 w-5" />
                    {g.title}
                  </SheetTitle>
                  <SheetDescription>{cfg.label}</SheetDescription>
                </SheetHeader>

                <div className="space-y-5 mt-6">
                  <div className="flex flex-wrap gap-2">
                    {g.mandatory && <Badge variant="default">Pflicht</Badge>}
                    <Badge variant={risk.variant}>{risk.label}</Badge>
                    <Badge variant={g.isActive ? 'default' : 'secondary'}>{g.isActive ? 'Aktiv' : 'Inaktiv'}</Badge>
                    <Badge variant="outline">Priorität {g.priority}</Badge>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Regel / Anweisung</Label>
                    <p className="text-sm mt-1">{g.content}</p>
                  </div>

                  {g.example && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Beispiel-Formulierung</Label>
                      <div className="mt-1 p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm italic">„{g.example.replace(/^„|"$/g, '')}"</p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Gilt für Agententypen</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {g.applies_to.map(t => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </div>

                  {g.notes && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Hinweise</Label>
                        <p className="text-sm mt-1">{g.notes}</p>
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
