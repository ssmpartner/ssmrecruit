import { useState } from 'react';
import { Mail, Users, LinkIcon, Unlink, ChevronDown, RefreshCw } from 'lucide-react';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Employees() {
  const { employees, agencies, leads, updateEmployee, refreshData } = useLeads() as any;
  const { isSuperadmin } = useAuth();
  const [changingId, setChangingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-employees-from-sso');
      if (error || data?.error) {
        toast.error(data?.error || error?.message || 'Synchronisation fehlgeschlagen');
      } else {
        toast.success(`Sync erfolgreich: ${data.created} neu, ${data.updated} aktualisiert${data.failed ? `, ${data.failed} Fehler` : ''}`);
        if (typeof refreshData === 'function') await refreshData();
        else window.location.reload();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Synchronisation fehlgeschlagen');
    }
    setSyncing(false);
  };

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
