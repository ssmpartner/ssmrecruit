import { useState, useMemo } from 'react';
import { useLeads } from '@/context/useLeads';
import LeadDetailSheet from '@/components/LeadDetailSheet';
import { ChevronLeft, ChevronRight, Phone, Video, Building2, CalendarIcon } from 'lucide-react';
import { getHolidayByISO, getSwissHolidays } from '@/lib/swiss-holidays';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const typeIcon = { phone: Phone, video: Video, onsite: Building2 } as const;
const typeColor = {
  phone: 'bg-info/15 text-info border-info/30',
  video: 'bg-primary/15 text-primary border-primary/30',
  onsite: 'bg-success/15 text-success border-success/30',
} as const;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday=0
}

export default function CalendarPage() {
  const { appointments, leads, employees, setSelectedLead } = useLeads();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, typeof appointments> = {};
    appointments.forEach(apt => {
      const d = apt.date; // "YYYY-MM-DD"
      if (!map[d]) map[d] = [];
      map[d].push(apt);
    });
    return map;
  }, [appointments]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const openLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) setSelectedLead(lead);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kalender</h1>
        <p className="text-muted-foreground">Terminübersicht aller Leads</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="inline-flex items-center justify-center h-9 w-9 rounded-lg border bg-card hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="inline-flex items-center justify-center h-9 w-9 rounded-lg border bg-card hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button onClick={goToday} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <CalendarIcon className="h-3.5 w-3.5" /> Heute
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {WEEKDAYS.map(d => (
            <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
            const dayApts = day ? (appointmentsByDate[dateStr] || []) : [];
            const isToday = dateStr === todayStr;
            const holiday = day ? getHolidayByISO(dateStr) : undefined;

            return (
              <div
                key={i}
                className={`min-h-[120px] border-b border-r p-1.5 ${
                  day ? (holiday ? 'bg-destructive/5' : 'bg-card') : 'bg-muted/20'
                }`}
              >
                {day && (
                  <>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      {holiday ? (
                        <span
                          title={holiday.national ? 'Feiertag (ganze Schweiz)' : `Feiertag in: ${(holiday.cantons ?? []).join(', ')}`}
                          className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                            holiday.national ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'
                          }`}
                        >
                          {holiday.name}
                        </span>
                      ) : <span />}
                      <span className={`inline-flex items-center justify-center h-7 w-7 shrink-0 text-sm font-medium rounded-full ${
                        isToday ? 'bg-primary text-primary-foreground' : holiday ? 'text-destructive' : 'text-foreground'
                      }`}>
                        {day}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayApts.slice(0, 3).map(apt => {
                        const lead = leads.find(l => l.id === apt.leadId);
                        const emp = employees.find(e => e.id === apt.createdBy);
                        const Icon = typeIcon[apt.type];
                        return (
                          <button
                            key={apt.id}
                            onClick={() => openLead(apt.leadId)}
                            className={`w-full text-left rounded-md border px-1.5 py-1 text-[11px] leading-tight hover:opacity-80 transition-opacity ${typeColor[apt.type]}`}
                          >
                            <div className="flex items-center gap-1 font-medium truncate">
                              <Icon className="h-3 w-3 shrink-0" />
                              <span className="truncate">{apt.time} {apt.title}</span>
                            </div>
                            <div className="text-[10px] opacity-75 truncate">
                              {lead?.name ?? '—'} {emp ? `· ${emp.name}` : ''}
                            </div>
                          </button>
                        );
                      })}
                      {dayApts.length > 3 && (
                        <div className="text-[10px] text-muted-foreground text-center font-medium">
                          +{dayApts.length - 3} weitere
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Feiertage */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Schweizer Feiertage {year}</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {getSwissHolidays(year).map(h => {
            const d = new Date(`${h.date}T00:00:00`);
            return (
              <div key={h.date + h.name} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="font-medium truncate">{h.name}</p>
                  <p className="text-muted-foreground">
                    {WEEKDAYS[(d.getDay() + 6) % 7]}, {d.getDate()}. {MONTHS[d.getMonth()]}
                  </p>
                </div>
                <span className={`shrink-0 rounded px-1.5 py-0.5 font-medium ${h.national ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'}`}>
                  {h.national ? 'CH' : 'teilweise'}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          «CH» gilt in der ganzen Schweiz, «teilweise» nur in einzelnen Kantonen – Details beim Überfahren im Kalender.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Phone className="h-4 w-4 text-info" /> Telefon
          </div>
          <p className="text-2xl font-bold">{appointments.filter(a => a.type === 'phone').length}</p>
          <p className="text-xs text-muted-foreground">Termine gesamt</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Video className="h-4 w-4 text-primary" /> Video-Call
          </div>
          <p className="text-2xl font-bold">{appointments.filter(a => a.type === 'video').length}</p>
          <p className="text-xs text-muted-foreground">Termine gesamt</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Building2 className="h-4 w-4 text-success" /> Vor Ort
          </div>
          <p className="text-2xl font-bold">{appointments.filter(a => a.type === 'onsite').length}</p>
          <p className="text-xs text-muted-foreground">Termine gesamt</p>
        </div>
      </div>

      <LeadDetailSheet />
    </div>
  );
}
