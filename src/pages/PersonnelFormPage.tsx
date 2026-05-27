import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle, UserSquare2 } from 'lucide-react';
import PersonnelFormFields, { PersonnelData, validatePersonnel } from '@/components/PersonnelFormFields';

type State = 'loading' | 'invalid' | 'expired' | 'completed' | 'ready' | 'submitting' | 'success';

interface LookupResult {
  id: string;
  lead_id: string;
  status: string;
  expires_at: string | null;
  lead_name: string | null;
}

export default function PersonnelFormPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>('loading');
  const [info, setInfo] = useState<LookupResult | null>(null);
  const [data, setData] = useState<PersonnelData>({ kinder: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    (async () => {
      const { data: res, error } = await supabase.functions.invoke('lookup-public-form', {
        body: { kind: 'personnel_request', token },
      });
      if (error || !res || res.error) { setState('invalid'); return; }
      const lookup = res as LookupResult;
      setInfo(lookup);
      if (lookup.status === 'completed') { setState('completed'); return; }
      if (lookup.expires_at && new Date(lookup.expires_at).getTime() < Date.now()) { setState('expired'); return; }
      // Prefill from current personal data
      const { data: cur } = await supabase.from('lead_personal_data').select('data').eq('lead_id', lookup.lead_id).maybeSingle();
      if (cur?.data) setData(cur.data as PersonnelData);
      setState('ready');
    })();
  }, [token]);

  const submit = async () => {
    if (!info) return;
    const errs = validatePersonnel(data);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setErrorMsg(`Bitte alle Pflichtfelder ausfüllen (${Object.keys(errs).length} fehlend).`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrorMsg('');
    setState('submitting');
    const nowIso = new Date().toISOString();

    // Fetch current version to bump
    const { data: cur } = await supabase
      .from('lead_personal_data')
      .select('version')
      .eq('lead_id', info.lead_id)
      .maybeSingle();
    const nextVersion = ((cur?.version as number | undefined) ?? 0) + 1;
    const updatedBy = (info.lead_name ? `${info.lead_name} (Kandidat)` : 'Kandidat');

    const { error: upErr } = await supabase.from('lead_personal_data').upsert({
      lead_id: info.lead_id,
      data: data as unknown as Record<string, unknown>,
      version: nextVersion,
      updated_at: nowIso,
      updated_by: updatedBy,
      updated_via: 'public',
    });
    if (upErr) { setErrorMsg(upErr.message); setState('ready'); return; }

    await supabase.from('lead_personal_data_versions').insert({
      lead_id: info.lead_id,
      version: nextVersion,
      data: data as unknown as Record<string, unknown>,
      updated_at: nowIso,
      updated_by: updatedBy,
      updated_via: 'public',
    });

    await supabase.from('personnel_requests').update({
      status: 'completed',
      completed_at: nowIso,
    }).eq('id', info.id);

    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: info.lead_id, type: 'edit',
      description: `Personalien vom Kandidaten eingereicht (Version ${nextVersion})`,
      user: updatedBy,
    });

    setState('success');
  };

  if (state === 'loading') {
    return <Centered><Loader2 className="h-6 w-6 animate-spin text-primary" /></Centered>;
  }
  if (state === 'invalid') {
    return <Message icon={<AlertCircle className="h-10 w-10 text-destructive" />} title="Ungültiger Link" body="Dieser Link ist nicht gültig oder wurde widerrufen." />;
  }
  if (state === 'expired') {
    return <Message icon={<AlertCircle className="h-10 w-10 text-amber-500" />} title="Link abgelaufen" body="Dieser Link war 14 Tage gültig und ist nun abgelaufen. Bitte fordern Sie einen neuen Link an." />;
  }
  if (state === 'completed') {
    return <Message icon={<CheckCircle2 className="h-10 w-10 text-emerald-600" />} title="Bereits eingereicht" body="Vielen Dank – wir haben Ihre Personalien bereits erhalten." />;
  }
  if (state === 'success') {
    return <Message icon={<CheckCircle2 className="h-10 w-10 text-emerald-600" />} title="Vielen Dank!" body="Ihre Personalien wurden erfolgreich übermittelt." />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b p-5">
            <div className="rounded-lg bg-primary/10 p-2"><UserSquare2 className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="text-lg font-semibold">Personalblatt</h1>
              <p className="text-xs text-muted-foreground">
                {info?.lead_name ? `Guten Tag ${info.lead_name}, ` : ''}
                bitte füllen Sie alle Pflichtfelder aus. Gültig bis {info?.expires_at ? new Date(info.expires_at).toLocaleDateString('de-CH') : '—'}.
              </p>
            </div>
          </div>
          {errorMsg && (
            <div className="mx-5 mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}
          <div className="p-5">
            <PersonnelFormFields data={data} onChange={setData} errors={errors} disabled={state === 'submitting'} />
          </div>
          <div className="flex items-center justify-end gap-3 border-t p-4">
            <button
              type="button"
              onClick={submit}
              disabled={state === 'submitting'}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {state === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Personalien einreichen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-muted/30">{children}</div>;
}
function Message({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="flex justify-center mb-4">{icon}</div>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
