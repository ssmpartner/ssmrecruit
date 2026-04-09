/**
 * AI Voice Agent – API Types, DTOs, Error Classes, Response Standardization
 */

// ── Pagination ────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ── Standard API Response ─────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
  meta?: {
    timestamp: string;
    requestId: string;
    duration?: number;
  };
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  statusCode: number;
}

// ── Error Classes ─────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(): ApiResponse {
    return {
      success: false,
      error: { code: this.code, message: this.message, statusCode: this.statusCode, details: this.details },
      meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID() },
    };
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id "${id}" not found`, 404);
  }
}

export class ValidationError extends ApiError {
  constructor(details: Record<string, string[]>) {
    super('VALIDATION_ERROR', 'Request validation failed', 422, details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(action?: string) {
    super('FORBIDDEN', action ? `Not authorized: ${action}` : 'Not authorized', 403);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class ProviderError extends ApiError {
  constructor(provider: string, message: string) {
    super('PROVIDER_ERROR', `[${provider}] ${message}`, 502);
  }
}

export class BudgetExceededError extends ApiError {
  constructor(scope: string, limit: number, current: number) {
    super('BUDGET_EXCEEDED', `Budget exceeded for ${scope}: ${current}/${limit}`, 429);
  }
}

// ── Filter Types ──────────────────────────────────────────────────

export interface AgentFilters extends PaginationParams {
  status?: string;
  agentType?: string;
  agencyId?: string;
  includeDeleted?: boolean;
  search?: string;
}

export interface SessionFilters extends PaginationParams {
  agentId?: string;
  campaignId?: string;
  status?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
  leadId?: string;
  isTest?: boolean;
  agencyId?: string;
}

export interface CampaignFilters extends PaginationParams {
  status?: string;
  agentId?: string;
  agencyId?: string;
}

export interface EscalationFilters extends PaginationParams {
  status?: string;
  priority?: string;
  agentId?: string;
  assignedTo?: string;
}

export interface AuditFilters extends PaginationParams {
  tableName?: string;
  recordId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  changedBy?: string;
}

export interface CostFilters extends PaginationParams {
  agentId?: string;
  agencyId?: string;
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
  costType?: string;
}

export interface KnowledgeFilters extends PaginationParams {
  agentId?: string;
  category?: string;
  approvalStatus?: string;
  isActive?: boolean;
  search?: string;
}

// ── DTOs ──────────────────────────────────────────────────────────

export interface CreateAgentDTO {
  name: string;
  slug?: string;
  description?: string;
  agent_type?: string;
  language?: string;
  system_prompt?: string;
  greeting_message?: string;
  fallback_message?: string;
  max_turns?: number;
  max_call_duration_seconds?: number;
  agency_id?: string;
  voice_id?: string;
  tone_style?: string;
  test_only?: boolean;
}

export interface UpdateAgentDTO extends Partial<CreateAgentDTO> {
  status?: string;
  is_active?: boolean;
  allow_auto_actions?: boolean;
  allow_human_handover?: boolean;
  knowledge_mode?: string;
  telephony_provider_id?: string;
  voice_ai_provider_id?: string;
}

export interface CreateSessionDTO {
  agent_id: string;
  direction: 'inbound' | 'outbound';
  lead_id?: string;
  campaign_id?: string;
  phone_number_from?: string;
  phone_number_to?: string;
  is_test?: boolean;
  agency_id?: string;
}

export interface CreateCampaignDTO {
  name: string;
  agent_id: string;
  description?: string;
  campaign_type?: string;
  target_statuses?: string[];
  target_lead_sources?: string[];
  max_calls_per_day?: number;
  cost_limit_daily?: number;
  cost_limit_total?: number;
  schedule_start?: string;
  schedule_end?: string;
  agency_id?: string;
}

export interface CreateEscalationDTO {
  session_id: string;
  agent_id: string;
  reason: string;
  priority?: string;
  escalation_type?: string;
  lead_id?: string;
  assigned_employee_id?: string;
}

export interface CreateKnowledgeItemDTO {
  title: string;
  content: string;
  category?: string;
  agent_id?: string;
  tags?: string[];
  language?: string;
  risk_class?: string;
}

// ── System Health ─────────────────────────────────────────────────

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  components: {
    providers: { telephony: ComponentHealth; voiceAI: ComponentHealth; transcription: ComponentHealth; storage: ComponentHealth; webhook: ComponentHealth };
    deployments: { active: number; total: number; status: 'ok' | 'warning' | 'error' };
    agents: { active: number; total: number; status: 'ok' | 'warning' | 'error' };
    campaigns: { running: number; total: number; status: 'ok' | 'warning' | 'error' };
    budget: { dailyUsed: number; dailyLimit: number; monthlyUsed: number; monthlyLimit: number; status: 'ok' | 'warning' | 'exceeded' };
    webhooks: { healthy: number; failing: number; status: 'ok' | 'warning' | 'error' };
    mockMode: boolean;
  };
  criticalWarnings: string[];
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'offline' | 'not_configured';
  provider: string;
  latencyMs?: number;
  lastChecked?: string;
}

// ── Webhook Event Types ───────────────────────────────────────────

export type WebhookEventType =
  | 'session.started' | 'session.ended' | 'session.failed'
  | 'escalation.created' | 'escalation.resolved'
  | 'action.executed' | 'action.blocked' | 'action.suggested'
  | 'agent.status_changed' | 'agent.deployed'
  | 'campaign.started' | 'campaign.paused' | 'campaign.ended'
  | 'budget.warning' | 'budget.exceeded'
  | 'compliance.violation'
  | 'kill_switch.activated' | 'kill_switch.deactivated';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
  source: 'ai_voice_agent';
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  isActive: boolean;
  createdAt: string;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: 'success' | 'failed';
  failureCount: number;
}
