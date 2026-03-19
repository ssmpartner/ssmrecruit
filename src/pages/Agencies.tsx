import { useState } from 'react';
import { Building2, Plus, Globe, MapPin, Languages } from 'lucide-react';
import { useLeads } from '@/context/useLeads';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SWISS_CANTONS, AGENCY_LANGUAGES, AGENCY_REGIONS, AGENCY_COLORS, type Agency } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import AgencyDetailSheet from '@/components/AgencyDetailSheet';

export default function Agencies() {
  const { agencies, employees, leads, addAgency } = useLeads();
  const [open, setOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [form, setForm] = useState({
    name: '',
    contactEmail: '',
    region: 'Deutschschweiz',
    language: 'de',
    allowedCantons: [] as string[],
    color: AGENCY_COLORS[0],
  });

  const handleAdd = () => {
    if (!form.name.trim() || !form.contactEmail.trim()) return;
    addAgency(form);
    setForm({ name: '', contactEmail: '', region: 'Deutschschweiz', language: 'de', allowedCantons: [], color: AGENCY_COLORS[0] });
    setOpen(false);
  };

  const toggleCanton = (cantons: string[], code: string) =>
    cantons.includes(code) ? cantons.filter(c => c !== code) : [...cantons, code];

  const langLabel = (code: string) => AGENCY_LANGUAGES.find(l => l.code === code)?.name ?? code;

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
          <DialogContent className="max-w-lg">
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
              <div>
                <label className="text-sm font-medium">Region</label>
                <select
                  value={form.region}
                  onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {AGENCY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Sprache</label>
                <select
                  value={form.language}
                  onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {AGENCY_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Erlaubte Kantone für Lead-Lieferung</label>
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {SWISS_CANTONS.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, allowedCantons: toggleCanton(p.allowedCantons, c.code) }))}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                        form.allowedCantons.includes(c.code)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-secondary-foreground border-border hover:bg-accent'
                      }`}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
                {form.allowedCantons.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{form.allowedCantons.length} Kanton(e) ausgewählt</p>
                )}
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
            <div
              key={agency.id}
              onClick={() => setSelectedAgency(agency)}
              className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg p-2.5" style={{ backgroundColor: agency.color + '20' }}>
                    <Building2 className="h-5 w-5" style={{ color: agency.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{agency.name}</h3>
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: agency.color }} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{agency.contactEmail}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {agency.region && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <MapPin className="h-3 w-3" /> {agency.region}
                    </Badge>
                  )}
                  {agency.language && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Languages className="h-3 w-3" /> {langLabel(agency.language)}
                    </Badge>
                  )}
                  {agency.allowedCantons.length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Globe className="h-3 w-3" /> {agency.allowedCantons.length} Kantone
                    </Badge>
                  )}
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
            </div>
          );
        })}
      </div>

      <AgencyDetailSheet
        agency={selectedAgency}
        open={!!selectedAgency}
        onOpenChange={open => { if (!open) setSelectedAgency(null); }}
      />
    </div>
  );
}
