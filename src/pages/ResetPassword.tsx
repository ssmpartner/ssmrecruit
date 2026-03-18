import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Check URL hash for recovery type
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

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
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
          <h2 className="text-xl font-bold text-foreground">Passwort geändert!</h2>
          <p className="text-sm text-muted-foreground">Sie werden weitergeleitet...</p>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg text-center space-y-4">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">Ungültiger Link</h2>
          <p className="text-sm text-muted-foreground">
            Dieser Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.
          </p>
          <button onClick={() => navigate('/forgot-password')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            Neuen Link anfordern
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Neues Passwort
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Wählen Sie ein neues Passwort</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-8 shadow-lg space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground">Neues Passwort</label>
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {loading ? 'Wird gespeichert...' : 'Passwort ändern'}
          </button>
        </form>
      </div>
    </div>
  );
}
