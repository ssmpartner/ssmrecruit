import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Zap, Calendar, UserPlus, RotateCcw, CheckSquare, AlertTriangle, ArrowRightLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

const MOCK_RULES = [
  { id: '1', trigger: 'Termin vereinbart', action: 'Termin im Kalender erstellen', type: 'appointment', icon: Calendar, mode: 'suggested', approval_required: true, active: true },
  { id: '2', trigger: 'Neuer Lead erkannt', action: 'Lead im System anlegen', type: 'lead_create', icon: UserPlus, mode: 'auto_executed', approval_required: false, active: true },
  { id: '3', trigger: 'Kein Interesse', action: 'Status auf "Nicht interessiert" setzen', type: 'status_change', icon: ArrowRightLeft, mode: 'suggested', approval_required: true, active: true },
  { id: '4', trigger: 'Eskalation angefordert', action: 'Weiterleitung an zuständigen Mitarbeiter', type: 'escalation', icon: AlertTriangle, mode: 'auto_executed', approval_required: false, active: true },
  { id: '5', trigger: 'Rückruf gewünscht', action: 'Aufgabe "Rückruf" erstellen', type: 'task_create', icon: CheckSquare, mode: 'suggested', approval_required: true, active: false },
  { id: '6', trigger: 'Follow-up gewünscht', action: 'Follow-up Task erstellen + Erinnerung setzen', type: 'follow_up', icon: RotateCcw, mode: 'suggested', approval_required: true, active: true },
  { id: '7', trigger: 'Wizard-Ergebnis erkannt', action: 'Wizard-Prozess starten', type: 'wizard_start', icon: Zap, mode: 'suggested', approval_required: true, active: false },
  { id: '8', trigger: 'Mensch zuweisen', action: 'Lead einem Mitarbeiter zuweisen', type: 'assign_human', icon: UserPlus, mode: 'suggested', approval_required: true, active: true },
];

export default function ActionRulesTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Action Rules</h3>
          <p className="text-sm text-muted-foreground">Definiere Aktionen, die ein Agent nach Gesprächsergebnis auslösen darf</p>
        </div>
        <Button onClick={() => toast.info('In Entwicklung')}><Plus className="h-4 w-4 mr-2" />Neue Regel</Button>
      </div>

      <div className="grid gap-3">
        {MOCK_RULES.map(rule => (
          <Card key={rule.id} className={!rule.active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <rule.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">Wenn: {rule.trigger}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Dann: {rule.action}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={rule.mode === 'auto_executed' ? 'default' : 'outline'} className="text-[10px]">
                      {rule.mode === 'auto_executed' ? 'Direkt ausführen' : 'Nur Vorschlag'}
                    </Badge>
                    {rule.approval_required && <Badge variant="secondary" className="text-[10px]">Genehmigung nötig</Badge>}
                  </div>
                  <Switch checked={rule.active} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
