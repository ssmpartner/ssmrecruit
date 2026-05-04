import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Known candidate fields that map directly to DB columns
const KNOWN_CANDIDATE_FIELDS: Record<string, string> = {
  salutation: 'salutation', anrede: 'salutation',
  first_name: 'first_name', vorname: 'first_name',
  last_name: 'last_name', nachname: 'last_name',
  birth_date: 'birth_date', geburtsdatum: 'birth_date',
  address: 'address', strasse: 'address', adresse: 'address',
  zip: 'zip', plz: 'zip', postleitzahl: 'zip',
  city: 'city', ort: 'city', wohnort: 'city',
  country: 'country', land: 'country',
  email: 'email', 'e-mail': 'email', e_mail: 'email',
  phone: 'phone', telefon: 'phone', phone_number: 'phone',
};

// Known consent fields
const CONSENT_FIELDS = ['consent_privacy', 'datenschutz', 'privacy', 'consent_email_contract', 'email_consent', 'vertragsunterlagen'];

// Fields to skip (not store as custom_fields)
const SKIP_FIELDS = ['captcha', 'captcha_token', 'g-recaptcha-response', 'h-captcha-response', 'cf-turnstile-response'];

// Document field names
const DOC_FIELDS = {
  cv: ['cv', 'lebenslauf', 'resume'],
  motivation_letter: ['motivation_letter', 'motivationsschreiben', 'cover_letter', 'anschreiben'],
  attachments: ['attachments', 'beilagen', 'weitere_beilagen', 'additional_documents', 'sonstige'],
};

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_EXTS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 20;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const contentType = req.headers.get('content-type') || '';
    let body: Record<string, any> = {};
    let fileUploads: { fieldName: string; fileName: string; data: Uint8Array; contentType: string }[] = [];

    // Handle both JSON and multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          if (fileUploads.length >= MAX_FILES) {
            console.warn('Too many files in upload, ignoring extra');
            continue;
          }
          const ext = (value.name.split('.').pop() || '').toLowerCase();
          if (!ALLOWED_MIME_TYPES.has(value.type) || !ALLOWED_EXTS.has(ext)) {
            console.warn(`Rejected file (mime/ext): ${value.name} type=${value.type}`);
            continue;
          }
          if (value.size > MAX_FILE_BYTES) {
            console.warn(`Rejected file (size>${MAX_FILE_BYTES}): ${value.name}`);
            continue;
          }
          const arrayBuffer = await value.arrayBuffer();
          fileUploads.push({
            fieldName: key.toLowerCase(),
            fileName: value.name,
            data: new Uint8Array(arrayBuffer),
            contentType: value.type,
          });
        } else {
          body[key.toLowerCase()] = value;
        }
      }
    } else {
      body = await req.json();
      // Normalize keys to lowercase
      const normalized: Record<string, any> = {};
      for (const [k, v] of Object.entries(body)) {
        normalized[k.toLowerCase()] = v;
      }
      body = normalized;
    }

    console.log('Application webhook payload keys:', Object.keys(body));
    console.log('File uploads:', fileUploads.map(f => `${f.fieldName}: ${f.fileName}`));

    // 1. Extract candidate fields
    const candidate: Record<string, string> = {
      salutation: '', first_name: '', last_name: '', birth_date: '',
      address: '', zip: '', city: '', country: 'Schweiz',
      email: '', phone: '',
    };
    const customFields: Record<string, any> = {};
    let consentPrivacy = false;
    let consentEmailContract = false;
    const processedKeys = new Set<string>();

    for (const [key, value] of Object.entries(body)) {
      const lowerKey = key.toLowerCase().trim();

      // Skip captcha fields
      if (SKIP_FIELDS.includes(lowerKey)) {
        processedKeys.add(key);
        continue;
      }

      // Check if it's a known candidate field
      const mappedField = KNOWN_CANDIDATE_FIELDS[lowerKey];
      if (mappedField) {
        candidate[mappedField] = String(value || '').trim();
        processedKeys.add(key);
        continue;
      }

      // Check consent fields
      if (CONSENT_FIELDS.some(cf => lowerKey.includes(cf))) {
        if (lowerKey.includes('email') || lowerKey.includes('vertrag')) {
          consentEmailContract = value === true || value === 'true' || value === '1' || value === 'on';
        } else {
          consentPrivacy = value === true || value === 'true' || value === '1' || value === 'on';
        }
        processedKeys.add(key);
        continue;
      }

      // Everything else goes to custom_fields (except file-related keys handled separately)
      const isDocField = Object.values(DOC_FIELDS).flat().some(df => lowerKey.includes(df));
      if (!isDocField && typeof value !== 'object') {
        customFields[lowerKey] = value;
        processedKeys.add(key);
      }
    }

    // 2. Upload documents
    const applicationId = crypto.randomUUID();
    let cvPath: string | null = null;
    let motivationLetterPath: string | null = null;
    const attachmentPaths: string[] = [];

    for (const upload of fileUploads) {
      const ext = upload.fileName.split('.').pop() || 'bin';
      const storagePath = `${applicationId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('application-documents')
        .upload(storagePath, upload.data, { contentType: upload.contentType });

      if (uploadErr) {
        console.error(`Upload error for ${upload.fileName}:`, uploadErr);
        continue;
      }

      // Classify document
      const fieldLower = upload.fieldName;
      if (DOC_FIELDS.cv.some(f => fieldLower.includes(f))) {
        cvPath = storagePath;
      } else if (DOC_FIELDS.motivation_letter.some(f => fieldLower.includes(f))) {
        motivationLetterPath = storagePath;
      } else {
        attachmentPaths.push(storagePath);
      }
    }

    // Handle base64 encoded files in JSON payload
    for (const [key, value] of Object.entries(body)) {
      if (processedKeys.has(key)) continue;
      if (typeof value === 'object' && value !== null && value.data && value.filename) {
        try {
          const ext = ((value.filename as string).split('.').pop() || '').toLowerCase();
          const ct = (value.contentType as string) || 'application/octet-stream';
          if (!ALLOWED_EXTS.has(ext) || !ALLOWED_MIME_TYPES.has(ct)) {
            console.warn(`Rejected base64 file (mime/ext): ${value.filename}`);
            continue;
          }
          const binaryData = Uint8Array.from(atob(value.data), c => c.charCodeAt(0));
          if (binaryData.byteLength > MAX_FILE_BYTES) {
            console.warn(`Rejected base64 file (size): ${value.filename}`);
            continue;
          }
          const storagePath = `${applicationId}/${crypto.randomUUID()}.${ext}`;

          await supabase.storage
            .from('application-documents')
            .upload(storagePath, binaryData, { contentType: ct });

          const fieldLower = key.toLowerCase();
          if (DOC_FIELDS.cv.some(f => fieldLower.includes(f))) {
            cvPath = storagePath;
          } else if (DOC_FIELDS.motivation_letter.some(f => fieldLower.includes(f))) {
            motivationLetterPath = storagePath;
          } else {
            attachmentPaths.push(storagePath);
          }
        } catch (e) {
          console.error(`Base64 upload error for ${key}:`, e);
        }
      }
    }

    // 3. Determine status
    let status = 'complete';
    const hasCaptcha = body['captcha_valid'] !== undefined || body['captcha_token'] !== undefined;
    const captchaValid = body['captcha_valid'] === true || body['captcha_valid'] === 'true';

    if (hasCaptcha && !captchaValid) {
      status = 'spam_suspected';
    } else if (!candidate.first_name || !candidate.last_name || !candidate.email) {
      status = 'incomplete';
    } else if (!cvPath && fileUploads.length === 0) {
      status = 'incomplete';
    }

    // 4. Resolve agency if desired_region provided
    let agencyId: string | null = null;
    const desiredRegion = customFields['wunschagentur'] || customFields['desired_region'] || customFields['region'] || '';
    if (desiredRegion) {
      const { data: agency } = await supabase
        .from('agencies')
        .select('id')
        .ilike('name', `%${desiredRegion}%`)
        .limit(1)
        .single();
      if (agency) agencyId = agency.id;
    }

    // 5. Insert application
    const { data, error } = await supabase.from('applications').insert({
      id: applicationId,
      salutation: candidate.salutation,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      birth_date: candidate.birth_date,
      address: candidate.address,
      zip: candidate.zip,
      city: candidate.city,
      country: candidate.country,
      email: candidate.email,
      phone: candidate.phone,
      cv_path: cvPath,
      motivation_letter_path: motivationLetterPath,
      attachment_paths: attachmentPaths,
      custom_fields: customFields,
      consent_privacy: consentPrivacy,
      consent_email_contract: consentEmailContract,
      status,
      agency_id: agencyId,
      source: String(body['source'] || body['form_source'] || 'website'),
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
    }).select().single();

    if (error) {
      console.error('Error inserting application:', error);
      throw new Error('APPLICATION_INSERT_FAILED');
    }

    // 6. Create lead from application
    let leadId: string | null = null;
    try {
      const fullName = `${candidate.first_name} ${candidate.last_name}`.trim();
      if (fullName && candidate.email) {
        // Check for existing lead (duplicate)
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('email', candidate.email)
          .eq('lead_lifecycle', 'active')
          .limit(1)
          .single();

        if (existing) {
          leadId = existing.id;
        } else {
          // Find default agency/employee
          const { data: hauptsitz } = await supabase
            .from('agencies')
            .select('id')
            .ilike('name', '%hauptsitz%')
            .limit(1)
            .single();
          const finalAgencyId = agencyId || hauptsitz?.id || (await supabase.from('agencies').select('id').limit(1).single()).data?.id;
          const { data: empId } = await supabase.rpc('resolve_employee_by_agency', { _agency_id: finalAgencyId });
          const employeeId = empId || (await supabase.from('employees').select('id').limit(1).single()).data?.id;

          // Check for potential duplicates by phone or name
          let isDuplicate = false;
          let duplicateNote = '';
          let assignAgencyId = finalAgencyId;
          let assignEmployeeId = employeeId;

          if (candidate.phone && candidate.phone.length >= 8) {
            const { data: phoneMatch } = await supabase
              .from('leads')
              .select('id, name')
              .eq('lead_lifecycle', 'active')
              .limit(50);
            if (phoneMatch) {
              const normPhone = candidate.phone.replace(/[\s\-\.\(\)]/g, '');
              const match = phoneMatch.find((l: any) => l.phone && l.phone.replace(/[\s\-\.\(\)]/g, '') === normPhone);
              if (match) {
                isDuplicate = true;
                duplicateNote = `⚠️ Mögliches Duplikat von "${match.name}" (ID: ${match.id}). `;
                if (hauptsitz) {
                  assignAgencyId = hauptsitz.id;
                  const { data: hEmp } = await supabase.rpc('resolve_employee_by_agency', { _agency_id: hauptsitz.id });
                  if (hEmp) assignEmployeeId = hEmp;
                }
              }
            }
          }

          if (assignAgencyId && assignEmployeeId) {
            leadId = crypto.randomUUID();
            await supabase.from('leads').insert({
              id: leadId,
              name: fullName,
              email: candidate.email,
              phone: candidate.phone,
              city: candidate.city,
              plz: candidate.zip,
              address: candidate.address,
              source: 'website',
              status: 'new',
              agency_id: assignAgencyId,
              employee_id: assignEmployeeId,
              notes: duplicateNote + `Bewerbung eingegangen via Website-Formular`,
              position: candidate.salutation,
            });

            await supabase.from('activities').insert({
              id: crypto.randomUUID(),
              lead_id: leadId,
              type: 'status_change',
              description: `Bewerbung automatisch via Website-Formular importiert`,
              user: 'System',
            });

            if (isDuplicate) {
              await supabase.from('notifications').insert({
                title: 'Duplikat erkannt – Bewerbung zur Prüfung',
                type: 'duplicate_detected',
                description: `${fullName} wurde als mögliches Duplikat erkannt und dem Hauptsitz zugewiesen.`,
                lead_id: leadId,
              });
            }
          }
        }

        // Update application with lead_id
        if (leadId) {
          await supabase.from('applications').update({ lead_id: leadId }).eq('id', applicationId);
        }
      }
    } catch (e) {
      console.error('Lead creation error (non-fatal):', e);
    }

    // 7. Notification
    await supabase.from('notifications').insert({
      title: 'Neue Bewerbung eingegangen',
      type: 'new_lead',
      description: `${candidate.first_name} ${candidate.last_name} hat sich beworben. Status: ${status}`,
      lead_id: leadId,
    });

    console.log(`Application ${applicationId} saved successfully. Status: ${status}`);

    return new Response(JSON.stringify({
      success: true,
      application_id: applicationId,
      lead_id: leadId,
      status,
      message: status === 'complete'
        ? 'Bewerbung erfolgreich übermittelt'
        : status === 'incomplete'
          ? 'Bewerbung gespeichert (unvollständig)'
          : 'Bewerbung zur Prüfung gespeichert',
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Application webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
