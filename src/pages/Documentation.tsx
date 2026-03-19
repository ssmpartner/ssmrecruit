import { useState } from 'react';
import { Zap, RefreshCw, CheckCircle2, LayoutGrid, ChevronDown, Code2, Shield, BookOpen, Layers } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const APP_VERSION = '2.11.0';

const versionHistory = [
  { version: '2.11.0', date: '19.03.2026', changes: [
    'Mehrfachauswahl in der Lead-Tabelle: Superadmins können mehrere Leads per Checkbox auswählen',
    'Bulk-Zuweisung: Ausgewählte Leads einem Mitarbeiter oder einer Agentur zuweisen',
    'Bulk-Aktionen: Mehrere Leads gleichzeitig archivieren oder löschen',
    'CSV-Import: Erweiterte Felder – Lead-Datum, Quelle, Mitarbeiter, Agentur, Status und Kampagne',
    'Kampagne als eigenständiges Datenbankfeld für präzise Marketing-Zuordnung',
    'Feldbezeichnung vereinheitlicht: "Berater" und "Zugewiesen an" zusammengeführt zu "Mitarbeiter"',
  ]},
  { version: '2.10.0', date: '19.03.2026', changes: [
    'CSV-Import: Leads per CSV-Datei hochladen mit automatischer Spalten-Erkennung (DE/EN), Vorschau und Validierung',
    'CSV-Export nur für Superadmins – Zugriffskontrolle für sensible Datenexporte',
    'Microsoft 365 als Integrations-Platzhalter (Coming Soon) auf der Einstellungen-Seite',
    'API-Dokumentation v1.1 mit CSV Import/Export-Endpunkten',
  ]},
  { version: '2.9.0', date: '18.03.2026', changes: [
    'Datenbank bereinigt: Alle Test-/Mock-Leads entfernt für den Produktivbetrieb',
    'Integrationen (TikTok, Meta, LinkedIn, Webhooks) mit DB-Persistenz – Konfigurationen werden dauerhaft gespeichert',
    'Auth-Race-Condition behoben: getSession() vor onAuthStateChange, keine async-Blockaden mehr',
    'Integrations-Einstellungen jederzeit editierbar (Webhook-URLs, API-Keys)',
    'RLS für Integrationen: Nur Superadmins können Integrationen konfigurieren',
  ]},
  { version: '2.8.0', date: '18.03.2026', changes: [
    'Lazy Loading & Code-Splitting für alle Seiten (schnellere Ladezeiten)',
    'QueryClient-Optimierung mit Stale-Time & Retry-Konfiguration',
    'RLS-Sicherheitsrichtlinien verschärft: Nur authentifizierte Benutzer haben Zugriff',
    'App-Einstellungen nur noch durch Superadmins änderbar',
    'AppLayout zeigt dynamisch den angemeldeten Benutzer (Name & Initialen)',
    'Superadmin-Konto mit vollständiger Benutzerverwaltung (Erstellen, Rollen, Löschen)',
    'Authentifizierung mit E-Mail-Auto-Confirm für internes System',
  ]},
  { version: '2.7.0', date: '18.03.2026', changes: ['Lead-Lifecycle: Archivieren, Löschen und Wiederherstellen mit Bestätigungsdialogen', 'KI-Duplikaterkennung mit Vergleichs- und Zusammenführungsfunktion', 'Untermenüs Aktiv/Archiviert/Gelöscht/Doppelte Leads in der Lead-Tabelle', 'KI-generierte Richtlinien & Regeln im Prozess-Verzeichnis', 'Geltungsbereich für Automatisierungen (Global, Agentur, Mitarbeiter)'] },
  { version: '2.6.0', date: '18.03.2026', changes: ['Agentur-Detailansicht mit bearbeitbaren Einstellungen (Name, E-Mail, Region, Sprache, Kantone)', 'Regionale Agentur-Einstellungen (Region, Sprache, erlaubte Kantone)', 'Kontextmenü updateAgency für persistente Agentur-Änderungen'] },
  { version: '2.5.0', date: '18.03.2026', changes: ['Vollständiges Backend mit Lovable Cloud (Datenbank-Persistenz)', 'KI-gestützte Aufgabengenerierung pro Lead-Phase', 'Aufgaben-Management mit System- & KI-Tasks', 'Echtzeit-Datensynchronisation über alle Module'] },
  { version: '2.4.0', date: '18.03.2026', changes: ['API-Modul mit Schlüsselverwaltung & Dokumentation', 'Dokumentationsbereich als eigene Seite', 'Erweiterte Berechtigungsscopes für API-Keys'] },
  { version: '2.3.0', date: '10.03.2026', changes: ['Prozesse-Seite mit Stepper-Ansicht', 'Video-Call-Integration für Termine', 'DISC-Persönlichkeitstest für Leads'] },
  { version: '2.2.0', date: '25.02.2026', changes: ['Kalender-Ansicht mit Terminverwaltung', 'Benachrichtigungscenter mit Echtzeit-Alerts', 'Erweiterte Filteroptionen in der Lead-Tabelle'] },
  { version: '2.1.0', date: '12.02.2026', changes: ['Integrationen für Meta, TikTok & LinkedIn', 'Benutzerverwaltung mit Rollensystem', 'Webhook-Unterstützung für Lead-Quellen'] },
  { version: '2.0.0', date: '01.02.2026', changes: ['Komplettes UI-Redesign', 'Pipeline-Board mit Drag & Drop', 'Analytics-Dashboard mit Recharts'] },
  { version: '1.0.0', date: '15.01.2026', changes: ['Initiales Release', 'Lead-Verwaltung & Tabelle', 'Dashboard mit Statistiken'] },
];

const appFeatures = [
  { category: 'Lead-Management', icon: '👥', features: [
    { name: 'Lead-Tabelle', desc: 'Alle Leads in einer filterbaren, sortierbaren Tabelle mit Tabs für Aktiv, Archiviert, Gelöscht und Doppelte Leads.' },
    { name: 'Pipeline-Board', desc: 'Kanban-Board zur visuellen Verwaltung des Lead-Status mit Drag & Drop.' },
    { name: 'Lead-Detail-Ansicht', desc: 'Detaillierte Ansicht mit Kontaktdaten, Notizen, Status-Historie und Dokumenten.' },
    { name: 'Lead hinzufügen', desc: 'Neue Leads manuell erfassen mit PLZ-Validierung (Schweizer Format).' },
    { name: 'Archivieren & Löschen', desc: 'Leads archivieren oder löschen (Superadmin) mit Bestätigungsdialog und Wiederherstellung.' },
    { name: 'KI-Duplikaterkennung', desc: 'Automatische Erkennung doppelter Leads per KI mit Konfidenz-Score, Vergleich und Zusammenführung.' },
    { name: 'CSV-Import', desc: 'Leads per CSV-Datei importieren mit automatischer Spalten-Zuordnung (inkl. Lead-Datum, Quelle, Mitarbeiter, Agentur, Status, Kampagne), Vorschau und Validierung.' },
    { name: 'CSV-Export (Superadmin)', desc: 'Alle Leads als CSV exportieren – nur für Benutzer mit Superadmin-Rolle verfügbar.' },
    { name: 'Mehrfachauswahl & Bulk-Aktionen', desc: 'Superadmins können mehrere Leads auswählen und gesammelt Mitarbeiter/Agentur zuweisen, archivieren oder löschen.' },
  ]},
  { category: 'Kommunikation', icon: '📞', features: [
    { name: 'Video-Calls', desc: 'Integrierte Video-Anrufe direkt aus der Anwendung starten.' },
    { name: 'Benachrichtigungen', desc: 'Echtzeit In-App-Benachrichtigungen für Lead-Änderungen, Termine und Automatisierungen.' },
    { name: 'Termin-Erinnerungen', desc: 'Automatische Erinnerungen vor anstehenden Terminen.' },
  ]},
  { category: 'Terminplanung', icon: '📅', features: [
    { name: 'Kalender', desc: 'Interaktiver Kalender mit Tages-, Wochen- und Monatsansicht.' },
    { name: 'Terminverwaltung', desc: 'Termine erstellen, bearbeiten und Leads zuweisen.' },
    { name: 'Video-Integration', desc: 'Video-Call-Links automatisch zu Terminen hinzufügen.' },
  ]},
  { category: 'Organisation', icon: '🏢', features: [
    { name: 'Agenturen', desc: 'Partneragenturen verwalten mit Detail-Panel für Name, E-Mail, Region, Sprache und Kantone.' },
    { name: 'Agentur-Einstellungen', desc: 'Regionale Zuweisung, Sprache und erlaubte Kantone pro Agentur konfigurieren.' },
    { name: 'Mitarbeiter', desc: 'Mitarbeiterprofile und Zuweisungen verwalten.' },
    { name: 'Prozesse', desc: 'Mehrstufige Recruiting-Prozesse mit Stepper-Ansicht, KI-generierten Richtlinien und Geltungsbereichen für Automatisierungen (Global/Agentur/Mitarbeiter).' },
  ]},
  { category: 'Analyse & Insights', icon: '📊', features: [
    { name: 'Dashboard', desc: 'Übersicht mit KPIs, Lead-Statistiken und Performance-Metriken.' },
    { name: 'Analytics', desc: 'Detaillierte Auswertungen mit interaktiven Charts (Recharts).' },
    { name: 'DISC-Persönlichkeitstest', desc: 'Automatisierte Persönlichkeitsanalyse für Kandidaten.' },
  ]},
  { category: 'Aufgaben & KI', icon: '🤖', features: [
    { name: 'Phasen-Tasks', desc: 'Automatische Pflichtaufgaben basierend auf dem aktuellen Lead-Status.' },
    { name: 'KI-Tasks', desc: 'Kontextbezogene Zusatzaufgaben per KI-Generierung (Gemini).' },
    { name: 'KI-Richtlinien', desc: 'Automatische Generierung von Prozess-Richtlinien und Regeln per KI für jeden Prozessschritt.' },
    { name: 'Task-Management', desc: 'Aufgaben zuweisen, priorisieren und Status tracken (offen/in Bearbeitung/erledigt).' },
  ]},
  { category: 'Integrationen & API', icon: '🔌', features: [
    { name: 'Meta / TikTok / LinkedIn', desc: 'Lead-Import aus Social-Media-Werbekampagnen.' },
    { name: 'Webhooks', desc: 'Eingehende Webhooks für automatisierten Lead-Import.' },
    { name: 'REST API', desc: 'Vollständige API mit Authentifizierung für externe Systeme.' },
    { name: 'API-Schlüssel', desc: 'Granulare API-Keys mit konfigurierbaren Berechtigungen.' },
  ]},
  { category: 'Backend & Datenbank', icon: '🗄️', features: [
    { name: 'Lovable Cloud', desc: 'Vollständig persistente Datenbank für alle Module (Leads, Termine, Aufgaben, etc.).' },
    { name: 'Row Level Security', desc: 'Verschärfte Sicherheitsrichtlinien – nur authentifizierte Benutzer haben Datenbankzugriff.' },
    { name: 'Edge Functions', desc: 'Serverless Backend-Funktionen für KI-Aufgabengenerierung und Benutzerverwaltung.' },
    { name: 'Echtzeit-Sync', desc: 'Automatische Datensynchronisation zwischen Frontend und Datenbank.' },
    { name: 'Code-Splitting', desc: 'Lazy Loading aller Seiten für optimierte Ladezeiten und kleinere Bundle-Grössen.' },
  ]},
  { category: 'Administration', icon: '⚙️', features: [
    { name: 'Benutzerverwaltung', desc: 'Superadmins können Benutzer erstellen, Rollen zuweisen und Konten löschen.' },
    { name: 'Rollensystem', desc: 'Vier Rollen mit abgestuften Berechtigungen: Superadmin, Admin, Backoffice, Analyst.' },
    { name: 'Einstellungen', desc: 'Zentrale Konfiguration für Benachrichtigungen, Termine, Integrationen und API.' },
    { name: 'Profilverwaltung', desc: 'Benutzer können Name, E-Mail und Passwort in den Profileinstellungen ändern.' },
  ]},
];

const techStack = [
  { name: 'React 18', desc: 'UI-Framework', icon: '⚛️' },
  { name: 'TypeScript', desc: 'Typsicherheit', icon: '🔷' },
  { name: 'Vite', desc: 'Build-Tool', icon: '⚡' },
  { name: 'Tailwind CSS', desc: 'Styling', icon: '🎨' },
  { name: 'Lovable Cloud', desc: 'Backend & DB', icon: '☁️' },
  { name: 'Edge Functions', desc: 'Serverless', icon: '🚀' },
  { name: 'Recharts', desc: 'Diagramme', icon: '📈' },
  { name: 'React Router', desc: 'Navigation', icon: '🧭' },
  { name: 'Radix UI', desc: 'Komponenten', icon: '🧩' },
  { name: 'TanStack Query', desc: 'Daten-Management', icon: '🔄' },
];

const roles = [
  { role: 'Superadmin', color: 'bg-destructive/10 text-destructive', permissions: ['Vollzugriff auf alle Module', 'Benutzerverwaltung (erstellen, löschen)', 'Rollen zuweisen', 'Integrationen konfigurieren', 'CSV-Export', 'Leads dauerhaft löschen', 'App-Einstellungen ändern'] },
  { role: 'Admin', color: 'bg-primary/10 text-primary', permissions: ['Lead-Management (CRUD)', 'Mitarbeiter & Agenturen verwalten', 'Termine & Kalender', 'Analytics einsehen', 'Aufgaben verwalten'] },
  { role: 'Backoffice', color: 'bg-accent/50 text-accent-foreground', permissions: ['Leads einsehen & bearbeiten', 'Termine erstellen', 'Aufgaben bearbeiten', 'CSV-Import'] },
  { role: 'Analyst', color: 'bg-muted text-muted-foreground', permissions: ['Dashboard & Analytics (nur lesen)', 'Lead-Daten einsehen', 'Berichte exportieren'] },
];

function VersionHistoryTab() {
  return (
    <div className="space-y-3">
      {versionHistory.map((v, i) => (
        <div key={v.version} className={`rounded-lg border p-4 transition-colors ${i === 0 ? 'border-primary/30 bg-primary/5' : 'bg-card hover:bg-muted/30'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                v{v.version}
              </span>
              {i === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Aktuell</span>}
            </div>
            <span className="text-xs text-muted-foreground">{v.date}</span>
          </div>
          <ul className="space-y-1.5 mt-3">
            {v.changes.map((c, ci) => (
              <li key={ci} className="text-xs text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FeaturesTab() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const totalFeatures = appFeatures.reduce((sum, cat) => sum + cat.features.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <Layers className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium">{totalFeatures} Funktionen</p>
          <p className="text-xs text-muted-foreground">in {appFeatures.length} Kategorien</p>
        </div>
      </div>
      <div className="space-y-2">
        {appFeatures.map((cat) => (
          <div key={cat.category} className="rounded-lg border bg-card overflow-hidden">
            <button
              onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium">
                <span className="text-base">{cat.icon}</span>
                {cat.category}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{cat.features.length}</span>
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedCategory === cat.category ? 'rotate-180' : ''}`} />
            </button>
            {expandedCategory === cat.category && (
              <div className="border-t bg-muted/10">
                {cat.features.map((f, fi) => (
                  <div key={f.name} className={`px-4 py-3 flex items-start gap-3 ${fi > 0 ? 'border-t border-dashed border-muted' : ''}`}>
                    <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TechStackTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {techStack.map((t) => (
        <div key={t.name} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
          <span className="text-xl">{t.icon}</span>
          <div>
            <p className="text-sm font-medium">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RolesTab() {
  return (
    <div className="space-y-3">
      {roles.map((r) => (
        <div key={r.role} className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${r.color}`}>{r.role}</span>
          </div>
          <ul className="space-y-1.5">
            {r.permissions.map((p, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function Documentation() {
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Dokumentation
          </h1>
          <p className="text-muted-foreground">Übersicht, Funktionen und Versionshistorie von SSM Recruit</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold">v{APP_VERSION}</span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{versionHistory[0].date}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-primary">{APP_VERSION}</p>
          <p className="text-xs text-muted-foreground mt-1">Aktuelle Version</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-foreground">{appFeatures.reduce((s, c) => s + c.features.length, 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Funktionen</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-foreground">{techStack.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Technologien</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-foreground">{versionHistory.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Releases</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="changelog" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-6">
          <TabsTrigger value="changelog" className="flex items-center gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Changelog
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-1.5 text-xs">
            <LayoutGrid className="h-3.5 w-3.5" /> Funktionen
          </TabsTrigger>
          <TabsTrigger value="tech" className="flex items-center gap-1.5 text-xs">
            <Code2 className="h-3.5 w-3.5" /> Tech-Stack
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Rollen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="changelog">
          <VersionHistoryTab />
        </TabsContent>

        <TabsContent value="features">
          <FeaturesTab />
        </TabsContent>

        <TabsContent value="tech">
          <TechStackTab />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
