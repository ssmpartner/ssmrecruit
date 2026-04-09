import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { Bot, Plus, Copy, Eye, Play, Settings2, Shield, BookOpen, Zap, MessageSquare, AlertTriangle } from 'lucide-react';

interface MockAgent {
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
  forbidden_statements: string[];
  required_disclosures: string[];
  versions: { version: string; status: string; is_published: boolean }[];
  test_only: boolean;
  sessions_count: number;
  success_rate: number;
}

const MOCK_AGENTS: MockAgent[] = [
  {
    id: '1', name: 'SSM Recruiting Bot', slug: 'ssm-recruiting-bot', description: 'Outbound-Agent für Erstgespräche', agent_type: 'outbound', status: 'testing',
    identity_mode: 'digital_assistant', display_name: 'SSM Recruiting Assistent', greeting_text: 'Guten Tag, hier spricht der SSM Recruiting-Assistent.',
    language: 'de', tone_style: 'professional', objective: 'Terminvereinbarung mit qualifizierten Kandidaten',
    max_call_duration_seconds: 300, allow_human_handover: true, allow_auto_actions: false, require_approval_mode: true, knowledge_mode: 'curated',
    system_prompt: 'Du bist ein professioneller Recruiting-Assistent der SSM Partner AG. Dein Ziel ist es, qualifizierte Kandidaten für ein Erstgespräch zu gewinnen...',
    forbidden_statements: ['Keine Gehaltsversprechen', 'Keine persönlichen Meinungen', 'Keine Konkurrenzvergleiche'],
    required_disclosures: ['KI-Assistent-Hinweis am Anfang', 'Aufnahme-Hinweis bei Recording'],
    versions: [{ version: '1.0.0', status: 'published', is_published: true }, { version: '0.9.0', status: 'archived', is_published: false }],
    test_only: true, sessions_count: 47, success_rate: 78,
  },
  {
    id: '2', name: 'SSM Inbound Assistent', slug: 'ssm-inbound', description: 'Inbound-Qualifizierung', agent_type: 'inbound', status: 'draft',
    identity_mode: 'named_agent', display_name: 'SSM Empfang', greeting_text: 'SSM Partner, guten Tag.',
    language: 'de', tone_style: 'friendly', objective: 'Qualifizierung eingehender Interessenten',
    max_call_duration_seconds: 600, allow_human_handover: true, allow_auto_actions: false, require_approval_mode: true, knowledge_mode: 'curated',
    system_prompt: 'Du bist der freundliche Empfangsassistent der SSM Partner AG...',
    forbidden_statements: ['Keine vertraulichen Infos'], required_disclosures: ['KI-Hinweis'],
    versions: [{ version: '1.0.0', status: 'draft', is_published: false }],
    test_only: true, sessions_count: 12, success_rate: 85,
  },
  {
    id: '3', name: 'Callback Agent', slug: 'callback-agent', description: 'Rückruf-Spezialist für verpasste Calls', agent_type: 'callback', status: 'draft',
    identity_mode: 'digital_assistant', display_name: 'SSM Rückruf', greeting_text: 'Guten Tag, ich rufe zurück wie vereinbart.',
    language: 'de', tone_style: 'professional', objective: 'Nachhaken bei verpassten Gesprächen',
    max_call_duration_seconds: 180, allow_human_handover: true, allow_auto_actions: false, require_approval_mode: true, knowledge_mode: 'curated',
    system_prompt: 'Du rufst Kandidaten zurück die nicht erreichbar waren...',
    forbidden_statements: [], required_disclosures: ['KI-Hinweis'],
    versions: [], test_only: true, sessions_count: 0, success_rate: 0,
  },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Entwurf', variant: 'secondary' },
  testing: { label: 'Test', variant: 'outline' },
  active: { label: 'Aktiv', variant: 'default' },
  paused: { label: 'Pausiert', variant: 'secondary' },
  archived: { label: 'Archiviert', variant: 'destructive' },
};

export default function AgentStudioTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<MockAgent | null>(null);

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
            <CreateAgentForm onClose={() => setShowCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Agent List */}
      <div className="grid gap-3">
        {MOCK_AGENTS.map(agent => (
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
                    </div>
                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {agent.sessions_count} Sessions · {agent.success_rate}% Erfolg · v{agent.versions[0]?.version || '–'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toast.success('Agent dupliziert (Mock)'); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toast.success('Test gestartet (Mock)'); }}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent); }}>
                    <Eye className="h-4 w-4 mr-1" />Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent Detail Sheet */}
      <Sheet open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedAgent && <AgentDetailView agent={selectedAgent} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AgentDetailView({ agent }: { agent: MockAgent }) {
  return (
    <div className="space-y-6">
      <SheetHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <SheetTitle>{agent.name}</SheetTitle>
            <p className="text-sm text-muted-foreground">{agent.slug}</p>
          </div>
        </div>
      </SheetHeader>

      <div className="flex gap-2 flex-wrap">
        <Badge variant={STATUS_CONFIG[agent.status]?.variant}>{STATUS_CONFIG[agent.status]?.label}</Badge>
        <Badge variant="outline">{agent.agent_type}</Badge>
        <Badge variant="outline">{agent.identity_mode}</Badge>
        {agent.test_only && <Badge variant="secondary">Test-only</Badge>}
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid grid-cols-5 h-auto">
          <TabsTrigger value="general" className="text-xs">Allgemein</TabsTrigger>
          <TabsTrigger value="prompt" className="text-xs">Prompt</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">Regeln</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs">Versionen</TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs">Wissen</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Display Name</Label><p className="text-sm font-medium">{agent.display_name}</p></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Sprache</Label><p className="text-sm font-medium">{agent.language.toUpperCase()}</p></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Tonalität</Label><p className="text-sm font-medium">{agent.tone_style}</p></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Max. Dauer</Label><p className="text-sm font-medium">{agent.max_call_duration_seconds}s</p></div>
          </div>
          <Separator />
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Ziel / Objective</Label><p className="text-sm">{agent.objective}</p></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Begrüssung</Label><p className="text-sm italic">"{agent.greeting_text}"</p></div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between"><Label className="text-xs">Mensch-Übergabe</Label><Switch checked={agent.allow_human_handover} /></div>
            <div className="flex items-center justify-between"><Label className="text-xs">Auto-Aktionen</Label><Switch checked={agent.allow_auto_actions} /></div>
            <div className="flex items-center justify-between"><Label className="text-xs">Genehmigungsmodus</Label><Switch checked={agent.require_approval_mode} /></div>
            <div className="flex items-center justify-between"><Label className="text-xs">Knowledge: {agent.knowledge_mode}</Label></div>
          </div>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-4">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">System Prompt</Label>
            <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap">{agent.system_prompt}</div>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-destructive" /><Label className="font-medium">Verbotene Aussagen</Label></div>
            {agent.forbidden_statements.map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-destructive/5 border border-destructive/10">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <p className="text-sm">{s}</p>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /><Label className="font-medium">Pflichtoffenlegung</Label></div>
            {agent.required_disclosures.map((d, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-primary/5 border border-primary/10">
                <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-sm">{d}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="versions" className="space-y-3">
          {agent.versions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Keine Versionen vorhanden</p>
          ) : agent.versions.map((v, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">v{v.version}</p>
                <Badge variant={v.is_published ? 'default' : 'secondary'} className="text-[10px]">{v.status}</Badge>
              </div>
              {!v.is_published && <Button size="sm" variant="outline" onClick={() => toast.success('Version publiziert (Mock)')}>Publizieren</Button>}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-3">
          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /><Label className="font-medium">Zugewiesene Wissensquellen</Label></div>
          {['SSM Partner Unternehmensprofil', 'Stellenprofil Finanzberater'].map((k, i) => (
            <div key={i} className="p-2.5 rounded bg-muted/40 text-sm">{k}</div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateAgentForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Name</Label><Input placeholder="z.B. SSM Recruiting Bot" /></div>
        <div className="space-y-1.5"><Label>Slug</Label><Input placeholder="ssm-recruiting-bot" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Typ</Label>
          <Select defaultValue="outbound"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">Outbound</SelectItem><SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem><SelectItem value="callback">Callback</SelectItem>
              <SelectItem value="qualification">Qualification</SelectItem><SelectItem value="reactivation">Reactivation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Identity Mode</Label>
          <Select defaultValue="digital_assistant"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="digital_assistant">Digitaler Assistent</SelectItem>
              <SelectItem value="named_agent">Benannter Agent</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Beschreibung</Label><Input placeholder="Kurzbeschreibung des Agenten" /></div>
      <div className="space-y-1.5"><Label>Display Name</Label><Input placeholder="SSM Recruiting Assistent" /></div>
      <div className="space-y-1.5"><Label>Begrüssung</Label><Input placeholder="Guten Tag, hier spricht..." /></div>
      <div className="space-y-1.5"><Label>Ziel / Objective</Label><Input placeholder="z.B. Terminvereinbarung mit Kandidaten" /></div>
      <div className="space-y-1.5"><Label>System Prompt</Label><Textarea rows={4} placeholder="Du bist ein freundlicher Recruiting-Assistent..." /></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5"><Label>Sprache</Label>
          <Select defaultValue="de"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="de">Deutsch</SelectItem><SelectItem value="fr">Französisch</SelectItem><SelectItem value="it">Italienisch</SelectItem><SelectItem value="en">Englisch</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Tonalität</Label>
          <Select defaultValue="professional"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="professional">Professionell</SelectItem><SelectItem value="friendly">Freundlich</SelectItem><SelectItem value="formal">Formal</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Max. Dauer (s)</Label><Input type="number" defaultValue={300} /></div>
      </div>
      <Separator />
      <div className="space-y-1.5"><Label>Verbotene Aussagen (eine pro Zeile)</Label><Textarea rows={3} placeholder="Keine Gehaltsversprechen&#10;Keine persönlichen Meinungen" /></div>
      <div className="space-y-1.5"><Label>Pflichtoffenlegung (eine pro Zeile)</Label><Textarea rows={2} placeholder="KI-Assistent-Hinweis am Anfang" /></div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2"><Switch id="handover" defaultChecked /><Label htmlFor="handover">Mensch-Übergabe erlauben</Label></div>
        <div className="flex items-center gap-2"><Switch id="auto" /><Label htmlFor="auto">Auto-Aktionen erlauben</Label></div>
        <div className="flex items-center gap-2"><Switch id="approval" defaultChecked /><Label htmlFor="approval">Genehmigungsmodus</Label></div>
        <div className="flex items-center gap-2"><Switch id="testonly" defaultChecked /><Label htmlFor="testonly">Nur Test-Modus</Label></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button onClick={() => { toast.success('Agent erstellt (Mock)'); onClose(); }}>Agent erstellen</Button>
      </div>
    </div>
  );
}
