import JSZip from 'jszip';

/**
 * Wandelt eine Word-Datei (.docx) möglichst formatgetreu in HTML um:
 * Ausrichtung, Abstände, Zeilenabstand, Einzüge, Schriftgrösse/-art/-farbe,
 * fett/kursiv/unterstrichen, Aufzählungen, Tabellen mit Spaltenbreiten,
 * harte Seitenumbrüche. Stile (styles.xml) inkl. Vererbung werden berücksichtigt.
 */

type Props = Record<string, string>;
const tw2pt = (v: string | null | undefined) => (v ? `${(parseInt(v, 10) / 20).toFixed(1)}pt` : '');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kids = (el: Element | null | undefined, name?: string) =>
  el ? (Array.from(el.children) as Element[]).filter(c => !name || c.localName === name) : [];
const kid = (el: Element | null | undefined, name: string) => kids(el, name)[0] ?? null;
const val = (el: Element | null | undefined, attr = 'val') => el?.getAttribute(`w:${attr}`) ?? null;

function readPPr(pPr: Element | null, out: Props = {}) {
  if (!pPr) return out;
  const jc = val(kid(pPr, 'jc'));
  if (jc) out.align = jc === 'both' || jc === 'distribute' ? 'justify' : jc === 'end' ? 'right' : jc === 'start' ? 'left' : jc;
  const sp = kid(pPr, 'spacing');
  if (sp) {
    if (val(sp, 'before') != null) out.before = val(sp, 'before')!;
    if (val(sp, 'after') != null) out.after = val(sp, 'after')!;
    if (val(sp, 'line') != null) { out.line = val(sp, 'line')!; out.lineRule = val(sp, 'lineRule') || 'auto'; }
  }
  const ind = kid(pPr, 'ind');
  if (ind) {
    const l = val(ind, 'left') ?? val(ind, 'start'); if (l != null) out.indLeft = l;
    const r = val(ind, 'right') ?? val(ind, 'end'); if (r != null) out.indRight = r;
    if (val(ind, 'firstLine') != null) { out.firstLine = val(ind, 'firstLine')!; delete out.hanging; }
    if (val(ind, 'hanging') != null) { out.hanging = val(ind, 'hanging')!; delete out.firstLine; }
  }
  if (kid(pPr, 'pageBreakBefore') && val(kid(pPr, 'pageBreakBefore')) !== '0') out.pageBreakBefore = '1';
  const num = kid(pPr, 'numPr');
  if (num) { out.numId = val(kid(num, 'numId')) ?? ''; out.ilvl = val(kid(num, 'ilvl')) ?? '0'; }
  return out;
}

function flag(el: Element | null) {
  if (!el) return null;
  const v = val(el);
  return !(v === '0' || v === 'false' || v === 'none');
}

function readRPr(rPr: Element | null, out: Props = {}) {
  if (!rPr) return out;
  for (const [tag, key] of [['b', 'b'], ['i', 'i'], ['caps', 'caps'], ['strike', 'strike']] as const) {
    const f = flag(kid(rPr, tag)); if (f != null) out[key] = f ? '1' : '';
  }
  const u = kid(rPr, 'u'); if (u) out.u = val(u) && val(u) !== 'none' ? '1' : '';
  const sz = val(kid(rPr, 'sz')); if (sz) out.sz = sz;
  const f = kid(rPr, 'rFonts'); const fam = val(f, 'ascii') ?? val(f, 'hAnsi'); if (fam) out.font = fam;
  const c = val(kid(rPr, 'color')); if (c && c !== 'auto') out.color = c;
  const va = val(kid(rPr, 'vertAlign')); if (va) out.vert = va;
  return out;
}

export async function docxToHtml(file: File | ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(file instanceof File ? await file.arrayBuffer() : file);
  const parse = async (p: string) => {
    const f = zip.file(p); if (!f) return null;
    return new DOMParser().parseFromString(await f.async('text'), 'application/xml');
  };
  const doc = await parse('word/document.xml');
  if (!doc) throw new Error('Ungültige Word-Datei');
  const stylesDoc = await parse('word/styles.xml');
  const numDoc = await parse('word/numbering.xml');

  // --- Stile ---
  const styleEls = new Map<string, Element>();
  stylesDoc?.querySelectorAll('*').forEach(e => { if (e.localName === 'style') styleEls.set(val(e, 'styleId') ?? '', e); });
  const dd = stylesDoc ? Array.from(stylesDoc.getElementsByTagName('*')).find(e => e.localName === 'docDefaults') : null;
  const defP = readPPr(kid(kid(dd, 'pPrDefault'), 'pPr'));
  const defR = readRPr(kid(kid(dd, 'rPrDefault'), 'rPr'));
  const defaultParaStyle = Array.from(styleEls.values()).find(s => val(s, 'type') === 'paragraph' && val(s, 'default') === '1');

  const styleCache = new Map<string, { p: Props; r: Props; name: string }>();
  const resolveStyle = (id: string | null, depth = 0): { p: Props; r: Props; name: string } => {
    if (!id || depth > 12) return { p: {}, r: {}, name: '' };
    if (styleCache.has(id)) return styleCache.get(id)!;
    const s = styleEls.get(id);
    if (!s) return { p: {}, r: {}, name: '' };
    const base = resolveStyle(val(kid(s, 'basedOn')), depth + 1);
    const res = {
      p: readPPr(kid(s, 'pPr'), { ...base.p }),
      r: readRPr(kid(s, 'rPr'), { ...base.r }),
      name: (val(kid(s, 'name')) || id).toLowerCase(),
    };
    styleCache.set(id, res);
    return res;
  };

  // --- Nummerierung ---
  const absMap = new Map<string, Element>();
  const numMap = new Map<string, string>();
  numDoc?.querySelectorAll('*').forEach(e => {
    if (e.localName === 'abstractNum') absMap.set(val(e, 'abstractNumId') ?? '', e);
    if (e.localName === 'num') numMap.set(val(e, 'numId') ?? '', val(kid(e, 'abstractNumId')) ?? '');
  });
  const counters = new Map<string, number[]>();
  const listLabel = (numId: string, ilvl: string) => {
    const abs = absMap.get(numMap.get(numId) ?? '');
    const lvl = kids(abs, 'lvl').find(l => val(l, 'ilvl') === ilvl);
    if (!lvl || numId === '0') return null;
    const fmt = val(kid(lvl, 'numFmt')) || 'decimal';
    const text = val(kid(lvl, 'lvlText')) ?? '%1.';
    const start = parseInt(val(kid(lvl, 'start')) || '1', 10);
    const lv = parseInt(ilvl, 10);
    const key = numMap.get(numId) ?? numId;
    const arr = counters.get(key) ?? [];
    arr[lv] = (arr[lv] ?? start - 1) + 1;
    arr.length = lv + 1;
    counters.set(key, arr);
    const indP = readPPr(kid(lvl, 'pPr'));
    if (fmt === 'bullet') return { label: /[\uF000-\uF0FF]/.test(text) || !text ? '•' : text, ind: indP };
    const format = (n: number, f: string) => {
      if (f === 'lowerLetter') return String.fromCharCode(96 + ((n - 1) % 26) + 1);
      if (f === 'upperLetter') return String.fromCharCode(64 + ((n - 1) % 26) + 1);
      if (f === 'lowerRoman' || f === 'upperRoman') {
        const r = ['m', 'cm', 'd', 'cd', 'c', 'xc', 'l', 'xl', 'x', 'ix', 'v', 'iv', 'i'];
        const v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        let s = ''; let x = n; v.forEach((k, i) => { while (x >= k) { s += r[i]; x -= k; } });
        return f === 'upperRoman' ? s.toUpperCase() : s;
      }
      return String(n);
    };
    const label = text.replace(/%(\d)/g, (_m, d) => format(arr[parseInt(d, 10) - 1] ?? start, fmt));
    return { label, ind: indP };
  };

  // --- Runs ---
  const runStyle = (r: Props) => {
    const css: string[] = [];
    if (r.sz) css.push(`font-size:${parseInt(r.sz, 10) / 2}pt`);
    if (r.font) css.push(`font-family:'${r.font}',${/grotesk|light|book|heavy/i.test(r.font) ? "'Helvetica Neue',Arial" : 'Arial'},sans-serif`);
    if (r.color) css.push(`color:#${r.color}`);
    if (r.caps) css.push('text-transform:uppercase');
    return css.join(';');
  };
  const wrapRun = (inner: string, r: Props) => {
    if (!inner) return '';
    let h = inner;
    if (r.vert === 'superscript') h = `<sup>${h}</sup>`;
    if (r.vert === 'subscript') h = `<sub>${h}</sub>`;
    if (r.strike) h = `<s>${h}</s>`;
    if (r.u) h = `<u>${h}</u>`;
    if (r.i) h = `<em>${h}</em>`;
    if (r.b) h = `<strong>${h}</strong>`;
    const st = runStyle(r);
    return st ? `<span style="${st}">${h}</span>` : h;
  };

  // Liefert HTML eines Absatzes; Seitenumbrüche teilen den Absatz
  let tblCtx: { p: Props; r: Props } | null = null;
  const renderParagraph = (p: Element): string => {
    const pPr = kid(p, 'pPr');
    const styleId = val(kid(pPr, 'pStyle')) ?? (defaultParaStyle ? val(defaultParaStyle, 'styleId') : null);
    const st = resolveStyle(styleId);
    const explicitStyle = !!val(kid(pPr, 'pStyle'));
    const pp = readPPr(pPr, explicitStyle ? { ...defP, ...(tblCtx?.p ?? {}), ...st.p } : { ...defP, ...st.p, ...(tblCtx?.p ?? {}) });
    const baseR = explicitStyle ? { ...defR, ...(tblCtx?.r ?? {}), ...st.r } : { ...defR, ...st.r, ...(tblCtx?.r ?? {}) };
    // Absatzmarke (leerer Absatz) nimmt die Schriftgrösse der Absatzmarke
    const markR = readRPr(kid(pPr, 'rPr'), { ...baseR });
    const parts: string[] = [];
    let cur = '';
    const walk = (el: Element) => {
      for (const c of kids(el)) {
        const n = c.localName;
        if (n === 'r') {
          const rStyleId = val(kid(kid(c, 'rPr'), 'rStyle'));
          const rp = readRPr(kid(c, 'rPr'), { ...baseR, ...resolveStyle(rStyleId).r });
          let txt = '';
          for (const t of kids(c)) {
            if (t.localName === 't') txt += esc(t.textContent ?? '');
            else if (t.localName === 'tab') txt += '\t';
            else if (t.localName === 'br') {
              if (val(t, 'type') === 'page') { cur += wrapRun(txt, rp); txt = ''; parts.push(cur); parts.push('__PB__'); cur = ''; }
              else txt += '<br>';
            } else if (t.localName === 'noBreakHyphen') txt += '‑';
            else if (t.localName === 'lastRenderedPageBreak') { /* ignorieren */ }
          }
          cur += wrapRun(txt, rp);
        } else if (['hyperlink', 'ins', 'smartTag', 'fldSimple', 'customXml'].includes(n)) walk(c);
        else if (n === 'sdt') walk(kid(c, 'sdtContent') ?? c);
      }
    };
    walk(p);
    parts.push(cur);

    let tag = 'p';
    const nm = st.name;
    const hm = nm.match(/(heading|überschrift|berschrift)\s*(\d)/);
    if (nm === 'title' || nm === 'titel') tag = 'h1';
    else if (hm) tag = `h${Math.min(3, parseInt(hm[2], 10))}`;

    let prefix = '';
    let indOverride: Props = {};
    if (pp.numId && pp.numId !== '0') {
      const lab = listLabel(pp.numId, pp.ilvl || '0');
      if (lab) { prefix = esc(lab.label) + '\t'; indOverride = lab.ind; }
    }
    const P = { ...pp, ...Object.fromEntries(Object.entries(indOverride).filter(([k]) => k.startsWith('ind') || k === 'hanging' || k === 'firstLine')), ...(pPr && kid(pPr, 'ind') ? readPPr(pPr) : {}) };

    const css: string[] = [];
    css.push(`margin-top:${tw2pt(P.before || '0') || '0pt'}`);
    css.push(`margin-bottom:${tw2pt(P.after || '0') || '0pt'}`);
    if (P.line) {
      css.push(P.lineRule === 'auto' ? `line-height:${(parseInt(P.line, 10) / 240).toFixed(2)}` : `line-height:${tw2pt(P.line)}`);
    }
    if (P.indLeft && P.indLeft !== '0') css.push(`padding-left:${tw2pt(P.indLeft)}`);
    if (P.indRight && P.indRight !== '0') css.push(`padding-right:${tw2pt(P.indRight)}`);
    if (P.firstLine) css.push(`text-indent:${tw2pt(P.firstLine)}`);
    if (P.hanging) css.push(`text-indent:-${tw2pt(P.hanging)}`);
    const baseSt = runStyle(baseR);
    if (baseSt) css.push(baseSt);
    const alignAttr = P.align && P.align !== 'left' ? ` style="text-align:${P.align};${css.join(';')}"` : ` style="${css.join(';')}"`;

    const out: string[] = [];
    if (pp.pageBreakBefore) out.push('<div data-page-break="true"></div>');
    parts.forEach((h, i) => {
      if (h === '__PB__') { out.push('<div data-page-break="true"></div>'); return; }
      if (!h && parts.length > 1 && i > 0) return; // leerer Rest nach Umbruch
      const content = (i === 0 ? prefix : '') + h;
      const attr = !content && markR.sz ? alignAttr.replace(/"$/, `;font-size:${parseInt(markR.sz, 10) / 2}pt"`) : alignAttr;
      out.push(`<${tag}${attr}>${content}</${tag}>`);
    });
    return out.join('');
  };

  const renderTable = (tbl: Element): string => {
    const prevCtx = tblCtx;
    const ts = resolveStyle(val(kid(kid(tbl, 'tblPr'), 'tblStyle')));
    tblCtx = { p: ts.p, r: ts.r };
    const grid = kids(kid(tbl, 'tblGrid'), 'gridCol').map(g => Math.round(parseInt(val(g, 'w') || '0', 10) / 15));
    let html = '<table><tbody>';
    for (const tr of kids(tbl, 'tr')) {
      html += '<tr>';
      let col = 0;
      for (const tc of kids(tr, 'tc')) {
        const tcPr = kid(tc, 'tcPr');
        const span = parseInt(val(kid(tcPr, 'gridSpan')) || '1', 10);
        const vm = kid(tcPr, 'vMerge');
        const widths = grid.slice(col, col + span).filter(Boolean);
        col += span;
        if (vm && val(vm) !== 'restart') { html += `<td${span > 1 ? ` colspan="${span}"` : ''}${widths.length ? ` colwidth="${widths.join(',')}"` : ''}></td>`; continue; }
        const inner = kids(tc).map(c => c.localName === 'p' ? renderParagraph(c) : c.localName === 'tbl' ? renderTable(c) : '').join('');
        html += `<td${span > 1 ? ` colspan="${span}"` : ''}${widths.length ? ` colwidth="${widths.join(',')}"` : ''}>${inner || '<p></p>'}</td>`;
      }
      html += '</tr>';
    }
    tblCtx = prevCtx;
    return html + '</tbody></table>';
  };

  const body = Array.from(doc.getElementsByTagName('*')).find(e => e.localName === 'body');
  const blocks: string[] = [];
  const walkBody = (el: Element) => {
    for (const c of kids(el)) {
      if (c.localName === 'p') blocks.push(renderParagraph(c));
      else if (c.localName === 'tbl') blocks.push(renderTable(c));
      else if (c.localName === 'sdt') walkBody(kid(c, 'sdtContent') ?? c);
    }
  };
  if (body) walkBody(body);
  // Ein Seitenumbruch vor dem allerersten Inhalt erzeugt im Editor eine leere
  // Startseite. Word speichert diesen teilweise am ersten Absatz der Datei.
  return blocks.join('\n').replace(
    /^(?:(?:\s*<p[^>]*>(?:\s|<br\s*\/?\s*>)*<\/p>)*)\s*<div data-page-break="true"><\/div>\s*/i,
    '',
  );
}
