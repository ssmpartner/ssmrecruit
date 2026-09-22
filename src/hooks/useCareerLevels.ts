import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CareerLevelDetail {
  name: string;
  fixSalary?: number;
  expenses?: number;
  scorePoints?: number;
  requirements?: string[];
  position: string;
}

export interface CareerPlanRow {
  id: string;
  position: string;
  levels: CareerLevelDetail[];
  is_active: boolean;
}

/**
 * Lädt aktive SSM-Karrierepläne und liefert Stufen-Namen sowie die Lohnangaben
 * (Fixlohn, Spesen, Score-Punkte) aus Einstellungen › SSM Karriereplan.
 * Wenn `position` angegeben ist, werden nur die Stufen dieser Position zurückgegeben.
 */
export function useCareerLevels(position?: string | null) {
  const [plans, setPlans] = useState<CareerPlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('career_plans')
        .select('id,position,levels,is_active')
        .eq('is_active', true)
        .order('position');
      if (cancel) return;
      setPlans(
        (data || []).map((r: any) => ({
          id: r.id,
          position: r.position,
          levels: (Array.isArray(r.levels) ? r.levels : []).map((l: any) => ({
            name: l?.name ?? '',
            fixSalary: typeof l?.fixSalary === 'number' ? l.fixSalary : undefined,
            expenses: typeof l?.expenses === 'number' ? l.expenses : undefined,
            scorePoints: typeof l?.scorePoints === 'number' ? l.scorePoints : undefined,
            requirements: Array.isArray(l?.requirements) ? l.requirements.filter(Boolean) : [],
            position: r.position,
          })),
          is_active: r.is_active,
        })),
      );
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  const filtered = position
    ? plans.filter(p => p.position.toLowerCase() === position.toLowerCase())
    : plans;

  const levelDetails: CareerLevelDetail[] = [];
  const seen = new Set<string>();
  for (const p of (filtered.length ? filtered : plans)) {
    for (const l of p.levels) {
      const name = (l?.name || '').trim();
      if (name && !seen.has(name)) { seen.add(name); levelDetails.push({ ...l, name }); }
    }
  }

  const levels: string[] = levelDetails.map(l => l.name);
  const positions: string[] = plans.map(p => p.position);

  return { plans, levels, levelDetails, positions, loading };
}
