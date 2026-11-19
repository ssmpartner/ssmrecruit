import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_MODULES_SETTING_KEY, type RoleModuleOverrides } from '@/lib/role-modules';

export function useRoleModules() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['app_settings', ROLE_MODULES_SETTING_KEY],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', ROLE_MODULES_SETTING_KEY).maybeSingle();
      return ((data?.value as unknown) as RoleModuleOverrides) || {};
    },
    staleTime: 60_000,
  });
  const save = async (value: RoleModuleOverrides) => {
    const { error } = await supabase.from('app_settings').upsert({ key: ROLE_MODULES_SETTING_KEY, value: value as any, updated_at: new Date().toISOString() });
    if (error) throw error;
    qc.setQueryData(['app_settings', ROLE_MODULES_SETTING_KEY], value);
  };
  return { overrides: query.data, loading: query.isLoading, save };
}
