import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CareerPlanRow {
  id: string;
  position: string;
  levels: { name: string }[];
  is_active: boolean;
}

/**
 * Lädt aktive SSM-Karrierepläne und liefert Stufen-Namen.
 * Wenn `position` angegeben ist, werden nur die Stufen dieser Position zurückgegeben.
 * Sonst die Vereinigungsmenge aller aktiven Pläne (deduped, in Plan-Reihenfolge).
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
          levels: Array.isArray(r.levels) ? r.levels : [],
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

  const levels: string[] = [];
  const seen = new Set<string>();
  for (const p of (filtered.length ? filtered : plans)) {
    for (const l of p.levels) {
      const name = (l?.name || '').trim();
      if (name && !seen.has(name)) { seen.add(name); levels.push(name); }
    }
  }

  return { plans, levels, loading };
}
