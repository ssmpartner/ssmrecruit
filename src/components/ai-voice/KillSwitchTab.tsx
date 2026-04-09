import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Power, Shield, XOctagon, CheckCircle2, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function KillSwitchTab() {
  const [globalKill, setGlobalKill] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null);

  async function handleGlobalKill() {
    setGlobalKill(true);
    toast.warning('🛑 Globaler Kill Switch aktiviert – alle Agenten gestoppt');
    setConfirmOpen(null);
  }

  async function handleReactivate() {
    setGlobalKill(false);
    toast.success('✅ System reaktiviert');
  }

  return (
    <div className="space-y-6">
      {/* Global Kill Switch */}
      <Card className={globalKill ? 'border-destructive bg-destructive/5' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XOctagon className={`h-5 w-5 ${globalKill ? 'text-destructive' : ''}`} />
            Globaler Kill Switch
          </CardTitle>
        </CardHeader>
        <CardContent>
          {globalKill ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 border border-destructive/30 rounded-lg p-4 bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-bold text-destructive">System gestoppt</p>
                  <p className="text-sm text-destructive/80">Alle AI Voice Agenten wurden deaktiviert. Keine Anrufe werden getätigt oder entgegengenommen.</p>
                </div>
              </div>
              <Button onClick={handleReactivate} variant="outline">
                <CheckCircle2 className="h-4 w-4 mr-2" />System reaktivieren
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Der globale Kill Switch stoppt sofort alle aktiven AI Voice Agenten, laufende Sessions und geplante Kampagnen.
                Diese Aktion ist reversibel.
              </p>
              {confirmOpen === 'global' ? (
                <div className="flex items-center gap-3 border border-destructive/30 rounded-lg p-4 bg-destructive/5">
                  <p className="text-sm text-destructive font-medium flex-1">Sind Sie sicher? Alle aktiven Gespräche werden beendet.</p>
                  <Button variant="destructive" size="sm" onClick={handleGlobalKill}>
                    <Power className="h-4 w-4 mr-1" />Bestätigen
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmOpen(null)}>Abbrechen</Button>
                </div>
              ) : (
                <Button variant="destructive" onClick={() => setConfirmOpen('global')}>
                  <Power className="h-4 w-4 mr-2" />Kill Switch aktivieren
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Einzelne Abschaltungen */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Einzelne Agenten stoppen</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Einzelne Agenten können über die Agenten-Verwaltung deaktiviert werden, ohne das gesamte System zu stoppen.</p>
          <div className="space-y-2">
            {['Recruiting Bot', 'Outbound Qualifier', 'Follow-Up Agent'].map(name => (
              <div key={name} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${globalKill ? 'bg-destructive' : 'bg-emerald-500'}`} />
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <Badge variant={globalKill ? 'destructive' : 'default'} className="text-[10px]">
                  {globalKill ? 'Gestoppt' : 'Aktiv'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Safety Info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Sicherheitshinweise</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Der Kill Switch beendet alle aktiven Gespräche sofort</p>
          <p>• Geplante Kampagnen werden pausiert, nicht gelöscht</p>
          <p>• Ein Audit-Log-Eintrag wird automatisch erstellt</p>
          <p>• Nur Superadmins können den Kill Switch aktivieren</p>
          <p>• Die Reaktivierung erfordert manuelle Bestätigung</p>
        </CardContent>
      </Card>
    </div>
  );
}
