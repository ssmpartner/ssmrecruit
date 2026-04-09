import { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIVoicePermissions } from '@/hooks/useAIVoicePermissions';
import { Hash, Settings2, Webhook, DollarSign, XOctagon, Layers } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const NumbersTab = lazy(() => import('@/components/ai-voice/NumbersTab'));
const ProviderSettingsTab = lazy(() => import('@/components/ai-voice/ProviderSettingsTab'));
const ApiWebhooksTab = lazy(() => import('@/components/ai-voice/ApiWebhooksTab'));
const CostControlTab = lazy(() => import('@/components/ai-voice/CostControlTab'));
const KillSwitchTab = lazy(() => import('@/components/ai-voice/KillSwitchTab'));
const SystemArchitectureTab = lazy(() => import('@/components/ai-voice/SystemArchitectureTab'));

function TabLoader() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}

const tabs = [
  { value: 'architecture', label: 'Architektur', icon: Layers, perm: 'providers' as const },
  { value: 'numbers', label: 'Voice Numbers', icon: Hash, perm: 'numbers' as const },
  { value: 'providers', label: 'Provider', icon: Settings2, perm: 'providers' as const },
  { value: 'api-webhooks', label: 'API & Webhooks', icon: Webhook, perm: 'api-webhooks' as const },
  { value: 'costs', label: 'Cost Control', icon: DollarSign, perm: 'costs' as const },
  { value: 'kill-switch', label: 'Kill Switch', icon: XOctagon, perm: 'kill-switch' as const },
];

export default function AIVoiceInfrastruktur() {
  const perms = useAIVoicePermissions();
  const visible = tabs.filter(t => perms.canAccessTab(t.perm));
  const [active, setActive] = useState(visible[0]?.value ?? 'architecture');

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
      <TabsContent value="architecture"><Suspense fallback={<TabLoader />}><SystemArchitectureTab /></Suspense></TabsContent>
      <TabsContent value="numbers"><Suspense fallback={<TabLoader />}><NumbersTab /></Suspense></TabsContent>
      <TabsContent value="providers"><Suspense fallback={<TabLoader />}><ProviderSettingsTab /></Suspense></TabsContent>
      <TabsContent value="api-webhooks"><Suspense fallback={<TabLoader />}><ApiWebhooksTab /></Suspense></TabsContent>
      <TabsContent value="costs"><Suspense fallback={<TabLoader />}><CostControlTab /></Suspense></TabsContent>
      <TabsContent value="kill-switch"><Suspense fallback={<TabLoader />}><KillSwitchTab /></Suspense></TabsContent>
    </Tabs>
  );
}
