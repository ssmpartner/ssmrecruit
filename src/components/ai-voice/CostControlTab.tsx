import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { DollarSign, AlertTriangle, Bot, Building2, Megaphone, TrendingUp } from 'lucide-react';
import { getMockCostData } from '@/lib/ai-voice-mock';

export default function CostControlTab() {
  const costs = getMockCostData();

  const budgets = [
    { scope: 'Agent', icon: Bot, items: [
      { name: 'SSM Recruiting Bot', used: 98.50, limit: 200, warn: 150 },
      { name: 'SSM Inbound Assistent', used: 29.00, limit: 100, warn: 75 },
    ]},
    { scope: 'Agentur', icon: Building2, items: [
      { name: 'SSM Zürich', used: 85.20, limit: 300, warn: 250 },
      { name: 'SSM Bern', used: 42.30, limit: 300, warn: 250 },
    ]},
    { scope: 'Kampagne', icon: Megaphone, items: [
      { name: 'Frühlings-Recruiting 2026', used: 385.50, limit: 2000, warn: 1500 },
      { name: 'Reactivation Q2', used: 210.00, limit: 1000, warn: 750 },
    ]},
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Cost Control</h3>

      {/* Total Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Gesamtkosten Monat</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{costs.totalCost.toFixed(2)} {costs.currency}</p>
            <p className="text-sm text-muted-foreground mt-1">Laufender Monat (April 2026)</p>
            <div className="mt-4 space-y-2">
              {costs.breakdown.map(b => (
                <div key={b.type}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">{b.label}</span><span className="font-medium">{b.amount.toFixed(2)} CHF</span></div>
                  <Progress value={b.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Tagesverlauf</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {costs.dailyTrend.map(d => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-12">{d.date}</span>
                  <div className="flex-1"><Progress value={(d.cost / 30) * 100} className="h-2" /></div>
                  <span className="text-sm font-medium w-20 text-right">{d.cost.toFixed(2)} CHF</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget per Scope */}
      {budgets.map(scope => (
        <Card key={scope.scope}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><scope.icon className="h-4 w-4 text-primary" />Budget pro {scope.scope}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scope.items.map((item, i) => {
                const pct = (item.used / item.limit) * 100;
                const isWarn = item.used >= item.warn;
                const isOver = item.used >= item.limit;
                return (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        {isOver && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Limit erreicht</Badge>}
                        {!isOver && isWarn && <Badge className="text-[10px] bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><AlertTriangle className="h-3 w-3 mr-0.5" />Warnung</Badge>}
                      </div>
                      <span className="text-sm">{item.used.toFixed(2)} / {item.limit} CHF</span>
                    </div>
                    <Progress value={Math.min(pct, 100)} className={`h-2 ${isOver ? '[&>div]:bg-red-500' : isWarn ? '[&>div]:bg-yellow-500' : ''}`} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Warnschwelle: {item.warn} CHF</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Global Limits */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Globale Limits & Auto-Stopp</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Tägliches Gesamtlimit (CHF)</Label><Input type="number" defaultValue={500} /></div>
            <div className="space-y-1.5"><Label>Monatliches Gesamtlimit (CHF)</Label><Input type="number" defaultValue={5000} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Warnschwelle (% des Limits)</Label><Input type="number" defaultValue={80} /></div>
            <div className="flex items-center gap-2 pt-6"><Switch defaultChecked id="auto-stop" /><Label htmlFor="auto-stop">Auto-Stopp bei Überschreitung</Label></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
