import { useState } from 'react';
import { FileText, Zap, RefreshCw, CheckCircle2, LayoutGrid, ChevronDown, Code2 } from 'lucide-react';

const APP_VERSION = '2.5.0';

const versionHistory = [
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
    { name: 'Lead-Tabelle', desc: 'Alle Leads in einer filterbaren, sortierbaren Tabelle anzeigen und verwalten.' },
    { name: 'Pipeline-Board', desc: 'Kanban-Board zur visuellen Verwaltung des Lead-Status mit Drag & Drop.' },
    { name: 'Lead-Detail-Ansicht', desc: 'Detaillierte Ansicht mit Kontaktdaten, Notizen, Status-Historie und Dokumenten.' },
    { name: 'Lead hinzufügen', desc: 'Neue Leads manuell erfassen mit PLZ-Validierung (Schweizer Format).' },
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
    { name: 'Agenturen', desc: 'Partneragenturen verwalten und deren Leads nachverfolgen.' },
    { name: 'Mitarbeiter', desc: 'Mitarbeiterprofile und Zuweisungen verwalten.' },
    { name: 'Prozesse', desc: 'Mehrstufige Recruiting-Prozesse mit Stepper-Ansicht definieren und verfolgen.' },
  ]},
  { category: 'Analyse & Insights', icon: '📊', features: [
    { name: 'Dashboard', desc: 'Übersicht mit KPIs, Lead-Statistiken und Performance-Metriken.' },
    { name: 'Analytics', desc: 'Detaillierte Auswertungen mit interaktiven Charts (Recharts).' },
    { name: 'DISC-Persönlichkeitstest', desc: 'Automatisierte Persönlichkeitsanalyse für Kandidaten.' },
  ]},
  { category: 'Integrationen & API', icon: '🔌', features: [
    { name: 'Meta / TikTok / LinkedIn', desc: 'Lead-Import aus Social-Media-Werbekampagnen.' },
    { name: 'Webhooks', desc: 'Eingehende Webhooks für automatisierten Lead-Import.' },
    { name: 'REST API', desc: 'Vollständige API mit Authentifizierung für externe Systeme.' },
    { name: 'API-Schlüssel', desc: 'Granulare API-Keys mit konfigurierbaren Berechtigungen.' },
  ]},
  { category: 'Administration', icon: '⚙️', features: [
    { name: 'Benutzerverwaltung', desc: 'Benutzer mit Rollen (Superadmin, Admin, Backoffice, Analyst) verwalten.' },
    { name: 'Einstellungen', desc: 'Zentrale Konfiguration für Benachrichtigungen, Termine, Integrationen und API.' },
  ]},
];

export default function Documentation() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dokumentation</h1>
        <p className="text-muted-foreground">Versionierung, Updates und Funktionsübersicht von RecruitFlow</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Current Version */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Aktuelle Version</p>
              <p className="text-3xl font-bold tracking-tight mt-1">v{APP_VERSION}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Letzte Aktualisierung: {versionHistory[0].date}</p>
        </div>

        {/* Version History */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><RefreshCw className="h-4 w-4 text-muted-foreground" /> Versionshistorie</h3>
          <div className="space-y-3">
            {versionHistory.map((v, i) => (
              <div key={v.version} className={`rounded-lg border p-4 ${i === 0 ? 'border-primary/30 bg-primary/5' : 'bg-muted/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>v{v.version}</span>
                  <span className="text-xs text-muted-foreground">{v.date}</span>
                </div>
                <ul className="space-y-1">
                  {v.changes.map((c, ci) => (
                    <li key={ci} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Features Overview */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-muted-foreground" /> Funktionsübersicht</h3>
          <div className="space-y-2">
            {appFeatures.map((cat) => (
              <div key={cat.category} className="rounded-lg border overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span>{cat.icon}</span> {cat.category}
                    <span className="text-xs text-muted-foreground">({cat.features.length})</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedCategory === cat.category ? 'rotate-180' : ''}`} />
                </button>
                {expandedCategory === cat.category && (
                  <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
                    {cat.features.map((f) => (
                      <div key={f.name}>
                        <p className="text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Code2 className="h-4 w-4 text-muted-foreground" /> Technologie-Stack</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'React 18', desc: 'UI-Framework' },
              { name: 'TypeScript', desc: 'Typsicherheit' },
              { name: 'Vite', desc: 'Build-Tool' },
              { name: 'Tailwind CSS', desc: 'Styling' },
              { name: 'Recharts', desc: 'Diagramme' },
              { name: 'React Router', desc: 'Navigation' },
              { name: 'Radix UI', desc: 'Komponenten' },
              { name: 'TanStack Query', desc: 'Daten-Management' },
            ].map((t) => (
              <div key={t.name} className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
