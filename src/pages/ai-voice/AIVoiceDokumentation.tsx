import { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

const VoiceDocsTab = lazy(() => import('@/components/ai-voice/VoiceDocsTab'));

function TabLoader() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}

export default function AIVoiceDokumentation() {
  return (
    <Suspense fallback={<TabLoader />}>
      <VoiceDocsTab />
    </Suspense>
  );
}
