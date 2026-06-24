import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Config {
  page_title: string;
  page_intro: string;
  button_proceed_label: string;
  button_reject_label: string;
  proceed_confirmation_text: string;
  reject_confirmation_text: string;
  video_url: string | null;
  thumbnail_url: string | null;
}

type View = 'loading' | 'ready' | 'error' | 'already' | 'reject_done' | 'submitting';

export default function WelcomeWizardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [view, setView] = useState<View>('loading');
  const [config, setConfig] = useState<Config | null>(null);
  const [leadName, setLeadName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setView('error'); setErrorMsg('Ungültiger Link.'); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke('welcome-public-lookup', { body: { token } });
      if (error || !data) { setView('error'); setErrorMsg('Link konnte nicht geladen werden.'); return; }
      if ((data as any).error) { setView('error'); setErrorMsg(mapErr((data as any).error)); return; }
      setConfig((data as any).config);
      setLeadName((data as any).lead_name);
      if ((data as any).used_at) setView('already');
      else setView('ready');
    })();
  }, [token]);

  const handleAction = async (action: 'reject' | 'proceed') => {
    if (!token) return;
    setView('submitting');
    const { data, error } = await supabase.functions.invoke('welcome-public-action', { body: { token, action } });
    if (error || !data || (data as any).error) {
      setView('error');
      setErrorMsg(mapErr((data as any)?.error ?? 'unknown'));
      return;
    }
    if (action === 'proceed') {
      const insightsToken = (data as any).insights_token;
      if (insightsToken) {
        navigate(`/insights-form?token=${insightsToken}`);
        return;
      }
      setView('error');
      setErrorMsg('Weiterleitung fehlgeschlagen.');
    } else {
      setView('reject_done');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          {view === 'loading' && (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Wird geladen …</p>
            </div>
          )}

          {view === 'error' && (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <h1 className="mt-4 font-display text-2xl font-semibold">Etwas ist schiefgelaufen</h1>
              <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
            </div>
          )}

          {view === 'already' && (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <h1 className="mt-4 font-display text-2xl font-semibold">Bereits beantwortet</h1>
              <p className="mt-2 text-sm text-muted-foreground">Dieser Link wurde bereits verwendet. Vielen Dank!</p>
            </div>
          )}

          {view === 'reject_done' && config && (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <XCircle className="h-10 w-10 text-muted-foreground" />
              <h1 className="mt-4 font-display text-2xl font-semibold">Danke für Ihre Rückmeldung</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">{config.reject_confirmation_text}</p>
            </div>
          )}

          {(view === 'ready' || view === 'submitting') && config && (
            <>
              {config.video_url ? (
                <div className="aspect-video w-full bg-black">
                  <video
                    src={config.video_url}
                    poster={config.thumbnail_url ?? undefined}
                    controls
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : config.thumbnail_url ? (
                <img src={config.thumbnail_url} alt="" className="w-full aspect-video object-cover" />
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5" />
              )}

              <div className="p-8 md:p-10 space-y-6">
                <div>
                  <h1 className="font-display text-3xl font-semibold tracking-tight">
                    {config.page_title}
                  </h1>
                  {leadName && (
                    <p className="mt-1 text-sm text-muted-foreground">Hallo {leadName}</p>
                  )}
                </div>

                <p className="text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {config.page_intro}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => handleAction('proceed')}
                    disabled={view === 'submitting'}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {view === 'submitting' ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <>
                        {config.button_proceed_label}
                        <ChevronRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={view === 'submitting'}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-6 py-4 text-base font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    {config.button_reject_label}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">SSM Partner · Willkommen</p>
      </div>
    </div>
  );
}

function mapErr(code: string) {
  switch (code) {
    case 'expired': return 'Dieser Link ist abgelaufen.';
    case 'already_used': return 'Dieser Link wurde bereits verwendet.';
    case 'not_found': return 'Link nicht gefunden.';
    case 'invalid_token': return 'Ungültiger Token.';
    default: return 'Es ist ein Fehler aufgetreten.';
  }
}
