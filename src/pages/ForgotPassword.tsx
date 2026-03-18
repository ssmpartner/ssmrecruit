import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
          <h2 className="text-xl font-bold text-foreground">E-Mail gesendet!</h2>
          <p className="text-sm text-muted-foreground">
            Falls ein Konto mit <strong>{email}</strong> existiert, erhalten Sie eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Zurück zum Login
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
            Passwort vergessen
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Geben Sie Ihre E-Mail ein, um Ihr Passwort zurückzusetzen</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-8 shadow-lg space-y-5">
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

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {loading ? 'Wird gesendet...' : 'Link senden'}
          </button>

          <p className="text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Zurück zum Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
