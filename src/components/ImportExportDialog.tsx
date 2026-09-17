import { Download, Upload, MapPin, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onExport: () => void;
  onOpenImport: () => void;
  onOpenEnrichment: () => void;
  showExport: boolean;
  showEnrichment: boolean;
}

interface OptionRow {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
}

export default function ImportExportDialog({ open, onOpenChange, onExport, onOpenImport, onOpenEnrichment, showExport, showEnrichment }: ImportExportDialogProps) {
  const options: OptionRow[] = [];
  if (showExport) {
    options.push({
      key: 'export',
      icon: <Download className="h-4 w-4 text-primary" />,
      title: 'CSV-Export',
      description: 'Die aktuell gefilterten Leads als CSV-Datei herunterladen.',
      action: onExport,
    });
  }
  options.push({
    key: 'import',
    icon: <Upload className="h-4 w-4 text-primary" />,
    title: 'CSV-Import',
    description: 'Leads aus einer CSV-Datei importieren – mit Spaltenzuordnung und Vorschau.',
    action: onOpenImport,
  });
  if (showEnrichment) {
    options.push({
      key: 'enrich',
      icon: <MapPin className="h-4 w-4 text-primary" />,
      title: 'Adressen ergänzen',
      description: 'Fehlende PLZ, Ort und Kanton über Mapbox automatisch ergänzen.',
      action: onOpenEnrichment,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <button
        onClick={() => onOpenChange(true)}
        title="Export / Import"
        aria-label="Export / Import"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary transition-colors"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Export &amp; Import
          </DialogTitle>
          <DialogDescription>
            Wählen Sie eine Aktion für Ihre Leads aus.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-1">
          {options.map(opt => (
            <button
              key={opt.key}
              onClick={() => {
                onOpenChange(false);
                opt.action();
              }}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {opt.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{opt.title}</span>
                <span className="block text-xs text-muted-foreground">{opt.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
