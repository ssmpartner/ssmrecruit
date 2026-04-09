/**
 * AI Voice Agent – Health Check & Error Classification Service
 * Provides live system health checks, error taxonomy, and technical logging.
 */
import { supabase } from '@/integrations/supabase/client';

// ── Error Classes ─────────────────────────────────────────────────
export type ErrorClass =
  | 'configuration_error'
  | 'auth_error'
  | 'provider_error'
  | 'session_error'
  | 'action_error'
  | 'webhook_error'
  | 'compliance_error';

export interface SystemError {
  id: string;
  errorClass: ErrorClass;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  timestamp: string;
  resolved: boolean;
  component: string;
}

const ERROR_CLASS_META: Record<ErrorClass, { label: string; icon: string }> = {
  configuration_error: { label: 'Konfigurationsfehler', icon: 'Settings2' },
  auth_error: { label: 'Authentifizierungsfehler', icon: 'Shield' },
  provider_error: { label: 'Provider-Fehler', icon: 'Cloud' },
  session_error: { label: 'Session-Fehler', icon: 'Phone' },
  action_error: { label: 'Action-Fehler', icon: 'Zap' },
  webhook_error: { label: 'Webhook-Fehler', icon: 'Webhook' },
  compliance_error: { label: 'Compliance-Fehler', icon: 'ShieldAlert' },
};

export { ERROR_CLASS_META };

// ── Health Check Types ────────────────────────────────────────────
export interface HealthCheckResult {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'error' | 'not_configured';
  detail: string;
  recommendation?: string;
  component: string;
}

export interface HealthSummary {
  overall: 'healthy' | 'degraded' | 'critical' | 'not_ready';
  checks: HealthCheckResult[];
  errors: SystemError[];
  timestamp: string;
}

// ── Technical Log Types ───────────────────────────────────────────
export type LogCategory =
  | 'provider_event'
  | 'action_event'
  | 'webhook_event'
  | 'orchestration_event'
  | 'configuration_change'
  | 'runtime_warning';

export interface TechnicalLogEntry {
  id: string;
  category: LogCategory;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, unknown>;
  component: string;
  timestamp: string;
}

// ── In-memory log buffer (for UI display) ─────────────────────────
const logBuffer: TechnicalLogEntry[] = [];
const MAX_LOG_BUFFER = 200;

export function logTechnical(
  category: LogCategory,
  level: TechnicalLogEntry['level'],
  message: string,
  component: string,
  details?: Record<string, unknown>
) {
  const entry: TechnicalLogEntry = {
    id: crypto.randomUUID(),
    category,
    level,
    message,
    details,
    component,
    timestamp: new Date().toISOString(),
  };
  logBuffer.unshift(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) logBuffer.pop();
  return entry;
}

export function getTechnicalLogs(filter?: { category?: LogCategory; level?: string }): TechnicalLogEntry[] {
  let logs = [...logBuffer];
  if (filter?.category) logs = logs.filter(l => l.category === filter.category);
  if (filter?.level) logs = logs.filter(l => l.level === filter.level);
  return logs;
}

// ── Health Checks (live from DB & config) ─────────────────────────
const db = { from: (t: string) => supabase.from(t as any) };

export async function runHealthChecks(): Promise<HealthSummary> {
  const checks: HealthCheckResult[] = [];
  const errors: SystemError[] = [];
  const now = new Date().toISOString();

  // 1. Architecture config
  const { data: configRow } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'ai_voice_architecture_config')
    .maybeSingle();
  const archConfig = (configRow?.value as Record<string, string>) || {};

  // OpenAI configured
  const openaiOk = !!archConfig.openai_connection_placeholder;
  checks.push({
    id: 'openai', label: 'OpenAI konfiguriert', component: 'OpenAI',
    status: openaiOk ? 'warning' : 'not_configured',
    detail: openaiOk ? 'Platzhalter gesetzt – noch nicht live verbunden' : 'Kein OpenAI-Platzhalter konfiguriert',
    recommendation: openaiOk ? undefined : 'Unter Infrastruktur → Systemarchitektur den OpenAI-Platzhalter setzen.',
  });

  // Twilio prepared
  const twilioOk = !!archConfig.twilio_connection_placeholder;
  checks.push({
    id: 'twilio', label: 'Twilio vorbereitet', component: 'Twilio',
    status: twilioOk ? 'warning' : 'not_configured',
    detail: twilioOk ? 'Platzhalter gesetzt – noch nicht live verbunden' : 'Kein Twilio-Platzhalter konfiguriert',
    recommendation: twilioOk ? undefined : 'Unter Infrastruktur → Systemarchitektur den Twilio-Platzhalter setzen.',
  });

  // Railway backend URL
  const railwayOk = !!archConfig.voice_backend_base_url;
  checks.push({
    id: 'railway', label: 'Railway Backend URL', component: 'Railway',
    status: railwayOk ? 'warning' : 'not_configured',
    detail: railwayOk ? `URL: ${archConfig.voice_backend_base_url}` : 'Keine Backend-URL konfiguriert',
    recommendation: railwayOk ? undefined : 'Unter Infrastruktur → Systemarchitektur die Voice Backend URL setzen.',
  });

  // Action Gateway
  const gatewayOk = !!archConfig.internal_service_token_placeholder;
  checks.push({
    id: 'gateway', label: 'Action Gateway Verbindung', component: 'Core Backend',
    status: gatewayOk ? 'warning' : 'not_configured',
    detail: gatewayOk ? 'Service-Token-Platzhalter gesetzt' : 'Kein interner Service-Token konfiguriert',
    recommendation: gatewayOk ? undefined : 'Unter Infrastruktur → Systemarchitektur den Service Token Platzhalter setzen.',
  });

  // Provider settings complete
  const { data: providers } = await db.from('ai_provider_configs').select('id, name, status, provider_category');
  const providerCount = providers?.length || 0;
  const activeProviders = providers?.filter((p: any) => p.status === 'active') || [];
  checks.push({
    id: 'providers', label: 'Provider Settings', component: 'Infrastruktur',
    status: providerCount > 0 ? (activeProviders.length > 0 ? 'ok' : 'warning') : 'not_configured',
    detail: `${providerCount} Provider konfiguriert, ${activeProviders.length} aktiv`,
    recommendation: activeProviders.length === 0 ? 'Mindestens einen Provider aktivieren (Infrastruktur → Provider).' : undefined,
  });

  // At least one agent
  const { count: agentCount } = await db.from('ai_agents').select('id', { count: 'exact', head: true }).is('deleted_at', null);
  checks.push({
    id: 'agents', label: 'Mindestens ein Agent', component: 'Betrieb',
    status: (agentCount || 0) > 0 ? 'ok' : 'not_configured',
    detail: `${agentCount || 0} Agenten vorhanden`,
    recommendation: (agentCount || 0) === 0 ? 'Unter Betrieb → Agenten mindestens einen Agent erstellen.' : undefined,
  });

  // At least one campaign
  const { count: campaignCount } = await db.from('ai_voice_campaigns').select('id', { count: 'exact', head: true });
  checks.push({
    id: 'campaigns', label: 'Mindestens eine Kampagne', component: 'Betrieb',
    status: (campaignCount || 0) > 0 ? 'ok' : 'not_configured',
    detail: `${campaignCount || 0} Kampagnen vorhanden`,
    recommendation: (campaignCount || 0) === 0 ? 'Unter Betrieb → Kampagnen eine Kampagne erstellen.' : undefined,
  });

  // Derive errors from failed checks
  checks.filter(c => c.status === 'not_configured').forEach(c => {
    errors.push({
      id: `err_${c.id}`,
      errorClass: 'configuration_error',
      severity: 'warning',
      title: `${c.label} – nicht konfiguriert`,
      description: c.detail,
      recommendation: c.recommendation || '',
      timestamp: now,
      resolved: false,
      component: c.component,
    });
  });

  // Overall status
  const criticalCount = errors.filter(e => e.severity === 'critical').length;
  const warningCount = errors.length;
  const notConfiguredCount = checks.filter(c => c.status === 'not_configured').length;
  let overall: HealthSummary['overall'] = 'healthy';
  if (criticalCount > 0) overall = 'critical';
  else if (notConfiguredCount >= 4) overall = 'not_ready';
  else if (warningCount > 0) overall = 'degraded';

  logTechnical('orchestration_event', 'info', `Health check completed: ${overall} (${checks.length} checks, ${errors.length} issues)`, 'HealthCheck');

  return { overall, checks, errors, timestamp: now };
}

// ── Go-Live Readiness ─────────────────────────────────────────────
export interface GoLiveStep {
  order: number;
  label: string;
  description: string;
  checkId: string;
  status: 'done' | 'pending' | 'blocked';
}

export function deriveGoLiveSteps(checks: HealthCheckResult[]): GoLiveStep[] {
  const getStatus = (id: string): GoLiveStep['status'] => {
    const c = checks.find(ch => ch.id === id);
    if (!c) return 'blocked';
    return c.status === 'ok' || c.status === 'warning' ? 'done' : 'pending';
  };

  return [
    { order: 1, label: 'Agenten erstellen', description: 'Mindestens einen AI-Agenten mit Begrüssung, Prompt und Regeln anlegen.', checkId: 'agents', status: getStatus('agents') },
    { order: 2, label: 'Knowledge Base füllen', description: 'Wissensinhalte für die Agenten vorbereiten und freigeben.', checkId: 'agents', status: 'done' },
    { order: 3, label: 'Provider konfigurieren', description: 'OpenAI und Twilio Platzhalter setzen, Provider-Einträge aktivieren.', checkId: 'providers', status: getStatus('providers') },
    { order: 4, label: 'Railway Backend deployen', description: 'Voice Backend auf Railway deployen und URL hinterlegen.', checkId: 'railway', status: getStatus('railway') },
    { order: 5, label: 'OpenAI verbinden', description: 'API Key konfigurieren und Realtime-Endpoint aktivieren.', checkId: 'openai', status: getStatus('openai') },
    { order: 6, label: 'Twilio aktivieren', description: 'Credentials eintragen, Rufnummern zuordnen, Webhooks konfigurieren.', checkId: 'twilio', status: getStatus('twilio') },
    { order: 7, label: 'Action Gateway sichern', description: 'Service-Token generieren, Signaturvalidierung aktivieren.', checkId: 'gateway', status: getStatus('gateway') },
    { order: 8, label: 'Kampagne starten', description: 'Erste Kampagne im Shadow-Modus starten und überwachen.', checkId: 'campaigns', status: getStatus('campaigns') },
  ];
}
