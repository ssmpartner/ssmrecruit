import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Rocket, Plus, Globe, Building2, Users, User, Target, Megaphone, FlaskConical, AlertTriangle } from 'lucide-react';

const ROLLOUT_MODES = [
  { value: 'off', label: 'Aus', desc: 'Agent ist deaktiviert', color: 'bg-gray-400' },
  { value: 'shadow', label: 'Shadow', desc: 'Mitlaufend, keine Aktionen', color: 'bg-yellow-500' },
  { value: 'recommendation', label: 'Empfehlung', desc: 'Schlägt Aktionen vor', color: 'bg-blue-500' },
  { value: 'assisted', label: 'Assistiert', desc: 'Aktionen mit Genehmigung', color: 'bg-orange-500' },
  { value: 'autonomous', label: 'Autonom', desc: 'Vollständig selbstständig', color: 'bg-green-500' },
];

const MOCK_DEPLOYMENTS = [
  { id: '1', agent_name: 'SSM Recruiting Bot', agent_type: 'outbound', deployment_scope: 'global', scope_label: 'Global', is_enabled: true, rollout_mode: 'shadow', priority: 10, version: '1.0.0', live_warning: false },
  { id: '2', agent_name: 'SSM Recruiting Bot', agent_type: 'outbound', deployment_scope: 'agency', scope_label: 'Agentur: SSM Zürich', is_enabled: true, rollout_mode: 'recommendation', priority: 20, version: '1.0.0', live_warning: false },
  { id: '3', agent_name: 'SSM Inbound Assistent', agent_type: 'inbound', deployment_scope: 'test_group', scope_label: 'Testgruppe: Beta', is_enabled: false, rollout_mode: 'off', priority: 5, version: '1.0.0', live_warning: false },
];

const SCOPE_ICONS: Record<string, typeof Globe> = {
  global: Globe, agency: Building2, team: Users, user: User,
  lead_source: Target, campaign: Megaphone, candidate: User, test_group: FlaskConical,
};

export default function DeploymentsTab() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Deployments</h3>
          <p className="text-sm text-muted-foreground">Steuere wo und wie Agenten eingesetzt werden</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Neues Deployment</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Deployment erstellen</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Agent</Label>
                <Select><SelectTrigger><SelectValue placeholder="Agent wählen" /></SelectTrigger>
                  <SelectContent><SelectItem value="1">SSM Recruiting Bot</SelectItem><SelectItem value="2">SSM Inbound Assistent</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Scope</Label>
                <Select defaultValue="global"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem><SelectItem value="agency">Pro Agentur</SelectItem>
                    <SelectItem value="team">Pro Team</SelectItem><SelectItem value="user">Pro Benutzer</SelectItem>
                    <SelectItem value="lead_source">Pro Lead-Quelle</SelectItem><SelectItem value="campaign">Pro Kampagne</SelectItem>
                    <SelectItem value="candidate">Pro Kandidat</SelectItem><SelectItem value="test_group">Pro Testgruppe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Rollout-Modus</Label>
                <Select defaultValue="shadow"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLLOUT_MODES.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label} – {m.desc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Priorität</Label><Input type="number" defaultValue={10} /></div>
                <div className="flex items-center gap-2 pt-6"><Switch defaultChecked id="dep-enabled" /><Label htmlFor="dep-enabled">Aktiviert</Label></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Start</Label><Input type="datetime-local" /></div>
                <div className="space-y-1.5"><Label>Ende</Label><Input type="datetime-local" /></div>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
                <Button onClick={() => { toast.success('Deployment erstellt (Mock)'); setShowCreate(false); }}>Erstellen</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rollout Mode Legend */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Rollout-Modi:</span>
            {ROLLOUT_MODES.map(m => (
              <div key={m.value} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${m.color}`} />
                <span className="text-xs">{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deployment List */}
      <div className="grid gap-3">
        {MOCK_DEPLOYMENTS.map(dep => {
          const ScopeIcon = SCOPE_ICONS[dep.deployment_scope] || Globe;
          const rollout = ROLLOUT_MODES.find(r => r.value === dep.rollout_mode);
          return (
            <Card key={dep.id} className={!dep.is_enabled ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ScopeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{dep.agent_name}</p>
                        <Badge variant="outline" className="text-[10px]">{dep.agent_type}</Badge>
                        <Badge variant="outline" className="text-[10px]">v{dep.version}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{dep.scope_label} · Priorität {dep.priority}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${rollout?.color}`} />
                      <span className="text-xs font-medium">{rollout?.label}</span>
                    </div>
                    <Switch checked={dep.is_enabled} />
                    {dep.rollout_mode === 'autonomous' && dep.is_enabled && (
                      <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />LIVE</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
