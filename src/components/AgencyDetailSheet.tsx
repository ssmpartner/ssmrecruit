import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Mail, MapPin, Languages, Globe, Users, UserCheck, Save, Palette } from 'lucide-react';
import { SWISS_CANTONS, AGENCY_LANGUAGES, AGENCY_REGIONS, AGENCY_COLORS, type Agency } from '@/lib/mock-data';
import { useLeads } from '@/context/useLeads';
import { toast } from 'sonner';

interface AgencyDetailSheetProps {
  agency: Agency | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AgencyDetailSheet({ agency, open, onOpenChange }: AgencyDetailSheetProps) {
  const { updateAgency, employees, leads } = useLeads();
  const [form, setForm] = useState({
    name: '',
    contactEmail: '',
    region: '',
    language: 'de',
    allowedCantons: [] as string[],
    color: '#6B7280',
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (agency) {
      setForm({
        name: agency.name,
        contactEmail: agency.contactEmail,
        region: agency.region || '',
        language: agency.language || 'de',
        allowedCantons: [...(agency.allowedCantons || [])],
        color: agency.color || '#6B7280',
      });
      setDirty(false);
    }
  }, [agency]);

  if (!agency) return null;

  const agencyEmployees = employees.filter(e => e.agencyId === agency.id);
  const agencyLeads = leads.filter(l => l.agencyId === agency.id);
  const hired = agencyLeads.filter(l => l.status === 'hired').length;

  const update = (key: string, value: any) => {
    setForm(p => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const toggleCanton = (code: string) => {
    setForm(p => ({
      ...p,
      allowedCantons: p.allowedCantons.includes(code)
        ? p.allowedCantons.filter(c => c !== code)
        : [...p.allowedCantons, code],
    }));
    setDirty(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.contactEmail.trim()) {
      toast.error('Name und E-Mail sind erforderlich');
      return;
    }
    updateAgency(agency.id, {
      name: form.name,
      contactEmail: form.contactEmail,
      region: form.region,
      language: form.language,
      allowedCantons: form.allowedCantons,
      color: form.color,
    });
    setDirty(false);
    toast.success('Agentur erfolgreich aktualisiert');
  };

  const langLabel = (code: string) => AGENCY_LANGUAGES.find(l => l.code === code)?.name ?? code;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">{agency.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{agency.contactEmail}</p>
            </div>
          </div>
        </SheetHeader>

        {/* Stats overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border bg-card p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{agencyLeads.length}</p>
            <p className="text-xs text-muted-foreground">Leads</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <UserCheck className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{agencyEmployees.length}</p>
            <p className="text-xs text-muted-foreground">Mitarbeiter</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <UserCheck className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold text-green-600">{hired}</p>
            <p className="text-xs text-muted-foreground">Eingestellt</p>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Edit form */}
        <div className="space-y-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Allgemeine Informationen</h3>

          <div className="space-y-2">
            <Label htmlFor="agency-name" className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Agenturname
            </Label>
            <Input
              id="agency-name"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Agenturname"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency-email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Kontakt-E-Mail
            </Label>
            <Input
              id="agency-email"
              type="email"
              value={form.contactEmail}
              onChange={e => update('contactEmail', e.target.value)}
              placeholder="kontakt@agentur.ch"
            />
          </div>

          <Separator />

          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Regionale Einstellungen</h3>

          <div className="space-y-2">
            <Label htmlFor="agency-region" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Region
            </Label>
            <select
              id="agency-region"
              value={form.region}
              onChange={e => update('region', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">— Keine —</option>
              {AGENCY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency-language" className="flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" /> Sprache
            </Label>
            <select
              id="agency-language"
              value={form.language}
              onChange={e => update('language', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {AGENCY_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Erlaubte Kantone für Lead-Lieferung
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto rounded-lg border p-3">
              {SWISS_CANTONS.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggleCanton(c.code)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
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
              <p className="text-xs text-muted-foreground">
                {form.allowedCantons.length} Kanton(e) ausgewählt: {form.allowedCantons.join(', ')}
              </p>
            )}
          </div>

          <Separator />

          {/* Employees list */}
          {agencyEmployees.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Mitarbeiter</h3>
              <div className="space-y-2">
                {agencyEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {emp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{emp.role}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={!dirty}
            className="w-full gap-2"
            size="lg"
          >
            <Save className="h-4 w-4" /> Änderungen speichern
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
