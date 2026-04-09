import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle, Shield, XCircle, CheckCircle2, Clock, Bot,
  RefreshCw, Settings2, Cloud, Phone, Zap, Activity, ArrowRight,
  Loader2, Info
} from 'lucide-react';
import {
  runHealthChecks, getTechnicalLogs, deriveGoLiveSteps,
  type HealthSummary, type HealthCheckResult, type SystemError, type TechnicalLogEntry,
  ERROR_CLASS_META, type ErrorClass,
} from '@/lib/ai-voice-health';

const STATUS_STYLE: Record<string, string> = {
  ok: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-200',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  not_configured: 'bg-muted text-muted-foreground border-border',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  not_configured: Settings2,
};

const SEV_STYLE: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-200',
  info: 'bg-blue-500/10 text-blue-700 border-blue-200',
};

const LOG_LEVEL_STYLE: Record<string, string> = {
  error: 'text-destructive',
  warn: 'text-amber-600',
  info: 'text-blue-600',
  debug: 'text-muted-foreground',
};

const OVERALL_META: Record<string, { label: string; color: string; desc: string }> = {
  healthy: { label: 'Bereit', color: 'text-emerald-600', desc: 'Alle Systeme konfiguriert' },
  degraded: { label: 'Eingeschränkt', color: 'text-amber-600', desc: 'Einzelne Komponenten fehlen' },
  critical: { label: 'Kritisch', color: 'text-destructive', desc: 'Kritische Fehler vorhanden' },
  not_ready: { label: 'Nicht bereit', color: 'text-muted-foreground', desc: 'Grundkonfiguration fehlt' },
};

export default function AlertsStatusTab() {
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<TechnicalLogEntry[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await runHealthChecks();
      setHealth(result);
      setLogs(getTechnicalLogs());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Health Checks werden ausgeführt…</span>
      </div>
    );
  }

  if (!health) return null;

  const overallMeta = OVERALL_META[health.overall] || OVERALL_META.not_ready;
  const goLiveSteps = deriveGoLiveSteps(health.checks);
  const configErrors = health.errors.filter(e => e.errorClass === 'configuration_error');

  return (
    <div className="space-y-6">
      {/* Overall Status Banner */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-xl p-3 ${health.overall === 'healthy' ? 'bg-emerald-500/10' : health.overall === 'critical' ? 'bg-destructive/10' : 'bg-amber-500/10'}`}>
                <Activity className={`h-6 w-6 ${overallMeta.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${overallMeta.color}`}>{overallMeta.label}</p>
                <p className="text-sm text-muted-foreground">{overallMeta.desc}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Letzte Prüfung: {new Date(health.timestamp).toLocaleString('de-CH')}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="checks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checks">Health Checks</TabsTrigger>
          <TabsTrigger value="errors">
            Fehler {health.errors.length > 0 && <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5">{health.errors.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="golive">Inbetriebnahme</TabsTrigger>
          <TabsTrigger value="logs">Technische Logs</TabsTrigger>
        </TabsList>

        {/* Health Checks */}
        <TabsContent value="checks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Bestanden', count: health.checks.filter(c => c.status === 'ok').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
              { label: 'Warnung', count: health.checks.filter(c => c.status === 'warning').length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10' },
              { label: 'Nicht konfiguriert', count: health.checks.filter(c => c.status === 'not_configured').length, icon: Settings2, color: 'text-muted-foreground', bg: 'bg-muted' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className={`rounded-xl p-3 ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
                  <div>
                    <p className="text-2xl font-bold">{s.count}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Systemkomponenten</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {health.checks.map(check => {
                const Icon = STATUS_ICON[check.status] || Settings2;
                return (
                  <div key={check.id} className={`flex items-start gap-3 border rounded-lg p-3 ${STATUS_STYLE[check.status]}`}>
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{check.label}</p>
                        <Badge variant="outline" className="text-[10px]">{check.component}</Badge>
                      </div>
                      <p className="text-xs mt-0.5 opacity-80">{check.detail}</p>
                      {check.recommendation && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs">
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          <span>{check.recommendation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors */}
        <TabsContent value="errors" className="space-y-4">
          {health.errors.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-40" />
                <p className="text-sm text-muted-foreground">Keine aktiven Fehler</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Group by error class */}
              {Object.entries(
                health.errors.reduce<Record<string, SystemError[]>>((acc, e) => {
                  (acc[e.errorClass] = acc[e.errorClass] || []).push(e);
                  return acc;
                }, {})
              ).map(([cls, errs]) => (
                <Card key={cls}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      {ERROR_CLASS_META[cls as ErrorClass]?.label || cls}
                      <Badge variant="outline" className="text-[10px]">{errs.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {errs.map(err => (
                      <div key={err.id} className={`border rounded-lg p-3 ${SEV_STYLE[err.severity]}`}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <p className="font-medium text-sm">{err.title}</p>
                          <Badge variant="outline" className="text-[10px] ml-auto">{err.component}</Badge>
                        </div>
                        <p className="text-xs mt-1 opacity-80">{err.description}</p>
                        {err.recommendation && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium">
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span>{err.recommendation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* Go-Live Checklist */}
        <TabsContent value="golive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Empfohlene Reihenfolge für Inbetriebnahme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {goLiveSteps.map(step => (
                <div key={step.order} className={`flex items-start gap-3 p-3 rounded-lg border ${step.status === 'done' ? 'bg-emerald-500/5 border-emerald-200' : 'bg-muted/30'}`}>
                  <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 ${step.status === 'done' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {step.status === 'done' ? <CheckCircle2 className="h-4 w-4" /> : step.order}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${step.status === 'done' ? 'text-emerald-700' : ''}`}>{step.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Typische Fehlerbilder</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { title: 'Provider Timeout', desc: 'OpenAI oder Twilio antworten nicht innerhalb von 5 Sekunden. Prüfe Netzwerk und API-Status.', cls: 'provider_error' },
                  { title: 'Action Gateway nicht erreichbar', desc: 'Railway Backend kann das Core Backend nicht erreichen. Prüfe Service-Token und URL.', cls: 'auth_error' },
                  { title: 'Session bleibt im Status "initiating"', desc: 'Call konnte nicht hergestellt werden. Prüfe Twilio-Credentials und Rufnummer.', cls: 'session_error' },
                  { title: 'Compliance-Verstoss erkannt', desc: 'Agent hat verbotene Aussage getätigt. Session wird automatisch eskaliert.', cls: 'compliance_error' },
                  { title: 'Webhook-Zustellung fehlgeschlagen', desc: 'Event konnte nach 3 Versuchen nicht zugestellt werden. Prüfe Endpoint-Verfügbarkeit.', cls: 'webhook_error' },
                  { title: 'Budget überschritten', desc: 'Tages- oder Gesamtbudget eines Agenten/Kampagne wurde erreicht. Calls werden pausiert.', cls: 'action_error' },
                ].map(err => (
                  <div key={err.title} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{err.title}</p>
                        <Badge variant="outline" className="text-[9px]">{ERROR_CLASS_META[err.cls as ErrorClass]?.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{err.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                Technische Logs
                <Badge variant="outline" className="text-[10px]">{logs.length} Einträge</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">Noch keine Log-Einträge</p>
                  <p className="text-xs text-muted-foreground mt-1">Logs werden bei Health Checks, Actions und Session-Events erzeugt.</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 p-2 rounded border text-xs font-mono">
                      <span className="text-[10px] text-muted-foreground w-16 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('de-CH')}
                      </span>
                      <Badge variant="outline" className={`text-[9px] w-12 justify-center shrink-0 ${LOG_LEVEL_STYLE[log.level]}`}>
                        {log.level}
                      </Badge>
                      <span className="text-muted-foreground w-20 shrink-0 truncate">{log.component}</span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
