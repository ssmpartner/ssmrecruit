import { Building2, Users, TrendingUp } from 'lucide-react';
import { agencies, employees, leads } from '@/lib/mock-data';

export default function Agencies() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agencies</h1>
        <p className="text-muted-foreground">Manage your recruiting agencies</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agencies.map(agency => {
          const agencyEmployees = employees.filter(e => e.agencyId === agency.id);
          const agencyLeads = leads.filter(l => l.agencyId === agency.id);
          const hired = agencyLeads.filter(l => l.status === 'hired').length;

          return (
            <div key={agency.id} className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-accent p-2.5">
                  <Building2 className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">{agency.name}</h3>
                  <p className="text-xs text-muted-foreground">{agency.contactEmail}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="text-lg font-bold">{agencyLeads.length}</p>
                  <p className="text-xs text-muted-foreground">Leads</p>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="text-lg font-bold">{agencyEmployees.length}</p>
                  <p className="text-xs text-muted-foreground">Employees</p>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="text-lg font-bold">{hired}</p>
                  <p className="text-xs text-muted-foreground">Hired</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
