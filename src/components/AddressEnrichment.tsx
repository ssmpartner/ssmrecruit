import { useState, useCallback } from 'react';
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLeads } from '@/context/useLeads';
import { lookupPlz } from '@/lib/swiss-plz';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface EnrichmentResult {
  leadId: string;
  leadName: string;
  status: 'updated' | 'skipped' | 'error';
  details: string;
}

export default function AddressEnrichment() {
  const { leads, updateLead } = useLeads();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<EnrichmentResult[]>([]);

  const activeLeads = leads.filter(l => l.lifecycle === 'active');

  // Leads that are missing city, canton, or PLZ but have SOME address info
  const incompleteLeads = activeLeads.filter(l => {
    const hasPartial = l.plz || l.city || l.address || l.cantonCode;
    const isMissing = !l.city || !l.cantonCode || !l.plz;
    return hasPartial && isMissing;
  });

  // Leads with PLZ but no city/canton — can resolve locally
  const plzOnlyLeads = activeLeads.filter(l => l.plz && (!l.city || !l.cantonCode));

  const totalEnrichable = new Set([
    ...incompleteLeads.map(l => l.id),
    ...plzOnlyLeads.map(l => l.id),
  ]);

  const runEnrichment = useCallback(async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);

    const toProcess = activeLeads.filter(l => totalEnrichable.has(l.id));
    const total = toProcess.length;
    const newResults: EnrichmentResult[] = [];

    for (let i = 0; i < toProcess.length; i++) {
      const lead = toProcess[i];
      setProgress(Math.round(((i + 1) / total) * 100));

      try {
        // Step 1: Try local PLZ lookup first
        if (lead.plz && (!lead.city || !lead.cantonCode)) {
          const local = lookupPlz(lead.plz);
          if (local) {
            const updates: Record<string, string> = {};
            if (!lead.city) updates.city = local.city;
            if (!lead.cantonCode) {
              updates.cantonCode = local.cantonCode;
              updates.canton = local.canton;
            }
            if (Object.keys(updates).length > 0) {
              updateLead(lead.id, updates);
              newResults.push({
                leadId: lead.id,
                leadName: lead.name,
                status: 'updated',
                details: `PLZ-Lookup: ${Object.keys(updates).join(', ')} ergänzt`,
              });
              continue;
            }
          }
        }

        // Step 2: Use Mapbox geocoding for remaining cases
        const query = [lead.address, lead.plz, lead.city].filter(Boolean).join(' ');
        if (query.length < 3) {
          newResults.push({
            leadId: lead.id,
            leadName: lead.name,
            status: 'skipped',
            details: 'Zu wenig Adressdaten für Geocoding',
          });
          continue;
        }

        const { data, error } = await supabase.functions.invoke('geocode-address', {
          body: { query, types: 'address,place' },
        });

        if (error || !data?.suggestions?.length) {
          newResults.push({
            leadId: lead.id,
            leadName: lead.name,
            status: 'skipped',
            details: 'Keine Mapbox-Ergebnisse',
          });
          continue;
        }

        const best = data.suggestions[0];
        const updates: Record<string, string> = {};
        if (!lead.plz && best.plz) updates.plz = best.plz;
        if (!lead.city && best.city) updates.city = best.city;
        if (!lead.cantonCode && best.cantonCode) {
          updates.cantonCode = best.cantonCode;
          updates.canton = best.canton;
        }
        if (!lead.address && best.street) updates.address = best.street;

        if (Object.keys(updates).length > 0) {
          updateLead(lead.id, updates);
          newResults.push({
            leadId: lead.id,
            leadName: lead.name,
            status: 'updated',
            details: `Mapbox: ${Object.keys(updates).join(', ')} ergänzt`,
          });
        } else {
          newResults.push({
            leadId: lead.id,
            leadName: lead.name,
            status: 'skipped',
            details: 'Bereits vollständig',
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        newResults.push({
          leadId: lead.id,
          leadName: lead.name,
          status: 'error',
          details: err instanceof Error ? err.message : 'Unbekannter Fehler',
        });
      }
    }

    setResults(newResults);
    setRunning(false);

    const updated = newResults.filter(r => r.status === 'updated').length;
    toast.success(`Adress-Enrichment abgeschlossen: ${updated} von ${total} Leads aktualisiert`);
  }, [activeLeads, totalEnrichable, updateLead]);

  const updatedCount = results.filter(r => r.status === 'updated').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
          <MapPin className="h-4 w-4" /> Adressen ergänzen
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Adress-Enrichment via Mapbox
          </DialogTitle>
          <DialogDescription>
            Ergänzt fehlende PLZ, Ort und Kanton für alle Leads mit unvollständigen Adressdaten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!running && results.length === 0 && (
            <>
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aktive Leads total</span>
                  <span className="font-medium">{activeLeads.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leads mit fehlenden Adressdaten</span>
                  <span className="font-semibold text-primary">{totalEnrichable.size}</span>
                </div>
              </div>

              {totalEnrichable.size === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Alle Leads haben vollständige Adressdaten.
                </div>
              ) : (
                <button
                  onClick={runEnrichment}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  {totalEnrichable.size} Leads jetzt ergänzen
                </button>
              )}
            </>
          )}

          {running && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enrichment läuft... {progress}%
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {!running && results.length > 0 && (
            <div className="space-y-3">
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" /> {updatedCount} aktualisiert
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  {skippedCount} übersprungen
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" /> {errorCount} Fehler
                  </span>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border divide-y text-sm">
                {results.filter(r => r.status === 'updated').map(r => (
                  <div key={r.leadId} className="px-3 py-2 flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.leadName}</div>
                      <div className="text-xs text-muted-foreground">{r.details}</div>
                    </div>
                  </div>
                ))}
                {results.filter(r => r.status === 'error').map(r => (
                  <div key={r.leadId} className="px-3 py-2 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.leadName}</div>
                      <div className="text-xs text-destructive">{r.details}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setResults([]); setProgress(0); }}
                className="w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                Erneut prüfen
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
