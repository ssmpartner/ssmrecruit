import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Save, Loader2, User, Shield, ExternalLink, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getMyMsConnection } from '@/lib/ms-calendar';

export default function ProfileSettings() {
  const { profile, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [savingName, setSavingName] = useState(false);
  const [msConn, setMsConn] = useState<Awaited<ReturnType<typeof getMyMsConnection>> | null>(null);
  const [msLoading, setMsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setMsConn(await getMyMsConnection()); } catch { /* noop */ }
      setMsLoading(false);
    })();
  }, []);


  const handleSaveName = async () => {
    if (!displayName.trim()) {
      toast.error('Name darf nicht leer sein');
      return;
    }
    setSavingName(true);
    const { error } = await updateProfile({ display_name: displayName.trim() });
    setSavingName(false);
    if (error) toast.error(error.message);
    else toast.success('Name aktualisiert');
  };

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" /> Mein Profil
        </h2>
        <p className="text-sm text-muted-foreground">Persönliche Daten</p>
      </div>

      {/* Display Name */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" /> Anzeigename
        </h3>
        <div className="flex gap-3">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Ihr Name"
          />
          <button
            onClick={handleSaveName}
            disabled={savingName || displayName === profile?.display_name}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Speichern
          </button>
        </div>
      </div>

      {/* Microsoft 365 Kalender */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" /> Microsoft 365 Kalender
        </h3>
        {msLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verbindung wird geprüft…
          </div>
        ) : msConn?.active ? (
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Verbunden</span>
              <span className="text-muted-foreground">· {msConn.email}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Verfügbarkeiten werden automatisch aus Ihrem Outlook-Kalender gelesen (nur Frei/Besetzt – keine Termininhalte).
            </p>
            {msConn.last_sync_at && (
              <p className="text-xs text-muted-foreground">
                Letzter Abgleich: {new Date(msConn.last_sync_at).toLocaleString('de-CH')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Nicht verbunden</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Melden Sie sich über das SSM Portal mit Microsoft an, um Ihren Outlook-Kalender automatisch zu verbinden.
            </p>
          </div>
        )}
      </div>

      {/* Central management hint */}
      <div className="rounded-xl border bg-muted/50 p-5 shadow-sm space-y-2">
        <p className="text-sm text-muted-foreground">
          E-Mail-Adresse und Passwort werden zentral über das SSM Portal verwaltet.
        </p>
        <a
          href="https://ssmpartner.ch/portal"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Zum SSM Portal
        </a>
      </div>
    </>
  );
}
