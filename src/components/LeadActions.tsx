import { useState } from 'react';
import { AlertTriangle, Archive, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';
import { type Lead } from '@/lib/mock-data';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LeadActionsProps {
  lead: Lead;
}

export default function LeadActions({ lead }: LeadActionsProps) {
  const { archiveLead, deleteLead, restoreLead, employees } = useLeads();
  const { isReviewRole, isSuperadmin, role, user } = useAuth();
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | 'restore' | null>(null);

  // Review roles cannot archive/delete/restore
  if (isReviewRole) return null;

  // Permission check: only admins, agency managers/backoffice in same agency, or the
  // assigned employee may archive/delete/restore. Other employees see nothing.
  const isAdmin = isSuperadmin || role === 'admin';
  const myEmail = (user?.email || '').toLowerCase();
  const myEmployee = employees.find(e => (e.email || '').toLowerCase() === myEmail);
  const isOwnLead = !!myEmployee && lead.employeeId === myEmployee.id;
  const isAgencyScopedManager = (role === 'agency_manager' || role === 'backoffice')
    && !!myEmployee && lead.agencyId === myEmployee.agencyId;
  if (!(isAdmin || isAgencyScopedManager || isOwnLead)) return null;


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
      <div onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Aktionen" aria-label="Aktionen">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {lead.lifecycle === 'active' && (
              <>
                <DropdownMenuItem onClick={() => setConfirmAction('archive')}>
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" /> Archivieren
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmAction('delete')} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Löschen
                </DropdownMenuItem>
              </>
            )}
            {lead.lifecycle === 'archived' && (
              <>
                <DropdownMenuItem onClick={() => setConfirmAction('restore')}>
                  <RotateCcw className="h-3.5 w-3.5 text-primary" /> Wiederherstellen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmAction('delete')} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Endgültig löschen
                </DropdownMenuItem>
              </>
            )}
            {lead.lifecycle === 'deleted' && (
              <DropdownMenuItem onClick={() => setConfirmAction('restore')}>
                <RotateCcw className="h-3.5 w-3.5 text-primary" /> Wiederherstellen
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
