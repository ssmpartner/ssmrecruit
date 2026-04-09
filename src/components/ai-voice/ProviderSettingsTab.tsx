import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Settings2, Globe, Key, Webhook, Shield, Server, Plus, Pencil, Trash2,
  CheckCircle2, XCircle, Zap, AlertTriangle, Eye, EyeOff, PlugZap, Star,
  Phone, Bot, FileAudio, HardDrive, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { aiProviderService } from '@/lib/ai-voice-service';

// ── Types ──────────────────────────────────────────────────────────
type ProviderCategory = 'telephony' | 'voice_ai' | 'transcription' | 'storage';
type ProviderType = 'mock' | 'twilio' | 'openai_realtime' | 'custom';
type AuthType = 'api_key' | 'bearer' | 'account_sid' | 'oauth2' | 'none';

interface ProviderConfig {
  id: string;
  name: string;
  provider_category: ProviderCategory;
  provider_type: ProviderType;
  provider_code: string;
  endpoint_url: string;
  websocket_url: string;
  auth_type: AuthType;
  api_key_placeholder: string;
  secret_placeholder: string;
  account_sid_placeholder: string;
  webhook_url_placeholder: string;
  region: string;
  sandbox_mode: boolean;
  production_mode: boolean;
  is_default: boolean;
  status: string;
  config: Record<string, any>;
}

const EMPTY_PROVIDER: Omit<ProviderConfig, 'id'> = {
  name: '', provider_category: 'telephony', provider_type: 'mock', provider_code: '',
  endpoint_url: '', websocket_url: '', auth_type: 'api_key',
  api_key_placeholder: '', secret_placeholder: '', account_sid_placeholder: '',
  webhook_url_placeholder: '', region: 'eu', sandbox_mode: true, production_mode: false,
  is_default: false, status: 'inactive', config: {},
};

const CAT_META: Record<ProviderCategory, { label: string; icon: any; desc: string }> = {
  telephony:     { label: 'Telephonie',     icon: Phone,     desc: 'Anruf-Routing, SIP, Nummernverwaltung' },
  voice_ai:      { label: 'Voice AI',       icon: Bot,       desc: 'Sprachverarbeitung, Realtime-Konversation' },
  transcription: { label: 'Transkription',  icon: FileAudio, desc: 'Speech-to-Text, Gesprächsprotokollierung' },
  storage:       { label: 'Recording',      icon: HardDrive, desc: 'Aufnahmen, Dateien, Archivierung' },
};

const TYPE_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: 'mock', label: 'Mock Provider' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'openai_realtime', label: 'OpenAI Realtime' },
  { value: 'custom', label: 'Custom Provider' },
];

const AUTH_OPTIONS: { value: AuthType; label: string }[] = [
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'account_sid', label: 'Account SID + Token' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'none', label: 'Keine' },
];

const REGION_OPTIONS = ['eu', 'us', 'us1', 'ap', 'au', 'custom'];

// ── Adapter Status (mock) ──────────────────────────────────────────
const ADAPTER_STATUS: Record<ProviderType, { ready: boolean; label: string }> = {
  mock:            { ready: true,  label: 'Integriert' },
  twilio:          { ready: false, label: 'Vorbereitet' },
  openai_realtime: { ready: false, label: 'Vorbereitet' },
  custom:          { ready: false, label: 'Platzhalter' },
};

export default function ProviderSettingsTab() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [prodWarning, setProdWarning] = useState(false);
  const [pendingProdId, setPendingProdId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Omit<ProviderConfig, 'id'> & { id?: string }>(EMPTY_PROVIDER);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => { loadProviders(); }, []);

  async function loadProviders() {
    setLoading(true);
    try {
      const data = await aiProviderService.list();
      setProviders((data ?? []).map((d: any) => ({
        id: d.id,
        name: d.name,
        provider_category: d.provider_category,
        provider_type: d.provider_type,
        provider_code: d.provider_code,
        endpoint_url: d.endpoint_url,
        websocket_url: d.websocket_url,
        auth_type: d.auth_type,
        api_key_placeholder: d.api_key_placeholder,
        secret_placeholder: d.secret_placeholder,
        account_sid_placeholder: d.account_sid_placeholder,
        webhook_url_placeholder: d.webhook_url_placeholder,
        region: d.region,
        sandbox_mode: d.sandbox_mode,
        production_mode: d.production_mode,
        is_default: d.is_default,
        status: d.status,
        config: d.config || {},
      })));
    } catch { /* use empty */ }
    setLoading(false);
  }

  function openCreate() {
    setEditData({ ...EMPTY_PROVIDER });
    setEditDialog(true);
  }

  function openEdit(p: ProviderConfig) {
    setEditData({ ...p });
    setEditDialog(true);
  }

  async function handleSave() {
    try {
      if (editData.id) {
        const { id, ...rest } = editData as ProviderConfig;
        await aiProviderService.update(id, rest);
        toast.success('Provider aktualisiert');
      } else {
        await aiProviderService.create(editData as any);
        toast.success('Provider erstellt');
      }
      setEditDialog(false);
      loadProviders();
    } catch (e: any) {
      toast.error(e.message || 'Fehler beim Speichern');
    }
  }

  async function toggleStatus(p: ProviderConfig) {
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    try {
      await aiProviderService.update(p.id, { status: newStatus });
      toast.success(`Provider ${newStatus === 'active' ? 'aktiviert' : 'deaktiviert'}`);
      loadProviders();
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggleDefault(p: ProviderConfig) {
    try {
      // Remove default from same category first
      for (const other of providers.filter(o => o.provider_category === p.provider_category && o.is_default && o.id !== p.id)) {
        await aiProviderService.update(other.id, { is_default: false });
      }
      await aiProviderService.update(p.id, { is_default: !p.is_default });
      toast.success(p.is_default ? 'Default entfernt' : 'Als Default gesetzt');
      loadProviders();
    } catch (e: any) { toast.error(e.message); }
  }

  function requestProductionToggle(p: ProviderConfig) {
    if (!p.production_mode) {
      setPendingProdId(p.id);
      setProdWarning(true);
    } else {
      confirmProductionToggle(p.id, false);
    }
  }

  async function confirmProductionToggle(id: string, enable: boolean) {
    setProdWarning(false);
    setPendingProdId(null);
    try {
      await aiProviderService.update(id, { production_mode: enable });
      toast.success(enable ? '⚠️ Production-Modus aktiviert' : 'Production-Modus deaktiviert');
      loadProviders();
    } catch (e: any) { toast.error(e.message); }
  }

  async function testConnection(p: ProviderConfig) {
    setTestingId(p.id);
    // Simulate test
    await new Promise(r => setTimeout(r, 1500));
    setTestingId(null);
    if (p.provider_type === 'mock') {
      toast.success(`✅ Verbindung zu "${p.name}" erfolgreich (Mock)`);
    } else if (p.status === 'inactive' || (!p.api_key_placeholder && p.auth_type !== 'none')) {
      toast.error(`❌ Verbindung fehlgeschlagen – Credentials nicht konfiguriert`);
    } else {
      toast.info(`ℹ️ Testverbindung vorbereitet – echter Provider noch nicht angebunden`);
    }
  }

  function maskValue(val: string) {
    if (!val) return '(nicht konfiguriert)';
    if (val.length <= 4) return '••••';
    return '••••••••' + val.slice(-4);
  }

  const categories = Object.keys(CAT_META) as ProviderCategory[];
  const filteredProviders = activeCategory === 'all' ? providers : providers.filter(p => p.provider_category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Provider Settings</h3>
          <p className="text-sm text-muted-foreground">Telephonie-, Voice-AI-, Transkriptions- und Storage-Provider verwalten</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Provider hinzufügen</Button>
      </div>

      {/* ── Adapter Status Overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TYPE_OPTIONS.map(t => {
          const s = ADAPTER_STATUS[t.value];
          return (
            <Card key={t.value}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.ready ? 'bg-green-500/10' : 'bg-muted'}`}>
                  <PlugZap className={`h-4 w-4 ${s.ready ? 'text-green-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Category Tabs ── */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="all" className="text-xs">Alle</TabsTrigger>
          {categories.map(c => {
            const m = CAT_META[c];
            return <TabsTrigger key={c} value={c} className="text-xs"><m.icon className="h-3.5 w-3.5 mr-1" />{m.label}</TabsTrigger>;
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Laden…</p>
          ) : filteredProviders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Server className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Keine Provider konfiguriert</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                  <Plus className="h-3 w-3 mr-1" />Provider hinzufügen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredProviders.map(p => {
                const catMeta = CAT_META[p.provider_category as ProviderCategory];
                const CatIcon = catMeta?.icon || Server;
                const adapterStatus = ADAPTER_STATUS[p.provider_type as ProviderType];
                const isSecretVisible = showSecrets[p.id] ?? false;

                return (
                  <Card key={p.id} className={p.status === 'inactive' ? 'opacity-70' : ''}>
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CatIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.provider_code} • {p.provider_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {p.is_default && <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200"><Star className="h-2.5 w-2.5 mr-0.5" />Default</Badge>}
                          <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                            {p.status === 'active' ? <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> : <XCircle className="h-2.5 w-2.5 mr-0.5" />}
                            {p.status}
                          </Badge>
                          {!adapterStatus?.ready && <Badge variant="outline" className="text-[10px]">Adapter ausstehend</Badge>}
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-1.5"><Globe className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{p.region}</span></div>
                        <div className="flex items-center gap-1.5"><Key className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{p.auth_type}</span></div>
                        <div className="flex items-center gap-1.5"><Webhook className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{p.webhook_url_placeholder ? 'Webhook ✓' : '–'}</span></div>
                      </div>

                      {/* URLs */}
                      <div className="space-y-1.5">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">Endpoint</Label>
                          <Input value={p.endpoint_url || '–'} readOnly className="text-xs h-7 font-mono" />
                        </div>
                        {p.websocket_url && (
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-muted-foreground">WebSocket</Label>
                            <Input value={p.websocket_url} readOnly className="text-xs h-7 font-mono" />
                          </div>
                        )}
                      </div>

                      {/* Credentials (masked) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground">Credentials</Label>
                          <Button variant="ghost" size="sm" className="h-5 px-1" onClick={() => setShowSecrets(s => ({ ...s, [p.id]: !s[p.id] }))}>
                            {isSecretVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="text-[10px]"><span className="text-muted-foreground">API Key:</span> <span className="font-mono">{isSecretVisible ? (p.api_key_placeholder || '–') : maskValue(p.api_key_placeholder)}</span></div>
                          {p.auth_type === 'account_sid' && (
                            <div className="text-[10px]"><span className="text-muted-foreground">SID:</span> <span className="font-mono">{isSecretVisible ? (p.account_sid_placeholder || '–') : maskValue(p.account_sid_placeholder)}</span></div>
                          )}
                          {p.secret_placeholder && (
                            <div className="text-[10px]"><span className="text-muted-foreground">Secret:</span> <span className="font-mono">{isSecretVisible ? p.secret_placeholder : maskValue(p.secret_placeholder)}</span></div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Mode Switches */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Switch checked={p.sandbox_mode} onCheckedChange={async (v) => {
                              await aiProviderService.update(p.id, { sandbox_mode: v });
                              loadProviders();
                            }} />
                            <span className="text-xs">Sandbox</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Switch checked={p.production_mode} onCheckedChange={() => requestProductionToggle(p)} />
                            <span className="text-xs">Production</span>
                            {p.production_mode && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-3 w-3 mr-1" />Bearbeiten</Button>
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(p)}>
                          {p.status === 'active' ? <XCircle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {p.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleDefault(p)}>
                          <Star className={`h-3 w-3 mr-1 ${p.is_default ? 'fill-amber-500 text-amber-500' : ''}`} />
                          {p.is_default ? 'Default entfernen' : 'Als Default'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => testConnection(p)} disabled={testingId === p.id}>
                          {testingId === p.id ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <PlugZap className="h-3 w-3 mr-1" />}
                          Test
                        </Button>
                      </div>

                      {/* Warnings */}
                      {p.production_mode && p.provider_type !== 'mock' && (
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Production-Modus aktiv – Echte API-Calls werden ausgeführt!</span>
                        </div>
                      )}
                      {p.status === 'inactive' && (
                        <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground flex items-center gap-1.5">
                          <Shield className="h-3 w-3 flex-shrink-0" />
                          <span>Provider inaktiv – Credentials und Konfiguration müssen noch vervollständigt werden.</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Fallback & Architecture Info ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Provider-Architektur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold">Adapter Pattern</p>
              <p className="text-[10px] text-muted-foreground">Jeder Provider implementiert ein einheitliches Interface. Mock-Adapter sind sofort nutzbar, echte Adapter werden bei Bedarf aktiviert.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Fallback-Logik</p>
              <p className="text-[10px] text-muted-foreground">Bei Ausfall eines Providers wird automatisch der nächste verfügbare Provider derselben Kategorie verwendet (Default → Fallback).</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Sandbox / Production</p>
              <p className="text-[10px] text-muted-foreground">Strikte Trennung: Sandbox-Provider werden nur im Testbetrieb verwendet. Production erfordert explizite Aktivierung mit Bestätigung.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Edit/Create Dialog ── */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editData.id ? 'Provider bearbeiten' : 'Neuen Provider erstellen'}</DialogTitle>
            <DialogDescription>Konfiguriere die Provider-Einstellungen</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Code</Label>
              <Input value={editData.provider_code} onChange={e => setEditData(d => ({ ...d, provider_code: e.target.value }))} placeholder="z.B. twilio_eu" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategorie</Label>
              <Select value={editData.provider_category} onValueChange={v => setEditData(d => ({ ...d, provider_category: v as ProviderCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{CAT_META[c].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Provider-Typ</Label>
              <Select value={editData.provider_type} onValueChange={v => setEditData(d => ({ ...d, provider_type: v as ProviderType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Auth Type</Label>
              <Select value={editData.auth_type} onValueChange={v => setEditData(d => ({ ...d, auth_type: v as AuthType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUTH_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Region</Label>
              <Select value={editData.region} onValueChange={v => setEditData(d => ({ ...d, region: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGION_OPTIONS.map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-semibold">Endpoints</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Endpoint URL</Label>
              <Input value={editData.endpoint_url} onChange={e => setEditData(d => ({ ...d, endpoint_url: e.target.value }))} placeholder="https://api.provider.com/v1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">WebSocket URL</Label>
              <Input value={editData.websocket_url} onChange={e => setEditData(d => ({ ...d, websocket_url: e.target.value }))} placeholder="wss://api.provider.com/ws" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Webhook URL Placeholder</Label>
              <Input value={editData.webhook_url_placeholder} onChange={e => setEditData(d => ({ ...d, webhook_url_placeholder: e.target.value }))} placeholder="https://your-domain.com/webhook/voice" />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-semibold flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Credentials (Platzhalter)</p>
            <p className="text-[10px] text-muted-foreground">Echte API-Keys werden als Secrets gespeichert, hier nur Platzhalter/Referenzen.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">API Key Placeholder</Label>
                <Input value={editData.api_key_placeholder} onChange={e => setEditData(d => ({ ...d, api_key_placeholder: e.target.value }))} placeholder="TWILIO_API_KEY" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Secret Placeholder</Label>
                <Input value={editData.secret_placeholder} onChange={e => setEditData(d => ({ ...d, secret_placeholder: e.target.value }))} placeholder="TWILIO_AUTH_TOKEN" />
              </div>
              {editData.auth_type === 'account_sid' && (
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Account SID Placeholder</Label>
                  <Input value={editData.account_sid_placeholder} onChange={e => setEditData(d => ({ ...d, account_sid_placeholder: e.target.value }))} placeholder="TWILIO_ACCOUNT_SID" />
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-semibold">Zusatzkonfiguration (JSON)</p>
            <Textarea
              value={JSON.stringify(editData.config, null, 2)}
              onChange={e => {
                try {
                  setEditData(d => ({ ...d, config: JSON.parse(e.target.value) }));
                } catch { /* ignore parse errors while typing */ }
              }}
              className="font-mono text-xs"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!editData.name}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Production Warning Dialog ── */}
      <AlertDialog open={prodWarning} onOpenChange={setProdWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Production-Modus aktivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Durch die Aktivierung des Production-Modus werden echte API-Calls an den Provider gesendet.
              Es entstehen reale Kosten und echte Anrufe werden getätigt. Stellen Sie sicher, dass alle Credentials korrekt konfiguriert sind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-600 hover:bg-amber-700" onClick={() => pendingProdId && confirmProductionToggle(pendingProdId, true)}>
              Production aktivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
