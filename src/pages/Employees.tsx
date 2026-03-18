import { UserCog, Mail } from 'lucide-react';
import { employees, agencies, leads } from '@/lib/mock-data';
import LeadStatusBadge from '@/components/LeadStatusBadge';

const roleBadge: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  agency_manager: 'bg-warning text-warning-foreground',
  employee: 'bg-secondary text-secondary-foreground',
};

export default function Employees() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <p className="text-muted-foreground">Manage your team members</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map(emp => {
          const agency = agencies.find(a => a.id === emp.agencyId);
          const empLeads = leads.filter(l => l.employeeId === emp.id);
          const initials = emp.name.split(' ').map(n => n[0]).join('');

          return (
            <div key={emp.id} className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
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
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${roleBadge[emp.role]}`}>
                  {emp.role.replace('_', ' ')}
                </span>
                <span className="text-xs text-muted-foreground">• {agency?.name}</span>
              </div>
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-sm font-medium">{empLeads.length} assigned leads</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {empLeads.filter(l => l.status === 'hired').length} hired
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
