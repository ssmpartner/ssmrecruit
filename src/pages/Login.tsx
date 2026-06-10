import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const SSM_PORTAL_LOGIN_URL = 'https://ssmpartner.ch/login';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const hostname = window.location.hostname;
  const isPreview =
    hostname.includes('lovableproject.com') ||
    hostname.includes('lovable.app') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  // In Produktion direkt zum zentralen SSM-Portal-Login weiterleiten —
  // keine Zwischenseite mehr anzeigen.
  useEffect(() => {
    if (!isPreview) {
      window.location.replace(SSM_PORTAL_LOGIN_URL);
    }
  }, [isPreview]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      const raw = (error.message || '').toLowerCase();
      const isInvalidCreds =
        raw.includes('ungültige zugangsdaten') ||
        raw.includes('invalid') ||
        raw.includes('credentials') ||
        raw.includes('passwort') ||
        raw.includes('password');
      const friendly = isInvalidCreds
        ? 'E-Mail oder Passwort ist nicht korrekt. Bitte überprüfe deine Eingaben.'
        : 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
      toast.error(friendly);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            SSM Recruit
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isPreview ? 'Entwickler-Login' : 'Bitte melden Sie sich über das zentrale SSM Portal an'}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-lg space-y-5">
          {isPreview ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium">E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@ssmpartner.ch"
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Anmelden'}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Preview-Modus — direkter Login aktiv
              </p>
            </form>
          ) : (
            <div className="text-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                Weiterleitung zum SSM Partner Portal…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
