import { useAuth } from '@/context/AuthContext';

/**
 * AI Voice Agent – Role-Based Permissions
 *
 * Rollen-Matrix:
 * ┌─────────────────────┬────────────┬───────┬──────────────┬────────────┬──────────────┐
 * │ Bereich             │ Superadmin │ Admin │ Agenturleiter│ Mitarbeiter│ QA/Compliance│
 * ├─────────────────────┼────────────┼───────┼──────────────┼────────────┼──────────────┤
 * │ Dashboard           │ ✓ voll     │ ✓     │ ✓ eigene Ag. │ ✗          │ ✓ read-only  │
 * │ Agent Studio        │ ✓ CRUD     │ ✓ RW  │ ✓ read-only  │ ✗          │ ✗            │
 * │ Deployments         │ ✓ global   │ ✓ own │ ✓ own agency │ ✗          │ ✗            │
 * │ Test Center         │ ✓          │ ✓     │ ✓ own agency │ ✗          │ ✗            │
 * │ Kampagnen           │ ✓          │ ✓     │ ✓ read-only  │ ✗          │ ✗            │
 * │ Sessions            │ ✓          │ ✓     │ ✓ own agency │ ✓ own only │ ✓ review     │
 * │ Nummern             │ ✓          │ ✓ RO  │ ✗            │ ✗          │ ✗            │
 * │ Knowledge           │ ✓          │ ✓     │ ✓ read-only  │ ✗          │ ✓ approve    │
 * │ Actions             │ ✓          │ ✓     │ ✗            │ ✗          │ ✗            │
 * │ Eskalationen        │ ✓          │ ✓     │ ✓ own agency │ ✓ assigned │ ✓ read       │
 * │ Analytics           │ ✓          │ ✓     │ ✓ own agency │ ✗          │ ✓ read       │
 * │ Kosten              │ ✓          │ ✗     │ ✗            │ ✗          │ ✗            │
 * │ Compliance          │ ✓          │ ✗     │ ✗            │ ✗          │ ✓ full       │
 * │ Provider Settings   │ ✓          │ ✗     │ ✗            │ ✗          │ ✗            │
 * └─────────────────────┴────────────┴───────┴──────────────┴────────────┴──────────────┘
 */

type AIVoiceTab =
  | 'dashboard' | 'studio' | 'deployments' | 'test' | 'campaigns'
  | 'sessions' | 'numbers' | 'knowledge' | 'actions' | 'escalations'
  | 'analytics' | 'costs' | 'compliance' | 'providers';

type AppRole = string;

/** Which tabs each role may see */
const TAB_ACCESS: Record<string, AIVoiceTab[]> = {
  superadmin: [
    'dashboard', 'studio', 'deployments', 'test', 'campaigns',
    'sessions', 'numbers', 'knowledge', 'actions', 'escalations',
    'analytics', 'costs', 'compliance', 'providers',
  ],
  admin: [
    'dashboard', 'studio', 'deployments', 'test', 'campaigns',
    'sessions', 'numbers', 'knowledge', 'actions', 'escalations', 'analytics',
  ],
  teamleiter: [
    'dashboard', 'studio', 'deployments', 'test', 'campaigns',
    'sessions', 'knowledge', 'escalations', 'analytics',
  ],
  backoffice: ['sessions', 'escalations'],
  analyst: ['dashboard', 'analytics', 'sessions', 'compliance'],
};

/** Action-level permissions */
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
  /** Whether data should be scoped to user's own agency */
  agencyScoped: boolean;
  /** Whether data should be scoped to user's own assigned items */
  userScoped: boolean;
  /** Read-only mode for studio/campaigns */
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
  canApproveKnowledge: true, canMarkProblematicSessions: true,
  agencyScoped: false, userScoped: false, readOnlyStudio: false, readOnlyCampaigns: false,
};

const NO_ACCESS: AIVoiceActions = {
  canCreateAgent: false, canEditAgent: false, canDeleteAgent: false,
  canPublishVersion: false, canManageDeploymentsGlobal: false, canManageDeploymentsOwn: false,
  canConfigureProviders: false, canSetCostLimits: false, canManageComplianceRules: false,
  canViewAuditLogs: false, canStopLiveAgents: false, canSwitchEnvironment: false,
  canManageCampaigns: false, canRunTests: false, canViewCosts: false,
  canViewSessions: false, canViewAllSessions: false, canManageEscalations: false,
  canApproveKnowledge: false, canMarkProblematicSessions: false,
  agencyScoped: false, userScoped: false, readOnlyStudio: false, readOnlyCampaigns: false,
};

function getActions(role: AppRole | null): AIVoiceActions {
  switch (role) {
    case 'superadmin':
      return FULL_ACCESS;

    case 'admin':
      return {
        ...FULL_ACCESS,
        canConfigureProviders: false,
        canSetCostLimits: false,
        canManageComplianceRules: false,
        canManageDeploymentsGlobal: false,
        canSwitchEnvironment: false,
        canViewCosts: false,
        canManageDeploymentsOwn: true,
      };

    case 'teamleiter':
      return {
        ...NO_ACCESS,
        canViewSessions: true,
        canManageEscalations: true,
        canRunTests: true,
        canManageDeploymentsOwn: true,
        agencyScoped: true,
        readOnlyStudio: true,
        readOnlyCampaigns: true,
      };

    case 'backoffice':
      return {
        ...NO_ACCESS,
        canViewSessions: true,
        canManageEscalations: true,
        userScoped: true,
      };

    case 'analyst':
      return {
        ...NO_ACCESS,
        canViewSessions: true,
        canViewAllSessions: true,
        canViewAuditLogs: true,
        canMarkProblematicSessions: true,
      };

    default:
      return NO_ACCESS;
  }
}

export function useAIVoicePermissions() {
  const { role } = useAuth();

  const allowedTabs = TAB_ACCESS[role ?? ''] ?? [];
  const actions = getActions(role);

  const canAccessModule = allowedTabs.length > 0;
  const canAccessTab = (tab: AIVoiceTab) => allowedTabs.includes(tab);
  const visibleTabs = allowedTabs;

  return {
    role,
    canAccessModule,
    canAccessTab,
    visibleTabs,
    ...actions,
  };
}
