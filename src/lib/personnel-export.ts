import type { PersonnelData } from '@/components/PersonnelFormFields';

const LABELS: Record<string, string> = {
  ahvNr: 'AHV-Nr.',
  nationalitaet: 'Nationalität',
  sprache: 'Sprache',
  heimatortCH: 'Heimatort (CH)',
  heimatortAusland: 'Heimatort (Ausland)',
  auslaenderausweis: 'Ausländerausweis',
  zivilstand: 'Zivilstand',
  zivilstandDatum: 'Verheiratet / geschieden seit',
  konfession: 'Konfession',
  bankName: 'Bankname',
  bic: 'BIC',
  iban: 'IBAN',
  bankPlzOrt: 'PLZ / Ort der Bank',
  krankenkasse: 'Krankenkasse',
  pensionskasse: 'Pensionskasse',
  arbeitsbeginn: 'Arbeitsbeginn',
  anstellungsdauer: 'Anstellungsdauer',
  arbeitsortAgentur: 'Arbeitsort (Agentur)',
  karrierestufe: 'Karrierestufe',
  hoechsteAusbildung: 'Höchste Ausbildung',
  andereAgName: 'Anderer Arbeitgeber: Name',
  andereAgAdresse: 'Anderer Arbeitgeber: Adresse',
  andereAgStellenantritt: 'Anderer Arbeitgeber: Stellenantritt',
  andereAgPensum: 'Anderer Arbeitgeber: Pensum %',
  bezugLohnTaggeld: 'Bezug Lohn/Taggeld',
  bezugLohnRente: 'Bezug Lohn + Rente',
  selbststaendig: 'Selbstständig',
  salaerMin: "Salär ≥ CHF 7'110/Jahr",
  epName: 'Ehepartner: Name',
  epVorname: 'Ehepartner: Vorname',
  epGeburtsdatum: 'Ehepartner: Geburtsdatum',
  epVerheiratetSeit: 'Verheiratet seit',
  epErwerbstaetig: 'Ehepartner erwerbstätig',
  epRente: 'Ehepartner bezieht Rente',
  epArbeitgeber: 'Ehepartner: Arbeitgeber',
  epPensum: 'Ehepartner: Pensum %',
  epKinderzulagen: 'Kinderzulagen durch Ehepartner',
  anzahlKinder: 'Anzahl Kinder',
};

const SECTIONS: { title: string; fields: (keyof PersonnelData)[] }[] = [
  { title: 'Personalien', fields: ['ahvNr','nationalitaet','sprache','heimatortCH','heimatortAusland','auslaenderausweis'] },
  { title: 'Zivilstand & Konfession', fields: ['zivilstand','zivilstandDatum','konfession'] },
  { title: 'Lohnüberweisung', fields: ['bankName','bic','iban','bankPlzOrt'] },
  { title: 'Versicherungen', fields: ['krankenkasse','pensionskasse'] },
  { title: 'Anstellung', fields: ['arbeitsbeginn','anstellungsdauer','arbeitsortAgentur','karrierestufe','hoechsteAusbildung'] },
  { title: 'Andere Arbeitgeber', fields: ['andereAgName','andereAgAdresse','andereAgStellenantritt','andereAgPensum'] },
  { title: 'Erwerbstätigkeit', fields: ['bezugLohnTaggeld','bezugLohnRente','selbststaendig','salaerMin'] },
  { title: 'Ehepartner', fields: ['epName','epVorname','epGeburtsdatum','epVerheiratetSeit','epErwerbstaetig','epRente','epArbeitgeber','epPensum','epKinderzulagen'] },
  { title: 'Kinder', fields: ['anzahlKinder'] },
];

function fmt(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  return String(v);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function downloadPersonnelCsv(data: PersonnelData, leadName: string): void {
  const rows: string[][] = [['Feld', 'Wert']];
  for (const sec of SECTIONS) {
    rows.push([`# ${sec.title}`, '']);
    for (const key of sec.fields) {
      rows.push([LABELS[key as string] ?? String(key), fmt((data as Record<string, unknown>)[key as string])]);
    }
  }
  // Kinder details
  const kinder = data.kinder ?? [];
  kinder.forEach((k, i) => {
    rows.push([`Kind ${i + 1}: Vorname`, fmt(k.vorname)]);
    rows.push([`Kind ${i + 1}: Geburtsdatum`, fmt(k.geburtsdatum)]);
    rows.push([`Kind ${i + 1}: In Ausbildung`, k.inAusbildung ? 'Ja' : 'Nein']);
  });

  const csv = '\uFEFF' + rows.map(r =>
    r.map(c => {
      const s = String(c ?? '');
      return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(';')
  ).join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Personalien_${leadName.replace(/[^\w.-]+/g, '_')}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function openPersonnelPdf(data: PersonnelData, leadName: string, leadMeta: { position?: string; agency?: string } = {}): void {
  const sectionsHtml = SECTIONS.map(sec => {
    const rows = sec.fields.map(k => `
      <tr>
        <td class="lbl">${esc(LABELS[k as string] ?? String(k))}</td>
        <td class="val">${esc(fmt((data as Record<string, unknown>)[k as string]))}</td>
      </tr>`).join('');
    return `
      <section>
        <h2>${esc(sec.title)}</h2>
        <table><tbody>${rows}</tbody></table>
      </section>`;
  }).join('');

  const kinder = data.kinder ?? [];
  const kinderHtml = kinder.length === 0 ? '' : `
    <section>
      <h2>Kinder – Details</h2>
      <table>
        <thead><tr><th>#</th><th>Vorname</th><th>Geburtsdatum</th><th>In Ausbildung</th></tr></thead>
        <tbody>
          ${kinder.map((k, i) => `<tr><td>${i + 1}</td><td>${esc(fmt(k.vorname))}</td><td>${esc(fmt(k.geburtsdatum))}</td><td>${k.inAusbildung ? 'Ja' : 'Nein'}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>`;

  const now = new Date().toLocaleString('de-CH');
  const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>Personalblatt – ${esc(leadName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'DM Sans', system-ui, -apple-system, Segoe UI, sans-serif; color: #1a1a1a; margin: 32px; }
  header { border-bottom: 3px solid #324642; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { font-family: 'Space Grotesk', sans-serif; color: #324642; margin: 0 0 4px; font-size: 22px; }
  .meta { color: #555; font-size: 12px; }
  section { margin-top: 18px; page-break-inside: avoid; }
  h2 { font-family: 'Space Grotesk', sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #324642; border-bottom: 1px solid #d9dfdd; padding-bottom: 4px; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td, th { padding: 6px 8px; vertical-align: top; }
  tbody tr:nth-child(odd) { background: #f6f7f7; }
  td.lbl { color: #555; width: 45%; }
  td.val { color: #1a1a1a; font-weight: 500; }
  thead th { text-align: left; background: #324642; color: white; font-size: 11px; }
  footer { margin-top: 30px; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { body { margin: 18mm; } .noprint { display: none; } }
  .actions { margin-bottom: 14px; }
  .actions button { background: #324642; color: white; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; }
</style></head>
<body>
  <div class="actions noprint"><button onclick="window.print()">PDF drucken / speichern</button></div>
  <header>
    <h1>Personalblatt – ${esc(leadName)}</h1>
    <div class="meta">
      ${leadMeta.position ? `Position: ${esc(leadMeta.position)} · ` : ''}
      ${leadMeta.agency ? `Agentur: ${esc(leadMeta.agency)} · ` : ''}
      Erstellt: ${esc(now)}
    </div>
  </header>
  ${sectionsHtml}
  ${kinderHtml}
  <footer>SSM Recruit – Vertraulich. Nur für autorisierte HR-Mitarbeitende.</footer>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
