/**
 * AI Voice Agent – Service Layer
 * CRUD operations, status logic, audit logging.
 * Uses `as any` casts because the generated types may lag behind migrations.
 */
import { supabase } from '@/integrations/supabase/client';

// ── Types ──────────────────────────────────────────────────────────
export type AgentStatus = 'draft' | 'testing' | 'active' | 'paused' | 'archived';
export type AgentType = 'outbound' | 'inbound' | 'hybrid' | 'callback' | 'qualification' | 'reactivation';
export type RolloutMode = 'off' | 'shadow' | 'recommendation' | 'assisted' | 'autonomous';
export type ExecutionMode = 'suggested' | 'approved' | 'auto_executed' | 'blocked' | 'failed';

// helper – typed insert/update bypass for new columns
const db = {
  from: (table: string) => supabase.from(table as any),
};

// ── Audit helper ───────────────────────────────────────────────────
async function auditLog(tableName: string, recordId: string, action: string, oldData: any, newData: any, changedBy: string) {
  await db.from('ai_audit_logs').insert({
    table_name: tableName,
    record_id: recordId,
    action,
    old_data: oldData,
    new_data: newData,
    changed_by: changedBy,
  } as any);
}

// ── AI Agents CRUD ─────────────────────────────────────────────────
export const aiAgentsService = {
  async list(includeDeleted = false) {
    let q = db.from('ai_agents').select('*').order('created_at', { ascending: false });
    if (!includeDeleted) q = q.is('deleted_at', null);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await db.from('ai_agents').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create(agent: Record<string, any>, userId: string) {
    const payload = { ...agent, created_by: userId, updated_by: userId };
    const { data, error } = await db.from('ai_agents').insert(payload as any).select().single();
    if (error) throw error;
    await auditLog('ai_agents', (data as any).id, 'create', null, data, userId);
    return data;
  },

  async update(id: string, updates: Record<string, any>, userId: string) {
    const old = await aiAgentsService.getById(id);
    const { data, error } = await db.from('ai_agents').update({ ...updates, updated_by: userId } as any).eq('id', id).select().single();
    if (error) throw error;
    await auditLog('ai_agents', id, 'update', old, data, userId);
    return data;
  },

  async softDelete(id: string, userId: string) {
    return aiAgentsService.update(id, { deleted_at: new Date().toISOString(), status: 'archived' }, userId);
  },

  async updateStatus(id: string, newStatus: AgentStatus, userId: string) {
    const VALID_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
      draft: ['testing', 'archived'],
      testing: ['active', 'draft', 'archived'],
      active: ['paused', 'archived'],
      paused: ['active', 'archived'],
      archived: ['draft'],
    };
    const agent = await aiAgentsService.getById(id);
    const current = (agent as any).status as AgentStatus;
    if (!VALID_TRANSITIONS[current]?.includes(newStatus)) {
      throw new Error(`Statuswechsel von "${current}" zu "${newStatus}" nicht erlaubt`);
    }
    return aiAgentsService.update(id, { status: newStatus }, userId);
  },
};

// ── Agent Versions CRUD ────────────────────────────────────────────
export const aiAgentVersionsService = {
  async listByAgent(agentId: string) {
    const { data, error } = await db.from('ai_agent_versions').select('*').eq('agent_id', agentId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(version: Record<string, any>, userId: string) {
    const payload = { ...version, created_by: userId };
    const { data, error } = await db.from('ai_agent_versions').insert(payload as any).select().single();
    if (error) throw error;
    await auditLog('ai_agent_versions', (data as any).id, 'create', null, data, userId);
    return data;
  },

  async publish(id: string, agentId: string, userId: string) {
    await db.from('ai_agent_versions').update({ is_published: false } as any).eq('agent_id', agentId);
    const { data, error } = await db.from('ai_agent_versions').update({ is_published: true, status: 'published' } as any).eq('id', id).select().single();
    if (error) throw error;
    await aiAgentsService.update(agentId, { active_version_id: id }, userId);
    await auditLog('ai_agent_versions', id, 'publish', null, data, userId);
    return data;
  },
};

// ── Deployments CRUD ───────────────────────────────────────────────
export const aiDeploymentsService = {
  async listByAgent(agentId: string) {
    const { data, error } = await db.from('ai_agent_deployments').select('*').eq('agent_id', agentId).order('priority', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(deployment: Record<string, any>, userId: string) {
    const payload = { ...deployment, created_by_user: userId };
    const { data, error } = await db.from('ai_agent_deployments').insert(payload as any).select().single();
    if (error) throw error;
    await auditLog('ai_agent_deployments', (data as any).id, 'create', null, data, userId);
    return data;
  },

  async update(id: string, updates: Record<string, any>, _userId: string) {
    const { data, error } = await db.from('ai_agent_deployments').update(updates as any).eq('id', id).select().single();
    if (error) throw error;
    await auditLog('ai_agent_deployments', id, 'update', null, data, _userId);
    return data;
  },
};

// ── Voice Sessions CRUD ────────────────────────────────────────────
export const aiSessionsService = {
  async list(filters?: { agentId?: string; status?: string; limit?: number }) {
    let q = db.from('ai_voice_sessions').select('*').order('created_at', { ascending: false });
    if (filters?.agentId) q = q.eq('agent_id', filters.agentId);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.limit) q = q.limit(filters.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await db.from('ai_voice_sessions').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async getTurns(sessionId: string) {
    const { data, error } = await db.from('ai_voice_turns').select('*').eq('session_id', sessionId).order('turn_index', { ascending: true });
    if (error) throw error;
    return data;
  },
};

// ── Campaigns CRUD ─────────────────────────────────────────────────
export const aiCampaignsService = {
  async list() {
    const { data, error } = await db.from('ai_voice_campaigns').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(campaign: Record<string, any>, userId: string) {
    const payload = { ...campaign, created_by: userId };
    const { data, error } = await db.from('ai_voice_campaigns').insert(payload as any).select().single();
    if (error) throw error;
    await auditLog('ai_voice_campaigns', (data as any).id, 'create', null, data, userId);
    return data;
  },
};

// ── Knowledge Items CRUD ───────────────────────────────────────────
export const aiKnowledgeService = {
  async list(agentId?: string) {
    let q = db.from('ai_voice_knowledge_items').select('*').order('created_at', { ascending: false });
    if (agentId) q = q.eq('agent_id', agentId);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async create(item: Record<string, any>) {
    const { data, error } = await db.from('ai_voice_knowledge_items').insert(item as any).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, any>) {
    const { data, error } = await db.from('ai_voice_knowledge_items').update(updates as any).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ── Provider Configs CRUD ──────────────────────────────────────────
export const aiProviderService = {
  async list() {
    const { data, error } = await db.from('ai_provider_configs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(config: Record<string, any>) {
    const { data, error } = await db.from('ai_provider_configs').insert(config as any).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, any>) {
    const { data, error } = await db.from('ai_provider_configs').update(updates as any).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ── Cost Logs ──────────────────────────────────────────────────────
export const aiCostService = {
  async list(filters?: { agentId?: string; from?: string; to?: string }) {
    let q = db.from('ai_voice_cost_logs').select('*').order('created_at', { ascending: false });
    if (filters?.agentId) q = q.eq('agent_id', filters.agentId);
    if (filters?.from) q = q.gte('created_at', filters.from);
    if (filters?.to) q = q.lte('created_at', filters.to);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async getTotal(agentId?: string) {
    const logs = await aiCostService.list(agentId ? { agentId } : undefined);
    return (logs ?? []).reduce((sum: number, l: any) => sum + Number(l.total_cost || l.amount || 0), 0);
  },
};

// ── Escalations CRUD ───────────────────────────────────────────────
export const aiEscalationsService = {
  async list(filters?: { status?: string }) {
    let q = db.from('ai_voice_escalations').select('*').order('created_at', { ascending: false });
    if (filters?.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async resolve(id: string, note: string) {
    const { data, error } = await db.from('ai_voice_escalations')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: note } as any)
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ── Compliance Rules CRUD ──────────────────────────────────────────
export const aiComplianceService = {
  async list() {
    const { data, error } = await db.from('ai_compliance_rules').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(rule: Record<string, any>) {
    const { data, error } = await db.from('ai_compliance_rules').insert(rule as any).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, any>) {
    const { data, error } = await db.from('ai_compliance_rules').update(updates as any).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ── Audit Logs Read ────────────────────────────────────────────────
export const aiAuditService = {
  async list(filters?: { tableName?: string; recordId?: string; limit?: number }) {
    let q = db.from('ai_audit_logs').select('*').order('changed_at', { ascending: false });
    if (filters?.tableName) q = q.eq('table_name', filters.tableName);
    if (filters?.recordId) q = q.eq('record_id', filters.recordId);
    if (filters?.limit) q = q.limit(filters.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
};
