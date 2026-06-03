import { useCallback, useState, useEffect, useMemo, type ReactNode } from 'react';
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
import { LeadsContext, type ActivityEntry, type LeadSourceConfig } from './leads-context';
import { useNotifications } from './useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

// Map DB row to app Lead type
function dbToLead(row: any): Lead {
  return {
    id: row.id,
    name: row.name,
    salutation: row.salutation || '',
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
    campaign: row.campaign || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lifecycle: row.lead_lifecycle || 'active',
    approvalStage: row.approval_stage || '',
    approvalStatus: row.approval_status || '',
    approvalHistory: Array.isArray(row.approval_history) ? row.approval_history : [],
    approvedByRole: row.approved_by_role || '',
    isRead: row.is_read ?? false,
    assignedApproverUserId: row.assigned_approver_user_id ?? null,
    assignedApproverRole: row.assigned_approver_role || '',
    altEmail: row.alt_email || '',
    altPhone: row.alt_phone || '',
    birthDate: row.birth_date || '',
    isDemo: row.is_demo ?? false,
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
    canReceiveLeads: row.can_receive_leads ?? true,
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
    color: row.color || '#6B7280',
    address: row.address || '',
    plz: row.plz || '',
    city: row.city || '',
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    radiusKm: row.radius_km ?? 30,
    monthlyLeadQuota: row.monthly_lead_quota ?? null,
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
  const { profile, user, role, isSuperadmin } = useAuth();
  const currentUserName = profile?.display_name || 'System';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [discResults, setDiscResults] = useState<DiscResult[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSourceConfig[]>([]);
  const [appointmentSettings, setAppointmentSettings] = useState<AppointmentSettings>(defaultAppointmentSettings);
  const [insightsSettings, setInsightsSettings] = useState<InsightsSettings>(defaultInsightsSettings);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadLeadSources = useCallback(async () => {
    const { data } = await supabase.from('lead_sources').select('*').order('sort_order');
    if (data) setLeadSources(data.map((r: any) => ({ id: r.id, label: r.label, icon: r.icon, color: r.color || '#6B7280', sortOrder: r.sort_order })));
  }, []);

  // Fetch all rows from a table, paginating past the 1000-row default limit
  const fetchAll = useCallback(async (table: 'leads' | 'activities' | 'appointments', orderCol = 'created_at', ascending = false) => {
    const PAGE = 1000;
    let page = 0;
    let allRows: any[] = [];
    let done = false;
    while (!done) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(orderCol, { ascending })
        .range(page * PAGE, (page + 1) * PAGE - 1);
      if (error || !data || data.length === 0) { done = true; break; }
      allRows = allRows.concat(data);
      if (data.length < PAGE) done = true;
      page++;
    }
    return allRows;
  }, []);

  // Load all data from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [leadsData, employeesRes, agenciesRes, activitiesData, appointmentsRes, discRes, settingsRes, sourcesRes] = await Promise.all([
          fetchAll('leads', 'created_at', false),
          supabase.from('employees').select('*'),
          supabase.from('agencies').select('*'),
          fetchAll('activities', 'created_at', false),
          fetchAll('appointments', 'created_at', false),
          supabase.from('disc_results').select('*'),
          supabase.from('app_settings').select('*'),
          supabase.from('lead_sources').select('*').order('sort_order'),
        ]);

        if (leadsData) setLeads(leadsData.map(dbToLead));
        if (employeesRes.data) setEmployees(employeesRes.data.map(dbToEmployee));
        if (agenciesRes.data) setAgencies(agenciesRes.data.map(dbToAgency));
        if (activitiesData) setActivities(activitiesData.map(dbToActivity));
        if (appointmentsRes) setAppointments(appointmentsRes.map(dbToAppointment));
        if (discRes.data) setDiscResults(discRes.data.map(dbToDiscResult));
        if (sourcesRes.data) setLeadSources(sourcesRes.data.map((r: any) => ({ id: r.id, label: r.label, icon: r.icon, color: r.color || '#6B7280', sortOrder: r.sort_order })));

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
  }, [fetchAll]);

  useEffect(() => {
    const leadsChannel = supabase
      .channel('realtime-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const incomingLead = dbToLead(payload.new);
            setLeads((prev) => {
              const existingIndex = prev.findIndex((lead) => lead.id === incomingLead.id);
              if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = incomingLead;
                return next;
              }
              return [incomingLead, ...prev].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });
            return;
          }

          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedLead = dbToLead(payload.new);
            setLeads((prev) => prev.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)));
            return;
          }

          if (payload.eventType === 'DELETE' && payload.old) {
            setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
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
      user: currentUserName,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [entry, ...prev]);
    await supabase.from('activities').insert({
      id,
      lead_id: leadId,
      type,
      description,
      user: currentUserName,
    });
  }, [currentUserName]);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    const updatedAt = new Date().toISOString();

    let oldLead: Lead | undefined;
    setLeads((prev) => {
      oldLead = prev.find((l) => l.id === id);
      if (oldLead && updates.status && updates.status !== oldLead.status) {
        addNotification({
          type: 'lead_status_change',
          title: 'Status geändert',
          description: `${oldLead.name}: "${statusConfig[oldLead.status].label}" → "${statusConfig[updates.status].label}"`,
          leadId: id,
        });
      }
      return prev.map((lead) => lead.id === id ? { ...lead, ...updates, updatedAt } : lead);
    });
    setSelectedLead((prev) => prev && prev.id === id ? { ...prev, ...updates, updatedAt } : prev);

    // Map to DB columns
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.salutation !== undefined) dbUpdates.salutation = updates.salutation;
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
    if (updates.createdAt !== undefined) dbUpdates.created_at = updates.createdAt;
    if (updates.approvalStage !== undefined) dbUpdates.approval_stage = updates.approvalStage;
    if (updates.approvalStatus !== undefined) dbUpdates.approval_status = updates.approvalStatus;
    if (updates.approvalHistory !== undefined) dbUpdates.approval_history = updates.approvalHistory;
    if (updates.approvedByRole !== undefined) dbUpdates.approved_by_role = updates.approvedByRole;
    if (updates.isRead !== undefined) dbUpdates.is_read = updates.isRead;
    if (updates.assignedApproverUserId !== undefined) dbUpdates.assigned_approver_user_id = updates.assignedApproverUserId;
    if (updates.assignedApproverRole !== undefined) dbUpdates.assigned_approver_role = updates.assignedApproverRole;
    if (updates.altEmail !== undefined) dbUpdates.alt_email = updates.altEmail;
    if (updates.altPhone !== undefined) dbUpdates.alt_phone = updates.altPhone;
    if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate || null;
    dbUpdates.updated_at = updatedAt;

    await supabase.from('leads').update(dbUpdates).eq('id', id);

    // Auto-generate tasks when status changes
    if (updates.status && oldLead && updates.status !== oldLead.status) {
      try {
        // Fetch existing tasks for this lead
        const { data: existingTasks } = await supabase.from('tasks').select('title').eq('lead_id', id);

        const { data, error } = await supabase.functions.invoke('generate-tasks', {
          body: {
            leadId: id,
            leadName: oldLead.name,
            leadStatus: updates.status,
            leadPosition: oldLead.position,
            assignedTo: updates.employeeId || oldLead.employeeId,
            agencyId: updates.agencyId || oldLead.agencyId,
            existingTasks: existingTasks || [],
          },
        });

        if (!error && data?.tasks?.length > 0) {
          await supabase.from('tasks').insert(
            data.tasks.map((t: any) => ({
              title: t.title,
              description: t.description,
              lead_id: t.lead_id,
              assigned_to: t.assigned_to,
              agency_id: t.agency_id,
              priority: t.priority,
              source: t.source,
              lead_status: t.lead_status,
              status: 'open',
            }))
          );
          console.log(`Auto-generated ${data.tasks.length} tasks for lead ${id} (status: ${updates.status})`);
        }
      } catch (err) {
        console.error('Auto task generation failed:', err);
      }
    }
  }, [addNotification]);

  const checkForDuplicates = useCallback((newLead: Lead, allLeads: Lead[]) => {
    try {
      const activeLeads = allLeads.filter(l => l.lifecycle === 'active' && l.id !== newLead.id);
      if (activeLeads.length === 0) return;

      const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const normalizePhone = (p: string) => (p || '').replace(/[\s\-\.\(\)]/g, '');
      const normalizeEmail = (e: string) => normalize(e);

      for (const other of activeLeads) {
        let score = 0;
        const reasons: string[] = [];

        // Email match
        const emailA = normalizeEmail(newLead.email);
        const emailB = normalizeEmail(other.email);
        if (emailA && emailB && emailA === emailB) {
          score += 50;
          reasons.push('Gleiche E-Mail-Adresse');
        }

        // Phone match
        const phoneA = normalizePhone(newLead.phone);
        const phoneB = normalizePhone(other.phone);
        if (phoneA && phoneB && phoneA.length >= 8 && phoneA === phoneB) {
          score += 40;
          reasons.push('Gleiche Telefonnummer');
        }

        // Name similarity (simple exact/contains check for performance)
        const nameA = normalize(newLead.name);
        const nameB = normalize(other.name);
        if (nameA && nameB && nameA === nameB) {
          score += 35;
          reasons.push('Gleicher Name');
        } else if (nameA && nameB && (nameA.includes(nameB) || nameB.includes(nameA))) {
          score += 20;
          reasons.push('Ähnlicher Name');
        }

        // PLZ match
        if (newLead.plz && other.plz && newLead.plz === other.plz) {
          score += 10;
        }

        if (score >= 50 && reasons.length > 0) {
          // Reassign to Hauptsitz for review
          const hauptsitz = agencies.find(a => a.name.toLowerCase().includes('hauptsitz'));
          if (hauptsitz) {
            const hauptsitzEmployee = employees.find(e => e.agencyId === hauptsitz.id);
            const duplicateNote = `⚠️ Mögliches Duplikat von "${other.name}" (ID: ${other.id}). `;
            const updatedNotes = duplicateNote + (newLead.notes || '');
            
            // Update lead assignment to Hauptsitz
            setLeads(prev => prev.map(l => l.id === newLead.id ? {
              ...l,
              agencyId: hauptsitz.id,
              employeeId: hauptsitzEmployee?.id || l.employeeId,
              notes: updatedNotes,
            } : l));

            // Persist to DB
            supabase.from('leads').update({
              agency_id: hauptsitz.id,
              employee_id: hauptsitzEmployee?.id || newLead.employeeId,
              notes: updatedNotes,
            }).eq('id', newLead.id);
          }

          addNotification({
            type: 'duplicate_detected',
            title: 'Duplikat erkannt – Lead zur Prüfung',
            description: `"${newLead.name}" ist ein mögliches Duplikat von "${other.name}" (${Math.min(score, 100)}%) – dem Hauptsitz zur Prüfung zugewiesen.`,
            leadId: newLead.id,
          });
          break; // Only notify for first match
        }
      }
    } catch (e) {
      console.error('Auto duplicate check failed:', e);
    }
  }, [addNotification, agencies, employees]);

  const addLead = useCallback(async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `l${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newLead: Lead = { ...leadData, id, createdAt: now, updatedAt: now, campaign: leadData.campaign || '', lifecycle: leadData.lifecycle || 'active' };
    setLeads((prev) => {
      const updated = [newLead, ...prev];
      // Run duplicate check asynchronously after state update
      setTimeout(() => checkForDuplicates(newLead, updated), 100);
      return updated;
    });
    addActivity(id, 'status_change', `Lead "${leadData.name}" manuell erfasst`);
    addNotification({ type: 'lead_new', title: 'Neuer Lead', description: `${leadData.name} wurde erfasst.`, leadId: id });

    const { error: insertError } = await supabase.from('leads').insert({
      id,
      name: leadData.name,
      salutation: leadData.salutation || '',
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
      campaign: leadData.campaign || '',
      lead_lifecycle: leadData.lifecycle || 'active',
      birth_date: leadData.birthDate || null,
    });
    if (insertError) {
      // Rollback optimistic insert so the UI matches the DB
      setLeads((prev) => prev.filter(l => l.id !== id));
      toast.error('Lead konnte nicht gespeichert werden', { description: insertError.message });
      console.error('[addLead] insert failed', insertError);
    }
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

    // Resolve created_by → MUST be a valid employees.id (FK).
    const userEmail = (user?.email || '').toLowerCase();
    const myEmployee = employees.find(e => (e.email || '').toLowerCase() === userEmail);
    const createdByEmployeeId = myEmployee?.id;
    if (!createdByEmployeeId) {
      toast.error('Termin konnte nicht gespeichert werden', { description: 'Kein Mitarbeiter-Datensatz für deinen Account gefunden.' });
      return;
    }

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

    const { error } = await supabase.from('appointments').insert({
      id,
      lead_id: aptData.leadId,
      title: aptData.title,
      date: aptData.date,
      time: aptData.time,
      duration: aptData.duration,
      type: aptData.type,
      meeting_link: meetingLink,
      notes: aptData.notes ?? '',
      created_by: createdByEmployeeId,
    });
    if (error) {
      setAppointments((prev) => prev.filter(a => a.id !== id));
      toast.error('Termin konnte nicht gespeichert werden', { description: error.message });
      console.error('[addAppointment] insert failed', error);
    }
  }, [addActivity, appointmentSettings, leads, updateLead, addNotification, user, employees]);

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
    if (updates.canReceiveLeads !== undefined) dbUpdates.can_receive_leads = updates.canReceiveLeads;
    await supabase.from('employees').update(dbUpdates as any).eq('id', id);
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
      color: agency.color || '#6B7280',
      monthly_lead_quota: agency.monthlyLeadQuota ?? null,
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
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.plz !== undefined) dbUpdates.plz = updates.plz;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
    if (updates.radiusKm !== undefined) dbUpdates.radius_km = updates.radiusKm;
    if (updates.monthlyLeadQuota !== undefined) dbUpdates.monthly_lead_quota = updates.monthlyLeadQuota;
    await supabase.from('agencies').update(dbUpdates as any).eq('id', id);
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

    // Auto-update status to follow_up when DISC is completed
    if (lead && lead.status === 'appointment') {
      updateLead(leadId, { status: 'follow_up' });
      addActivity(leadId, 'status_change', 'Status automatisch auf "Follow-up" gesetzt (DISC abgeschlossen)');
    }

    await supabase.from('disc_results').insert({
      id,
      lead_id: leadId,
      scores: normalized as any,
      dominant_type: dominantType,
      answers: answers as any,
    });
  }, [addActivity, addNotification, leads, updateLead]);

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

  // Role-based lead filtering: Teamleiter/Backoffice only see own or agency leads
  const filteredLeads = useMemo(() => {
    // Superadmin and Admin see all leads
    if (isSuperadmin || role === 'admin') return leads;
    // Review roles (controlling, geschaeftsleitung, hr) see assigned leads only
    if (role === 'controlling' || role === 'geschaeftsleitung' || role === 'hr') {
      return leads.filter(l => l.assignedApproverUserId === user?.id);
    }
    const userEmail = (user?.email || '').toLowerCase();
    const myEmployee = employees.find(e => (e.email || '').toLowerCase() === userEmail);
    // Agency Manager & Backoffice: see all leads of their agency
    if (role === 'agency_manager' || role === 'backoffice') {
      if (!myEmployee) return [];
      return leads.filter(l => l.agencyId === myEmployee.agencyId);
    }
    // Teamleiter: see ONLY leads personally assigned to them
    if (role === 'teamleiter') {
      if (!myEmployee) return [];
      return leads.filter(l => l.employeeId === myEmployee.id);
    }
    // Analyst: read-only but can see all
    if (role === 'analyst') return leads;
    return leads;
  }, [leads, employees, role, isSuperadmin, user]);

  return (
    <LeadsContext.Provider
      value={{
        leads: filteredLeads,
        employees,
        agencies,
        activities,
        appointments,
        discResults,
        appointmentSettings,
        insightsSettings,
        leadSources,
        reloadLeadSources,
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
