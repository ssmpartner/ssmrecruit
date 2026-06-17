import { useEffect, useState, useCallback } from 'react';
import { Loader2, Activity, RefreshCw, Mail, Bell, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NOTIFICATION_TYPES } from '@/lib/notificationTypes';

interface LogRow {
  id: string;
  notification_type: string;
  channel: 'email' | 'in_app';
  recipient_email: string | null;
  recipient_name: string | null;
  recipient_user_id: string | null;
  triggered_by_user_id: string | null;
  trigger_source: string;
  trigger_label: string | null;
  entity_type: string | null;
  entity_id: string | null;
  subject: string | null;
  status: 'sent' | 'failed' | 'skipped';
  error: string | null;
  created_at: string;
}

const typeLabel = (t: string) => NOTIFICATION_TYPES.find((n) => n.type === t)?.label ?? t;

const statusIcon = (s: LogRow['status']) => {
  if (s === 'sent') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
  if (s === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-600" />;
  return <MinusCircle className="w-3.5 h-3.5 text-muted-foreground" />;
};

export default function NotificationActivityLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('notification_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (filterType) query = query.eq('notification_type', filterType);
    if (filterStatus) query = query.eq('status', filterStatus);
    const { data } = await query;
    setRows((data as LogRow[] | null) ?? []);
    setLoading(false);
  }, [filterType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="p-5 border-b border-border flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Aktivitätslog (Superadmin)</h3>
          <p className="text-sm text-muted-foreground">
            Letzte 200 Benachrichtigungen: Wer wurde benachrichtigt, wer/was hat ausgelöst?
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Aktualisieren
        </button>
      </div>

      <div className="px-5 py-3 flex flex-wrap gap-3 items-center border-b border-border bg-muted/30">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm px-2 py-1.5 rounded-md border border-border bg-background"
        >
          <option value="">Alle Typen</option>
          {NOTIFICATION_TYPES.map((t) => (
            <option key={t.type} value={t.type}>{t.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm px-2 py-1.5 rounded-md border border-border bg-background"
        >
          <option value="">Alle Status</option>
          <option value="sent">Gesendet</option>
          <option value="failed">Fehlgeschlagen</option>
          <option value="skipped">Übersprungen</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Lade…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Noch keine Einträge.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Zeit</th>
                <th className="text-left px-4 py-2">Typ</th>
                <th className="text-left px-4 py-2">Kanal</th>
                <th className="text-left px-4 py-2">Empfänger</th>
                <th className="text-left px-4 py-2">Auslöser</th>
                <th className="text-left px-4 py-2">Bezug</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString('de-CH')}
                  </td>
                  <td className="px-4 py-2">{typeLabel(r.notification_type)}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 text-xs">
                      {r.channel === 'email' ? <Mail className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                      {r.channel === 'email' ? 'E-Mail' : 'Glocke'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.recipient_name ?? '–'}</div>
                    <div className="text-xs text-muted-foreground">{r.recipient_email ?? '–'}</div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-xs">{r.trigger_source}</div>
                    {r.trigger_label && (
                      <div className="text-xs text-muted-foreground">{r.trigger_label}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.entity_type ? `${r.entity_type}: ${r.entity_id}` : '–'}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5 text-xs capitalize">
                      {statusIcon(r.status)} {r.status}
                    </span>
                    {r.error && (
                      <div className="text-[10px] text-red-600 mt-0.5 max-w-[240px] truncate" title={r.error}>
                        {r.error}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
