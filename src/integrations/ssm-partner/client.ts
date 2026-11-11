// Read-only client for the public SSM Partner website database (job positions).
// Separate from the SSM Recruit client; never used for auth or writes.
import { createClient } from '@supabase/supabase-js';

const SSM_PARTNER_URL = 'https://nopqgykpyaieyizvhuma.supabase.co';
const SSM_PARTNER_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vcHFneWtweWFpZXlpenZodW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Njk5MjIsImV4cCI6MjA5MDQ0NTkyMn0.zZ1W11Umth1D8kZPDQOn14cSUrRnz2HUv6i1aL7gkHc';

export const ssmPartnerClient = createClient(SSM_PARTNER_URL, SSM_PARTNER_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'ssm-partner-readonly' },
});

export interface JobPosition {
  id: string;
  title: string;
  location: string | null;
  workload: string | null;
  department: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_it: string | null;
  description_en: string | null;
}

export type JobArea = 'operations' | 'finanzcoach';

/** department 'aussendienst' → Aussendienst; everything else (incl. empty) → Innendienst. */
export function jobArea(department: string | null | undefined): JobArea {
  return (department || '').trim().toLowerCase() === 'aussendienst' ? 'finanzcoach' : 'operations';
}

export async function fetchActiveJobPositions(): Promise<JobPosition[]> {
  const { data, error } = await ssmPartnerClient
    .from('job_positions')
    .select('id,title,location,workload,department,description_de,description_fr,description_it,description_en')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as JobPosition[];
}
