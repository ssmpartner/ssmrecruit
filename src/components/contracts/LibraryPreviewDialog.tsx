import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileWarning, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  docName: string;
  originalPath: string | null;
  originalFilename: string | null;
  templatePath: string | null;
  templateFilename: string | null;
}

function isPdf(filename: string | null, path: string | null) {
  const f = (filename || path || '').toLowerCase();
  return f.endsWith('.pdf');
}

export default function LibraryPreviewDialog({
  open, onClose, docName,
  originalPath, originalFilename, templatePath, templateFilename,
}: Props) {
  const hasOriginal = !!originalPath;
  const hasTemplate = !!templatePath;
  const [which, setWhich] = useState<'original' | 'template'>(hasTemplate ? 'template' : 'original');
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const path = which === 'template' ? templatePath : originalPath;
  const filename = which === 'template' ? templateFilename : originalFilename;
  const pdf = isPdf(filename, path);

  useEffect(() => {
    if (open) setWhich(hasTemplate ? 'template' : 'original');
  }, [open, hasTemplate]);

  useEffect(() => {
    if (!open || !path) { setUrl(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.storage.from('contracts').createSignedUrl(path, 600);
      if (cancelled) return;
      if (error || !data) { toast.error('Vorschau konnte nicht geladen werden.'); setUrl(null); }
      else setUrl(data.signedUrl);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, path]);

  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'dokument';
    a.target = '_blank';
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Eye className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{docName}</span>
          </DialogTitle>
        </DialogHeader>

        {hasOriginal && hasTemplate && (
          <div className="flex gap-2">
            <Button size="sm" variant={which === 'template' ? 'default' : 'outline'} onClick={() => setWhich('template')}>
              Vorlage {templateFilename ? `(${templateFilename})` : ''}
            </Button>
            <Button size="sm" variant={which === 'original' ? 'default' : 'outline'} onClick={() => setWhich('original')}>
              Original {originalFilename ? `(${originalFilename})` : ''}
            </Button>
          </div>
        )}

        <div className="flex-1 min-h-0 rounded border bg-muted/30 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Lade Vorschau…</div>
          ) : !path ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FileWarning className="h-8 w-8 opacity-40" />
              Für diese Variante ist keine Datei hinterlegt.
            </div>
          ) : pdf && url ? (
            <iframe src={url} title={`Vorschau ${docName}`} className="w-full h-full" />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <FileWarning className="h-10 w-10 text-muted-foreground opacity-50" />
              <div className="text-sm font-medium">Direkte Vorschau nicht möglich</div>
              <p className="text-xs text-muted-foreground max-w-md">
                {filename || 'Diese Datei'} ist kein PDF und kann im Browser nicht direkt angezeigt werden.
                Bitte laden Sie die Datei herunter, um sie anzusehen.
              </p>
              {url && (
                <Button onClick={download} className="gap-1.5 mt-1">
                  <Download className="h-4 w-4" /> {filename || 'Datei'} herunterladen
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
