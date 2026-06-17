import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Banner {
  id: string;
  message: string;
  variant: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

const VARIANTS = [
  { id: 'info', label: 'Info (blau)' },
  { id: 'warning', label: 'Warnung (gelb)' },
  { id: 'success', label: 'Erfolg (grün)' },
];

export default function NewsBannerTab() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState('');
  const [newVariant, setNewVariant] = useState('info');
  const [newExpires, setNewExpires] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('news_banners')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Fehler beim Laden: ' + error.message);
    setBanners(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newMsg.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from('news_banners').insert({
      message: newMsg.trim(),
      variant: newVariant,
      active: true,
      expires_at: newExpires ? new Date(newExpires).toISOString() : null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    setNewMsg(''); setNewExpires(''); setNewVariant('info');
    toast.success('News Banner erstellt');
    load();
  };

  const toggleActive = async (b: Banner) => {
    const { error } = await (supabase as any).from('news_banners')
      .update({ active: !b.active }).eq('id', b.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Banner wirklich löschen?')) return;
    const { error } = await (supabase as any).from('news_banners').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Banner gelöscht');
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> News Banner
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Erstelle Ankündigungen, die allen Mitarbeitern auf dem Dashboard angezeigt werden.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="font-semibold">Neuer Banner</h3>
        <textarea
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Nachricht an alle Mitarbeiter…"
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm bg-background"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Typ</label>
            <select
              value={newVariant}
              onChange={(e) => setNewVariant(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background mt-1"
            >
              {VARIANTS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Läuft ab am (optional)</label>
            <input
              type="datetime-local"
              value={newExpires}
              onChange={(e) => setNewExpires(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background mt-1"
            />
          </div>
        </div>
        <button
          onClick={create}
          disabled={!newMsg.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Banner veröffentlichen
        </button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 pb-4">
          <h3 className="font-semibold">Bestehende Banner</h3>
        </div>
        <div className="px-6 pb-6 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Lade…</p>
          ) : banners.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Banner erstellt.</p>
          ) : banners.map(b => (
            <div key={b.id} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold uppercase rounded px-1.5 py-0.5 bg-muted">{b.variant}</span>
                  {b.expires_at && (
                    <span className="text-[11px] text-muted-foreground">
                      bis {new Date(b.expires_at).toLocaleString('de-CH')}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{b.message}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Switch checked={b.active} onCheckedChange={() => toggleActive(b)} />
                  <span className="text-xs text-muted-foreground">{b.active ? 'Aktiv' : 'Inaktiv'}</span>
                </div>
                <button onClick={() => remove(b.id)} className="text-destructive hover:opacity-70" aria-label="Löschen">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
