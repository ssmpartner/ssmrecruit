import { useContext } from 'react';
import { LeadsContext } from './leads-context';

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error('useLeads must be inside LeadsProvider');
  return ctx;
}
