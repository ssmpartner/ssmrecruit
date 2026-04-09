import { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIVoicePermissions } from '@/hooks/useAIVoicePermissions';
import { BarChart3, Activity, Bell } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const VoiceDashboardTab = lazy(() => import('@/components/ai-voice/VoiceDashboardTab'));
const LiveMonitoringTab = lazy(() => import('@/components/ai-voice/LiveMonitoringTab'));
const AlertsStatusTab = lazy(() => import('@/components/ai-voice/AlertsStatusTab'));

function TabLoader() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}

const tabs = [
  { value: 'dashboard', label: 'Dashboard', icon: BarChart3, perm: 'dashboard' as const },
  { value: 'live', label: 'Live Monitoring', icon: Activity, perm: 'live' as const },
  { value: 'alerts', label: 'Warnungen & Status', icon: Bell, perm: 'alerts' as const },
];

export default function AIVoiceOverview() {
  const perms = useAIVoicePermissions();
  const visible = tabs.filter(t => perms.canAccessTab(t.perm));
  const [active, setActive] = useState(visible[0]?.value ?? 'dashboard');

  return (
    <Tabs value={active} onValueChange={setActive} className="space-y-4">
      <TabsList>
        {visible.map(t => (
          <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="dashboard"><Suspense fallback={<TabLoader />}><VoiceDashboardTab /></Suspense></TabsContent>
      <TabsContent value="live"><Suspense fallback={<TabLoader />}><LiveMonitoringTab /></Suspense></TabsContent>
      <TabsContent value="alerts"><Suspense fallback={<TabLoader />}><AlertsStatusTab /></Suspense></TabsContent>
    </Tabs>
  );
}
