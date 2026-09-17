import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useLeads } from '@/context/useLeads';
import { assignableEmployees } from '@/lib/assignable-employees';
import type { Employee } from '@/lib/mock-data';

interface Props {
  currentEmployee: Employee | null;
  onCreated: () => void;
}

export default function AddTaskDialog({ currentEmployee, onCreated }: Props) {
  const { employees, leads } = useLeads();
  const { user, isSuperadmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState(currentEmployee?.id ?? '');
  const [leadId, setLeadId] = useState('none');

  // Nur Mitarbeitende der eigenen Agentur (Superadmin: alle)
  const options = useMemo(() => {
    const list = assignableEmployees(employees);
    if (isSuperadmin) return list;
    if (!currentEmployee) return [];
    return list.filter(e => e.agencyId === currentEmployee.agencyId);
  }, [employees, isSuperadmin, currentEmployee]);

  const leadOptions = useMemo(() => {
    const own = isSuperadmin || !currentEmployee
      ? leads
      : leads.filter(l => l.employeeId === currentEmployee.id || l.agencyId === currentEmployee.agencyId);
    return own.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, 300);
  }, [leads, isSuperadmin, currentEmployee]);

  const reset = () => {
    setTitle(''); setDescription(''); setPriority('medium'); setDueDate('');
    setAssignedTo(currentEmployee?.id ?? ''); setLeadId('none');
  };

  const save = async () => {
    if (!title.trim()) { toast.error('Bitte einen Titel angeben'); return; }
    if (!assignedTo) { toast.error('Bitte eine Person zuweisen'); return; }
    const assignee = employees.find(e => e.id === assignedTo);
    setSaving(true);
    const { error } = await supabase.from('tasks').insert({
      title: title.trim(),
      description: description.trim(),
      lead_id: leadId === 'none' ? '' : leadId,
      assigned_to: assignedTo,
      agency_id: assignee?.agencyId || currentEmployee?.agencyId || '',
      priority,
      status: 'open',
      source: 'manual',
      due_date: dueDate || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error('Aufgabe konnte nicht gespeichert werden');
      return;
    }
    toast.success('Aufgabe erstellt');
    reset();
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Neue Aufgabe</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Aufgabe</DialogTitle>
          <DialogDescription>Aufgabe erstellen und einer Person in deiner Agentur zuweisen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Titel</Label>
            <Input id="task-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Kandidat zurückrufen" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Beschreibung</Label>
            <Textarea id="task-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optionale Details" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Zuweisen an</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Person wählen" /></SelectTrigger>
                <SelectContent>
                  {options.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priorität</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="urgent">Dringend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Fällig am</Label>
              <Input id="task-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Kandidat (optional)</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ohne Kandidat</SelectItem>
                  {leadOptions.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
