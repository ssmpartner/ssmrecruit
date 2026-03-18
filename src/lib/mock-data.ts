export type LeadStatus = 'new' | 'contacted' | 'appointment' | 'interview' | 'hired' | 'rejected';
export type LeadSource = 'website' | 'tiktok' | 'meta' | 'linkedin' | 'csv_import';

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
}

export interface Appointment {
  id: string;
  leadId: string;
  title: string;
  date: string; // ISO date
  time: string; // HH:mm
  duration: number; // minutes
  type: 'phone' | 'video' | 'onsite';
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface Agency {
  id: string;
  name: string;
  contactEmail: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agency_manager' | 'employee';
  agencyId: string;
  avatar?: string;
}

export const statusConfig: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: 'Neuer Lead', color: 'bg-info text-info-foreground' },
  contacted: { label: 'Kontaktiert', color: 'bg-warning text-warning-foreground' },
  appointment: { label: 'Termin', color: 'bg-primary text-primary-foreground' },
  interview: { label: 'Interview', color: 'bg-accent text-accent-foreground' },
  hired: { label: 'Eingestellt', color: 'bg-success text-success-foreground' },
  rejected: { label: 'Abgelehnt', color: 'bg-destructive text-destructive-foreground' },
};

export const sourceConfig: Record<LeadSource, { label: string; icon: string }> = {
  website: { label: 'Website', icon: 'Globe' },
  tiktok: { label: 'TikTok', icon: 'Music' },
  meta: { label: 'Meta Ads', icon: 'Facebook' },
  linkedin: { label: 'LinkedIn', icon: 'Linkedin' },
  csv_import: { label: 'CSV Import', icon: 'FileSpreadsheet' },
};

export const agencies: Agency[] = [
  { id: 'a1', name: 'TechTalent Pro', contactEmail: 'info@techtalent.ch' },
  { id: 'a2', name: 'Digital Hire', contactEmail: 'hello@digitalhire.ch' },
  { id: 'a3', name: 'SwiftRecruit', contactEmail: 'team@swiftrecruit.ch' },
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

const positions = ['Frontend Developer', 'Backend Engineer', 'Product Manager', 'UX Designer', 'Data Analyst', 'DevOps Engineer', 'QA Engineer', 'Full Stack Developer', 'Marketing Manager', 'Sales Representative'];

const statuses: LeadStatus[] = ['new', 'contacted', 'appointment', 'interview', 'hired', 'rejected'];
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
  };
});
