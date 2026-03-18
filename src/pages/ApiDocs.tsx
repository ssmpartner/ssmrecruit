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
    title: 'Webhooks',
    description: 'Eingehende Webhooks für externe Lead-Quellen.',
    endpoints: [
      {
        method: 'POST', path: '/api/v1/webhooks/leads', summary: 'Lead per Webhook erstellen', auth: true,
        description: 'Empfängt Lead-Daten von externen Quellen wie Meta Ads, TikTok, oder Zapier. Unterstützt flexible Feldnamen.',
        body: [
          { name: 'name', type: 'string', required: true, description: 'Name (auch full_name akzeptiert)' },
          { name: 'email', type: 'string', required: true, description: 'E-Mail-Adresse' },
          { name: 'phone', type: 'string', required: false, description: 'Telefonnummer' },
          { name: 'source', type: 'string', required: false, description: 'Quelle (Standard: website)' },
          { name: 'platform', type: 'string', required: false, description: 'Alternativ zu source für Meta/TikTok' },
        ],
        response: `{ "success": true, "leadId": "l1742345678-abc1" }`,
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
          <p className="text-muted-foreground">Vollständige REST API Referenz für RecruitFlow</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-bold">v1.0</span>
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
