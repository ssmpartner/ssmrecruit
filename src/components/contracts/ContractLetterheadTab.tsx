import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Letterhead = {
  id: string;
  name: string;
  storage_path: string;
  is_active: boolean;
  created_at: string;
};

export default function ContractLetterheadTab() {
  const [item, setItem] = useState<Letterhead | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('SSM CI');
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('contract_letterhead')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setItem((data as Letterhead) ?? null);
    if (data) {
      const { data: s } = await supabase.storage.from('contracts').createSignedUrl((data as any).storage_path, 3600);
      setSignedUrl(s?.signedUrl ?? null);
    } else {
      setSignedUrl(null);
    }
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
    // Alte deaktivieren
    await supabase.from('contract_letterhead').update({ is_active: false }).eq('is_active', true);
    const { error } = await supabase.from('contract_letterhead').insert({
      name, storage_path: path, mime_type: 'application/pdf', is_active: true, uploaded_by: user?.id,
    });
    if (error) toast.error(error.message); else toast.success('Briefpapier hochgeladen');
    setFile(null); setUploading(false); load();
  }

  async function remove() {
    if (!item) return;
    if (!confirm('Briefpapier wirklich entfernen? Bereits generierte PDFs bleiben unverändert.')) return;
    await supabase.storage.from('contracts').remove([item.storage_path]);
    await supabase.from('contract_letterhead').delete().eq('id', item.id);
    toast.success('Entfernt');
    load();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" />Aktuelles Briefpapier</h3>
        {item ? (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium">{item.name}</span> · hochgeladen {new Date(item.created_at).toLocaleString('de-CH')}
            </div>
            {signedUrl && (
              <iframe src={signedUrl} className="w-full h-[400px] border rounded" title="Briefpapier-Vorschau" />
            )}
            <Button variant="destructive" size="sm" onClick={remove} className="gap-2">
              <Trash2 className="h-3.5 w-3.5" />Entfernen
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Noch kein Briefpapier hinterlegt.</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4" />Neues Briefpapier hochladen</h3>
        <p className="text-xs text-muted-foreground">
          Wird beim Export neuer Verträge automatisch als Hintergrund verwendet. Bestehende PDFs bleiben unverändert.
        </p>
        <div>
          <Label>Bezeichnung</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <Label>PDF auswählen</Label>
          <Input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <Button onClick={upload} disabled={!file || uploading}>{uploading ? 'Lädt…' : 'Hochladen'}</Button>
      </div>
    </div>
  );
}
