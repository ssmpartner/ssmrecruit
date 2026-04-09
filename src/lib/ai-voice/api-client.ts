/**
 * AI Voice Agent – Unified API Client
 * 
 * Wraps all service calls with standardized pagination, filtering,
 * error handling, and response formatting.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  PaginationParams, PaginatedResponse, ApiResponse,
  AgentFilters, SessionFilters, CampaignFilters, EscalationFilters,
  AuditFilters, CostFilters, KnowledgeFilters,
  CreateAgentDTO, UpdateAgentDTO, CreateSessionDTO, CreateCampaignDTO,
  CreateEscalationDTO, CreateKnowledgeItemDTO,
  SystemHealthReport, ComponentHealth,
} from './api-types';
import { ApiError, NotFoundError, ValidationError } from './api-types';
import { getProviderRegistry } from './adapters';

const db = { from: (t: string) => supabase.from(t as any) };

// ── Helpers ───────────────────────────────────────────────────────

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID() } };
}

function err(e: unknown): ApiResponse {
  if (e instanceof ApiError) return e.toResponse();
  const msg = e instanceof Error ? e.message : 'Unknown error';
  return new ApiError('INTERNAL', msg, 500).toResponse();
}

async function paginate<T>(
  table: string,
  filters: PaginationParams & Record<string, unknown>,
  buildQuery: (q: any) => any,
): Promise<PaginatedResponse<T>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sortBy = filters.sortBy ?? 'created_at';
  const sortDir = filters.sortDir ?? 'desc';

  let q = db.from(table).select('*', { count: 'exact' });
  q = buildQuery(q);
  q = q.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw new ApiError('DB_ERROR', error.message, 500);

  const total = count ?? 0;
  return {
    data: (data ?? []) as T[],
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: to < total - 1 },
  };
}

async function auditLog(tableName: string, recordId: string, action: string, oldData: any, newData: any, changedBy: string) {
  await db.from('ai_audit_logs').insert({ table_name: tableName, record_id: recordId, action, old_data: oldData, new_data: newData, changed_by: changedBy } as any);
}

// ══════════════════════════════════════════════════════════════════
// AGENTS API
// ══════════════════════════════════════════════════════════════════

export const AgentsAPI = {
  async list(filters: AgentFilters = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_agents', filters, (q: any) => {
        if (!filters.includeDeleted) q = q.is('deleted_at', null);
        if (filters.status) q = q.eq('status', filters.status);
        if (filters.agentType) q = q.eq('agent_type', filters.agentType);
        if (filters.agencyId) q = q.eq('agency_id', filters.agencyId);
        if (filters.search) q = q.ilike('name', `%${filters.search}%`);
        return q;
      });
      return ok(result);
    } catch (e) { return err(e); }
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await db.from('ai_agents').select('*').eq('id', id).single();
      if (error || !data) throw new NotFoundError('Agent', id);
      return ok(data);
    } catch (e) { return err(e); }
  },

  async create(dto: CreateAgentDTO, userId: string): Promise<ApiResponse<any>> {
    try {
      if (!dto.name?.trim()) throw new ValidationError({ name: ['Name is required'] });
      const payload = { ...dto, created_by: userId, updated_by: userId, slug: dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-') };
      const { data, error } = await db.from('ai_agents').insert(payload as any).select().single();
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      await auditLog('ai_agents', (data as any).id, 'create', null, data, userId);
      return ok(data);
    } catch (e) { return err(e); }
  },

  async update(id: string, dto: UpdateAgentDTO, userId: string): Promise<ApiResponse<any>> {
    try {
      const old = (await this.getById(id)).data;
      const { data, error } = await db.from('ai_agents').update({ ...dto, updated_by: userId } as any).eq('id', id).select().single();
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      await auditLog('ai_agents', id, 'update', old, data, userId);
      return ok(data);
    } catch (e) { return err(e); }
  },

  async softDelete(id: string, userId: string): Promise<ApiResponse<any>> {
    return this.update(id, { status: 'archived' } as any, userId);
  },

  async getVersions(agentId: string, filters: PaginationParams = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_agent_versions', filters, (q: any) => q.eq('agent_id', agentId));
      return ok(result);
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// SESSIONS API
// ══════════════════════════════════════════════════════════════════

export const SessionsAPI = {
  async list(filters: SessionFilters = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_voice_sessions', filters, (q: any) => {
        if (filters.agentId) q = q.eq('agent_id', filters.agentId);
        if (filters.campaignId) q = q.eq('campaign_id', filters.campaignId);
        if (filters.status) q = q.eq('status', filters.status);
        if (filters.direction) q = q.eq('direction', filters.direction);
        if (filters.leadId) q = q.eq('lead_id', filters.leadId);
        if (filters.isTest !== undefined) q = q.eq('is_test', filters.isTest);
        if (filters.agencyId) q = q.eq('agency_id', filters.agencyId);
        if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
        if (filters.dateTo) q = q.lte('created_at', filters.dateTo);
        return q;
      });
      return ok(result);
    } catch (e) { return err(e); }
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await db.from('ai_voice_sessions').select('*').eq('id', id).single();
      if (error || !data) throw new NotFoundError('Session', id);
      return ok(data);
    } catch (e) { return err(e); }
  },

  async getTurns(sessionId: string, filters: PaginationParams = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_voice_turns', { ...filters, sortBy: 'turn_index', sortDir: 'asc' }, (q: any) => q.eq('session_id', sessionId));
      return ok(result);
    } catch (e) { return err(e); }
  },

  async create(dto: CreateSessionDTO, userId: string): Promise<ApiResponse<any>> {
    try {
      if (!dto.agent_id) throw new ValidationError({ agent_id: ['Agent ID is required'] });
      const uid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payload = { ...dto, session_uid: uid, status: 'initiated', assigned_user_id: userId };
      const { data, error } = await db.from('ai_voice_sessions').insert(payload as any).select().single();
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      return ok(data);
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// DEPLOYMENTS API
// ══════════════════════════════════════════════════════════════════

export const DeploymentsAPI = {
  async list(filters: PaginationParams & { agentId?: string; status?: string; environment?: string } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_agent_deployments', filters, (q: any) => {
        if (filters.agentId) q = q.eq('agent_id', filters.agentId);
        if (filters.status) q = q.eq('status', filters.status);
        if (filters.environment) q = q.eq('environment', filters.environment);
        return q;
      });
      return ok(result);
    } catch (e) { return err(e); }
  },

  async create(dto: Record<string, any>, userId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await db.from('ai_agent_deployments').insert({ ...dto, created_by_user: userId } as any).select().single();
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      await auditLog('ai_agent_deployments', (data as any).id, 'create', null, data, userId);
      return ok(data);
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// CAMPAIGNS API
// ══════════════════════════════════════════════════════════════════

export const CampaignsAPI = {
  async list(filters: CampaignFilters = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_voice_campaigns', filters, (q: any) => {
        if (filters.status) q = q.eq('status', filters.status);
        if (filters.agentId) q = q.eq('agent_id', filters.agentId);
        if (filters.agencyId) q = q.eq('agency_id', filters.agencyId);
        return q;
      });
      return ok(result);
    } catch (e) { return err(e); }
  },

  async create(dto: CreateCampaignDTO, userId: string): Promise<ApiResponse<any>> {
    try {
      if (!dto.name?.trim()) throw new ValidationError({ name: ['Name is required'] });
      if (!dto.agent_id) throw new ValidationError({ agent_id: ['Agent ID is required'] });
      const { data, error } = await db.from('ai_voice_campaigns').insert({ ...dto, created_by: userId } as any).select().single();
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      await auditLog('ai_voice_campaigns', (data as any).id, 'create', null, data, userId);
      return ok(data);
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// ESCALATIONS API
// ══════════════════════════════════════════════════════════════════

export const EscalationsAPI = {
  async list(filters: EscalationFilters = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_voice_escalations', filters, (q: any) => {
        if (filters.status) q = q.eq('status', filters.status);
        if (filters.priority) q = q.eq('priority', filters.priority);
        if (filters.agentId) q = q.eq('agent_id', filters.agentId);
        if (filters.assignedTo) q = q.eq('assigned_employee_id', filters.assignedTo);
        return q;
      });
      return ok(result);
    } catch (e) { return err(e); }
  },

  async create(dto: CreateEscalationDTO, userId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await db.from('ai_voice_escalations').insert(dto as any).select().single();
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      await auditLog('ai_voice_escalations', (data as any).id, 'create', null, data, userId);
      return ok(data);
    } catch (e) { return err(e); }
  },

  async resolve(id: string, notes: string, userId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await db.from('ai_voice_escalations')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: notes } as any)
        .eq('id', id).select().single();
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      await auditLog('ai_voice_escalations', id, 'resolve', null, data, userId);
      return ok(data);
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// KNOWLEDGE API
// ══════════════════════════════════════════════════════════════════

export const KnowledgeAPI = {
  async list(filters: KnowledgeFilters = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_voice_knowledge_items', filters, (q: any) => {
        if (filters.agentId) q = q.eq('agent_id', filters.agentId);
        if (filters.category) q = q.eq('category', filters.category);
        if (filters.approvalStatus) q = q.eq('approval_status', filters.approvalStatus);
        if (filters.isActive !== undefined) q = q.eq('is_active', filters.isActive);
        if (filters.search) q = q.ilike('title', `%${filters.search}%`);
        return q;
      });
      return ok(result);
    } catch (e) { return err(e); }
  },

  async create(dto: CreateKnowledgeItemDTO, userId: string): Promise<ApiResponse<any>> {
    try {
      if (!dto.title?.trim()) throw new ValidationError({ title: ['Title is required'] });
      const { data, error } = await db.from('ai_voice_knowledge_items').insert({ ...dto, owner_id: userId } as any).select().single();
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      return ok(data);
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// PROVIDER CONFIG API
// ══════════════════════════════════════════════════════════════════

export const ProviderConfigAPI = {
  async list(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await db.from('ai_provider_configs').select('*').order('created_at', { ascending: false });
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      return ok(data ?? []);
    } catch (e) { return err(e); }
  },

  async update(id: string, updates: Record<string, any>, userId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await db.from('ai_provider_configs').update(updates as any).eq('id', id).select().single();
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      await auditLog('ai_provider_configs', id, 'update', null, data, userId);
      return ok(data);
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// COST CONTROL API
// ══════════════════════════════════════════════════════════════════

export const CostControlAPI = {
  async list(filters: CostFilters = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_voice_cost_logs', filters, (q: any) => {
        if (filters.agentId) q = q.eq('agent_id', filters.agentId);
        if (filters.costType) q = q.eq('cost_type', filters.costType);
        if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
        if (filters.dateTo) q = q.lte('created_at', filters.dateTo);
        return q;
      });
      return ok(result);
    } catch (e) { return err(e); }
  },

  async getSummary(agentId?: string): Promise<ApiResponse<{ dailyTotal: number; monthlyTotal: number; currency: string }>> {
    try {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let qDay = db.from('ai_voice_cost_logs').select('total_cost').gte('created_at', dayStart);
      let qMonth = db.from('ai_voice_cost_logs').select('total_cost').gte('created_at', monthStart);
      if (agentId) { qDay = qDay.eq('agent_id', agentId); qMonth = qMonth.eq('agent_id', agentId); }

      const [dRes, mRes] = await Promise.all([qDay, qMonth]);
      const sum = (rows: any[]) => rows.reduce((s, r) => s + Number(r.total_cost || 0), 0);
      return ok({ dailyTotal: sum(dRes.data ?? []), monthlyTotal: sum(mRes.data ?? []), currency: 'CHF' });
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// AUDIT API
// ══════════════════════════════════════════════════════════════════

export const AuditAPI = {
  async list(filters: AuditFilters = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_audit_logs', { ...filters, sortBy: filters.sortBy ?? 'changed_at' }, (q: any) => {
        if (filters.tableName) q = q.eq('table_name', filters.tableName);
        if (filters.recordId) q = q.eq('record_id', filters.recordId);
        if (filters.action) q = q.eq('action', filters.action);
        if (filters.changedBy) q = q.eq('changed_by', filters.changedBy);
        if (filters.dateFrom) q = q.gte('changed_at', filters.dateFrom);
        if (filters.dateTo) q = q.lte('changed_at', filters.dateTo);
        return q;
      });
      return ok(result);
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// COMPLIANCE API
// ══════════════════════════════════════════════════════════════════

export const ComplianceAPI = {
  async list(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await db.from('ai_compliance_rules').select('*').order('created_at', { ascending: false });
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      return ok(data ?? []);
    } catch (e) { return err(e); }
  },

  async create(rule: Record<string, any>, userId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await db.from('ai_compliance_rules').insert(rule as any).select().single();
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      await auditLog('ai_compliance_rules', (data as any).id, 'create', null, data, userId);
      return ok(data);
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// TEST CENTER API
// ══════════════════════════════════════════════════════════════════

export const TestCenterAPI = {
  async list(filters: PaginationParams & { agentId?: string; status?: string } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const result = await paginate('ai_voice_test_runs', filters, (q: any) => {
        if (filters.agentId) q = q.eq('agent_id', filters.agentId);
        if (filters.status) q = q.eq('status', filters.status);
        return q;
      });
      return ok(result);
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// ANALYTICS API
// ══════════════════════════════════════════════════════════════════

export const AnalyticsAPI = {
  async getOverview(filters: { dateFrom?: string; dateTo?: string; agentId?: string; agencyId?: string } = {}): Promise<ApiResponse<Record<string, number>>> {
    try {
      let q = db.from('ai_voice_sessions').select('status, direction, outcome, duration_seconds, cost_total, is_test, result_type');
      if (filters.agentId) q = q.eq('agent_id', filters.agentId);
      if (filters.agencyId) q = q.eq('agency_id', filters.agencyId);
      if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
      if (filters.dateTo) q = q.lte('created_at', filters.dateTo);
      q = q.eq('is_test', false);

      const { data, error } = await q;
      if (error) throw new ApiError('DB_ERROR', error.message, 500);
      const sessions = data ?? [];

      const total = sessions.length;
      const connected = sessions.filter((s: any) => s.status === 'completed').length;
      const outbound = sessions.filter((s: any) => s.direction === 'outbound').length;
      const inbound = sessions.filter((s: any) => s.direction === 'inbound').length;
      const qualified = sessions.filter((s: any) => s.result_type === 'qualified').length;
      const appointments = sessions.filter((s: any) => s.outcome === 'appointment_scheduled' || s.result_type === 'appointment').length;
      const escalated = sessions.filter((s: any) => s.result_type === 'escalated' || s.outcome === 'escalated').length;
      const totalCost = sessions.reduce((s: number, r: any) => s + Number(r.cost_total || 0), 0);

      return ok({
        totalCalls: total, outboundCalls: outbound, inboundCalls: inbound,
        connectedRate: total ? Math.round((connected / total) * 100) : 0,
        qualificationRate: connected ? Math.round((qualified / connected) * 100) : 0,
        appointmentRate: connected ? Math.round((appointments / connected) * 100) : 0,
        escalationRate: connected ? Math.round((escalated / connected) * 100) : 0,
        totalCost, costPerCall: total ? Math.round((totalCost / total) * 100) / 100 : 0,
      });
    } catch (e) { return err(e); }
  },
};

// ══════════════════════════════════════════════════════════════════
// SYSTEM HEALTH API
// ══════════════════════════════════════════════════════════════════

export const SystemHealthAPI = {
  async getReport(): Promise<ApiResponse<SystemHealthReport>> {
    try {
      const registry = getProviderRegistry();
      const [telHealth, voiceHealth, transHealth, storHealth, whHealth] = await Promise.all([
        registry.telephony.healthCheck(),
        registry.voiceAI.healthCheck(),
        registry.transcription.healthCheck(),
        registry.storage.healthCheck(),
        registry.webhook.healthCheck(),
      ]);

      const toComponent = (h: any): ComponentHealth => ({
        status: h.status, provider: h.providerType ?? 'unknown', latencyMs: h.latencyMs, lastChecked: h.lastCheckedAt,
      });

      // Aggregate counts
      const [agentsRes, deploymentsRes, campaignsRes] = await Promise.all([
        db.from('ai_agents').select('status', { count: 'exact' }).is('deleted_at', null),
        db.from('ai_agent_deployments').select('status', { count: 'exact' }),
        db.from('ai_voice_campaigns').select('status', { count: 'exact' }),
      ]);

      const agents = agentsRes.data ?? [];
      const deployments = deploymentsRes.data ?? [];
      const campaigns = campaignsRes.data ?? [];

      const activeAgents = agents.filter((a: any) => a.status === 'active').length;
      const activeDeployments = deployments.filter((d: any) => d.status === 'active').length;
      const runningCampaigns = campaigns.filter((c: any) => c.status === 'running').length;

      const costSummary = (await CostControlAPI.getSummary()).data;
      const warnings: string[] = [];

      if (telHealth.status !== 'healthy') warnings.push('Telephony provider unhealthy');
      if (voiceHealth.status !== 'healthy') warnings.push('Voice AI provider unhealthy');
      if (costSummary && costSummary.dailyTotal > 500) warnings.push('Daily cost exceeds CHF 500');

      const overall = warnings.length > 2 ? 'critical' : warnings.length > 0 ? 'degraded' : 'healthy';

      return ok({
        overall, timestamp: new Date().toISOString(),
        components: {
          providers: {
            telephony: toComponent(telHealth), voiceAI: toComponent(voiceHealth),
            transcription: toComponent(transHealth), storage: toComponent(storHealth), webhook: toComponent(whHealth),
          },
          deployments: { active: activeDeployments, total: deployments.length, status: activeDeployments > 0 ? 'ok' : 'warning' },
          agents: { active: activeAgents, total: agents.length, status: activeAgents > 0 ? 'ok' : 'warning' },
          campaigns: { running: runningCampaigns, total: campaigns.length, status: 'ok' },
          budget: {
            dailyUsed: costSummary?.dailyTotal ?? 0, dailyLimit: 1000,
            monthlyUsed: costSummary?.monthlyTotal ?? 0, monthlyLimit: 20000,
            status: (costSummary?.monthlyTotal ?? 0) > 18000 ? 'exceeded' : (costSummary?.monthlyTotal ?? 0) > 15000 ? 'warning' : 'ok',
          },
          webhooks: { healthy: 0, failing: 0, status: 'ok' },
          mockMode: registry.telephony.providerType === 'mock',
        },
        criticalWarnings: warnings,
      });
    } catch (e) { return err(e); }
  },
};
