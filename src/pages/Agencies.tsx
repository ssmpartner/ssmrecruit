import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { useLeads } from '@/context/LeadsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Agencies() {
  const { agencies, employees, leads, addAgency } = useLeads();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contactEmail: '' });

  const handleAdd = () => {
    if (!form.name.trim() || !form.contactEmail.trim()) return;
    addAgency(form);
    setForm({ name: '', contactEmail: '' });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenturen</h1>
          <p className="text-muted-foreground">Ihre Recruiting-Agenturen verwalten</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Agentur hinzufügen
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Agentur erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium">Agenturname</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="z.B. TalentForce"
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kontakt-E-Mail</label>
                <input
                  value={form.contactEmail}
                  onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="z.B. kontakt@agentur.ch"
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={!form.name.trim() || !form.contactEmail.trim()}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Agentur erstellen
              </button>
            </div>
          </DialogContent>
        </Dialog>
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
                  <p className="text-xs text-muted-foreground">Mitarbeiter</p>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="text-lg font-bold">{hired}</p>
                  <p className="text-xs text-muted-foreground">Eingestellt</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
