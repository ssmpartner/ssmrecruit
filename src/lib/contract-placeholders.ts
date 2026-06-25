// Platzhalter-Engine für Vertragsvorlagen
// Originalvorlage bleibt unberührt – Platzhalter werden erst beim Generieren ersetzt.

export type ContractArea = 'sales' | 'office';

export interface PlaceholderContext {
  candidate?: {
    first_name?: string | null;
    last_name?: string | null;
    address?: string | null;
    zip?: string | null;
    city?: string | null;
    birth_date?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  employment?: {
    start_date?: string | null;
    position?: string | null;
    level?: string | null;
    department?: string | null;
    workload?: string | null;
    salary?: string | null;
    commission_model?: string | null;
  };
  careerplan?: {
    level?: string | null;
    role?: string | null;
    target_level?: string | null;
  };
  company?: {
    name?: string | null;
    address?: string | null;
  };
  manager?: {
    name?: string | null;
  };
  contract?: {
    date?: string | null;
  };
}

export const DEFAULT_COMPANY = {
  name: 'SSM Partner AG',
  address: 'Schweiz',
};

const CAREERPLAN_KEYS = ['careerplan.level', 'careerplan.role', 'careerplan.target_level'];

/**
 * Ersetzt {{key}}-Platzhalter im HTML-Body. Bei Bereich = office werden
 * careerplan.*-Platzhalter entfernt (leerer String), nie ausgewertet.
 */
export function renderPlaceholders(
  bodyHtml: string,
  ctx: PlaceholderContext,
  area: ContractArea
): string {
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
  push('manager', ctx.manager);
  push('contract', { date: ctx.contract?.date ?? new Date().toLocaleDateString('de-CH') });

  if (area === 'sales') {
    push('careerplan', ctx.careerplan);
  } else {
    for (const k of CAREERPLAN_KEYS) flat[k] = '';
  }

  return bodyHtml.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_m, key) => {
    if (area === 'office' && key.startsWith('careerplan.')) return '';
    return flat[key] ?? `{{${key}}}`;
  });
}

export const KNOWN_PLACEHOLDERS = [
  'candidate.first_name', 'candidate.last_name', 'candidate.address', 'candidate.zip',
  'candidate.city', 'candidate.birth_date', 'candidate.email', 'candidate.phone',
  'employment.start_date', 'employment.position', 'employment.level', 'employment.department',
  'employment.workload', 'employment.salary', 'employment.commission_model',
  'careerplan.level', 'careerplan.role', 'careerplan.target_level',
  'company.name', 'company.address', 'manager.name', 'contract.date',
];

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
