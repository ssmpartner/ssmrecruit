// Final document generation for contracts.
// Produces three artifacts and stores their paths on the contract:
//   1. docx_path        – editable Word file with placeholders replaced (if a DOCX template exists)
//   2. pdf_path         – final PDF of the main contract (optionally overlaid on PDF letterhead)
//   3. merged_pdf_path  – combined PDF (main contract + all PDF attachments in sort order)
//
// Letterhead resolution order (first hit wins):
//   contract.letterhead_id -> set.letterhead_id -> default-per-language -> any active
//
// Letterhead overlay rules (so CI is never doubled):
//   - mode 'word'  : never overlay; trust headers/footers from the Word template
//   - mode 'pdf'   : always overlay PDF letterhead (also if rendering from HTML)
//   - mode 'auto'  : overlay only if the template had no DOCX (i.e. we render plain HTML)
//
// DOCX placeholder replacement uses a simple text pass on the document XML.
// Placeholders must be authored as plain "{{ key }}" tokens in a single run.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import JSZip from 'npm:jszip@3.10.1';

type AnyRec = Record<string, any>;

const DEFAULT_COMPANY = {
  name: 'SSM Partner AG', address: 'Schweiz', zip: '', city: '', uid: '', phone: '', email: '',
};

function fileSafe(s: string): string {
  return String(s || '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'Vertrag';
}

function personNameParts(person: AnyRec | null): { first: string; last: string; full: string } {
  const name = String(person?.name ?? '').trim();
  const first = name.split(' ')[0] ?? '';
  const last = name.split(' ').slice(1).join(' ') ?? '';
  return { first, last, full: name };
}

async function stampFooter(pdfBytes: Uint8Array, footerText: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const page of doc.getPages()) {
    const { width } = page.getSize();
    const w = font.widthOfTextAtSize(footerText, 7.5);
    page.drawText(footerText, {
      x: Math.max(30, (width - w) / 2), y: 22, size: 7.5, font,
      color: rgb(0.45, 0.45, 0.45),
    });
  }
  return await doc.save();
}

function flattenContext(contract: AnyRec, person: AnyRec | null): Record<string, string> {
  const flat: Record<string, string> = {};
  const push = (prefix: string, obj?: AnyRec) => {
    if (!obj) return;
    for (const [k, v] of Object.entries(obj)) flat[`${prefix}.${k}`] = v == null ? '' : String(v);
  };
  const parts = personNameParts(person);
  push('candidate', {
    first_name: parts.first,
    last_name: parts.last,
    full_name: parts.full,
    birth_date: person?.birth_date ?? '',
    address: person?.address ?? '',
    zip: person?.zip ?? '',
    city: person?.city ?? '',
    email: person?.email ?? person?.alt_email ?? '',
    phone: person?.phone ?? person?.alt_phone ?? '',
  });
  push('employment', {
    start_date: contract.start_date ?? '',
    position: contract.position ?? '',
    level: contract.level ?? '',
    workload: contract.workload ?? '',
    salary_monthly: contract.salary ?? '',
    salary_13_months: contract.thirteenth_salary ? 'ja' : 'nein',
    location: contract.location ?? '',
    agency: contract.agency_name ?? '',
    manager: contract.manager_name ?? '',
    probation_period: contract.probation_period ?? '',
    notice_period: contract.notice_period ?? '',
  });
  push('careerplan', { level: contract.careerplan_level ?? '', commission_model: contract.commission_model ?? '' });
  push('company', DEFAULT_COMPANY);
  push('contract', {
    date: new Date().toLocaleDateString('de-CH'),
    language: contract.language ?? 'de',
    type: contract.kind_code ?? '',
    version: String(contract.current_version ?? 1),
  });

  // Apply manual overrides last so they always win.
  const ov = (contract.placeholder_overrides ?? {}) as Record<string, string>;
  for (const [k, v] of Object.entries(ov)) if (v) flat[k] = String(v);

  if (!flat['candidate.full_name']) {
    flat['candidate.full_name'] = [flat['candidate.first_name'], flat['candidate.last_name']].filter(Boolean).join(' ');
  }
  return flat;
}

function replacePlaceholders(text: string, flat: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_m, key) => flat[key] ?? '');
}

async function renderHtmlPdf(
  html: string,
  flat: Record<string, string>,
  letterheadBytes: Uint8Array | null,
  overlay: boolean,
): Promise<Uint8Array> {
  const text = replacePlaceholders(
    String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h\d>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim(),
    flat,
  );

  let basePdf: PDFDocument;
  if (overlay && letterheadBytes) {
    basePdf = await PDFDocument.load(letterheadBytes);
  } else {
    basePdf = await PDFDocument.create();
    basePdf.addPage([595, 842]);
  }
  const font = await basePdf.embedFont(StandardFonts.Helvetica);
  const margin = 60, size = 11, lh = 16;
  let pageIdx = 0;
  let page = basePdf.getPage(0);
  let { width, height } = page.getSize();
  let y = height - margin - 80;

  const wrap = (s: string, maxW: number) => {
    const words = s.split(/\s+/); const lines: string[] = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxW) { if (cur) lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const newPage = async () => {
    pageIdx++;
    if (overlay && letterheadBytes && pageIdx < basePdf.getPageCount()) {
      page = basePdf.getPage(pageIdx);
    } else if (overlay && letterheadBytes) {
      const tmpl = await PDFDocument.load(letterheadBytes);
      const [copied] = await basePdf.copyPages(tmpl, [0]);
      basePdf.addPage(copied); page = basePdf.getPage(basePdf.getPageCount() - 1);
    } else {
      page = basePdf.addPage([595, 842]);
    }
    const sz = page.getSize(); width = sz.width; height = sz.height; y = height - margin - 80;
  };

  for (const para of text.split(/\n\s*\n/)) {
    for (const line of wrap(para.replace(/\n/g, ' '), width - 2 * margin)) {
      if (y < margin + 60) await newPage();
      page.drawText(line, { x: margin, y, size, font, color: rgb(0.1, 0.1, 0.1) });
      y -= lh;
    }
    y -= lh * 0.5;
  }
  return await basePdf.save();
}

async function generateDocx(srcBytes: Uint8Array, flat: Record<string, string>): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(srcBytes);
  // Replace placeholders across the main document and headers/footers
  const targets = Object.keys(zip.files).filter(
    (n) => n.startsWith('word/') && (n.endsWith('document.xml') || n.startsWith('word/header') || n.startsWith('word/footer')),
  );
  for (const name of targets) {
    const file = zip.file(name);
    if (!file) continue;
    let xml = await file.async('string');
    xml = xml.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_m, key) => {
      const v = flat[key] ?? '';
      return v
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    });
    zip.file(name, xml);
  }
  const out = await zip.generateAsync({ type: 'uint8array' });
  return out;
}

async function mergePdfs(parts: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of parts) {
    try {
      const doc = await PDFDocument.load(bytes);
      const copied = await out.copyPages(doc, doc.getPageIndices());
      for (const p of copied) out.addPage(p);
    } catch (_) { /* skip non-PDF */ }
  }
  return await out.save();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { contract_id } = await req.json();
    if (!contract_id) {
      return new Response(JSON.stringify({ error: 'contract_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: contract, error: cErr } = await supabase
      .from('contracts').select('*').eq('id', contract_id).single();
    if (cErr || !contract) throw cErr || new Error('Contract not found');

    const [{ data: lead }, { data: tmpl }, { data: set }, { data: atts }] = await Promise.all([
      contract.candidate_lead_id
        ? supabase.from('leads').select('*').eq('id', contract.candidate_lead_id).maybeSingle()
        : Promise.resolve({ data: null }),
      contract.template_id
        ? supabase.from('contract_templates').select('*').eq('id', contract.template_id).maybeSingle()
        : Promise.resolve({ data: null }),
      contract.set_id
        ? supabase.from('contract_sets').select('*').eq('id', contract.set_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('contract_attachments').select('*').eq('contract_id', contract_id).order('sort_order', { ascending: true }),
    ]);

    // Resolve letterhead
    let lhRow: AnyRec | null = null;
    const lang = contract.language ?? 'de';
    const tryFetch = async (id: string | null | undefined) => {
      if (!id) return null;
      const { data } = await supabase.from('contract_letterhead').select('*').eq('id', id).maybeSingle();
      return data;
    };
    lhRow = await tryFetch(contract.letterhead_id);
    if (!lhRow) lhRow = await tryFetch(set?.letterhead_id);
    if (!lhRow) {
      const { data } = await supabase.from('contract_letterhead').select('*')
        .eq('language', lang).eq('is_default_for_language', true).maybeSingle();
      lhRow = data ?? null;
    }
    if (!lhRow) {
      const { data } = await supabase.from('contract_letterhead').select('*').eq('is_active', true).maybeSingle();
      lhRow = data ?? null;
    }

    let letterheadBytes: Uint8Array | null = null;
    if (lhRow?.storage_path) {
      const { data: f } = await supabase.storage.from('contracts').download(lhRow.storage_path);
      if (f) letterheadBytes = new Uint8Array(await f.arrayBuffer());
    }

    // Letterhead mode resolution
    const mode: 'auto' | 'word' | 'pdf' =
      (contract.letterhead_mode as any) ?? (tmpl?.letterhead_mode as any) ?? 'auto';
    const hasDocxTemplate = Boolean(tmpl?.docx_storage_path);

    const flat = flattenContext(contract, lead);

    // --- 1) Editable DOCX (only if template provides a DOCX source) -----
    let docxPath: string | null = contract.docx_path ?? null;
    if (hasDocxTemplate) {
      const { data: docxFile } = await supabase.storage.from('contracts').download(tmpl!.docx_storage_path);
      if (docxFile) {
        const srcBytes = new Uint8Array(await docxFile.arrayBuffer());
        const newDocx = await generateDocx(srcBytes, flat);
        docxPath = `contracts/${contract_id}/v${contract.current_version ?? 1}-${Date.now()}.docx`;
        const { error: upErr } = await supabase.storage.from('contracts').upload(docxPath, newDocx, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        });
        if (upErr) throw upErr;
      }
    }

    // --- 2) Final PDF of the main contract ------------------------------
    // Overlay rules: 'word' never overlays, 'pdf' always overlays, 'auto' overlays only when we
    // render from HTML (no DOCX template) – the DOCX/Word path is expected to ship its own CI.
    const overlay =
      mode === 'pdf' ? true :
      mode === 'word' ? false :
      !hasDocxTemplate;

    const pdfBytes = await renderHtmlPdf(contract.body_html ?? '', flat, letterheadBytes, overlay);
    const pdfPath = `contracts/${contract_id}/v${contract.current_version ?? 1}-${Date.now()}.pdf`;
    const { error: pdfErr } = await supabase.storage.from('contracts').upload(pdfPath, pdfBytes, {
      contentType: 'application/pdf', upsert: true,
    });
    if (pdfErr) throw pdfErr;

    // --- 3) Merged PDF with attachments ---------------------------------
    const parts: Uint8Array[] = [pdfBytes];
    for (const a of atts ?? []) {
      if (!a.storage_path) continue;
      if (a.mime_type && !a.mime_type.includes('pdf')) continue;
      const { data: f } = await supabase.storage.from('contracts').download(a.storage_path);
      if (f) parts.push(new Uint8Array(await f.arrayBuffer()));
    }
    const mergedBytes = await mergePdfs(parts);
    const mergedPath = `contracts/${contract_id}/v${contract.current_version ?? 1}-${Date.now()}-merged.pdf`;
    const { error: mErr } = await supabase.storage.from('contracts').upload(mergedPath, mergedBytes, {
      contentType: 'application/pdf', upsert: true,
    });
    if (mErr) throw mErr;

    // Persist + snapshot
    await supabase.from('contracts').update({
      pdf_path: pdfPath,
      docx_path: docxPath,
      merged_pdf_path: mergedPath,
    }).eq('id', contract_id);

    await supabase.from('contract_versions').insert({
      contract_id, version: contract.current_version ?? 1,
      body_html: contract.body_html, pdf_path: pdfPath,
      snapshot: { docx_path: docxPath, merged_pdf_path: mergedPath, letterhead_id: lhRow?.id ?? null, mode },
    });

    return new Response(JSON.stringify({
      ok: true,
      pdf_path: pdfPath,
      docx_path: docxPath,
      merged_pdf_path: mergedPath,
      letterhead_used: lhRow?.id ?? null,
      mode,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
