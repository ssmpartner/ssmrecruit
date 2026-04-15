import { Mail, Building2, Users, LinkIcon, Unlink } from 'lucide-react';
import { useLeads } from '@/context/useLeads';

export default function Employees() {
  const { employees, agencies, leads } = useLeads();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mitarbeiter</h1>
        <p className="text-muted-foreground">Übersicht aller Teammitglieder — Verwaltung erfolgt zentral über das SSM Portal</p>
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
                  <span title={isLinked ? 'Mit Benutzerkonto verknüpft' : 'Noch nicht verknüpft'}>
                    {isLinked
                      ? <LinkIcon className="h-4 w-4 text-primary" />
                      : <Unlink className="h-4 w-4 text-muted-foreground" />
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {agency?.name || '–'}
                  </span>
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
