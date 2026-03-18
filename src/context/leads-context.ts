import { createContext } from 'react';
import type {
  Lead,
  Employee,
  Agency,
  Appointment,
  AppointmentSettings,
  DiscResult,
  InsightsSettings,
} from '@/lib/mock-data';

export interface ActivityEntry {
  id: string;
  leadId: string;
  type: 'status_change' | 'assignment' | 'edit' | 'note' | 'appointment';
  description: string;
  user: string;
  timestamp: string;
}

export interface LeadsContextType {
  leads: Lead[];
  employees: Employee[];
  agencies: Agency[];
  activities: ActivityEntry[];
  appointments: Appointment[];
  discResults: DiscResult[];
  appointmentSettings: AppointmentSettings;
  insightsSettings: InsightsSettings;
  updateAppointmentSettings: (updates: Partial<AppointmentSettings>) => void;
  updateInsightsSettings: (updates: Partial<InsightsSettings>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  archiveLead: (id: string) => void;
  deleteLead: (id: string) => void;
  restoreLead: (id: string) => void;
  mergeLead: (keepId: string, removeId: string, mergedData: Partial<Lead>) => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addActivity: (leadId: string, type: ActivityEntry['type'], description: string) => void;
  addAppointment: (apt: Omit<Appointment, 'id' | 'createdAt' | 'meetingLink'>) => void;
  removeAppointment: (id: string) => void;
  sendAppointmentNotification: (appointmentId: string) => void;
  submitDiscTest: (leadId: string, answers: number[]) => void;
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  addAgency: (ag: Omit<Agency, 'id'>) => void;
  updateAgency: (id: string, updates: Partial<Agency>) => void;
  loading: boolean;
}

export const LeadsContext = createContext<LeadsContextType | null>(null);
