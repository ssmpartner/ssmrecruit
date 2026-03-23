import { useState } from 'react';
import { Book, Code2, Copy, ChevronDown, ChevronRight, ExternalLink, Lock, Globe, ArrowRight, Search } from 'lucide-react';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  auth: boolean;
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
}

interface ApiSection {
  title: string;
  description: string;
  endpoints: ApiEndpoint[];
}

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-100 text-blue-700 border-blue-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  PATCH: 'bg-orange-100 text-orange-700 border-orange-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

const apiSections: ApiSection[] = [
  {
    title: 'Leads',
    description: 'Leads erstellen, abrufen, aktualisieren und löschen.',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/leads', summary: 'Alle Leads abrufen', auth: true,
        description: 'Gibt eine paginierte Liste aller Leads zurück. Unterstützt Filter nach Status, Quelle und Kanton.',
        params: [
          { name: 'page', type: 'number', required: false, description: 'Seitenzahl (Standard: 1)' },
          { name: 'limit', type: 'number', required: false, description: 'Einträge pro Seite (Standard: 20, Max: 100)' },
          { name: 'status', type: 'string', required: false, description: 'Filter nach Status (new, contacted, appointment, etc.)' },
          { name: 'source', type: 'string', required: false, description: 'Filter nach Quelle (website, tiktok, meta, linkedin)' },
          { name: 'canton', type: 'string', required: false, description: 'Filter nach Kanton-Code (ZH, BE, etc.)' },
          { name: 'search', type: 'string', required: false, description: 'Volltextsuche in Name, E-Mail, Telefon' },
        ],
        response: `{
  "data": [
    {
      "id": "l1",
      "name": "Lukas Müller",
      "email": "lukas.mueller@email.ch",
      "phone": "+41 44 123 45 67",
      "status": "new",
      "source": "meta",
      "canton": "ZH",
      "position": "Frontend Entwickler",
      "createdAt": "2025-03-01T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 42 }
}`,
      },
      {
        method: 'GET', path: '/api/v1/leads/:id', summary: 'Einzelnen Lead abrufen', auth: true,
        description: 'Gibt die vollständigen Daten eines einzelnen Leads zurück.',
        params: [{ name: 'id', type: 'string', required: true, description: 'Lead-ID' }],
        response: `{
  "id": "l1",
  "name": "Lukas Müller",
  "email": "lukas.mueller@email.ch",
  "phone": "+41 44 123 45 67",
  "address": "Bahnhofstrasse 42",
  "plz": "8001",
  "city": "Zürich",
  "canton": "Zürich",
  "cantonCode": "ZH",
  "source": "meta",
  "status": "new",
  "agencyId": "a1",
  "employeeId": "e1",
  "position": "Frontend Entwickler",
  "notes": "",
  "createdAt": "2025-03-01T00:00:00.000Z",
  "updatedAt": "2025-03-03T00:00:00.000Z"
}`,
      },
      {
        method: 'POST', path: '/api/v1/leads', summary: 'Neuen Lead erstellen', auth: true,
        description: 'Erstellt einen neuen Lead im System. Wird automatisch als "Neuer Lead" markiert.',
        body: [
          { name: 'name', type: 'string', required: true, description: 'Vollständiger Name' },
          { name: 'email', type: 'string', required: true, description: 'E-Mail-Adresse' },
          { name: 'phone', type: 'string', required: true, description: 'Telefonnummer (Schweizer Format)' },
          { name: 'source', type: 'string', required: true, description: 'Quelle: website, tiktok, meta, linkedin, csv_import' },
          { name: 'position', type: 'string', required: false, description: 'Beworbene Stelle' },
          { name: 'plz', type: 'string', required: false, description: 'Postleitzahl' },
          { name: 'city', type: 'string', required: false, description: 'Ort' },
          { name: 'notes', type: 'string', required: false, description: 'Notizen' },
        ],
        response: `{
  "id": "l1742345678-abc1",
  "name": "Max Muster",
  "status": "new",
  "createdAt": "2026-03-18T10:00:00.000Z"
}`,
      },
      {
        method: 'PATCH', path: '/api/v1/leads/:id', summary: 'Lead aktualisieren', auth: true,
        description: 'Aktualisiert einzelne Felder eines bestehenden Leads.',
        params: [{ name: 'id', type: 'string', required: true, description: 'Lead-ID' }],
        body: [
          { name: 'status', type: 'string', required: false, description: 'Neuer Status' },
          { name: 'employeeId', type: 'string', required: false, description: 'Zuweisung an Mitarbeiter' },
          { name: 'notes', type: 'string', required: false, description: 'Notizen aktualisieren' },
        ],
        response: `{ "id": "l1", "status": "contacted", "updatedAt": "2026-03-18T10:05:00.000Z" }`,
      },
      {
        method: 'DELETE', path: '/api/v1/leads/:id', summary: 'Lead löschen', auth: true,
        description: 'Löscht einen Lead dauerhaft. Diese Aktion kann nicht rückgängig gemacht werden.',
        params: [{ name: 'id', type: 'string', required: true, description: 'Lead-ID' }],
        response: `{ "success": true, "deleted": "l1" }`,
      },
    ],
  },
  {
    title: 'Termine',
    description: 'Termine verwalten und Video-Call-Links generieren.',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/appointments', summary: 'Alle Termine abrufen', auth: true,
        description: 'Gibt alle Termine zurück. Optional nach Lead oder Datum filtern.',
        params: [
          { name: 'leadId', type: 'string', required: false, description: 'Filter nach Lead-ID' },
          { name: 'date', type: 'string', required: false, description: 'Filter nach Datum (YYYY-MM-DD)' },
          { name: 'type', type: 'string', required: false, description: 'Filter: phone, video, onsite' },
        ],
        response: `{
  "data": [
    {
      "id": "apt-123",
      "leadId": "l1",
      "title": "Erstgespräch",
      "date": "2026-03-20",
      "time": "14:00",
      "duration": 30,
      "type": "video",
      "meetingLink": "https://meet.jit.si/recruitflow-abc-def-ghi"
    }
  ]
}`,
      },
      {
        method: 'POST', path: '/api/v1/appointments', summary: 'Termin erstellen', auth: true,
        description: 'Erstellt einen neuen Termin. Bei Video-Typ wird automatisch ein Meeting-Link generiert.',
        body: [
          { name: 'leadId', type: 'string', required: true, description: 'Lead-ID' },
          { name: 'title', type: 'string', required: true, description: 'Titel des Termins' },
          { name: 'date', type: 'string', required: true, description: 'Datum (YYYY-MM-DD)' },
          { name: 'time', type: 'string', required: true, description: 'Uhrzeit (HH:MM)' },
          { name: 'duration', type: 'number', required: false, description: 'Dauer in Minuten (Standard: 30)' },
          { name: 'type', type: 'string', required: true, description: 'Art: phone, video, onsite' },
          { name: 'notes', type: 'string', required: false, description: 'Notizen' },
        ],
        response: `{
  "id": "apt-456",
  "meetingLink": "https://meet.jit.si/recruitflow-xyz-uvw-rst",
  "createdAt": "2026-03-18T10:00:00.000Z"
}`,
      },
      {
        method: 'DELETE', path: '/api/v1/appointments/:id', summary: 'Termin löschen', auth: true,
        description: 'Löscht einen bestehenden Termin.',
        params: [{ name: 'id', type: 'string', required: true, description: 'Termin-ID' }],
        response: `{ "success": true }`,
      },
    ],
  },
  {
    title: 'Mitarbeiter',
    description: 'Mitarbeiter und Zuweisungen verwalten.',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/employees', summary: 'Alle Mitarbeiter abrufen', auth: true,
        description: 'Liste aller Mitarbeiter mit Rollen und Agentur-Zuordnung.',
        params: [
          { name: 'agencyId', type: 'string', required: false, description: 'Filter nach Agentur' },
          { name: 'role', type: 'string', required: false, description: 'Filter: admin, agency_manager, employee' },
        ],
        response: `{
  "data": [
    { "id": "e1", "name": "Sarah Chen", "email": "sarah@company.ch", "role": "admin", "agencyId": "a1" }
  ]
}`,
      },
    ],
  },
  {
    title: 'Agenturen',
    description: 'Agenturen und deren Kontaktdaten verwalten.',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/agencies', summary: 'Alle Agenturen abrufen', auth: true,
        description: 'Liste aller Agenturen mit Kontaktdaten.',
        response: `{
  "data": [
    { "id": "a1", "name": "Agentur Unteren-Schönbühl", "contactEmail": "info@agentur-schoenbuehl.ch" }
  ]
}`,
      },
    ],
  },
  {
    title: 'CSV Import / Export',
    description: 'Leads per CSV-Datei importieren oder exportieren. Unterstützt auch plattformspezifische Importe (Meta, TikTok).',
    endpoints: [
      {
        method: 'POST', path: '/api/v1/leads/import/csv', summary: 'Leads per CSV importieren', auth: true,
        description: 'Importiert Leads aus einer CSV-Datei. Unterstützt Komma-, Semikolon- und Tab-getrennte Dateien. Automatische Spalten-Zuordnung für deutsche und englische Feldnamen. Plattform-CSVs (Meta, TikTok) werden automatisch erkannt.',
        body: [
          { name: 'file', type: 'file (multipart)', required: true, description: 'CSV-Datei (.csv)' },
          { name: 'mapping', type: 'object', required: false, description: 'Manuelle Spalten-Zuordnung (Spaltenindex → Feldname)' },
          { name: 'skipDuplicates', type: 'boolean', required: false, description: 'Duplikate anhand E-Mail überspringen (Standard: false)' },
        ],
        response: `{
  "imported": 15,
  "skipped": 2,
  "errors": [
    { "row": 8, "reason": "E-Mail fehlt" }
  ]
}`,
      },
      {
        method: 'GET', path: '/api/v1/leads/export/csv', summary: 'Leads als CSV exportieren', auth: true,
        description: 'Exportiert alle Leads als CSV-Datei. Nur für Superadmins verfügbar. Unterstützt Filter nach Status und Zeitraum.',
        params: [
          { name: 'status', type: 'string', required: false, description: 'Filter nach Status' },
          { name: 'from', type: 'string', required: false, description: 'Startdatum (YYYY-MM-DD)' },
          { name: 'to', type: 'string', required: false, description: 'Enddatum (YYYY-MM-DD)' },
        ],
        response: `Content-Type: text/csv
Content-Disposition: attachment; filename="leads-export-2026-03-19.csv"

Name,E-Mail,Telefon,PLZ,Ort,Kanton,Status,Quelle,Position
Lukas Müller,lukas@email.ch,+41 44 123 45 67,8001,Zürich,ZH,new,meta,Frontend Entwickler`,
      },
    ],
  },
  {
    title: 'Webhooks – Kontaktformular',
    description: 'Generischer Webhook für externe Website-Kontaktformulare und Zapier-Anbindungen. Leads werden automatisch der Agentur Hauptsitz zugewiesen.',
    endpoints: [
      {
        method: 'POST', path: '/functions/v1/form-webhook', summary: 'Lead per Website-Formular erstellen', auth: false,
        description: 'Empfängt Lead-Daten von externen Website-Formularen. Unterstützt flexible Feldnamen (DE/EN). Duplikatprüfung per E-Mail. Automatische Zuweisung an Agentur Hauptsitz.',
        body: [
          { name: 'name', type: 'string', required: true, description: 'Vollständiger Name (auch: vorname, full_name, fullName)' },
          { name: 'email', type: 'string', required: true, description: 'E-Mail-Adresse (auch: e_mail)' },
          { name: 'phone', type: 'string', required: false, description: 'Telefonnummer (auch: telefon, phone_number)' },
          { name: 'city', type: 'string', required: false, description: 'Wohnort (auch: stadt, ort)' },
          { name: 'plz', type: 'string', required: false, description: 'Postleitzahl (auch: zip, postleitzahl)' },
          { name: 'address', type: 'string', required: false, description: 'Strasse (auch: adresse, strasse)' },
          { name: 'notes', type: 'string', required: false, description: 'Nachricht (auch: nachricht, message, bemerkung)' },
          { name: 'campaign', type: 'string', required: false, description: 'Kampagne (auch: kampagne, source_detail)' },
          { name: 'form_source', type: 'string', required: false, description: 'Formularname (auch: form_name, Default: website)' },
        ],
        response: `{
  "success": true,
  "lead_id": "uuid",
  "message": "Lead Max Mustermann erfolgreich erstellt"
}

// Bei Duplikat (Status 200):
{
  "success": true,
  "duplicate": true,
  "message": "Lead mit E-Mail ... existiert bereits",
  "lead_id": "uuid"
}`,
      },
    ],
  },
  {
    title: 'Webhooks – Bewerbungsformular',
    description: 'Dedizierter Webhook für Bewerbungsformulare mit Datei-Uploads, Consent-Tracking und automatischem custom_fields Fallback.',
    endpoints: [
      {
        method: 'POST', path: '/functions/v1/application-webhook', summary: 'Bewerbung einreichen', auth: false,
        description: 'Empfängt Bewerbungsdaten inkl. Datei-Uploads (multipart/form-data). Unbekannte Felder werden automatisch in custom_fields gespeichert. Status: complete, incomplete oder spam_suspected.',
        body: [
          { name: 'first_name', type: 'string', required: true, description: 'Vorname (auch: vorname)' },
          { name: 'last_name', type: 'string', required: true, description: 'Nachname (auch: nachname)' },
          { name: 'email', type: 'string', required: true, description: 'E-Mail (auch: e-mail, e_mail)' },
          { name: 'salutation', type: 'string', required: false, description: 'Anrede (auch: anrede)' },
          { name: 'birth_date', type: 'string', required: false, description: 'Geburtsdatum (auch: geburtsdatum)' },
          { name: 'address', type: 'string', required: false, description: 'Strasse (auch: strasse, adresse)' },
          { name: 'zip', type: 'string', required: false, description: 'PLZ (auch: plz, postleitzahl)' },
          { name: 'city', type: 'string', required: false, description: 'Ort (auch: ort, wohnort)' },
          { name: 'country', type: 'string', required: false, description: 'Land (auch: land, Default: Schweiz)' },
          { name: 'phone', type: 'string', required: false, description: 'Telefon (auch: telefon, phone_number)' },
          { name: 'cv', type: 'file', required: true, description: 'Lebenslauf (auch: lebenslauf, resume)' },
          { name: 'motivation_letter', type: 'file', required: false, description: 'Motivationsschreiben (auch: motivationsschreiben, cover_letter)' },
          { name: 'attachments', type: 'file[]', required: false, description: 'Weitere Beilagen (auch: beilagen, weitere_beilagen)' },
          { name: 'consent_privacy', type: 'boolean', required: false, description: 'Datenschutz akzeptiert (auch: datenschutz, privacy)' },
          { name: 'consent_email_contract', type: 'boolean', required: false, description: 'E-Mail-Vertrag OK (auch: email_consent, vertragsunterlagen)' },
          { name: 'captcha_valid', type: 'boolean', required: false, description: 'Captcha-Ergebnis (false → spam_suspected)' },
        ],
        response: `{
  "success": true,
  "application_id": "uuid",
  "lead_id": "uuid",
  "status": "complete",
  "message": "Bewerbung erfolgreich übermittelt"
}`,
      },
    ],
  },
  {
    title: 'Webhooks – Social Media',
    description: 'Plattform-spezifische Webhooks für Meta und TikTok Lead Ads.',
    endpoints: [
      {
        method: 'POST', path: '/functions/v1/meta-webhook', summary: 'Meta/Facebook Lead Ads', auth: false,
        description: 'Empfängt Leads aus Facebook/Instagram Lead Ad-Kampagnen.',
        body: [
          { name: 'payload', type: 'object', required: true, description: 'Meta Lead Ads Payload (Standardformat)' },
        ],
        response: `{ "success": true, "lead_id": "uuid" }`,
      },
      {
        method: 'POST', path: '/functions/v1/tiktok-webhook', summary: 'TikTok Lead Ads', auth: false,
        description: 'Empfängt Leads aus TikTok Lead Ad-Kampagnen.',
        body: [
          { name: 'payload', type: 'object', required: true, description: 'TikTok Lead Ads Payload (Standardformat)' },
        ],
        response: `{ "success": true, "lead_id": "uuid" }`,
      },
    ],
  },
  {
    title: 'Analytics & Reports',
    description: 'Statistiken, KPIs und Reports abrufen und exportieren.',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/analytics/overview', summary: 'KPI-Übersicht abrufen', auth: true,
        description: 'Gibt die wichtigsten KPIs zurück: Total Leads, Konversionsrate, Leads nach Status und Zeitraum.',
        params: [
          { name: 'from', type: 'string', required: false, description: 'Startdatum (YYYY-MM-DD)' },
          { name: 'to', type: 'string', required: false, description: 'Enddatum (YYYY-MM-DD)' },
          { name: 'agencyId', type: 'string', required: false, description: 'Filter nach Agentur' },
        ],
        response: `{
  "totalLeads": 142,
  "conversionRate": 18.3,
  "newThisMonth": 24,
  "hiredThisMonth": 5,
  "byStatus": { "new": 35, "contacted": 28, "appointment": 15, "hired": 26 },
  "bySource": { "meta": 45, "tiktok": 30, "website": 40, "linkedin": 27 }
}`,
      },
      {
        method: 'GET', path: '/api/v1/analytics/marketing', summary: 'Marketing-Statistiken', auth: true,
        description: 'Quellen-Performance, Kampagnen-Konversionsraten und Kanal-Funnel-Daten.',
        params: [
          { name: 'from', type: 'string', required: false, description: 'Startdatum (YYYY-MM-DD)' },
          { name: 'to', type: 'string', required: false, description: 'Enddatum (YYYY-MM-DD)' },
        ],
        response: `{
  "sources": [
    { "source": "meta", "leads": 45, "hired": 8, "conversionRate": 17.8 }
  ],
  "campaigns": [
    { "campaign": "Spring 2026", "leads": 20, "hired": 4 }
  ]
}`,
      },
      {
        method: 'GET', path: '/api/v1/analytics/export/csv', summary: 'Analytics als CSV exportieren', auth: true,
        description: 'Exportiert die aktuelle Analytics-Ansicht (Übersicht, Marketing, Geschäftsleitung oder Flow) als CSV-Datei.',
        params: [
          { name: 'tab', type: 'string', required: true, description: 'Tab: overview, marketing, management, flow' },
          { name: 'from', type: 'string', required: false, description: 'Startdatum' },
          { name: 'to', type: 'string', required: false, description: 'Enddatum' },
        ],
        response: `Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="analytics-overview-2026-03-23.csv"

Metrik;Wert
Total Leads;142
Konversionsrate;18.3%
Neue Leads (Monat);24`,
      },
    ],
  },
  {
    title: 'Eskalationsprozesse',
    description: 'Eskalationsprozesse verwalten, Regeln definieren und Wizards verknüpfen.',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/escalation-processes', summary: 'Alle Eskalationsprozesse abrufen', auth: true,
        description: 'Gibt alle Eskalationsprozesse zurück. Optional nach Hauptprozess-Status filtern.',
        params: [
          { name: 'main_process_status', type: 'string', required: false, description: 'Filter: new, contacted, appointment, follow_up, hired' },
          { name: 'is_active', type: 'boolean', required: false, description: 'Filter nach Aktivitätsstatus' },
        ],
        response: `{
  "data": [
    {
      "id": "uuid",
      "main_process_status": "new",
      "name": "Meta-Leads Eskalation",
      "is_active": true,
      "priority": 0,
      "applies_to_all_sources": false,
      "source_filters": ["meta", "tiktok"]
    }
  ]
}`,
      },
      {
        method: 'POST', path: '/api/v1/escalation-processes', summary: 'Eskalationsprozess erstellen', auth: true,
        description: 'Erstellt einen neuen Eskalationsprozess für einen Hauptprozess.',
        body: [
          { name: 'main_process_status', type: 'string', required: true, description: 'Hauptprozess-Status (new, contacted, etc.)' },
          { name: 'name', type: 'string', required: true, description: 'Name des Eskalationsprozesses' },
          { name: 'priority', type: 'number', required: false, description: 'Priorität (niedrigere Zahl = höher)' },
          { name: 'applies_to_all_sources', type: 'boolean', required: false, description: 'Gilt für alle Lead-Quellen' },
          { name: 'source_filters', type: 'string[]', required: false, description: 'Array von Lead-Quellen-IDs' },
        ],
        response: `{ "id": "uuid", "name": "Meta-Leads Eskalation", "created_at": "2026-03-23T10:00:00.000Z" }`,
      },
    ],
  },
  {
    title: 'Eskalationsregeln',
    description: 'Regeln (If → Then) innerhalb von Eskalationsprozessen definieren.',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/escalation-rules', summary: 'Regeln abrufen', auth: true,
        description: 'Gibt alle Regeln eines Eskalationsprozesses zurück.',
        params: [
          { name: 'escalation_process_id', type: 'string', required: true, description: 'Eskalationsprozess-ID' },
        ],
        response: `{
  "data": [
    {
      "id": "uuid",
      "condition_type": "time_in_status",
      "condition_value": "3",
      "action_type": "send_notification",
      "action_value": "Lead seit 3 Tagen unbearbeitet",
      "delay_minutes": 0,
      "is_active": true,
      "test_only": false,
      "sort_order": 0
    }
  ]
}`,
      },
      {
        method: 'POST', path: '/api/v1/escalation-rules', summary: 'Regel erstellen', auth: true,
        description: 'Erstellt eine neue Regel. test_only=true aktiviert die Regel nur für Test-User.',
        body: [
          { name: 'escalation_process_id', type: 'string', required: true, description: 'Eskalationsprozess-ID' },
          { name: 'condition_type', type: 'string', required: true, description: 'Bedingung: time_in_status, source_match, no_activity, missing_data' },
          { name: 'condition_value', type: 'string', required: true, description: 'Bedingungswert (z.B. Tage)' },
          { name: 'action_type', type: 'string', required: true, description: 'Aktion: send_notification, change_status, assign_employee, create_task, send_email, trigger_wizard' },
          { name: 'action_value', type: 'string', required: true, description: 'Aktionswert' },
          { name: 'delay_minutes', type: 'number', required: false, description: 'Verzögerung in Minuten' },
          { name: 'sort_order', type: 'number', required: false, description: 'Reihenfolge / Priorität (Standard: 0)' },
          { name: 'test_only', type: 'boolean', required: false, description: 'Nur für Test-User aktiv (Standard: false)' },
        ],
        response: `{ "id": "uuid", "is_active": true, "test_only": false, "sort_order": 0 }`,
      },
    ],
  },
  {
    title: 'Wizard-Verknüpfungen',
    description: 'Wizards mit Eskalationsprozessen verknüpfen und konfigurieren.',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/escalation-wizard-links', summary: 'Wizard-Verknüpfungen abrufen', auth: true,
        description: 'Gibt alle Wizard-Verknüpfungen eines Eskalationsprozesses zurück.',
        params: [
          { name: 'escalation_process_id', type: 'string', required: true, description: 'Eskalationsprozess-ID' },
        ],
        response: `{
  "data": [
    {
      "id": "uuid",
      "wizard_id": "uuid",
      "start_step_id": "",
      "sort_order": 0,
      "delay_minutes": 0,
      "is_active": true,
      "test_only": false
    }
  ]
}`,
      },
      {
        method: 'POST', path: '/api/v1/escalation-wizard-links', summary: 'Wizard verknüpfen', auth: true,
        description: 'Verknüpft einen Wizard mit einem Eskalationsprozess. test_only=true aktiviert nur für Test-User.',
        body: [
          { name: 'escalation_process_id', type: 'string', required: true, description: 'Eskalationsprozess-ID' },
          { name: 'wizard_id', type: 'string', required: true, description: 'Wizard-ID' },
          { name: 'start_step_id', type: 'string', required: false, description: 'Optionaler Start-Step' },
          { name: 'sort_order', type: 'number', required: false, description: 'Reihenfolge' },
          { name: 'delay_minutes', type: 'number', required: false, description: 'Verzögerung vor Start (Minuten)' },
          { name: 'test_only', type: 'boolean', required: false, description: 'Nur für Test-User (Standard: false)' },
        ],
        response: `{ "id": "uuid", "is_active": true, "test_only": false }`,
      },
    ],
  },
  {
    title: 'Wizards',
    description: 'Wizard-Konfigurationen verwalten (Step-Builder für Lead-Funnels).',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/wizards', summary: 'Alle Wizards abrufen', auth: true,
        description: 'Gibt alle konfigurierten Wizards zurück. Filter nach Typ und Status möglich.',
        params: [
          { name: 'type', type: 'string', required: false, description: 'Filter: recruiting, sales, custom' },
          { name: 'status', type: 'string', required: false, description: 'Filter: active, inactive' },
        ],
        response: `{
  "data": [
    {
      "id": "uuid",
      "name": "SSM Recruit Assessment",
      "type": "recruiting",
      "status": "active",
      "version": "1.0",
      "steps": [
        { "id": "step-1", "type": "choice", "title": "Persönliche Fragen", "options": [...] }
      ]
    }
  ]
}`,
      },
    ],
  },
  {
    title: 'DISC / Insights',
    description: 'Persönlichkeitstest-Ergebnisse abrufen.',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/disc/:leadId', summary: 'DISC-Ergebnis abrufen', auth: true,
        description: 'Gibt das DISC-Persönlichkeitstest-Ergebnis eines Leads zurück.',
        params: [{ name: 'leadId', type: 'string', required: true, description: 'Lead-ID' }],
        response: `{
  "id": "disc-123",
  "leadId": "l1",
  "scores": { "D": 75, "I": 45, "S": 60, "C": 80 },
  "dominantType": "C",
  "completedAt": "2026-03-15T14:30:00.000Z"
}`,
      },
    ],
  },
];

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const curlExample = `curl -X ${endpoint.method} \\
  "${window.location.origin}${endpoint.path}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${endpoint.body ? ` \\
  -d '${JSON.stringify(Object.fromEntries(endpoint.body.filter(b => b.required).map(b => [b.name, b.type === 'number' ? 0 : `<${b.name}>`])), null, 2)}'` : ''}`;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
        <span className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-bold ${methodColors[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-foreground flex-1">{endpoint.path}</code>
        <div className="flex items-center gap-2">
          {endpoint.auth && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground hidden sm:inline">{endpoint.summary}</span>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 py-5 space-y-5">
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>

          {/* Parameters */}
          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Parameter</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 text-left"><th className="px-3 py-2 font-medium text-xs">Name</th><th className="px-3 py-2 font-medium text-xs">Typ</th><th className="px-3 py-2 font-medium text-xs">Pflicht</th><th className="px-3 py-2 font-medium text-xs">Beschreibung</th></tr></thead>
                  <tbody>
                    {endpoint.params.map(p => (
                      <tr key={p.name} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs text-primary">{p.name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.type}</td>
                        <td className="px-3 py-2">{p.required ? <span className="text-[10px] font-bold text-destructive">Ja</span> : <span className="text-[10px] text-muted-foreground">Nein</span>}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Request Body */}
          {endpoint.body && endpoint.body.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Request Body</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 text-left"><th className="px-3 py-2 font-medium text-xs">Feld</th><th className="px-3 py-2 font-medium text-xs">Typ</th><th className="px-3 py-2 font-medium text-xs">Pflicht</th><th className="px-3 py-2 font-medium text-xs">Beschreibung</th></tr></thead>
                  <tbody>
                    {endpoint.body.map(b => (
                      <tr key={b.name} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs text-primary">{b.name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{b.type}</td>
                        <td className="px-3 py-2">{b.required ? <span className="text-[10px] font-bold text-destructive">Ja</span> : <span className="text-[10px] text-muted-foreground">Nein</span>}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{b.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* cURL Example */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">cURL Beispiel</h4>
              <button onClick={() => copyCode(curlExample)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                <Copy className="h-3 w-3" /> Kopieren
              </button>
            </div>
            <pre className="rounded-lg bg-[hsl(var(--sidebar-background))] p-4 text-xs font-mono text-sidebar-foreground overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
          </div>

          {/* Response */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">Antwort (200 OK)</h4>
              <button onClick={() => copyCode(endpoint.response)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                {copiedResponse ? '✓ Kopiert' : <><Copy className="h-3 w-3" /> Kopieren</>}
              </button>
            </div>
            <pre className="rounded-lg bg-muted/50 border p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">{endpoint.response}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApiDocsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const filteredSections = apiSections.map(section => ({
    ...section,
    endpoints: section.endpoints.filter(ep =>
      !searchQuery ||
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.method.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(s => s.endpoints.length > 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" /> API-Dokumentation
          </h1>
          <p className="text-muted-foreground">Vollständige REST API Referenz für SSM Recruit</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-bold">v1.1</span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">REST / JSON</span>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Base URL</h3>
          </div>
          <code className="text-xs font-mono text-muted-foreground break-all">{window.location.origin}/api/v1</code>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Authentifizierung</h3>
          </div>
          <p className="text-xs text-muted-foreground">Bearer Token im Header:<br /><code className="text-primary">Authorization: Bearer API_KEY</code></p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Book className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Format</h3>
          </div>
          <p className="text-xs text-muted-foreground">JSON Request/Response<br /><code className="text-primary">Content-Type: application/json</code></p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Endpunkte durchsuchen (z.B. leads, POST, appointments)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-xl border bg-muted/50 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all"
        />
      </div>

      {/* Quick Nav */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {apiSections.map(s => (
          <button key={s.title} onClick={() => {
            setActiveSection(activeSection === s.title ? null : s.title);
            setSearchQuery('');
          }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeSection === s.title ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
            {s.title}
            <span className="ml-1.5 opacity-60">{s.endpoints.length}</span>
          </button>
        ))}
        {activeSection && (
          <button onClick={() => setActiveSection(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            Alle anzeigen ×
          </button>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {(activeSection ? filteredSections.filter(s => s.title === activeSection) : filteredSections).map(section => (
          <div key={section.title}>
            <div className="mb-3">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.endpoints.map(ep => (
                <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
              ))}
            </div>
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Code2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">Keine Endpunkte gefunden</p>
            <p className="text-xs">Passen Sie Ihre Suche an.</p>
          </div>
        )}
      </div>

      {/* Error Codes */}
      <div className="mt-10 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">HTTP Status Codes</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { code: '200', label: 'OK', desc: 'Erfolgreiche Anfrage', color: 'text-emerald-600' },
            { code: '201', label: 'Created', desc: 'Ressource erfolgreich erstellt', color: 'text-emerald-600' },
            { code: '400', label: 'Bad Request', desc: 'Ungültige Parameter oder fehlende Pflichtfelder', color: 'text-amber-600' },
            { code: '401', label: 'Unauthorized', desc: 'Fehlender oder ungültiger API-Schlüssel', color: 'text-red-600' },
            { code: '403', label: 'Forbidden', desc: 'Keine Berechtigung für diese Aktion', color: 'text-red-600' },
            { code: '404', label: 'Not Found', desc: 'Ressource nicht gefunden', color: 'text-amber-600' },
            { code: '429', label: 'Too Many Requests', desc: 'Rate-Limit überschritten (100 Req/Min)', color: 'text-orange-600' },
            { code: '500', label: 'Server Error', desc: 'Interner Serverfehler', color: 'text-red-600' },
          ].map(s => (
            <div key={s.code} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
              <span className={`font-mono text-sm font-bold ${s.color}`}>{s.code}</span>
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Rate Limiting</h2>
        <p className="text-sm text-muted-foreground mb-3">Alle API-Endpunkte unterliegen einem Rate-Limit. Die aktuellen Limits werden in den Response-Headern zurückgegeben:</p>
        <div className="rounded-lg bg-muted/50 border p-4 font-mono text-xs space-y-1">
          <p><span className="text-primary">X-RateLimit-Limit:</span> 100</p>
          <p><span className="text-primary">X-RateLimit-Remaining:</span> 97</p>
          <p><span className="text-primary">X-RateLimit-Reset:</span> 1742345678</p>
        </div>
      </div>
    </div>
  );
}

export default function ApiDocs() {
  return <ApiDocsContent />;
}
