import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Signup() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = passwordStrength(password);
  const strengthLabel = ['Sehr schwach', 'Schwach', 'Mittel', 'Stark', 'Sehr stark'][strength];
  const strengthColor = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPw) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    if (password.length < 8) {
      toast.error('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    if (!name.trim()) {
      toast.error('Bitte geben Sie Ihren Namen ein');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
          <h2 className="text-xl font-bold text-foreground">Registrierung erfolgreich!</h2>
          <p className="text-sm text-muted-foreground">
            Wir haben Ihnen eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet.
            Bitte bestätigen Sie Ihre E-Mail-Adresse, um sich anzumelden.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            Zum Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            RecruitFlow
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Erstellen Sie Ihr Konto</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-8 shadow-lg space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="Max Mustermann"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">E-Mail</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="name@firma.ch"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Passwort</label>
            <div className="relative mt-1">
              <input
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
                placeholder="Mindestens 8 Zeichen"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < strength ? strengthColor : 'bg-muted'}`} />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{strengthLabel}</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Passwort bestätigen</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="Passwort wiederholen"
            />
            {confirmPw && password !== confirmPw && (
              <p className="mt-1 text-xs text-destructive">Passwörter stimmen nicht überein</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {loading ? 'Wird erstellt...' : 'Konto erstellen'}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Bereits ein Konto?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Anmelden
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
