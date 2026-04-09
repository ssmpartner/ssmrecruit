import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, PhoneOutgoing, PhoneIncoming, Play, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { MockVoiceProvider, type MockSession, type MockTurn } from '@/lib/ai-voice-mock';

const mockProvider = new MockVoiceProvider();

function TurnBubble({ turn }: { turn: MockTurn }) {
  if (turn.role === 'system') {
    return <div className="flex justify-center"><span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{turn.transcript}</span></div>;
  }
  const isAgent = turn.role === 'agent';
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isAgent ? 'bg-primary/10' : 'bg-muted'}`}>
        <div className="flex items-center gap-2 mb-1">
          {isAgent ? <Bot className="h-3 w-3 text-primary" /> : <User className="h-3 w-3" />}
          <span className="text-[10px] font-medium text-muted-foreground">{isAgent ? 'Agent' : 'Kandidat'} · {(turn.confidence * 100).toFixed(0)}%</span>
        </div>
        <p className="text-sm">{turn.transcript}</p>
      </div>
    </div>
  );
}

export default function TestCenterTab() {
  const [isRunning, setIsRunning] = useState(false);
  const [session, setSession] = useState<MockSession | null>(null);

  const run = async (type: 'outbound' | 'inbound') => {
    setIsRunning(true); setSession(null);
    try {
      const result = type === 'outbound'
        ? await mockProvider.startOutboundCall({ leadId: 'test-lead-dummy-001', agentId: 'mock-agent-001', phoneNumber: '+41791234567' })
        : await mockProvider.simulateInboundCall({ agentId: 'mock-agent-002', callerNumber: '+41791234567' });
      setSession(result);
      toast.success(`Mock ${type === 'outbound' ? 'Outbound' : 'Inbound'} Call abgeschlossen`);
    } finally { setIsRunning(false); }
  };

  return (
    <div className="space-y-6">
      <div><h3 className="text-lg font-semibold">Test Center</h3><p className="text-sm text-muted-foreground">Simuliere Anrufe und teste Agenten im Mock-Modus</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => !isRunning && run('outbound')}>
          <CardContent className="p-6 text-center space-y-3">
            <PhoneOutgoing className="h-8 w-8 mx-auto text-primary" />
            <p className="font-medium">Outbound Call simulieren</p>
            <p className="text-xs text-muted-foreground">Testet einen ausgehenden Anruf</p>
            <Button disabled={isRunning} className="w-full">{isRunning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Läuft...</> : <><Play className="h-4 w-4 mr-2" />Starten</>}</Button>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => !isRunning && run('inbound')}>
          <CardContent className="p-6 text-center space-y-3">
            <PhoneIncoming className="h-8 w-8 mx-auto text-accent-foreground" />
            <p className="font-medium">Inbound Call simulieren</p>
            <p className="text-xs text-muted-foreground">Testet einen eingehenden Anruf</p>
            <Button variant="outline" disabled={isRunning} className="w-full">{isRunning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Läuft...</> : <><Play className="h-4 w-4 mr-2" />Starten</>}</Button>
          </CardContent>
        </Card>
      </div>
      {session && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Gesprächsverlauf</p>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[10px]">{session.status}</Badge>
                <Badge variant={session.sentiment === 'positive' ? 'default' : 'secondary'} className="text-[10px]">{session.sentiment}</Badge>
                <Badge variant="outline" className="text-[10px]">{session.durationSeconds}s</Badge>
              </div>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {session.turns.map((t, i) => <TurnBubble key={i} turn={t} />)}
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-1">Zusammenfassung</p>
              <p className="text-sm text-muted-foreground">{session.summary}</p>
              <Badge variant="outline" className="text-[10px] mt-2">{session.outcome.replace(/_/g, ' ')}</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
