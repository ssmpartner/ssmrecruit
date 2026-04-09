import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Bot, Plus, Copy, Eye, Play, Shield, BookOpen, Zap, MessageSquare, AlertTriangle, Trash2, Save, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Agent = {
  id: string;
  name: string;
  slug: string;
  description: string;
  agent_type: string;
  status: string;
  identity_mode: string;
  display_name: string;
  greeting_text: string;
  language: string;
  tone_style: string;
  objective: string;
  max_call_duration_seconds: number;
  allow_human_handover: boolean;
  allow_auto_actions: boolean;
  require_approval_mode: boolean;
  knowledge_mode: string;
  system_prompt: string;
  test_only: boolean;
  is_active: boolean;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Entwurf', variant: 'secondary' },
  testing: { label: 'Test', variant: 'outline' },
  active: { label: 'Aktiv', variant: 'default' },
  paused: { label: 'Pausiert', variant: 'secondary' },
  archived: { label: 'Archiviert', variant: 'destructive' },
};

export default function AgentStudioTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ai_agents').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (error) { toast.error('Agenten konnten nicht geladen werden'); }
    else { setAgents(data || []); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  async function deleteAgent(id: string) {
    const { error } = await supabase.from('ai_agents').update({ deleted_at: new Date().toISOString(), status: 'archived' }).eq('id', id);
    if (error) toast.error('Fehler beim Löschen');
    else { toast.success('Agent archiviert'); setSelectedAgent(null); loadAgents(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agent Studio</h3>
          <p className="text-sm text-muted-foreground">Erstelle, konfiguriere und verwalte KI-Voice-Agenten</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Neuer Agent</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Neuen Agenten erstellen</DialogTitle></DialogHeader>
            <CreateAgentForm onClose={() => setShowCreate(false)} onCreated={loadAgents} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Agenten vorhanden</h3>
            <p className="text-sm text-muted-foreground mb-4">Erstelle deinen ersten KI-Voice-Agenten, um loszulegen.</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Agent erstellen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>{agents.length} Agenten geladen aus der Datenbank</span>
          </div>
          {agents.map(agent => (
            <Card key={agent.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedAgent(agent)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{agent.name}</p>
                        <Badge variant="outline" className="text-[10px]">{agent.agent_type}</Badge>
                        <Badge variant={STATUS_CONFIG[agent.status]?.variant || 'secondary'} className="text-[10px]">
                          {STATUS_CONFIG[agent.status]?.label || agent.status}
                        </Badge>
                        {agent.test_only && <Badge variant="secondary" className="text-[10px]">Test-only</Badge>}
                        {agent.is_active && <Badge variant="default" className="text-[10px]">Aktiv</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{agent.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent); }}>
                      <Eye className="h-4 w-4 mr-1" />Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedAgent && <AgentDetailView agent={selectedAgent} onDelete={deleteAgent} onUpdated={loadAgents} onClose={() => setSelectedAgent(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AgentDetailView({ agent, onDelete, onUpdated, onClose }: { agent: Agent; onDelete: (id: string) => void; onUpdated: () => void; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...agent });

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('ai_agents').update({
      name: form.name, description: form.description, display_name: form.display_name,
      greeting_text: form.greeting_text, objective: form.objective, system_prompt: form.system_prompt,
      tone_style: form.tone_style, language: form.language, max_call_duration_seconds: form.max_call_duration_seconds,
      allow_human_handover: form.allow_human_handover, allow_auto_actions: form.allow_auto_actions,
      require_approval_mode: form.require_approval_mode, test_only: form.test_only, status: form.status,
    }).eq('id', agent.id);
    setSaving(false);
    if (error) toast.error('Fehler beim Speichern');
    else { toast.success('Agent gespeichert'); setEditing(false); onUpdated(); onClose(); }
  }

  return (
    <div className="space-y-6">
      <SheetHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <SheetTitle>{agent.name}</SheetTitle>
            <p className="text-sm text-muted-foreground">{agent.slug}</p>
          </div>
        </div>
      </SheetHeader>

      <div className="flex gap-2 flex-wrap">
        <Badge variant={STATUS_CONFIG[agent.status]?.variant}>{STATUS_CONFIG[agent.status]?.label}</Badge>
        <Badge variant="outline">{agent.agent_type}</Badge>
        {agent.test_only && <Badge variant="secondary">Test-only</Badge>}
      </div>

      <div className="flex gap-2">
        {!editing && <Button size="sm" onClick={() => setEditing(true)}><Zap className="h-3.5 w-3.5 mr-1" />Bearbeiten</Button>}
        {editing && <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}Speichern</Button>}
        {editing && <Button size="sm" variant="outline" onClick={() => { setEditing(false); setForm({ ...agent }); }}>Abbrechen</Button>}
        <Button size="sm" variant="destructive" onClick={() => onDelete(agent.id)}><Trash2 className="h-3.5 w-3.5 mr-1" />Archivieren</Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid grid-cols-4 h-auto">
          <TabsTrigger value="general" className="text-xs">Allgemein</TabsTrigger>
          <TabsTrigger value="prompt" className="text-xs">Prompt</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Einstellungen</TabsTrigger>
          <TabsTrigger value="status" className="text-xs">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              {editing ? <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /> : <p className="text-sm font-medium">{agent.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Display Name</Label>
              {editing ? <Input value={form.display_name} onChange={e => setForm(f => ({...f, display_name: e.target.value}))} /> : <p className="text-sm font-medium">{agent.display_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sprache</Label>
              {editing ? (
                <Select value={form.language} onValueChange={v => setForm(f => ({...f, language: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="de">Deutsch</SelectItem><SelectItem value="fr">Französisch</SelectItem><SelectItem value="en">Englisch</SelectItem></SelectContent>
                </Select>
              ) : <p className="text-sm font-medium">{agent.language.toUpperCase()}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tonalität</Label>
              {editing ? (
                <Select value={form.tone_style} onValueChange={v => setForm(f => ({...f, tone_style: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="professional">Professionell</SelectItem><SelectItem value="friendly">Freundlich</SelectItem><SelectItem value="formal">Formal</SelectItem></SelectContent>
                </Select>
              ) : <p className="text-sm font-medium">{agent.tone_style}</p>}
            </div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            {editing ? <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /> : <p className="text-sm">{agent.description}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ziel / Objective</Label>
            {editing ? <Input value={form.objective} onChange={e => setForm(f => ({...f, objective: e.target.value}))} /> : <p className="text-sm">{agent.objective}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Begrüssung</Label>
            {editing ? <Input value={form.greeting_text} onChange={e => setForm(f => ({...f, greeting_text: e.target.value}))} /> : <p className="text-sm italic">„{agent.greeting_text}"</p>}
          </div>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">System Prompt</Label>
            {editing ? <Textarea value={form.system_prompt} onChange={e => setForm(f => ({...f, system_prompt: e.target.value}))} rows={10} className="font-mono text-xs" /> : (
              <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">{agent.system_prompt}</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Max. Gesprächsdauer (Sekunden)</Label>
            {editing ? <Input type="number" value={form.max_call_duration_seconds} onChange={e => setForm(f => ({...f, max_call_duration_seconds: parseInt(e.target.value) || 300}))} /> : <p className="text-sm font-medium">{agent.max_call_duration_seconds}s</p>}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Mensch-Übergabe</Label>
              <Switch checked={editing ? form.allow_human_handover : agent.allow_human_handover} disabled={!editing} onCheckedChange={v => setForm(f => ({...f, allow_human_handover: v}))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Auto-Aktionen</Label>
              <Switch checked={editing ? form.allow_auto_actions : agent.allow_auto_actions} disabled={!editing} onCheckedChange={v => setForm(f => ({...f, allow_auto_actions: v}))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Genehmigungsmodus</Label>
              <Switch checked={editing ? form.require_approval_mode : agent.require_approval_mode} disabled={!editing} onCheckedChange={v => setForm(f => ({...f, require_approval_mode: v}))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Nur Test-Modus</Label>
              <Switch checked={editing ? form.test_only : agent.test_only} disabled={!editing} onCheckedChange={v => setForm(f => ({...f, test_only: v}))} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            {editing ? (
              <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Entwurf</SelectItem>
                  <SelectItem value="testing">Test</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="paused">Pausiert</SelectItem>
                  <SelectItem value="archived">Archiviert</SelectItem>
                </SelectContent>
              </Select>
            ) : <Badge variant={STATUS_CONFIG[agent.status]?.variant}>{STATUS_CONFIG[agent.status]?.label}</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Erstellt: {new Date(agent.created_at).toLocaleString('de-CH')}</p>
            <p>ID: {agent.id}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateAgentForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', agent_type: 'outbound', identity_mode: 'digital_assistant',
    display_name: '', greeting_text: '', objective: '', system_prompt: '', language: 'de',
    tone_style: 'professional', max_call_duration_seconds: 300,
    allow_human_handover: true, allow_auto_actions: false, require_approval_mode: true, test_only: true,
  });

  async function handleCreate() {
    if (!form.name.trim()) { toast.error('Name ist erforderlich'); return; }
    setSaving(true);
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { error } = await supabase.from('ai_agents').insert({
      name: form.name, slug, description: form.description, agent_type: form.agent_type,
      identity_mode: form.identity_mode, display_name: form.display_name || form.name,
      greeting_text: form.greeting_text, objective: form.objective, system_prompt: form.system_prompt,
      language: form.language, tone_style: form.tone_style,
      max_call_duration_seconds: form.max_call_duration_seconds,
      allow_human_handover: form.allow_human_handover, allow_auto_actions: form.allow_auto_actions,
      require_approval_mode: form.require_approval_mode, test_only: form.test_only,
      status: 'draft', is_active: false,
    });
    setSaving(false);
    if (error) toast.error('Fehler: ' + error.message);
    else { toast.success('Agent erstellt'); onCreated(); onClose(); }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="z.B. SSM Recruiting Bot" /></div>
        <div className="space-y-1.5"><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({...f, slug: e.target.value}))} placeholder="auto-generiert" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Typ</Label>
          <Select value={form.agent_type} onValueChange={v => setForm(f => ({...f, agent_type: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">Outbound</SelectItem><SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="callback">Callback</SelectItem><SelectItem value="qualification">Qualification</SelectItem>
              <SelectItem value="reactivation">Reactivation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Sprache</Label>
          <Select value={form.language} onValueChange={v => setForm(f => ({...f, language: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="de">Deutsch</SelectItem><SelectItem value="fr">Französisch</SelectItem><SelectItem value="en">Englisch</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Beschreibung</Label><Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Kurzbeschreibung" /></div>
      <div className="space-y-1.5"><Label>Display Name</Label><Input value={form.display_name} onChange={e => setForm(f => ({...f, display_name: e.target.value}))} placeholder="SSM Recruiting Assistent" /></div>
      <div className="space-y-1.5"><Label>Begrüssung</Label><Input value={form.greeting_text} onChange={e => setForm(f => ({...f, greeting_text: e.target.value}))} placeholder="Guten Tag, hier spricht..." /></div>
      <div className="space-y-1.5"><Label>Ziel</Label><Input value={form.objective} onChange={e => setForm(f => ({...f, objective: e.target.value}))} placeholder="Terminvereinbarung" /></div>
      <div className="space-y-1.5"><Label>System Prompt</Label><Textarea value={form.system_prompt} onChange={e => setForm(f => ({...f, system_prompt: e.target.value}))} rows={4} placeholder="Du bist ein freundlicher Recruiting-Assistent..." /></div>
      <div className="space-y-1.5"><Label>Max. Dauer (s)</Label><Input type="number" value={form.max_call_duration_seconds} onChange={e => setForm(f => ({...f, max_call_duration_seconds: parseInt(e.target.value) || 300}))} /></div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2"><Switch checked={form.allow_human_handover} onCheckedChange={v => setForm(f => ({...f, allow_human_handover: v}))} /><Label>Mensch-Übergabe</Label></div>
        <div className="flex items-center gap-2"><Switch checked={form.allow_auto_actions} onCheckedChange={v => setForm(f => ({...f, allow_auto_actions: v}))} /><Label>Auto-Aktionen</Label></div>
        <div className="flex items-center gap-2"><Switch checked={form.require_approval_mode} onCheckedChange={v => setForm(f => ({...f, require_approval_mode: v}))} /><Label>Genehmigungsmodus</Label></div>
        <div className="flex items-center gap-2"><Switch checked={form.test_only} onCheckedChange={v => setForm(f => ({...f, test_only: v}))} /><Label>Nur Test-Modus</Label></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleCreate} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Agent erstellen</Button>
      </div>
    </div>
  );
}
