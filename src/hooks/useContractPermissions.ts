import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type ContractPermKey =
  | 'can_view' | 'can_generate' | 'can_edit' | 'can_finalize' | 'can_send'
  | 'can_archive' | 'can_manage_templates' | 'can_manage_attachments'
  | 'can_manage_sets' | 'can_manage_letterhead' | 'can_manage_placeholders'
  | 'can_view_audit_log';

const ROLE_DEFAULTS: Record<string, ContractPermKey[]> = {
  hr: ['can_view', 'can_generate', 'can_edit', 'can_finalize', 'can_send'],
  geschaeftsleitung: ['can_view', 'can_generate'],
  teamleiter: ['can_view', 'can_generate', 'can_edit'],
  backoffice: ['can_view', 'can_generate', 'can_edit'],
  agency_manager: ['can_view', 'can_generate', 'can_edit'],
};

export function useContractPermissions() {
  const { user, role, isSuperadmin, isAdmin } = useAuth();
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('contract_permissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setPerms((data as any) ?? {});
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const has = (perm: ContractPermKey): boolean => {
    if (isSuperadmin || isAdmin) return true;
    if (perms[perm]) return true;
    const defaults = ROLE_DEFAULTS[role ?? ''] ?? [];
    return defaults.includes(perm);
  };

  return { has, loading, isAdmin: isSuperadmin || isAdmin };
}
