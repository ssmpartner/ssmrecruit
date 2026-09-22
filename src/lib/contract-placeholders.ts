// Platzhalter-Engine für Vertragsvorlagen
// Originalvorlagen bleiben unberührt – Platzhalter werden erst beim Generieren ersetzt.
// Anzeige-Namen sind bewusst in Klartext ("Kandidat-Vorname"), die technischen Keys
// bleiben unverändert, damit bestehende Vorlagen weiterhin funktionieren.

export type ContractArea = 'sales' | 'office';
export type TargetGroupCode = string; // z.B. 'MA', 'FK', 'ID', 'PARTNER', 'LEAD'

export interface PlaceholderMeta {
  key: string;             // z.B. 'candidate.first_name'
  label: string;           // Anzeigename (Klartext)
  required?: boolean;      // Pflichtfeld beim Generieren
  areaScope?: ContractArea[]; // wenn gesetzt: nur in diesen Bereichen erlaubt
  targetGroups?: TargetGroupCode[]; // wenn gesetzt: nur für diese Zielgruppen
}

export interface PlaceholderGroup {
  id: string;
  label: string;
  description?: string;
  placeholders: PlaceholderMeta[];
}

export const PLACEHOLDER_GROUPS: PlaceholderGroup[] = [
  {
    id: 'candidate', label: 'Kandidat',
    description: 'Wird automatisch aus den Personalien übernommen.',
    placeholders: [
      { key: 'candidate.first_name', label: 'Kandidat-Vorname', required: true },
      { key: 'candidate.last_name', label: 'Kandidat-Nachname', required: true },
      { key: 'candidate.full_name', label: 'Kandidat-Voller Name' },
      { key: 'candidate.birth_date', label: 'Kandidat-Geburtsdatum' },
      { key: 'candidate.address', label: 'Kandidat-Adresse' },
      { key: 'candidate.zip', label: 'Kandidat-PLZ' },
      { key: 'candidate.city', label: 'Kandidat-Ort' },
      { key: 'candidate.email', label: 'Kandidat-E-Mail' },
      { key: 'candidate.phone', label: 'Kandidat-Telefon' },
    ],
  },
  {
    id: 'manager', label: 'Führungskraft / Zuständige Person',
    description: 'Wird automatisch aus der Zuweisung des Kandidaten übernommen.',
    placeholders: [
      { key: 'manager.first_name', label: 'Führungskraft-Vorname' },
      { key: 'manager.last_name', label: 'Führungskraft-Nachname' },
      { key: 'manager.full_name', label: 'Führungskraft-Voller Name' },
      { key: 'manager.role', label: 'Führungskraft-Funktion' },
      { key: 'manager.email', label: 'Führungskraft-E-Mail' },
      { key: 'manager.phone', label: 'Führungskraft-Telefon' },
      { key: 'manager.agency', label: 'Führungskraft-Agentur' },
    ],
  },
  {
    id: 'employment', label: 'Anstellung',
    placeholders: [
      { key: 'employment.start_date', label: 'Anstellung-Eintrittsdatum', required: true },
      { key: 'employment.old_start_date', label: 'Anstellung-Bisheriges Eintrittsdatum' },
      { key: 'employment.position', label: 'Anstellung-Position', required: true },
      { key: 'employment.level', label: 'Anstellung-Stufe' },
      { key: 'employment.department', label: 'Anstellung-Abteilung' },
      { key: 'employment.workload', label: 'Anstellung-Pensum' },
      { key: 'employment.salary_monthly', label: 'Anstellung-Monatslohn' },
      { key: 'employment.salary_yearly', label: 'Anstellung-Jahreslohn' },
      { key: 'employment.salary_13_months', label: 'Anstellung-13. Monatslohn' },
      { key: 'employment.location', label: 'Anstellung-Arbeitsort' },
      { key: 'employment.agency', label: 'Anstellung-Agentur' },
      { key: 'employment.manager', label: 'Anstellung-Vorgesetzter' },
      { key: 'employment.probation_period', label: 'Anstellung-Probezeit' },
      { key: 'employment.notice_period', label: 'Anstellung-Kündigungsfrist' },
    ],
  },
  {
    id: 'careerlevel', label: 'Karrierestufe (Lohn)',
    description: 'Wird automatisch aus Einstellungen › SSM Karriereplan übernommen.',
    placeholders: [
      { key: 'careerlevel.name', label: 'Karrierestufe-Bezeichnung' },
      { key: 'careerlevel.fix_salary', label: 'Karrierestufe-Fixlohn' },
      { key: 'careerlevel.expenses', label: 'Karrierestufe-Spesen' },
      { key: 'careerlevel.total_monthly', label: 'Karrierestufe-Fixlohn plus Spesen' },
      { key: 'careerlevel.score_points', label: 'Karrierestufe-Score-Punkte' },
      { key: 'careerlevel.requirements', label: 'Karrierestufe-Anforderungen' },
    ],
  },
  {
    id: 'careerplan', label: 'Karriereplan (Vertrieb)',
    description: 'Nur bei Bereich = Vertrieb verwendbar.',
    placeholders: [
      { key: 'careerplan.level', label: 'Karriereplan-Stufe', areaScope: ['sales'] },
      { key: 'careerplan.role', label: 'Karriereplan-Rolle', areaScope: ['sales'] },
      { key: 'careerplan.score_point_value', label: 'Karriereplan-Wert pro Score-Punkt', areaScope: ['sales'] },
      { key: 'careerplan.target_level', label: 'Karriereplan-Zielstufe', areaScope: ['sales'] },
      { key: 'careerplan.commission_model', label: 'Karriereplan-Provisionsmodell', areaScope: ['sales'] },
    ],
  },
  {
    id: 'leadership', label: 'Führungsfunktion',
    description: 'Nur bei Zielgruppe = Führungskraft verwendbar.',
    placeholders: [
      { key: 'leadership.type', label: 'Führung-Art', targetGroups: ['FK'] },
      { key: 'leadership.allowance', label: 'Führung-Zulage', targetGroups: ['FK'] },
      { key: 'leadership.team_size', label: 'Führung-Teamgrösse', targetGroups: ['FK'] },
      { key: 'leadership.role', label: 'Führung-Rolle', targetGroups: ['FK'] },
      { key: 'leadership.level', label: 'Führung-Stufe', targetGroups: ['FK'] },
    ],
  },
  {
    id: 'company', label: 'Firma',
    placeholders: [
      { key: 'company.name', label: 'Firma-Name' },
      { key: 'company.address', label: 'Firma-Adresse' },
      { key: 'company.zip', label: 'Firma-PLZ' },
      { key: 'company.city', label: 'Firma-Ort' },
      { key: 'company.uid', label: 'Firma-UID-Nummer' },
      { key: 'company.phone', label: 'Firma-Telefon' },
      { key: 'company.email', label: 'Firma-E-Mail' },
    ],
  },
  {
    id: 'contract', label: 'Vertrag',
    placeholders: [
      { key: 'contract.date', label: 'Vertrag-Datum' },
      { key: 'contract.place', label: 'Vertrag-Ort' },
      { key: 'contract.version', label: 'Vertrag-Version' },
      { key: 'contract.language', label: 'Vertrag-Sprache' },
      { key: 'contract.type', label: 'Vertrag-Art' },
    ],
  },
  {
    id: 'partner', label: 'Partner / Leadlieferant',
    description: 'Für Kooperationspartner / Leadlieferanten.',
    placeholders: [
      { key: 'partner.company_name', label: 'Partner-Firma', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.contact_person', label: 'Partner-Ansprechperson', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.address', label: 'Partner-Adresse', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.zip', label: 'Partner-PLZ', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.city', label: 'Partner-Ort', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.email', label: 'Partner-E-Mail', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.phone', label: 'Partner-Telefon', targetGroups: ['PARTNER', 'LEAD'] },
    ],
  },
];

export const ALL_PLACEHOLDERS: PlaceholderMeta[] = PLACEHOLDER_GROUPS.flatMap(g => g.placeholders);
export const KNOWN_PLACEHOLDERS: string[] = ALL_PLACEHOLDERS.map(p => p.key);
export const PLACEHOLDER_META: Record<string, PlaceholderMeta> =
  Object.fromEntries(ALL_PLACEHOLDERS.map(p => [p.key, p]));

/** Klartext-Name eines Platzhalters (Fallback: technischer Key). */
export function placeholderLabel(key: string): string {
  return PLACEHOLDER_META[key]?.label ?? key;
}

/** Beispielwerte für die Vorschau im Vorlagen-Editor. */
export const PLACEHOLDER_SAMPLES: Record<string, string> = {
  'candidate.first_name': 'Simon',
  'candidate.last_name': 'Gerber',
  'candidate.full_name': 'Simon Gerber',
  'candidate.birth_date': '14.03.1991',
  'candidate.address': 'Bahnhofstrasse 12',
  'candidate.zip': '8001',
  'candidate.city': 'Zürich',
  'candidate.email': 'simon.gerber@example.ch',
  'candidate.phone': '+41 79 123 45 67',
  'manager.first_name': 'Manuel',
  'manager.last_name': 'Gomes',
  'manager.full_name': 'Manuel Gomes',
  'manager.role': 'Agenturleiter',
  'manager.email': 'manuel.gomes@ssmpartner.ch',
  'manager.phone': '+41 44 000 00 00',
  'manager.agency': 'Hauptsitz',
  'employment.start_date': '01.11.2026',
  'employment.position': 'Versicherungsberater',
  'employment.level': 'Stufe 2',
  'employment.workload': '100 %',
  'employment.salary_monthly': "CHF 5'500",
  'employment.salary_yearly': "CHF 71'500",
  'employment.salary_13_months': 'Ja',
  'employment.location': 'Zürich',
  'employment.agency': 'Hauptsitz',
  'employment.manager': 'Manuel Gomes',
  'employment.probation_period': '3 Monate',
  'employment.notice_period': '1 Monat',
  'careerlevel.name': 'Versicherungsberater',
  'careerlevel.fix_salary': "CHF 4'500",
  'careerlevel.expenses': "CHF 1'000",
  'careerlevel.total_monthly': "CHF 5'500",
  'careerlevel.score_points': '120',
  'careerplan.level': 'Versicherungsberater',
  'careerplan.role': 'Versicherungsberater',
  'company.name': 'SSM Partner AG',
  'contract.date': new Date().toLocaleDateString('de-CH'),
  'contract.place': 'Zürich',
};

export const DEFAULT_COMPANY = {
  name: 'SSM Partner AG',
  address: 'Schweiz',
  zip: '',
  city: '',
  uid: '',
  phone: '',
  email: '',
};

export interface PlaceholderContext {
  candidate?: Record<string, unknown>;
  employment?: Record<string, unknown>;
  careerplan?: Record<string, unknown>;
  careerlevel?: Record<string, unknown>;
  leadership?: Record<string, unknown>;
  company?: Record<string, unknown>;
  contract?: Record<string, unknown>;
  partner?: Record<string, unknown>;
  manager?: Record<string, unknown>;
}

function buildFlat(ctx: PlaceholderContext, area: ContractArea, targetGroup?: TargetGroupCode): Record<string, string> {
  const flat: Record<string, string> = {};
  const push = (prefix: string, obj?: Record<string, unknown>) => {
    if (!obj) return;
    for (const [k, v] of Object.entries(obj)) {
      flat[`${prefix}.${k}`] = v == null ? '' : String(v);
    }
  };
  push('candidate', ctx.candidate);
  push('employment', ctx.employment);
  push('manager', ctx.manager);
  push('careerlevel', ctx.careerlevel);
  push('company', { ...DEFAULT_COMPANY, ...(ctx.company || {}) });
  push('contract', { date: new Date().toLocaleDateString('de-CH'), ...(ctx.contract || {}) });
  if (ctx.manager?.name && !flat['manager.full_name']) {
    flat['manager.full_name'] = String(ctx.manager.name);
  }
  if (flat['manager.full_name'] && !flat['employment.manager']) {
    flat['employment.manager'] = flat['manager.full_name'];
  }
  if (area === 'sales') push('careerplan', ctx.careerplan);
  if (targetGroup === 'FK') push('leadership', ctx.leadership);
  if (targetGroup === 'PARTNER' || targetGroup === 'LEAD') push('partner', ctx.partner);

  // Volle Namen automatisch ableiten
  const join = (a?: string, b?: string) => [a, b].filter(Boolean).join(' ');
  if (!flat['candidate.full_name']) {
    flat['candidate.full_name'] = join(flat['candidate.first_name'], flat['candidate.last_name']);
  }
  if (!flat['manager.full_name']) {
    flat['manager.full_name'] = join(flat['manager.first_name'], flat['manager.last_name']);
  }
  return flat;
}

/**
 * Ersetzt {{key}}-Platzhalter im HTML-Body unter Berücksichtigung des Bereichs
 * und der Zielgruppe. Nicht erlaubte Platzhalter (Gating) werden entfernt.
 */
export function renderPlaceholders(
  bodyHtml: string,
  ctx: PlaceholderContext,
  area: ContractArea,
  targetGroup?: TargetGroupCode,
): string {
  const flat = buildFlat(ctx, area, targetGroup);
  return bodyHtml.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_m, key) => {
    const meta = PLACEHOLDER_META[key];
    if (meta) {
      if (meta.areaScope && !meta.areaScope.includes(area)) return '';
      if (meta.targetGroups && targetGroup && !meta.targetGroups.includes(targetGroup)) return '';
    }
    return flat[key] ?? `{{${key}}}`;
  });
}

/** Ersetzt Platzhalter mit Beispielwerten – für die Vorschau im Vorlagen-Editor. */
export function renderSample(bodyHtml: string): string {
  return bodyHtml.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_m, key) =>
    PLACEHOLDER_SAMPLES[key] ?? placeholderLabel(key));
}

/** Extrahiert alle im Body verwendeten {{...}}-Schlüssel. */
export function extractUsedPlaceholders(bodyHtml: string): string[] {
  const set = new Set<string>();
  bodyHtml.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_m, key) => { set.add(key); return _m; });
  return Array.from(set);
}

/** Liefert die Liste an Pflichtplatzhaltern, die im Body verwendet werden,
 *  aber im Kontext leer sind. */
export function findMissingRequired(
  bodyHtml: string,
  ctx: PlaceholderContext,
  area: ContractArea,
  targetGroup?: TargetGroupCode,
): PlaceholderMeta[] {
  const used = new Set(extractUsedPlaceholders(bodyHtml));
  const flat = buildFlat(ctx, area, targetGroup);
  const missing: PlaceholderMeta[] = [];
  for (const meta of ALL_PLACEHOLDERS) {
    if (!meta.required) continue;
    if (!used.has(meta.key)) continue;
    if (meta.areaScope && !meta.areaScope.includes(area)) continue;
    if (meta.targetGroups && targetGroup && !meta.targetGroups.includes(targetGroup)) continue;
    if (!flat[meta.key] || flat[meta.key].trim() === '') missing.push(meta);
  }
  return missing;
}

/** Validiert, ob die im Body verwendeten Platzhalter zum Bereich/Zielgruppe passen. */
export function findDisallowedPlaceholders(
  bodyHtml: string,
  area: ContractArea,
  targetGroup?: TargetGroupCode,
): string[] {
  const used = extractUsedPlaceholders(bodyHtml);
  const bad: string[] = [];
  for (const key of used) {
    const meta = PLACEHOLDER_META[key];
    if (!meta) continue;
    if (meta.areaScope && !meta.areaScope.includes(area)) bad.push(key);
    else if (meta.targetGroups && targetGroup && !meta.targetGroups.includes(targetGroup)) bad.push(key);
  }
  return bad;
}

export const CAREERPLAN_LEVELS = [
  'Junior Versicherungsberater',
  'Versicherungsberater',
  'Senior Versicherungsberater',
  'Teamleiter',
  'Sales Leader',
  'General Agent',
];

export const CONTRACT_LANGUAGES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Französisch' },
  { value: 'it', label: 'Italienisch' },
  { value: 'en', label: 'Englisch' },
];

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  in_review: 'In Prüfung',
  finalized: 'Finalisiert',
  sent: 'Versendet',
  signed: 'Unterzeichnet',
  archived: 'Archiviert',
};

export const TEMPLATE_STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  active: 'Aktiv',
  archived: 'Archiviert',
};

export const AREA_LABELS: Record<ContractArea, string> = {
  sales: 'Vertrieb',
  office: 'Innendienst',
};
