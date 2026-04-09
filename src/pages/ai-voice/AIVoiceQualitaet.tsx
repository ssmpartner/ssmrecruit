import { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIVoicePermissions } from '@/hooks/useAIVoicePermissions';
import { TrendingUp, FileSearch, Eye, FlaskConical } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const VoiceAnalyticsTab = lazy(() => import('@/components/ai-voice/VoiceAnalyticsTab'));
const AuditLogTab = lazy(() => import('@/components/ai-voice/AuditLogTab'));
const SessionReviewsTab = lazy(() => import('@/components/ai-voice/SessionReviewsTab'));
const TestCenterTab = lazy(() => import('@/components/ai-voice/TestCenterTab'));

function TabLoader() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}

const tabs = [
  { value: 'analytics', label: 'Analytics', icon: TrendingUp, perm: 'analytics' as const },
  { value: 'audit', label: 'Audit Log', icon: FileSearch, perm: 'audit' as const },
  { value: 'reviews', label: 'Session Reviews', icon: Eye, perm: 'reviews' as const },
  { value: 'test', label: 'Test Center', icon: FlaskConical, perm: 'test' as const },
];

export default function AIVoiceQualitaet() {
  const perms = useAIVoicePermissions();
  const visible = tabs.filter(t => perms.canAccessTab(t.perm));
  const [active, setActive] = useState(visible[0]?.value ?? 'analytics');

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
      <TabsContent value="analytics"><Suspense fallback={<TabLoader />}><VoiceAnalyticsTab /></Suspense></TabsContent>
      <TabsContent value="audit"><Suspense fallback={<TabLoader />}><AuditLogTab /></Suspense></TabsContent>
      <TabsContent value="reviews"><Suspense fallback={<TabLoader />}><SessionReviewsTab /></Suspense></TabsContent>
      <TabsContent value="test"><Suspense fallback={<TabLoader />}><TestCenterTab /></Suspense></TabsContent>
    </Tabs>
  );
}
