import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Megaphone, Play, Pause, Clock, DollarSign, RotateCcw, Target, Save, Trash2, Loader2, Info, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Campaign = {
  id: string;
  name: string;
  description: string;
  campaign_type: string;
  status: string;
  agent_id: string;
  max_calls_per_day: number;
  cost_limit_daily: number;
  cost_limit_total: number;
  timezone: string;
  target_statuses: string[];
  target_lead_sources: string[];
  scheduling_rules_json: any;
  retry_rules_json: any;
  created_at: string;
};

type Agent = { id: string; name: string };

export default function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, aRes] = await Promise.all([
      supabase.from('ai_voice_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('ai_agents').select('id, name').is('deleted_at', null),
    ]);
    setCampaigns(cRes.data || []);
    setAgents(aRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function getAgentName(id: string) { return agents.find(a => a.id === id)?.name || '–'; }

  async function deleteCampaign(id: string) {
    const { error } = await supabase.from('ai_voice_campaigns').delete().eq('id', id);
    if (error) toast.error('Fehler beim Löschen');
    else { toast.success('Kampagne gelöscht'); setSelected(null); load(); }
  }

  async function toggleStatus(c: Campaign) {
    const next = c.status === 'running' ? 'paused' : c.status === 'paused' ? 'running' : 'running';
    const { error } = await supabase.from('ai_voice_campaigns').update({ status: next }).eq('id', c.id);
    if (error) toast.error('Fehler');
    else { toast.success(`Kampagne ${next === 'running' ? 'gestartet' : 'pausiert'}`); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">Kampagnen</h3><p className="text-sm text-muted-foreground">Outbound- und Routing-Kampagnen verwalten</p></div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Neue Kampagne</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Kampagne erstellen</DialogTitle></DialogHeader>
            <CreateCampaignForm agents={agents} onClose={() => setShowCreate(false)} onCreated={load} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Kampagnen vorhanden</h3>
            <p className="text-sm text-muted-foreground mb-4">Erstelle deine erste Kampagne, um KI-gestützte Calls zu starten.</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Kampagne erstellen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" /><span>{campaigns.length} Kampagnen geladen</span>
          </div>
          {campaigns.map(c => (
            <Card key={c.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelected(c)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-primary" /></div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{c.name}</p>
                        <Badge variant="outline" className="text-[10px]">{c.campaign_type}</Badge>
                        <Badge variant={c.status === 'running' ? 'default' : c.status === 'paused' ? 'secondary' : 'outline'} className="text-[10px]">{c.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); toggleStatus(c); }}>
                      {c.status === 'running' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Agent:</span><span className="font-medium truncate">{getAgentName(c.agent_id)}</span></div>
                  <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Max {c.max_calls_per_day}/Tag</span></div>
                  <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-medium">{Number(c.cost_limit_daily).toFixed(0)}/{Number(c.cost_limit_total).toFixed(0)} CHF</span></div>
                  <div className="flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">{c.timezone}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && <CampaignDetail campaign={selected} agentName={getAgentName(selected.agent_id)} onDelete={deleteCampaign} onUpdated={() => { load(); setSelected(null); }} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CampaignDetail({ campaign: c, agentName, onDelete, onUpdated }: { campaign: Campaign; agentName: string; onDelete: (id: string) => void; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: c.name, description: c.description, max_calls_per_day: c.max_calls_per_day, cost_limit_daily: c.cost_limit_daily, cost_limit_total: c.cost_limit_total, status: c.status });

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('ai_voice_campaigns').update({
      name: form.name, description: form.description, max_calls_per_day: form.max_calls_per_day,
      cost_limit_daily: form.cost_limit_daily, cost_limit_total: form.cost_limit_total, status: form.status,
    }).eq('id', c.id);
    setSaving(false);
    if (error) toast.error('Fehler');
    else { toast.success('Kampagne gespeichert'); onUpdated(); }
  }

  return (
    <div className="space-y-5">
      <SheetHeader><SheetTitle>{c.name}</SheetTitle></SheetHeader>
      <div className="flex gap-2">
        {!editing && <Button size="sm" onClick={() => setEditing(true)}><Zap className="h-3.5 w-3.5 mr-1" />Bearbeiten</Button>}
        {editing && <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}Speichern</Button>}
        {editing && <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>}
        <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)}><Trash2 className="h-3.5 w-3.5 mr-1" />Löschen</Button>
      </div>
      <div className="space-y-3">
        <div><Label className="text-xs text-muted-foreground">Name</Label>{editing ? <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /> : <p className="text-sm font-medium">{c.name}</p>}</div>
        <div><Label className="text-xs text-muted-foreground">Beschreibung</Label>{editing ? <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /> : <p className="text-sm">{c.description}</p>}</div>
        <Separator />
        <div><Label className="text-xs text-muted-foreground">Agent</Label><p className="text-sm">{agentName}</p></div>
        <div><Label className="text-xs text-muted-foreground">Typ</Label><Badge variant="outline">{c.campaign_type}</Badge></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Calls/Tag</Label>{editing ? <Input type="number" value={form.max_calls_per_day} onChange={e => setForm(f => ({...f, max_calls_per_day: parseInt(e.target.value)||50}))} /> : <p className="text-sm">{c.max_calls_per_day}</p>}</div>
          <div><Label className="text-xs text-muted-foreground">Tageslimit CHF</Label>{editing ? <Input type="number" value={form.cost_limit_daily} onChange={e => setForm(f => ({...f, cost_limit_daily: parseFloat(e.target.value)||0}))} /> : <p className="text-sm">{Number(c.cost_limit_daily).toFixed(0)}</p>}</div>
          <div><Label className="text-xs text-muted-foreground">Gesamtlimit CHF</Label>{editing ? <Input type="number" value={form.cost_limit_total} onChange={e => setForm(f => ({...f, cost_limit_total: parseFloat(e.target.value)||0}))} /> : <p className="text-sm">{Number(c.cost_limit_total).toFixed(0)}</p>}</div>
        </div>
        <Separator />
        <div className="text-xs text-muted-foreground">
          <p>Erstellt: {new Date(c.created_at).toLocaleString('de-CH')}</p>
          <p>ID: {c.id}</p>
        </div>
      </div>
    </div>
  );
}

function CreateCampaignForm({ agents, onClose, onCreated }: { agents: Agent[]; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', campaign_type: 'outbound', agent_id: '',
    max_calls_per_day: 50, cost_limit_daily: 100, cost_limit_total: 2000, timezone: 'Europe/Zurich',
  });

  async function handleCreate() {
    if (!form.name.trim()) { toast.error('Name erforderlich'); return; }
    if (!form.agent_id) { toast.error('Agent wählen'); return; }
    setSaving(true);
    const { error } = await supabase.from('ai_voice_campaigns').insert({
      name: form.name, description: form.description, campaign_type: form.campaign_type,
      agent_id: form.agent_id, max_calls_per_day: form.max_calls_per_day,
      cost_limit_daily: form.cost_limit_daily, cost_limit_total: form.cost_limit_total,
      timezone: form.timezone, status: 'draft',
    });
    setSaving(false);
    if (error) toast.error('Fehler: ' + error.message);
    else { toast.success('Kampagne erstellt'); onCreated(); onClose(); }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Kampagnenname" /></div>
      <div className="space-y-1.5"><Label>Beschreibung</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Typ</Label>
          <Select value={form.campaign_type} onValueChange={v => setForm(f => ({...f, campaign_type: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">Outbound</SelectItem><SelectItem value="reactivation">Reactivation</SelectItem>
              <SelectItem value="callback">Callback</SelectItem><SelectItem value="inbound-routing">Inbound-Routing</SelectItem>
              <SelectItem value="qualification">Qualification</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Agent *</Label>
          <Select value={form.agent_id} onValueChange={v => setForm(f => ({...f, agent_id: v}))}>
            <SelectTrigger><SelectValue placeholder="Agent wählen" /></SelectTrigger>
            <SelectContent>{agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Calls/Tag max</Label><Input type="number" value={form.max_calls_per_day} onChange={e => setForm(f => ({...f, max_calls_per_day: parseInt(e.target.value)||50}))} /></div>
        <div className="space-y-1.5"><Label>Tageslimit CHF</Label><Input type="number" value={form.cost_limit_daily} onChange={e => setForm(f => ({...f, cost_limit_daily: parseFloat(e.target.value)||100}))} /></div>
        <div className="space-y-1.5"><Label>Gesamtlimit CHF</Label><Input type="number" value={form.cost_limit_total} onChange={e => setForm(f => ({...f, cost_limit_total: parseFloat(e.target.value)||2000}))} /></div>
        <div className="space-y-1.5"><Label>Timezone</Label><Input value={form.timezone} onChange={e => setForm(f => ({...f, timezone: e.target.value}))} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleCreate} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Erstellen</Button>
      </div>
    </div>
  );
}
