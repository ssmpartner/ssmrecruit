import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useLeads, type ActivityEntry } from '@/context/LeadsContext';
import { employees, agencies, statusConfig, type LeadStatus } from '@/lib/mock-data';
import LeadStatusBadge from './LeadStatusBadge';
import SourceBadge from './SourceBadge';
import { Save, Clock, UserCog, Edit3, MessageSquare, ArrowRight } from 'lucide-react';

const statusKeys: LeadStatus[] = ['new', 'contacted', 'appointment', 'interview', 'hired', 'rejected'];

const activityIcon: Record<ActivityEntry['type'], typeof Clock> = {
  status_change: ArrowRight,
  assignment: UserCog,
  edit: Edit3,
  note: MessageSquare,
};

export default function LeadDetailSheet() {
  const { selectedLead, setSelectedLead, updateLead, addActivity, activities } = useLeads();
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState('');

  // local form state
  const [form, setForm] = useState({ name: '', email: '', phone: '', position: '', notes: '' });

  const open = !!selectedLead;

  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedLead(null);
      setEditing(false);
    }
  };

  const startEdit = () => {
    if (!selectedLead) return;
    setForm({
      name: selectedLead.name,
      email: selectedLead.email,
      phone: selectedLead.phone,
      position: selectedLead.position,
      notes: selectedLead.notes,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!selectedLead) return;
    const changes: string[] = [];
    if (form.name !== selectedLead.name) changes.push(`Name → "${form.name}"`);
    if (form.email !== selectedLead.email) changes.push(`Email → "${form.email}"`);
    if (form.phone !== selectedLead.phone) changes.push(`Phone updated`);
    if (form.position !== selectedLead.position) changes.push(`Position → "${form.position}"`);
    if (form.notes !== selectedLead.notes) changes.push(`Notes updated`);

    updateLead(selectedLead.id, form);
    if (changes.length > 0) {
      addActivity(selectedLead.id, 'edit', changes.join(', '));
    }
    setEditing(false);
  };

  const changeStatus = (newStatus: LeadStatus) => {
    if (!selectedLead || selectedLead.status === newStatus) return;
    const oldLabel = statusConfig[selectedLead.status].label;
    const newLabel = statusConfig[newStatus].label;
    updateLead(selectedLead.id, { status: newStatus });
    addActivity(selectedLead.id, 'status_change', `Status changed from "${oldLabel}" to "${newLabel}"`);
  };

  const changeEmployee = (empId: string) => {
    if (!selectedLead || selectedLead.employeeId === empId) return;
    const oldEmp = employees.find(e => e.id === selectedLead.employeeId);
    const newEmp = employees.find(e => e.id === empId);
    updateLead(selectedLead.id, { employeeId: empId });
    addActivity(selectedLead.id, 'assignment', `Reassigned from ${oldEmp?.name ?? '—'} to ${newEmp?.name ?? '—'}`);
  };

  const changeAgency = (agencyId: string) => {
    if (!selectedLead || selectedLead.agencyId === agencyId) return;
    const oldAg = agencies.find(a => a.id === selectedLead.agencyId);
    const newAg = agencies.find(a => a.id === agencyId);
    updateLead(selectedLead.id, { agencyId });
    addActivity(selectedLead.id, 'assignment', `Agency changed from ${oldAg?.name ?? '—'} to ${newAg?.name ?? '—'}`);
  };

  const addNote = () => {
    if (!selectedLead || !noteText.trim()) return;
    addActivity(selectedLead.id, 'note', noteText.trim());
    setNoteText('');
  };

  const leadActivities = selectedLead ? activities.filter(a => a.leadId === selectedLead.id) : [];
  const emp = selectedLead ? employees.find(e => e.id === selectedLead.employeeId) : null;
  const agency = selectedLead ? agencies.find(a => a.id === selectedLead.agencyId) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto scrollbar-thin p-0">
        {selectedLead && (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 border-b bg-card px-6 pt-6 pb-4">
              <SheetHeader>
                <SheetTitle className="text-xl">{selectedLead.name}</SheetTitle>
                <SheetDescription>{selectedLead.position}</SheetDescription>
              </SheetHeader>
              <div className="mt-3 flex items-center gap-2">
                <LeadStatusBadge status={selectedLead.status} />
                <SourceBadge source={selectedLead.source} />
              </div>
            </div>

            <div className="space-y-6 p-6">
              {/* Info / Edit */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Lead Information</h4>
                  {!editing ? (
                    <button onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                      <Edit3 className="h-3 w-3" /> Edit
                    </button>
                  ) : (
                    <button onClick={saveEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                      <Save className="h-3 w-3" /> Save
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-3">
                    {(['name', 'email', 'phone', 'position'] as const).map(field => (
                      <div key={field}>
                        <label className="text-xs font-medium text-muted-foreground capitalize">{field}</label>
                        <input
                          value={form[field]}
                          onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                          className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Notes</label>
                      <textarea
                        value={form.notes}
                        onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{selectedLead.email}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{selectedLead.phone}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{new Date(selectedLead.createdAt).toLocaleDateString()}</span>
                    </div>
                    {selectedLead.notes && (
                      <div className="pt-1">
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{selectedLead.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Status */}
              <section>
                <h4 className="text-sm font-semibold mb-3">Change Status</h4>
                <div className="flex flex-wrap gap-1.5">
                  {statusKeys.map(s => (
                    <button
                      key={s}
                      onClick={() => changeStatus(s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        selectedLead.status === s
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-secondary-foreground border-transparent hover:border-primary/30'
                      }`}
                    >
                      {statusConfig[s].label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Assignment */}
              <section>
                <h4 className="text-sm font-semibold mb-3">Assignment</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Agency</label>
                    <select
                      value={selectedLead.agencyId}
                      onChange={e => changeAgency(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Employee</label>
                    <select
                      value={selectedLead.employeeId}
                      onChange={e => changeEmployee(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Add Note */}
              <section>
                <h4 className="text-sm font-semibold mb-3">Add Note</h4>
                <div className="flex gap-2">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNote()}
                    placeholder="Write a note..."
                    className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={addNote}
                    disabled={!noteText.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Add
                  </button>
                </div>
              </section>

              {/* Activity History */}
              <section>
                <h4 className="text-sm font-semibold mb-3">Activity History</h4>
                <div className="space-y-0">
                  {leadActivities.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
                  )}
                  {leadActivities.map((act, i) => {
                    const Icon = activityIcon[act.type];
                    return (
                      <div key={act.id} className="relative flex gap-3 pb-4">
                        {/* timeline line */}
                        {i < leadActivities.length - 1 && (
                          <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
                        )}
                        <div className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{act.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {act.user} • {new Date(act.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
