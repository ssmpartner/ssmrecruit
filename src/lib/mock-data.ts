export type LeadStatus = 'new' | 'contacted' | 'appointment' | 'follow_up' | 'hired' | 'rejected';

export type DiscDimension = 'D' | 'I' | 'S' | 'C';

export interface DiscResult {
  id: string;
  leadId: string;
  scores: Record<DiscDimension, number>; // 0-100
  dominantType: DiscDimension;
  completedAt: string;
  answers: number[]; // raw answers
}

export const discDimensionConfig: Record<DiscDimension, { label: string; fullLabel: string; color: string; description: string }> = {
  D: { label: 'D', fullLabel: 'Dominant', color: 'bg-red-100 text-red-700 border-red-200', description: 'Ergebnisorientiert, entschlossen, direkt, wettbewerbsfähig' },
  I: { label: 'I', fullLabel: 'Initiativ', color: 'bg-amber-100 text-amber-700 border-amber-200', description: 'Enthusiastisch, optimistisch, kooperativ, kontaktfreudig' },
  S: { label: 'S', fullLabel: 'Stetig', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', description: 'Geduldig, zuverlässig, teamorientiert, ruhig' },
  C: { label: 'C', fullLabel: 'Gewissenhaft', color: 'bg-blue-100 text-blue-700 border-blue-200', description: 'Analytisch, genau, systematisch, qualitätsbewusst' },
};

export const discQuestions: { text: string; dimension: DiscDimension }[] = [
  { text: 'Ich treffe Entscheidungen schnell und entschlossen.', dimension: 'D' },
  { text: 'Ich arbeite gerne mit anderen Menschen zusammen und bin gesellig.', dimension: 'I' },
  { text: 'Ich bevorzuge ein stabiles und vorhersehbares Arbeitsumfeld.', dimension: 'S' },
  { text: 'Ich achte auf Details und arbeite sehr genau.', dimension: 'C' },
  { text: 'Ich übernehme gerne die Führung in Gruppen.', dimension: 'D' },
  { text: 'Ich kann andere leicht begeistern und motivieren.', dimension: 'I' },
  { text: 'Ich bin geduldig und höre anderen aufmerksam zu.', dimension: 'S' },
  { text: 'Ich plane sorgfältig, bevor ich handle.', dimension: 'C' },
  { text: 'Herausforderungen spornen mich an.', dimension: 'D' },
  { text: 'Ich kommuniziere offen und ausdrucksstark.', dimension: 'I' },
  { text: 'Konflikte versuche ich zu vermeiden und Harmonie zu bewahren.', dimension: 'S' },
  { text: 'Ich hinterfrage Dinge kritisch und prüfe Fakten.', dimension: 'C' },
];
export type LeadSource = string;

export type LeadLifecycle = 'active' | 'archived' | 'deleted';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  plz: string;
  city: string;
  canton: string;
  cantonCode: string;
  source: LeadSource;
  status: LeadStatus;
  agencyId: string;
  employeeId: string;
  position: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
  campaign: string;
  lifecycle: LeadLifecycle;
}

export interface Appointment {
  id: string;
  leadId: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  type: 'phone' | 'video' | 'onsite';
  meetingLink?: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export type NotificationMethod = 'email' | 'sms' | 'whatsapp';

export interface AppointmentSettings {
  defaultDuration: number;
  defaultType: 'phone' | 'video' | 'onsite';
  autoStatusChange: boolean;
  videoProvider: 'jitsi' | 'custom';
  customVideoBaseUrl: string;
  displayName: string;
  prejoinEnabled: boolean;
  startWithAudioMuted: boolean;
  startWithVideoMuted: boolean;
  enableRecording: boolean;
  enableScreensharing: boolean;
  enableChat: boolean;
  enableTileView: boolean;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  autoSendInvite: boolean;
  notificationMethod: NotificationMethod;
  inviteMessageTemplate: string;
}

export interface InsightsSettings {
  autoStatusAfterComplete: boolean;
  introText: string;
  showDetailedResults: boolean;
  allowRetake: boolean;
  requiredBeforeInterview2: boolean;
}

export const defaultInsightsSettings: InsightsSettings = {
  autoStatusAfterComplete: true,
  introText: 'Bitte beantworten Sie die folgenden Fragen ehrlich und spontan. Es gibt keine richtigen oder falschen Antworten.',
  showDetailedResults: true,
  allowRetake: false,
  requiredBeforeInterview2: true,
};

export const defaultAppointmentSettings: AppointmentSettings = {
  defaultDuration: 30,
  defaultType: 'video',
  autoStatusChange: true,
  videoProvider: 'jitsi',
  customVideoBaseUrl: '',
  displayName: 'Mitarbeiter',
  prejoinEnabled: false,
  startWithAudioMuted: false,
  startWithVideoMuted: false,
  enableRecording: true,
  enableScreensharing: true,
  enableChat: true,
  enableTileView: true,
  reminderEnabled: true,
  reminderMinutesBefore: 15,
  autoSendInvite: false,
  notificationMethod: 'email',
  inviteMessageTemplate: 'Guten Tag {name},\n\nSie haben einen Termin am {date} um {time} Uhr.\n\n{link}\n\nFreundliche Grüsse\n{company}',
};


export interface Agency {
  id: string;
  name: string;
  contactEmail: string;
  region: string;
  language: string;
  allowedCantons: string[];
  color: string;
}

export const AGENCY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
  '#84CC16', '#E11D48',
] as const;

export const SWISS_CANTONS = [
  { code: 'AG', name: 'Aargau' }, { code: 'AI', name: 'Appenzell I.Rh.' }, { code: 'AR', name: 'Appenzell A.Rh.' },
  { code: 'BE', name: 'Bern' }, { code: 'BL', name: 'Basel-Landschaft' }, { code: 'BS', name: 'Basel-Stadt' },
  { code: 'FR', name: 'Freiburg' }, { code: 'GE', name: 'Genf' }, { code: 'GL', name: 'Glarus' },
  { code: 'GR', name: 'Graubünden' }, { code: 'JU', name: 'Jura' }, { code: 'LU', name: 'Luzern' },
  { code: 'NE', name: 'Neuenburg' }, { code: 'NW', name: 'Nidwalden' }, { code: 'OW', name: 'Obwalden' },
  { code: 'SG', name: 'St. Gallen' }, { code: 'SH', name: 'Schaffhausen' }, { code: 'SO', name: 'Solothurn' },
  { code: 'SZ', name: 'Schwyz' }, { code: 'TG', name: 'Thurgau' }, { code: 'TI', name: 'Tessin' },
  { code: 'UR', name: 'Uri' }, { code: 'VD', name: 'Waadt' }, { code: 'VS', name: 'Wallis' },
  { code: 'ZG', name: 'Zug' }, { code: 'ZH', name: 'Zürich' },
] as const;

export const AGENCY_LANGUAGES = [
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Französisch' },
  { code: 'it', name: 'Italienisch' },
  { code: 'en', name: 'Englisch' },
] as const;

export const AGENCY_REGIONS = [
  'Deutschschweiz', 'Westschweiz', 'Tessin', 'Gesamtschweiz',
] as const;

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agency_manager' | 'employee';
  agencyId: string;
  avatar?: string;
}

// Ordered status flow for employees
export const statusFlow: LeadStatus[] = ['new', 'contacted', 'appointment', 'interview_1', 'insights', 'interview_2', 'hired', 'rejected'];

export function getAllowedNextStatuses(currentStatus: LeadStatus, isAdmin: boolean): LeadStatus[] {
  if (isAdmin) return statusFlow;
  const flowMap: Record<LeadStatus, LeadStatus[]> = {
    new: ['contacted'],
    contacted: ['appointment'],
    appointment: ['interview_1', 'rejected'],
    interview_1: ['insights', 'rejected'],
    insights: ['interview_2', 'rejected'],
    interview_2: ['hired', 'rejected'],
    hired: [],
    rejected: [],
  };
  return flowMap[currentStatus] || [];
}

export const statusConfig: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: 'Neuer Lead', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  contacted: { label: 'Kontaktiert', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  appointment: { label: 'Terminiert', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  interview_1: { label: 'Gespräch 1', color: 'bg-violet-50 text-violet-700 border border-violet-200' },
  insights: { label: 'Insights', color: 'bg-orange-50 text-orange-700 border border-orange-200' },
  interview_2: { label: 'Gespräch 2', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  hired: { label: 'Eingestellt', color: 'bg-green-50 text-green-700 border border-green-200' },
  rejected: { label: 'Abgelehnt', color: 'bg-red-50 text-red-700 border border-red-200' },
};

export const sourceConfig: Record<LeadSource, { label: string; icon: string }> = {
  website: { label: 'Webseite', icon: 'Globe' },
  tiktok: { label: 'TikTok', icon: 'Music' },
  meta: { label: 'Meta Ads', icon: 'Facebook' },
  linkedin: { label: 'LinkedIn', icon: 'Linkedin' },
  csv_import: { label: 'CSV Import', icon: 'FileSpreadsheet' },
};

export const agencies: Agency[] = [
  { id: 'a1', name: 'Agentur Unteren-Schönbühl', contactEmail: 'info@agentur-schoenbuehl.ch', region: 'Deutschschweiz', language: 'de', allowedCantons: ['BE', 'SO'], color: '#3B82F6' },
  { id: 'a2', name: 'Agentur Rothenburg', contactEmail: 'info@agentur-rothenburg.ch', region: 'Deutschschweiz', language: 'de', allowedCantons: ['LU', 'NW', 'OW'], color: '#10B981' },
  { id: 'a3', name: 'Agentur Regensdorf', contactEmail: 'info@agentur-regensdorf.ch', region: 'Deutschschweiz', language: 'de', allowedCantons: ['ZH', 'AG'], color: '#F59E0B' },
  { id: 'a4', name: 'Agentur Spreitenbach', contactEmail: 'info@agentur-spreitenbach.ch', region: 'Deutschschweiz', language: 'de', allowedCantons: ['AG', 'ZH'], color: '#EF4444' },
  { id: 'a5', name: 'Agentur Adliswil', contactEmail: 'info@agentur-adliswil.ch', region: 'Deutschschweiz', language: 'de', allowedCantons: ['ZH', 'ZG', 'SZ'], color: '#8B5CF6' },
  { id: 'a6', name: 'Agentur Olten', contactEmail: 'info@agentur-olten.ch', region: 'Deutschschweiz', language: 'de', allowedCantons: ['SO', 'BE', 'AG'], color: '#EC4899' },
  { id: 'a7', name: 'Agentur Lugano', contactEmail: 'info@agentur-lugano.ch', region: 'Tessin', language: 'it', allowedCantons: ['TI'], color: '#06B6D4' },
];

export const employees: Employee[] = [
  { id: 'e1', name: 'Sarah Chen', email: 'sarah@company.ch', role: 'admin', agencyId: 'a1' },
  { id: 'e2', name: 'Marcus Johnson', email: 'marcus@company.ch', role: 'agency_manager', agencyId: 'a1' },
  { id: 'e3', name: 'Emily Rodriguez', email: 'emily@company.ch', role: 'employee', agencyId: 'a2' },
  { id: 'e4', name: 'David Kim', email: 'david@company.ch', role: 'employee', agencyId: 'a2' },
  { id: 'e5', name: 'Lisa Park', email: 'lisa@company.ch', role: 'agency_manager', agencyId: 'a3' },
];

const swissNames = [
  'Lukas Müller', 'Anna Meier', 'Thomas Schneider', 'Laura Fischer', 'Michael Brunner',
  'Sophie Weber', 'Daniel Schmid', 'Nina Keller', 'Patrick Huber', 'Julia Steiner',
  'Marco Zimmermann', 'Lena Gerber', 'Stefan Baumgartner', 'Sarah Hofmann', 'Fabian Wyss',
  'Claudia Berger', 'Simon Moser', 'Andrea Frei', 'Christian Roth', 'Michelle Baumann',
];

const swissLeadData = [
  { plz: '8001', city: 'Zürich', canton: 'Zürich', cantonCode: 'ZH', address: 'Bahnhofstrasse 42' },
  { plz: '3000', city: 'Bern', canton: 'Bern', cantonCode: 'BE', address: 'Bundesgasse 15' },
  { plz: '4001', city: 'Basel', canton: 'Basel-Stadt', cantonCode: 'BS', address: 'Freie Strasse 8' },
  { plz: '6000', city: 'Luzern', canton: 'Luzern', cantonCode: 'LU', address: 'Pilatusstrasse 22' },
  { plz: '9000', city: 'St. Gallen', canton: 'St. Gallen', cantonCode: 'SG', address: 'Multergasse 5' },
  { plz: '8400', city: 'Winterthur', canton: 'Zürich', cantonCode: 'ZH', address: 'Marktgasse 12' },
  { plz: '1200', city: 'Genève', canton: 'Genf', cantonCode: 'GE', address: 'Rue du Rhône 30' },
  { plz: '1000', city: 'Lausanne', canton: 'Waadt', cantonCode: 'VD', address: 'Place de la Gare 7' },
  { plz: '5000', city: 'Aarau', canton: 'Aargau', cantonCode: 'AG', address: 'Rathausgasse 3' },
  { plz: '6300', city: 'Zug', canton: 'Zug', cantonCode: 'ZG', address: 'Baarerstrasse 18' },
  { plz: '6900', city: 'Lugano', canton: 'Tessin', cantonCode: 'TI', address: 'Via Nassa 14' },
  { plz: '7000', city: 'Chur', canton: 'Graubünden', cantonCode: 'GR', address: 'Grabenstrasse 9' },
  { plz: '8500', city: 'Frauenfeld', canton: 'Thurgau', cantonCode: 'TG', address: 'Zürcherstrasse 25' },
  { plz: '4500', city: 'Solothurn', canton: 'Solothurn', cantonCode: 'SO', address: 'Hauptgasse 11' },
  { plz: '1700', city: 'Fribourg', canton: 'Freiburg', cantonCode: 'FR', address: 'Rue de Romont 6' },
  { plz: '8200', city: 'Schaffhausen', canton: 'Schaffhausen', cantonCode: 'SH', address: 'Vordergasse 20' },
  { plz: '1950', city: 'Sion', canton: 'Wallis', cantonCode: 'VS', address: 'Avenue de la Gare 4' },
  { plz: '2000', city: 'Neuchâtel', canton: 'Neuenburg', cantonCode: 'NE', address: 'Rue du Seyon 12' },
  { plz: '6430', city: 'Schwyz', canton: 'Schwyz', cantonCode: 'SZ', address: 'Herrengasse 7' },
  { plz: '8610', city: 'Uster', canton: 'Zürich', cantonCode: 'ZH', address: 'Bankstrasse 16' },
];

const positions = ['Frontend Entwickler', 'Backend Ingenieur', 'Projektleiter', 'UX Designer', 'Datenanalyst', 'DevOps Ingenieur', 'QA Ingenieur', 'Fullstack Entwickler', 'Marketing Manager', 'Verkaufsberater'];

const statuses: LeadStatus[] = ['new', 'contacted', 'appointment', 'interview_1', 'interview_2', 'hired', 'rejected'];
const sources: LeadSource[] = ['website', 'tiktok', 'meta', 'linkedin', 'csv_import'];

export const leads: Lead[] = swissNames.map((name, i) => {
  const loc = swissLeadData[i % swissLeadData.length];
  const phoneNum = `+41 ${['44', '31', '61', '41', '71', '52', '22', '21', '62', '43'][i % 10]} ${String(100 + i * 13).slice(-3)} ${String(10 + i * 7).slice(-2)} ${String(10 + i * 3).slice(-2)}`;
  return {
    id: `l${i + 1}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.').replace('ü', 'ue').replace('ö', 'oe').replace('ä', 'ae')}@email.ch`,
    phone: phoneNum,
    address: loc.address,
    plz: loc.plz,
    city: loc.city,
    canton: loc.canton,
    cantonCode: loc.cantonCode,
    source: sources[i % sources.length],
    status: statuses[i % statuses.length],
    agencyId: agencies[i % agencies.length].id,
    employeeId: employees[i % employees.length].id,
    position: positions[i % positions.length],
    createdAt: new Date(2025, 2, 1 + i).toISOString(),
    updatedAt: new Date(2025, 2, 3 + i).toISOString(),
    notes: '',
    campaign: '',
    lifecycle: 'active' as LeadLifecycle,
  };
});
