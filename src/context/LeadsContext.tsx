import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  leads as initialLeads,
  employees as initialEmployees,
  agencies as initialAgencies,
  type Lead,
  type LeadStatus,
  type Employee,
  type Agency,
} from '@/lib/mock-data';

export interface ActivityEntry {
  id: string;
  leadId: string;
  type: 'status_change' | 'assignment' | 'edit' | 'note';
  description: string;
  user: string;
  timestamp: string;
}

interface LeadsContextType {
  leads: Lead[];
  employees: Employee[];
  agencies: Agency[];
  activities: ActivityEntry[];
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addActivity: (leadId: string, type: ActivityEntry['type'], description: string) => void;
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
      description: `Lead created with status "New Lead"`,
      user: 'System',
      timestamp: lead.createdAt,
    });
    if (lead.status !== 'new') {
      entries.push({
        id: `act-${lead.id}-2`,
        leadId: lead.id,
        type: 'status_change',
        description: `Status changed to "${lead.status}"`,
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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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

  const addEmployee = useCallback((emp: Omit<Employee, 'id'>) => {
    const id = `e${Date.now()}`;
    setEmployees(prev => [...prev, { ...emp, id }]);
  }, []);

  const addAgency = useCallback((ag: Omit<Agency, 'id'>) => {
    const id = `a${Date.now()}`;
    setAgencies(prev => [...prev, { ...ag, id }]);
  }, []);

  return (
    <LeadsContext.Provider value={{ leads, employees, agencies, activities, updateLead, addActivity, selectedLead, setSelectedLead, addEmployee, addAgency }}>
      {children}
    </LeadsContext.Provider>
  );
}
