import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Save, Loader2, Eye, EyeOff, User, Mail, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSettings() {
  const { user, profile, updateProfile, updateEmail, updatePassword } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

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

  const handleSaveEmail = async () => {
    if (!newEmail.trim() || newEmail === user?.email) return;
    setSavingEmail(true);
    const { error } = await updateEmail(newEmail.trim());
    setSavingEmail(false);
    if (error) toast.error(error.message);
    else toast.success('Bestätigungs-E-Mail wurde an die neue Adresse gesendet');
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    if (newPassword !== confirmPw) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    setSavingPw(true);
    const { error } = await updatePassword(newPassword);
    setSavingPw(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Passwort erfolgreich geändert');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPw('');
    }
  };

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" /> Mein Profil
        </h2>
        <p className="text-sm text-muted-foreground">Persönliche Daten und Sicherheitseinstellungen</p>
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

      {/* Email */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" /> E-Mail-Adresse
        </h3>
        <div className="flex gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSaveEmail}
            disabled={savingEmail || newEmail === user?.email}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Ändern
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Eine Bestätigungs-E-Mail wird an die neue Adresse gesendet.</p>
      </div>

      {/* Password */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" /> Passwort ändern
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Neues Passwort</label>
            <div className="relative mt-1">
              <input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 w-full rounded-lg border bg-background px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Mindestens 8 Zeichen"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Passwort bestätigen</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Passwort wiederholen"
            />
            {confirmPw && newPassword !== confirmPw && (
              <p className="mt-1 text-xs text-destructive">Passwörter stimmen nicht überein</p>
            )}
          </div>
          <button
            onClick={handleSavePassword}
            disabled={savingPw || !newPassword || newPassword !== confirmPw}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Passwort ändern
          </button>
        </div>
      </div>
    </>
  );
}
