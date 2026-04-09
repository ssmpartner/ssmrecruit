/**
 * AI Voice Agent – Public API barrel export
 */

// Adapters & Provider Registry
export {
  type TelephonyAdapterInterface,
  type VoiceAIAdapterInterface,
  type TranscriptionAdapterInterface,
  type StorageAdapterInterface,
  type WebhookAdapterInterface,
  type ProviderRegistry,
  type ProviderHealth,
  MockTelephonyAdapter,
  MockVoiceAIAdapter,
  MockTranscriptionAdapter,
  MockStorageAdapter,
  MockWebhookAdapter,
  CustomProviderAdapterPlaceholder,
  getProviderRegistry,
  setProviderAdapter,
} from './adapters';

// API Types & Error Classes
export {
  type PaginationParams,
  type PaginatedResponse,
  type ApiResponse,
  type AgentFilters,
  type SessionFilters,
  type CampaignFilters,
  type EscalationFilters,
  type AuditFilters,
  type CostFilters,
  type KnowledgeFilters,
  type CreateAgentDTO,
  type UpdateAgentDTO,
  type CreateSessionDTO,
  type CreateCampaignDTO,
  type CreateEscalationDTO,
  type CreateKnowledgeItemDTO,
  type SystemHealthReport,
  type WebhookEventType,
  type WebhookEvent,
  type WebhookSubscription,
  ApiError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
  ProviderError,
  BudgetExceededError,
} from './api-types';

// API Clients
export {
  AgentsAPI,
  SessionsAPI,
  DeploymentsAPI,
  CampaignsAPI,
  EscalationsAPI,
  KnowledgeAPI,
  ProviderConfigAPI,
  CostControlAPI,
  AuditAPI,
  ComplianceAPI,
  TestCenterAPI,
  AnalyticsAPI,
  SystemHealthAPI,
} from './api-client';

// Webhook Infrastructure
export {
  WebhookSubscriptionService,
  WebhookDispatcher,
  InboundWebhookHandler,
} from './webhook-service';

// OpenAI Session Context
export {
  type OpenAISessionContext,
  type OpenAIToolDefinition,
  type OpenAIRealtimeConfig,
  buildSessionContext,
  composeSystemPrompt,
  buildRealtimeConfig,
  getOpenAIToolDefinitions,
} from './openai-session-context';
