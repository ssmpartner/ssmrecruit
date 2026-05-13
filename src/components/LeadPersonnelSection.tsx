import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { ChevronDown, ChevronRight, Save, UserSquare2, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  leadId: string;
}

interface ChildEntry {
  vorname: string;
  geburtsdatum: string;
  inAusbildung: boolean;
}

interface PersonnelData {
  // Personalien (additional)
  ahvNr?: string;
  nationalitaet?: string;
  sprache?: string;
  heimatortCH?: string;
  heimatortAusland?: string;
  auslaenderausweis?: string;
  // Zivilstand
  zivilstand?: 'ledig' | 'verheiratet' | 'geschieden' | 'eingetragene_partnerschaft' | '';
  zivilstandDatum?: string;
  // Konfession
  konfession?: 'roemisch_katholisch' | 'christkatholisch' | 'evangelisch_reformiert' | 'keine_andere' | '';
  // Lohnüberweisung
  bankName?: string;
  bic?: string;
  iban?: string;
  bankPlzOrt?: string;
  // Versicherungen
  krankenkasse?: string;
  pensionskasse?: string;
  // Anstellung
  arbeitsbeginn?: string;
  anstellungsdauer?: 'befristet' | 'unbefristet' | '';
  arbeitsortAgentur?: string;
  karrierestufe?: string;
  // Ausbildung
  hoechsteAusbildung?: string;
  // Andere Arbeitgeber
  andereAgName?: string;
  andereAgAdresse?: string;
  andereAgStellenantritt?: string;
  andereAgPensum?: string;
  // Erwerbstätigkeit
  bezugLohnTaggeld?: 'ja' | 'nein' | '';
  bezugLohnRente?: 'ja' | 'nein' | '';
  selbststaendig?: 'ja' | 'nein' | '';
  salaerMin?: 'ja' | 'nein' | '';
  // Ehepartner
  epName?: string;
  epVorname?: string;
  epGeburtsdatum?: string;
  epVerheiratetSeit?: string;
  epErwerbstaetig?: 'ja' | 'nein' | '';
  epRente?: 'ja' | 'nein' | '';
  epArbeitgeber?: string;
  epPensum?: string;
  epKinderzulagen?: 'ja' | 'nein' | '';
  anzahlKinder?: string;
  // Kinder
  kinder?: ChildEntry[];
}

const inputCls = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const labelCls = "text-sm text-muted-foreground";

export default function LeadPersonnelSection({ leadId }: Props) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PersonnelData>({ kinder: [] });
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: row } = await supabase.from('lead_personal_data').select('data').eq('lead_id', leadId).maybeSingle();
    setData((row?.data as PersonnelData) ?? { kinder: [] });
    setDirty(false);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof PersonnelData>(key: K, value: PersonnelData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateChild = (idx: number, patch: Partial<ChildEntry>) => {
    const next = [...(data.kinder ?? [])];
    next[idx] = { ...next[idx], ...patch };
    setData(prev => ({ ...prev, kinder: next }));
    setDirty(true);
  };
  const addChild = () => {
    setData(prev => ({ ...prev, kinder: [...(prev.kinder ?? []), { vorname: '', geburtsdatum: '', inAusbildung: false }] }));
    setDirty(true);
  };
  const removeChild = (idx: number) => {
    setData(prev => ({ ...prev, kinder: (prev.kinder ?? []).filter((_, i) => i !== idx) }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('lead_personal_data').upsert({
      lead_id: leadId,
      data: data as any,
      updated_at: new Date().toISOString(),
      updated_by: profile?.display_name ?? 'System',
    });
    setSaving(false);
    if (error) { toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('activities').insert({
      id: crypto.randomUUID(),
      lead_id: leadId,
      type: 'edit',
      description: 'Personalien (Personalblatt) aktualisiert',
      user: profile?.display_name ?? 'System',
    });
    setDirty(false);
    toast({ title: 'Personalien gespeichert' });
  };

  return (
    <div className="rounded-lg border bg-muted/20">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between p-3 hover:bg-muted/40 transition-colors rounded-t-lg">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <UserSquare2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Personalien (Personalblatt)</span>
          <span className="text-xs text-muted-foreground">– ergänzende Angaben</span>
        </div>
        {dirty && <span className="text-xs text-amber-600 font-medium">Ungespeicherte Änderungen</span>}
      </button>

      {open && (
        <div className="p-4 space-y-5 border-t">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Laden…</div>
          ) : (
            <>
              {/* Personalien */}
              <Section title="Personalien">
                <Grid>
                  <Field label="AHV-Nr. (756.xxxx.xxxx.xx)"><input className={inputCls} value={data.ahvNr ?? ''} onChange={e => set('ahvNr', e.target.value)} placeholder="756." /></Field>
                  <Field label="Nationalität"><input className={inputCls} value={data.nationalitaet ?? ''} onChange={e => set('nationalitaet', e.target.value)} /></Field>
                  <Field label="Sprache"><input className={inputCls} value={data.sprache ?? ''} onChange={e => set('sprache', e.target.value)} /></Field>
                  <Field label="Heimatort (CH)"><input className={inputCls} value={data.heimatortCH ?? ''} onChange={e => set('heimatortCH', e.target.value)} /></Field>
                  <Field label="Heimatort (Ausland)"><input className={inputCls} value={data.heimatortAusland ?? ''} onChange={e => set('heimatortAusland', e.target.value)} /></Field>
                  <Field label="Kategorie Ausländerausweis"><input className={inputCls} value={data.auslaenderausweis ?? ''} onChange={e => set('auslaenderausweis', e.target.value)} placeholder="z.B. B, C, L…" /></Field>
                </Grid>
              </Section>

              {/* Zivilstand */}
              <Section title="Zivilstand">
                <Grid>
                  <Field label="Status">
                    <select className={inputCls} value={data.zivilstand ?? ''} onChange={e => set('zivilstand', e.target.value as PersonnelData['zivilstand'])}>
                      <option value="">—</option>
                      <option value="ledig">ledig</option>
                      <option value="verheiratet">verheiratet</option>
                      <option value="geschieden">geschieden</option>
                      <option value="eingetragene_partnerschaft">eingetragene Partnerschaft</option>
                    </select>
                  </Field>
                  <Field label="Verheiratet / geschieden seit"><input type="date" className={inputCls} value={data.zivilstandDatum ?? ''} onChange={e => set('zivilstandDatum', e.target.value)} /></Field>
                </Grid>
              </Section>

              {/* Konfession */}
              <Section title="Konfession">
                <Field label="">
                  <select className={inputCls} value={data.konfession ?? ''} onChange={e => set('konfession', e.target.value as PersonnelData['konfession'])}>
                    <option value="">—</option>
                    <option value="roemisch_katholisch">Römisch-katholisch</option>
                    <option value="christkatholisch">Christkatholisch</option>
                    <option value="evangelisch_reformiert">Evangelisch-reformiert</option>
                    <option value="keine_andere">Keine / andere</option>
                  </select>
                </Field>
              </Section>

              {/* Lohnüberweisung */}
              <Section title="Angaben zur Lohnüberweisung">
                <Grid>
                  <Field label="Bankname"><input className={inputCls} value={data.bankName ?? ''} onChange={e => set('bankName', e.target.value)} /></Field>
                  <Field label="BIC"><input className={inputCls} value={data.bic ?? ''} onChange={e => set('bic', e.target.value)} /></Field>
                  <Field label="IBAN"><input className={inputCls} value={data.iban ?? ''} onChange={e => set('iban', e.target.value)} placeholder="CH…" /></Field>
                  <Field label="PLZ / Ort der Bank"><input className={inputCls} value={data.bankPlzOrt ?? ''} onChange={e => set('bankPlzOrt', e.target.value)} /></Field>
                </Grid>
              </Section>

              {/* Versicherungen */}
              <Section title="Versicherungen">
                <Grid>
                  <Field label="Krankenkasse"><input className={inputCls} value={data.krankenkasse ?? ''} onChange={e => set('krankenkasse', e.target.value)} /></Field>
                  <Field label="Bisherige Pensionskasse"><input className={inputCls} value={data.pensionskasse ?? ''} onChange={e => set('pensionskasse', e.target.value)} /></Field>
                </Grid>
              </Section>

              {/* Anstellung */}
              <Section title="Anstellung">
                <Grid>
                  <Field label="Arbeitsbeginn (Eintrittsdatum)"><input type="date" className={inputCls} value={data.arbeitsbeginn ?? ''} onChange={e => set('arbeitsbeginn', e.target.value)} /></Field>
                  <Field label="Anstellungsdauer">
                    <select className={inputCls} value={data.anstellungsdauer ?? ''} onChange={e => set('anstellungsdauer', e.target.value as PersonnelData['anstellungsdauer'])}>
                      <option value="">—</option>
                      <option value="befristet">Befristet</option>
                      <option value="unbefristet">Unbefristet</option>
                    </select>
                  </Field>
                  <Field label="Arbeitsort (Agentur)"><input className={inputCls} value={data.arbeitsortAgentur ?? ''} onChange={e => set('arbeitsortAgentur', e.target.value)} /></Field>
                  <Field label="Karrierestufe">
                    <select className={inputCls} value={data.karrierestufe ?? ''} onChange={e => set('karrierestufe', e.target.value)}>
                      <option value="">—</option>
                      {['Trainee','Finanzcoach VBV','Vermögensberater','Teamleiter','Finanzcoach','Eintritt SSM','Dipl. Finanzberater IAF','Verkaufsleiter','Finanzcoach SSM','Agenturleiter','Innendienst'].map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                </Grid>
              </Section>

              {/* Ausbildung */}
              <Section title="Höchste Ausbildung">
                <Field label="">
                  <select className={inputCls} value={data.hoechsteAusbildung ?? ''} onChange={e => set('hoechsteAusbildung', e.target.value)}>
                    <option value="">—</option>
                    {['Obligatorische Schule','Matura / Abitur','Höhere Fachschule','Lehrpatent','Uni / HS Bachelor','Uni / HS Master','Abgeschlossene Berufsausbildung','Interne Berufsausbildung (nicht BiGA)'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </Section>

              {/* Andere Arbeitgeber */}
              <Section title="Andere Arbeitgeber (falls zutreffend)">
                <Grid>
                  <Field label="Name Arbeitgeber"><input className={inputCls} value={data.andereAgName ?? ''} onChange={e => set('andereAgName', e.target.value)} /></Field>
                  <Field label="Stellenantritt"><input type="date" className={inputCls} value={data.andereAgStellenantritt ?? ''} onChange={e => set('andereAgStellenantritt', e.target.value)} /></Field>
                  <Field label="Adresse"><input className={inputCls} value={data.andereAgAdresse ?? ''} onChange={e => set('andereAgAdresse', e.target.value)} /></Field>
                  <Field label="Pensum %"><input className={inputCls} value={data.andereAgPensum ?? ''} onChange={e => set('andereAgPensum', e.target.value)} placeholder="z.B. 80" /></Field>
                </Grid>
              </Section>

              {/* Erwerbstätigkeit */}
              <Section title="Bei Erwerbstätigkeit">
                <Grid>
                  <YesNo label="Bezug von Lohn oder Ersatzeinkommen (Taggeld)?" value={data.bezugLohnTaggeld} onChange={v => set('bezugLohnTaggeld', v)} />
                  <YesNo label="Bezug von Lohn oder Ersatzeinkommen + Rente?" value={data.bezugLohnRente} onChange={v => set('bezugLohnRente', v)} />
                  <YesNo label="Selbstständig erwerbend?" value={data.selbststaendig} onChange={v => set('selbststaendig', v)} />
                  <YesNo label="Salär mind. CHF 7'110.– / Jahr?" value={data.salaerMin} onChange={v => set('salaerMin', v)} />
                </Grid>
              </Section>

              {/* Ehepartner */}
              <Section title="Angaben zum Ehepartner">
                <Grid>
                  <Field label="Name Ehepartner"><input className={inputCls} value={data.epName ?? ''} onChange={e => set('epName', e.target.value)} /></Field>
                  <Field label="Vorname Ehepartner"><input className={inputCls} value={data.epVorname ?? ''} onChange={e => set('epVorname', e.target.value)} /></Field>
                  <Field label="Geburtsdatum"><input type="date" className={inputCls} value={data.epGeburtsdatum ?? ''} onChange={e => set('epGeburtsdatum', e.target.value)} /></Field>
                  <Field label="Verheiratet seit"><input type="date" className={inputCls} value={data.epVerheiratetSeit ?? ''} onChange={e => set('epVerheiratetSeit', e.target.value)} /></Field>
                  <YesNo label="Erwerbstätig?" value={data.epErwerbstaetig} onChange={v => set('epErwerbstaetig', v)} />
                  <YesNo label="Bezieht eine Rente?" value={data.epRente} onChange={v => set('epRente', v)} />
                  <Field label="Arbeitgeber Ehepartner (Name / Adresse)"><input className={inputCls} value={data.epArbeitgeber ?? ''} onChange={e => set('epArbeitgeber', e.target.value)} /></Field>
                  <Field label="Pensum %"><input className={inputCls} value={data.epPensum ?? ''} onChange={e => set('epPensum', e.target.value)} /></Field>
                  <YesNo label="Kinderzulagen durch Ehepartner?" value={data.epKinderzulagen} onChange={v => set('epKinderzulagen', v)} />
                  <Field label="Anzahl Kinder"><input className={inputCls} type="number" min={0} value={data.anzahlKinder ?? ''} onChange={e => set('anzahlKinder', e.target.value)} /></Field>
                </Grid>
              </Section>

              {/* Kinder */}
              <Section title="Kinder">
                <div className="space-y-2">
                  {(data.kinder ?? []).map((k, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                      <Field label={`Vorname ${idx + 1}`}><input className={inputCls} value={k.vorname} onChange={e => updateChild(idx, { vorname: e.target.value })} /></Field>
                      <Field label="Geburtsdatum"><input type="date" className={inputCls} value={k.geburtsdatum} onChange={e => updateChild(idx, { geburtsdatum: e.target.value })} /></Field>
                      <label className="flex items-center gap-2 h-10 px-2 text-sm">
                        <input type="checkbox" checked={k.inAusbildung} onChange={e => updateChild(idx, { inAusbildung: e.target.checked })} />
                        In Ausbildung
                      </label>
                      <button onClick={() => removeChild(idx)} className="h-10 px-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addChild} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Kind hinzufügen
                  </button>
                </div>
              </Section>

              <div className="flex justify-end pt-2 border-t">
                <button onClick={save} disabled={!dirty || saving}
                  className={cn("inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity",
                    (!dirty || saving) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90")}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Speichern
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h5>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      {children}
    </div>
  );
}
function YesNo({ label, value, onChange }: { label: string; value: 'ja' | 'nein' | '' | undefined; onChange: (v: 'ja' | 'nein' | '') => void }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select className={inputCls} value={value ?? ''} onChange={e => onChange(e.target.value as 'ja' | 'nein' | '')}>
        <option value="">—</option>
        <option value="ja">Ja</option>
        <option value="nein">Nein</option>
      </select>
    </div>
  );
}
