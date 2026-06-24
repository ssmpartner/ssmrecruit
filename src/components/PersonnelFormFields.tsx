import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChildEntry {
  vorname: string;
  geburtsdatum: string;
  inAusbildung: boolean;
}

export interface PersonnelData {
  ahvNr?: string;
  nationalitaet?: string;
  sprache?: string;
  heimatortCH?: string;
  heimatortAusland?: string;
  adresse?: string;
  telefon?: string;
  auslaenderausweis?: string;
  zivilstand?: 'ledig' | 'verheiratet' | 'geschieden' | 'eingetragene_partnerschaft' | '';
  zivilstandDatum?: string;
  konfession?: 'roemisch_katholisch' | 'christkatholisch' | 'evangelisch_reformiert' | 'keine_andere' | '';
  bankName?: string;
  bic?: string;
  iban?: string;
  bankPlzOrt?: string;
  krankenkasse?: string;
  pensionskasse?: string;
  arbeitsbeginn?: string;
  anstellungsdauer?: 'befristet' | 'unbefristet' | '';
  arbeitsortAgentur?: string;
  karrierestufe?: string;
  hoechsteAusbildung?: string;
  andereAgName?: string;
  andereAgAdresse?: string;
  andereAgStellenantritt?: string;
  andereAgPensum?: string;
  bezugLohnTaggeld?: 'ja' | 'nein' | '';
  bezugLohnRente?: 'ja' | 'nein' | '';
  selbststaendig?: 'ja' | 'nein' | '';
  salaerMin?: 'ja' | 'nein' | '';
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
  kinder?: ChildEntry[];
}

const REQUIRED_BASE: (keyof PersonnelData)[] = [
  'ahvNr', 'nationalitaet', 'sprache', 'heimatortCH', 'heimatortAusland', 'adresse', 'telefon', 'auslaenderausweis',
  'zivilstand', 'konfession',
  'bankName', 'bic', 'iban', 'bankPlzOrt',
  'krankenkasse', 'pensionskasse',
  'arbeitsbeginn', 'anstellungsdauer', 'arbeitsortAgentur', 'karrierestufe',
  'hoechsteAusbildung',
  'bezugLohnTaggeld', 'bezugLohnRente', 'selbststaendig', 'salaerMin',
  'anzahlKinder',
];

const REQUIRED_EHEPARTNER: (keyof PersonnelData)[] = [
  'epName', 'epVorname', 'epGeburtsdatum', 'epVerheiratetSeit',
  'epErwerbstaetig', 'epRente', 'epPensum', 'epKinderzulagen',
];

export function validatePersonnel(data: PersonnelData): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of REQUIRED_BASE) {
    const v = (data as Record<string, unknown>)[key];
    if (v === undefined || v === null || String(v).trim() === '') errors[key] = 'Pflichtfeld';
  }
  // Conditional: married → ehepartner block
  if (data.zivilstand === 'verheiratet' || data.zivilstand === 'eingetragene_partnerschaft') {
    if (!data.zivilstandDatum) errors.zivilstandDatum = 'Pflichtfeld';
    for (const key of REQUIRED_EHEPARTNER) {
      const v = (data as Record<string, unknown>)[key];
      if (v === undefined || v === null || String(v).trim() === '') errors[key] = 'Pflichtfeld';
    }
  }
  // Kinder
  const n = parseInt(data.anzahlKinder ?? '0', 10) || 0;
  if (n > 0) {
    const kinder = data.kinder ?? [];
    if (kinder.length < n) errors.kinder = `Bitte ${n} Kind(er) erfassen`;
    kinder.forEach((k, i) => {
      if (!k.vorname?.trim()) errors[`kinder.${i}.vorname`] = 'Pflichtfeld';
      if (!k.geburtsdatum) errors[`kinder.${i}.geburtsdatum`] = 'Pflichtfeld';
    });
  }
  return errors;
}

const baseInput =
  'h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring';
const labelCls = 'text-sm text-muted-foreground';

interface Props {
  data: PersonnelData;
  onChange: (next: PersonnelData) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export default function PersonnelFormFields({ data, onChange, errors = {}, disabled }: Props) {
  const set = <K extends keyof PersonnelData>(key: K, value: PersonnelData[K]) => {
    onChange({ ...data, [key]: value });
  };
  const updateChild = (idx: number, patch: Partial<ChildEntry>) => {
    const next = [...(data.kinder ?? [])];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...data, kinder: next });
  };
  const addChild = () =>
    onChange({ ...data, kinder: [...(data.kinder ?? []), { vorname: '', geburtsdatum: '', inAusbildung: false }] });
  const removeChild = (idx: number) =>
    onChange({ ...data, kinder: (data.kinder ?? []).filter((_, i) => i !== idx) });

  const inputCls = (key: string) =>
    cn(baseInput, errors[key] && 'border-destructive ring-1 ring-destructive');

  const showEhe = data.zivilstand === 'verheiratet' || data.zivilstand === 'eingetragene_partnerschaft';

  return (
    <fieldset disabled={disabled} className="space-y-5">
      <Section title="Personalien" group="personalien">
        <Grid>
          <Field label="AHV-Nr. (756.xxxx.xxxx.xx) *" error={errors.ahvNr}><input className={inputCls('ahvNr')} value={data.ahvNr ?? ''} onChange={e => set('ahvNr', e.target.value)} placeholder="756." /></Field>
          <Field label="Nationalität *" error={errors.nationalitaet}><input className={inputCls('nationalitaet')} value={data.nationalitaet ?? ''} onChange={e => set('nationalitaet', e.target.value)} /></Field>
          <Field label="Sprache *" error={errors.sprache}><input className={inputCls('sprache')} value={data.sprache ?? ''} onChange={e => set('sprache', e.target.value)} /></Field>
          <Field label="Heimatort (CH) *" error={errors.heimatortCH}><input className={inputCls('heimatortCH')} value={data.heimatortCH ?? ''} onChange={e => set('heimatortCH', e.target.value)} /></Field>
          <Field label="Heimatort (Ausland)"><input className={baseInput} value={data.heimatortAusland ?? ''} onChange={e => set('heimatortAusland', e.target.value)} /></Field>
          <Field label="Kategorie Ausländerausweis *" error={errors.auslaenderausweis}><input className={inputCls('auslaenderausweis')} value={data.auslaenderausweis ?? ''} onChange={e => set('auslaenderausweis', e.target.value)} placeholder="z.B. B, C, L, CH…" /></Field>
        </Grid>
      </Section>

      <Section title="Zivilstand" group="zivilstand">
        <Grid>
          <Field label="Status *" error={errors.zivilstand}>
            <select className={inputCls('zivilstand')} value={data.zivilstand ?? ''} onChange={e => set('zivilstand', e.target.value as PersonnelData['zivilstand'])}>
              <option value="">—</option>
              <option value="ledig">ledig</option>
              <option value="verheiratet">verheiratet</option>
              <option value="geschieden">geschieden</option>
              <option value="eingetragene_partnerschaft">eingetragene Partnerschaft</option>
            </select>
          </Field>
          <Field label={showEhe ? 'Verheiratet seit *' : 'Verheiratet / geschieden seit'} error={errors.zivilstandDatum}>
            <input type="date" className={inputCls('zivilstandDatum')} value={data.zivilstandDatum ?? ''} onChange={e => set('zivilstandDatum', e.target.value)} />
          </Field>
        </Grid>
      </Section>

      <Section title="Konfession *" group="zivilstand">
        <Field label="" error={errors.konfession}>
          <select className={inputCls('konfession')} value={data.konfession ?? ''} onChange={e => set('konfession', e.target.value as PersonnelData['konfession'])}>
            <option value="">—</option>
            <option value="roemisch_katholisch">Römisch-katholisch</option>
            <option value="christkatholisch">Christkatholisch</option>
            <option value="evangelisch_reformiert">Evangelisch-reformiert</option>
            <option value="keine_andere">Keine / andere</option>
          </select>
        </Field>
      </Section>

      <Section title="Angaben zur Lohnüberweisung" group="bank">
        <Grid>
          <Field label="Bankname *" error={errors.bankName}><input className={inputCls('bankName')} value={data.bankName ?? ''} onChange={e => set('bankName', e.target.value)} /></Field>
          <Field label="BIC *" error={errors.bic}><input className={inputCls('bic')} value={data.bic ?? ''} onChange={e => set('bic', e.target.value)} /></Field>
          <Field label="IBAN *" error={errors.iban}><input className={inputCls('iban')} value={data.iban ?? ''} onChange={e => set('iban', e.target.value)} placeholder="CH…" /></Field>
          <Field label="PLZ / Ort der Bank *" error={errors.bankPlzOrt}><input className={inputCls('bankPlzOrt')} value={data.bankPlzOrt ?? ''} onChange={e => set('bankPlzOrt', e.target.value)} /></Field>
        </Grid>
      </Section>

      <Section title="Versicherungen" group="versicherung">
        <Grid>
          <Field label="Krankenkasse *" error={errors.krankenkasse}><input className={inputCls('krankenkasse')} value={data.krankenkasse ?? ''} onChange={e => set('krankenkasse', e.target.value)} /></Field>
          <Field label="Bisherige Pensionskasse *" error={errors.pensionskasse}><input className={inputCls('pensionskasse')} value={data.pensionskasse ?? ''} onChange={e => set('pensionskasse', e.target.value)} /></Field>
        </Grid>
      </Section>

      <Section title="Anstellung" group="anstellung">
        <Grid>
          <Field label="Arbeitsbeginn (Eintrittsdatum) *" error={errors.arbeitsbeginn}><input type="date" className={inputCls('arbeitsbeginn')} value={data.arbeitsbeginn ?? ''} onChange={e => set('arbeitsbeginn', e.target.value)} /></Field>
          <Field label="Anstellungsdauer *" error={errors.anstellungsdauer}>
            <select className={inputCls('anstellungsdauer')} value={data.anstellungsdauer ?? ''} onChange={e => set('anstellungsdauer', e.target.value as PersonnelData['anstellungsdauer'])}>
              <option value="">—</option>
              <option value="befristet">Befristet</option>
              <option value="unbefristet">Unbefristet</option>
            </select>
          </Field>
          <Field label="Arbeitsort (Agentur) *" error={errors.arbeitsortAgentur}><input className={inputCls('arbeitsortAgentur')} value={data.arbeitsortAgentur ?? ''} onChange={e => set('arbeitsortAgentur', e.target.value)} /></Field>
          <Field label="Karrierestufe *" error={errors.karrierestufe}>
            <select className={inputCls('karrierestufe')} value={data.karrierestufe ?? ''} onChange={e => set('karrierestufe', e.target.value)}>
              <option value="">—</option>
              {['Trainee','Finanzcoach VBV','Vermögensberater','Teamleiter','Finanzcoach','Eintritt SSM','Dipl. Finanzberater IAF','Verkaufsleiter','Finanzcoach SSM','Agenturleiter','Innendienst'].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>
        </Grid>
      </Section>

      <Section title="Höchste Ausbildung *" group="anstellung">
        <Field label="" error={errors.hoechsteAusbildung}>
          <select className={inputCls('hoechsteAusbildung')} value={data.hoechsteAusbildung ?? ''} onChange={e => set('hoechsteAusbildung', e.target.value)}>
            <option value="">—</option>
            {['Obligatorische Schule','Matura / Abitur','Höhere Fachschule','Lehrpatent','Uni / HS Bachelor','Uni / HS Master','Abgeschlossene Berufsausbildung','Interne Berufsausbildung (nicht BiGA)'].map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Andere Arbeitgeber (optional)" group="erwerb">
        <Grid>
          <Field label="Name Arbeitgeber"><input className={baseInput} value={data.andereAgName ?? ''} onChange={e => set('andereAgName', e.target.value)} /></Field>
          <Field label="Stellenantritt"><input type="date" className={baseInput} value={data.andereAgStellenantritt ?? ''} onChange={e => set('andereAgStellenantritt', e.target.value)} /></Field>
          <Field label="Adresse"><input className={baseInput} value={data.andereAgAdresse ?? ''} onChange={e => set('andereAgAdresse', e.target.value)} /></Field>
          <Field label="Pensum %"><input className={baseInput} value={data.andereAgPensum ?? ''} onChange={e => set('andereAgPensum', e.target.value)} placeholder="z.B. 80" /></Field>
        </Grid>
      </Section>

      <Section title="Bei Erwerbstätigkeit" group="erwerb">
        <Grid>
          <YesNo label="Bezug von Lohn oder Ersatzeinkommen (Taggeld)? *" value={data.bezugLohnTaggeld} onChange={v => set('bezugLohnTaggeld', v)} cls={inputCls('bezugLohnTaggeld')} error={errors.bezugLohnTaggeld} />
          <YesNo label="Bezug von Lohn oder Ersatzeinkommen + Rente? *" value={data.bezugLohnRente} onChange={v => set('bezugLohnRente', v)} cls={inputCls('bezugLohnRente')} error={errors.bezugLohnRente} />
          <YesNo label="Selbstständig erwerbend? *" value={data.selbststaendig} onChange={v => set('selbststaendig', v)} cls={inputCls('selbststaendig')} error={errors.selbststaendig} />
          <YesNo label="Salär mind. CHF 7'110.– / Jahr? *" value={data.salaerMin} onChange={v => set('salaerMin', v)} cls={inputCls('salaerMin')} error={errors.salaerMin} />
        </Grid>
      </Section>

      {showEhe && (
        <Section title="Angaben zum Ehepartner" group="zivilstand">
          <Grid>
            <Field label="Name *" error={errors.epName}><input className={inputCls('epName')} value={data.epName ?? ''} onChange={e => set('epName', e.target.value)} /></Field>
            <Field label="Vorname *" error={errors.epVorname}><input className={inputCls('epVorname')} value={data.epVorname ?? ''} onChange={e => set('epVorname', e.target.value)} /></Field>
            <Field label="Geburtsdatum *" error={errors.epGeburtsdatum}><input type="date" className={inputCls('epGeburtsdatum')} value={data.epGeburtsdatum ?? ''} onChange={e => set('epGeburtsdatum', e.target.value)} /></Field>
            <Field label="Verheiratet seit *" error={errors.epVerheiratetSeit}><input type="date" className={inputCls('epVerheiratetSeit')} value={data.epVerheiratetSeit ?? ''} onChange={e => set('epVerheiratetSeit', e.target.value)} /></Field>
            <YesNo label="Erwerbstätig? *" value={data.epErwerbstaetig} onChange={v => set('epErwerbstaetig', v)} cls={inputCls('epErwerbstaetig')} error={errors.epErwerbstaetig} />
            <YesNo label="Bezieht eine Rente? *" value={data.epRente} onChange={v => set('epRente', v)} cls={inputCls('epRente')} error={errors.epRente} />
            <Field label="Arbeitgeber (Name / Adresse)"><input className={baseInput} value={data.epArbeitgeber ?? ''} onChange={e => set('epArbeitgeber', e.target.value)} /></Field>
            <Field label="Pensum % *" error={errors.epPensum}><input className={inputCls('epPensum')} value={data.epPensum ?? ''} onChange={e => set('epPensum', e.target.value)} /></Field>
            <YesNo label="Kinderzulagen durch Ehepartner? *" value={data.epKinderzulagen} onChange={v => set('epKinderzulagen', v)} cls={inputCls('epKinderzulagen')} error={errors.epKinderzulagen} />
          </Grid>
        </Section>
      )}

      <Section title="Kinder" group="kinder">
        <div className="space-y-2">
          <Field label="Anzahl Kinder *" error={errors.anzahlKinder}>
            <input className={inputCls('anzahlKinder')} type="number" min={0} value={data.anzahlKinder ?? ''} onChange={e => set('anzahlKinder', e.target.value)} />
          </Field>
          {errors.kinder && <p className="text-xs text-destructive">{errors.kinder}</p>}
          {(data.kinder ?? []).map((k, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
              <Field label={`Vorname ${idx + 1} *`} error={errors[`kinder.${idx}.vorname`]}><input className={inputCls(`kinder.${idx}.vorname`)} value={k.vorname} onChange={e => updateChild(idx, { vorname: e.target.value })} /></Field>
              <Field label="Geburtsdatum *" error={errors[`kinder.${idx}.geburtsdatum`]}><input type="date" className={inputCls(`kinder.${idx}.geburtsdatum`)} value={k.geburtsdatum} onChange={e => updateChild(idx, { geburtsdatum: e.target.value })} /></Field>
              <label className="flex items-center gap-2 h-10 px-2 text-sm">
                <input type="checkbox" checked={k.inAusbildung} onChange={e => updateChild(idx, { inAusbildung: e.target.checked })} />
                In Ausbildung
              </label>
              <button type="button" onClick={() => removeChild(idx)} className="h-10 px-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addChild} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            <Plus className="h-3.5 w-3.5" /> Kind hinzufügen
          </button>
        </div>
      </Section>
    </fieldset>
  );
}

function Section({ title, children, group }: { title: string; children: React.ReactNode; group?: string }) {
  return (
    <div data-group={group}>
      <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h5>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
function YesNo({ label, value, onChange, cls, error }: { label: string; value: 'ja' | 'nein' | '' | undefined; onChange: (v: 'ja' | 'nein' | '') => void; cls: string; error?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select className={cls} value={value ?? ''} onChange={e => onChange(e.target.value as 'ja' | 'nein' | '')}>
        <option value="">—</option>
        <option value="ja">Ja</option>
        <option value="nein">Nein</option>
      </select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
