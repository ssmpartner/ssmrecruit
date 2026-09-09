import { useState, useMemo } from 'react';
import { useLeads } from '@/context/useLeads';
import LeadDetailSheet from '@/components/LeadDetailSheet';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft, ChevronRight, Phone, Video, Building2, CalendarIcon,
  Mail, Clock, User, ExternalLink, StickyNote, ArrowUpRight,
} from 'lucide-react';
import { getHolidayByISO } from '@/lib/swiss-holidays';
import type { Appointment } from '@/lib/mock-data';
import { assignableEmployees } from '@/lib/assignable-employees';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00

const typeIcon = { phone: Phone, video: Video, onsite: Building2 } as const;
const typeLabel = { phone: 'Telefon', video: 'Video-Call', onsite: 'Vor Ort' } as const;
const typeColor = {
  phone: 'bg-info/15 text-info border-info/30',
  video: 'bg-primary/15 text-primary border-primary/30',
  onsite: 'bg-success/15 text-success border-success/30',
} as const;

type ViewMode = 'month' | 'week' | 'day';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function startOfWeek(d: Date) {
  const c = new Date(d);
  const dow = c.getDay() === 0 ? 6 : c.getDay() - 1;
  c.setDate(c.getDate() - dow);
  c.setHours(0, 0, 0, 0);
  return c;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarPage() {
  const { appointments, leads, employees, setSelectedLead } = useLeads();
  const today = new Date();
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(new Date());
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');

  const employeeOptions = useMemo(() => assignableEmployees(employees), [employees]);

  const visibleAppointments = useMemo(
    () => (employeeFilter === 'all' ? appointments : appointments.filter(a => a.createdBy === employeeFilter)),
    [appointments, employeeFilter],
  );

  const byDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    visibleAppointments.forEach(apt => {
      if (!map[apt.date]) map[apt.date] = [];
      map[apt.date].push(apt);
    });
    Object.values(map).forEach(list => list.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [visibleAppointments]);

  const openLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) setSelectedLead(lead);
  };

  const shift = (dir: 1 | -1) => {
    const c = new Date(cursor);
    if (view === 'month') c.setMonth(c.getMonth() + dir);
    else if (view === 'week') c.setDate(c.getDate() + 7 * dir);
    else c.setDate(c.getDate() + dir);
    setCursor(c);
  };

  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const title =
    view === 'month'
      ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
      : view === 'week'
        ? `${weekDays[0].getDate()}. ${MONTHS[weekDays[0].getMonth()]} – ${weekDays[6].getDate()}. ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
        : `${WEEKDAYS_LONG[(cursor.getDay() + 6) % 7]}, ${cursor.getDate()}. ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  const Entry = ({ apt, compact }: { apt: Appointment; compact?: boolean }) => {
    const lead = leads.find(l => l.id === apt.leadId);
    const emp = employees.find(e => e.id === apt.createdBy);
    const Icon = typeIcon[apt.type];
    return (
      <HoverCard openDelay={80} closeDelay={80}>
        <HoverCardTrigger asChild>
          <button
            onClick={() => openLead(apt.leadId)}
            className={`w-full text-left rounded-md border px-1.5 py-1 leading-tight hover:shadow-sm hover:brightness-105 transition-all ${typeColor[apt.type]} ${compact ? 'text-[11px]' : 'text-xs'}`}
          >
            <div className="flex items-center gap-1 font-medium truncate">
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{apt.time} {apt.title}</span>
            </div>
            <div className="text-[10px] opacity-75 truncate">
              {lead?.name ?? '—'}{emp ? ` · ${emp.name}` : ''}
            </div>
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" className="w-80 space-y-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${typeColor[apt.type]}`}>
                <Icon className="h-3 w-3" /> {typeLabel[apt.type]}
              </span>
            </div>
            <h4 className="mt-2 text-sm font-semibold">{apt.title}</h4>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {new Date(`${apt.date}T00:00:00`).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
              {' · '}{apt.time} ({apt.duration ?? 30} Min.)
            </p>
          </div>

          <div className="space-y-1.5 border-t pt-3 text-xs">
            <button
              onClick={() => openLead(apt.leadId)}
              className="flex w-full items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              {lead?.name ?? 'Lead öffnen'}
            </button>
            {lead?.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline">
                <Mail className="h-3.5 w-3.5" /> {lead.email}
              </a>
            )}
            {lead?.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline">
                <Phone className="h-3.5 w-3.5" /> {lead.phone}
              </a>
            )}
            {apt.meetingLink && (
              <a href={apt.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> Meeting beitreten
              </a>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" /> {emp?.name ?? 'Unbekannt'}
            </div>
            {apt.notes && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-3">{apt.notes}</span>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  // ---------- Month ----------
  const renderMonth = () => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const cells: (number | null)[] = [];
    for (let i = 0; i < getFirstDayOfMonth(year, month); i++) cells.push(null);
    for (let d = 1; d <= getDaysInMonth(year, month); d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {WEEKDAYS.map(d => (
            <div key={d} className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
            const dayApts = day ? (byDate[dateStr] || []) : [];
            const isToday = dateStr === iso(today);
            const holiday = day ? getHolidayByISO(dateStr) : undefined;
            return (
              <div key={i} className={`min-h-[120px] border-b border-r p-1.5 ${day ? (holiday ? 'bg-destructive/5' : 'bg-card') : 'bg-muted/20'}`}>
                {day && (
                  <>
                    <div className="mb-1 flex items-start justify-between gap-1">
                      {holiday ? (
                        <span
                          title={holiday.national ? 'Feiertag (ganze Schweiz)' : `Feiertag in: ${(holiday.cantons ?? []).join(', ')}`}
                          className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${holiday.national ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'}`}
                        >
                          {holiday.name}
                        </span>
                      ) : <span />}
                      <button
                        onClick={() => { setCursor(new Date(year, month, day)); setView('day'); }}
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors hover:bg-muted ${isToday ? 'bg-primary text-primary-foreground hover:bg-primary' : holiday ? 'text-destructive' : 'text-foreground'}`}
                      >
                        {day}
                      </button>
                    </div>
                    <div className="space-y-1">
                      {dayApts.slice(0, 3).map(apt => <Entry key={apt.id} apt={apt} compact />)}
                      {dayApts.length > 3 && (
                        <button
                          onClick={() => { setCursor(new Date(year, month, day)); setView('day'); }}
                          className="w-full text-center text-[10px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                        >
                          +{dayApts.length - 3} weitere
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---------- Week / Day time grid ----------
  const renderTimeGrid = (days: Date[]) => (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="grid border-b bg-muted/50" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0,1fr))` }}>
        <div />
        {days.map(d => {
          const holiday = getHolidayByISO(iso(d));
          const isToday = iso(d) === iso(today);
          return (
            <button
              key={iso(d)}
              onClick={() => { setCursor(new Date(d)); setView('day'); }}
              className={`px-2 py-2 text-center transition-colors hover:bg-muted ${holiday ? 'bg-destructive/5' : ''}`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {WEEKDAYS[(d.getDay() + 6) % 7]}
              </div>
              <div className={`mx-auto mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold ${isToday ? 'bg-primary text-primary-foreground' : holiday ? 'text-destructive' : ''}`}>
                {d.getDate()}
              </div>
              {holiday && (
                <div className="truncate text-[10px] font-medium text-destructive" title={holiday.national ? 'Feiertag (ganze Schweiz)' : `Feiertag in: ${(holiday.cantons ?? []).join(', ')}`}>
                  {holiday.name}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="max-h-[70vh] overflow-y-auto">
        {HOURS.map(h => (
          <div key={h} className="grid border-b last:border-b-0" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0,1fr))` }}>
            <div className="border-r px-2 py-2 text-right text-[11px] font-medium text-muted-foreground">
              {String(h).padStart(2, '0')}:00
            </div>
            {days.map(d => {
              const list = (byDate[iso(d)] || []).filter(a => Number((a.time || '00:00').slice(0, 2)) === h);
              return (
                <div key={`${iso(d)}-${h}`} className="min-h-[56px] space-y-1 border-r p-1 last:border-r-0">
                  {list.map(apt => <Entry key={apt.id} apt={apt} />)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const dayList = (byDate[iso(cursor)] || []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kalender</h1>
        <p className="text-muted-foreground">Terminübersicht aller Leads</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-card transition-colors hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[240px] text-center text-lg font-semibold">{title}</h2>
          <button onClick={() => shift(1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-card transition-colors hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Alle Mitarbeiter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Mitarbeiter</SelectItem>
              {employeeOptions.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="inline-flex rounded-lg border bg-card p-0.5">
            {([['month', 'Monat'], ['week', 'Woche'], ['day', 'Tag']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => setCursor(new Date())} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            <CalendarIcon className="h-3.5 w-3.5" /> Heute
          </button>
        </div>
      </div>

      {view === 'month' && renderMonth()}
      {view === 'week' && renderTimeGrid(weekDays)}
      {view === 'day' && (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          {renderTimeGrid([cursor])}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Termine am {cursor.toLocaleDateString('de-CH')}</h3>
            {dayList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag.</p>
            ) : (
              <div className="space-y-2">
                {dayList.map(apt => <Entry key={apt.id} apt={apt} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(['phone', 'video', 'onsite'] as const).map(t => {
          const Icon = typeIcon[t];
          return (
            <div key={t} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Icon className={`h-4 w-4 ${t === 'phone' ? 'text-info' : t === 'video' ? 'text-primary' : 'text-success'}`} /> {typeLabel[t]}
              </div>
              <p className="text-2xl font-bold">{visibleAppointments.filter(a => a.type === t).length}</p>
              <p className="text-xs text-muted-foreground">Termine gesamt</p>
            </div>
          );
        })}
      </div>

      <LeadDetailSheet />
    </div>
  );
}
