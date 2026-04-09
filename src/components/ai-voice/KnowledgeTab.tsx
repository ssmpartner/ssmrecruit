import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, BookOpen, Eye, Shield, CheckCircle2, Clock, AlertTriangle, Search } from 'lucide-react';

const MOCK_KNOWLEDGE = [
  { id: '1', title: 'SSM Partner AG – Unternehmensinfo', category: 'company', language: 'de', scope: 'global', agent: '–', content: 'Die SSM Partner AG ist ein führendes Finanzberatungsunternehmen in der Schweiz mit über 20 Standorten...', content_type: 'text', risk_class: 'low', approved: true, live: true, version: 1, approval_status: 'approved', valid_from: '2026-01-01', valid_until: null },
  { id: '2', title: 'Gehaltsrahmen Finanzberater', category: 'hr', language: 'de', scope: 'agent', agent: 'SSM Recruiting Bot', content: 'Fixlohn: CHF 4000–6000. Variable: leistungsabhängig. Spesen: CHF 500/Monat.', content_type: 'text', risk_class: 'high', approved: false, live: false, version: 1, approval_status: 'pending', valid_from: '2026-04-01', valid_until: '2026-12-31' },
  { id: '3', title: 'Stellenprofil Finanzberater', category: 'positions', language: 'de', scope: 'global', agent: '–', content: 'Anforderungen: Abgeschlossene kaufmännische Ausbildung, 2+ Jahre Vertriebserfahrung...', content_type: 'text', risk_class: 'low', approved: true, live: true, version: 2, approval_status: 'approved', valid_from: '2026-01-01', valid_until: null },
  { id: '4', title: 'FAQ – Bewerbungsprozess', category: 'faq', language: 'de', scope: 'global', agent: '–', content: 'Der Bewerbungsprozess besteht aus: 1. Erstgespräch, 2. Assessment, 3. Persönliches Gespräch...', content_type: 'text', risk_class: 'low', approved: true, live: true, version: 1, approval_status: 'approved', valid_from: '2026-01-01', valid_until: null },
  { id: '5', title: 'Compliance Regeln (intern)', category: 'compliance', language: 'de', scope: 'global', agent: '–', content: 'Keine Aussagen zu: Garantierten Einkommen, Konkurrenzvergleiche, persönliche Bewertungen...', content_type: 'text', risk_class: 'critical', approved: true, live: true, version: 3, approval_status: 'approved', valid_from: '2026-01-01', valid_until: null },
];

const RISK_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-green-100 text-green-800', label: 'Niedrig' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Mittel' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'Hoch' },
  critical: { color: 'bg-red-100 text-red-800', label: 'Kritisch' },
};

export default function KnowledgeTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = MOCK_KNOWLEDGE.filter(k => !search || k.title.toLowerCase().includes(search.toLowerCase()) || k.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">Knowledge Base</h3><p className="text-sm text-muted-foreground">Wissensbasis für KI-Agenten verwalten</p></div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Eintrag hinzufügen</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Wissenseintrag erstellen</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>Titel</Label><Input placeholder="z.B. Stellenprofil Finanzberater" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Kategorie</Label>
                  <Select defaultValue="general"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="company">Unternehmen</SelectItem><SelectItem value="positions">Positionen</SelectItem><SelectItem value="hr">HR</SelectItem><SelectItem value="faq">FAQ</SelectItem><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="general">Allgemein</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Sprache</Label>
                  <Select defaultValue="de"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="de">Deutsch</SelectItem><SelectItem value="fr">Französisch</SelectItem><SelectItem value="en">Englisch</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Scope</Label>
                  <Select defaultValue="global"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="global">Global</SelectItem><SelectItem value="agent">Agent-spezifisch</SelectItem><SelectItem value="agency">Agentur-spezifisch</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Risikoklasse</Label>
                  <Select defaultValue="low"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">Niedrig</SelectItem><SelectItem value="medium">Mittel</SelectItem><SelectItem value="high">Hoch</SelectItem><SelectItem value="critical">Kritisch</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Inhalt</Label><Textarea rows={5} placeholder="Wissensinhalt eingeben..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Gültig ab</Label><Input type="date" /></div>
                <div className="space-y-1.5"><Label>Gültig bis (optional)</Label><Input type="date" /></div>
              </div>
              <div className="flex items-center gap-2"><Switch id="k-live" /><Label htmlFor="k-live">Für Live-Calls freigeben</Label></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
                <Button onClick={() => { toast.success('Eintrag erstellt (Mock)'); setShowCreate(false); }}>Erstellen</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <div className="grid gap-3">
        {filtered.map(k => {
          const risk = RISK_CONFIG[k.risk_class] || RISK_CONFIG.low;
          return (
            <Card key={k.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm">{k.title}</p>
                        <Badge variant="outline" className="text-[10px]">{k.category}</Badge>
                        <Badge className={`text-[10px] ${risk.color} hover:${risk.color}`}>{risk.label}</Badge>
                        <Badge variant="outline" className="text-[10px]">v{k.version}</Badge>
                        {k.approval_status === 'approved' && <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-0.5" />Freigegeben</Badge>}
                        {k.approval_status === 'pending' && <Badge className="text-[10px] bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="h-3 w-3 mr-0.5" />Ausstehend</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{k.content}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span>Sprache: {k.language.toUpperCase()}</span>
                        <span>Scope: {k.scope}</span>
                        {k.agent !== '–' && <span>Agent: {k.agent}</span>}
                        {k.live && <span className="text-green-600 font-medium">● Live</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
