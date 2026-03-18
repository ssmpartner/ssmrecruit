import { useState } from 'react';
import { Search, Loader2, GitMerge, Eye } from 'lucide-react';
import { useLeads } from '@/context/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Lead } from '@/lib/mock-data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DuplicatePair {
  leadId1: string;
  leadId2: string;
  confidence: number;
  reason: string;
}

export default function DuplicateLeads() {
  const { leads, mergeLead, agencies, employees } = useLeads();
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [mergeDialog, setMergeDialog] = useState<{ pair: DuplicatePair; keepId: string } | null>(null);

  const activeLeads = leads.filter(l => l.lifecycle === 'active');

  const scanForDuplicates = async () => {
    setLoading(true);
    try {
      const leadsForScan = activeLeads.map(l => ({
        id: l.id, name: l.name, email: l.email, phone: l.phone,
        plz: l.plz, city: l.city, position: l.position,
      }));

      const { data, error } = await supabase.functions.invoke('detect-duplicates', {
        body: { leads: leadsForScan },
      });

      if (error) throw error;
      setDuplicates(data?.duplicates || []);
      setScanned(true);
      if (!data?.duplicates?.length) {
        toast.success('Keine Duplikate gefunden!');
      } else {
        toast.info(`${data.duplicates.length} potenzielle Duplikat(e) gefunden`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Fehler bei der Duplikat-Erkennung');
    } finally {
      setLoading(false);
    }
  };

  const getLead = (id: string) => leads.find(l => l.id === id);

  const handleMerge = (pair: DuplicatePair, keepId: string) => {
    const removeId = keepId === pair.leadId1 ? pair.leadId2 : pair.leadId1;
    const keepLead = getLead(keepId);
    const removeLead = getLead(removeId);
    if (!keepLead || !removeLead) return;

    // Merge: keep the more complete data
    const merged: Partial<Lead> = {};
    if (!keepLead.phone && removeLead.phone) merged.phone = removeLead.phone;
    if (!keepLead.address && removeLead.address) merged.address = removeLead.address;
    if (!keepLead.position && removeLead.position) merged.position = removeLead.position;
    if (keepLead.notes && removeLead.notes) {
      merged.notes = `${keepLead.notes}\n---\nZusammengeführt von ${removeLead.name}:\n${removeLead.notes}`;
    } else if (!keepLead.notes && removeLead.notes) {
      merged.notes = removeLead.notes;
    }

    mergeLead(keepId, removeId, merged);
    setDuplicates(prev => prev.filter(d => d !== pair));
    setMergeDialog(null);
    toast.success('Leads erfolgreich zusammengeführt');
  };

  const LeadCard = ({ lead, label }: { lead: Lead; label: string }) => {
    const agency = agencies.find(a => a.id === lead.agencyId);
    const employee = employees.find(e => e.id === lead.employeeId);
    return (
      <div className="rounded-lg border p-3 space-y-1.5 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-semibold text-sm">{lead.name}</p>
        <p className="text-xs text-muted-foreground">{lead.email}</p>
        <p className="text-xs text-muted-foreground">{lead.phone || '—'}</p>
        <p className="text-xs">{lead.plz} {lead.city}</p>
        <p className="text-xs text-muted-foreground">{lead.position || '—'}</p>
        <p className="text-xs text-muted-foreground">Agentur: {agency?.name || '—'}</p>
        <p className="text-xs text-muted-foreground">Mitarbeiter: {employee?.name || '—'}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            KI-basierte Erkennung von doppelten Leads basierend auf Name, E-Mail, Telefon und Standort.
          </p>
        </div>
        <Button onClick={scanForDuplicates} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? 'Analyse läuft...' : 'Duplikate suchen'}
        </Button>
      </div>

      {scanned && duplicates.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-lg font-semibold">✅ Keine Duplikate gefunden</p>
          <p className="text-sm text-muted-foreground mt-1">Alle aktiven Leads sind einzigartig.</p>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="space-y-3">
          {duplicates.map((pair, i) => {
            const lead1 = getLead(pair.leadId1);
            const lead2 = getLead(pair.leadId2);
            if (!lead1 || !lead2) return null;

            return (
              <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={pair.confidence >= 80 ? 'destructive' : 'secondary'} className="text-xs">
                      {pair.confidence}% Übereinstimmung
                    </Badge>
                    <span className="text-xs text-muted-foreground">{pair.reason}</span>
                  </div>
                </div>

                <div className="flex gap-3 mb-3">
                  <LeadCard lead={lead1} label="Lead A" />
                  <LeadCard lead={lead2} label="Lead B" />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMergeDialog({ pair, keepId: lead1.id })}>
                    <GitMerge className="h-3.5 w-3.5" /> A behalten
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMergeDialog({ pair, keepId: lead2.id })}>
                    <GitMerge className="h-3.5 w-3.5" /> B behalten
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!scanned && !loading && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-lg font-semibold">Duplikate erkennen</p>
          <p className="text-sm text-muted-foreground mt-1">Klicken Sie auf «Duplikate suchen», um die KI-Analyse zu starten.</p>
        </div>
      )}

      <AlertDialog open={!!mergeDialog} onOpenChange={open => !open && setMergeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leads zusammenführen?</AlertDialogTitle>
            <AlertDialogDescription>
              {mergeDialog && (() => {
                const keepLead = getLead(mergeDialog.keepId);
                const removeId = mergeDialog.keepId === mergeDialog.pair.leadId1 ? mergeDialog.pair.leadId2 : mergeDialog.pair.leadId1;
                const removeLead = getLead(removeId);
                return `"${keepLead?.name}" wird beibehalten. "${removeLead?.name}" wird als gelöscht markiert. Fehlende Daten werden übernommen.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => mergeDialog && handleMerge(mergeDialog.pair, mergeDialog.keepId)}>
              Zusammenführen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
