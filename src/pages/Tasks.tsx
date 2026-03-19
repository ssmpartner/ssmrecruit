import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLeads } from '@/context/useLeads';
import { statusConfig } from '@/lib/mock-data';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  CheckSquare, Clock, User, Filter, AlertCircle,
  X, CalendarDays, ArrowRight, CheckCircle2, Sparkles, RefreshCw, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'open' | 'in_progress' | 'done';

const priorityConfig: Record<string, { label: string; color: string; icon: string }> = {
  low: { label: 'Niedrig', color: 'bg-muted text-muted-foreground', icon: '○' },
  medium: { label: 'Mittel', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '◐' },
  high: { label: 'Hoch', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '●' },
  urgent: { label: 'Dringend', color: 'bg-red-50 text-red-700 border-red-200', icon: '🔴' },
};

const taskStatusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Offen', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress: { label: 'In Bearbeitung', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  done: { label: 'Erledigt', color: 'bg-green-50 text-green-700 border-green-200' },
};

export default function Tasks() {
  const { leads, employees, agencies } = useLeads();
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Load tasks from DB
  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Fehler beim Laden der Aufgaben');
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Generate tasks for a specific lead via edge function
  const generateTasksForLead = useCallback(async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    setGenerating(leadId);
    try {
      const existingForLead = tasks.filter(t => t.lead_id === leadId);

      const { data, error } = await supabase.functions.invoke('generate-tasks', {
        body: {
          leadId: lead.id,
          leadName: lead.name,
          leadStatus: lead.status,
          leadPosition: lead.position,
          assignedTo: lead.employeeId,
          agencyId: lead.agencyId,
          existingTasks: existingForLead.map(t => ({ title: t.title })),
        },
      });

      if (error) throw error;

      const newTasks = data?.tasks || [];
      if (newTasks.length === 0) {
        toast.info(`Keine neuen Aufgaben für ${lead.name}`);
        return;
      }

      // Insert into DB
      const { error: insertError } = await supabase.from('tasks').insert(
        newTasks.map((t: any) => ({
          title: t.title,
          description: t.description,
          lead_id: t.lead_id,
          assigned_to: t.assigned_to,
          agency_id: t.agency_id,
          priority: t.priority,
          source: t.source,
          lead_status: t.lead_status,
          status: 'open',
        }))
      );

      if (insertError) throw insertError;

      toast.success(`${newTasks.length} Aufgaben für ${lead.name} generiert`, {
        description: `${newTasks.filter((t: any) => t.source === 'system').length} Pflicht + ${newTasks.filter((t: any) => t.source === 'ai').length} KI-Aufgaben`,
      });

      await fetchTasks();
    } catch (err) {
      console.error('Error generating tasks:', err);
      toast.error('Fehler bei der Task-Generierung');
    } finally {
      setGenerating(null);
    }
  }, [leads, tasks, fetchTasks]);

  // Generate tasks for ALL leads that have no tasks yet
  const generateAllTasks = useCallback(async () => {
    const leadsWithoutTasks = leads.filter(l => !tasks.some(t => t.lead_id === l.id));
    if (leadsWithoutTasks.length === 0) {
      toast.info('Alle Leads haben bereits Aufgaben');
      return;
    }
    for (const lead of leadsWithoutTasks.slice(0, 5)) {
      await generateTasksForLead(lead.id);
    }
  }, [leads, tasks, generateTasksForLead]);

  // Update task status in DB
  const updateTaskStatus = useCallback(async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) {
      toast.error('Fehler beim Aktualisieren');
      return;
    }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // Check if all tasks for this lead are done → generate new ones
    const task = tasks.find(t => t.id === taskId);
    if (task && newStatus === 'done') {
      const leadTasks = tasks.filter(t => t.lead_id === task.lead_id && t.id !== taskId);
      const allDone = leadTasks.every(t => t.status === 'done');
      if (allDone && leadTasks.length > 0) {
        toast.info('Alle Aufgaben erledigt! Generiere neue...', { duration: 2000 });
        setTimeout(() => generateTasksForLead(task.lead_id), 1000);
      }
    }
  }, [tasks, generateTasksForLead]);

  // Reassign task
  const reassignTask = useCallback(async (taskId: string, newEmployeeId: string) => {
    const { error } = await supabase.from('tasks').update({ assigned_to: newEmployeeId }).eq('id', taskId);
    if (error) {
      toast.error('Fehler beim Zuweisen');
      return;
    }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: newEmployeeId } : t));
    toast.success('Aufgabe neu zugewiesen');
  }, []);

  // Filter tasks - show all for authenticated user (no employee-based filtering since we use auth user)
  const visibleTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (employeeFilter) result = result.filter(t => t.assigned_to === employeeFilter);
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter);
    return result.sort((a, b) => {
      const so: Record<string, number> = { open: 0, in_progress: 1, done: 2 };
      const po: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      if ((so[a.status] ?? 2) !== (so[b.status] ?? 2)) return (so[a.status] ?? 2) - (so[b.status] ?? 2);
      return (po[a.priority] ?? 3) - (po[b.priority] ?? 3);
    });
  }, [tasks, statusFilter, employeeFilter, priorityFilter]);

  const openCount = visibleTasks.filter(t => t.status === 'open').length;
  const inProgressCount = visibleTasks.filter(t => t.status === 'in_progress').length;
  const doneCount = visibleTasks.filter(t => t.status === 'done').length;
  const hasFilters = statusFilter !== 'all' || employeeFilter || priorityFilter !== 'all';

  const getLeadName = (leadId: string) => leads.find(l => l.id === leadId)?.name ?? '–';
  const getEmployeeName = (empId: string) => employees.find(e => e.id === empId)?.name ?? '–';
  const getLeadStatus = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    return lead ? statusConfig[lead.status] : null;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);
  };

  // Group tasks by lead
  const tasksByLead = useMemo(() => {
    const map = new Map<string, Task[]>();
    visibleTasks.forEach(t => {
      const arr = map.get(t.lead_id) || [];
      arr.push(t);
      map.set(t.lead_id, arr);
    });
    return map;
  }, [visibleTasks]);

  if (!profile) return null;

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
            Systemgenerierte Aufgaben mit KI-Unterstützung
            {' · '} Angemeldet als <span className="font-medium text-foreground">{profile.display_name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {isBackoffice && (
            <Button onClick={generateAllTasks} variant="outline" className="gap-2" disabled={!!generating}>
              <Sparkles className="h-4 w-4" /> Tasks generieren
            </Button>
          )}
        </div>
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
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
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

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Lade Aufgaben...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && visibleTasks.length === 0 && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Keine Aufgaben vorhanden</p>
          <p className="text-xs text-muted-foreground mb-4">
            Klicke auf "Tasks generieren" um Aufgaben für deine Leads zu erstellen
          </p>
          {isBackoffice && (
            <Button onClick={generateAllTasks} className="gap-2" disabled={!!generating}>
              <Sparkles className="h-4 w-4" /> Jetzt generieren
            </Button>
          )}
        </div>
      )}

      {/* Tasks grouped by Lead */}
      {!loading && Array.from(tasksByLead.entries()).map(([leadId, leadTasks]) => {
        const lead = leads.find(l => l.id === leadId);
        const leadStatus = lead ? statusConfig[lead.status] : null;
        const allDone = leadTasks.every(t => t.status === 'done');
        const openTasks = leadTasks.filter(t => t.status !== 'done').length;

        return (
          <div key={leadId} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            {/* Lead header */}
            <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-b">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {(lead?.name || '?')[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{lead?.name || leadId}</span>
                    {leadStatus && (
                      <span className={cn('rounded-full border px-2 py-px text-[10px] font-semibold', leadStatus.color)}>{leadStatus.label}</span>
                    )}
                    {lead?.position && <span className="text-xs text-muted-foreground">· {lead.position}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{openTasks} offen · {leadTasks.length} gesamt</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {allDone && isBackoffice && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => generateTasksForLead(leadId)} disabled={generating === leadId}>
                    {generating === leadId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Neue Tasks
                  </Button>
                )}
              </div>
            </div>

            {/* Task items */}
            <div className="divide-y">
              {leadTasks.map(task => {
                const overdue = task.status !== 'done' && isOverdue(task.due_date);
                return (
                  <div key={task.id} className={cn(
                    'group flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors',
                    task.status === 'done' && 'opacity-50',
                    overdue && 'bg-destructive/5'
                  )}>
                    {/* Status toggle */}
                    <button
                      onClick={() => updateTaskStatus(task.id, task.status === 'done' ? 'open' : task.status === 'open' ? 'in_progress' : 'done')}
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        task.status === 'done' ? 'border-[hsl(152,55%,40%)] bg-[hsl(152,55%,40%)] text-white' : 'border-muted-foreground/30 hover:border-primary'
                      )}
                    >
                      {task.status === 'done' && <CheckCircle2 className="h-3 w-3" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={cn('font-medium text-sm', task.status === 'done' && 'line-through text-muted-foreground')}>{task.title}</h3>
                            {task.source === 'ai' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-1.5 py-px text-[9px] font-semibold text-violet-700">
                                <Sparkles className="h-2.5 w-2.5" /> KI
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', priorityConfig[task.priority]?.color)}>
                            {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          <span className="font-medium text-foreground">{getEmployeeName(task.assigned_to)}</span>
                        </span>
                        {task.due_date && (
                          <span className={cn('inline-flex items-center gap-1.5', overdue && 'text-destructive font-semibold')}>
                            <CalendarDays className="h-3 w-3" />
                            {overdue && '⚠ '}Fällig: {new Date(task.due_date).toLocaleDateString('de-CH')}
                          </span>
                        )}
                      </div>

                      {/* Backoffice reassign */}
                      {isBackoffice && task.status !== 'done' && (
                        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Select value={task.assigned_to} onValueChange={(v) => reassignTask(task.id, v)}>
                            <SelectTrigger className="h-7 text-xs w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {agencyColleagues.map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                            <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
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
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
