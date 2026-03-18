import { useState } from 'react';
import { AlertTriangle, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { type Lead } from '@/lib/mock-data';
import { useLeads } from '@/context/useLeads';
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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LeadActionsProps {
  lead: Lead;
}

export default function LeadActions({ lead }: LeadActionsProps) {
  const { archiveLead, deleteLead, restoreLead } = useLeads();
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | 'restore' | null>(null);

  const handleConfirm = () => {
    if (confirmAction === 'archive') {
      archiveLead(lead.id);
      toast.success(`"${lead.name}" wurde archiviert`);
    } else if (confirmAction === 'delete') {
      deleteLead(lead.id);
      toast.success(`"${lead.name}" wurde gelöscht`);
    } else if (confirmAction === 'restore') {
      restoreLead(lead.id);
      toast.success(`"${lead.name}" wurde wiederhergestellt`);
    }
    setConfirmAction(null);
  };

  const titles = {
    archive: 'Lead archivieren',
    delete: 'Lead löschen',
    restore: 'Lead wiederherstellen',
  };

  const descriptions = {
    archive: `Möchten Sie "${lead.name}" wirklich archivieren? Der Lead kann später wiederhergestellt werden.`,
    delete: `Möchten Sie "${lead.name}" wirklich löschen? Der Lead wird in den Papierkorb verschoben und kann nur von einem Superadmin wiederhergestellt werden.`,
    restore: `Möchten Sie "${lead.name}" wiederherstellen? Der Lead wird wieder in die aktive Liste verschoben.`,
  };

  return (
    <>
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        {lead.lifecycle === 'active' && (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmAction('archive')} title="Archivieren">
              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmAction('delete')} title="Löschen">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </>
        )}
        {(lead.lifecycle === 'archived' || lead.lifecycle === 'deleted') && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmAction('restore')} title="Wiederherstellen">
            <RotateCcw className="h-3.5 w-3.5 text-primary" />
          </Button>
        )}
        {lead.lifecycle === 'archived' && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmAction('delete')} title="Endgültig löschen">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={open => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {confirmAction && titles[confirmAction]}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && descriptions[confirmAction]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className={confirmAction === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
