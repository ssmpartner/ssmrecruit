import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { leads as initialLeads, type Lead, type LeadStatus } from '@/lib/mock-data';

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
  activities: ActivityEntry[];
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addActivity: (leadId: string, type: ActivityEntry['type'], description: string) => void;
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error('useLeads must be inside LeadsProvider');
  return ctx;
}

// seed some initial activities
function seedActivities(leads: Lead[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  leads.forEach((lead, i) => {
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
    // also update selectedLead if it's the one being edited
    setSelectedLead(prev => prev && prev.id === id ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : prev);
  }, []);

  return (
    <LeadsContext.Provider value={{ leads, activities, updateLead, addActivity, selectedLead, setSelectedLead }}>
      {children}
    </LeadsContext.Provider>
  );
}
