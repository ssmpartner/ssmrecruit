import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, Trash2, Video, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface Cfg {
  enabled: boolean;
  video_url: string | null;
  thumbnail_url: string | null;
  video_url_appointments: string | null;
  thumbnail_url_appointments: string | null;
  appointments_video_title: string;
  appointments_video_intro: string;
  page_title: string;
  page_intro: string;
  button_proceed_label: string;
  button_reject_label: string;
  proceed_confirmation_text: string;
  reject_confirmation_text: string;
  email_subject: string;
  email_html: string;
  auto_sources: string[];
}

const BUCKET = 'welcome-assets';

type AssetKind = 'video' | 'thumbnail' | 'video_appointments' | 'thumbnail_appointments';

const ASSET_FIELD: Record<AssetKind, keyof Cfg> = {
  video: 'video_url',
  thumbnail: 'thumbnail_url',
  video_appointments: 'video_url_appointments',
  thumbnail_appointments: 'thumbnail_url_appointments',
};

const ASSET_FOLDER: Record<AssetKind, string> = {
  video: 'video',
  thumbnail: 'thumbnail',
  video_appointments: 'video-appointments',
  thumbnail_appointments: 'thumbnail-appointments',
};

export default function WelcomeWizardConfigTab() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [sources, setSources] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<AssetKind, boolean>>({ video: false, thumbnail: false, video_appointments: false, thumbnail_appointments: false });

  const load = useCallback(async () => {
    setLoading(true);
    const [cfgRes, srcRes] = await Promise.all([
      supabase.from('welcome_wizard_config').select('*').eq('id', true).maybeSingle(),
      supabase.from('lead_sources').select('id, label').order('sort_order', { ascending: true }),
    ]);
    if (cfgRes.data) setCfg(cfgRes.data as any);
    if (srcRes.data) setSources(srcRes.data as any);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    const { error } = await supabase.from('welcome_wizard_config').update({
      enabled: cfg.enabled,
      video_url: cfg.video_url,
      thumbnail_url: cfg.thumbnail_url,
      video_url_appointments: cfg.video_url_appointments,
      thumbnail_url_appointments: cfg.thumbnail_url_appointments,
      appointments_video_title: cfg.appointments_video_title,
      appointments_video_intro: cfg.appointments_video_intro,
      page_title: cfg.page_title,
      page_intro: cfg.page_intro,
      button_proceed_label: cfg.button_proceed_label,
      button_reject_label: cfg.button_reject_label,
      proceed_confirmation_text: cfg.proceed_confirmation_text,
      reject_confirmation_text: cfg.reject_confirmation_text,
      email_subject: cfg.email_subject,
      email_html: cfg.email_html,
      auto_sources: cfg.auto_sources,
    }).eq('id', true);
    setSaving(false);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Gespeichert', description: 'Willkommen-Wizard wurde aktualisiert.' });
  };

  const uploadFile = async (file: File, kind: AssetKind) => {
    if (!cfg) return;
    setUploading(u => ({ ...u, [kind]: true }));
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${ASSET_FOLDER[kind]}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      toast({ title: 'Upload fehlgeschlagen', description: error.message, variant: 'destructive' });
      setUploading(u => ({ ...u, [kind]: false }));
      return;
    }
    const url = `${BUCKET}/${path}`;
    setCfg({ ...cfg, [ASSET_FIELD[kind]]: url } as Cfg);
    setUploading(u => ({ ...u, [kind]: false }));
    toast({ title: 'Hochgeladen', description: 'Bitte abschliessend speichern.' });
  };

  const removeAsset = async (kind: AssetKind) => {
    if (!cfg) return;
    const field = ASSET_FIELD[kind];
    const current = cfg[field] as string | null;
    if (current) {
      const path = current.startsWith(`${BUCKET}/`) ? current.substring(BUCKET.length + 1) : null;
      if (path) await supabase.storage.from(BUCKET).remove([path]);
    }
    setCfg({ ...cfg, [field]: null } as Cfg);
  };


  const toggleSource = (id: string) => {
    if (!cfg) return;
    const has = cfg.auto_sources.includes(id);
    setCfg({ ...cfg, auto_sources: has ? cfg.auto_sources.filter(s => s !== id) : [...cfg.auto_sources, id] });
  };

  if (loading || !cfg) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Willkommen-Wizard</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              E-Mail mit Video-Landing-Page für neue Leads. Kandidat wählt: <em>Ablehnen</em> oder <em>Nächste Schritte</em> (Insights-Test).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/willkommen?preview=1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Vorschau
            </a>
            <Label htmlFor="enabled" className="text-sm">Aktiv</Label>
            <Switch id="enabled" checked={cfg.enabled} onCheckedChange={v => setCfg({ ...cfg, enabled: v })} />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Willkommen-Video (Landing-Page)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <AssetField
            label="Willkommen-Video (MP4, max. 100 MB empfohlen)"
            currentUrl={cfg.video_url}
            uploading={uploading.video}
            onUpload={f => uploadFile(f, 'video')}
            onRemove={() => removeAsset('video')}
            accept="video/mp4,video/webm,video/quicktime"
            icon={<Video className="h-4 w-4" />}
          />
          <AssetField
            label="Vorschaubild (JPG/PNG)"
            currentUrl={cfg.thumbnail_url}
            uploading={uploading.thumbnail}
            onUpload={f => uploadFile(f, 'thumbnail')}
            onRemove={() => removeAsset('thumbnail')}
            accept="image/jpeg,image/png,image/webp"
            icon={<ImageIcon className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Video auf der Terminvorschlag-Seite</CardTitle>
          <p className="text-xs text-muted-foreground">Wird im Insights-Schritt „Abschluss" neben den Terminfeldern angezeigt – der Kandidat kann es ansehen, während er seine Wunschtermine einträgt.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Titel über dem Video" value={cfg.appointments_video_title} onChange={v => setCfg({ ...cfg, appointments_video_title: v })} />
          <FieldMulti label="Begleittext" value={cfg.appointments_video_intro} onChange={v => setCfg({ ...cfg, appointments_video_intro: v })} rows={2} />
          <AssetField
            label="Termin-Video (MP4)"
            currentUrl={cfg.video_url_appointments}
            uploading={uploading.video_appointments}
            onUpload={f => uploadFile(f, 'video_appointments')}
            onRemove={() => removeAsset('video_appointments')}
            accept="video/mp4,video/webm,video/quicktime"
            icon={<Video className="h-4 w-4" />}
          />
          <AssetField
            label="Vorschaubild Termin-Video (JPG/PNG)"
            currentUrl={cfg.thumbnail_url_appointments}
            uploading={uploading.thumbnail_appointments}
            onUpload={f => uploadFile(f, 'thumbnail_appointments')}
            onRemove={() => removeAsset('thumbnail_appointments')}
            accept="image/jpeg,image/png,image/webp"
            icon={<ImageIcon className="h-4 w-4" />}
          />
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle className="text-base">Landing-Page Texte</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Titel" value={cfg.page_title} onChange={v => setCfg({ ...cfg, page_title: v })} />
          <FieldMulti label="Begrüssungstext" value={cfg.page_intro} onChange={v => setCfg({ ...cfg, page_intro: v })} rows={4} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={'Button „Nächste Schritte"'} value={cfg.button_proceed_label} onChange={v => setCfg({ ...cfg, button_proceed_label: v })} />
            <Field label={'Button „Ablehnen"'} value={cfg.button_reject_label} onChange={v => setCfg({ ...cfg, button_reject_label: v })} />
          </div>
          <FieldMulti label={'Bestätigung nach „Nächste Schritte"'} value={cfg.proceed_confirmation_text} onChange={v => setCfg({ ...cfg, proceed_confirmation_text: v })} rows={2} />
          <FieldMulti label={'Bestätigung nach „Ablehnen"'} value={cfg.reject_confirmation_text} onChange={v => setCfg({ ...cfg, reject_confirmation_text: v })} rows={2} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">E-Mail</CardTitle>
          <p className="text-xs text-muted-foreground">Platzhalter: <code>{'{{name}}'}</code>, <code>{'{{cta_url}}'}</code>, <code>{'{{video_thumbnail}}'}</code></p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Betreff" value={cfg.email_subject} onChange={v => setCfg({ ...cfg, email_subject: v })} />
          <FieldMulti label="HTML-Body" value={cfg.email_html} onChange={v => setCfg({ ...cfg, email_html: v })} rows={10} mono />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Automatischer Versand pro Quelle</CardTitle>
          <p className="text-xs text-muted-foreground">Nur ausgewählte Quellen erhalten beim Anlegen automatisch eine Willkommen-E-Mail. Andere Leads können manuell per Button im Lead-Detail versendet werden.</p>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Quellen konfiguriert.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {sources.map(s => {
                const active = cfg.auto_sources.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSource(s.id)}
                    className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background hover:bg-muted'}`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-0 bg-background/80 backdrop-blur py-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Speichern'}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function FieldMulti({ label, value, onChange, rows = 3, mono }: { label: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className={mono ? 'font-mono text-xs' : undefined} />
    </div>
  );
}

function AssetField({ label, currentUrl, uploading, onUpload, onRemove, accept, icon }: {
  label: string;
  currentUrl: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  accept: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm flex items-center gap-2">{icon} {label}</Label>
      {currentUrl ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground flex-1 truncate">{currentUrl}</span>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Noch nichts hochgeladen.</p>
      )}
      <label className="inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm cursor-pointer hover:bg-muted">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        <span>{currentUrl ? 'Ersetzen' : 'Hochladen'}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
