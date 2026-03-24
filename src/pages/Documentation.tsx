import { useState } from 'react';
import { Zap, RefreshCw, CheckCircle2, LayoutGrid, ChevronDown, Code2, Shield, BookOpen, Layers } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const APP_VERSION = '2.26.0';

const versionHistory = [
  { version: '2.25.0', date: '24.03.2026', changes: [
    'Mapbox Adress-Autovervollständigung: Beim Erfassen oder Bearbeiten von Leads werden Schweizer Adressen live vorgeschlagen (Geocoding API)',
    'Neue Edge Function geocode-address: Mapbox Geocoding v5 mit Einschränkung auf Schweiz (CH) und deutscher Sprache',
    'AddressAutocomplete-Komponente: Wiederverwendbar mit Debounce (300ms), Dropdown-Vorschläge und automatischer PLZ/Ort/Kanton-Befüllung bei Auswahl',
    'Integration in Lead-Erfassung und Lead-Bearbeitung: Strasse/Nr.-Feld nutzt jetzt Mapbox-Autovervollständigung',
    'Analytics Karte-Tab: Interaktive Mapbox-Karte mit Lead-Pins (status-kodiert) und Agentur-Kantonsgebieten',
    'NEU-Badge in der Leads-Tabelle: Neue Leads werden mit pulsierendem Badge markiert bis zur ersten Statusänderung',
    'Geschlechterverteilung im Marketing-Tab: Demografische Aufschlüsselung nach Anrede (Frauen/Männer)',
  ]},
  { version: '2.24.0', date: '24.03.2026', changes: [
    'PLZ-basierte automatische Agentur-/Mitarbeiterzuweisung: Beim CSV-Import und Webhook-Eingang (Meta, TikTok, Formular) wird anhand der PLZ der Kanton ermittelt und die zuständige regionale Agentur samt Mitarbeiter automatisch zugewiesen',
    'Neue DB-Funktion resolve_agency_by_canton: Priorisiert spezifische Agenturen vor dem Hauptsitz-Fallback',
    'Dokument-Upload-Link 48h Ablauf: Links laufen automatisch nach 48 Stunden ab, Status (aktiv/abgelaufen/benutzt) wird im Dokumente-Tab angezeigt, erneutes Senden möglich',
    'Geschlecht/Anrede im Lead-Detail: Anrede kann beim Bearbeiten über Dropdown ausgewählt werden (Herr, Frau, Divers, Keine Angabe)',
    '14 E-Mail-Benachrichtigungsvorlagen vorbereitet: Templates und Automationsregeln für alle wichtigen Events (Neuer Lead, Statuswechsel, Termin, Aufgabe, DISC, Insights, Dokumente, Duplikate etc.) – standardmässig inaktiv',
    '"Keine Angabe" Anzeige: Fehlende Felder beim Import oder unerkannte Daten werden klar als "Keine Angabe" (kursiv) dargestellt',
    'Grössere Schrift im Lead-Detail-Fenster: Alle Texte, Labels und Werte vergrössert für bessere Lesbarkeit',
    'Neue Automationsregeln: PLZ-Auto-Zuweisung und Dokument-Link-Ablauf (48h) als Prozess-Regeln im Automatisierungen-Dashboard',
    'Automationen-Dashboard: 2 neue Trigger-Typen (PLZ-Auto-Zuweisung, Dokument-Link abgelaufen) verfügbar',
  ]},
  { version: '2.23.0', date: '23.03.2026', changes: [
    'Status-Wizard-System: 7 definierte Wizards (Kontaktiert, Rückruf, Nicht interessiert, Nicht erreicht, Kein Bedarf, Nicht passend, Interne Stelle) mit Pflichtfeldern und automatischer Lead-Steuerung',
    'Lead-Entzug-Logik: Automatischer Entzug bei Nicht interessiert, Nicht erreicht, Kein Bedarf, Nicht passend, Interne Stelle – Neuzuweisung an Superadmin',
    'Rückruf-Eskalation: Max. 3 Rückrufe erlaubt, danach automatische Eskalation zu "Rejected" mit Lead-Entzug',
    'Original-Besitzer-Tracking: original_employee_id und callback_count in leads-Tabelle für Statistik-Zuordnung',
    'Wizard-Historie als Aktivitäten: Alle Wizard-Daten (Antworten, Feedback, Eskalation) werden als detaillierte Aktivitäten protokolliert – kein separater Wizard-Tab mehr nötig',
    'Lead-Detail-Fenster redesigned: Neues zweispaltiges Layout mit Aktionspanel links und 7 Tabs rechts (Info, Insights, Dokumente, Flow, Termine, Aktivität, Status)',
    'Insights-Tab: DISC-Ergebnisse, Insights-Antworten und Terminvorschläge in eigenem Tab',
    'Dokumente-Tab: Hochgeladene Dateien und ausstehende Anfragen in eigenem Tab',
    'Verbesserter Schliessen-Button: Solider Hintergrund mit Border und Shadow für bessere Sichtbarkeit',
    'Tab-Design mit CI-Farben: Aktiver Tab in Primary-Farbe mit farbigem Icon',
    'Pipeline-View: Nur aktive Stages (Neu, Kontaktiert, Terminiert) – abgelehnte/entzogene Leads automatisch ausgeblendet',
    'Datenbank: Neue Tabelle status_wizard_results, Spalten original_employee_id und callback_count in leads',
  ]},
  { version: '2.22.0', date: '23.03.2026', changes: [
    'Wizard-Management: Modulares System in Einstellungen → Wizards zur Erstellung und Verwaltung von Lead-Funnels (Step-Builder mit Video, Auswahl, Entscheidung)',
    'Wizard-Typen: recruiting, sales, custom – nur ein aktiver Wizard vom Typ "recruiting" erlaubt',
    'Wizard-Editor: 4 Tabs (Allgemein, Schritte, Logik-Platzhalter, Vorschau) mit Echtzeit-Simulation',
    'Standard-Wizards: SSM Recruit Assessment und Dokumenten-Upload als vordefinierte Wizards integriert',
    'Eskalationsprozesse: Flexible Eskalationslogik pro Hauptprozess (Neuer Lead, Kontaktiert, Terminiert, Follow-up, Eingestellt)',
    'Quellen-basierte Eskalation: Eskalationsprozesse können gezielt für einzelne, mehrere oder alle Lead-Quellen aktiviert werden',
    'Eskalations-Editor: 5 Tabs (Allgemein, Quellen, Regeln, Wizards, Vorschau) mit Simulation pro Lead-Quelle',
    'Wizard-Verknüpfung in Eskalation: Wizards können Eskalationsprozessen zugewiesen werden mit Reihenfolge, Start-Step und Verzögerung',
    'Test-Modus (🧪): Regeln und Wizard-Verknüpfungen können einzeln als "Nur für Test-User" markiert werden',
    'Pipeline-Flow erweitert: Jeder Flow-Node zeigt jetzt zugewiesene Regeln UND Wizards an, konfigurierbar über Settings-Dialog mit Tabs',
    'Sortierung: Regeln und Wizard-Verknüpfungen können per Pfeil-Buttons in der Reihenfolge umsortiert werden – Eskalation wird in definierter Priorität ausgeführt',
    'Pipeline-Flow Sortierung: Regeln und Wizards sind auch im Flow-Node-Konfigurationsdialog per Drag sortierbar',
    'Datenbank: Neue Tabellen escalation_processes, escalation_rules, escalation_wizard_links mit test_only und sort_order Spalten',
  ]},
  { version: '2.20.0', date: '23.03.2026', changes: [
    'Bewerbungsformular: Öffentliches mehrstufiges Formular unter /apply mit Datei-Uploads, Validierung und Consent-Tracking',
    'Application-Webhook: Neuer Endpunkt /functions/v1/application-webhook für Bewerbungen mit multipart/form-data Support',
    'Automatisches custom_fields Fallback: Unbekannte Formularfelder werden verlustfrei als JSON gespeichert',
    'Bewerbungs-Datenbank: Neue applications-Tabelle mit Kandidatenfeldern, Dokumenten-Pfaden, Consents und Status-Logik',
    'Storage-Bucket application-documents für sichere Dokumenten-Speicherung (CV, Motivationsschreiben, Beilagen)',
    'Form-Webhook erweitert: fullName als zusätzlicher Alias für Namensfeld akzeptiert',
    'API-Dokumentation aktualisiert mit allen Webhook-Endpunkten (form-webhook, application-webhook, meta, tiktok)',
    'Status-Logik: complete (alle Pflichtfelder + CV), incomplete (fehlende Daten), spam_suspected (Captcha ungültig)',
  ]},
  { version: '2.19.0', date: '23.03.2026', changes: [
    'Analytics komplett überarbeitet: 4 Tabs – Übersicht (KPIs), Marketing, Geschäftsleitung und Flow-Analyse',
    'Marketing-Tab: Quellen-Performance, Kampagnen-Analyse, Kanal-Konversionsraten und Marketing-Funnel',
    'Geschäftsleitung-Tab: Agentur-Performance mit Problemanalyse (stagnierende Leads, Verzögerungen, Neuzuweisungen)',
    'Flow-Analyse-Tab: Verweildauer pro Phase, Bottleneck-Erkennung und Status-Übergangs-Häufigkeiten',
    'Übersicht-Tab: KPI-Karten, Funnel-Visualisierung und Leads nach Zeitraum (Monat/Quartal/Jahr)',
    'CSV-Export mit Excel-kompatiblem BOM-Encoding und Semikolon-Trennung',
    'PDF-Export für formatierte Berichte mit Charts und KPIs',
    'Agentur-Detailanalyse: Klick auf Agentur zeigt Problemhäufigkeiten (stagnierende Leads, Reaktionszeiten)',
  ]},
  { version: '2.18.0', date: '23.03.2026', changes: [
    'Meta Leads Import: Historische Leads aus Meta/Facebook CSV-Dateien importieren mit automatischer Duplikaterkennung',
    'Automatische Agentur- und Mitarbeiter-Zuweisung beim CSV-Import (Hauptsitz als Standard)',
    'Kampagnen-Feld wird aus CSV-Formularname automatisch befüllt',
    'E-Mail-basierte Duplikatprüfung beim Import – bestehende Leads werden übersprungen',
  ]},
  { version: '2.17.0', date: '19.03.2026', changes: [
    'Dashboard komplett überarbeitet: Begrüssung mit Benutzername, Uhrzeit und Live-Wetter',
    'Dashboard KPI-Karten: Leads gesamt, neue Leads, eingestellt, Konversionsrate, offene Tasks, anstehende Termine',
    'Dashboard Schnellzugriff: «+ Neu» Dropdown-Button für Lead, Task, Termin und Agentur',
    'Leads nach Kanal: Balkendiagramm mit dynamischen Quellfarben aus der Datenbank',
    'Anstehende Termine und neueste Leads direkt auf dem Dashboard',
    'Duplikaterkennung komplett clientseitig (regelbasiert, ohne KI) – spart Kosten und verhindert Timeout-Fehler',
    'Lead-Erfassung mit intelligenter PLZ-/Ort-/Kanton-Autovervollständigung aus DB und Schweizer PLZ-Daten',
    'Mehrere Leads nacheinander erfassen ohne Dialog zu schliessen',
    'Benachrichtigungen erweitert: Tasks, Prozess-Schritte, Insights, Dokument-Upload, Duplikate',
    'Aufgabensystem komplett regelbasiert (System-Tasks pro Lead-Status statt KI-Generierung)',
  ]},
  { version: '2.16.0', date: '19.03.2026', changes: [
    'Aktivitäten zeigen jetzt den Namen des eingeloggten Benutzers statt "Sarah Chen"',
    'Erstkontakt: Neue Optionen «Kein Bedarf» und «Nicht Passend» als Ablehnungsgründe',
    'Persönlichkeitsfragen (Insights & DISC) in den Einstellungen verwalten, hinzufügen und bearbeiten',
    'DISC-/Insights-Ergebnisse werden automatisch im Lead-Detailfenster angezeigt nach Abschluss',
    'Kandidaten-Formular Teil 3: Follow-Up Terminvorschläge durch den Kandidaten',
    'Insights-Link sofort sichtbar nach Erstellung mit Kopier-Funktion',
    'Terminvorschläge annehmen/ablehnen direkt im Lead-Detailfenster',
  ]},
  { version: '2.15.0', date: '19.03.2026', changes: [
    'Lead-Quellen-Verwaltung: Quellen in Einstellungen hinzufügen, bearbeiten und löschen (Superadmin)',
    'Dynamische Lead-Quellen aus der Datenbank statt fest codierter Konfiguration',
    'Bulk-Aktion «Quelle ändern»: Mehrere Leads gleichzeitig einer neuen Quelle zuweisen',
    'Icon-Auswahl pro Quelle mit 6 vordefinierten Icons (Globe, Music, Facebook, LinkedIn, CSV, Tag)',
  ]},
  { version: '2.14.0', date: '19.03.2026', changes: [
    'Pagination in der Lead-Tabelle mit konfigurierbarer Seitengrösse (10, 20, 30, 50, 100, Alle)',
    'Seitennavigation mit Vor-/Zurück-Buttons und dynamischen Seitenzahlen',
    'Eintragsanzeige (z.B. «1–20 von 100») für bessere Übersicht',
    'Automatischer Reset auf Seite 1 bei Filter-, Such- oder Tab-Wechsel',
  ]},
  { version: '2.12.0', date: '19.03.2026', changes: [
    'Agenturfarben: Jeder Agentur kann eine individuelle Farbe zugewiesen werden für bessere visuelle Erkennung',
    'Farbige Agentur-Kennzeichnung in Leads-Tabelle, Pipeline, Dashboard und Agentur-Übersicht',
    'Farbauswahl-Palette im Agentur-Detailfenster mit 12 vordefinierten Farben',
    'Lead-Formular-Validierung: Ungültige Felder (Name, E-Mail, Telefon) werden rot markiert mit Fehlermeldungen',
    'Verbesserte Fehler-Toasts beim Speichern von Leads mit detaillierter Fehlerbeschreibung',
  ]},
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
  { version: '2.7.0', date: '18.03.2026', changes: ['Lead-Lifecycle: Archivieren, Löschen und Wiederherstellen mit Bestätigungsdialogen', 'Systembasierte Duplikaterkennung mit Konfidenz-Score, Vergleich und Zusammenführung', 'Untermenüs Aktiv/Archiviert/Gelöscht/Doppelte Leads in der Lead-Tabelle', 'KI-generierte Richtlinien & Regeln im Prozess-Verzeichnis', 'Geltungsbereich für Automatisierungen (Global, Agentur, Mitarbeiter)'] },
  { version: '2.6.0', date: '18.03.2026', changes: ['Agentur-Detailansicht mit bearbeitbaren Einstellungen (Name, E-Mail, Region, Sprache, Kantone)', 'Regionale Agentur-Einstellungen (Region, Sprache, erlaubte Kantone)', 'Kontextmenü updateAgency für persistente Agentur-Änderungen'] },
  { version: '2.5.0', date: '18.03.2026', changes: ['Vollständiges Backend mit Lovable Cloud (Datenbank-Persistenz)', 'Regelbasierte Aufgabengenerierung pro Lead-Phase', 'Aufgaben-Management mit System-Tasks', 'Echtzeit-Datensynchronisation über alle Module'] },
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
    { name: 'Lead hinzufügen', desc: 'Neue Leads manuell erfassen mit PLZ-Autovervollständigung (Schweizer PLZ-Daten + DB-Lerneffekt), Mapbox-Adress-Autovervollständigung, automatischer Ort-/Kanton-Befüllung und Mehrfacherfassung ohne Dialog-Schliessung.' },
    { name: 'Archivieren & Löschen', desc: 'Leads archivieren oder löschen (Superadmin) mit Bestätigungsdialog und Wiederherstellung.' },
    { name: 'Systembasierte Duplikaterkennung', desc: 'Automatische Erkennung doppelter Leads per Regelwerk (E-Mail, Telefon, Name, PLZ) mit Konfidenz-Score, Vergleich und Zusammenführung – ohne KI.' },
    { name: 'CSV-Import', desc: 'Leads per CSV-Datei importieren mit automatischer Spalten-Zuordnung, PLZ-basierter Agentur-/Mitarbeiterzuweisung, Vorschau und Validierung. Fehlende Felder werden als "Keine Angabe" angezeigt.' },
    { name: 'Meta CSV-Import', desc: 'Historische Meta/Facebook-Leads per CSV importieren mit automatischer Duplikaterkennung, PLZ-basierter Agentur-Zuweisung und Kampagnen-Befüllung.' },
    { name: 'CSV-Export (Superadmin)', desc: 'Alle Leads als CSV exportieren – nur für Benutzer mit Superadmin-Rolle verfügbar.' },
    { name: 'Mehrfachauswahl & Bulk-Aktionen', desc: 'Superadmins können mehrere Leads auswählen und gesammelt Mitarbeiter/Agentur zuweisen, archivieren oder löschen.' },
  ]},
  { category: 'Kommunikation', icon: '📞', features: [
    { name: 'Video-Calls', desc: 'Integrierte Video-Anrufe direkt aus der Anwendung starten.' },
    { name: 'Benachrichtigungen', desc: 'Echtzeit In-App-Benachrichtigungen für Leads, Termine, Tasks, Prozess-Schritte, DISC, Insights, Dokument-Uploads, Duplikate und Automatisierungen – individuell konfigurierbar.' },
    { name: 'Termin-Erinnerungen', desc: 'Automatische Erinnerungen vor anstehenden Terminen.' },
    { name: 'E-Mail-Benachrichtigungen', desc: '14 vorbereitete E-Mail-Templates für alle wichtigen Events (Neuer Lead, Statuswechsel, Termine, Aufgaben, DISC, Insights, Dokumente, Duplikate). Standardmässig inaktiv, individuell aktivierbar.' },
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
    { name: 'Eskalationsprozesse', desc: 'Flexible Eskalationslogik pro Hauptprozess mit quellen-basierter Aktivierung, Regel-Engine, Wizard-Verknüpfung und Test-Modus.' },
    { name: 'Pipeline-Flow', desc: 'Visuelle Pipeline mit Eskalations-Erkennung, Wizard- und Regelzuweisung pro Flow-Node und Test-Modus-Indikator.' },
    { name: 'PLZ-Auto-Zuweisung', desc: 'Automatische Agentur- und Mitarbeiterzuweisung basierend auf PLZ/Kanton bei Import und Webhook-Eingang.' },
    { name: 'Dokument-Link Ablauf', desc: 'Upload-Links laufen nach 48h automatisch ab. Status (aktiv/abgelaufen/benutzt) wird im Dokumente-Tab angezeigt.' },
  ]},
  { category: 'Analyse & Insights', icon: '📊', features: [
    { name: 'Dashboard', desc: 'Übersicht mit Begrüssung, Uhrzeit, Wetter, 6 KPI-Karten, Leads nach Kanal, Pipeline-Verteilung, anstehende Termine und Schnellzugriff (+ Neu Dropdown).' },
    { name: 'Analytics – Übersicht', desc: 'KPI-Karten (Leads, Konversion, Kantone), Funnel-Visualisierung und Leads nach Zeitraum (Monat/Quartal/Jahr) mit Balkendiagramm.' },
    { name: 'Analytics – Marketing', desc: 'Quellen-Performance, Kampagnen-Analyse, Kanal-Konversionsraten und Marketing-Funnel mit interaktiven Charts.' },
    { name: 'Analytics – Geschäftsleitung', desc: 'Agentur-Performance mit Problemanalyse (stagnierende Leads, Verzögerungen), Kanton-Verteilung und Mitarbeiter-Effizienz.' },
    { name: 'Analytics – Flow-Analyse', desc: 'Verweildauer pro Phase, Bottleneck-Erkennung, Status-Übergangs-Häufigkeiten und durchschnittliche Bearbeitungszeiten.' },
    { name: 'Analytics – Export', desc: 'CSV-Export (Excel-kompatibel mit BOM) und PDF-Export für formatierte Berichte.' },
    { name: 'Analytics – Karte', desc: 'Interaktive Mapbox-Karte mit Lead-Verteilung (status-kodierte Pins) und Agentur-Kantonsgebieten (farbige Polygone) in der Schweiz.' },
    { name: 'Wizard-Management', desc: 'Modulares System zur Erstellung von Lead-Funnels mit Step-Builder (Video, Auswahl, Entscheidung), Echtzeit-Vorschau und logischer Verknüpfung.' },
    { name: 'DISC-Persönlichkeitstest', desc: 'Automatisierte Persönlichkeitsanalyse für Kandidaten mit automatischer Ergebnisanzeige.' },
    { name: 'Insights-Fragebogen', desc: 'Anpassbare Fragen (Teil 1: Insights, Teil 2: DISC, Teil 3: Terminvorschläge) – konfigurierbar in den Einstellungen.' },
  ]},
  { category: 'Aufgaben & KI', icon: '🤖', features: [
    { name: 'Phasen-Tasks', desc: 'Automatische Pflichtaufgaben basierend auf dem aktuellen Lead-Status (regelbasiert, ohne KI).' },
    { name: 'Task-Benachrichtigungen', desc: 'Benachrichtigungen bei neuen und überfälligen Aufgaben.' },
    { name: 'KI-Richtlinien', desc: 'Automatische Generierung von Prozess-Richtlinien und Regeln per KI für jeden Prozessschritt.' },
    { name: 'Task-Management', desc: 'Aufgaben zuweisen, priorisieren und Status tracken (offen/in Bearbeitung/erledigt).' },
  ]},
  { category: 'Integrationen & API', icon: '🔌', features: [
    { name: 'Meta / TikTok / LinkedIn', desc: 'Lead-Import aus Social-Media-Werbekampagnen über dedizierte Webhooks.' },
    { name: 'Form-Webhook', desc: 'Generischer Webhook für Website-Kontaktformulare und Zapier – unterstützt flexible Feldnamen (name, fullName, vorname etc.).' },
    { name: 'Application-Webhook', desc: 'Bewerbungsformular-Webhook mit multipart/form-data, Datei-Uploads, Consent-Tracking und automatischem custom_fields Fallback.' },
    { name: 'Bewerbungsformular', desc: 'Öffentliches mehrstufiges Formular unter /apply mit Persönlichen Daten, Dokumenten-Upload und Bestätigung.' },
    { name: 'Webhooks', desc: 'Eingehende Webhooks für automatisierten Lead-Import (form-webhook, application-webhook, meta-webhook, tiktok-webhook).' },
    { name: 'REST API', desc: 'Vollständige API mit Authentifizierung für externe Systeme.' },
    { name: 'API-Schlüssel', desc: 'Granulare API-Keys mit konfigurierbaren Berechtigungen.' },
    { name: 'Mapbox-Integration', desc: 'Dienst-Integration unter Einstellungen → Integrationen mit Live-Statusprüfung. Drei Funktionen: Karten-Visualisierung (Analytics Karte-Tab), Adress-Autovervollständigung (Lead-Erfassung/-Bearbeitung) und Geocoding für automatische Agentur-Zuweisung.' },
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
    { name: 'Rollensystem', desc: 'Fünf Rollen mit abgestuften Berechtigungen: Superadmin, Admin, Teamleiter, Backoffice, Analyst.' },
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
  { name: 'Mapbox GL JS', desc: 'Karten & Geocoding', icon: '🗺️' },
];

const roles = [
  { role: 'Superadmin', color: 'bg-destructive/10 text-destructive', permissions: ['Vollzugriff auf alle Module', 'Benutzerverwaltung (erstellen, löschen)', 'Rollen zuweisen', 'Integrationen konfigurieren', 'CSV-Export', 'Leads dauerhaft löschen', 'Mehrfachauswahl & Bulk-Zuweisung', 'App-Einstellungen ändern'] },
  { role: 'Admin', color: 'bg-primary/10 text-primary', permissions: ['Lead-Management (CRUD)', 'Mitarbeiter & Agenturen verwalten', 'Termine & Kalender', 'Analytics einsehen', 'Aufgaben verwalten'] },
  { role: 'Teamleiter', color: 'bg-emerald-600/10 text-emerald-600', permissions: ['Eigene Leads einsehen & bearbeiten', 'Pipeline-Ansicht', 'Aufgaben verwalten', 'Kalender & Termine', 'Statistik einsehen', 'Eigenes Profil bearbeiten'] },
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
