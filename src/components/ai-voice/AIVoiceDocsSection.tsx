import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Settings, Layers, Megaphone, BookOpen, Zap, Code2, Webhook, Shield, DollarSign, FlaskConical, History, Server, PhoneCall } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const sections = [
  { id: 'setup', label: 'Einrichtung', icon: Settings, adminOnly: false },
  { id: 'architecture', label: 'Architektur', icon: Server, adminOnly: true },
  { id: 'operations', label: 'Betriebsmodell', icon: Layers, adminOnly: false },
  { id: 'agents', label: 'Agenten', icon: Bot, adminOnly: false },
  { id: 'campaigns', label: 'Kampagnen', icon: Megaphone, adminOnly: false },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, adminOnly: false },
  { id: 'actions', label: 'Action Rules', icon: Zap, adminOnly: false },
  { id: 'api', label: 'API', icon: Code2, adminOnly: true },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook, adminOnly: true },
  { id: 'compliance', label: 'Compliance & Audit', icon: Shield, adminOnly: true },
  { id: 'costs', label: 'Cost Control', icon: DollarSign, adminOnly: true },
  { id: 'testing', label: 'Testbetrieb', icon: FlaskConical, adminOnly: false },
  { id: 'changelog', label: 'Änderungsverlauf', icon: History, adminOnly: false },
];

const CONTENT: Record<string, { title: string; content: React.ReactNode }> = {
  setup: {
    title: 'Einrichtung & Konfiguration',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">1. Provider einrichten</h3>
        <p>Navigieren Sie zu <strong>AI Voice Agent → Infrastruktur</strong> (Tab «Provider») und konfigurieren Sie mindestens einen Telephony-Provider und einen Voice-AI-Provider.</p>
        <h3 className="text-foreground text-base font-semibold">2. Agent erstellen</h3>
        <p>Unter <strong>AI Voice Agent → Betrieb</strong> (Tab «Agenten») erstellen Sie einen neuen Voice Agent mit System-Prompt, Begrüssung und Gesprächsregeln.</p>
        <h3 className="text-foreground text-base font-semibold">3. Nummer zuweisen</h3>
        <p>Weisen Sie dem Agenten eine Telefonnummer zu unter <strong>Infrastruktur → Voice Numbers</strong>.</p>
        <h3 className="text-foreground text-base font-semibold">4. Deployment erstellen</h3>
        <p>Starten Sie mit einem <strong>Shadow-Deployment</strong> im Test-Modus, bevor Sie auf Produktion wechseln.</p>
        <h3 className="text-foreground text-base font-semibold">5. Knowledge Base befüllen</h3>
        <p>Fügen Sie unter <strong>Wissen & Regeln → Knowledge Base</strong> die Wissensbasis für den Agenten hinzu (FAQ, Produkte, Prozesse).</p>
      </div>
    ),
  },
  architecture: {
    title: 'Systemarchitektur',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Provider-Abstraktion</h3>
        <p>Das System nutzt ein <code>VoiceProvider</code>-Interface, das verschiedene Anbieter abstrahiert. Aktuell implementiert: <strong>MockVoiceProvider</strong> für Test und Entwicklung.</p>
        <h3 className="text-foreground text-base font-semibold">Datenmodell</h3>
        <p>14 spezialisierte Tabellen bilden das Rückgrat: <code>ai_agents</code>, <code>ai_agent_versions</code>, <code>ai_agent_deployments</code>, <code>ai_voice_sessions</code>, <code>ai_voice_turns</code>, <code>ai_voice_campaigns</code>, <code>ai_voice_numbers</code>, <code>ai_provider_configs</code>, <code>ai_voice_escalations</code>, <code>ai_voice_knowledge_items</code>, <code>ai_voice_cost_logs</code>, <code>ai_voice_test_runs</code>, <code>ai_voice_action_logs</code>, <code>ai_compliance_rules</code>.</p>
        <h3 className="text-foreground text-base font-semibold">Execution Modes</h3>
        <ul>
          <li><strong>Shadow:</strong> Nur beobachten und protokollieren</li>
          <li><strong>Recommendation:</strong> Vorschläge, Mensch bestätigt</li>
          <li><strong>Semi-Autonomous:</strong> Einfache Aktionen automatisch</li>
          <li><strong>Autonomous:</strong> Vollautomatisch</li>
        </ul>
      </div>
    ),
  },
  operations: {
    title: 'Betriebsmodell',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Rollout-Modi</h3>
        <ul>
          <li><strong>Shadow:</strong> Agent hört zu, schlägt vor, führt nichts aus</li>
          <li><strong>Recommendation:</strong> Agent schlägt Aktionen vor, Mensch bestätigt</li>
          <li><strong>Semi-Autonomous:</strong> Einfache Aktionen automatisch, kritische mit Bestätigung</li>
          <li><strong>Autonomous:</strong> Vollautomatische Ausführung aller Aktionen</li>
        </ul>
        <h3 className="text-foreground text-base font-semibold">Eskalationspfade</h3>
        <p>Bei negativer Stimmung, Compliance-Verstössen oder expliziten Wünschen wird automatisch an einen menschlichen Mitarbeiter eskaliert.</p>
        <h3 className="text-foreground text-base font-semibold">Session-Lebenszyklus</h3>
        <p>Jede Session durchläuft: <code>pending → ringing → connected → completed/failed</code>. Bei Problemen greift der Kill Switch.</p>
      </div>
    ),
  },
  agents: {
    title: 'Agenten-Verwaltung',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Agent erstellen</h3>
        <p>Jeder Agent hat einen Namen, System-Prompt, Begrüssungstext, Sprache, Ton-Stil und maximale Gesprächsdauer. Agenten können einer Agentur oder einem Benutzer zugewiesen werden.</p>
        <h3 className="text-foreground text-base font-semibold">Versionierung</h3>
        <p>Änderungen am Agent erzeugen neue Versionen. Nur veröffentlichte Versionen werden im Livebetrieb verwendet. Vorherige Versionen bleiben als Rollback verfügbar.</p>
        <h3 className="text-foreground text-base font-semibold">Agent-Status</h3>
        <ul>
          <li><strong>Draft:</strong> In Bearbeitung</li>
          <li><strong>Testing:</strong> Im Testbetrieb</li>
          <li><strong>Active:</strong> Im Livebetrieb</li>
          <li><strong>Paused:</strong> Temporär deaktiviert</li>
          <li><strong>Archived:</strong> Nicht mehr verwendet</li>
        </ul>
      </div>
    ),
  },
  campaigns: {
    title: 'Kampagnen',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Kampagnen-Typen</h3>
        <ul>
          <li><strong>Outbound:</strong> Proaktive Anrufe an Leads/Kandidaten</li>
          <li><strong>Inbound:</strong> Eingehende Anrufe verarbeiten</li>
          <li><strong>Follow-up:</strong> Automatische Nachfass-Anrufe</li>
        </ul>
        <h3 className="text-foreground text-base font-semibold">Konfiguration</h3>
        <p>Pro Kampagne: Ziel-Agent, Lead-Quellen, Status-Filter, Tages-/Gesamtbudget, max. Calls pro Tag, Zeitfenster und Retry-Regeln.</p>
        <h3 className="text-foreground text-base font-semibold">Steuerung</h3>
        <p>Kampagnen können gestartet, pausiert und beendet werden. Bei Budgetüberschreitung stoppt die Kampagne automatisch.</p>
      </div>
    ),
  },
  knowledge: {
    title: 'Knowledge Base',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Wissenseinträge</h3>
        <p>Die Knowledge Base enthält strukturierte Inhalte, die der Agent im Gespräch nutzt: FAQ, Produktinformationen, Gesprächsleitfäden und Compliance-Texte.</p>
        <h3 className="text-foreground text-base font-semibold">Freigabe-Workflow</h3>
        <p>Wissenseinträge durchlaufen: <code>draft → in review → approved → live</code>. Nur freigegebene Einträge werden im Livebetrieb verwendet.</p>
        <h3 className="text-foreground text-base font-semibold">Kategorien</h3>
        <p>Einträge werden nach Kategorien und Tags organisiert. Jeder Eintrag hat eine Risiko-Klasse (low/medium/high) und eine optionale Gültigkeitsdauer.</p>
      </div>
    ),
  },
  actions: {
    title: 'Action Rules',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Automatische Aktionen</h3>
        <p>Der Agent kann basierend auf Gesprächsergebnissen automatisch Aktionen in SSM Recruit auslösen:</p>
        <ul>
          <li>Lead-Status aktualisieren</li>
          <li>Follow-up Aufgaben erstellen</li>
          <li>Termine vormerken</li>
          <li>Eskalation an Mitarbeiter</li>
          <li>Notizen erstellen</li>
          <li>Wizard starten</li>
        </ul>
        <h3 className="text-foreground text-base font-semibold">Ausführungsmodi</h3>
        <p>Aktionen können je nach Deployment-Modus automatisch, mit Bestätigung oder nur als Vorschlag ausgeführt werden.</p>
      </div>
    ),
  },
  api: {
    title: 'API-Dokumentation',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Basis-URL</h3>
        <code className="block bg-muted p-2 rounded text-xs">POST /functions/v1/voice-webhook</code>
        <h3 className="text-foreground text-base font-semibold">Authentifizierung</h3>
        <p>Bearer Token via <code>Authorization</code> Header.</p>
        <h3 className="text-foreground text-base font-semibold">Endpunkte</h3>
        <div className="space-y-2">
          <div className="border rounded p-2">
            <code className="text-xs font-bold">GET /ai-agents</code>
            <p className="text-xs text-muted-foreground mt-1">Alle Agenten abrufen</p>
          </div>
          <div className="border rounded p-2">
            <code className="text-xs font-bold">POST /ai-agents</code>
            <p className="text-xs text-muted-foreground mt-1">Neuen Agenten erstellen</p>
          </div>
          <div className="border rounded p-2">
            <code className="text-xs font-bold">GET /ai-voice-sessions</code>
            <p className="text-xs text-muted-foreground mt-1">Sessions abrufen (mit Filtern)</p>
          </div>
          <div className="border rounded p-2">
            <code className="text-xs font-bold">POST /ai-voice-campaigns</code>
            <p className="text-xs text-muted-foreground mt-1">Kampagne erstellen</p>
          </div>
        </div>
      </div>
    ),
  },
  webhooks: {
    title: 'Webhooks',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Eingehende Webhooks</h3>
        <p>Der Voice Agent kann über Webhooks Anrufereignisse empfangen:</p>
        <div className="space-y-2">
          <div className="border rounded p-2">
            <code className="text-xs font-bold">POST /functions/v1/voice-webhook</code>
            <p className="text-xs text-muted-foreground mt-1">Telephony-Provider Callback (Call-Status, Transkripte)</p>
          </div>
          <div className="border rounded p-2">
            <code className="text-xs font-bold">POST /functions/v1/voice-event</code>
            <p className="text-xs text-muted-foreground mt-1">Echtzeit-Events (Session-Start, Turn-Complete)</p>
          </div>
        </div>
        <h3 className="text-foreground text-base font-semibold">Ausgehende Webhooks</h3>
        <p>Bei bestimmten Events können Webhooks an externe Systeme gesendet werden (konfigurierbar pro Agent).</p>
      </div>
    ),
  },
  compliance: {
    title: 'Compliance & Audit',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Audit Log</h3>
        <p>Alle Änderungen an Agenten, Deployments, Kampagnen und Providern werden in <code>ai_audit_logs</code> protokolliert mit Aktion, Benutzer, Zeitstempel und Daten-Diff.</p>
        <h3 className="text-foreground text-base font-semibold">Compliance Rules</h3>
        <p>Konfigurierbare Regeln für: Pflicht-Disclaimers, verbotene Aussagen, maximale Gesprächsdauer, Aufzeichnungspflicht.</p>
        <h3 className="text-foreground text-base font-semibold">Session Reviews</h3>
        <p>Problematische Sessions werden automatisch geflaggt (negative Stimmung, Compliance-Verstoss) und können manuell überprüft werden.</p>
      </div>
    ),
  },
  costs: {
    title: 'Cost Control',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Budgetgrenzen</h3>
        <ul>
          <li>Tagesbudget pro Agent</li>
          <li>Monatsbudget pro Agent</li>
          <li>Budget pro Kampagne</li>
          <li>Globale Budgetgrenze</li>
        </ul>
        <h3 className="text-foreground text-base font-semibold">Auto-Stopp</h3>
        <p>Bei Überschreitung eines Budgetlimits werden betroffene Agenten/Kampagnen automatisch pausiert. Warnschwellen lösen Benachrichtigungen aus.</p>
        <h3 className="text-foreground text-base font-semibold">Kostenberechnung</h3>
        <p>Kosten werden pro Session erfasst: Telephony-Kosten + AI-Kosten = Gesamtkosten. Aufschlüsselung nach Agent, Kampagne und Provider.</p>
      </div>
    ),
  },
  testing: {
    title: 'Testbetrieb',
    content: (
      <div className="space-y-4">
        <h3 className="text-foreground text-base font-semibold">Mock Provider</h3>
        <p>Der integrierte Mock-Provider simuliert Outbound/Inbound-Calls mit realistischen Szenarien (Connected, No Answer, Busy, Voicemail, Failed).</p>
        <h3 className="text-foreground text-base font-semibold">Test Center</h3>
        <p>Im Test Center können Szenarien definiert und ausgeführt werden. Ergebnisse werden mit erwarteten Resultaten verglichen (Pass/Fail).</p>
        <h3 className="text-foreground text-base font-semibold">Shadow Mode</h3>
        <p>Im Shadow-Modus werden alle Aktionen nur protokolliert aber nicht ausgeführt – ideal für die Validierung vor dem Livebetrieb.</p>
      </div>
    ),
  },
  changelog: {
    title: 'Änderungsverlauf',
    content: (
      <div className="space-y-3">
        {[
          { version: '1.2.0', date: '09.04.2026', changes: ['Navigation vereinfacht: 5 Hauptbereiche mit Tabs statt 20+ Einzelseiten', 'Dokumentation in zentrale SSM-Recruit-Dokumentation integriert', 'Sidebar deutlich aufgeräumt'] },
          { version: '1.1.0', date: '09.04.2026', changes: ['Benachrichtigungs-Integration (Eskalationen, Rückrufe, Budget)', 'Aufgaben-Synchronisation bei AI-Events', 'Cost Control & Kill Switch', 'Analytics Dashboard mit KPI-Karten', 'Compliance & Audit Log', 'Session Reviews mit Flagging'] },
          { version: '1.0.0', date: '09.04.2026', changes: ['Initiales AI Voice Agent Modul', 'Mock-Provider implementiert', 'Provider-Abstraktion (VoiceProvider Interface)', 'Rollen- und Rechteintegration', '14 Datenbank-Tabellen'] },
        ].map(v => (
          <div key={v.version} className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm">v{v.version}</span>
              <span className="text-xs text-muted-foreground">{v.date}</span>
            </div>
            <ul className="space-y-1">
              {v.changes.map((c, i) => <li key={i} className="text-xs text-muted-foreground">• {c}</li>)}
            </ul>
          </div>
        ))}
      </div>
    ),
  },
};

export default function AIVoiceDocsSection() {
  const { role } = useAuth();
  const isAdmin = role === 'superadmin' || role === 'admin';
  const visible = sections.filter(s => !s.adminOnly || isAdmin);
  const [activeSection, setActiveSection] = useState(visible[0]?.id ?? 'setup');

  const current = CONTENT[activeSection];

  return (
    <div className="flex gap-6">
      {/* Left nav */}
      <nav className="w-48 shrink-0 space-y-0.5">
        {visible.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              activeSection === s.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <s.icon className="h-3.5 w-3.5 shrink-0" />
            {s.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {current && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                {current.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none text-muted-foreground">
              {current.content}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
