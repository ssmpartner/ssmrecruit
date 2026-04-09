import { useAuth } from '@/context/AuthContext';

/**
 * AI Voice Agent – Role-Based Permissions (Extended)
 */

type AIVoiceTab =
  | 'dashboard' | 'live' | 'alerts'
  | 'studio' | 'deployments' | 'campaigns' | 'sessions' | 'escalations'
  | 'knowledge' | 'actions' | 'compliance' | 'guidelines'
  | 'numbers' | 'providers' | 'api-webhooks' | 'costs' | 'kill-switch'
  | 'analytics' | 'audit' | 'reviews' | 'test'
  | 'docs';

type AppRole = string;

const TAB_ACCESS: Record<string, AIVoiceTab[]> = {
  superadmin: [
    'dashboard', 'live', 'alerts',
    'studio', 'deployments', 'campaigns', 'sessions', 'escalations',
    'knowledge', 'actions', 'compliance', 'guidelines',
    'numbers', 'providers', 'api-webhooks', 'costs', 'kill-switch',
    'analytics', 'audit', 'reviews', 'test',
    'docs',
  ],
  admin: [
    'dashboard', 'live', 'alerts',
    'studio', 'deployments', 'campaigns', 'sessions', 'escalations',
    'knowledge', 'actions', 'guidelines',
    'numbers',
    'analytics', 'reviews', 'test',
    'docs',
  ],
  teamleiter: [
    'dashboard', 'live', 'alerts',
    'studio', 'deployments', 'campaigns', 'sessions', 'escalations',
    'knowledge', 'guidelines',
    'analytics', 'test',
    'docs',
  ],
  backoffice: ['sessions', 'escalations'],
  analyst: ['dashboard', 'analytics', 'sessions', 'compliance', 'audit', 'reviews'],
};

interface AIVoiceActions {
  canCreateAgent: boolean;
  canEditAgent: boolean;
  canDeleteAgent: boolean;
  canPublishVersion: boolean;
  canManageDeploymentsGlobal: boolean;
  canManageDeploymentsOwn: boolean;
  canConfigureProviders: boolean;
  canSetCostLimits: boolean;
  canManageComplianceRules: boolean;
  canViewAuditLogs: boolean;
  canStopLiveAgents: boolean;
  canSwitchEnvironment: boolean;
  canManageCampaigns: boolean;
  canRunTests: boolean;
  canViewCosts: boolean;
  canViewSessions: boolean;
  canViewAllSessions: boolean;
  canManageEscalations: boolean;
  canApproveKnowledge: boolean;
  canMarkProblematicSessions: boolean;
  canUseKillSwitch: boolean;
  agencyScoped: boolean;
  userScoped: boolean;
  readOnlyStudio: boolean;
  readOnlyCampaigns: boolean;
}

const FULL_ACCESS: AIVoiceActions = {
  canCreateAgent: true, canEditAgent: true, canDeleteAgent: true,
  canPublishVersion: true, canManageDeploymentsGlobal: true, canManageDeploymentsOwn: true,
  canConfigureProviders: true, canSetCostLimits: true, canManageComplianceRules: true,
  canViewAuditLogs: true, canStopLiveAgents: true, canSwitchEnvironment: true,
  canManageCampaigns: true, canRunTests: true, canViewCosts: true,
  canViewSessions: true, canViewAllSessions: true, canManageEscalations: true,
  canApproveKnowledge: true, canMarkProblematicSessions: true, canUseKillSwitch: true,
  agencyScoped: false, userScoped: false, readOnlyStudio: false, readOnlyCampaigns: false,
};

const NO_ACCESS: AIVoiceActions = {
  canCreateAgent: false, canEditAgent: false, canDeleteAgent: false,
  canPublishVersion: false, canManageDeploymentsGlobal: false, canManageDeploymentsOwn: false,
  canConfigureProviders: false, canSetCostLimits: false, canManageComplianceRules: false,
  canViewAuditLogs: false, canStopLiveAgents: false, canSwitchEnvironment: false,
  canManageCampaigns: false, canRunTests: false, canViewCosts: false,
  canViewSessions: false, canViewAllSessions: false, canManageEscalations: false,
  canApproveKnowledge: false, canMarkProblematicSessions: false, canUseKillSwitch: false,
  agencyScoped: false, userScoped: false, readOnlyStudio: false, readOnlyCampaigns: false,
};

function getActions(role: AppRole | null): AIVoiceActions {
  switch (role) {
    case 'superadmin': return FULL_ACCESS;
    case 'admin':
      return { ...FULL_ACCESS, canConfigureProviders: false, canSetCostLimits: false, canManageComplianceRules: false, canManageDeploymentsGlobal: false, canSwitchEnvironment: false, canViewCosts: false, canUseKillSwitch: false, canManageDeploymentsOwn: true };
    case 'teamleiter':
      return { ...NO_ACCESS, canViewSessions: true, canManageEscalations: true, canRunTests: true, canManageDeploymentsOwn: true, agencyScoped: true, readOnlyStudio: true, readOnlyCampaigns: true };
    case 'backoffice':
      return { ...NO_ACCESS, canViewSessions: true, canManageEscalations: true, userScoped: true };
    case 'analyst':
      return { ...NO_ACCESS, canViewSessions: true, canViewAllSessions: true, canViewAuditLogs: true, canMarkProblematicSessions: true };
    default: return NO_ACCESS;
  }
}

export function useAIVoicePermissions() {
  const { role } = useAuth();
  const allowedTabs = TAB_ACCESS[role ?? ''] ?? [];
  const actions = getActions(role);
  const canAccessModule = allowedTabs.length > 0;
  const canAccessTab = (tab: AIVoiceTab) => allowedTabs.includes(tab);
  const visibleTabs = allowedTabs;

  return { role, canAccessModule, canAccessTab, visibleTabs, ...actions };
}
