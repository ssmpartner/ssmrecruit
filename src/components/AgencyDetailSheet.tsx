import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Building2, Mail, MapPin, Languages, Globe, Users, UserCheck, Save, Palette, Navigation, Loader2 } from 'lucide-react';
import { SWISS_CANTONS, AGENCY_LANGUAGES, AGENCY_REGIONS, AGENCY_COLORS, type Agency } from '@/lib/mock-data';
import { useLeads } from '@/context/useLeads';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
    address: '',
    plz: '',
    city: '',
    latitude: null as number | null,
    longitude: null as number | null,
    radiusKm: 30,
    monthlyLeadQuota: null as number | null,
  });
  const [dirty, setDirty] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (agency) {
      setForm({
        name: agency.name,
        contactEmail: agency.contactEmail,
        region: agency.region || '',
        language: agency.language || 'de',
        allowedCantons: [...(agency.allowedCantons || [])],
        color: agency.color || '#6B7280',
        address: agency.address || '',
        plz: agency.plz || '',
        city: agency.city || '',
        latitude: agency.latitude ?? null,
        longitude: agency.longitude ?? null,
        radiusKm: agency.radiusKm ?? 30,
        monthlyLeadQuota: agency.monthlyLeadQuota ?? null,
      });
      setDirty(false);
    }
  }, [agency]);

  const geocodeAddress = useCallback(async () => {
    const query = [form.address, form.plz, form.city].filter(Boolean).join(', ');
    if (!query.trim()) {
      toast.error('Bitte zuerst eine Adresse eingeben');
      return;
    }
    setGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { query, types: 'address,place' },
      });
      if (error) throw error;
      const first = data?.suggestions?.[0];
      if (first?.coordinates) {
        const [lng, lat] = first.coordinates;
        setForm(p => ({ ...p, latitude: lat, longitude: lng }));
        setDirty(true);
        toast.success(`Koordinaten ermittelt: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        return { lat, lng };
      } else {
        toast.error('Adresse konnte nicht georeferenziert werden');
        return null;
      }
    } catch {
      toast.error('Geocoding fehlgeschlagen');
      return null;
    } finally {
      setGeocoding(false);
    }
  }, [form.address, form.plz, form.city]);

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

  const handleSave = async () => {
    if (!form.name.trim() || !form.contactEmail.trim()) {
      toast.error('Name und E-Mail sind erforderlich');
      return;
    }

    // Auto-geocode if address present but no coordinates
    let lat = form.latitude;
    let lng = form.longitude;
    if (!lat && (form.address || form.plz || form.city)) {
      const result = await geocodeAddress();
      if (result) {
        lat = result.lat;
        lng = result.lng;
      }
    }

    updateAgency(agency.id, {
      name: form.name,
      contactEmail: form.contactEmail,
      region: form.region,
      language: form.language,
      allowedCantons: form.allowedCantons,
      color: form.color,
      address: form.address,
      plz: form.plz,
      city: form.city,
      latitude: lat,
      longitude: lng,
      radiusKm: form.radiusKm,
      monthlyLeadQuota: form.monthlyLeadQuota,
    });
    setDirty(false);
    toast.success('Agentur erfolgreich aktualisiert');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-3" style={{ backgroundColor: form.color + '20' }}>
              <Building2 className="h-6 w-6" style={{ color: form.color }} />
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
            <Input id="agency-name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Agenturname" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency-email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Kontakt-E-Mail
            </Label>
            <Input id="agency-email" type="email" value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)} placeholder="kontakt@agentur.ch" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Agenturfarbe
            </Label>
            <div className="flex flex-wrap gap-2">
              {AGENCY_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update('color', c)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    form.color === c ? 'border-foreground scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Address section */}
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Standort & Umkreis</h3>

          <div className="space-y-2">
            <Label htmlFor="agency-address" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Strasse / Nr.
            </Label>
            <Input id="agency-address" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Musterstrasse 1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="agency-plz">PLZ</Label>
              <Input id="agency-plz" value={form.plz} onChange={e => update('plz', e.target.value)} placeholder="8000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency-city">Ort</Label>
              <Input id="agency-city" value={form.city} onChange={e => update('city', e.target.value)} placeholder="Zürich" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={geocodeAddress}
              disabled={geocoding}
              className="gap-1.5"
            >
              {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
              Koordinaten ermitteln
            </Button>
            {form.latitude != null && form.longitude != null && (
              <span className="text-xs text-muted-foreground">
                📍 {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Umkreis für Lead-Zuweisung
              </span>
              <span className="text-sm font-bold text-primary">{form.radiusKm} km</span>
            </Label>
            <Slider
              value={[form.radiusKm]}
              onValueChange={([v]) => update('radiusKm', v)}
              min={5}
              max={100}
              step={5}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>5 km</span>
              <span>50 km</span>
              <span>100 km</span>
            </div>
          </div>

          {!form.latitude && (form.address || form.plz) && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
              ⚠️ Bitte Koordinaten ermitteln, damit die Umkreis-Verteilung funktioniert.
            </p>
          )}

          {/* Lead Quota */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Monatliches Lead-Kontingent
              </span>
              <span className="text-sm font-bold text-primary">
                {form.monthlyLeadQuota === null ? 'Unlimitiert' : `${form.monthlyLeadQuota} Leads`}
              </span>
            </Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.monthlyLeadQuota === null}
                  onChange={e => {
                    if (e.target.checked) {
                      update('monthlyLeadQuota', null);
                    } else {
                      update('monthlyLeadQuota', 50);
                    }
                  }}
                  className="rounded border-input"
                />
                Unlimitiert
              </label>
            </div>
            {form.monthlyLeadQuota !== null && (
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={9999}
                  value={form.monthlyLeadQuota}
                  onChange={e => update('monthlyLeadQuota', parseInt(e.target.value) || 1)}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">Leads / Monat</span>
              </div>
            )}
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
          <Button onClick={handleSave} disabled={!dirty} className="w-full gap-2" size="lg">
            <Save className="h-4 w-4" /> Änderungen speichern
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
