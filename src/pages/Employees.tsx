import { useState } from 'react';
import { Mail, Users, LinkIcon, Unlink, ChevronDown, RefreshCw, CheckCircle2, AlertCircle, Plus, Pencil, X } from 'lucide-react';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type SyncItem = { email: string; user_id: string; employee_id: string; role: string; agency_id: string };
type SyncError = { email: string; message: string };
type SyncResult = {
  total: number;
  created: number;
  updated: number;
  failed: number;
  created_items: SyncItem[];
  updated_items: SyncItem[];
  errors: SyncError[];
};

export default function Employees() {
  const { employees, agencies, leads, updateEmployee, refreshData } = useLeads() as any;
  const { isSuperadmin } = useAuth();
  const [changingId, setChangingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const handleAgencyChange = async (empId: string, newAgencyId: string) => {
    setChangingId(empId);
    try {
      updateEmployee(empId, { agencyId: newAgencyId });
      toast.success('Agentur zugewiesen');
    } catch {
      toast.error('Fehler beim Zuweisen');
    }
    setChangingId(null);
  };

  const handleToggleLeads = async (empId: string, checked: boolean) => {
    setTogglingId(empId);
    try {
      updateEmployee(empId, { canReceiveLeads: checked });
      toast.success(checked ? 'Lead-Zuweisung aktiviert' : 'Lead-Zuweisung pausiert');
    } catch {
      toast.error('Fehler beim Aktualisieren');
    }
    setTogglingId(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-employees-from-sso');
      if (error || data?.error) {
        toast.error(data?.error || error?.message || 'Synchronisation fehlgeschlagen');
      } else {
        setSyncResult(data as SyncResult);
        toast.success(`Sync: ${data.created} neu, ${data.updated} aktualisiert${data.failed ? `, ${data.failed} Fehler` : ''}`);
        // Sync-Ergebnis kurz anzeigen, dann Daten frisch aus DB laden
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Synchronisation fehlgeschlagen');
    }
    setSyncing(false);
  };

  const agencyName = (id: string) => agencies.find((a: any) => a.id === id)?.name || id;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mitarbeiter</h1>
          <p className="text-muted-foreground">Übersicht aller Teammitglieder — Verwaltung erfolgt zentral über das SSM Portal</p>
        </div>
        {isSuperadmin && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisiere…' : 'Aus SSM Portal synchronisieren'}
          </button>
        )}
      </div>

      {syncResult && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Sync-Ergebnis</h2>
              <span className="text-sm text-muted-foreground">· {syncResult.total} Benutzer geprüft</span>
            </div>
            <button onClick={() => setSyncResult(null)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Schließen">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-secondary/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Plus className="h-4 w-4 text-primary" /> Neu angelegt</div>
              <div className="mt-1 text-2xl font-bold">{syncResult.created}</div>
            </div>
            <div className="rounded-lg border bg-secondary/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Pencil className="h-4 w-4 text-primary" /> Aktualisiert</div>
              <div className="mt-1 text-2xl font-bold">{syncResult.updated}</div>
            </div>
            <div className="rounded-lg border bg-secondary/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium"><AlertCircle className="h-4 w-4 text-destructive" /> Fehler</div>
              <div className="mt-1 text-2xl font-bold">{syncResult.failed}</div>
            </div>
          </div>

          {(syncResult.created_items?.length > 0 || syncResult.updated_items?.length > 0) && (
            <div className="border-t p-4 space-y-4">
              {syncResult.created_items?.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Neu angelegt ({syncResult.created_items.length})</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50"><tr>
                        <th className="px-3 py-2 text-left font-medium">Email</th>
                        <th className="px-3 py-2 text-left font-medium">Rolle</th>
                        <th className="px-3 py-2 text-left font-medium">Agentur</th>
                        <th className="px-3 py-2 text-left font-medium">Employee-ID</th>
                        <th className="px-3 py-2 text-left font-medium">User-ID</th>
                      </tr></thead>
                      <tbody>
                        {syncResult.created_items.map(it => (
                          <tr key={it.user_id} className="border-t">
                            <td className="px-3 py-2">{it.email}</td>
                            <td className="px-3 py-2">{it.role}</td>
                            <td className="px-3 py-2">{agencyName(it.agency_id)}</td>
                            <td className="px-3 py-2 font-mono text-[10px]">{it.employee_id}</td>
                            <td className="px-3 py-2 font-mono text-[10px]">{it.user_id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {syncResult.updated_items?.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Aktualisiert ({syncResult.updated_items.length})</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50"><tr>
                        <th className="px-3 py-2 text-left font-medium">Email</th>
                        <th className="px-3 py-2 text-left font-medium">Rolle</th>
                        <th className="px-3 py-2 text-left font-medium">Agentur</th>
                        <th className="px-3 py-2 text-left font-medium">Employee-ID</th>
                        <th className="px-3 py-2 text-left font-medium">User-ID</th>
                      </tr></thead>
                      <tbody>
                        {syncResult.updated_items.map(it => (
                          <tr key={it.user_id} className="border-t">
                            <td className="px-3 py-2">{it.email}</td>
                            <td className="px-3 py-2">{it.role}</td>
                            <td className="px-3 py-2">{agencyName(it.agency_id)}</td>
                            <td className="px-3 py-2 font-mono text-[10px]">{it.employee_id}</td>
                            <td className="px-3 py-2 font-mono text-[10px]">{it.user_id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {syncResult.errors?.length > 0 && (
            <div className="border-t p-4">
              <h3 className="mb-2 text-sm font-semibold flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> Fehler ({syncResult.errors.length})
              </h3>
              <ul className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
                {syncResult.errors.map((err, i) => (
                  <li key={i}><span className="font-medium">{err.email}:</span> {err.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {employees.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">Noch keine Mitarbeiter vorhanden. Mitarbeiter werden automatisch beim ersten Login über das SSM Portal angelegt.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map(emp => {
            const agency = agencies.find(a => a.id === emp.agencyId);
            const empLeads = leads.filter(l => l.employeeId === emp.id);
            const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const isLinked = !!(emp as any).userId;

            return (
              <div key={emp.id} className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-semibold">{emp.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {emp.email}
                      </p>
                    </div>
                  </div>
                  <span title={isLinked ? 'Mit Benutzerkonto verknüpft' : 'Noch nicht verknüpft – Login via SSM Portal erforderlich'}>
                    {isLinked
                      ? <LinkIcon className="h-4 w-4 text-primary" />
                      : <Unlink className="h-4 w-4 text-muted-foreground" />
                    }
                  </span>
                </div>

                {/* Agency assignment */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Agentur</label>
                  <div className="relative">
                    <select
                      value={emp.agencyId}
                      onChange={e => handleAgencyChange(emp.id, e.target.value)}
                      disabled={changingId === emp.id}
                      className="h-9 w-full appearance-none rounded-lg border bg-background pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      {agencies.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div className="rounded-lg bg-secondary p-3">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {empLeads.length} zugewiesene Leads
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {empLeads.filter(l => l.status === 'hired').length} eingestellt
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
