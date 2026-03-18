export type LeadStatus = 'new' | 'contacted' | 'appointment' | 'interview' | 'hired' | 'rejected';
export type LeadSource = 'website' | 'tiktok' | 'meta' | 'linkedin' | 'csv_import';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  agencyId: string;
  employeeId: string;
  position: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
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
  new: { label: 'New Lead', color: 'bg-info text-info-foreground' },
  contacted: { label: 'Contacted', color: 'bg-warning text-warning-foreground' },
  appointment: { label: 'Appointment', color: 'bg-primary text-primary-foreground' },
  interview: { label: 'Interview', color: 'bg-accent text-accent-foreground' },
  hired: { label: 'Hired', color: 'bg-success text-success-foreground' },
  rejected: { label: 'Rejected', color: 'bg-destructive text-destructive-foreground' },
};

export const sourceConfig: Record<LeadSource, { label: string; icon: string }> = {
  website: { label: 'Website', icon: 'Globe' },
  tiktok: { label: 'TikTok', icon: 'Music' },
  meta: { label: 'Meta Ads', icon: 'Facebook' },
  linkedin: { label: 'LinkedIn', icon: 'Linkedin' },
  csv_import: { label: 'CSV Import', icon: 'FileSpreadsheet' },
};

export const agencies: Agency[] = [
  { id: 'a1', name: 'TechTalent Pro', contactEmail: 'info@techtalent.com' },
  { id: 'a2', name: 'Digital Hire', contactEmail: 'hello@digitalhire.com' },
  { id: 'a3', name: 'SwiftRecruit', contactEmail: 'team@swiftrecruit.com' },
];

export const employees: Employee[] = [
  { id: 'e1', name: 'Sarah Chen', email: 'sarah@company.com', role: 'admin', agencyId: 'a1' },
  { id: 'e2', name: 'Marcus Johnson', email: 'marcus@company.com', role: 'agency_manager', agencyId: 'a1' },
  { id: 'e3', name: 'Emily Rodriguez', email: 'emily@company.com', role: 'employee', agencyId: 'a2' },
  { id: 'e4', name: 'David Kim', email: 'david@company.com', role: 'employee', agencyId: 'a2' },
  { id: 'e5', name: 'Lisa Park', email: 'lisa@company.com', role: 'agency_manager', agencyId: 'a3' },
];

const names = ['Alex Thompson', 'Jordan Rivera', 'Casey Morgan', 'Taylor Swift', 'Riley Brooks', 'Morgan Lee', 'Jamie Foster', 'Quinn Adams', 'Avery Collins', 'Blake Turner', 'Cameron White', 'Drew Mitchell', 'Elliot Harper', 'Finley Scott', 'Harper Davis', 'Izzy Grant', 'Jesse Palmer', 'Kai Robinson', 'Logan Pierce', 'Mason Clarke'];

const positions = ['Frontend Developer', 'Backend Engineer', 'Product Manager', 'UX Designer', 'Data Analyst', 'DevOps Engineer', 'QA Engineer', 'Full Stack Developer', 'Marketing Manager', 'Sales Representative'];

const statuses: LeadStatus[] = ['new', 'contacted', 'appointment', 'interview', 'hired', 'rejected'];
const sources: LeadSource[] = ['website', 'tiktok', 'meta', 'linkedin', 'csv_import'];

export const leads: Lead[] = names.map((name, i) => ({
  id: `l${i + 1}`,
  name,
  email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
  phone: `+1 (555) ${String(100 + i).padStart(3, '0')}-${String(1000 + i * 37).slice(-4)}`,
  source: sources[i % sources.length],
  status: statuses[i % statuses.length],
  agencyId: agencies[i % agencies.length].id,
  employeeId: employees[i % employees.length].id,
  position: positions[i % positions.length],
  createdAt: new Date(2025, 2, 1 + i).toISOString(),
  updatedAt: new Date(2025, 2, 3 + i).toISOString(),
  notes: '',
}));
