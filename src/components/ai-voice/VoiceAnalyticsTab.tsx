import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Clock, CheckCircle2, MessageSquare, PhoneCall, Calendar, AlertTriangle, DollarSign, XCircle, Target } from 'lucide-react';

export default function VoiceAnalyticsTab() {
  const metrics = [
    { label: 'Erfolgsrate', value: '78%', icon: TrendingUp, color: 'text-green-600' },
    { label: 'Ø Dauer', value: '32s', icon: Clock, color: 'text-blue-600' },
    { label: 'Abgeschlossen', value: '47', icon: CheckCircle2, color: 'text-primary' },
    { label: 'Ø Turns', value: '6.2', icon: MessageSquare, color: 'text-purple-600' },
    { label: 'Terminquote', value: '34%', icon: Calendar, color: 'text-green-600' },
    { label: 'Eskalationsquote', value: '12%', icon: AlertTriangle, color: 'text-orange-500' },
    { label: 'Abbruchquote', value: '8%', icon: XCircle, color: 'text-red-500' },
    { label: 'Kosten/Call', value: '0.87 CHF', icon: DollarSign, color: 'text-primary' },
  ];

  const agentPerf = [
    { name: 'SSM Recruiting Bot', calls: 47, success: 78, appointments: 16, cost_per_lead: 2.45 },
    { name: 'SSM Inbound Assistent', calls: 12, success: 85, appointments: 6, cost_per_lead: 1.80 },
  ];

  const campaignPerf = [
    { name: 'Frühlings-Recruiting 2026', calls: 47, success: 78, cost_per_appointment: 8.50 },
    { name: 'Reactivation Q2', calls: 22, success: 45, cost_per_appointment: 15.20 },
  ];

  const dailyCalls = [
    { date: '04.04', calls: 8 }, { date: '05.04', calls: 12 }, { date: '06.04', calls: 9 },
    { date: '07.04', calls: 15 }, { date: '08.04', calls: 11 }, { date: '09.04', calls: 5 },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Analytics</h3>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <m.icon className={`h-5 w-5 mx-auto mb-2 ${m.color}`} />
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls per Day */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Calls pro Tag</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyCalls.map(d => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-12">{d.date}</span>
                  <div className="flex-1"><Progress value={(d.calls / 20) * 100} className="h-2.5" /></div>
                  <span className="text-sm font-medium w-8 text-right">{d.calls}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion per Agent */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Conversion pro Agent</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agentPerf.map((a, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{a.name}</span>
                    <span className="text-sm">{a.success}% Erfolg</span>
                  </div>
                  <Progress value={a.success} className="h-2 mb-1" />
                  <div className="flex gap-3 text-[11px] text-muted-foreground">
                    <span>{a.calls} Calls</span>
                    <span>{a.appointments} Termine</span>
                    <span>{a.cost_per_lead.toFixed(2)} CHF/Lead</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Erfolgsquote nach Kampagne</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaignPerf.map((c, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/40">
                  <p className="text-sm font-medium mb-1">{c.name}</p>
                  <Progress value={c.success} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{c.calls} Calls · {c.success}% Erfolg</span>
                    <span>{c.cost_per_appointment.toFixed(2)} CHF/Termin</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
