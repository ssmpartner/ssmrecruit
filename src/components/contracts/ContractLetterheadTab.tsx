import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Trash2, Star, StarOff } from 'lucide-react';
import { toast } from 'sonner';
import { CONTRACT_LANGUAGES } from '@/lib/contract-placeholders';

type Letterhead = {
  id: string;
  name: string;
  storage_path: string;
  is_active: boolean;
  language: string | null;
  is_default_for_language: boolean;
  created_at: string;
};

export default function ContractLetterheadTab() {
  const [items, setItems] = useState<Letterhead[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('SSM CI');
  const [language, setLanguage] = useState<string>('de');
  const [isDefault, setIsDefault] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('contract_letterhead')
      .select('*')
      .order('created_at', { ascending: false });
    const list = (data as Letterhead[]) ?? [];
    setItems(list);
    const map: Record<string, string> = {};
    await Promise.all(
      list.map(async (l) => {
        const { data: s } = await supabase.storage.from('contracts').createSignedUrl(l.storage_path, 3600);
        if (s?.signedUrl) map[l.id] = s.signedUrl;
      }),
    );
    setPreviews(map);
  }
  useEffect(() => { load(); }, []);

  async function upload() {
    if (!file) { toast.error('Bitte PDF wählen'); return; }
    if (file.type !== 'application/pdf') { toast.error('Nur PDF erlaubt'); return; }
    setUploading(true);
    const user = (await supabase.auth.getUser()).data.user;
    const path = `letterhead/${crypto.randomUUID()}.pdf`;
    const { error: upErr } = await supabase.storage.from('contracts').upload(path, file, { contentType: 'application/pdf' });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    if (isDefault) {
      await supabase.from('contract_letterhead')
        .update({ is_default_for_language: false } as any)
        .eq('language', language);
    }
    const { error } = await supabase.from('contract_letterhead').insert({
      name, storage_path: path, mime_type: 'application/pdf',
      is_active: true, uploaded_by: user?.id,
      language, is_default_for_language: isDefault,
    } as any);
    if (error) toast.error(error.message); else toast.success('Briefpapier hochgeladen');
    setFile(null); setUploading(false); load();
  }

  async function setDefault(item: Letterhead) {
    await supabase.from('contract_letterhead')
      .update({ is_default_for_language: false } as any)
      .eq('language', item.language ?? 'de');
    await supabase.from('contract_letterhead')
      .update({ is_default_for_language: true } as any)
      .eq('id', item.id);
    toast.success('Als Standard gesetzt');
    load();
  }

  async function remove(item: Letterhead) {
    if (!confirm('Briefpapier wirklich entfernen? Bereits generierte PDFs bleiben unverändert.')) return;
    await supabase.storage.from('contracts').remove([item.storage_path]);
    await supabase.from('contract_letterhead').delete().eq('id', item.id);
    toast.success('Entfernt');
    load();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4" />Briefpapier hochladen</h3>
        <p className="text-xs text-muted-foreground">
          Wird beim Export als Hintergrund verwendet (PDF-Modus). Bestehende PDFs bleiben unverändert.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Bezeichnung</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Sprache</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTRACT_LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>PDF auswählen</Label>
          <Input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isDefault} onCheckedChange={setIsDefault} id="lh-default" />
          <Label htmlFor="lh-default" className="text-sm">Als Standard für diese Sprache verwenden</Label>
        </div>
        <Button onClick={upload} disabled={!file || uploading}>{uploading ? 'Lädt…' : 'Hochladen'}</Button>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Vorhandene Briefpapiere</h3>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Noch kein Briefpapier hinterlegt.</p>}
        {items.map(item => (
          <div key={item.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{item.name}</span>
                <Badge variant="outline">{(item.language ?? 'de').toUpperCase()}</Badge>
                {item.is_default_for_language && <Badge variant="default" className="gap-1"><Star className="h-3 w-3" />Standard</Badge>}
                <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('de-CH')}</span>
              </div>
              <div className="flex gap-1">
                {!item.is_default_for_language && (
                  <Button size="sm" variant="outline" onClick={() => setDefault(item)} className="gap-1.5">
                    <StarOff className="h-3.5 w-3.5" />Als Standard setzen
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => remove(item)} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />Entfernen
                </Button>
              </div>
            </div>
            {previews[item.id] && (
              <iframe src={previews[item.id]} className="w-full h-[300px] border rounded mt-2" title={item.name} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
