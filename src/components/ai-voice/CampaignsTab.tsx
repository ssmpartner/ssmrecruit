import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Megaphone, Play, Pause, Clock, DollarSign, RotateCcw, Target, Calendar } from 'lucide-react';

const MOCK_CAMPAIGNS = [
  {
    id: '1', name: 'Frühlings-Recruiting 2026', description: 'Outbound-Kampagne für neue Finanzberater', type: 'outbound',
    agent: 'SSM Recruiting Bot', status: 'running', total_calls: 120, completed_calls: 47, success_rate: 78,
    timezone: 'Europe/Zurich', max_per_day: 50, cost_limit_daily: 100, cost_limit_total: 2000, cost_used: 385.50,
    schedule: 'Mo–Fr 09:00–18:00', retry_rules: 'Max 3, Intervall 24h',
    target_filter: 'Position: Finanzberater · Region: Zürich, Bern',
  },
  {
    id: '2', name: 'Zürich Region Inbound', description: 'Inbound-Routing für Region Zürich', type: 'inbound-routing',
    agent: 'SSM Inbound Assistent', status: 'draft', total_calls: 0, completed_calls: 0, success_rate: 0,
    timezone: 'Europe/Zurich', max_per_day: 100, cost_limit_daily: 200, cost_limit_total: 5000, cost_used: 0,
    schedule: 'Mo–Sa 08:00–20:00', retry_rules: 'Nicht aktiv',
    target_filter: 'Alle Inbound-Calls Region ZH',
  },
  {
    id: '3', name: 'Reactivation Q2', description: 'Reaktivierung inaktiver Leads', type: 'reactivation',
    agent: 'Callback Agent', status: 'paused', total_calls: 60, completed_calls: 22, success_rate: 45,
    timezone: 'Europe/Zurich', max_per_day: 30, cost_limit_daily: 75, cost_limit_total: 1000, cost_used: 210.00,
    schedule: 'Mo–Fr 10:00–17:00', retry_rules: 'Max 2, Intervall 48h',
    target_filter: 'Status: Inaktiv > 30 Tage',
  },
];

export default function CampaignsTab() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kampagnen</h3>
          <p className="text-sm text-muted-foreground">Outbound- und Routing-Kampagnen verwalten</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Neue Kampagne</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Kampagne erstellen</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Name</Label><Input placeholder="Kampagnenname" /></div>
              <div className="space-y-1.5"><Label>Beschreibung</Label><Textarea rows={2} placeholder="Kurzbeschreibung" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Typ</Label>
                  <Select defaultValue="outbound"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="outbound">Outbound</SelectItem><SelectItem value="reactivation">Reactivation</SelectItem><SelectItem value="callback">Callback</SelectItem><SelectItem value="inbound-routing">Inbound-Routing</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Agent</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Agent wählen" /></SelectTrigger>
                    <SelectContent><SelectItem value="1">SSM Recruiting Bot</SelectItem><SelectItem value="2">SSM Inbound</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <p className="text-sm font-medium">Zielgruppe & Filter</p>
              <div className="space-y-1.5"><Label>Zielgruppenfilter</Label><Textarea rows={2} placeholder='{"positions": ["Finanzberater"], "regions": ["Zürich"]}' /></div>
              <div className="space-y-1.5"><Label>Quellfilter</Label><Input placeholder="z.B. website, meta, tiktok" /></div>
              <Separator />
              <p className="text-sm font-medium">Zeitfenster & Retry</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Timezone</Label><Input defaultValue="Europe/Zurich" /></div>
                <div className="space-y-1.5"><Label>Calls/Tag max</Label><Input type="number" defaultValue={50} /></div>
              </div>
              <div className="space-y-1.5"><Label>Zeitplan</Label><Input placeholder='{"weekdays":[1,2,3,4,5],"hours":{"start":"09:00","end":"18:00"}}' /></div>
              <div className="space-y-1.5"><Label>Retry-Regeln</Label><Input placeholder='{"max_retries":3,"retry_interval_hours":24}' /></div>
              <Separator />
              <p className="text-sm font-medium">Kostenlimits</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Tageslimit (CHF)</Label><Input type="number" defaultValue={100} /></div>
                <div className="space-y-1.5"><Label>Gesamtlimit (CHF)</Label><Input type="number" defaultValue={2000} /></div>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
                <Button onClick={() => { toast.success('Kampagne erstellt (Mock)'); setShowCreate(false); }}>Erstellen</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {MOCK_CAMPAIGNS.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-primary" /></div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{c.name}</p>
                      <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                      <Badge variant={c.status === 'running' ? 'default' : c.status === 'paused' ? 'secondary' : 'outline'} className="text-[10px]">{c.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {c.status === 'running' && <Button size="sm" variant="outline"><Pause className="h-3.5 w-3.5" /></Button>}
                  {c.status !== 'running' && <Button size="sm" variant="outline"><Play className="h-3.5 w-3.5" /></Button>}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Agent:</span><span className="font-medium">{c.agent}</span></div>
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">{c.schedule}</span></div>
                <div className="flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">{c.retry_rules}</span></div>
                <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-medium">{c.cost_used.toFixed(0)}/{c.cost_limit_total} CHF</span></div>
              </div>
              {c.total_calls > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{c.completed_calls}/{c.total_calls} Calls · {c.success_rate}% Erfolg</span>
                    <span className="font-medium">{Math.round(c.completed_calls / c.total_calls * 100)}%</span>
                  </div>
                  <Progress value={c.completed_calls / c.total_calls * 100} className="h-1.5" />
                </div>
              )}
              <div className="mt-2 text-[11px] text-muted-foreground">{c.target_filter}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
