// Platzhalter-Engine für Vertragsvorlagen
// Originalvorlagen bleiben unberührt – Platzhalter werden erst beim Generieren ersetzt.
// Erweitert: zentrale Gruppen + Metadaten (Pflicht, Gating nach Bereich/Zielgruppe).

export type ContractArea = 'sales' | 'office';
export type TargetGroupCode = string; // z.B. 'MA', 'FK', 'ID', 'PARTNER', 'LEAD'

export interface PlaceholderMeta {
  key: string;             // z.B. 'candidate.first_name'
  label: string;           // Anzeigename
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
    placeholders: [
      { key: 'candidate.first_name', label: 'Vorname', required: true },
      { key: 'candidate.last_name', label: 'Nachname', required: true },
      { key: 'candidate.full_name', label: 'Vollständiger Name' },
      { key: 'candidate.birth_date', label: 'Geburtsdatum' },
      { key: 'candidate.address', label: 'Adresse' },
      { key: 'candidate.zip', label: 'PLZ' },
      { key: 'candidate.city', label: 'Ort' },
      { key: 'candidate.email', label: 'E-Mail' },
      { key: 'candidate.phone', label: 'Telefon' },
    ],
  },
  {
    id: 'employment', label: 'Beschäftigung',
    placeholders: [
      { key: 'employment.start_date', label: 'Eintrittsdatum', required: true },
      { key: 'employment.old_start_date', label: 'Bisheriges Eintrittsdatum' },
      { key: 'employment.position', label: 'Position', required: true },
      { key: 'employment.level', label: 'Stufe' },
      { key: 'employment.department', label: 'Abteilung' },
      { key: 'employment.workload', label: 'Pensum' },
      { key: 'employment.salary_monthly', label: 'Monatslohn' },
      { key: 'employment.salary_yearly', label: 'Jahreslohn' },
      { key: 'employment.salary_13_months', label: 'Lohn (13 Monate)' },
      { key: 'employment.location', label: 'Arbeitsort' },
      { key: 'employment.agency', label: 'Agentur' },
      { key: 'employment.manager', label: 'Vorgesetzter' },
      { key: 'employment.probation_period', label: 'Probezeit' },
      { key: 'employment.notice_period', label: 'Kündigungsfrist' },
    ],
  },
  {
    id: 'careerplan', label: 'Vertrieb / Karriereplan',
    description: 'Nur bei Bereich = Vertrieb verwendbar.',
    placeholders: [
      { key: 'careerplan.level', label: 'Karriereplan-Stufe', areaScope: ['sales'] },
      { key: 'careerplan.role', label: 'Karriereplan-Rolle', areaScope: ['sales'] },
      { key: 'careerplan.score_point_value', label: 'Wert pro Score-Punkt', areaScope: ['sales'] },
      { key: 'careerplan.target_level', label: 'Zielstufe', areaScope: ['sales'] },
      { key: 'careerplan.commission_model', label: 'Provisionsmodell', areaScope: ['sales'] },
    ],
  },
  {
    id: 'leadership', label: 'Leadership',
    description: 'Nur bei Zielgruppe = FK verwendbar.',
    placeholders: [
      { key: 'leadership.type', label: 'Führungsart', targetGroups: ['FK'] },
      { key: 'leadership.allowance', label: 'Führungszulage', targetGroups: ['FK'] },
      { key: 'leadership.team_size', label: 'Teamgrösse', targetGroups: ['FK'] },
      { key: 'leadership.role', label: 'Führungsrolle', targetGroups: ['FK'] },
      { key: 'leadership.level', label: 'Führungsstufe', targetGroups: ['FK'] },
    ],
  },
  {
    id: 'company', label: 'Unternehmen',
    placeholders: [
      { key: 'company.name', label: 'Firmenname' },
      { key: 'company.address', label: 'Adresse' },
      { key: 'company.zip', label: 'PLZ' },
      { key: 'company.city', label: 'Ort' },
      { key: 'company.uid', label: 'UID-Nummer' },
      { key: 'company.phone', label: 'Telefon' },
      { key: 'company.email', label: 'E-Mail' },
    ],
  },
  {
    id: 'contract', label: 'Vertrag',
    placeholders: [
      { key: 'contract.date', label: 'Vertragsdatum' },
      { key: 'contract.place', label: 'Vertragsort' },
      { key: 'contract.version', label: 'Version' },
      { key: 'contract.language', label: 'Sprache' },
      { key: 'contract.type', label: 'Vertragstyp' },
    ],
  },
  {
    id: 'partner', label: 'Partner / Leadlieferant',
    description: 'Für Kooperationspartner / Leadlieferanten.',
    placeholders: [
      { key: 'partner.company_name', label: 'Firma', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.contact_person', label: 'Ansprechperson', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.address', label: 'Adresse', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.zip', label: 'PLZ', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.city', label: 'Ort', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.email', label: 'E-Mail', targetGroups: ['PARTNER', 'LEAD'] },
      { key: 'partner.phone', label: 'Telefon', targetGroups: ['PARTNER', 'LEAD'] },
    ],
  },
];

export const ALL_PLACEHOLDERS: PlaceholderMeta[] = PLACEHOLDER_GROUPS.flatMap(g => g.placeholders);
export const KNOWN_PLACEHOLDERS: string[] = ALL_PLACEHOLDERS.map(p => p.key);
export const PLACEHOLDER_META: Record<string, PlaceholderMeta> =
  Object.fromEntries(ALL_PLACEHOLDERS.map(p => [p.key, p]));

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
  leadership?: Record<string, unknown>;
  company?: Record<string, unknown>;
  contract?: Record<string, unknown>;
  partner?: Record<string, unknown>;
  manager?: Record<string, unknown>; // Legacy
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
  push('company', { ...DEFAULT_COMPANY, ...(ctx.company || {}) });
  push('contract', { date: new Date().toLocaleDateString('de-CH'), ...(ctx.contract || {}) });
  if (ctx.manager?.name && !flat['employment.manager']) {
    flat['employment.manager'] = String(ctx.manager.name);
  }
  if (area === 'sales') push('careerplan', ctx.careerplan);
  if (targetGroup === 'FK') push('leadership', ctx.leadership);
  if (targetGroup === 'PARTNER' || targetGroup === 'LEAD') push('partner', ctx.partner);

  // candidate.full_name automatisch ableiten
  if (!flat['candidate.full_name']) {
    const fn = flat['candidate.first_name'] || '';
    const ln = flat['candidate.last_name'] || '';
    flat['candidate.full_name'] = [fn, ln].filter(Boolean).join(' ');
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
