import { useRef, useState } from 'react';
import { Camera, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'employee', label: 'Mitarbeiter' },
  { value: 'agency_manager', label: 'Agenturleitung' },
  { value: 'teamleiter', label: 'Teamleiter' },
  { value: 'backoffice', label: 'Backoffice' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'controlling', label: 'Controlling' },
  { value: 'geschaeftsleitung', label: 'Geschäftsleitung' },
  { value: 'hr', label: 'HR' },
  { value: 'admin', label: 'Administrator' },
  { value: 'superadmin', label: 'Superadmin' },
];

const ADMIN_ALLOWED = ['employee', 'agency_manager', 'controlling', 'geschaeftsleitung', 'hr'];

/** Bild clientseitig auf max. 256px verkleinern und als JPEG-DataURL zurückgeben */
async function resizeImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    image.src = dataUrl;
  });
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  const min = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function AddEmployeeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { agencies, refreshData } = useLeads() as any;
  const { isSuperadmin } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [agencyId, setAgencyId] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [canReceiveLeads, setCanReceiveLeads] = useState(true);
  const [saving, setSaving] = useState(false);

  const roleOptions = isSuperadmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter(r => ADMIN_ALLOWED.includes(r.value));

  const reset = () => {
    setName(''); setEmail(''); setPassword(''); setRole('employee');
    setAgencyId(''); setAvatar(null); setCanReceiveLeads(true);
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Bitte ein Bild auswählen'); return; }
    try {
      setAvatar(await resizeImage(file));
    } catch {
      toast.error('Bild konnte nicht verarbeitet werden');
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let out = '';
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    arr.forEach(n => { out += chars[n % chars.length]; });
    setPassword(out);
    toast.success('Passwort erzeugt – bitte kopieren und weitergeben');
  };

  const submit = async () => {
    if (!name.trim()) { toast.error('Name fehlt'); return; }
    if (!email.includes('@')) { toast.error('Gültige E-Mail-Adresse erforderlich'); return; }
    if (password.length < 8) { toast.error('Passwort muss mindestens 8 Zeichen lang sein'); return; }
    if (!agencyId) { toast.error('Bitte Agentur wählen'); return; }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create_employee',
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          agency_id: agencyId,
          avatar,
          can_receive_leads: canReceiveLeads,
        },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || 'Mitarbeiter konnte nicht angelegt werden');
      } else {
        toast.success(`${name} wurde angelegt und kann sich mit E-Mail und Passwort anmelden`);
        reset();
        onOpenChange(false);
        await refreshData?.();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Mitarbeiter konnte nicht angelegt werden');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Neuer Mitarbeiter</DialogTitle>
          <DialogDescription>Benutzerkonto mit E-Mail und Passwort anlegen, Rolle und Agentur zuweisen.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative h-16 w-16 overflow-hidden rounded-full border bg-secondary flex items-center justify-center text-muted-foreground hover:bg-muted"
            >
              {avatar
                ? <img src={avatar} alt="Profilfoto" className="h-full w-full object-cover" />
                : <Camera className="h-5 w-5" />}
            </button>
            <div className="text-sm">
              <p className="font-medium">Profilfoto</p>
              <p className="text-xs text-muted-foreground">Optional · quadratisch, wird automatisch verkleinert</p>
              {avatar && (
                <button type="button" onClick={() => setAvatar(null)} className="mt-1 text-xs text-destructive hover:underline">
                  Entfernen
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="emp-name">Name</Label>
              <Input id="emp-name" value={name} onChange={e => setName(e.target.value)} placeholder="Vor- und Nachname" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="emp-email">E-Mail</Label>
              <Input id="emp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@ssmpartner.ch" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="emp-pass">Passwort</Label>
              <div className="flex gap-2">
                <Input id="emp-pass" value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 8 Zeichen" />
                <button type="button" onClick={generatePassword} className="whitespace-nowrap rounded-lg border px-3 text-sm hover:bg-muted">
                  Erzeugen
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="emp-role">Rolle</Label>
              <select
                id="emp-role"
                value={role}
                onChange={e => setRole(e.target.value)}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="emp-agency">Agentur</Label>
              <select
                id="emp-agency"
                value={agencyId}
                onChange={e => setAgencyId(e.target.value)}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Bitte wählen…</option>
                {agencies.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="emp-leads" className="cursor-pointer text-sm">Leads erhalten</Label>
            <Switch id="emp-leads" checked={canReceiveLeads} onCheckedChange={setCanReceiveLeads} />
          </div>
        </div>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} disabled={saving} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Mitarbeiter anlegen
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
