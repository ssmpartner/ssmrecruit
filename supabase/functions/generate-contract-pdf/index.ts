// Generates a PDF from a contract's body_html and overlays it on the active letterhead PDF.
// Pure server-side, uses pdf-lib via esm.sh for HTML-to-PDF we use a minimal approach:
// render simple HTML with a basic engine (pdf-lib supports drawing text only, so we strip HTML to text blocks).
// For richer rendering, the body_html is laid over the letterhead as wrapped paragraphs.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { contract_id } = await req.json();
    if (!contract_id) return new Response(JSON.stringify({ error: 'contract_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: contract, error: cErr } = await supabase.from('contracts').select('*').eq('id', contract_id).single();
    if (cErr || !contract) throw cErr || new Error('Contract not found');

    // HTML zu plaintext (sehr einfach, hält Absätze)
    const text = String(contract.body_html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h\d>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    // Briefpapier laden
    const { data: lh } = await supabase.from('contract_letterhead').select('*').eq('is_active', true).maybeSingle();
    let basePdf: PDFDocument;
    let letterheadBytes: Uint8Array | null = null;
    if (lh?.storage_path) {
      const { data: file } = await supabase.storage.from('contracts').download(lh.storage_path);
      if (file) letterheadBytes = new Uint8Array(await file.arrayBuffer());
    }

    if (letterheadBytes) {
      basePdf = await PDFDocument.load(letterheadBytes);
    } else {
      basePdf = await PDFDocument.create();
      basePdf.addPage([595, 842]); // A4
    }

    const font = await basePdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await basePdf.embedFont(StandardFonts.HelveticaBold);

    const margin = 60;
    const fontSize = 11;
    const lineHeight = 16;

    let pageIndex = 0;
    let page = basePdf.getPage(0);
    let { width, height } = page.getSize();
    let y = height - margin - 80; // unter Kopfzeile

    const wrap = (s: string, maxWidth: number, f = font, size = fontSize) => {
      const words = s.split(/\s+/);
      const lines: string[] = [];
      let cur = '';
      for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        if (f.widthOfTextAtSize(test, size) > maxWidth) {
          if (cur) lines.push(cur);
          cur = w;
        } else cur = test;
      }
      if (cur) lines.push(cur);
      return lines;
    };

    const ensureSpace = async () => {
      if (y < margin + 60) {
        pageIndex += 1;
        if (letterheadBytes && pageIndex < basePdf.getPageCount()) {
          page = basePdf.getPage(pageIndex);
        } else if (letterheadBytes) {
          // Briefpapier hat keine weitere Seite – kopiere erste Seite als Vorlage
          const [copied] = await basePdf.copyPages(await PDFDocument.load(letterheadBytes), [0]);
          basePdf.addPage(copied);
          page = basePdf.getPage(basePdf.getPageCount() - 1);
        } else {
          page = basePdf.addPage([595, 842]);
        }
        const sz = page.getSize();
        width = sz.width; height = sz.height;
        y = height - margin - 80;
      }
    };

    const paragraphs = text.split(/\n\s*\n/);
    for (const para of paragraphs) {
      const lines = wrap(para.replace(/\n/g, ' '), width - 2 * margin);
      for (const line of lines) {
        await ensureSpace();
        page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
        y -= lineHeight;
      }
      y -= lineHeight * 0.5;
    }

    const bytes = await basePdf.save();
    const path = `contracts/${contract_id}/v${contract.current_version ?? 1}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from('contracts').upload(path, bytes, {
      contentType: 'application/pdf', upsert: true,
    });
    if (upErr) throw upErr;

    await supabase.from('contracts').update({ pdf_path: path }).eq('id', contract_id);
    await supabase.from('contract_versions').insert({
      contract_id, version: contract.current_version ?? 1,
      body_html: contract.body_html, pdf_path: path, snapshot: { exported: true },
    });

    return new Response(JSON.stringify({ ok: true, path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
