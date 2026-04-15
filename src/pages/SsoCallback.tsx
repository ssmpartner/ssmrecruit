import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SsoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const projectKey = searchParams.get('project_key') || 'ssm-recruit';

    if (!token) {
      setError('Kein SSO-Token vorhanden.');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('sso-validate', {
          body: { token, project_key: projectKey },
        });

        if (fnError || data?.error) {
          const msg = data?.error || fnError?.message || 'SSO-Validierung fehlgeschlagen';
          setError(msg);
          toast.error(msg);
          setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }

        if (data?.session) {
          // Set the session in the Supabase client
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) {
            setError('Session konnte nicht gesetzt werden.');
            toast.error('Session konnte nicht gesetzt werden.');
            setTimeout(() => navigate('/login', { replace: true }), 3000);
            return;
          }

          toast.success('Erfolgreich angemeldet via SSO');
          navigate('/', { replace: true });
        } else {
          setError('Keine Session-Daten erhalten.');
          setTimeout(() => navigate('/login', { replace: true }), 3000);
        }
      } catch (err: any) {
        setError(err.message || 'SSO-Fehler');
        toast.error('SSO-Authentifizierung fehlgeschlagen');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground">Sie werden zum Login weitergeleitet...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">SSO-Anmeldung wird verarbeitet...</p>
          </>
        )}
      </div>
    </div>
  );
}
