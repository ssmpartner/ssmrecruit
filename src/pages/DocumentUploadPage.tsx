import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, AlertCircle, Upload, FileText, X, File } from 'lucide-react';

const documentTypes = [
  { value: 'cv', label: 'Lebenslauf (CV)' },
  { value: 'certificate', label: 'Zertifikate / Diplome' },
  { value: 'reference', label: 'Arbeitszeugnisse' },
  { value: 'id', label: 'Ausweis / Pass' },
  { value: 'other', label: 'Sonstiges' },
];

interface UploadedFile {
  file: File;
  type: string;
  uploading: boolean;
  done: boolean;
  error?: string;
}

export default function DocumentUploadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [leadName, setLeadName] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [existingUploads, setExistingUploads] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError('Ungültiger Link.'); setLoading(false); return; }
    loadRequest();
  }, [token]);

  async function loadRequest() {
    const { data, error: err } = await supabase
      .from('document_requests')
      .select('*')
      .eq('token', token!)
      .single();

    if (err || !data) { setError('Dieser Link ist ungültig oder abgelaufen.'); setLoading(false); return; }

    // Check if link is expired (48h)
    const expiresAt = (data as any).expires_at;
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      setError('Dieser Upload-Link ist abgelaufen. Bitte fordern Sie einen neuen Link an.');
      setLoading(false);
      return;
    }

    setRequestId(data.id);
    setLeadId(data.lead_id);

    const { data: lead } = await supabase.from('leads').select('name').eq('id', data.lead_id).single();
    if (lead) setLeadName(lead.name);

    // Load existing uploads
    const { data: uploads } = await supabase
      .from('document_uploads')
      .select('*')
      .eq('request_id', data.id);
    if (uploads) setExistingUploads(uploads);

    setLoading(false);
  }

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles).map(f => ({
      file: f,
      type: guessType(f.name),
      uploading: false,
      done: false,
    }));
    setFiles(prev => [...prev, ...arr]);
  };

  function guessType(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('cv') || lower.includes('lebenslauf')) return 'cv';
    if (lower.includes('zeugnis') || lower.includes('reference')) return 'reference';
    if (lower.includes('zertifikat') || lower.includes('diplom') || lower.includes('certificate')) return 'certificate';
    return 'other';
  }

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const setFileType = (idx: number, type: string) => setFiles(prev => prev.map((f, i) => i === idx ? { ...f, type } : f));

  async function handleUpload() {
    if (files.length === 0) { setError('Bitte wählen Sie mindestens eine Datei aus.'); return; }
    setSubmitting(true);
    setError('');

    let allOk = true;
    for (let i = 0; i < files.length; i++) {
      if (files[i].done) continue;
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: true } : f));

      const file = files[i].file;
      const ext = file.name.split('.').pop() || 'bin';
      const filePath = `${leadId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('lead-documents')
        .upload(filePath, file);

      if (uploadErr) {
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: false, error: 'Upload fehlgeschlagen' } : f));
        allOk = false;
        continue;
      }

      // Record in DB
      await supabase.from('document_uploads').insert({
        request_id: requestId,
        lead_id: leadId,
        file_name: file.name,
        file_type: files[i].type,
        file_path: filePath,
        file_size: file.size,
      });

      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: false, done: true } : f));
    }

    if (allOk) {
      // Update request status
      await supabase.from('document_requests').update({ status: 'completed' }).eq('id', requestId);

      // Notify recruiter
      await supabase.from('notifications').insert({
        title: 'Dokumente hochgeladen',
        type: 'document',
        description: `${leadName || 'Ein Lead'} hat ${files.length} Dokument(e) hochgeladen.`,
        lead_id: leadId,
      });

      await supabase.from('activities').insert({
        id: crypto.randomUUID(),
        lead_id: leadId,
        type: 'edit',
        description: `${files.length} Dokument(e) vom Lead hochgeladen`,
        user: 'System',
      });

      setCompleted(true);
    }
    setSubmitting(false);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  if (completed) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Upload abgeschlossen</h1>
        <p className="text-slate-600">Ihre Dokumente wurden erfolgreich hochgeladen. Vielen Dank!</p>
      </div>
    </div>
  );

  if (error && !requestId) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Link ungültig</h1>
        <p className="text-slate-600">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold">SSM Recruit – Dokumente</h1>
            <p className="text-blue-100 mt-1">
              {leadName ? `Hallo ${leadName.split(' ')[0]}, b` : 'B'}itte laden Sie die angeforderten Dokumente hoch.
            </p>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {/* Existing uploads */}
            {existingUploads.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700">Bereits hochgeladen</h3>
                {existingUploads.map(u => (
                  <div key={u.id} className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="text-sm text-slate-700">{u.file_name}</span>
                    <span className="text-xs text-slate-500 ml-auto">{documentTypes.find(d => d.value === u.file_type)?.label || u.file_type}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">Dateien hierhin ziehen oder klicken</p>
              <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, DOCX (max. 10 MB pro Datei)</p>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
                onChange={e => addFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Ausgewählte Dateien</h3>
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {f.done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : f.uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
                    ) : (
                      <File className="h-5 w-5 text-slate-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{f.file.name}</p>
                      <p className="text-xs text-slate-500">{(f.file.size / 1024).toFixed(0)} KB</p>
                      {f.error && <p className="text-xs text-red-600">{f.error}</p>}
                    </div>
                    <select
                      value={f.type}
                      onChange={e => setFileType(idx, e.target.value)}
                      disabled={f.done}
                      className="h-8 rounded border border-slate-200 bg-white px-2 text-xs"
                    >
                      {documentTypes.map(dt => (
                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                      ))}
                    </select>
                    {!f.done && (
                      <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={submitting || files.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitting ? 'Wird hochgeladen...' : `${files.length} Datei(en) hochladen`}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">© SSM Recruit • Ihre Daten werden vertraulich behandelt.</p>
      </div>
    </div>
  );
}
