import { useState } from 'react';
import { Building2, Plus, Globe, MapPin, Languages, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';
import { useLeads } from '@/context/useLeads';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SWISS_CANTONS, AGENCY_LANGUAGES, AGENCY_REGIONS, type Agency } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export default function Agencies() {
  const { agencies, employees, leads, addAgency } = useLeads();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Agency>>({});
  const [form, setForm] = useState({
    name: '',
    contactEmail: '',
    region: 'Deutschschweiz',
    language: 'de',
    allowedCantons: [] as string[],
  });

  const handleAdd = () => {
    if (!form.name.trim() || !form.contactEmail.trim()) return;
    addAgency(form);
    setForm({ name: '', contactEmail: '', region: 'Deutschschweiz', language: 'de', allowedCantons: [] });
    setOpen(false);
  };

  const toggleCanton = (cantons: string[], code: string) => {
    return cantons.includes(code) ? cantons.filter(c => c !== code) : [...cantons, code];
  };

  const startEdit = (agency: Agency) => {
    setEditingId(agency.id);
    setEditForm({ region: agency.region, language: agency.language, allowedCantons: [...agency.allowedCantons] });
  };

  const saveEdit = async (agencyId: string) => {
    await supabase.from('agencies').update({
      region: editForm.region,
      language: editForm.language,
      allowed_cantons: editForm.allowedCantons,
    }).eq('id', agencyId);
    // Update local state by reloading — simple approach
    window.location.reload();
  };

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
          const isExpanded = expandedId === agency.id;
          const isEditing = editingId === agency.id;

          return (
            <div key={agency.id} className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-accent p-2.5">
                    <Building2 className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{agency.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{agency.contactEmail}</p>
                  </div>
                </div>

                {/* Quick info badges */}
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

              {/* Expandable details */}
              <div className="border-t">
                <button
                  onClick={() => { setExpandedId(isExpanded ? null : agency.id); setEditingId(null); }}
                  className="flex w-full items-center justify-between px-6 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  Einstellungen
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-5 space-y-3">
                    {!isEditing ? (
                      <>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Region</span>
                            <span className="font-medium">{agency.region || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sprache</span>
                            <span className="font-medium">{langLabel(agency.language) || '—'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">Erlaubte Kantone</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {agency.allowedCantons.length > 0 ? agency.allowedCantons.map(c => (
                                <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                              )) : <span className="text-xs text-muted-foreground">Keine Einschränkung</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => startEdit(agency)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1"
                        >
                          <Pencil className="h-3 w-3" /> Bearbeiten
                        </button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Region</label>
                          <select
                            value={editForm.region || ''}
                            onChange={e => setEditForm(p => ({ ...p, region: e.target.value }))}
                            className="mt-1 h-9 w-full rounded-lg border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">— Keine —</option>
                            {AGENCY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Sprache</label>
                          <select
                            value={editForm.language || 'de'}
                            onChange={e => setEditForm(p => ({ ...p, language: e.target.value }))}
                            className="mt-1 h-9 w-full rounded-lg border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                          >
                            {AGENCY_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Erlaubte Kantone</label>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {SWISS_CANTONS.map(c => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => setEditForm(p => ({ ...p, allowedCantons: toggleCanton(p.allowedCantons || [], c.code) }))}
                                className={`rounded-md border px-1.5 py-0.5 text-xs font-medium transition-colors ${
                                  (editForm.allowedCantons || []).includes(c.code)
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-secondary text-secondary-foreground border-border hover:bg-accent'
                                }`}
                              >
                                {c.code}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(agency.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                          >
                            <Check className="h-3 w-3" /> Speichern
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            <X className="h-3 w-3" /> Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
