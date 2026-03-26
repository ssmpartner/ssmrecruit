import { useState } from 'react';
import { Mail, Plus, Pencil, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { type Employee } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const roleBadge: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  agency_manager: 'bg-amber-100 text-amber-800',
  employee: 'bg-secondary text-secondary-foreground',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  agency_manager: 'Agenturleiter',
  employee: 'Mitarbeiter',
};

type FormState = { name: string; email: string; role: Employee['role']; agencyId: string };
const emptyForm: FormState = { name: '', email: '', role: 'employee', agencyId: '' };

export default function Employees() {
  const { employees, agencies, leads, addEmployee, updateEmployee, deleteEmployee } = useLeads();
  const { isSuperadmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [convertDialog, setConvertDialog] = useState<Employee | null>(null);
  const [convertForm, setConvertForm] = useState({ password: '', role: 'backoffice' as string });
  const [converting, setConverting] = useState(false);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditId(emp.id);
    setForm({ name: emp.name, email: emp.email, role: emp.role, agencyId: emp.agencyId });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim() || !form.agencyId) return;
    if (editId) {
      updateEmployee(editId, form);
      toast.success('Mitarbeiter aktualisiert');
    } else {
      addEmployee(form);
      toast.success('Mitarbeiter erstellt');
    }
    setForm(emptyForm);
    setEditId(null);
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteEmployee(id);
    setDeleteConfirm(null);
    toast.success('Mitarbeiter gelöscht');
  };

  const handleConvert = async () => {
    if (!convertDialog || !convertForm.password || convertForm.password.length < 8) {
      toast.error('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    setConverting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: convertDialog.email,
          password: convertForm.password,
          display_name: convertDialog.name,
          role: convertForm.role,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(`${convertDialog.name} wurde als Benutzer mit Rolle "${convertForm.role}" erstellt`);
      setConvertDialog(null);
      setConvertForm({ password: '', role: 'backoffice' });
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Erstellen des Benutzers');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mitarbeiter</h1>
          <p className="text-muted-foreground">Teammitglieder verwalten</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Mitarbeiter hinzufügen
        </button>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">Noch keine Mitarbeiter vorhanden.</p>
          <button onClick={openAdd} className="mt-4 text-sm text-primary hover:underline">
            Ersten Mitarbeiter hinzufügen →
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map(emp => {
            const agency = agencies.find(a => a.id === emp.agencyId);
            const empLeads = leads.filter(l => l.employeeId === emp.id);
            const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div key={emp.id} className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-semibold">{emp.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {emp.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-muted" title="Bearbeiten">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteConfirm(emp.id)} className="p-1.5 rounded-lg hover:bg-destructive/10" title="Löschen">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${roleBadge[emp.role] || roleBadge.employee}`}>
                    {roleLabels[emp.role] || emp.role}
                  </span>
                  <span className="text-xs text-muted-foreground">• {agency?.name || '–'}</span>
                </div>
                <div className="rounded-lg bg-secondary p-3 mb-3">
                  <p className="text-sm font-medium">{empLeads.length} zugewiesene Leads</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {empLeads.filter(l => l.status === 'hired').length} eingestellt
                  </p>
                </div>
                {isSuperadmin && (
                  <button
                    onClick={() => { setConvertDialog(emp); setConvertForm({ password: '', role: 'backoffice' }); }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> In Benutzer umwandeln
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter hinzufügen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Vollständiger Name</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="z.B. Max Müller"
                className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">E-Mail</label>
              <input
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="z.B. max@firma.ch"
                className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rolle</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value as Employee['role'] }))}
                className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="employee">Mitarbeiter</option>
                <option value="agency_manager">Agenturleiter</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Agentur</label>
              <select
                value={form.agencyId}
                onChange={e => setForm(p => ({ ...p, agencyId: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Agentur wählen…</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.email.trim() || !form.agencyId}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {editId ? 'Änderungen speichern' : 'Mitarbeiter erstellen'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitarbeiter löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sind Sie sicher, dass Sie diesen Mitarbeiter löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-muted transition-colors">
              Abbrechen
            </button>
            <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition-opacity">
              Endgültig löschen
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert to User Dialog */}
      <Dialog open={!!convertDialog} onOpenChange={() => setConvertDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitarbeiter in Benutzer umwandeln</DialogTitle>
          </DialogHeader>
          {convertDialog && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium">{convertDialog.name}</p>
                <p className="text-xs text-muted-foreground">{convertDialog.email}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Ein neues Login-Konto wird für diesen Mitarbeiter erstellt. Der Mitarbeiter kann sich dann mit seiner E-Mail und dem Passwort anmelden.
              </p>
              <div>
                <label className="text-sm font-medium">Passwort</label>
                <input
                  type="password"
                  value={convertForm.password}
                  onChange={e => setConvertForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mindestens 8 Zeichen"
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">System-Rolle</label>
                <select
                  value={convertForm.role}
                  onChange={e => setConvertForm(p => ({ ...p, role: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="teamleiter">Teamleiter</option>
                  <option value="backoffice">Backoffice</option>
                  <option value="analyst">Analyst</option>
                  <option value="controlling">Controlling</option>
                  <option value="geschaeftsleitung">Geschäftsleitung</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
              <button
                onClick={handleConvert}
                disabled={converting || convertForm.password.length < 8}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {converting ? 'Wird erstellt...' : 'Benutzerkonto erstellen'}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
