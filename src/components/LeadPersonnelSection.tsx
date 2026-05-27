import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  ChevronDown, ChevronRight, Save, UserSquare2, Loader2, Link2, Copy, Check, Clock, History, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PersonnelFormFields, { PersonnelData, validatePersonnel } from './PersonnelFormFields';

interface Props {
  leadId: string;
}

interface VersionRow {
  id: string;
  version: number;
  updated_at: string;
  updated_by: string;
  updated_via: string;
}

interface PersonnelRequestRow {
  id: string;
  token: string;
  status: string;
  sent_at: string;
  expires_at: string;
  completed_at: string | null;
}

export default function LeadPersonnelSection({ leadId }: Props) {
  const { toast } = useToast();
  const { profile, role } = useAuth();
  const canViewData = role === 'superadmin' || role === 'admin' || role === 'hr';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PersonnelData>({ kinder: [] });
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<{ version: number; updated_at: string | null; updated_by: string | null; updated_via: string | null }>({ version: 0, updated_at: null, updated_by: null, updated_via: null });
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [requests, setRequests] = useState<PersonnelRequestRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState('');
  const isComplete = meta.version > 0 && Object.keys(validatePersonnel(data)).length === 0;

  const load = useCallback(async () => {
    setLoading(true);
    const [curRes, verRes, reqRes] = await Promise.all([
      supabase.from('lead_personal_data').select('data, version, updated_at, updated_by, updated_via').eq('lead_id', leadId).maybeSingle(),
      supabase.from('lead_personal_data_versions').select('id, version, updated_at, updated_by, updated_via').eq('lead_id', leadId).order('version', { ascending: false }).limit(20),
      supabase.from('personnel_requests').select('id, token, status, sent_at, expires_at, completed_at').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(10),
    ]);
    const row = curRes.data as { data?: PersonnelData; version?: number; updated_at?: string; updated_by?: string; updated_via?: string } | null;
    setData((row?.data as PersonnelData) ?? { kinder: [] });
    setMeta({
      version: row?.version ?? 0,
      updated_at: row?.updated_at ?? null,
      updated_by: row?.updated_by ?? null,
      updated_via: row?.updated_via ?? null,
    });
    setVersions((verRes.data ?? []) as VersionRow[]);
    setRequests((reqRes.data ?? []) as PersonnelRequestRow[]);
    setDirty(false);
    setErrors({});
    setLoading(false);
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (next: PersonnelData) => {
    setData(next);
    setDirty(true);
  };

  const save = async () => {
    const errs = validatePersonnel(data);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({ title: 'Bitte alle Pflichtfelder ausfüllen', description: `${Object.keys(errs).length} fehlende Angabe(n).`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const nextVersion = (meta.version ?? 0) + 1;
    const updatedBy = profile?.display_name ?? 'System';
    const nowIso = new Date().toISOString();

    const { error } = await supabase.from('lead_personal_data').upsert([{
      lead_id: leadId,
      data: data as unknown as never,
      version: nextVersion,
      updated_at: nowIso,
      updated_by: updatedBy,
      updated_via: 'internal',
    }]);
    if (error) {
      setSaving(false);
      toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' });
      return;
    }

    await supabase.from('lead_personal_data_versions').insert([{
      lead_id: leadId,
      version: nextVersion,
      data: data as unknown as never,
      updated_at: nowIso,
      updated_by: updatedBy,
      updated_via: 'internal',
    }]);

    await supabase.from('activities').insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      type: 'edit',
      description: `Personalien aktualisiert (Version ${nextVersion})`,
      user: updatedBy,
    });

    setSaving(false);
    setDirty(false);
    toast({ title: `Gespeichert (Version ${nextVersion})` });
    load();
  };

  const generateLink = async () => {
    setGeneratingLink(true);
    const { data: req, error } = await supabase
      .from('personnel_requests')
      .insert({ lead_id: leadId, sent_via: 'manual' })
      .select()
      .single();
    if (error || !req) {
      toast({ title: 'Link konnte nicht erstellt werden', description: error?.message, variant: 'destructive' });
      setGeneratingLink(false);
      return;
    }
    const url = `${window.location.origin}/personalien?token=${(req as { token: string }).token}`;
    await navigator.clipboard.writeText(url);
    await supabase.from('activities').insert({
      id: crypto.randomUUID(), lead_id: leadId, type: 'note',
      description: 'Personalien-Link erstellt (14 Tage gültig)',
      user: profile?.display_name ?? 'System',
    });
    toast({ title: '✅ Link erstellt & kopiert', description: 'Gültig für 14 Tage.' });
    setGeneratingLink(false);
    load();
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/personalien?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
    toast({ title: 'Link kopiert' });
  };

  const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-3">
      {/* Infobox + Link generation (always visible, outside accordion) */}
      <div className="rounded-lg border bg-primary/5 p-3 space-y-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-foreground/80 leading-relaxed">
            Damit der Kandidat seine Personalien korrekt einreicht, sollte er das Formular selbst ausfüllen.
            Erstelle dazu einen Link und sende ihn dem Kandidaten zu. Der Link ist <strong>14 Tage</strong> gültig.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={generateLink}
            disabled={generatingLink}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {generatingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Link für Kandidat generieren
          </button>
          {versions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(s => !s)}
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-muted"
            >
              <History className="h-3.5 w-3.5" />
              Verlauf ({versions.length})
            </button>
          )}
        </div>

        {requests.length > 0 && (
          <div className="rounded-md border bg-background p-2 space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground">Erstellte Links</div>
            {requests.map(r => {
              const expired = new Date(r.expires_at).getTime() < Date.now();
              const isCompleted = r.status === 'completed';
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{fmtDate(r.sent_at)}</span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      isCompleted ? 'bg-emerald-100 text-emerald-700' : expired ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700',
                    )}>
                      {isCompleted ? 'Eingereicht' : expired ? 'Abgelaufen' : `Gültig bis ${fmtDate(r.expires_at)}`}
                    </span>
                  </div>
                  {!isCompleted && !expired && (
                    <button onClick={() => copyLink(r.token)} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 hover:bg-muted">
                      {copiedToken === r.token ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      Kopieren
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showHistory && versions.length > 0 && (
          <div className="rounded-md border bg-background p-2 space-y-1 text-xs">
            <div className="font-semibold text-muted-foreground mb-1">Versionsverlauf</div>
            {versions.map(v => (
              <div key={v.id} className="flex items-center justify-between border-b last:border-0 py-1">
                <span className="font-medium">v{v.version}</span>
                <span className="text-muted-foreground">{fmtDate(v.updated_at)}</span>
                <span>{v.updated_by}</span>
                <span className="text-[10px] text-muted-foreground">{v.updated_via === 'public' ? 'Kandidat' : 'Intern'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form (collapsible) */}
      <div className="rounded-lg border bg-muted/20">
        <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between p-3 hover:bg-muted/40 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <UserSquare2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Personalien (Personalblatt)</span>
            {meta.version > 0 && (
              <span className="text-xs text-muted-foreground">– v{meta.version} · {fmtDate(meta.updated_at)} · {meta.updated_by} {meta.updated_via === 'public' && '(Kandidat)'}</span>
            )}
          </div>
          {dirty && <span className="text-xs text-amber-600 font-medium">Ungespeicherte Änderungen</span>}
        </button>

        {open && (
          <div className="p-4 space-y-5 border-t">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Laden…</div>
            ) : (
              <>
                <PersonnelFormFields data={data} onChange={handleChange} errors={errors} />

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {Object.keys(errors).length > 0 && <span className="text-destructive">{Object.keys(errors).length} Pflichtfelder fehlen</span>}
                  </div>
                  <button onClick={save} disabled={!dirty || saving}
                    className={cn("inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity",
                      (!dirty || saving) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90")}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Speichern
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
