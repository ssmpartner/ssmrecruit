import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, BookOpen, CheckCircle2, Clock, Search, Info, Save, Trash2, Loader2, Zap, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type KnowledgeItem = {
  id: string;
  title: string;
  category: string;
  language: string;
  scope_type: string;
  content: string;
  content_type: string;
  risk_class: string;
  approval_status: string;
  approved_for_live_calls: boolean;
  is_active: boolean;
  version: number;
  agent_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

const RISK_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-emerald-500/10 text-emerald-700', label: 'Niedrig' },
  medium: { color: 'bg-amber-500/10 text-amber-700', label: 'Mittel' },
  high: { color: 'bg-orange-500/10 text-orange-700', label: 'Hoch' },
  critical: { color: 'bg-destructive/10 text-destructive', label: 'Kritisch' },
};

const CATEGORIES = [
  { value: 'company', label: 'Unternehmen' },
  { value: 'recruiting', label: 'Recruiting-Prozess' },
  { value: 'positions', label: 'Stellen & Einstieg' },
  { value: 'quereinsteiger', label: 'Quereinsteiger' },
  { value: 'aussendienst', label: 'Aussendienst' },
  { value: 'innendienst', label: 'Innendienst' },
  { value: 'faq', label: 'FAQ' },
  { value: 'objection', label: 'Einwandbehandlung' },
  { value: 'scheduling', label: 'Terminierung & Rückruf' },
  { value: 'escalation', label: 'Eskalation' },
  { value: 'nogo', label: 'No-Go Content' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'general', label: 'Allgemein' },
  { value: 'hr', label: 'HR' },
];

export default function KnowledgeTab() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<KnowledgeItem | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [kRes, aRes] = await Promise.all([
      supabase.from('ai_voice_knowledge_items').select('*').order('category').order('title'),
      supabase.from('ai_agents').select('id, name').is('deleted_at', null),
    ]);
    setItems(kRes.data || []);
    setAgents(aRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(k => {
    if (search && !k.title.toLowerCase().includes(search.toLowerCase()) && !k.content.toLowerCase().includes(search.toLowerCase()) && !k.category.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== 'all' && k.category !== filterCat) return false;
    if (filterStatus !== 'all' && k.approval_status !== filterStatus) return false;
    return true;
  });

  const catCounts = items.reduce((acc, k) => { acc[k.category] = (acc[k.category] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">Knowledge Base</h3><p className="text-sm text-muted-foreground">{items.length} Einträge in {Object.keys(catCounts).length} Kategorien</p></div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Eintrag hinzufügen</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Wissenseintrag erstellen</DialogTitle></DialogHeader>
            <CreateKnowledgeForm agents={agents} onClose={() => setShowCreate(false)} onCreated={load} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label} ({catCounts[c.value] || 0})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="approved">Freigegeben</SelectItem>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="rejected">Abgelehnt</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{items.length === 0 ? 'Knowledge Base leer' : 'Keine Ergebnisse'}</h3>
            <p className="text-sm text-muted-foreground mb-4">{items.length === 0 ? 'Füge den ersten Wissenseintrag hinzu.' : 'Ändere deine Suchkriterien.'}</p>
            {items.length === 0 && <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Knowledge hinzufügen</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" /><span>{filtered.length} von {items.length} Einträgen angezeigt</span>
          </div>
          {filtered.map(k => {
            const risk = RISK_CONFIG[k.risk_class] || RISK_CONFIG.low;
            return (
              <Card key={k.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelected(k)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-medium text-sm">{k.title}</p>
                          <Badge variant="outline" className="text-[10px]">{CATEGORIES.find(c => c.value === k.category)?.label || k.category}</Badge>
                          <Badge className={`text-[10px] ${risk.color}`}>{risk.label}</Badge>
                          <Badge variant="outline" className="text-[10px]">v{k.version}</Badge>
                          {k.approval_status === 'approved' && <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-0.5" />Freigegeben</Badge>}
                          {k.approval_status === 'pending' && <Badge className="text-[10px] bg-amber-500/10 text-amber-700"><Clock className="h-3 w-3 mr-0.5" />Ausstehend</Badge>}
                          {k.approval_status === 'rejected' && <Badge className="text-[10px] bg-destructive/10 text-destructive"><AlertTriangle className="h-3 w-3 mr-0.5" />Abgelehnt</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{k.content}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          <span>{k.language.toUpperCase()}</span>
                          <span>{k.scope_type}</span>
                          {k.approved_for_live_calls && <span className="text-emerald-600 font-medium">● Live</span>}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setSelected(k); }}><Eye className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && <KnowledgeDetail item={selected} agents={agents} onUpdated={() => { load(); setSelected(null); }} onDeleted={() => { load(); setSelected(null); }} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KnowledgeDetail({ item, agents, onUpdated, onDeleted }: { item: KnowledgeItem; agents: { id: string; name: string }[]; onUpdated: () => void; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: item.title, content: item.content, category: item.category, risk_class: item.risk_class,
    approval_status: item.approval_status, approved_for_live_calls: item.approved_for_live_calls,
    is_active: item.is_active, scope_type: item.scope_type, language: item.language,
    agent_id: item.agent_id || '',
  });

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('ai_voice_knowledge_items').update({
      title: form.title, content: form.content, category: form.category, risk_class: form.risk_class,
      approval_status: form.approval_status, approved_for_live_calls: form.approved_for_live_calls,
      is_active: form.is_active, scope_type: form.scope_type, language: form.language,
      agent_id: form.agent_id || null,
    }).eq('id', item.id);
    setSaving(false);
    if (error) toast.error('Fehler');
    else { toast.success('Eintrag gespeichert'); onUpdated(); }
  }

  async function handleDelete() {
    const { error } = await supabase.from('ai_voice_knowledge_items').delete().eq('id', item.id);
    if (error) toast.error('Fehler');
    else { toast.success('Eintrag gelöscht'); onDeleted(); }
  }

  const risk = RISK_CONFIG[item.risk_class] || RISK_CONFIG.low;

  return (
    <div className="space-y-5">
      <SheetHeader><SheetTitle>{item.title}</SheetTitle></SheetHeader>
      <div className="flex gap-2 flex-wrap">
        <Badge className={`text-[10px] ${risk.color}`}>{risk.label}</Badge>
        <Badge variant="outline">{item.scope_type}</Badge>
        <Badge variant="outline">v{item.version}</Badge>
        {item.approved_for_live_calls && <Badge variant="default" className="text-[10px]">Live</Badge>}
      </div>
      <div className="flex gap-2">
        {!editing && <Button size="sm" onClick={() => setEditing(true)}><Zap className="h-3.5 w-3.5 mr-1" />Bearbeiten</Button>}
        {editing && <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}Speichern</Button>}
        {editing && <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>}
        <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5 mr-1" />Löschen</Button>
      </div>
      <div className="space-y-3">
        <div><Label className="text-xs text-muted-foreground">Titel</Label>{editing ? <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} /> : <p className="text-sm font-medium">{item.title}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Kategorie</Label>
            {editing ? (
              <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            ) : <p className="text-sm">{CATEGORIES.find(c => c.value === item.category)?.label || item.category}</p>}
          </div>
          <div><Label className="text-xs text-muted-foreground">Risikoklasse</Label>
            {editing ? (
              <Select value={form.risk_class} onValueChange={v => setForm(f => ({...f, risk_class: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem><SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem><SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            ) : <Badge className={`text-[10px] ${risk.color}`}>{risk.label}</Badge>}
          </div>
        </div>
        <div><Label className="text-xs text-muted-foreground">Inhalt</Label>
          {editing ? <Textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} rows={8} /> : <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">{item.content}</div>}
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Freigabestatus</Label>
            {editing ? (
              <Select value={form.approval_status} onValueChange={v => setForm(f => ({...f, approval_status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Entwurf</SelectItem><SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="approved">Freigegeben</SelectItem><SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
            ) : <Badge variant="outline">{item.approval_status}</Badge>}
          </div>
          <div><Label className="text-xs text-muted-foreground">Agent-Zuordnung</Label>
            {editing ? (
              <Select value={form.agent_id || "__global__"} onValueChange={v => setForm(f => ({...f, agent_id: v === "__global__" ? "" : v}))}>
                <SelectTrigger><SelectValue placeholder="Global" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">Global (kein Agent)</SelectItem>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : <p className="text-sm">{item.agent_id ? agents.find(a => a.id === item.agent_id)?.name || item.agent_id : 'Global'}</p>}
          </div>
        </div>
        {editing && (
          <div className="flex items-center gap-2">
            <Switch checked={form.approved_for_live_calls} onCheckedChange={v => setForm(f => ({...f, approved_for_live_calls: v}))} />
            <Label className="text-sm">Für Live-Calls freigeben</Label>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          <p>Erstellt: {new Date(item.created_at).toLocaleString('de-CH')}</p>
          <p>Aktualisiert: {new Date(item.updated_at).toLocaleString('de-CH')}</p>
        </div>
      </div>
    </div>
  );
}

function CreateKnowledgeForm({ agents, onClose, onCreated }: { agents: { id: string; name: string }[]; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', content: '', category: 'general', language: 'de', scope_type: 'global',
    risk_class: 'low', approved_for_live_calls: false, agent_id: '',
  });

  async function handleCreate() {
    if (!form.title.trim()) { toast.error('Titel erforderlich'); return; }
    setSaving(true);
    const { error } = await supabase.from('ai_voice_knowledge_items').insert({
      title: form.title, content: form.content, category: form.category, language: form.language,
      scope_type: form.scope_type, risk_class: form.risk_class,
      approved_for_live_calls: form.approved_for_live_calls,
      agent_id: form.agent_id || null,
      approval_status: 'draft', is_active: true,
    });
    setSaving(false);
    if (error) toast.error('Fehler: ' + error.message);
    else { toast.success('Eintrag erstellt'); onCreated(); onClose(); }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5"><Label>Titel *</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="z.B. Stellenprofil Finanzberater" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Kategorie</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Sprache</Label>
          <Select value={form.language} onValueChange={v => setForm(f => ({...f, language: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="de">Deutsch</SelectItem><SelectItem value="fr">Französisch</SelectItem><SelectItem value="en">Englisch</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Scope</Label>
          <Select value={form.scope_type} onValueChange={v => setForm(f => ({...f, scope_type: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="global">Global</SelectItem><SelectItem value="agent">Agent-spezifisch</SelectItem><SelectItem value="agency">Agentur-spezifisch</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Risikoklasse</Label>
          <Select value={form.risk_class} onValueChange={v => setForm(f => ({...f, risk_class: v}))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="low">Niedrig</SelectItem><SelectItem value="medium">Mittel</SelectItem><SelectItem value="high">Hoch</SelectItem><SelectItem value="critical">Kritisch</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Agent-Zuordnung (optional)</Label>
        <Select value={form.agent_id || "__global__"} onValueChange={v => setForm(f => ({...f, agent_id: v === "__global__" ? "" : v}))}>
          <SelectTrigger><SelectValue placeholder="Global" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__global__">Global</SelectItem>
            {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Inhalt</Label><Textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} rows={5} placeholder="Wissensinhalt eingeben..." /></div>
      <div className="flex items-center gap-2"><Switch checked={form.approved_for_live_calls} onCheckedChange={v => setForm(f => ({...f, approved_for_live_calls: v}))} /><Label>Für Live-Calls freigeben</Label></div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleCreate} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Erstellen</Button>
      </div>
    </div>
  );
}
