import { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIVoicePermissions } from '@/hooks/useAIVoicePermissions';
import { BookOpen, Zap, MessageSquare, Shield } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const KnowledgeTab = lazy(() => import('@/components/ai-voice/KnowledgeTab'));
const ActionRulesTab = lazy(() => import('@/components/ai-voice/ActionRulesTab'));
const ConversationGuidelinesTab = lazy(() => import('@/components/ai-voice/ConversationGuidelinesTab'));
const ComplianceTab = lazy(() => import('@/components/ai-voice/ComplianceTab'));

function TabLoader() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}

const tabs = [
  { value: 'knowledge', label: 'Knowledge Base', icon: BookOpen, perm: 'knowledge' as const },
  { value: 'actions', label: 'Action Rules', icon: Zap, perm: 'actions' as const },
  { value: 'guidelines', label: 'Gesprächsrichtlinien', icon: MessageSquare, perm: 'guidelines' as const },
  { value: 'compliance', label: 'Compliance Rules', icon: Shield, perm: 'compliance' as const },
];

export default function AIVoiceWissen() {
  const perms = useAIVoicePermissions();
  const visible = tabs.filter(t => perms.canAccessTab(t.perm));
  const [active, setActive] = useState(visible[0]?.value ?? 'knowledge');

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
      <TabsContent value="knowledge"><Suspense fallback={<TabLoader />}><KnowledgeTab /></Suspense></TabsContent>
      <TabsContent value="actions"><Suspense fallback={<TabLoader />}><ActionRulesTab /></Suspense></TabsContent>
      <TabsContent value="guidelines"><Suspense fallback={<TabLoader />}><ConversationGuidelinesTab /></Suspense></TabsContent>
      <TabsContent value="compliance"><Suspense fallback={<TabLoader />}><ComplianceTab /></Suspense></TabsContent>
    </Tabs>
  );
}
