import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings2, Globe, Key, Webhook, Shield, Server } from 'lucide-react';
import { toast } from 'sonner';

const MOCK_PROVIDERS = [
  {
    id: '1', name: 'Mock Telephony Provider', category: 'telephony', type: 'mock', code: 'mock_tel', status: 'active',
    endpoint: 'https://mock.provider.local/telephony', websocket: '', auth_type: 'api_key',
    api_key: '••••••••', secret: '', account_sid: '', webhook: '',
    sandbox: true, production: false, is_default: true, region: 'eu',
  },
  {
    id: '2', name: 'Mock Voice AI Provider', category: 'voice_ai', type: 'mock', code: 'mock_vai', status: 'active',
    endpoint: 'https://mock.provider.local/voice-ai', websocket: 'wss://mock.provider.local/ws', auth_type: 'api_key',
    api_key: '••••••••', secret: '', account_sid: '', webhook: '',
    sandbox: true, production: false, is_default: true, region: 'eu',
  },
  {
    id: '3', name: 'Twilio (vorbereitet)', category: 'telephony', type: 'twilio', code: 'twilio', status: 'inactive',
    endpoint: 'https://api.twilio.com', websocket: '', auth_type: 'account_sid',
    api_key: '', secret: '', account_sid: '', webhook: '',
    sandbox: false, production: false, is_default: false, region: 'us1',
  },
  {
    id: '4', name: 'OpenAI Realtime (vorbereitet)', category: 'voice_ai', type: 'openai_realtime', code: 'openai_rt', status: 'inactive',
    endpoint: 'https://api.openai.com/v1', websocket: 'wss://api.openai.com/v1/realtime', auth_type: 'bearer',
    api_key: '', secret: '', account_sid: '', webhook: '',
    sandbox: false, production: false, is_default: false, region: 'us',
  },
  {
    id: '5', name: 'Mock Transcription', category: 'transcription', type: 'mock', code: 'mock_stt', status: 'active',
    endpoint: 'https://mock.provider.local/transcription', websocket: '', auth_type: 'api_key',
    api_key: '••••••••', secret: '', account_sid: '', webhook: '',
    sandbox: true, production: false, is_default: true, region: 'eu',
  },
];

const CAT_LABELS: Record<string, string> = {
  telephony: 'Telephonie',
  voice_ai: 'Voice AI',
  transcription: 'Transkription',
  storage: 'Storage',
};

export default function ProviderSettingsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Provider Settings</h3>
        <p className="text-sm text-muted-foreground">Telephony-, Voice-AI- und Transcription-Provider konfigurieren</p>
      </div>

      {/* Group by category */}
      {['telephony', 'voice_ai', 'transcription'].map(cat => {
        const providers = MOCK_PROVIDERS.filter(p => p.category === cat);
        return (
          <div key={cat} className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              {CAT_LABELS[cat] || cat}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map(p => (
                <Card key={p.id} className={p.status === 'inactive' ? 'opacity-60' : ''}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-primary" />
                        <p className="font-medium text-sm">{p.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {p.is_default && <Badge variant="default" className="text-[10px]">Default</Badge>}
                        <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{p.status}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5"><Globe className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Region: {p.region}</span></div>
                      <div className="flex items-center gap-1.5"><Key className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Auth: {p.auth_type}</span></div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Endpoint URL</Label><Input value={p.endpoint} readOnly className="text-xs h-8" /></div>
                      {p.websocket && <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">WebSocket URL</Label><Input value={p.websocket} readOnly className="text-xs h-8" /></div>}
                      <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">API Key</Label><Input value={p.api_key || '(nicht konfiguriert)'} readOnly className="text-xs h-8" type={p.api_key ? 'password' : 'text'} /></div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5"><Switch checked={p.sandbox} /><span className="text-xs">Sandbox</span></div>
                        <div className="flex items-center gap-1.5"><Switch checked={p.production} /><span className="text-xs">Production</span></div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => toast.info('Provider-Konfiguration wird geöffnet (in Entwicklung)')}>Konfigurieren</Button>
                    </div>

                    {p.status === 'inactive' && (
                      <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                        <Shield className="h-3 w-3 inline mr-1" />
                        API-Key und Credentials müssen noch hinterlegt werden.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
