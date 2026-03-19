import { useState } from 'react';
import { UserPlus, X, Archive, Trash2 } from 'lucide-react';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';

interface BulkActionsBarProps {
  selectedIds: string[];
  onClear: () => void;
}

export default function BulkActionsBar({ selectedIds, onClear }: BulkActionsBarProps) {
  const { leads, employees, agencies, updateLead, archiveLead, deleteLead, addActivity } = useLeads();
  const { isSuperadmin } = useAuth();
  const [assignType, setAssignType] = useState<'employee' | 'agency' | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<'archive' | 'delete' | null>(null);

  if (!isSuperadmin || selectedIds.length === 0) return null;

  const handleAssignEmployee = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    selectedIds.forEach(id => {
      updateLead(id, { employeeId });
      addActivity(id, 'assignment', `Mitarbeiter zugewiesen: ${emp?.name ?? employeeId}`);
    });
    toast.success(`${selectedIds.length} Leads an "${emp?.name}" zugewiesen`);
    setAssignType(null);
    onClear();
  };

  const handleAssignAgency = (agencyId: string) => {
    const ag = agencies.find(a => a.id === agencyId);
    selectedIds.forEach(id => {
      updateLead(id, { agencyId });
      addActivity(id, 'assignment', `Agentur zugewiesen: ${ag?.name ?? agencyId}`);
    });
    toast.success(`${selectedIds.length} Leads der Agentur "${ag?.name}" zugewiesen`);
    setAssignType(null);
    onClear();
  };

  const handleBulkConfirm = () => {
    if (confirmBulk === 'archive') {
      selectedIds.forEach(id => archiveLead(id));
      toast.success(`${selectedIds.length} Leads archiviert`);
    } else if (confirmBulk === 'delete') {
      selectedIds.forEach(id => deleteLead(id));
      toast.success(`${selectedIds.length} Leads gelöscht`);
    }
    setConfirmBulk(null);
    onClear();
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 shadow-sm animate-in slide-in-from-top-2">
        <span className="text-sm font-medium">
          {selectedIds.length} Lead{selectedIds.length > 1 ? 's' : ''} ausgewählt
        </span>

        <div className="flex items-center gap-2 ml-auto">
          {/* Assign to employee */}
          {assignType === 'employee' ? (
            <Select onValueChange={handleAssignEmployee}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="Mitarbeiter wählen..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button variant="outline" size="sm" onClick={() => { setAssignType('employee'); }}>
              <UserPlus className="h-4 w-4 mr-1" /> Mitarbeiter zuweisen
            </Button>
          )}

          {/* Assign to agency */}
          {assignType === 'agency' ? (
            <Select onValueChange={handleAssignAgency}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="Agentur wählen..." />
              </SelectTrigger>
              <SelectContent>
                {agencies.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button variant="outline" size="sm" onClick={() => { setAssignType('agency'); }}>
              <UserPlus className="h-4 w-4 mr-1" /> Agentur zuweisen
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => setConfirmBulk('archive')}>
            <Archive className="h-4 w-4 mr-1" /> Archivieren
          </Button>

          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmBulk('delete')}>
            <Trash2 className="h-4 w-4 mr-1" /> Löschen
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={!!confirmBulk} onOpenChange={open => !open && setConfirmBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBulk === 'archive' ? 'Leads archivieren' : 'Leads löschen'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie {selectedIds.length} Lead{selectedIds.length > 1 ? 's' : ''} wirklich {confirmBulk === 'archive' ? 'archivieren' : 'löschen'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkConfirm}
              className={confirmBulk === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
