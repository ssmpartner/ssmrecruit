import { useCallback, useState, type ReactNode } from 'react';
import {
  leads as initialLeads,
  employees as initialEmployees,
  agencies as initialAgencies,
  type Lead,
  type Employee,
  type Agency,
  type Appointment,
  type AppointmentSettings,
  type DiscResult,
  type DiscDimension,
  type InsightsSettings,
  discQuestions,
  defaultAppointmentSettings,
  defaultInsightsSettings,
  statusConfig,
} from '@/lib/mock-data';
import { LeadsContext, type ActivityEntry } from './leads-context';
import { useNotifications } from './useNotifications';

function seedActivities(leads: Lead[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  leads.forEach((lead) => {
    entries.push({
      id: `act-${lead.id}-1`,
      leadId: lead.id,
      type: 'status_change',
      description: 'Lead erstellt mit Status "Neuer Lead"',
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
  const { addNotification } = useNotifications();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [agencies, setAgencies] = useState<Agency[]>(initialAgencies);
  const [activities, setActivities] = useState<ActivityEntry[]>(() => seedActivities(initialLeads));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [discResults, setDiscResults] = useState<DiscResult[]>([]);
  const [appointmentSettings, setAppointmentSettings] = useState<AppointmentSettings>(defaultAppointmentSettings);
  const [insightsSettings, setInsightsSettings] = useState<InsightsSettings>(defaultInsightsSettings);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const updateAppointmentSettings = useCallback((updates: Partial<AppointmentSettings>) => {
    setAppointmentSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateInsightsSettings = useCallback((updates: Partial<InsightsSettings>) => {
    setInsightsSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const addActivity = useCallback((leadId: string, type: ActivityEntry['type'], description: string) => {
    setActivities((prev) => [{
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      leadId,
      type,
      description,
      user: 'Sarah Chen',
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    const updatedAt = new Date().toISOString();
    setLeads((prev) => {
      const old = prev.find((l) => l.id === id);
      if (old && updates.status && updates.status !== old.status) {
        addNotification({
          type: 'lead_status_change',
          title: 'Status geändert',
          description: `${old.name}: "${statusConfig[old.status].label}" → "${statusConfig[updates.status].label}"`,
          leadId: id,
        });
      }
      return prev.map((lead) => lead.id === id ? { ...lead, ...updates, updatedAt } : lead);
    });
    setSelectedLead((prev) => prev && prev.id === id ? { ...prev, ...updates, updatedAt } : prev);
  }, [addNotification]);

  const addLead = useCallback((leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `l${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newLead: Lead = { ...leadData, id, createdAt: now, updatedAt: now };
    setLeads((prev) => [newLead, ...prev]);
    addActivity(id, 'status_change', `Lead "${leadData.name}" manuell erfasst`);
    addNotification({ type: 'lead_new', title: 'Neuer Lead', description: `${leadData.name} wurde erfasst.`, leadId: id });
  }, [addActivity, addNotification]);

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
    const appointment: Appointment = {
      ...aptData,
      id,
      meetingLink,
      createdAt: new Date().toISOString(),
    };

    setAppointments((prev) => [appointment, ...prev]);

    const typeLabel = aptData.type === 'phone' ? 'Telefon' : aptData.type === 'video' ? 'Video' : 'Vor Ort';
    let description = `Termin erstellt: ${aptData.title} (${typeLabel}, ${aptData.date} ${aptData.time})`;
    if (meetingLink) description += ` – Link: ${meetingLink}`;
    addActivity(aptData.leadId, 'appointment', description);
    const lead2 = leads.find((e) => e.id === aptData.leadId);
    addNotification({ type: 'appointment_created', title: 'Termin erstellt', description: `${typeLabel}-Termin mit ${lead2?.name ?? 'Lead'} am ${aptData.date} um ${aptData.time}`, leadId: aptData.leadId });

    if (appointmentSettings.autoStatusChange) {
      const lead = leads.find((entry) => entry.id === aptData.leadId);
      if (lead && (lead.status === 'new' || lead.status === 'contacted')) {
        updateLead(aptData.leadId, { status: 'appointment' });
        addActivity(aptData.leadId, 'status_change', 'Status automatisch auf "Termin" gesetzt');
      }
    }
  }, [addActivity, appointmentSettings, leads, updateLead]);

  const removeAppointment = useCallback((id: string) => {
    setAppointments((prev) => {
      const appointment = prev.find((entry) => entry.id === id);
      if (appointment) {
        addActivity(appointment.leadId, 'appointment', `Termin "${appointment.title}" gelöscht`);
        addNotification({ type: 'appointment_cancelled', title: 'Termin gelöscht', description: `"${appointment.title}" wurde entfernt.`, leadId: appointment.leadId });
      }
      return prev.filter((entry) => entry.id !== id);
    });
  }, [addActivity]);

  const addEmployee = useCallback((employee: Omit<Employee, 'id'>) => {
    const id = `e${Date.now()}`;
    setEmployees((prev) => [...prev, { ...employee, id }]);
  }, []);

  const addAgency = useCallback((agency: Omit<Agency, 'id'>) => {
    const id = `a${Date.now()}`;
    setAgencies((prev) => [...prev, { ...agency, id }]);
  }, []);

  const submitDiscTest = useCallback((leadId: string, answers: number[]) => {
    const scores: Record<DiscDimension, number> = { D: 0, I: 0, S: 0, C: 0 };
    const counts: Record<DiscDimension, number> = { D: 0, I: 0, S: 0, C: 0 };

    discQuestions.forEach((question, index) => {
      scores[question.dimension] += answers[index] ?? 3;
      counts[question.dimension]++;
    });

    const normalized: Record<DiscDimension, number> = { D: 0, I: 0, S: 0, C: 0 };
    (Object.keys(scores) as DiscDimension[]).forEach((dimension) => {
      normalized[dimension] = Math.round((scores[dimension] / (counts[dimension] * 5)) * 100);
    });

    const dominantType = (Object.entries(normalized) as [DiscDimension, number][])
      .sort((a, b) => b[1] - a[1])[0][0];

    const result: DiscResult = {
      id: `disc-${Date.now()}`,
      leadId,
      scores: normalized,
      dominantType,
      completedAt: new Date().toISOString(),
      answers,
    };

    setDiscResults((prev) => [...prev, result]);
    addActivity(
      leadId,
      'note',
      `DISC-Persönlichkeitstest abgeschlossen – Typ: ${dominantType} (D:${normalized.D}% I:${normalized.I}% S:${normalized.S}% C:${normalized.C}%)`,
    );
  }, [addActivity]);

  const sendAppointmentNotification = useCallback((appointmentId: string) => {
    const appointment = appointments.find((entry) => entry.id === appointmentId);
    if (!appointment) return;

    const lead = leads.find((entry) => entry.id === appointment.leadId);
    if (!lead) return;

    const methodLabels = { email: 'E-Mail', sms: 'SMS', whatsapp: 'WhatsApp' } as const;
    addActivity(
      appointment.leadId,
      'note',
      `Termineinladung per ${methodLabels[appointmentSettings.notificationMethod]} an ${lead.name} gesendet (${appointment.meetingLink ? 'mit Video-Link' : 'ohne Link'})`,
    );
  }, [addActivity, appointmentSettings.notificationMethod, appointments, leads]);

  return (
    <LeadsContext.Provider
      value={{
        leads,
        employees,
        agencies,
        activities,
        appointments,
        discResults,
        appointmentSettings,
        insightsSettings,
        updateAppointmentSettings,
        updateInsightsSettings,
        updateLead,
        addLead,
        addActivity,
        addAppointment,
        removeAppointment,
        sendAppointmentNotification,
        submitDiscTest,
        selectedLead,
        setSelectedLead,
        addEmployee,
        addAgency,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
}
