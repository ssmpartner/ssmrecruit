import { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIVoicePermissions } from '@/hooks/useAIVoicePermissions';
import { Bot, Rocket, Megaphone, PhoneCall, AlertTriangle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const AgentStudioTab = lazy(() => import('@/components/ai-voice/AgentStudioTab'));
const DeploymentsTab = lazy(() => import('@/components/ai-voice/DeploymentsTab'));
const CampaignsTab = lazy(() => import('@/components/ai-voice/CampaignsTab'));
const SessionsTab = lazy(() => import('@/components/ai-voice/SessionsTab'));
const EscalationsTab = lazy(() => import('@/components/ai-voice/EscalationsTab'));

function TabLoader() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}

const tabs = [
  { value: 'studio', label: 'Agenten', icon: Bot, perm: 'studio' as const },
  { value: 'deployments', label: 'Deployments', icon: Rocket, perm: 'deployments' as const },
  { value: 'campaigns', label: 'Kampagnen', icon: Megaphone, perm: 'campaigns' as const },
  { value: 'sessions', label: 'Sessions', icon: PhoneCall, perm: 'sessions' as const },
  { value: 'escalations', label: 'Eskalationen', icon: AlertTriangle, perm: 'escalations' as const },
];

export default function AIVoiceBetrieb() {
  const perms = useAIVoicePermissions();
  const visible = tabs.filter(t => perms.canAccessTab(t.perm));
  const [active, setActive] = useState(visible[0]?.value ?? 'studio');

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
      <TabsContent value="studio"><Suspense fallback={<TabLoader />}><AgentStudioTab /></Suspense></TabsContent>
      <TabsContent value="deployments"><Suspense fallback={<TabLoader />}><DeploymentsTab /></Suspense></TabsContent>
      <TabsContent value="campaigns"><Suspense fallback={<TabLoader />}><CampaignsTab /></Suspense></TabsContent>
      <TabsContent value="sessions"><Suspense fallback={<TabLoader />}><SessionsTab /></Suspense></TabsContent>
      <TabsContent value="escalations"><Suspense fallback={<TabLoader />}><EscalationsTab /></Suspense></TabsContent>
    </Tabs>
  );
}
