import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  leads as initialLeads,
  employees as initialEmployees,
  agencies as initialAgencies,
  type Lead,
  type LeadStatus,
  type Employee,
  type Agency,
  type Appointment,
  type NotificationMethod,
  type AppointmentSettings,
  defaultAppointmentSettings,
} from '@/lib/mock-data';

export interface ActivityEntry {
  id: string;
  leadId: string;
  type: 'status_change' | 'assignment' | 'edit' | 'note' | 'appointment';
  description: string;
  user: string;
  timestamp: string;
}

interface LeadsContextType {
  leads: Lead[];
  employees: Employee[];
  agencies: Agency[];
  activities: ActivityEntry[];
  appointments: Appointment[];
  appointmentSettings: AppointmentSettings;
  updateAppointmentSettings: (updates: Partial<AppointmentSettings>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addActivity: (leadId: string, type: ActivityEntry['type'], description: string) => void;
  addAppointment: (apt: Omit<Appointment, 'id' | 'createdAt' | 'meetingLink'>) => void;
  removeAppointment: (id: string) => void;
  sendAppointmentNotification: (appointmentId: string) => void;
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  addAgency: (ag: Omit<Agency, 'id'>) => void;
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error('useLeads must be inside LeadsProvider');
  return ctx;
}

function seedActivities(leads: Lead[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  leads.forEach((lead) => {
    entries.push({
      id: `act-${lead.id}-1`,
      leadId: lead.id,
      type: 'status_change',
      description: `Lead erstellt mit Status "Neuer Lead"`,
      user: 'System',
      timestamp: lead.createdAt,
    });
    if (lead.status !== 'new') {
      entries.push({
        id: `act-${lead.id}-2`,
        leadId: lead.id,
        type: 'status_change',
        description: `Status geändert zu "${lead.status}"`,
        user: 'Sarah Chen',
        timestamp: lead.updatedAt,
      });
    }
  });
  return entries;
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [agencies, setAgencies] = useState<Agency[]>(initialAgencies);
  const [activities, setActivities] = useState<ActivityEntry[]>(() => seedActivities(initialLeads));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentSettings, setAppointmentSettings] = useState<AppointmentSettings>(defaultAppointmentSettings);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const updateAppointmentSettings = useCallback((updates: Partial<AppointmentSettings>) => {
    setAppointmentSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const addActivity = useCallback((leadId: string, type: ActivityEntry['type'], description: string) => {
    setActivities(prev => [{
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      leadId,
      type,
      description,
      user: 'Sarah Chen',
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l));
    setSelectedLead(prev => prev && prev.id === id ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : prev);
  }, []);

  const addLead = useCallback((leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `l${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newLead: Lead = { ...leadData, id, createdAt: now, updatedAt: now };
    setLeads(prev => [newLead, ...prev]);
    addActivity(id, 'status_change', `Lead "${leadData.name}" manuell erfasst`);
  }, [addActivity]);

  function generateMeetingLink(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const seg = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    if (appointmentSettings.videoProvider === 'custom' && appointmentSettings.customVideoBaseUrl) {
      return `${appointmentSettings.customVideoBaseUrl.replace(/\/$/, '')}/recruitflow-${seg()}-${seg()}-${seg()}`;
    }
    return `https://meet.jit.si/recruitflow-${seg()}-${seg()}-${seg()}`;
  }

  const addAppointment = useCallback((aptData: Omit<Appointment, 'id' | 'createdAt' | 'meetingLink'>) => {
    const id = `apt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const meetingLink = aptData.type === 'video' ? generateMeetingLink() : undefined;
    const apt: Appointment = { ...aptData, id, meetingLink, createdAt: new Date().toISOString() };
    setAppointments(prev => [apt, ...prev]);
    const typeLabel = aptData.type === 'phone' ? 'Telefon' : aptData.type === 'video' ? 'Video' : 'Vor Ort';
    let desc = `Termin erstellt: ${aptData.title} (${typeLabel}, ${aptData.date} ${aptData.time})`;
    if (meetingLink) desc += ` – Link: ${meetingLink}`;
    addActivity(aptData.leadId, 'appointment', desc);
    // Auto-set status to appointment if still new/contacted
    const lead = leads.find(l => l.id === aptData.leadId);
    if (lead && (lead.status === 'new' || lead.status === 'contacted')) {
      updateLead(aptData.leadId, { status: 'appointment' });
      addActivity(aptData.leadId, 'status_change', `Status automatisch auf "Termin" gesetzt`);
    }
  }, [addActivity, leads, updateLead]);

  const removeAppointment = useCallback((id: string) => {
    setAppointments(prev => {
      const apt = prev.find(a => a.id === id);
      if (apt) {
        addActivity(apt.leadId, 'appointment', `Termin "${apt.title}" gelöscht`);
      }
      return prev.filter(a => a.id !== id);
    });
  }, [addActivity]);

  const addEmployee = useCallback((emp: Omit<Employee, 'id'>) => {
    const id = `e${Date.now()}`;
    setEmployees(prev => [...prev, { ...emp, id }]);
  }, []);

  const addAgency = useCallback((ag: Omit<Agency, 'id'>) => {
    const id = `a${Date.now()}`;
    setAgencies(prev => [...prev, { ...ag, id }]);
  }, []);

  const sendAppointmentNotification = useCallback((appointmentId: string) => {
    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) return;
    const lead = leads.find(l => l.id === apt.leadId);
    if (!lead) return;
    const methodLabels: Record<NotificationMethod, string> = { email: 'E-Mail', sms: 'SMS', whatsapp: 'WhatsApp' };
    addActivity(apt.leadId, 'note', `Termineinladung per ${methodLabels[notificationMethod]} an ${lead.name} gesendet (${apt.meetingLink ? 'mit Video-Link' : 'ohne Link'})`);
  }, [appointments, leads, notificationMethod, addActivity]);

  return (
    <LeadsContext.Provider value={{ leads, employees, agencies, activities, appointments, notificationMethod, setNotificationMethod, updateLead, addLead, addActivity, addAppointment, removeAppointment, sendAppointmentNotification, selectedLead, setSelectedLead, addEmployee, addAgency }}>
      {children}
    </LeadsContext.Provider>
  );
}
