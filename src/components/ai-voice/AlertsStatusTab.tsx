import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, DollarSign, XCircle, CheckCircle2, Clock, Bot } from 'lucide-react';

interface Alert {
  id: string;
  type: 'budget' | 'error' | 'compliance' | 'provider' | 'escalation';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

const MOCK_ALERTS: Alert[] = [
  { id: '1', type: 'budget', severity: 'warning', title: 'Tagesbudget bei 85%', description: 'Agent "Recruiting Bot" hat 85% des Tagesbudgets erreicht.', timestamp: '2026-04-09T14:30:00Z', resolved: false },
  { id: '2', type: 'error', severity: 'critical', title: '3 aufeinanderfolgende Fehler', description: 'Agent "Outbound Qualifier" hat 3 aufeinanderfolgende Fehler produziert.', timestamp: '2026-04-09T13:15:00Z', resolved: false },
  { id: '3', type: 'compliance', severity: 'warning', title: 'Compliance-Flag erkannt', description: 'Session #4821 wurde als problematisch markiert.', timestamp: '2026-04-09T12:00:00Z', resolved: false },
  { id: '4', type: 'provider', severity: 'info', title: 'Provider Latenz erhöht', description: 'Mock Provider zeigt erhöhte Antwortzeiten (>2s).', timestamp: '2026-04-09T11:45:00Z', resolved: true },
  { id: '5', type: 'escalation', severity: 'warning', title: '5 offene Eskalationen', description: 'Es gibt 5 unbearbeitete Eskalationen älter als 2 Stunden.', timestamp: '2026-04-09T10:30:00Z', resolved: false },
];

const SEV_STYLE: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-200',
  info: 'bg-blue-500/10 text-blue-700 border-blue-200',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  budget: DollarSign,
  error: XCircle,
  compliance: Shield,
  provider: Bot,
  escalation: AlertTriangle,
};

export default function AlertsStatusTab() {
  const [alerts] = useState<Alert[]>(MOCK_ALERTS);
  const open = alerts.filter(a => !a.resolved);
  const resolved = alerts.filter(a => a.resolved);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl bg-destructive/10 p-3"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">{open.filter(a => a.severity === 'critical').length}</p>
              <p className="text-xs text-muted-foreground">Kritische Warnungen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl bg-amber-500/10 p-3"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{open.length}</p>
              <p className="text-xs text-muted-foreground">Offene Warnungen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{resolved.length}</p>
              <p className="text-xs text-muted-foreground">Gelöste Warnungen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Alerts */}
      <Card>
        <CardHeader><CardTitle>Aktive Warnungen</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {open.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Keine aktiven Warnungen</p>
            </div>
          ) : open.map(a => {
            const Icon = TYPE_ICON[a.type] || AlertTriangle;
            return (
              <div key={a.id} className={`flex items-start gap-3 border rounded-lg p-4 ${SEV_STYLE[a.severity]}`}>
                <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{a.title}</p>
                    <Badge variant="outline" className="text-[10px]">{a.severity}</Badge>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{a.description}</p>
                  <p className="text-[10px] mt-1 opacity-50">{new Date(a.timestamp).toLocaleString('de-CH')}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Resolved */}
      {resolved.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-muted-foreground">Gelöste Warnungen</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {resolved.map(a => (
              <div key={a.id} className="flex items-center gap-3 border rounded-lg p-3 opacity-60">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
