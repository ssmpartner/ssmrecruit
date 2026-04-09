import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, Bot, Rocket, FlaskConical, Megaphone, PhoneCall,
  Hash, BookOpen, Zap, AlertTriangle, TrendingUp, DollarSign,
  Shield, Settings2
} from 'lucide-react';
import { useAIVoicePermissions } from '@/hooks/useAIVoicePermissions';
import { Badge } from '@/components/ui/badge';
import VoiceDashboardTab from '@/components/ai-voice/VoiceDashboardTab';
import AgentStudioTab from '@/components/ai-voice/AgentStudioTab';
import DeploymentsTab from '@/components/ai-voice/DeploymentsTab';
import TestCenterTab from '@/components/ai-voice/TestCenterTab';
import CampaignsTab from '@/components/ai-voice/CampaignsTab';
import SessionsTab from '@/components/ai-voice/SessionsTab';
import NumbersTab from '@/components/ai-voice/NumbersTab';
import KnowledgeTab from '@/components/ai-voice/KnowledgeTab';
import ActionRulesTab from '@/components/ai-voice/ActionRulesTab';
import EscalationsTab from '@/components/ai-voice/EscalationsTab';
import VoiceAnalyticsTab from '@/components/ai-voice/VoiceAnalyticsTab';
import CostControlTab from '@/components/ai-voice/CostControlTab';
import ComplianceTab from '@/components/ai-voice/ComplianceTab';
import ProviderSettingsTab from '@/components/ai-voice/ProviderSettingsTab';
import { Navigate } from 'react-router-dom';

const allTabs = [
  { value: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { value: 'studio', label: 'Agent Studio', icon: Bot },
  { value: 'deployments', label: 'Deployments', icon: Rocket },
  { value: 'test', label: 'Test Center', icon: FlaskConical },
  { value: 'campaigns', label: 'Kampagnen', icon: Megaphone },
  { value: 'sessions', label: 'Sessions', icon: PhoneCall },
  { value: 'numbers', label: 'Nummern', icon: Hash },
  { value: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { value: 'actions', label: 'Actions', icon: Zap },
  { value: 'escalations', label: 'Eskalationen', icon: AlertTriangle },
  { value: 'analytics', label: 'Analytics', icon: TrendingUp },
  { value: 'costs', label: 'Kosten', icon: DollarSign },
  { value: 'compliance', label: 'Compliance', icon: Shield },
  { value: 'providers', label: 'Provider', icon: Settings2 },
] as const;

const tabContentMap: Record<string, React.ComponentType> = {
  dashboard: VoiceDashboardTab,
  studio: AgentStudioTab,
  deployments: DeploymentsTab,
  test: TestCenterTab,
  campaigns: CampaignsTab,
  sessions: SessionsTab,
  numbers: NumbersTab,
  knowledge: KnowledgeTab,
  actions: ActionRulesTab,
  escalations: EscalationsTab,
  analytics: VoiceAnalyticsTab,
  costs: CostControlTab,
  compliance: ComplianceTab,
  providers: ProviderSettingsTab,
};

export default function AIVoiceAgent() {
  const perms = useAIVoicePermissions();

  if (!perms.canAccessModule) {
    return <Navigate to="/" replace />;
  }

  const visibleTabs = allTabs.filter(t => perms.canAccessTab(t.value as any));
  const defaultTab = visibleTabs[0]?.value ?? 'dashboard';

  const scopeLabel = perms.agencyScoped ? 'Agentur-Ansicht' : perms.userScoped ? 'Persönliche Ansicht' : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Voice Agent</h1>
          <p className="text-muted-foreground">KI-gestützte Telefonie und Voice-Agents verwalten</p>
        </div>
        {scopeLabel && (
          <Badge variant="outline" className="text-xs">{scopeLabel}</Badge>
        )}
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {visibleTabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              <t.icon className="h-3.5 w-3.5 mr-1" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map(t => {
          const Content = tabContentMap[t.value];
          return (
            <TabsContent key={t.value} value={t.value}>
              <Content />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
