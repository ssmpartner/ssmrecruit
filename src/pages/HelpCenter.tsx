import { useState, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronRight, BookOpen, Users, Kanban, Table, Building2,
  UserCog, BarChart3, CalendarDays, CheckSquare, Settings, Workflow, Mail,
  Shield, FileText, Upload, Phone, MapPin, HelpCircle, Lightbulb, ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Article {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

interface Category {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  articles: Article[];
}

const helpCategories: Category[] = [
  {
    id: 'getting-started',
    title: 'Erste Schritte',
    icon: Lightbulb,
    description: 'Grundlagen und Einstieg in SSM Recruit',
    articles: [
      {
        id: 'gs-1',
        title: 'Was ist SSM Recruit?',
        content: 'SSM Recruit ist ein Recruiting-Management-System, das den gesamten Bewerbungsprozess von der Lead-Generierung bis zur Einstellung abdeckt. Sie können Leads verwalten, Termine koordinieren, Agenturen steuern und den gesamten Workflow überwachen.',
        tags: ['übersicht', 'einführung'],
      },
      {
        id: 'gs-2',
        title: 'Navigation im System',
        content: 'Das System verwendet eine Seitenleiste (Sidebar) zur Navigation. Die wichtigsten Bereiche sind: Dashboard (Übersicht), Pipeline (visueller Workflow), Leads (Tabelle aller Kandidaten), Aufgaben (To-Dos), Kalender (Termine) und Statistik (Auswertungen). Die Seitenleiste kann über den Pfeil-Button eingeklappt werden, um mehr Platz für den Inhalt zu schaffen.',
        tags: ['navigation', 'sidebar', 'menü'],
      },
      {
        id: 'gs-3',
        title: 'Anmeldung & Abmeldung',
        content: 'Melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an. Aktivieren Sie «Angemeldet bleiben», damit Sie nicht nach Inaktivität automatisch abgemeldet werden. Zum Abmelden klicken Sie auf das Logout-Symbol unten in der Seitenleiste. Bei vergessenem Passwort nutzen Sie den «Passwort vergessen»-Link auf der Login-Seite.',
        tags: ['login', 'logout', 'passwort', 'anmeldung'],
      },
    ],
  },
  {
    id: 'leads',
    title: 'Leads verwalten',
    icon: Table,
    description: 'Leads erstellen, bearbeiten, filtern und den Status ändern',
    articles: [
      {
        id: 'l-1',
        title: 'Lead-Übersicht & Filter',
        content: 'Die Leads-Tabelle zeigt alle Kandidaten mit Status, Quelle, Agentur und Mitarbeiter. Nutzen Sie die Tabs oben, um nach Status zu filtern (Alle, Aktiv, Archiviert). Die Suchleiste durchsucht Name, E-Mail und Telefonnummer. Klicken Sie auf einen Lead, um die Detailansicht zu öffnen.',
        tags: ['tabelle', 'filter', 'suche', 'übersicht'],
      },
      {
        id: 'l-2',
        title: 'Neuen Lead anlegen',
        content: 'Klicken Sie auf «+ Neuer Lead» in der Leads-Übersicht. Füllen Sie mindestens Name und E-Mail aus. Die Agentur und der Mitarbeiter werden automatisch anhand der PLZ und des Kantons zugewiesen. Sie können die Zuweisung manuell überschreiben.',
        tags: ['erstellen', 'neu', 'anlegen'],
      },
      {
        id: 'l-3',
        title: 'Lead-Status ändern (Status-Wizard)',
        content: 'Öffnen Sie einen Lead und klicken Sie auf den gewünschten Status im Prozess-Stepper. Der Status-Wizard führt Sie durch die notwendigen Angaben. Bei Ablehnungsgründen (Nicht erreicht, Nicht interessiert, etc.) wird der Lead automatisch archiviert. Superadmins können über «Status ohne Angaben festlegen» den Wizard überspringen.',
        tags: ['status', 'wizard', 'workflow', 'ändern'],
      },
      {
        id: 'l-4',
        title: 'CSV-Import von Leads',
        content: 'Unter «Importieren» in der Leads-Übersicht können Sie CSV-Dateien hochladen. Das System erkennt automatisch Komma-, Semikolon- und Tab-getrennte Dateien sowie Plattform-CSVs von Meta und TikTok. Die Spalten werden automatisch zugeordnet; bei Bedarf können Sie die Zuordnung manuell anpassen. Duplikate werden anhand der E-Mail-Adresse erkannt.',
        tags: ['import', 'csv', 'hochladen', 'meta', 'tiktok'],
      },
      {
        id: 'l-5',
        title: 'NEU-Badge bei Leads',
        content: 'Neue Leads erhalten ein pulsierendes grünes «NEU»-Badge. Dieses verschwindet automatisch, sobald der Lead zum ersten Mal geöffnet wird. Der Gelesen-Status (is_read) wird persistent in der Datenbank gespeichert und ist auf allen Geräten synchron. Superadmins können den Badge manuell ein- oder ausblenden über «Nicht mehr als Neu kennzeichnen» bzw. «Als neu kennzeichnen».',
        tags: ['neu', 'badge', 'markierung', 'gelesen'],
      },
      {
        id: 'l-6',
        title: 'Doppelte Leads erkennen',
        content: 'Das System prüft automatisch auf Duplikate anhand von E-Mail (90 % Konfidenz), Telefonnummer (40–75 %) und Name (60 %). Wird beim Import (Webhook, CSV, manuell) ein Duplikat erkannt, wird der neue Lead automatisch dem Hauptsitz zugewiesen statt normal verteilt. Die Notiz enthält einen ⚠️-Hinweis mit dem Namen und der ID des bestehenden Leads. Im Lead-Detail erscheint ein gelber Warn-Banner mit Konfidenz-Score und Grund. Von dort können Sie den bestehenden Lead ansehen oder beide Leads zusammenführen.',
        tags: ['duplikate', 'zusammenführen', 'merge', 'hauptsitz', 'konfidenz'],
      },
    ],
  },
  {
    id: 'pipeline',
    title: 'Pipeline & Workflow',
    icon: Kanban,
    description: 'Den Recruiting-Prozess visuell steuern',
    articles: [
      {
        id: 'p-1',
        title: 'Pipeline-Ansicht verstehen',
        content: 'Die Pipeline zeigt Leads als Karten in Spalten, die den Hauptschritten des Recruiting-Prozesses entsprechen: Neuer Lead → Kontaktiert → Terminiert → Follow-Up → Eingestellt. Nach dem Follow-Up durchlaufen Leads optional den Eskalationsprozess: Ready for Controlling → Management Review → HR Processing → Eingestellt. Jede Karte zeigt den Lead-Namen, die Quelle und den aktuellen Detailstatus.',
        tags: ['pipeline', 'kanban', 'spalten', 'workflow', 'eskalation'],
      },
      {
        id: 'p-3',
        title: 'Eskalations- und Approval-Prozess',
        content: 'Nach abgeschlossenem Follow-Up wird ein Lead automatisch in den Freigabeprozess überführt: 1) Ready for Controlling – Controlling prüft Insights, Matching und Dokumente. 2) Management Review – Geschäftsleitung sieht Zusammenfassung und gibt frei. 3) HR Processing – HR führt Onboarding durch und setzt den finalen Status «Eingestellt». Jede Phase hat einen eigenen Wizard mit Checklisten und Aktionen (Approve, Reject, Rückfrage). Ablehnungen werden an die vorherige Phase zurückgewiesen.',
        tags: ['eskalation', 'approval', 'controlling', 'management', 'hr', 'freigabe'],
      },
      {
        id: 'p-2',
        title: 'Rückruf-Logik & automatischer Lead-Entzug',
        content: 'Nach 3 fehlgeschlagenen Kontaktversuchen (Status «Nicht erreicht») wird der Lead automatisch dem zugewiesenen Mitarbeiter entzogen und dem Superadmin zur erneuten Bearbeitung zugewiesen. Der ursprüngliche Mitarbeiter bleibt in der Statistik als Erstbearbeiter erfasst.',
        tags: ['rückruf', 'entzug', 'kontakt', 'versuche'],
      },
      {
        id: 'p-4',
        title: 'Approval-Ansicht für Review-Rollen',
        content: 'Controlling, Geschäftsleitung und HR sehen keine vollständige Lead-Bearbeitungsmaske, sondern eine vereinfachte Approval-Ansicht. Diese zeigt nur die für den jeweiligen Prüfschritt relevanten Informationen: Lead-Kurzinfo (Name, Kontakt, Standort), Prüfergebnisse (Matching-Score, Insights-Status, DISC-Typ, Dokumentenanzahl), vorherige Freigaben und einen prominenten Button zum Starten des Approval-Wizards. Die Navigation erfolgt nur innerhalb der eigenen Queue (z. B. alle Leads mit «Ready for Controlling»).',
        tags: ['approval', 'ansicht', 'controlling', 'geschäftsleitung', 'hr', 'wizard', 'prüfung'],
      },
    ],
  },
  {
    id: 'agencies',
    title: 'Agenturen',
    icon: Building2,
    description: 'Agenturen, Standorte, Kantone und Kontingente verwalten',
    articles: [
      {
        id: 'a-1',
        title: 'Agentur-Einstellungen bearbeiten',
        content: 'Klicken Sie in der Agenturen-Übersicht auf eine Agenturkarte. Im Detail-Panel können Sie Name, E-Mail, Farbe, Region, Sprache und erlaubte Kantone bearbeiten. Änderungen werden erst durch «Änderungen speichern» übernommen.',
        tags: ['agentur', 'bearbeiten', 'einstellungen'],
      },
      {
        id: 'a-2',
        title: 'Standort & Umkreis konfigurieren',
        content: 'Unter «Standort & Umkreis» können Sie die Adresse (Strasse, PLZ, Ort) der Agentur hinterlegen. Beim Speichern werden die GPS-Koordinaten automatisch via Geocoding ermittelt. Der Einsatzradius (5–100 km) bestimmt, welche Leads im Umkreis zugewiesen werden. Nutzen Sie den Button «Koordinaten ermitteln» zur manuellen Ermittlung.',
        tags: ['standort', 'adresse', 'koordinaten', 'geocoding', 'umkreis', 'radius'],
      },
      {
        id: 'a-3',
        title: 'Erlaubte Kantone für Lead-Zuweisung',
        content: 'Im Bereich «Erlaubte Kantone» können Sie festlegen, aus welchen Schweizer Kantonen eine Agentur Leads empfangen darf. Die Zuweisung erfolgt priorisiert nach Kanton; bei mehreren Treffern dient die geografische Nähe als Entscheidungskriterium.',
        tags: ['kantone', 'zuweisung', 'verteilung'],
      },
      {
        id: 'a-4',
        title: 'Monatliches Lead-Kontingent',
        content: 'Jede Agentur kann ein monatliches Lieferkontingent für automatisch zugewiesene Leads erhalten. Standard ist «Unlimitiert». Setzen Sie ein Limit (z. B. 50 Leads/Monat), wird die Agentur nach Erreichen des Kontingents von der automatischen Zuweisung ausgeschlossen. Die aktuelle Auslastung wird als Fortschrittsanzeige in der Agenturkarte dargestellt.',
        tags: ['kontingent', 'quota', 'limit', 'monatlich'],
      },
      {
        id: 'a-5',
        title: 'Faire Mitarbeiter-Verteilung',
        content: 'Wenn einer Agentur mehrere Mitarbeiter zugeordnet sind, werden eingehende Leads automatisch fair verteilt. Das System weist den Lead dem Mitarbeiter mit den wenigsten Leads im aktuellen Monat zu (Round-Robin-Prinzip). So ist gewährleistet, dass jeder Mitarbeiter ein gleichmässiges Kontingent erhält.',
        tags: ['verteilung', 'mitarbeiter', 'round-robin', 'fair'],
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Kalender & Termine',
    icon: CalendarDays,
    description: 'Termine planen und Videokonferenzen erstellen',
    articles: [
      {
        id: 'c-1',
        title: 'Termin erstellen',
        content: 'In der Lead-Detailansicht oder im Kalender können Sie Termine erstellen. Wählen Sie Datum, Uhrzeit, Dauer und Typ (Video, Telefon, Vor-Ort). Bei Video-Terminen wird automatisch ein Meeting-Link generiert. Der Termin erscheint sowohl im Kalender als auch in der Lead-Timeline.',
        tags: ['termin', 'erstellen', 'videocall', 'meeting'],
      },
      {
        id: 'c-2',
        title: 'Terminvorschläge an Kandidaten',
        content: 'Über die Insights-Funktion können Kandidaten Terminvorschläge erhalten und darauf antworten. Die Antworten (Akzeptiert, Vorschlag, Abgelehnt) sind in der Lead-Detailansicht einsehbar.',
        tags: ['terminvorschlag', 'kandidat', 'insights'],
      },
    ],
  },
  {
    id: 'tasks',
    title: 'Aufgaben',
    icon: CheckSquare,
    description: 'Aufgaben erstellen, zuweisen und verfolgen',
    articles: [
      {
        id: 't-1',
        title: 'Aufgaben-Übersicht',
        content: 'Die Aufgabenseite zeigt alle offenen, in Bearbeitung befindlichen und erledigten Aufgaben. Aufgaben können manuell erstellt oder automatisch durch das System generiert werden (z. B. bei Statusänderungen). Filtern Sie nach Priorität, Status oder zugewiesenem Mitarbeiter.',
        tags: ['aufgaben', 'tasks', 'übersicht'],
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Statistik & Auswertungen',
    icon: BarChart3,
    description: 'Daten auswerten und Berichte erstellen',
    articles: [
      {
        id: 'an-1',
        title: 'Dashboard-Übersicht',
        content: 'Das Dashboard zeigt die wichtigsten KPIs auf einen Blick: Gesamtzahl der Leads, Status-Verteilung, Conversion-Rate und aktuelle Trends. Die Stat-Karten oben geben eine schnelle Übersicht; darunter finden Sie detaillierte Charts.',
        tags: ['dashboard', 'kpi', 'übersicht', 'statistik'],
      },
      {
        id: 'an-2',
        title: 'Erweiterte Analysen',
        content: 'Die Statistik-Seite bietet Tabs für verschiedene Analysebereiche: Übersicht, Flow-Analyse, Marketing, Management und Karten-Ansicht. Exportieren Sie Daten als CSV oder nutzen Sie die interaktiven Charts für tiefere Einblicke.',
        tags: ['analyse', 'charts', 'export', 'marketing'],
      },
    ],
  },
  {
    id: 'documents',
    title: 'Dokumente & Bewerbungen',
    icon: Upload,
    description: 'Dokumente anfordern und Bewerbungen verwalten',
    articles: [
      {
        id: 'd-1',
        title: 'Dokumente von Kandidaten anfordern',
        content: 'In der Lead-Detailansicht unter «Dokumente» können Sie eine Dokumentenanforderung per E-Mail oder Link versenden. Der Kandidat erhält einen sicheren Upload-Link (48h gültig). Hochgeladene Dateien erscheinen automatisch im Lead-Profil. Erinnerungen können bei Bedarf erneut versendet werden.',
        tags: ['dokumente', 'upload', 'anforderung', 'link'],
      },
      {
        id: 'd-2',
        title: 'Bewerbungsformular',
        content: 'Das öffentliche Bewerbungsformular (/apply) erlaubt es Kandidaten, sich direkt zu bewerben. Eingereichte Bewerbungen werden automatisch als Lead erfasst und der zuständigen Agentur zugewiesen. Anhänge (CV, Motivationsschreiben) werden sicher gespeichert.',
        tags: ['bewerbung', 'formular', 'bewerben'],
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Benachrichtigungen',
    icon: Mail,
    description: 'Benachrichtigungen und E-Mail-Einstellungen',
    articles: [
      {
        id: 'n-1',
        title: 'Benachrichtigungs-Center',
        content: 'Das Glocken-Symbol in der oberen Leiste zeigt ungelesene Benachrichtigungen an. Klicken Sie darauf, um alle Benachrichtigungen einzusehen. Benachrichtigungen werden bei wichtigen Ereignissen ausgelöst: neue Leads, Statusänderungen, fällige Aufgaben, etc.',
        tags: ['benachrichtigung', 'glocke', 'notification'],
      },
      {
        id: 'n-2',
        title: 'E-Mail-Benachrichtigungen',
        content: 'Automatische E-Mails werden ausschliesslich an das interne Team (Recruiter) gesendet – nicht an Kandidaten. Die E-Mail-Regeln können in den Prozess-Einstellungen konfiguriert werden. Superadmins können über die Benachrichtigungs-Rollen-Matrix steuern, welche Rolle welche Benachrichtigungstypen erhält.',
        tags: ['email', 'automatisch', 'intern'],
      },
    ],
  },
  {
    id: 'roles',
    title: 'Rollen & Berechtigungen',
    icon: Shield,
    description: 'Benutzerrollen und Zugriffsrechte verstehen',
    articles: [
      {
        id: 'r-1',
        title: 'Rollenübersicht',
        content: 'Das System kennt 8 Rollen: Superadmin (volle Rechte), Admin (Verwaltung ohne Systemkonfiguration), Backoffice (Datenverwaltung), Teamleiter (eingeschränkt auf eigene Leads), Analyst (nur Leserechte), Controlling (Prüfrolle für Freigabe-Phase), Geschäftsleitung (Management-Freigabe) und HR (Onboarding & Einstellung). Die Rolle bestimmt, welche Menüpunkte, Leads und Funktionen sichtbar sind.',
        tags: ['rollen', 'rechte', 'superadmin', 'admin', 'teamleiter', 'controlling', 'hr'],
      },
      {
        id: 'r-2',
        title: 'Teamleiter-Einschränkungen',
        content: 'Teamleiter sehen nur Dashboard, Pipeline, Leads, Aufgaben, Kalender und Statistik. Administrative Bereiche (Agenturen, Mitarbeiter, Prozesse, API-Docs) sind ausgeblendet. In der Lead-Tabelle sehen Teamleiter nur ihre eigenen Leads.',
        tags: ['teamleiter', 'einschränkung', 'zugriff'],
      },
      {
        id: 'r-3',
        title: 'Review-Rollen: Controlling, Geschäftsleitung & HR',
        content: 'Controlling, Geschäftsleitung und HR sind reine Prüf- und Freigaberollen. Sie sehen nur Leads im eigenen Zuständigkeitsbereich: Controlling → «Ready for Controlling», Geschäftsleitung → «Management Review», HR → «HR Processing». Diese Rollen können keine Leads erstellen, bearbeiten, archivieren oder löschen. Sie dürfen nur ihren jeweiligen Approval-Wizard ausführen (Approve, Reject, Rückfrage). In der Lead-Tabelle werden Tab-Labels rollenspezifisch angezeigt (z. B. «Zu prüfen» für Controlling). In der Lead-Detailansicht sind Bearbeiten-Button, Zuweisungsbereich und operative Tabs (Flow, Termine) ausgeblendet.',
        tags: ['controlling', 'geschäftsleitung', 'hr', 'review', 'approval', 'einschränkung'],
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrationen & Quellen',
    icon: Workflow,
    description: 'Meta, TikTok und weitere Lead-Quellen anbinden',
    articles: [
      {
        id: 'i-1',
        title: 'Lead-Quellen',
        content: 'Leads können aus verschiedenen Quellen eingehen: Website-Formular, Meta Lead Ads, TikTok Lead Ads, CSV-Import oder manuelle Erfassung. Jeder Lead wird mit seiner Quelle gekennzeichnet (farbiges Badge). Die Quelle beeinflusst auch die automatische Agentur-Zuweisung.',
        tags: ['quellen', 'meta', 'tiktok', 'website', 'integration'],
      },
      {
        id: 'i-2',
        title: 'Webhooks einrichten',
        content: 'Für Meta und TikTok Lead Ads stehen Webhook-Endpunkte zur Verfügung, die eingehende Leads automatisch erfassen. Alle Webhooks (Meta, TikTok, Website-Formular, Bewerbung) prüfen eingehende Leads automatisch auf Duplikate anhand von E-Mail, Telefon und Name. Wird ein Duplikat erkannt, wird der Lead dem Hauptsitz zugewiesen statt normal verteilt, damit Admins den Fall prüfen können.',
        tags: ['webhook', 'meta', 'tiktok', 'automatisch', 'duplikat'],
      },
    ],
  },
];

export default function HelpCenter() {
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('getting-started');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return helpCategories;
    const q = search.toLowerCase();
    return helpCategories
      .map(cat => ({
        ...cat,
        articles: cat.articles.filter(
          a =>
            a.title.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q) ||
            a.tags.some(t => t.includes(q))
        ),
      }))
      .filter(cat => cat.articles.length > 0);
  }, [search]);

  const totalArticles = helpCategories.reduce((sum, c) => sum + c.articles.length, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="mx-auto max-w-5xl px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground mb-4 shadow-sm">
            <HelpCircle className="h-4 w-4 text-primary" />
            Hilfe-Center
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Wie können wir Ihnen helfen?
          </h1>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Durchsuchen Sie {totalArticles} Hilfe-Artikel zu allen Funktionen von SSM Recruit
          </p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen... z.B. «Lead erstellen», «Kontingent», «Termin»"
              className="pl-10 h-11 rounded-xl shadow-sm border-border/60"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          {/* Categories sidebar */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
              Kategorien
            </p>
            {filteredCategories.map(cat => {
              const Icon = cat.icon;
              const isExpanded = expandedCategory === cat.id;
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => {
                      setExpandedCategory(isExpanded ? null : cat.id);
                      setSelectedArticle(null);
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isExpanded
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{cat.title}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {cat.articles.length}
                    </Badge>
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-primary/20 pl-3">
                      {cat.articles.map(article => (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-all ${
                            selectedArticle?.id === article.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                          }`}
                        >
                          {article.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Content area */}
          <div className="min-h-[400px]">
            {selectedArticle ? (
              <div className="rounded-2xl border bg-card p-8 shadow-sm">
                <div className="flex items-start gap-3 mb-6">
                  <div className="rounded-xl bg-primary/10 p-2.5">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{selectedArticle.title}</h2>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedArticle.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                  {selectedArticle.content.split('\n').map((p, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-7">{p}</p>
                  ))}
                </div>
              </div>
            ) : expandedCategory ? (
              <div className="space-y-3">
                {filteredCategories
                  .find(c => c.id === expandedCategory)
                  ?.articles.map(article => (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="w-full group rounded-2xl border bg-card p-5 text-left shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                        {article.content}
                      </p>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredCategories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setExpandedCategory(cat.id);
                        setSelectedArticle(null);
                      }}
                      className="group rounded-2xl border bg-card p-6 text-left shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
                    >
                      <div className="rounded-xl bg-primary/10 p-2.5 w-fit mb-3 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1">{cat.title}</h3>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                      <p className="text-[10px] text-primary font-medium mt-2">
                        {cat.articles.length} Artikel →
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
