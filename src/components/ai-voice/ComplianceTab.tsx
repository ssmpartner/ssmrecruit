import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, CheckCircle2, Eye, Clock, FileText } from 'lucide-react';

const MOCK_RULES = [
  { id: '1', name: 'Aufnahme-Einwilligung', type: 'recording_consent', desc: 'Agent muss zu Beginn die Einwilligung zur Aufnahme einholen', severity: 'critical', active: true, applies_to: 'all' },
  { id: '2', name: 'KI-Offenlegung', type: 'disclosure', desc: 'Der Agent muss sich als KI-Assistent identifizieren', severity: 'high', active: true, applies_to: 'all' },
  { id: '3', name: 'DSGVO Datenhaltung', type: 'data_retention', desc: 'Aufnahmen werden nach 90 Tagen automatisch gelöscht', severity: 'high', active: true, applies_to: 'recordings' },
  { id: '4', name: 'Anrufzeiten', type: 'call_hours', desc: 'Anrufe nur Mo–Fr 08:00–18:00, Sa 09:00–12:00', severity: 'medium', active: true, applies_to: 'outbound' },
  { id: '5', name: 'Max. Anrufversuche', type: 'max_attempts', desc: 'Maximal 3 Versuche pro Lead innerhalb von 7 Tagen', severity: 'medium', active: true, applies_to: 'outbound' },
];

const MOCK_AUDIT = [
  { id: '1', timestamp: '2026-04-09 09:15', table: 'ai_agents', action: 'update', record: 'SSM Recruiting Bot', user: 'system-seed', detail: 'Status → testing' },
  { id: '2', timestamp: '2026-04-09 09:10', table: 'ai_agent_versions', action: 'publish', record: 'v1.0.0', user: 'system-seed', detail: 'Version publiziert' },
  { id: '3', timestamp: '2026-04-08 16:30', table: 'ai_voice_sessions', action: 'create', record: 'MOCK-003', user: 'ai-agent', detail: 'Outbound Session erstellt' },
  { id: '4', timestamp: '2026-04-08 14:00', table: 'ai_compliance_rules', action: 'update', record: 'Aufnahme-Einwilligung', user: 'admin', detail: 'Regel aktiviert' },
  { id: '5', timestamp: '2026-04-08 11:20', table: 'ai_voice_escalations', action: 'create', record: 'ESC-001', user: 'ai-agent', detail: 'Eskalation erstellt' },
];

const MOCK_VIOLATIONS = [
  { id: '1', session: 'MOCK-004', rule: 'Gehaltsverprechen', severity: 'high', status: 'review', detail: 'Agent hat möglicherweise Gehaltsangaben gemacht', timestamp: '2026-04-08 14:05' },
];

const SEV_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-gray-100 text-gray-800', label: 'Niedrig' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Mittel' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'Hoch' },
  critical: { color: 'bg-red-100 text-red-800', label: 'Kritisch' },
};

export default function ComplianceTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Compliance & Audit</h3>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="h-auto">
          <TabsTrigger value="rules" className="text-xs"><Shield className="h-3.5 w-3.5 mr-1" />Regeln</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1" />Audit Log</TabsTrigger>
          <TabsTrigger value="violations" className="text-xs"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Verletzungen</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="grid gap-3">
            {MOCK_RULES.map(rule => {
              const sev = SEV_CONFIG[rule.severity] || SEV_CONFIG.medium;
              return (
                <Card key={rule.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{rule.name}</p>
                          <Badge variant="outline" className="text-[10px]">{rule.type}</Badge>
                          <Badge className={`text-[10px] ${sev.color} hover:${sev.color}`}>{sev.label}</Badge>
                          <Badge variant="outline" className="text-[10px]">→ {rule.applies_to}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rule.desc}</p>
                      </div>
                    </div>
                    <Switch checked={rule.active} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeitpunkt</TableHead><TableHead>Tabelle</TableHead><TableHead>Aktion</TableHead>
                  <TableHead>Datensatz</TableHead><TableHead>Benutzer</TableHead><TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_AUDIT.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs font-mono">{a.timestamp}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{a.table}</Badge></TableCell>
                    <TableCell><Badge variant={a.action === 'create' ? 'default' : 'secondary'} className="text-[10px]">{a.action}</Badge></TableCell>
                    <TableCell className="text-sm">{a.record}</TableCell>
                    <TableCell className="text-sm">{a.user}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="violations">
          {MOCK_VIOLATIONS.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-green-600" />
              <p className="font-medium">Keine Regelverletzungen</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {MOCK_VIOLATIONS.map(v => (
                <Card key={v.id} className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{v.rule}</p>
                            <Badge className="text-[10px] bg-orange-100 text-orange-800 hover:bg-orange-100">{v.severity}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{v.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{v.detail}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Session: {v.session} · {v.timestamp}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5 mr-1" />Prüfen</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
