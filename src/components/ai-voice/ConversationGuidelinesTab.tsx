import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Guideline {
  id: string;
  title: string;
  category: 'greeting' | 'objection' | 'closing' | 'escalation' | 'forbidden' | 'disclosure';
  content: string;
  isActive: boolean;
  priority: number;
}

const MOCK_GUIDELINES: Guideline[] = [
  { id: '1', title: 'Begrüssung Standard', category: 'greeting', content: 'Guten Tag, mein Name ist [Agent]. Ich rufe im Auftrag von SSM Partner an bezüglich Ihrer Bewerbung.', isActive: true, priority: 1 },
  { id: '2', title: 'KI-Offenlegung', category: 'disclosure', content: 'Ich möchte Sie darauf hinweisen, dass dieses Gespräch durch eine künstliche Intelligenz geführt wird.', isActive: true, priority: 1 },
  { id: '3', title: 'Einwand: Kein Interesse', category: 'objection', content: 'Ich verstehe das vollkommen. Darf ich kurz fragen, was der Hauptgrund ist? Vielleicht können wir eine passendere Option finden.', isActive: true, priority: 2 },
  { id: '4', title: 'Eskalationsregel', category: 'escalation', content: 'Bei Beschwerden oder Drohungen sofort an einen menschlichen Mitarbeiter übergeben.', isActive: true, priority: 1 },
  { id: '5', title: 'Gesperrtes Thema: Gehalt', category: 'forbidden', content: 'Keine konkreten Gehaltsversprechen oder -nennungen im Erstgespräch.', isActive: true, priority: 1 },
  { id: '6', title: 'Verabschiedung Standard', category: 'closing', content: 'Vielen Dank für das Gespräch. Wir melden uns in Kürze bei Ihnen. Auf Wiederhören!', isActive: true, priority: 3 },
];

const CAT_STYLE: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  greeting: { label: 'Begrüssung', cls: 'bg-blue-500/10 text-blue-700', icon: MessageSquare },
  objection: { label: 'Einwandbehandlung', cls: 'bg-amber-500/10 text-amber-700', icon: AlertTriangle },
  closing: { label: 'Verabschiedung', cls: 'bg-emerald-500/10 text-emerald-700', icon: CheckCircle2 },
  escalation: { label: 'Eskalation', cls: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
  forbidden: { label: 'Gesperrt', cls: 'bg-destructive/10 text-destructive', icon: Shield },
  disclosure: { label: 'Offenlegung', cls: 'bg-purple-500/10 text-purple-700', icon: Shield },
};

export default function ConversationGuidelinesTab() {
  const [guidelines] = useState<Guideline[]>(MOCK_GUIDELINES);
  const categories = [...new Set(guidelines.map(g => g.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gesprächsrichtlinien</h2>
          <p className="text-sm text-muted-foreground">Vorlagen und Regeln für KI-gestützte Gespräche</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Richtlinie hinzufügen</Button>
      </div>

      {categories.map(cat => {
        const style = CAT_STYLE[cat] || { label: cat, cls: 'bg-muted text-muted-foreground', icon: MessageSquare };
        const items = guidelines.filter(g => g.category === cat);
        const CatIcon = style.icon;
        return (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CatIcon className="h-4 w-4" />
                {style.label}
                <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map(g => (
                <div key={g.id} className={`border rounded-lg p-4 ${style.cls}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{g.title}</p>
                    <Badge variant={g.isActive ? 'default' : 'secondary'} className="text-[10px]">
                      {g.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                  <p className="text-xs opacity-80 italic">„{g.content}"</p>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
