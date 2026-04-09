import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Settings, Server, Layers, Users, Code2, Database, Shield, History,
  Bot, Search, ChevronRight, BookOpen, Phone, Zap, Eye, AlertTriangle,
  ArrowRight, CheckCircle2, XCircle, Clock, Webhook, DollarSign, Lock,
  FileText, Activity, Megaphone, FlaskConical, GitBranch, FileSearch
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// ── Section Definition ────────────────────────────────────────────

interface DocSection {
  id: string;
  label: string;
  icon: React.ElementType;
  adminOnly: boolean;
  subsections: { id: string; label: string }[];
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'setup',
    label: 'Einrichtung',
    icon: Settings,
    adminOnly: false,
    subsections: [
      { id: 'goal', label: 'Ziel des Moduls' },
      { id: 'architecture', label: 'Technische Grundarchitektur' },
      { id: 'target-architecture', label: 'Zielarchitektur (Produktivbetrieb)' },
      { id: 'components', label: 'Komponentenübersicht' },
      { id: 'datamodel-overview', label: 'Datenmodell-Überblick' },
      { id: 'provider-abstraction', label: 'Provider-Abstraktion' },
      { id: 'api-layers', label: 'API-Schichten' },
      { id: 'mock-mode', label: 'Mock-Betrieb' },
      { id: 'production-mode', label: 'Produktivbetrieb' },
    ],
  },
  {
    id: 'operations',
    label: 'Betriebsmodell',
    icon: Layers,
    adminOnly: false,
    subsections: [
      { id: 'agent-usage', label: 'Einsatz von AI-Agenten' },
      { id: 'directions', label: 'Outbound vs. Inbound' },
      { id: 'rollout-modes', label: 'Rollout-Modi' },
      { id: 'human-handover', label: 'Human Handover' },
      { id: 'escalation-logic', label: 'Eskalationslogik' },
      { id: 'session-lifecycle', label: 'Session-Lebenszyklus' },
      { id: 'cost-control', label: 'Kostenkontrolle' },
      { id: 'monitoring', label: 'Monitoring' },
    ],
  },
  {
    id: 'roles',
    label: 'Rollen & Rechte',
    icon: Users,
    adminOnly: false,
    subsections: [
      { id: 'superadmin', label: 'Superadmin' },
      { id: 'admin', label: 'Admin' },
      { id: 'teamleiter', label: 'Agenturleiter / Teamleiter' },
      { id: 'employee', label: 'Mitarbeiter' },
      { id: 'qa-compliance', label: 'QA / Compliance' },
      { id: 'visibility', label: 'Sichtbarkeiten' },
      { id: 'approvals', label: 'Freigaben' },
      { id: 'responsibility', label: 'Verantwortlichkeiten' },
    ],
  },
  {
    id: 'api',
    label: 'API-Dokumentation',
    icon: Code2,
    adminOnly: true,
    subsections: [
      { id: 'action-gateway', label: 'Action Gateway (Pflichtschicht)' },
      { id: 'endpoints', label: 'Interne Endpunkte' },
      { id: 'dto-examples', label: 'DTO- / Payload-Beispiele' },
      { id: 'event-flows', label: 'Event-Flows' },
      { id: 'webhook-structure', label: 'Webhook-Struktur' },
      { id: 'status-codes', label: 'Statuscodes' },
      { id: 'error-handling', label: 'Fehlerfälle' },
      { id: 'mock-vs-prod', label: 'Mock vs. Produktivmodus' },
    ],
  },
  {
    id: 'datamodel',
    label: 'Datenmodell',
    icon: Database,
    adminOnly: true,
    subsections: [
      { id: 'tables-overview', label: 'Tabellenübersicht' },
      { id: 'relations', label: 'Relationen' },
      { id: 'status-fields', label: 'Statusfelder' },
      { id: 'object-purposes', label: 'Logik & Zweck' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance & Governance',
    icon: Shield,
    adminOnly: true,
    subsections: [
      { id: 'knowledge-approval', label: 'Wissensfreigabe' },
      { id: 'audit-logs', label: 'Audit Logs' },
      { id: 'flagged-sessions', label: 'Problematische Sessions' },
      { id: 'disclosures', label: 'Pflichtoffenlegung' },
      { id: 'forbidden', label: 'Verbotene Aussagen' },
      { id: 'kill-switch', label: 'Kill Switch' },
      { id: 'review-process', label: 'Review-Prozess' },
    ],
  },
  {
    id: 'changelog',
    label: 'Änderungsverlauf',
    icon: History,
    adminOnly: false,
    subsections: [
      { id: 'versions', label: 'Versionen' },
      { id: 'publications', label: 'Veröffentlichungen' },
      { id: 'structural', label: 'Strukturelle Anpassungen' },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════
// CONTENT
// ══════════════════════════════════════════════════════════════════

function SectionContent({ sectionId }: { sectionId: string }) {
  switch (sectionId) {
    case 'setup': return <SetupContent />;
    case 'operations': return <OperationsContent />;
    case 'roles': return <RolesContent />;
    case 'api': return <ApiContent />;
    case 'datamodel': return <DatamodelContent />;
    case 'compliance': return <ComplianceContent />;
    case 'changelog': return <ChangelogContent />;
    default: return <p className="text-muted-foreground">Inhalt wird vorbereitet…</p>;
  }
}

// ── Einrichtung ───────────────────────────────────────────────────

function SetupContent() {
  return (
    <div className="space-y-8">
      <DocBlock id="goal" title="Ziel des Moduls" icon={Bot}>
        <p>Das Modul <strong>AI Voice Agent</strong> ermöglicht es SSM Recruit, KI-gestützte Telefongespräche mit Leads und Kandidaten zu führen. Ziel ist es, den Recruiting-Prozess durch automatisierte Erstqualifizierung, Terminvereinbarung und Follow-up-Anrufe zu beschleunigen.</p>
        <p>Das System ist vollständig provider-agnostisch konzipiert: Aktuell wird ein Mock-Provider für Entwicklung und Test verwendet. Später können Twilio (Telefonie), OpenAI Realtime (Voice-KI) und weitere Anbieter nahtlos angeschlossen werden.</p>
      </DocBlock>

      <DocBlock id="architecture" title="Technische Grundarchitektur" icon={Server}>
        <p>Die Architektur basiert auf vier Schichten:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <ArchLayer title="UI-Schicht" desc="React-Komponenten im SSM-Recruit-Design mit Tabs, Drawers, Filtern und KPI-Karten." color="primary" />
          <ArchLayer title="Service-Schicht" desc="13 spezialisierte API-Module (AgentsAPI, SessionsAPI, etc.) mit standardisierter Pagination, Filterung und Fehlerbehandlung." color="primary" />
          <ArchLayer title="Provider-Schicht" desc="Adapter-Interfaces für Telephony, Voice-AI, Transcription, Storage und Webhooks. Mock-Implementierungen ermöglichen sofortiges Testen." color="primary" />
          <ArchLayer title="Daten-Schicht" desc="14 spezialisierte Datenbanktabellen mit RLS-Policies, Audit-Logging und rollenbasiertem Zugriff." color="primary" />
        </div>
      </DocBlock>

      <DocBlock id="target-architecture" title="Zielarchitektur (Produktivbetrieb)" icon={Server}>
        <p>Für den späteren Echtbetrieb ist eine 5-Schichten-Architektur vorgesehen:</p>
        <div className="space-y-3 mt-3">
          {[
            { title: '1. SSM Recruit Frontend', desc: 'React-basierte Verwaltung. Keine direkte Kommunikation mit Twilio oder OpenAI. Kommuniziert ausschliesslich mit dem Core Backend.' },
            { title: '2. SSM Recruit Core Backend (Lovable Cloud)', desc: 'Edge Functions + PostgreSQL. Verantwortlich für Datenhaltung, RLS, Action Gateway, Audit Logging, Budget-Kontrolle. Empfängt Webhook-Events vom Railway Voice Backend.' },
            { title: '3. Railway Voice Backend (externer Orchestrator)', desc: 'Node.js/TypeScript-Service auf Railway. Zuständig für Echtzeit-Session-Steuerung, Twilio Media Stream Handling, OpenAI WebSocket-Bridge, Turn-by-Turn-Verarbeitung und Webhook-Dispatch an SSM Recruit.' },
            { title: '4. OpenAI Realtime API', desc: 'Voice AI Provider. Empfängt Audio-Streams vom Railway Backend via WebSocket, liefert KI-generierte Antworten in Echtzeit zurück.' },
            { title: '5. Twilio Telephony', desc: 'Telefonie-Provider für SIP, Nummernverwaltung und Media Streams. Webhooks zeigen auf das Railway Voice Backend, nicht direkt auf SSM Recruit.' },
          ].map(layer => (
            <div key={layer.title} className="p-3 rounded-lg border">
              <p className="font-medium text-sm text-foreground">{layer.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{layer.desc}</p>
            </div>
          ))}
        </div>
        <InfoBox type="info">
          Die vollständige Architektur-Konfiguration und der Kommunikationsfluss sind unter <strong>Infrastruktur → Architektur</strong> einsehbar und konfigurierbar.
        </InfoBox>
      </DocBlock>

      <DocBlock id="components" title="Komponentenübersicht" icon={Layers}>
        <div className="space-y-2">
          {[
            { name: 'Übersicht', desc: 'Dashboard, Live Monitoring, Warnungen & Status' },
            { name: 'Betrieb', desc: 'Agenten, Deployments, Kampagnen, Sessions, Eskalationen' },
            { name: 'Wissen & Regeln', desc: 'Knowledge Base, Action Rules, Gesprächsrichtlinien, Compliance Rules' },
            { name: 'Infrastruktur', desc: 'Voice Numbers, Provider, API & Webhooks, Cost Control, Kill Switch' },
            { name: 'Qualität & Analyse', desc: 'Analytics, Audit Log, Session Reviews, Test Center' },
            { name: 'Dokumentation', desc: 'Einrichtung, Betriebsmodell, Rollen, API, Datenmodell, Compliance, Änderungsverlauf' },
          ].map(c => (
            <div key={c.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </DocBlock>

      <DocBlock id="datamodel-overview" title="Datenmodell-Überblick" icon={Database}>
        <p>Das Datenmodell umfasst 14 Kerntabellen, die den gesamten Lebenszyklus eines AI-Voice-Agents abbilden:</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {['ai_agents', 'ai_agent_versions', 'ai_agent_deployments', 'ai_voice_sessions', 'ai_voice_turns', 'ai_voice_campaigns', 'ai_voice_numbers', 'ai_provider_configs', 'ai_voice_escalations', 'ai_voice_knowledge_items', 'ai_voice_cost_logs', 'ai_voice_test_runs', 'ai_voice_action_logs', 'ai_compliance_rules'].map(t => (
            <Badge key={t} variant="outline" className="text-xs font-mono">{t}</Badge>
          ))}
        </div>
        <p className="mt-3">Alle Tabellen sind mit Row-Level-Security (RLS) geschützt. Admins und Superadmins haben vollen Zugriff, authentifizierte Benutzer haben Lesezugriff.</p>
      </DocBlock>

      <DocBlock id="provider-abstraction" title="Provider-Abstraktion" icon={Zap}>
        <p>Das System nutzt ein Interface-basiertes Adapter-Modell, um verschiedene externe Anbieter zu abstrahieren:</p>
        <div className="space-y-2 mt-3">
          {[
            { iface: 'TelephonyAdapterInterface', desc: 'Initiiert und beendet Anrufe, prüft Call-Status', mock: 'MockTelephonyAdapter' },
            { iface: 'VoiceAIAdapterInterface', desc: 'Startet Voice-Streams, verarbeitet Audio-Chunks', mock: 'MockVoiceAIAdapter' },
            { iface: 'TranscriptionAdapterInterface', desc: 'Transkribiert Audio mit Speaker-Diarization', mock: 'MockTranscriptionAdapter' },
            { iface: 'StorageAdapterInterface', desc: 'Speichert und signiert Aufnahmen', mock: 'MockStorageAdapter' },
            { iface: 'WebhookAdapterInterface', desc: 'Dispatcht Events, validiert Signaturen', mock: 'MockWebhookAdapter' },
          ].map(p => (
            <div key={p.iface} className="p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <code className="text-xs font-bold text-primary">{p.iface}</code>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <code className="text-xs text-muted-foreground">{p.mock}</code>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
            </div>
          ))}
        </div>
        <CodeBlock code={`import { getProviderRegistry, setProviderAdapter } from '@/lib/ai-voice';

// Aktueller Provider (Mock)
const registry = getProviderRegistry();
const health = await registry.telephony.healthCheck();

// Später: echten Provider einsetzen
setProviderAdapter('telephony', new TwilioAdapter(config));`} />
      </DocBlock>

      <DocBlock id="api-layers" title="API-Schichten" icon={Code2}>
        <p>Drei API-Ebenen sorgen für saubere Trennung:</p>
        <ol className="list-decimal list-inside space-y-2 mt-2">
          <li><strong>Frontend API-Client</strong> (<code>src/lib/ai-voice/api-client.ts</code>) — 13 typisierte Module mit Pagination, Filterung, Audit-Logging</li>
          <li><strong>Edge Function</strong> (<code>supabase/functions/ai-voice-api</code>) — REST-Endpunkte mit Auth, Routing und standardisierten Responses</li>
          <li><strong>Provider-Adapter</strong> (<code>src/lib/ai-voice/adapters.ts</code>) — Interface-basierte Abstraktion mit Registry-Pattern</li>
        </ol>
      </DocBlock>

      <DocBlock id="mock-mode" title="Mock-Betrieb" icon={FlaskConical}>
        <p>Im Mock-Betrieb werden alle externen API-Calls durch lokale Simulationen ersetzt:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>8 realistische Gesprächsszenarien (Interested, Not Interested, Callback, Wrong Number, etc.)</li>
          <li>Simulierte Call-Status-Übergänge (Ringing → Connected → Completed)</li>
          <li>Automatische Turn-Generierung mit Intent-Erkennung</li>
          <li>Kostenberechnung auf Basis simulierter Tarife</li>
          <li>Action Gateway mit vollem Logging (Shadow Mode)</li>
        </ul>
        <InfoBox type="info">Der Mock-Betrieb ist standardmässig aktiv. Es sind keine API-Keys oder externe Konfigurationen erforderlich.</InfoBox>
      </DocBlock>

      <DocBlock id="production-mode" title="Späterer Produktivbetrieb" icon={Activity}>
        <p>Für den Produktivbetrieb sind folgende Schritte vorgesehen:</p>
        <ol className="list-decimal list-inside space-y-2 mt-2">
          <li>Telephony-Provider konfigurieren (z.B. Twilio) unter <strong>Infrastruktur → Provider</strong></li>
          <li>Voice-AI-Provider verbinden (z.B. OpenAI Realtime)</li>
          <li>Echte Telefonnummern einrichten unter <strong>Infrastruktur → Voice Numbers</strong></li>
          <li>Adapter in der Provider-Registry austauschen</li>
          <li>Shadow-Deployment erstellen für sichere Validierung</li>
          <li>Schrittweiser Rollout: Shadow → Recommendation → Assisted → Autonomous</li>
        </ol>
        <InfoBox type="warning">Vor dem Livebetrieb müssen Compliance-Regeln, Budgetgrenzen und Kill-Switch-Konfiguration geprüft werden.</InfoBox>
      </DocBlock>
    </div>
  );
}

// ── Betriebsmodell ────────────────────────────────────────────────

function OperationsContent() {
  return (
    <div className="space-y-8">
      <DocBlock id="agent-usage" title="Einsatz von AI-Agenten" icon={Bot}>
        <p>AI-Agenten werden in SSM Recruit eingesetzt, um wiederkehrende Telefongespräche mit Leads und Kandidaten zu automatisieren. Typische Einsatzszenarien:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {[
            { title: 'Erstqualifizierung', desc: 'Automatische Kontaktaufnahme mit neuen Leads zur Überprüfung des Interesses und der Eignung.' },
            { title: 'Terminvereinbarung', desc: 'Koordination von Erstgesprächen zwischen Kandidaten und Beratern.' },
            { title: 'Follow-up', desc: 'Nachfassanrufe bei Leads, die nicht erreicht wurden oder noch Zeit benötigen.' },
            { title: 'Reaktivierung', desc: 'Kontakt mit passiven Kandidaten, die seit längerem nicht aktiv waren.' },
          ].map(s => (
            <div key={s.title} className="p-3 rounded-lg border">
              <p className="font-medium text-sm text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </DocBlock>

      <DocBlock id="directions" title="Outbound vs. Inbound" icon={Phone}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Outbound</h4>
            <p className="text-xs text-muted-foreground mt-2">Der AI-Agent ruft proaktiv Leads/Kandidaten an. Gesteuert über Kampagnen mit Zeitfenstern, Retry-Regeln und Tages-Limits.</p>
          </div>
          <div className="p-4 rounded-lg border border-accent/20 bg-accent/5">
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-accent-foreground" /> Inbound</h4>
            <p className="text-xs text-muted-foreground mt-2">Eingehende Anrufe werden an den AI-Agent geroutet. Der Agent begrüsst den Anrufer und qualifiziert das Anliegen.</p>
          </div>
        </div>
      </DocBlock>

      <DocBlock id="rollout-modes" title="Rollout-Modi" icon={GitBranch}>
        <div className="space-y-3 mt-2">
          {[
            { mode: 'Shadow', badge: 'secondary' as const, desc: 'Der Agent beobachtet und protokolliert, führt aber keine Aktionen aus. Ideal für die Erstvalidierung.', icon: Eye },
            { mode: 'Recommendation', badge: 'secondary' as const, desc: 'Der Agent schlägt Aktionen vor (z.B. «Status auf Terminiert setzen»), die manuell bestätigt werden müssen.', icon: FileText },
            { mode: 'Assisted', badge: 'default' as const, desc: 'Einfache, risikoarme Aktionen (Notizen, Follow-ups) werden automatisch ausgeführt. Kritische Aktionen erfordern Bestätigung.', icon: CheckCircle2 },
            { mode: 'Autonomous', badge: 'destructive' as const, desc: 'Vollautomatische Ausführung aller erlaubten Aktionen. Nur für gut getestete Agenten mit stabiler Erfolgsquote.', icon: Zap },
          ].map(m => (
            <div key={m.mode} className="flex items-start gap-3 p-3 rounded-lg border">
              <m.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{m.mode}</span>
                  <Badge variant={m.badge} className="text-[10px]">{m.mode}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </DocBlock>

      <DocBlock id="human-handover" title="Human Handover" icon={Users}>
        <p>Wenn der Kandidat einen menschlichen Gesprächspartner wünscht oder der Agent eine Situation nicht auflösen kann, wird automatisch eskaliert:</p>
        <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
          <li>Agent erkennt Intent «human_requested» oder Compliance-Verstoss</li>
          <li>Eskalation wird erstellt mit Priorität, Session-Link und Zusammenfassung</li>
          <li>Zuständiger Mitarbeiter wird benachrichtigt (In-App + optional E-Mail)</li>
          <li>Aufgabe wird im Task-Center erstellt</li>
          <li>Session wird als «escalated» markiert</li>
        </ol>
      </DocBlock>

      <DocBlock id="escalation-logic" title="Eskalationslogik" icon={AlertTriangle}>
        <p>Eskalationen werden automatisch ausgelöst bei:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Explizitem Wunsch des Kandidaten nach einem Menschen</li>
          <li>Negativem Sentiment über mehrere Turns</li>
          <li>Compliance-Verstössen (verbotene Aussagen, fehlende Offenlegung)</li>
          <li>Technischen Fehlern (Provider-Timeout, Transkriptionsfehler)</li>
          <li>Überschreitung der maximalen Gesprächsdauer</li>
        </ul>
        <p className="mt-2">Jede Eskalation hat einen <strong>Status</strong> (open → in_progress → resolved), eine <strong>Priorität</strong> (low/medium/high/critical) und einen zugewiesenen Mitarbeiter.</p>
      </DocBlock>

      <DocBlock id="session-lifecycle" title="Session-Lebenszyklus" icon={Activity}>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {['initiated', 'ringing', 'connected', 'in_progress', 'completed / failed'].map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">{s}</Badge>
              {i < 4 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </span>
          ))}
        </div>
        <p className="mt-3">Nach Beendigung wird automatisch: Transkript erstellt, Zusammenfassung generiert, Kosten berechnet, Aktionen vorgeschlagen/ausgeführt und Audit-Log geschrieben.</p>
      </DocBlock>

      <DocBlock id="cost-control" title="Kostenkontrolle" icon={DollarSign}>
        <p>Mehrstufiges Budget-System:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li><strong>Pro Agent:</strong> Tages- und Monatsbudget</li>
          <li><strong>Pro Agentur:</strong> Agentur-weites Budget</li>
          <li><strong>Pro Kampagne:</strong> Kampagnen-spezifisches Budget</li>
          <li><strong>Global:</strong> Systemweite Budgetgrenze</li>
        </ul>
        <p className="mt-2">Bei 80% Auslastung: Warnung. Bei 100%: automatischer Stopp (Auto-Pause). Kosten setzen sich zusammen aus Telephony + AI-Inference + Transcription.</p>
      </DocBlock>

      <DocBlock id="monitoring" title="Monitoring" icon={Eye}>
        <p>Das Dashboard zeigt in Echtzeit:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Aktive Sessions und deren Status</li>
          <li>Live-Kennzahlen (Calls heute, Erfolgsquote, Kosten)</li>
          <li>Aktive Warnungen und kritische Zustände</li>
          <li>Provider-Health-Status</li>
          <li>Kill-Switch-Status (global und pro Agent)</li>
        </ul>
      </DocBlock>
    </div>
  );
}

// ── Rollen & Rechte ───────────────────────────────────────────────

function RolesContent() {
  return (
    <div className="space-y-8">
      <DocBlock id="superadmin" title="Superadmin" icon={Lock}>
        <p>Vollzugriff auf alle Bereiche des AI Voice Agent Moduls:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Agenten erstellen, bearbeiten, löschen, veröffentlichen</li>
          <li>Provider konfigurieren und Credentials verwalten</li>
          <li>Deployments global steuern (alle Umgebungen)</li>
          <li>Compliance-Regeln definieren und Kill Switch auslösen</li>
          <li>Budgetgrenzen festlegen und überschreiben</li>
          <li>Audit Logs einsehen und Session Reviews durchführen</li>
          <li>API-Konfiguration und Webhook-Verwaltung</li>
        </ul>
      </DocBlock>

      <DocBlock id="admin" title="Admin" icon={Users}>
        <p>Erweiterte Verwaltungsrechte innerhalb des zugewiesenen Bereichs:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Agenten bearbeiten und Versionen verwalten</li>
          <li>Kampagnen erstellen und steuern</li>
          <li>Deployments innerhalb der eigenen Agentur</li>
          <li>Knowledge Base pflegen</li>
          <li>Eskalationen verwalten und zuweisen</li>
          <li>Analytics und Reports einsehen</li>
        </ul>
        <InfoBox type="info">Admins haben <strong>keinen</strong> Zugriff auf Provider-Konfiguration, Kill Switch oder globale Budgeteinstellungen.</InfoBox>
      </DocBlock>

      <DocBlock id="teamleiter" title="Agenturleiter / Teamleiter" icon={Users}>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Übersicht und Analytics für die eigene Agentur</li>
          <li>Sessions und Eskalationen im eigenen Bereich einsehen</li>
          <li>Kampagnen-Status monitoren</li>
          <li>Kein Zugriff auf Agent-Konfiguration oder Infrastruktur</li>
        </ul>
      </DocBlock>

      <DocBlock id="employee" title="Mitarbeiter" icon={Users}>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Zugewiesene Eskalationen bearbeiten</li>
          <li>Benachrichtigungen zu eigenen Leads/Kandidaten empfangen</li>
          <li>Kein Zugriff auf AI-Voice-Modul-Navigation</li>
          <li>Interaktion nur über Benachrichtigungen und Task-Center</li>
        </ul>
      </DocBlock>

      <DocBlock id="qa-compliance" title="QA / Compliance" icon={Shield}>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Session Reviews durchführen und Sessions flaggen</li>
          <li>Compliance-Regeln vorschlagen</li>
          <li>Audit Logs einsehen</li>
          <li>Knowledge Base freigeben (Approval-Workflow)</li>
          <li>Kein Zugriff auf Provider oder Infrastruktur</li>
        </ul>
      </DocBlock>

      <DocBlock id="visibility" title="Sichtbarkeiten" icon={Eye}>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left font-medium">Bereich</th>
                <th className="p-2 text-center font-medium">SA</th>
                <th className="p-2 text-center font-medium">Admin</th>
                <th className="p-2 text-center font-medium">TL</th>
                <th className="p-2 text-center font-medium">MA</th>
              </tr>
            </thead>
            <tbody>
              {[
                { area: 'Übersicht / Dashboard', sa: true, admin: true, tl: true, ma: false },
                { area: 'Betrieb', sa: true, admin: true, tl: false, ma: false },
                { area: 'Wissen & Regeln', sa: true, admin: true, tl: false, ma: false },
                { area: 'Infrastruktur', sa: true, admin: false, tl: false, ma: false },
                { area: 'Qualität & Analyse', sa: true, admin: true, tl: true, ma: false },
                { area: 'Provider Settings', sa: true, admin: false, tl: false, ma: false },
                { area: 'Kill Switch', sa: true, admin: false, tl: false, ma: false },
                { area: 'Kosten (Details)', sa: true, admin: true, tl: false, ma: false },
              ].map(r => (
                <tr key={r.area} className="border-t">
                  <td className="p-2 font-medium">{r.area}</td>
                  {[r.sa, r.admin, r.tl, r.ma].map((v, i) => (
                    <td key={i} className="p-2 text-center">
                      {v ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 inline" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 inline" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocBlock>

      <DocBlock id="approvals" title="Freigaben" icon={CheckCircle2}>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li><strong>Agent-Veröffentlichung:</strong> Nur Superadmin</li>
          <li><strong>Deployment auf Production:</strong> Nur Superadmin</li>
          <li><strong>Knowledge Base Live-Freigabe:</strong> Admin oder Superadmin</li>
          <li><strong>Compliance-Regel-Aktivierung:</strong> Nur Superadmin</li>
          <li><strong>Kill-Switch Deaktivierung:</strong> Nur Superadmin</li>
        </ul>
      </DocBlock>

      <DocBlock id="responsibility" title="Verantwortlichkeiten" icon={FileText}>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li><strong>Superadmin:</strong> Systemkonfiguration, Provider, globale Budgets, Compliance</li>
          <li><strong>Admin:</strong> Agenten-Pflege, Kampagnen, Knowledge, Eskalationszuweisung</li>
          <li><strong>Teamleiter:</strong> Monitoring, Eskalations-Nachverfolgung</li>
          <li><strong>Mitarbeiter:</strong> Eskalations-Bearbeitung, Follow-ups durchführen</li>
        </ul>
      </DocBlock>
    </div>
  );
}

// ── API-Dokumentation ─────────────────────────────────────────────

function ApiContent() {
  return (
    <div className="space-y-8">
      <DocBlock id="action-gateway" title="Action Gateway (Pflichtschicht)" icon={Shield}>
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 mb-4">
          <p className="text-sm font-semibold text-amber-700">⚠️ Pflichtarchitektur</p>
          <p className="text-xs text-amber-600 mt-1">
            Das Action Gateway ist die einzige erlaubte Schnittstelle zwischen externen Systemen (Railway Voice Backend) 
            und dem SSM Recruit Kernsystem. Direkte Provider-zu-Frontend-Logik ist architektonisch verboten.
          </p>
        </div>

        <h4 className="font-semibold text-sm">Zweck</h4>
        <p className="text-xs text-muted-foreground">
          Das Action Gateway ist eine serverseitige Edge Function (<code>ai-voice-gateway</code>), die alle Aktionen 
          des AI Voice Agents validiert, autorisiert und ausführt. Es unterstützt zwei Authentifizierungsarten:
        </p>
        <ul className="text-xs text-muted-foreground list-disc pl-5 mt-2 space-y-1">
          <li><strong>User JWT</strong> – für Aktionen aus dem SSM Recruit Frontend (Bearer Token)</li>
          <li><strong>Service Token</strong> – für Aktionen vom Railway Voice Backend (<code>x-service-token</code> Header)</li>
        </ul>

        <h4 className="font-semibold text-sm mt-4">Endpunkte</h4>
        <div className="space-y-2 mt-2">
          {[
            { method: 'POST', path: '/ai-voice-gateway/execute', desc: 'Aktion ausführen (mit Rollout-Mode-Prüfung)' },
            { method: 'POST', path: '/ai-voice-gateway/approve', desc: 'Vorgeschlagene Aktion genehmigen (nur User JWT)' },
            { method: 'POST', path: '/ai-voice-gateway/reject', desc: 'Vorgeschlagene Aktion ablehnen (nur User JWT)' },
            { method: 'POST', path: '/ai-voice-gateway/batch', desc: 'Bis zu 20 Aktionen in einem Request (max. Batch)' },
            { method: 'GET', path: '/ai-voice-gateway/pending', desc: 'Offene vorgeschlagene Aktionen abrufen' },
            { method: 'GET', path: '/ai-voice-gateway/history', desc: 'Action-Verlauf abrufen (Filter: session_id, lead_id)' },
            { method: 'GET', path: '/ai-voice-gateway/health', desc: 'Gateway-Status prüfen (öffentlich)' },
          ].map(e => (
            <div key={e.path} className="flex items-start gap-3 p-2 rounded border">
              <Badge variant={e.method === 'GET' ? 'secondary' : 'default'} className="text-[10px] w-14 justify-center shrink-0">{e.method}</Badge>
              <div>
                <code className="text-xs font-mono text-foreground">{e.path}</code>
                <p className="text-xs text-muted-foreground">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h4 className="font-semibold text-sm mt-4">Unterstützte Aktionen (15)</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mt-2">
          {['set_status', 'open_wizard', 'create_followup', 'create_task', 'create_note',
            'assign_to_user', 'escalate_to_human', 'mark_wrong_number', 'mark_no_interest',
            'mark_callback_requested', 'mark_qualified', 'mark_not_reached', 'schedule_callback',
            'prepare_interview', 'send_confirmation_placeholder'].map(a => (
            <code key={a} className="text-[10px] bg-muted px-2 py-1 rounded">{a}</code>
          ))}
        </div>

        <h4 className="font-semibold text-sm mt-4">Rollout-Modi</h4>
        <div className="space-y-1 mt-2">
          {[
            { mode: 'off', desc: 'Alle Aktionen blockiert' },
            { mode: 'shadow', desc: 'Nur Protokollierung, keine Ausführung' },
            { mode: 'recommendation', desc: 'Aktionen werden vorgeschlagen, User muss genehmigen' },
            { mode: 'assisted', desc: 'Wie Recommendation, aber mit UI-Workflow zur Genehmigung' },
            { mode: 'autonomous', desc: 'Sichere Aktionen automatisch, riskante als Vorschlag' },
          ].map(m => (
            <div key={m.mode} className="flex gap-2 text-xs">
              <Badge variant="outline" className="text-[10px] w-28 justify-center shrink-0">{m.mode}</Badge>
              <span className="text-muted-foreground">{m.desc}</span>
            </div>
          ))}
        </div>

        <h4 className="font-semibold text-sm mt-4">Sicherheitsregeln</h4>
        <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
          <li>High-Risk-Aktionen (<code>mark_qualified</code>, <code>mark_no_interest</code>, <code>assign_to_user</code>, <code>open_wizard</code>, <code>prepare_interview</code>) werden im Autonomous-Mode vom Service-Token blockiert</li>
          <li>Jede Aktion wird vollständig in <code>ai_voice_action_logs</code> protokolliert</li>
          <li>Lead-Timeline wird automatisch aktualisiert</li>
          <li>Fehlerhafte Requests erhalten standardisierte Fehlercodes</li>
        </ul>

        <h4 className="font-semibold text-sm mt-4">Payload-Struktur (POST /execute)</h4>
        <pre className="text-[10px] bg-muted p-3 rounded mt-2 overflow-x-auto">{`{
  "action_type": "set_status",
  "source": "ai_voice_agent",
  "source_runtime": "railway_voice_backend",
  "session_id": "uuid",
  "ai_agent_id": "uuid",
  "lead_id": "lead-id",
  "candidate_id": "optional",
  "execution_mode": "recommendation",
  "reason": "Kandidat hat Interesse bestätigt",
  "confidence": 0.92,
  "payload": { "newStatus": "Qualifiziert" },
  "audit_metadata": { "call_duration": 145 }
}`}</pre>
      </DocBlock>

      <DocBlock id="endpoints" title="Interne Endpunkte" icon={Code2}>
        <p>Alle Endpunkte erfordern einen gültigen <code>Authorization: Bearer &lt;token&gt;</code> Header.</p>
        <div className="space-y-2 mt-3">
          {[
            { method: 'GET', path: '/ai-voice-api/agents', desc: 'Alle Agenten abrufen (mit Pagination & Filter)' },
            { method: 'GET', path: '/ai-voice-api/agents/:id', desc: 'Einzelnen Agenten abrufen' },
            { method: 'GET', path: '/ai-voice-api/agents/:id/versions', desc: 'Versionen eines Agenten' },
            { method: 'GET', path: '/ai-voice-api/deployments', desc: 'Alle Deployments abrufen' },
            { method: 'GET', path: '/ai-voice-api/campaigns', desc: 'Alle Kampagnen abrufen' },
            { method: 'GET', path: '/ai-voice-api/sessions', desc: 'Sessions abrufen (Filter: Agent, Status, Datum)' },
            { method: 'GET', path: '/ai-voice-api/sessions/:id/turns', desc: 'Turns einer Session' },
            { method: 'GET', path: '/ai-voice-api/escalations', desc: 'Eskalationen abrufen' },
            { method: 'GET', path: '/ai-voice-api/knowledge', desc: 'Knowledge-Items abrufen' },
            { method: 'GET', path: '/ai-voice-api/provider-configs', desc: 'Provider-Konfigurationen' },
            { method: 'GET', path: '/ai-voice-api/cost-control', desc: 'Kostenlogs abrufen' },
            { method: 'GET', path: '/ai-voice-api/analytics', desc: 'Aggregierte Kennzahlen' },
            { method: 'GET', path: '/ai-voice-api/audit', desc: 'Audit Logs' },
            { method: 'GET', path: '/ai-voice-api/test-center', desc: 'Test Runs abrufen' },
            { method: 'GET', path: '/ai-voice-api/system-health', desc: 'System-Gesundheitsbericht' },
            { method: 'POST', path: '/ai-voice-api/webhooks', desc: 'Inbound Webhook empfangen' },
          ].map(e => (
            <div key={e.path + e.method} className="flex items-start gap-3 p-2 rounded border">
              <Badge variant={e.method === 'GET' ? 'secondary' : 'default'} className="text-[10px] w-12 justify-center shrink-0">{e.method}</Badge>
              <div>
                <code className="text-xs font-mono text-foreground">{e.path}</code>
                <p className="text-xs text-muted-foreground">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </DocBlock>

      <DocBlock id="dto-examples" title="DTO- / Payload-Beispiele" icon={FileText}>
        <h4 className="font-semibold text-sm mt-2">Agent erstellen (CreateAgentDTO)</h4>
        <CodeBlock code={`{
  "name": "Recruiting Assistent Zürich",
  "slug": "recruiting-zh",
  "description": "Erstqualifizierung neuer Leads in Zürich",
  "agent_type": "outbound",
  "language": "de",
  "system_prompt": "Du bist ein freundlicher Recruiting-Assistent...",
  "greeting_message": "Guten Tag, hier spricht der SSM Recruiting-Assistent.",
  "max_turns": 20,
  "max_call_duration_seconds": 300,
  "agency_id": "agency-zuerich-001",
  "test_only": true
}`} />
        <h4 className="font-semibold text-sm mt-4">Session erstellen (CreateSessionDTO)</h4>
        <CodeBlock code={`{
  "agent_id": "uuid-agent-001",
  "direction": "outbound",
  "lead_id": "lead-001",
  "phone_number_to": "+41791234567",
  "is_test": true
}`} />
      </DocBlock>

      <DocBlock id="event-flows" title="Event-Flows" icon={Activity}>
        <p>Typischer Outbound-Call-Flow:</p>
        <div className="space-y-1 mt-3 pl-4 border-l-2 border-primary/20">
          {[
            'Session wird erstellt (status: initiated)',
            'Telephony-Adapter initiiert Anruf (status: ringing)',
            'Anruf verbunden (status: connected)',
            'Voice-AI-Stream gestartet',
            'Turns werden verarbeitet und gespeichert',
            'Intent-Erkennung und Action-Vorschläge',
            'Anruf beendet (status: completed)',
            'Transkript und Zusammenfassung erstellt',
            'Kosten berechnet und gespeichert',
            'Aktionen ausgeführt (je nach Rollout-Modus)',
            'Webhook-Events dispatcht',
            'Audit-Log geschrieben',
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="text-xs font-mono text-primary w-5">{i + 1}.</span>
              <span className="text-xs text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </DocBlock>

      <DocBlock id="webhook-structure" title="Webhook-Struktur" icon={Webhook}>
        <p>Unterstützte Webhook-Event-Typen:</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {['session.started', 'session.ended', 'session.failed', 'escalation.created', 'escalation.resolved', 'action.executed', 'action.blocked', 'agent.status_changed', 'campaign.started', 'campaign.paused', 'budget.warning', 'budget.exceeded', 'compliance.violation', 'kill_switch.activated'].map(e => (
            <Badge key={e} variant="outline" className="text-[10px] font-mono">{e}</Badge>
          ))}
        </div>
        <h4 className="font-semibold text-sm mt-4">Webhook Payload</h4>
        <CodeBlock code={`{
  "event": "session.ended",
  "timestamp": "2026-04-09T14:30:00Z",
  "data": {
    "session_id": "uuid-session-001",
    "agent_id": "uuid-agent-001",
    "outcome": "appointment_scheduled",
    "duration_seconds": 28,
    "cost_total": 0.45
  },
  "signature": "sha256=..."
}`} />
      </DocBlock>

      <DocBlock id="status-codes" title="Statuscodes" icon={Code2}>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left font-medium">Code</th>
                <th className="p-2 text-left font-medium">Bedeutung</th>
                <th className="p-2 text-left font-medium">Error Code</th>
              </tr>
            </thead>
            <tbody>
              {[
                { code: '200', meaning: 'Erfolgreiche Anfrage', error: '—' },
                { code: '400', meaning: 'Ungültige Anfrage', error: 'VALIDATION_ERROR' },
                { code: '401', meaning: 'Nicht authentifiziert', error: 'UNAUTHORIZED' },
                { code: '403', meaning: 'Nicht berechtigt', error: 'FORBIDDEN' },
                { code: '404', meaning: 'Ressource nicht gefunden', error: 'NOT_FOUND' },
                { code: '409', meaning: 'Konflikt (z.B. Duplikat)', error: 'CONFLICT' },
                { code: '422', meaning: 'Validierungsfehler', error: 'VALIDATION_ERROR' },
                { code: '429', meaning: 'Budget überschritten', error: 'BUDGET_EXCEEDED' },
                { code: '500', meaning: 'Interner Serverfehler', error: 'INTERNAL' },
                { code: '502', meaning: 'Provider-Fehler', error: 'PROVIDER_ERROR' },
              ].map(r => (
                <tr key={r.code} className="border-t">
                  <td className="p-2 font-mono font-bold">{r.code}</td>
                  <td className="p-2">{r.meaning}</td>
                  <td className="p-2 font-mono text-muted-foreground">{r.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocBlock>

      <DocBlock id="error-handling" title="Fehlerfälle" icon={AlertTriangle}>
        <CodeBlock code={`// Standard Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "statusCode": 422,
    "details": {
      "name": ["Name is required"],
      "agent_id": ["Agent ID is required"]
    }
  },
  "meta": {
    "timestamp": "2026-04-09T14:30:00Z",
    "requestId": "uuid-request-001"
  }
}`} />
      </DocBlock>

      <DocBlock id="mock-vs-prod" title="Mock vs. Produktivmodus" icon={FlaskConical}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="p-4 rounded-lg border">
            <h4 className="font-semibold text-sm flex items-center gap-2"><FlaskConical className="h-4 w-4 text-muted-foreground" /> Mock-Modus</h4>
            <ul className="list-disc list-inside space-y-1 mt-2 text-xs text-muted-foreground">
              <li>Keine echten API-Calls</li>
              <li>Simulierte Szenarien und Kosten</li>
              <li>Alle Adapter sind Mock-Implementierungen</li>
              <li>System-Health zeigt <code>mockMode: true</code></li>
            </ul>
          </div>
          <div className="p-4 rounded-lg border">
            <h4 className="font-semibold text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Produktiv-Modus</h4>
            <ul className="list-disc list-inside space-y-1 mt-2 text-xs text-muted-foreground">
              <li>Echte Provider-Adapter aktiv</li>
              <li>Reale Kosten und Abrechnungen</li>
              <li>Webhook-Callbacks von Providern</li>
              <li>System-Health zeigt <code>mockMode: false</code></li>
            </ul>
          </div>
        </div>
      </DocBlock>
    </div>
  );
}

// ── Datenmodell ───────────────────────────────────────────────────

function DatamodelContent() {
  const tables = [
    { name: 'ai_agents', purpose: 'Zentrale Agent-Definition mit Prompt, Konfiguration, Status und Provider-Zuweisung.', status: 'draft → testing → active → paused → archived', relations: 'Referenziert agencies, ai_provider_configs' },
    { name: 'ai_agent_versions', purpose: 'Versionierte Snapshots eines Agenten (Prompt, Regeln, Knowledge-Binding).', status: 'draft → published → deprecated', relations: 'Referenziert ai_agents' },
    { name: 'ai_agent_deployments', purpose: 'Steuerung der Ausrollung: Umgebung, Scope, Rollout-Modus, Priorität.', status: 'pending → active → paused → completed', relations: 'Referenziert ai_agents, ai_agent_versions' },
    { name: 'ai_voice_sessions', purpose: 'Einzelne Telefongespräche mit Dauer, Ergebnis, Kosten und Transkript-Status.', status: 'initiated → ringing → connected → completed / failed', relations: 'Referenziert ai_agents, ai_voice_campaigns, leads, ai_voice_numbers' },
    { name: 'ai_voice_turns', purpose: 'Einzelne Gesprächs-Turns mit Transkript, Intent, Konfidenz und Latenz.', status: '—', relations: 'Referenziert ai_voice_sessions' },
    { name: 'ai_voice_campaigns', purpose: 'Kampagnen-Definition mit Zielgruppe, Zeitfenster, Budget und Retry-Regeln.', status: 'draft → scheduled → running → paused → completed', relations: 'Referenziert ai_agents, agencies' },
    { name: 'ai_voice_numbers', purpose: 'Telefonnummern mit Provider-Zuordnung, Richtung und Routing-Regeln.', status: 'active → inactive → reserved', relations: 'Referenziert ai_agents, ai_provider_configs, agencies' },
    { name: 'ai_provider_configs', purpose: 'Konfiguration externer Provider (Telephony, Voice-AI, Transcription).', status: 'active → inactive → error', relations: '—' },
    { name: 'ai_voice_escalations', purpose: 'Eskalationsfälle mit Priorität, Zuweisung und Auflösung.', status: 'open → in_progress → resolved → closed', relations: 'Referenziert ai_agents, ai_voice_sessions, employees, leads' },
    { name: 'ai_voice_knowledge_items', purpose: 'Wissensbasis-Einträge mit Freigabe-Workflow und Versionierung.', status: 'draft → in_review → approved → rejected → expired', relations: 'Referenziert ai_agents' },
    { name: 'ai_voice_cost_logs', purpose: 'Kosteneinträge pro Session mit Aufschlüsselung nach Typ.', status: '—', relations: 'Referenziert ai_agents, ai_voice_sessions, ai_provider_configs' },
    { name: 'ai_voice_test_runs', purpose: 'Test-Szenarien mit erwartetem vs. tatsächlichem Ergebnis.', status: 'pending → running → passed → failed', relations: 'Referenziert ai_agents, ai_agent_versions' },
    { name: 'ai_voice_action_logs', purpose: 'Protokoll aller durch den Agent ausgelösten oder vorgeschlagenen Aktionen.', status: 'suggested → approved → auto_executed → blocked → failed', relations: 'Referenziert ai_voice_sessions' },
    { name: 'ai_compliance_rules', purpose: 'Konfigurierbare Compliance-Regeln (Pflichtoffenlegung, Verbote).', status: 'active → inactive', relations: '—' },
  ];

  return (
    <div className="space-y-8">
      <DocBlock id="tables-overview" title="Tabellenübersicht" icon={Database}>
        <p>{tables.length} spezialisierte Tabellen bilden das Datenmodell des AI Voice Agent Moduls:</p>
        <div className="space-y-3 mt-4">
          {tables.map(t => (
            <div key={t.name} className="p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-primary shrink-0" />
                <code className="text-xs font-bold text-foreground">{t.name}</code>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.purpose}</p>
              {t.status !== '—' && (
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-mono">{t.status}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </DocBlock>

      <DocBlock id="relations" title="Relationen" icon={GitBranch}>
        <p>Zentrale Relationen im Datenmodell:</p>
        <div className="space-y-1 mt-3">
          {tables.filter(t => t.relations !== '—').map(t => (
            <div key={t.name} className="flex items-start gap-2 text-xs">
              <code className="text-primary font-mono shrink-0 w-48">{t.name}</code>
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{t.relations}</span>
            </div>
          ))}
        </div>
      </DocBlock>

      <DocBlock id="status-fields" title="Statusfelder" icon={Activity}>
        <p>Jede Tabelle mit Status-Logik folgt einem definierten Zustandsdiagramm. Ungültige Übergänge werden vom Service-Layer verhindert.</p>
        <InfoBox type="info">Soft Delete wird über ein <code>deleted_at</code>-Feld realisiert (aktuell bei <code>ai_agents</code>). Gelöschte Einträge werden standardmässig aus Listen ausgeblendet.</InfoBox>
      </DocBlock>

      <DocBlock id="object-purposes" title="Logik & Zweck" icon={BookOpen}>
        <p>Jedes Objekt im Datenmodell hat einen klaren Zweck im Gesamtprozess:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li><strong>Agent</strong> = WER spricht (Persönlichkeit, Wissen, Regeln)</li>
          <li><strong>Version</strong> = WELCHE Konfiguration aktiv ist (Prompt, Rules)</li>
          <li><strong>Deployment</strong> = WO und WIE der Agent eingesetzt wird (Scope, Modus)</li>
          <li><strong>Kampagne</strong> = WANN und WEN der Agent anruft (Zielgruppe, Zeitplan)</li>
          <li><strong>Session</strong> = EIN Gespräch (Start bis Ende)</li>
          <li><strong>Turn</strong> = EIN Sprechakt innerhalb einer Session</li>
          <li><strong>Action Log</strong> = WAS der Agent in SSM Recruit auslöst</li>
          <li><strong>Escalation</strong> = Übergabe an einen Menschen</li>
        </ul>
      </DocBlock>
    </div>
  );
}

// ── Compliance & Governance ───────────────────────────────────────

function ComplianceContent() {
  return (
    <div className="space-y-8">
      <DocBlock id="knowledge-approval" title="Wissensfreigabe" icon={CheckCircle2}>
        <p>Wissenseinträge für den Livebetrieb durchlaufen einen Freigabe-Workflow:</p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {['Draft', 'In Review', 'Approved', 'Live'].map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">{s}</Badge>
              {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </span>
          ))}
        </div>
        <p className="mt-3">Nur Einträge mit Status <strong>Approved</strong> und <code>approved_for_live_calls = true</code> werden im Livebetrieb verwendet. Jeder Eintrag hat eine Risiko-Klasse und optional eine Gültigkeitsdauer.</p>
      </DocBlock>

      <DocBlock id="audit-logs" title="Audit Logs" icon={FileSearch}>
        <p>Alle relevanten Änderungen werden in <code>ai_audit_logs</code> protokolliert:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Agent erstellt / bearbeitet / veröffentlicht / gelöscht</li>
          <li>Deployment geändert / aktiviert / deaktiviert</li>
          <li>Provider konfiguriert / geändert</li>
          <li>Kampagne gestartet / pausiert / beendet</li>
          <li>Compliance-Regel aktiviert / deaktiviert</li>
          <li>Kill Switch ausgelöst / zurückgesetzt</li>
          <li>Knowledge-Eintrag freigegeben / abgelehnt</li>
        </ul>
        <p className="mt-2">Jeder Log-Eintrag enthält: Tabelle, Record-ID, Aktion, Benutzer, Zeitstempel, alte und neue Daten.</p>
      </DocBlock>

      <DocBlock id="flagged-sessions" title="Problematische Sessions" icon={AlertTriangle}>
        <p>Sessions werden automatisch geflaggt bei:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Negativem Sentiment über mehr als 3 Turns</li>
          <li>Compliance-Verstoss (verbotene Aussage, fehlende Offenlegung)</li>
          <li>Kandidat fordert Gesprächsbeendigung</li>
          <li>Ungewöhnlich lange Dauer (&gt; konfiguriertes Maximum)</li>
          <li>Technische Fehler oder Provider-Timeouts</li>
        </ul>
        <p className="mt-2">Geflaggte Sessions erscheinen im <strong>Session Review</strong>-Bereich und können manuell überprüft und bewertet werden.</p>
      </DocBlock>

      <DocBlock id="disclosures" title="Pflichtoffenlegung" icon={FileText}>
        <p>Gemäss Compliance-Regeln muss der Agent zu Gesprächsbeginn offenlegen:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Dass es sich um einen KI-gestützten Anruf handelt</li>
          <li>Den Zweck des Anrufs</li>
          <li>Die Möglichkeit, jederzeit aufzulegen oder einen Menschen zu verlangen</li>
          <li>Hinweis auf Aufzeichnung (falls aktiv)</li>
        </ul>
        <InfoBox type="warning">Fehlende Pflichtoffenlegungen werden als Compliance-Verstoss protokolliert und führen zur automatischen Flagging der Session.</InfoBox>
      </DocBlock>

      <DocBlock id="forbidden" title="Verbotene Aussagen" icon={XCircle}>
        <p>Der Agent darf unter keinen Umständen:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Rechtsberatung erteilen oder Verträge versprechen</li>
          <li>Diskriminierende oder beleidigende Aussagen machen</li>
          <li>Falsche Versprechen zu Gehalt, Bedingungen oder Terminen geben</li>
          <li>Persönliche Daten an Dritte weitergeben</li>
          <li>Auf Provokationen eingehen oder emotional reagieren</li>
        </ul>
        <p className="mt-2">Verbotene Aussagen werden in <code>ai_agent_versions.forbidden_statements</code> konfiguriert und vom Voice-AI-System überwacht.</p>
      </DocBlock>

      <DocBlock id="kill-switch" title="Kill Switch" icon={AlertTriangle}>
        <p>Der Kill Switch ermöglicht die sofortige Deaktivierung des gesamten Voice-AI-Systems oder einzelner Komponenten:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li><strong>Globaler Kill Switch:</strong> Stoppt alle Agenten, Sessions und Kampagnen sofort</li>
          <li><strong>Agent-Kill-Switch:</strong> Stoppt einen einzelnen Agenten</li>
          <li><strong>Kampagnen-Stopp:</strong> Pausiert eine spezifische Kampagne</li>
        </ul>
        <InfoBox type="warning">Der Kill Switch kann nur von <strong>Superadmins</strong> ausgelöst und zurückgesetzt werden. Jede Auslösung wird im Audit Log protokolliert.</InfoBox>
      </DocBlock>

      <DocBlock id="review-process" title="Review-Prozess" icon={Eye}>
        <p>Der Review-Prozess umfasst folgende Schritte:</p>
        <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
          <li>Session wird automatisch oder manuell geflaggt</li>
          <li>Session erscheint in der Review-Queue</li>
          <li>Reviewer hört Aufnahme / liest Transkript</li>
          <li>Bewertung: Compliant / Non-Compliant / Needs Investigation</li>
          <li>Bei Non-Compliant: Massnahmen einleiten (Agent anpassen, Regel ergänzen)</li>
          <li>Review-Ergebnis wird dokumentiert</li>
        </ol>
      </DocBlock>
    </div>
  );
}

// ── Änderungsverlauf ──────────────────────────────────────────────

function ChangelogContent() {
  const versions = [
    {
      version: '1.4.0',
      date: '09.04.2026',
      type: 'feature' as const,
      changes: [
        'Vollständige interne Dokumentation mit 7 Hauptbereichen',
        'Interaktives Inhaltsverzeichnis mit Suchfunktion',
        'Rollenbasierte Sichtbarkeit der Dokumentationsbereiche',
      ],
    },
    {
      version: '1.3.0',
      date: '09.04.2026',
      type: 'feature' as const,
      changes: [
        'API-Architektur: 13 typisierte API-Module mit Pagination und Fehlerbehandlung',
        'Provider-Adapter-Interfaces für 5 Integrationstypen',
        'Edge Function mit 15+ REST-Endpunkten',
        'Webhook-Infrastruktur mit Subscriptions und Event-Dispatch',
        'System-Health-Endpoint mit aggregiertem Status',
      ],
    },
    {
      version: '1.2.0',
      date: '09.04.2026',
      type: 'improvement' as const,
      changes: [
        'Navigation vereinfacht: 6 Hauptbereiche mit Tabs statt 20+ Einzelseiten',
        'Dokumentation in zentrale SSM-Recruit-Dokumentation integriert',
        'Sidebar deutlich aufgeräumt und logisch gruppiert',
      ],
    },
    {
      version: '1.1.0',
      date: '09.04.2026',
      type: 'feature' as const,
      changes: [
        'Benachrichtigungs-Integration (Eskalationen, Rückrufe, Budget)',
        'Aufgaben-Synchronisation bei AI-Events',
        'Cost Control mit mehrstufigem Budget-System',
        'Kill Switch für Notabschaltung',
        'Analytics Dashboard mit KPI-Karten und Diagrammen',
        'Compliance & Audit Log mit Session Reviews',
        'Rollenbasierte Berechtigungen für alle Bereiche',
      ],
    },
    {
      version: '1.0.0',
      date: '09.04.2026',
      type: 'release' as const,
      changes: [
        'Initiales AI Voice Agent Modul',
        'Mock-Provider für vollständigen Testbetrieb',
        'Provider-Abstraktion (VoiceProvider Interface)',
        '14 Datenbank-Tabellen mit RLS-Policies',
        '8 realistische Gesprächsszenarien',
        'Action Gateway mit 15 Aktionstypen und 4 Ausführungsmodi',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <DocBlock id="versions" title="Versionen" icon={History}>
        <div className="space-y-4 mt-3">
          {versions.map(v => (
            <div key={v.version} className="p-4 rounded-lg border">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant={v.type === 'release' ? 'default' : v.type === 'feature' ? 'secondary' : 'outline'} className="text-xs">
                  v{v.version}
                </Badge>
                <span className="text-xs text-muted-foreground">{v.date}</span>
                <Badge variant="outline" className="text-[10px]">
                  {v.type === 'release' ? 'Release' : v.type === 'feature' ? 'Feature' : 'Improvement'}
                </Badge>
              </div>
              <ul className="space-y-1">
                {v.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DocBlock>

      <DocBlock id="publications" title="Veröffentlichungen" icon={Megaphone}>
        <p>Das Modul wird inkrementell veröffentlicht. Jede Version durchläuft:</p>
        <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
          <li>Entwicklung und lokaler Test</li>
          <li>Shadow-Deployment in Testumgebung</li>
          <li>Review durch Superadmin</li>
          <li>Produktiv-Deployment mit schrittweisem Rollout</li>
        </ol>
      </DocBlock>

      <DocBlock id="structural" title="Strukturelle Anpassungen" icon={GitBranch}>
        <div className="space-y-3 mt-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium text-sm">v1.2.0 — Navigation Refactoring</p>
            <p className="text-xs text-muted-foreground mt-1">Von 20+ Einzelseiten zu 6 Hauptbereichen mit interner Tab-Navigation. Drastische Reduktion der Sidebar-Komplexität.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium text-sm">v1.3.0 — API-Architektur</p>
            <p className="text-xs text-muted-foreground mt-1">Einführung typisierter API-Module, Provider-Adapter-Registry und standardisierter Fehlerbehandlung. Edge Function als zentraler API-Gateway.</p>
          </div>
        </div>
      </DocBlock>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════

function DocBlock({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
        <Icon className="h-4.5 w-4.5 text-primary" />
        {title}
      </h3>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-3 p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto whitespace-pre">
      {code}
    </pre>
  );
}

function ArchLayer({ title, desc, color }: { title: string; desc: string; color: string }) {
  return (
    <div className={`p-3 rounded-lg border border-${color}/20 bg-${color}/5`}>
      <p className="font-medium text-sm text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

function InfoBox({ type, children }: { type: 'info' | 'warning'; children: React.ReactNode }) {
  return (
    <div className={`mt-3 p-3 rounded-lg border text-xs ${
      type === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400' : 'border-primary/20 bg-primary/5 text-primary'
    }`}>
      <div className="flex items-start gap-2">
        {type === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
        <div>{children}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function AIVoiceDokumentation() {
  const { role } = useAuth();
  const isAdmin = role === 'superadmin' || role === 'admin';
  const visibleSections = useMemo(() => DOC_SECTIONS.filter(s => !s.adminOnly || isAdmin), [isAdmin]);
  const [activeSection, setActiveSection] = useState(visibleSections[0]?.id ?? 'setup');
  const [search, setSearch] = useState('');

  const activeConfig = visibleSections.find(s => s.id === activeSection);

  const filteredSubsections = useMemo(() => {
    if (!search.trim() || !activeConfig) return activeConfig?.subsections ?? [];
    return activeConfig.subsections.filter(sub =>
      sub.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, activeConfig]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            AI Voice Agent — Dokumentation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Interne Referenz für Einrichtung, Betrieb, API und Governance</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Durchsuchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Navigation */}
        <nav className="w-52 shrink-0">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-1 pr-2">
              {visibleSections.map(section => {
                const isActive = activeSection === section.id;
                const Icon = section.icon;
                return (
                  <div key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-left">{section.label}</span>
                      {section.adminOnly && <Lock className="h-3 w-3 text-muted-foreground/50 ml-auto" />}
                    </button>

                    {/* Subsections TOC */}
                    {isActive && filteredSubsections.length > 0 && (
                      <div className="ml-6 mt-1 mb-2 space-y-0.5 border-l border-border pl-3">
                        {filteredSubsections.map(sub => (
                          <a
                            key={sub.id}
                            href={`#${sub.id}`}
                            className="block text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
                            onClick={e => {
                              e.preventDefault();
                              document.getElementById(sub.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                          >
                            {sub.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                {activeConfig && <activeConfig.icon className="h-5 w-5 text-primary" />}
                {activeConfig?.label}
              </CardTitle>
              <Separator />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="pr-4">
                  <SectionContent sectionId={activeSection} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
