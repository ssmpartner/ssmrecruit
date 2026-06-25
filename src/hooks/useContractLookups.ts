import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ContractLang = 'de' | 'fr' | 'it';

export interface ContractLookupRow {
  code: string;
  label_de: string;
  label_fr: string | null;
  label_it: string | null;
  sort_order: number;
  is_active: boolean;
}
export interface ContractCategoryRow extends ContractLookupRow {
  is_attachment: boolean;
}

export const CONTRACT_LANGUAGES: { code: ContractLang; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
];

export function labelFor(row: ContractLookupRow | undefined, lang: ContractLang = 'de'): string {
  if (!row) return '';
  return (lang === 'fr' && row.label_fr) || (lang === 'it' && row.label_it) || row.label_de;
}

/**
 * Liefert die drei Vertrags-Lookups (Vertragsarten, Dokumentenkategorien, Zielgruppen)
 * inkl. mehrsprachiger Labels. Nur lesend – Pflege erfolgt durch Superadmin.
 */
export function useContractLookups() {
  const [kinds, setKinds] = useState<ContractLookupRow[]>([]);
  const [categories, setCategories] = useState<ContractCategoryRow[]>([]);
  const [targetGroups, setTargetGroups] = useState<ContractLookupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [k, c, t] = await Promise.all([
        supabase.from('contract_kinds').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('contract_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('contract_target_groups').select('*').eq('is_active', true).order('sort_order'),
      ]);
      if (cancelled) return;
      setKinds((k.data as ContractLookupRow[]) || []);
      setCategories((c.data as ContractCategoryRow[]) || []);
      setTargetGroups((t.data as ContractLookupRow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { kinds, categories, targetGroups, loading };
}
