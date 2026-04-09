import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, Bot, Rocket, FlaskConical, Megaphone, PhoneCall,
  Hash, BookOpen, Zap, AlertTriangle, TrendingUp, DollarSign,
  Shield, Settings2
} from 'lucide-react';
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

const tabs = [
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
];

export default function AIVoiceAgent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Voice Agent</h1>
        <p className="text-muted-foreground">KI-gestützte Telefonie und Voice-Agents verwalten</p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              <t.icon className="h-3.5 w-3.5 mr-1" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><VoiceDashboardTab /></TabsContent>
        <TabsContent value="studio"><AgentStudioTab /></TabsContent>
        <TabsContent value="deployments"><DeploymentsTab /></TabsContent>
        <TabsContent value="test"><TestCenterTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="sessions"><SessionsTab /></TabsContent>
        <TabsContent value="numbers"><NumbersTab /></TabsContent>
        <TabsContent value="knowledge"><KnowledgeTab /></TabsContent>
        <TabsContent value="actions"><ActionRulesTab /></TabsContent>
        <TabsContent value="escalations"><EscalationsTab /></TabsContent>
        <TabsContent value="analytics"><VoiceAnalyticsTab /></TabsContent>
        <TabsContent value="costs"><CostControlTab /></TabsContent>
        <TabsContent value="compliance"><ComplianceTab /></TabsContent>
        <TabsContent value="providers"><ProviderSettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
