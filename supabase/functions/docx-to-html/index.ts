import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import mammoth from 'npm:mammoth@1.8.0'
import { Buffer } from 'node:buffer'

// Wandelt eine DOCX-Datei aus dem Bucket "contracts" in sauberes HTML um.
// Ueberschriften, Absaetze, Fettschrift, Listen und Tabellen bleiben erhalten.
// Bilder werden als Data-URLs eingebettet (mammoth-Standard ueber convertImage).

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth: nur eingeloggte Nutzer duerfen konvertieren
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Nutzer validieren
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Ungueltige Sitzung' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Ungueltiger Request-Body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const documentId = typeof body?.document_id === 'string' ? body.document_id : null
    const directPath = typeof body?.path === 'string' ? body.path : null
    if (!documentId && !directPath) {
      return new Response(JSON.stringify({ error: 'document_id oder path erforderlich' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Speicherpfad bestimmen: aus dem Bibliotheksdokument oder direkt
    let storagePath = directPath
    if (documentId) {
      const { data: doc, error: docError } = await admin
        .from('contract_documents')
        .select('id, name, template_storage_path, template_filename, original_storage_path, original_filename')
        .eq('id', documentId)
        .single()
      if (docError || !doc) {
        return new Response(JSON.stringify({ error: 'Bibliotheksdokument nicht gefunden' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      // Bevorzugt die bearbeitbare DOCX-Vorlage, sonst Original (falls DOCX)
      const cand = doc.template_storage_path || doc.original_storage_path
      const candName = doc.template_storage_path ? doc.template_filename : doc.original_filename
      if (!cand || !(candName || cand).toLowerCase().endsWith('.docx')) {
        return new Response(JSON.stringify({ error: 'Keine DOCX-Datei hinterlegt – Konvertierung nicht moeglich' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      storagePath = cand
    }

    if (!storagePath!.toLowerCase().endsWith('.docx')) {
      return new Response(JSON.stringify({ error: 'Nur DOCX-Dateien koennen konvertiert werden' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Datei laden
    const { data: fileData, error: dlError } = await admin.storage
      .from('contracts')
      .download(storagePath!)
    if (dlError || !fileData) {
      return new Response(JSON.stringify({ error: 'Datei konnte nicht geladen werden: ' + (dlError?.message || 'unbekannt') }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())

    // mammoth: DOCX -> HTML
    // Stil-Mapping: Ueberschriften, Listen, Tabellen sauber mappen
    const styleMap = [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='Titel'] => h1:fresh",
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Ueberschrift 1'] => h1:fresh",
      "p[style-name='Überschrift 1'] => h1:fresh",
      "p[style-name='Ueberschrift 2'] => h2:fresh",
      "p[style-name='Überschrift 2'] => h2:fresh",
      "p[style-name='Ueberschrift 3'] => h3:fresh",
      "p[style-name='Überschrift 3'] => h3:fresh",
      "r[style-name='Strong'] => strong",
    ]

    const result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap,
        // Bilder als eingebettete Data-URLs uebernehmen
        convertImage: mammoth.images.imgElement(async (image: any) => {
          const buffer = await image.read('base64')
          return { src: `data:${image.contentType};base64,${buffer}` }
        }),
      },
    )

    const html: string = result.value || ''
    const warnings = (result.messages || [])
      .filter((m: any) => m.type === 'warning')
      .map((m: any) => m.message)

    return new Response(JSON.stringify({
      html,
      warnings,
      storage_path: storagePath,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('docx-to-html Fehler:', e)
    return new Response(JSON.stringify({ error: 'Konvertierung fehlgeschlagen: ' + (e?.message || String(e)) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
