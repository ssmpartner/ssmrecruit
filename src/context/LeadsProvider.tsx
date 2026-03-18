import { useCallback, useState, useEffect, type ReactNode } from 'react';
import {
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
import { supabase } from '@/integrations/supabase/client';

// Map DB row to app Lead type
function dbToLead(row: any): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    plz: row.plz,
    city: row.city,
    canton: row.canton,
    cantonCode: row.canton_code,
    source: row.source,
    status: row.status,
    agencyId: row.agency_id,
    employeeId: row.employee_id,
    position: row.position,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lifecycle: row.lead_lifecycle || 'active',
  };
}

function dbToEmployee(row: any): Employee {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    agencyId: row.agency_id,
    avatar: row.avatar ?? undefined,
  };
}

function dbToAgency(row: any): Agency {
  return {
    id: row.id,
    name: row.name,
    contactEmail: row.contact_email,
    region: row.region || '',
    language: row.language || 'de',
    allowedCantons: row.allowed_cantons || [],
  };
}

function dbToActivity(row: any): ActivityEntry {
  return {
    id: row.id,
    leadId: row.lead_id,
    type: row.type,
    description: row.description,
    user: row.user,
    timestamp: row.created_at,
  };
}

function dbToAppointment(row: any): Appointment {
  return {
    id: row.id,
    leadId: row.lead_id,
    title: row.title,
    date: row.date,
    time: row.time,
    duration: row.duration,
    type: row.type,
    meetingLink: row.meeting_link ?? undefined,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function dbToDiscResult(row: any): DiscResult {
  return {
    id: row.id,
    leadId: row.lead_id,
    scores: row.scores,
    dominantType: row.dominant_type,
    completedAt: row.completed_at,
    answers: row.answers,
  };
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { addNotification } = useNotifications();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [discResults, setDiscResults] = useState<DiscResult[]>([]);
  const [appointmentSettings, setAppointmentSettings] = useState<AppointmentSettings>(defaultAppointmentSettings);
  const [insightsSettings, setInsightsSettings] = useState<InsightsSettings>(defaultInsightsSettings);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  // Load all data from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [leadsRes, employeesRes, agenciesRes, activitiesRes, appointmentsRes, discRes, settingsRes] = await Promise.all([
          supabase.from('leads').select('*').order('created_at', { ascending: false }),
          supabase.from('employees').select('*'),
          supabase.from('agencies').select('*'),
          supabase.from('activities').select('*').order('created_at', { ascending: false }),
          supabase.from('appointments').select('*').order('created_at', { ascending: false }),
          supabase.from('disc_results').select('*'),
          supabase.from('app_settings').select('*'),
        ]);

        if (leadsRes.data) setLeads(leadsRes.data.map(dbToLead));
        if (employeesRes.data) setEmployees(employeesRes.data.map(dbToEmployee));
        if (agenciesRes.data) setAgencies(agenciesRes.data.map(dbToAgency));
        if (activitiesRes.data) setActivities(activitiesRes.data.map(dbToActivity));
        if (appointmentsRes.data) setAppointments(appointmentsRes.data.map(dbToAppointment));
        if (discRes.data) setDiscResults(discRes.data.map(dbToDiscResult));

        if (settingsRes.data) {
          const aptSetting = settingsRes.data.find(s => s.key === 'appointment');
          const insSetting = settingsRes.data.find(s => s.key === 'insights');
          if (aptSetting?.value) setAppointmentSettings({ ...defaultAppointmentSettings, ...(aptSetting.value as any) });
          if (insSetting?.value) setInsightsSettings({ ...defaultInsightsSettings, ...(insSetting.value as any) });
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const updateAppointmentSettings = useCallback(async (updates: Partial<AppointmentSettings>) => {
    const newSettings = { ...appointmentSettings, ...updates };
    setAppointmentSettings(newSettings);
    await supabase.from('app_settings').update({ value: newSettings as any }).eq('key', 'appointment');
  }, [appointmentSettings]);

  const updateInsightsSettings = useCallback(async (updates: Partial<InsightsSettings>) => {
    const newSettings = { ...insightsSettings, ...updates };
    setInsightsSettings(newSettings);
    await supabase.from('app_settings').update({ value: newSettings as any }).eq('key', 'insights');
  }, [insightsSettings]);

  const addActivity = useCallback(async (leadId: string, type: ActivityEntry['type'], description: string) => {
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: ActivityEntry = {
      id,
      leadId,
      type,
      description,
      user: 'Sarah Chen',
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [entry, ...prev]);
    await supabase.from('activities').insert({
      id,
      lead_id: leadId,
      type,
      description,
      user: 'Sarah Chen',
    });
  }, []);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
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

    // Map to DB columns
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.plz !== undefined) dbUpdates.plz = updates.plz;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.canton !== undefined) dbUpdates.canton = updates.canton;
    if (updates.cantonCode !== undefined) dbUpdates.canton_code = updates.cantonCode;
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.agencyId !== undefined) dbUpdates.agency_id = updates.agencyId;
    if (updates.employeeId !== undefined) dbUpdates.employee_id = updates.employeeId;
    if (updates.position !== undefined) dbUpdates.position = updates.position;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    await supabase.from('leads').update(dbUpdates).eq('id', id);
  }, [addNotification]);

  const checkForDuplicates = useCallback(async (newLead: Lead, allLeads: Lead[]) => {
    try {
      const activeLeads = allLeads.filter(l => l.lifecycle === 'active');
      if (activeLeads.length < 2) return;

      const leadsForScan = activeLeads.map(l => ({
        id: l.id, name: l.name, email: l.email, phone: l.phone,
        plz: l.plz, city: l.city, position: l.position,
      }));

      const { data, error } = await supabase.functions.invoke('detect-duplicates', {
        body: { leads: leadsForScan },
      });

      if (error || !data?.duplicates?.length) return;

      const relevantDups = data.duplicates.filter(
        (d: any) => d.leadId1 === newLead.id || d.leadId2 === newLead.id
      );

      for (const dup of relevantDups) {
        const otherId = dup.leadId1 === newLead.id ? dup.leadId2 : dup.leadId1;
        const otherLead = allLeads.find(l => l.id === otherId);
        addNotification({
          type: 'duplicate_detected',
          title: 'Mögliches Duplikat erkannt',
          description: `"${newLead.name}" und "${otherLead?.name || otherId}" (${dup.confidence}% Übereinstimmung): ${dup.reason}`,
          leadId: newLead.id,
        });
      }
    } catch (e) {
      console.error('Auto duplicate check failed:', e);
    }
  }, [addNotification]);

  const addLead = useCallback(async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `l${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newLead: Lead = { ...leadData, id, createdAt: now, updatedAt: now, lifecycle: leadData.lifecycle || 'active' };
    setLeads((prev) => {
      const updated = [newLead, ...prev];
      // Run duplicate check asynchronously after state update
      setTimeout(() => checkForDuplicates(newLead, updated), 100);
      return updated;
    });
    addActivity(id, 'status_change', `Lead "${leadData.name}" manuell erfasst`);
    addNotification({ type: 'lead_new', title: 'Neuer Lead', description: `${leadData.name} wurde erfasst.`, leadId: id });

    await supabase.from('leads').insert({
      id,
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      address: leadData.address,
      plz: leadData.plz,
      city: leadData.city,
      canton: leadData.canton,
      canton_code: leadData.cantonCode,
      source: leadData.source,
      status: leadData.status,
      agency_id: leadData.agencyId,
      employee_id: leadData.employeeId,
      position: leadData.position,
      notes: leadData.notes,
      lead_lifecycle: leadData.lifecycle || 'active',
    });
  }, [addActivity, addNotification, checkForDuplicates]);

  const archiveLead = useCallback(async (id: string) => {
    setLeads((prev) => prev.map(l => l.id === id ? { ...l, lifecycle: 'archived' as const } : l));
    const lead = leads.find(l => l.id === id);
    addActivity(id, 'status_change', `Lead "${lead?.name}" archiviert`);
    await supabase.from('leads').update({ lead_lifecycle: 'archived' }).eq('id', id);
  }, [addActivity, leads]);

  const deleteLead = useCallback(async (id: string) => {
    setLeads((prev) => prev.map(l => l.id === id ? { ...l, lifecycle: 'deleted' as const } : l));
    const lead = leads.find(l => l.id === id);
    addActivity(id, 'status_change', `Lead "${lead?.name}" gelöscht`);
    await supabase.from('leads').update({ lead_lifecycle: 'deleted' }).eq('id', id);
  }, [addActivity, leads]);

  const restoreLead = useCallback(async (id: string) => {
    setLeads((prev) => prev.map(l => l.id === id ? { ...l, lifecycle: 'active' as const } : l));
    const lead = leads.find(l => l.id === id);
    addActivity(id, 'status_change', `Lead "${lead?.name}" wiederhergestellt`);
    await supabase.from('leads').update({ lead_lifecycle: 'active' }).eq('id', id);
  }, [addActivity, leads]);

  const mergeLead = useCallback(async (keepId: string, removeId: string, mergedData: Partial<Lead>) => {
    // Update the kept lead with merged data
    updateLead(keepId, mergedData);
    // Mark the removed lead as deleted
    setLeads((prev) => prev.map(l => l.id === removeId ? { ...l, lifecycle: 'deleted' as const } : l));
    addActivity(keepId, 'edit', `Lead zusammengeführt (Duplikat ${removeId} entfernt)`);
    await supabase.from('leads').update({ lead_lifecycle: 'deleted' }).eq('id', removeId);
  }, [updateLead, addActivity]);

  function generateMeetingLink(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const seg = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    if (appointmentSettings.videoProvider === 'custom' && appointmentSettings.customVideoBaseUrl) {
      return `${appointmentSettings.customVideoBaseUrl.replace(/\/$/, '')}/recruitflow-${seg()}-${seg()}-${seg()}`;
    }
    return `https://meet.jit.si/recruitflow-${seg()}-${seg()}-${seg()}`;
  }

  const addAppointment = useCallback(async (aptData: Omit<Appointment, 'id' | 'createdAt' | 'meetingLink'>) => {
    const id = `apt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const meetingLink = aptData.type === 'video' ? generateMeetingLink() : undefined;
    const appointment: Appointment = { ...aptData, id, meetingLink, createdAt: new Date().toISOString() };

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

    await supabase.from('appointments').insert({
      id,
      lead_id: aptData.leadId,
      title: aptData.title,
      date: aptData.date,
      time: aptData.time,
      duration: aptData.duration,
      type: aptData.type,
      meeting_link: meetingLink,
      notes: aptData.notes,
      created_by: aptData.createdBy,
    });
  }, [addActivity, appointmentSettings, leads, updateLead, addNotification]);

  const removeAppointment = useCallback(async (id: string) => {
    setAppointments((prev) => {
      const appointment = prev.find((entry) => entry.id === id);
      if (appointment) {
        addActivity(appointment.leadId, 'appointment', `Termin "${appointment.title}" gelöscht`);
        addNotification({ type: 'appointment_cancelled', title: 'Termin gelöscht', description: `"${appointment.title}" wurde entfernt.`, leadId: appointment.leadId });
      }
      return prev.filter((entry) => entry.id !== id);
    });
    await supabase.from('appointments').delete().eq('id', id);
  }, [addActivity, addNotification]);

  const addEmployee = useCallback(async (employee: Omit<Employee, 'id'>) => {
    const id = `e${Date.now()}`;
    setEmployees((prev) => [...prev, { ...employee, id }]);
    await supabase.from('employees').insert({
      id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      agency_id: employee.agencyId,
      avatar: employee.avatar,
    });
  }, []);

  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.agencyId !== undefined) dbUpdates.agency_id = updates.agencyId;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
    await supabase.from('employees').update(dbUpdates).eq('id', id);
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    setEmployees((prev) => prev.filter(e => e.id !== id));
    await supabase.from('employees').delete().eq('id', id);
  }, []);

  const addAgency = useCallback(async (agency: Omit<Agency, 'id'>) => {
    const id = `a${Date.now()}`;
    setAgencies((prev) => [...prev, { ...agency, id }]);
    await supabase.from('agencies').insert({
      id,
      name: agency.name,
      contact_email: agency.contactEmail,
      region: agency.region || '',
      language: agency.language || 'de',
      allowed_cantons: agency.allowedCantons || [],
    });
  }, []);

  const updateAgency = useCallback(async (id: string, updates: Partial<Agency>) => {
    setAgencies((prev) => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
    if (updates.region !== undefined) dbUpdates.region = updates.region;
    if (updates.language !== undefined) dbUpdates.language = updates.language;
    if (updates.allowedCantons !== undefined) dbUpdates.allowed_cantons = updates.allowedCantons;
    await supabase.from('agencies').update(dbUpdates).eq('id', id);
  }, []);

  const submitDiscTest = useCallback(async (leadId: string, answers: number[]) => {
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

    const id = `disc-${Date.now()}`;
    const result: DiscResult = {
      id,
      leadId,
      scores: normalized,
      dominantType,
      completedAt: new Date().toISOString(),
      answers,
    };

    setDiscResults((prev) => [...prev, result]);
    const lead = leads.find((e) => e.id === leadId);
    addActivity(leadId, 'note', `DISC-Persönlichkeitstest abgeschlossen – Typ: ${dominantType} (D:${normalized.D}% I:${normalized.I}% S:${normalized.S}% C:${normalized.C}%)`);
    addNotification({ type: 'disc_completed', title: 'DISC-Test abgeschlossen', description: `${lead?.name ?? 'Lead'} – Typ: ${dominantType}`, leadId });

    await supabase.from('disc_results').insert({
      id,
      lead_id: leadId,
      scores: normalized as any,
      dominant_type: dominantType,
      answers: answers as any,
    });
  }, [addActivity, addNotification, leads]);

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
        archiveLead,
        deleteLead,
        restoreLead,
        mergeLead,
        addLead,
        addActivity,
        addAppointment,
        removeAppointment,
        sendAppointmentNotification,
        submitDiscTest,
        selectedLead,
        setSelectedLead,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addAgency,
        updateAgency,
        loading,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
}
