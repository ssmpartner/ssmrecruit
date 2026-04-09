import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Settings, Users, Code2, History } from 'lucide-react';

export default function VoiceDocsTab() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="setup" className="text-xs"><Settings className="h-3.5 w-3.5 mr-1" />Einrichtung</TabsTrigger>
          <TabsTrigger value="operations" className="text-xs"><BookOpen className="h-3.5 w-3.5 mr-1" />Betriebsmodell</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs"><Users className="h-3.5 w-3.5 mr-1" />Rollen & Rechte</TabsTrigger>
          <TabsTrigger value="api" className="text-xs"><Code2 className="h-3.5 w-3.5 mr-1" />API</TabsTrigger>
          <TabsTrigger value="changelog" className="text-xs"><History className="h-3.5 w-3.5 mr-1" />Änderungen</TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <Card>
            <CardHeader><CardTitle>Einrichtung & Konfiguration</CardTitle></CardHeader>
            <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
              <h3 className="text-foreground text-base font-semibold">1. Provider einrichten</h3>
              <p>Navigieren Sie zu <strong>Infrastruktur → Provider</strong> und konfigurieren Sie mindestens einen Telephony-Provider (z.B. Twilio) und einen Voice-AI-Provider.</p>
              <h3 className="text-foreground text-base font-semibold">2. Agent erstellen</h3>
              <p>Unter <strong>Betrieb → Agenten</strong> erstellen Sie einen neuen Voice Agent mit System-Prompt, Begrüssung und Gesprächsregeln.</p>
              <h3 className="text-foreground text-base font-semibold">3. Nummer zuweisen</h3>
              <p>Weisen Sie dem Agenten eine Telefonnummer zu unter <strong>Infrastruktur → Voice Numbers</strong>.</p>
              <h3 className="text-foreground text-base font-semibold">4. Deployment erstellen</h3>
              <p>Starten Sie mit einem <strong>Shadow-Deployment</strong> im Test-Modus, bevor Sie auf Produktion wechseln.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <Card>
            <CardHeader><CardTitle>Betriebsmodell</CardTitle></CardHeader>
            <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
              <h3 className="text-foreground text-base font-semibold">Rollout-Modi</h3>
              <ul>
                <li><strong>Shadow:</strong> Agent hört zu, schlägt vor, führt nichts aus</li>
                <li><strong>Recommendation:</strong> Agent schlägt Aktionen vor, Mensch bestätigt</li>
                <li><strong>Semi-Autonomous:</strong> Einfache Aktionen automatisch, kritische mit Bestätigung</li>
                <li><strong>Autonomous:</strong> Vollautomatische Ausführung aller Aktionen</li>
              </ul>
              <h3 className="text-foreground text-base font-semibold">Eskalationspfade</h3>
              <p>Bei negativer Stimmung, Compliance-Verstössen oder expliziten Wünschen wird automatisch an einen menschlichen Mitarbeiter eskaliert.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader><CardTitle>Rollen & Berechtigungen</CardTitle></CardHeader>
            <CardContent className="prose prose-sm max-w-none text-muted-foreground">
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Bereich</th>
                      <th className="text-center py-2">Superadmin</th>
                      <th className="text-center py-2">Admin</th>
                      <th className="text-center py-2">Teamleiter</th>
                      <th className="text-center py-2">Backoffice</th>
                      <th className="text-center py-2">Analyst</th>
                    </tr>
                  </thead>
                  <tbody className="text-center">
                    <tr className="border-b"><td className="text-left py-1.5">Übersicht</td><td>✓</td><td>✓</td><td>✓</td><td>–</td><td>✓</td></tr>
                    <tr className="border-b"><td className="text-left py-1.5">Agenten</td><td>✓</td><td>✓</td><td>RO</td><td>–</td><td>–</td></tr>
                    <tr className="border-b"><td className="text-left py-1.5">Deployments</td><td>✓</td><td>✓</td><td>Eigene</td><td>–</td><td>–</td></tr>
                    <tr className="border-b"><td className="text-left py-1.5">Sessions</td><td>✓</td><td>✓</td><td>Eigene</td><td>Zugewiesene</td><td>✓</td></tr>
                    <tr className="border-b"><td className="text-left py-1.5">Kosten</td><td>✓</td><td>–</td><td>–</td><td>–</td><td>–</td></tr>
                    <tr className="border-b"><td className="text-left py-1.5">Provider</td><td>✓</td><td>–</td><td>–</td><td>–</td><td>–</td></tr>
                    <tr className="border-b"><td className="text-left py-1.5">Compliance</td><td>✓</td><td>–</td><td>–</td><td>–</td><td>✓</td></tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader><CardTitle>API-Dokumentation</CardTitle></CardHeader>
            <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-3">
              <p>Die AI Voice Agent API ist über die Supabase Edge Functions erreichbar. Alle Endpunkte erfordern eine gültige Authentifizierung.</p>
              <h3 className="text-foreground text-base font-semibold">Basis-URL</h3>
              <code className="block bg-muted p-2 rounded text-xs">POST /functions/v1/voice-webhook</code>
              <h3 className="text-foreground text-base font-semibold">Authentifizierung</h3>
              <p>Bearer Token via <code>Authorization</code> Header.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changelog">
          <Card>
            <CardHeader><CardTitle>Änderungsverlauf</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { version: '1.0.0', date: '09.04.2026', changes: ['Initiales AI Voice Agent Modul', 'Mock-Provider implementiert', '14 Verwaltungsbereiche', 'Rollen- und Rechteintegration', 'Cost Control & Kill Switch'] },
              ].map(v => (
                <div key={v.version} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-sm">v{v.version}</span>
                    <span className="text-xs text-muted-foreground">{v.date}</span>
                  </div>
                  <ul className="space-y-1">
                    {v.changes.map((c, i) => <li key={i} className="text-xs text-muted-foreground">• {c}</li>)}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
