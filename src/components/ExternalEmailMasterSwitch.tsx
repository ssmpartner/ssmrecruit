import { useEffect, useState } from 'react';
import { Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface EmailDelivery {
  external_emails_enabled?: boolean;
}

export default function ExternalEmailMasterSwitch() {
  const { isSuperadmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'email_delivery')
        .maybeSingle();
      const v = (data?.value as EmailDelivery | null) ?? {};
      setEnabled(v.external_emails_enabled === true);
      setLoading(false);
    })();
  }, []);

  const toggle = async (next: boolean) => {
    if (!isSuperadmin) return;
    setSaving(true);
    const prev = enabled;
    setEnabled(next);
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        [{ key: 'email_delivery', value: { external_emails_enabled: next } as unknown as never, updated_at: new Date().toISOString() }],
        { onConflict: 'key' },
      );
    setSaving(false);
    if (error) {
      setEnabled(prev);
      toast.error('Konnte Einstellung nicht speichern');
    } else {
      toast.success(next ? 'Externe E-Mails aktiviert' : 'Externe E-Mails deaktiviert');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-4 border border-border rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin" /> Lade…
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-5 ${enabled ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${enabled ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/10 text-primary'}`}>
          {enabled ? <AlertTriangle className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Externe E-Mails an Leads / Kandidaten</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Solange deaktiviert, blockiert das System alle E-Mails an externe Empfänger (Leads, Kandidaten, Bewerber, Dokumenten-Links etc.).
                Interne Benachrichtigungen an Mitarbeiter laufen davon unberührt weiter.
              </p>
              {enabled && (
                <p className="text-xs text-amber-700 mt-2 font-medium">
                  ⚠ Aktiv – das System darf jetzt E-Mails an externe Empfänger versenden.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              <Switch checked={enabled} onCheckedChange={toggle} disabled={!isSuperadmin || saving} />
            </div>
          </div>
          {!isSuperadmin && (
            <p className="text-xs text-muted-foreground mt-3">Nur Superadmins können diese Einstellung ändern.</p>
          )}
        </div>
      </div>
    </div>
  );
}
