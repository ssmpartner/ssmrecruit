import { useState, useMemo, useCallback } from 'react';
import { useLeads } from '@/context/useLeads';
import { statusConfig } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import {
  CheckSquare, Plus, Clock, User, Building2, Filter, AlertCircle,
  ChevronDown, X, CalendarDays, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'open' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  leadId: string;
  assignedTo: string; // employeeId
  createdBy: string;  // employeeId
  agencyId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  low: { label: 'Niedrig', color: 'bg-muted text-muted-foreground', icon: '○' },
  medium: { label: 'Mittel', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '◐' },
  high: { label: 'Hoch', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '●' },
  urgent: { label: 'Dringend', color: 'bg-red-50 text-red-700 border-red-200', icon: '🔴' },
};

const taskStatusConfig: Record<TaskStatus, { label: string; color: string }> = {
  open: { label: 'Offen', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress: { label: 'In Bearbeitung', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  done: { label: 'Erledigt', color: 'bg-green-50 text-green-700 border-green-200' },
};

function generateMockTasks(leads: any[], employees: any[]): Task[] {
  const taskTemplates = [
    { title: 'Erstgespräch vorbereiten', description: 'Unterlagen und Fragen für das Erstgespräch zusammenstellen' },
    { title: 'Follow-up anrufen', description: 'Kandidat nach dem Gespräch kontaktieren' },
    { title: 'Referenzen prüfen', description: 'Referenzen des Kandidaten einholen und verifizieren' },
    { title: 'Vertrag vorbereiten', description: 'Arbeitsvertrag erstellen und zur Prüfung freigeben' },
    { title: 'Onboarding planen', description: 'Einarbeitungsplan erstellen und Team informieren' },
    { title: 'DISC-Test auswerten', description: 'Ergebnisse des Persönlichkeitstests analysieren' },
    { title: 'Gehaltsverhandlung führen', description: 'Gehaltsgespräch mit dem Kandidaten terminieren' },
    { title: 'Bewerbungsunterlagen sichten', description: 'Lebenslauf und Zeugnisse prüfen' },
  ];

  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  const statuses: TaskStatus[] = ['open', 'open', 'open', 'in_progress', 'done'];

  return leads.slice(0, 15).map((lead, i) => {
    const template = taskTemplates[i % taskTemplates.length];
    const emp = employees[i % employees.length];
    const creator = employees[(i + 1) % employees.length];
    const status = statuses[i % statuses.length];
    const daysAgo = Math.floor(Math.random() * 7);
    const dueDays = Math.floor(Math.random() * 10) - 2;

    return {
      id: `task-${i + 1}`,
      title: template.title,
      description: `${template.description} – ${lead.name}`,
      leadId: lead.id,
      assignedTo: emp.id,
      createdBy: creator.id,
      agencyId: emp.agencyId,
      priority: priorities[i % priorities.length],
      status,
      dueDate: new Date(Date.now() + dueDays * 86400000).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export default function Tasks() {
  const { leads, employees, agencies } = useLeads();

  const [tasks, setTasks] = useState<Task[]>(() => generateMockTasks(leads, employees));
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);

  // Simulate current user as "Sarah Chen" (e1, admin/backoffice, agency a1)
  const currentUser = employees.find(e => e.id === 'e1')!;
  const isBackoffice = currentUser.role === 'admin' || currentUser.role === 'agency_manager';

  // Backoffice sees all tasks from same agency, employees see only their own
  const visibleTasks = useMemo(() => {
    let result = tasks;
    if (!isBackoffice) {
      result = result.filter(t => t.assignedTo === currentUser.id);
    } else {
      result = result.filter(t => t.agencyId === currentUser.agencyId || t.assignedTo === currentUser.id);
    }
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (employeeFilter) result = result.filter(t => t.assignedTo === employeeFilter);
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter);
    return result.sort((a, b) => {
      const statusOrder = { open: 0, in_progress: 1, done: 2 };
      const prioOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
      return prioOrder[a.priority] - prioOrder[b.priority];
    });
  }, [tasks, statusFilter, employeeFilter, priorityFilter, currentUser, isBackoffice]);

  const agencyColleagues = useMemo(() =>
    employees.filter(e => e.agencyId === currentUser.agencyId),
    [employees, currentUser]
  );

  const updateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t));
  }, []);

  const reassignTask = useCallback((taskId: string, newEmployeeId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignedTo: newEmployeeId, updatedAt: new Date().toISOString() } : t));
  }, []);

  const openCount = tasks.filter(t => t.status === 'open' && (isBackoffice ? t.agencyId === currentUser.agencyId : t.assignedTo === currentUser.id)).length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress' && (isBackoffice ? t.agencyId === currentUser.agencyId : t.assignedTo === currentUser.id)).length;
  const doneCount = tasks.filter(t => t.status === 'done' && (isBackoffice ? t.agencyId === currentUser.agencyId : t.assignedTo === currentUser.id)).length;

  const hasFilters = statusFilter !== 'all' || employeeFilter || priorityFilter !== 'all';

  // New Task dialog state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLeadId, setNewLeadId] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDueDate, setNewDueDate] = useState('');

  const handleCreateTask = () => {
    if (!newTitle || !newLeadId || !newAssignee) return;
    const assignee = employees.find(e => e.id === newAssignee);
    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTitle,
      description: newDesc,
      leadId: newLeadId,
      assignedTo: newAssignee,
      createdBy: currentUser.id,
      agencyId: assignee?.agencyId || currentUser.agencyId,
      priority: newPriority,
      status: 'open',
      dueDate: newDueDate || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks(prev => [task, ...prev]);
    setShowCreate(false);
    setNewTitle(''); setNewDesc(''); setNewLeadId(''); setNewAssignee(''); setNewPriority('medium'); setNewDueDate('');
  };

  const getLeadName = (leadId: string) => leads.find(l => l.id === leadId)?.name ?? '–';
  const getEmployeeName = (empId: string) => employees.find(e => e.id === empId)?.name ?? '–';
  const getLeadStatus = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    return lead ? statusConfig[lead.status] : null;
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Aufgaben</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            {isBackoffice ? 'Alle Aufgaben deiner Agentur' : 'Deine offenen Aufgaben'}
            {' · '} Angemeldet als <span className="font-medium text-foreground">{currentUser.name}</span>
          </p>
        </div>
        {isBackoffice && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Neue Aufgabe
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Offen', count: openCount, color: 'hsl(38,80%,50%)', icon: AlertCircle },
          { label: 'In Bearbeitung', count: inProgressCount, color: 'hsl(210,60%,52%)', icon: Clock },
          { label: 'Erledigt', count: doneCount, color: 'hsl(152,55%,40%)', icon: CheckCircle2 },
        ].map(s => (
          <div key={s.label} className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.07] -translate-y-6 translate-x-6" style={{ background: s.color }} />
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2" style={{ background: `${s.color}15` }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filter
          </div>
          <div className="h-6 w-px bg-border" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              {Object.entries(taskStatusConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Priorität" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Prioritäten</SelectItem>
              {Object.entries(priorityConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isBackoffice && (
            <Select value={employeeFilter || 'all'} onValueChange={(v) => setEmployeeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Mitarbeiter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                {agencyColleagues.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {hasFilters && (
            <button onClick={() => { setStatusFilter('all'); setEmployeeFilter(''); setPriorityFilter('all'); }} className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-semibold hover:bg-destructive/20 transition-colors">
              <X className="h-3 w-3" /> Zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {visibleTasks.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Keine Aufgaben gefunden</p>
          </div>
        ) : (
          visibleTasks.map(task => {
            const leadStatus = getLeadStatus(task.leadId);
            const overdue = task.status !== 'done' && isOverdue(task.dueDate);
            return (
              <div key={task.id} className={cn(
                'group rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all',
                task.status === 'done' && 'opacity-60',
                overdue && 'border-destructive/30'
              )}>
                <div className="flex items-start gap-4">
                  {/* Status toggle */}
                  <button
                    onClick={() => updateTaskStatus(task.id, task.status === 'done' ? 'open' : task.status === 'open' ? 'in_progress' : 'done')}
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      task.status === 'done' ? 'border-[hsl(152,55%,40%)] bg-[hsl(152,55%,40%)] text-white' : 'border-muted-foreground/30 hover:border-primary'
                    )}
                  >
                    {task.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className={cn('font-semibold text-sm', task.status === 'done' && 'line-through text-muted-foreground')}>{task.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', priorityConfig[task.priority].color)}>
                          {priorityConfig[task.priority].icon} {priorityConfig[task.priority].label}
                        </span>
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', taskStatusConfig[task.status].color)}>
                          {taskStatusConfig[task.status].label}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span className="font-medium text-foreground">{getEmployeeName(task.assignedTo)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium text-foreground">{getLeadName(task.leadId)}</span>
                        {leadStatus && (
                          <span className={cn('rounded-full border px-1.5 py-px text-[9px] font-semibold', leadStatus.color)}>{leadStatus.label}</span>
                        )}
                      </span>
                      {task.dueDate && (
                        <span className={cn('inline-flex items-center gap-1.5', overdue && 'text-destructive font-semibold')}>
                          <CalendarDays className="h-3 w-3" />
                          {overdue && '⚠ '}Fällig: {new Date(task.dueDate).toLocaleDateString('de-CH')}
                        </span>
                      )}
                    </div>

                    {/* Backoffice actions */}
                    {isBackoffice && task.status !== 'done' && (
                      <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Select value={task.assignedTo} onValueChange={(v) => reassignTask(task.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {agencyColleagues.map(e => (
                              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v as TaskStatus)}>
                          <SelectTrigger className="h-7 text-xs w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(taskStatusConfig).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neue Aufgabe erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Titel *</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="z.B. Follow-up anrufen" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Beschreibung</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Lead *</label>
                <Select value={newLeadId} onValueChange={setNewLeadId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Lead wählen" /></SelectTrigger>
                  <SelectContent>
                    {leads.slice(0, 20).map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Zuweisen an *</label>
                <Select value={newAssignee} onValueChange={setNewAssignee}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Mitarbeiter" /></SelectTrigger>
                  <SelectContent>
                    {agencyColleagues.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Priorität</label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TaskPriority)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Fälligkeitsdatum</label>
                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
            <Button onClick={handleCreateTask} disabled={!newTitle || !newLeadId || !newAssignee}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
