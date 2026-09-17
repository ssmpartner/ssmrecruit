import { useState } from 'react';
import { AlertCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  leadId: string;
  leadName: string;
  queryText?: string;
  queryBy?: string;
  queryAt?: string;
  onResolved?: () => void;
}

export default function ControllingQueryPanel({ leadId, leadName, queryText, queryBy, queryAt, onResolved }: Props) {
  const [busy, setBusy] = useState(false);

  const resolve = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('leads')
      .update({ controlling_query_open: false })
      .eq('id', leadId);
    if (error) {
      toast.error('Konnte nicht gespeichert werden');
      setBusy(false);
      return;
    }
    await supabase.from('tasks').update({ status: 'done' })
      .eq('lead_id', leadId).eq('status', 'open').like('title', 'Rückfrage (Controlling):%');
    try {
      await supabase.functions.invoke('notify-event', {
        body: {
          notification_type: 'lead_ready_for_controlling',
          entity_type: 'lead',
          entity_id: leadId,
          lead_id: leadId,
          title: `Rückfrage erledigt: ${leadName}`,
          description: `Die Controlling-Rückfrage zu "${leadName}" wurde bearbeitet – der Kandidat kann erneut geprüft werden.`,
          trigger_label: 'Rückfrage erledigt',
        },
      });
    } catch (e) {
      console.error('notify-event (query resolved) failed:', e);
    }
    toast.success('Rückfrage als erledigt markiert – Controlling wurde informiert.');
    setBusy(false);
    onResolved?.();
  };

  return (
    <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <h4 className="text-xs font-bold text-destructive">Controlling-Rückfrage – Handlung nötig</h4>
      </div>
      <div className="rounded-lg border bg-background p-2.5">
        <span className="mb-1 block text-[11px] text-muted-foreground">
          Kommentar {queryBy ? `von ${queryBy}` : 'vom Controlling'}
          {queryAt ? ` · ${new Date(queryAt).toLocaleDateString('de-CH')}` : ''}
        </span>
        <p className="whitespace-pre-wrap text-xs">{queryText || 'Rückfrage vom Controlling'}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Bitte die fehlenden Angaben oder Dokumente ergänzen und danach als erledigt markieren.
      </p>
      <Button size="sm" variant="destructive" className="w-full" disabled={busy} onClick={resolve}>
        <Send className="mr-1.5 h-3.5 w-3.5" />
        Ergänzt – erneut zur Prüfung
      </Button>
    </div>
  );
}
