import { useState } from 'react';
import { Mail, Plus } from 'lucide-react';
import { useLeads } from '@/context/LeadsContext';
import { type Employee } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const roleBadge: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  agency_manager: 'bg-warning text-warning-foreground',
  employee: 'bg-secondary text-secondary-foreground',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  agency_manager: 'Agency Manager',
  employee: 'Employee',
};

export default function Employees() {
  const { employees, agencies, leads, addEmployee } = useLeads();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'employee' as Employee['role'], agencyId: '' });

  const handleAdd = () => {
    if (!form.name.trim() || !form.email.trim() || !form.agencyId) return;
    addEmployee(form);
    setForm({ name: '', email: '', role: 'employee', agencyId: '' });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Add Employee
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. John Smith"
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. john@company.com"
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value as Employee['role'] }))}
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="employee">Employee</option>
                  <option value="agency_manager">Agency Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Agency</label>
                <select
                  value={form.agencyId}
                  onChange={e => setForm(p => ({ ...p, agencyId: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select agency...</option>
                  {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <button
                onClick={handleAdd}
                disabled={!form.name.trim() || !form.email.trim() || !form.agencyId}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Create Employee
              </button>
            </div>
          </DialogContent>
        </Dialog>
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
                  {roleLabels[emp.role]}
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
