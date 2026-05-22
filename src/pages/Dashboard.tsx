import { useEffect, useMemo, useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, Clock, Target, CalendarDays, ListTodo, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Cloudy, UserPlus, ClipboardList, Building2, BarChart3, Plus, Sparkles, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AddLeadDialog from '@/components/AddLeadDialog';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import SourceBadge from '@/components/SourceBadge';
import LeadDetailSheet from '@/components/LeadDetailSheet';
import { useLeads } from '@/context/useLeads';
import { useAuth } from '@/context/AuthContext';
import { resolveFirstName } from '@/lib/display-name';
import { statusConfig } from '@/lib/mock-data';
import { supabase } from '@/integrations/supabase/client';

const PIE_COLORS = ['hsl(168, 17%, 23%)', 'hsl(162, 17%, 50%)', 'hsl(67, 16%, 66%)', 'hsl(38, 80%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(162, 40%, 42%)', 'hsl(0, 65%, 51%)'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Nachmittag';
  return 'Guten Abend';
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
}

const WeatherIcon = forwardRef<SVGSVGElement, { icon: string }>(({ icon, ...props }, ref) => {
  const cls = "h-5 w-5";
  if (icon.includes('rain')) return <CloudRain className={cls} ref={ref} {...props} />;
  if (icon.includes('snow')) return <CloudSnow className={cls} ref={ref} {...props} />;
  if (icon.includes('thunder')) return <CloudLightning className={cls} ref={ref} {...props} />;
  if (icon.includes('cloud') || icon.includes('overcast')) return <Cloudy className={cls} ref={ref} {...props} />;
  if (icon.includes('sun') || icon.includes('clear')) return <Sun className={cls} ref={ref} {...props} />;
  return <Cloud className={cls} ref={ref} {...props} />;
});
WeatherIcon.displayName = 'WeatherIcon';

function MiniStat({ icon: Icon, label, value, color, onClick }: { icon: any; label: string; value: number | string; color?: string; onClick?: () => void }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="rounded-lg bg-primary/10 p-2.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={color ? { color } : undefined}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}



export default function Dashboard() {
  const { leads, employees, agencies, appointments, leadSources, setSelectedLead } = useLeads();
  const { profile, user, isControlling, isGeschaeftsleitung, isHR, isReviewRole, isSuperadmin } = useAuth();
  const navigate = useNavigate();
  const [showAddLead, setShowAddLead] = useState(false);
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [openTaskCount, setOpenTaskCount] = useState(0);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Weather (free API, no key needed)
  useEffect(() => {
    fetch('https://wttr.in/Zurich?format=j1')
      .then(r => r.json())
      .then(d => {
        const cur = d.current_condition?.[0];
        if (cur) {
          setWeather({
            temp: parseInt(cur.temp_C),
            description: cur.lang_de?.[0]?.value || cur.weatherDesc?.[0]?.value || '',
            icon: (cur.weatherDesc?.[0]?.value || '').toLowerCase(),
          });
        }
      })
      .catch(() => {});
  }, []);

  // Open tasks count from DB
  useEffect(() => {
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'open')
      .then(({ count }) => setOpenTaskCount(count ?? 0));
  }, []);

  // Active leads only
  const activeLeads = useMemo(() => leads.filter(l => l.lifecycle === 'active'), [leads]);

  // Source breakdown using dynamic lead sources
  const sourceData = useMemo(() => {
    return leadSources.map(src => ({
      name: src.label,
      value: activeLeads.filter(l => l.source === src.id).length,
      color: src.color,
    })).filter(d => d.value > 0);
  }, [activeLeads, leadSources]);

  // Status breakdown
  const statusData = useMemo(() =>
    Object.entries(statusConfig).map(([key, config]) => ({
      name: config.label,
      value: activeLeads.filter(l => l.status === key).length,
    })).filter(d => d.value > 0)
  , [activeLeads]);

  // Upcoming appointments (today and future)
  const todayStr = now.toISOString().slice(0, 10);
  const upcomingAppointments = useMemo(() =>
    appointments
      .filter(a => a.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 5)
  , [appointments, todayStr]);

  const hiredCount = activeLeads.filter(l => l.status === 'hired').length;
  const newCount = activeLeads.filter(l => l.status === 'new').length;
  const conversionRate = activeLeads.length > 0 ? ((hiredCount / activeLeads.length) * 100).toFixed(1) : '0';

  const displayName = resolveFirstName(profile?.display_name, user?.email, 'User');

  // Role-specific leads
  const roleLeads = useMemo(() => {
    if (isControlling) return activeLeads.filter(l => l.status === 'ready_for_controlling');
    if (isGeschaeftsleitung) return activeLeads.filter(l => l.status === 'management_review');
    if (isHR) return activeLeads.filter(l => l.status === 'hr_processing');
    return [];
  }, [activeLeads, isControlling, isGeschaeftsleitung, isHR]);

  const roleTitle = isControlling ? 'Zu prüfen' : isGeschaeftsleitung ? 'Freigaben offen' : 'Onboarding';

  // Controlling gets a focused, minimal dashboard
  if (isControlling) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Willkommen zurück, {displayName} 👋
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
              {roleLeads.length > 0
                ? `Du hast ${roleLeads.length} Kandidaten zur Prüfung`
                : 'Du hast aktuell keine Kandidaten zur Prüfung'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
              <Clock className="h-4 w-4" />
              <span className="font-medium tabular-nums">{formatTime(now)}</span>
            </div>
          </div>
        </div>

        {roleLeads.length > 0 && (
          <button
            onClick={() => navigate('/leads')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Users className="h-4 w-4" />
            Zur Prüfung ({roleLeads.length})
          </button>
        )}

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-base font-semibold">Kandidaten zur Prüfung</h3>
          </div>
          <div className="px-6 pb-6">
            {roleLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UserCheck className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Keine Kandidaten zur Prüfung</p>
                <p className="text-xs">Sobald ein Kandidat zugewiesen wird, erscheint er hier.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roleLeads.slice(0, 10).map(lead => {
                  const ag = agencies.find(a => a.id === lead.agencyId);
                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.position} · {ag?.name ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <LeadStatusBadge status={lead.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <LeadDetailSheet />
      </div>
    );
  }

  // Other review roles (GL, HR) get a simplified dashboard
  if (isReviewRole) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {getGreeting()}, {displayName} 👋
            </h1>
            <p className="text-muted-foreground">{formatDate(now)}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
              <Clock className="h-4 w-4" />
              <span className="font-medium tabular-nums">{formatTime(now)}</span>
            </div>
          </div>
        </div>

        <MiniStat icon={Users} label={roleTitle} value={roleLeads.length} onClick={() => navigate('/leads')} />

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-base font-semibold">{roleTitle}</h3>
            <a href="/leads" className="text-sm font-medium text-primary hover:underline">Alle anzeigen →</a>
          </div>
          <div className="px-6 pb-6">
            {roleLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Keine Leads zur Bearbeitung</p>
            ) : (
              <div className="space-y-3">
                {roleLeads.slice(0, 10).map(lead => {
                  const ag = agencies.find(a => a.id === lead.agencyId);
                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.position} · {ag?.name ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <SourceBadge source={lead.source} />
                        <LeadStatusBadge status={lead.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <LeadDetailSheet />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {displayName} 👋
          </h1>
          <p className="text-muted-foreground">{formatDate(now)}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
            <Clock className="h-4 w-4" />
            <span className="font-medium tabular-nums">{formatTime(now)}</span>
          </div>
          {weather && (
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
              <WeatherIcon icon={weather.icon} />
              <span className="font-medium">{weather.temp}°C</span>
              <span className="hidden sm:inline text-xs">{weather.description}</span>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" />
                Neu
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowAddLead(true)} className="cursor-pointer">
                <UserPlus className="mr-2 h-4 w-4" />
                Neuer Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/tasks')} className="cursor-pointer">
                <ClipboardList className="mr-2 h-4 w-4" />
                Neuer Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/calendar')} className="cursor-pointer">
                <CalendarDays className="mr-2 h-4 w-4" />
                Neuer Termin
              </DropdownMenuItem>
              {isSuperadmin && (
                <DropdownMenuItem onClick={() => navigate('/agencies')} className="cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4" />
                  Neue Agentur
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat icon={Users} label="Leads gesamt" value={activeLeads.length} onClick={() => navigate('/leads')} />
        <MiniStat icon={Sparkles} label="Neue Leads" value={newCount} onClick={() => navigate('/leads')} />
        <MiniStat icon={UserCheck} label="Eingestellt" value={hiredCount} />
        <MiniStat icon={Target} label="Konversion" value={`${conversionRate}%`} onClick={() => navigate('/analytics')} />
        <MiniStat icon={ListTodo} label="Offene Tasks" value={openTaskCount} onClick={() => navigate('/tasks')} />
        <MiniStat icon={CalendarDays} label="Anst. Termine" value={upcomingAppointments.length} onClick={() => navigate('/calendar')} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4">Leads nach Kanal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid hsl(var(--border))', fontSize: 13 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {sourceData.map((entry, i) => (
                  <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4">Pipeline-Verteilung</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid hsl(var(--border))', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom: Upcoming Appointments + Recent Leads */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-base font-semibold">Anstehende Termine</h3>
            <a href="/calendar" className="text-sm font-medium text-primary hover:underline">Kalender →</a>
          </div>
          <div className="px-6 pb-6">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Keine anstehenden Termine</p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map(apt => {
                  const lead = leads.find(l => l.id === apt.leadId);
                  return (
                    <div key={apt.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{apt.title}</p>
                        <p className="text-xs text-muted-foreground">{lead?.name ?? '—'} · {apt.type === 'video' ? 'Video' : apt.type === 'phone' ? 'Telefon' : 'Vor Ort'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium tabular-nums">{apt.time}</p>
                        <p className="text-xs text-muted-foreground">{new Date(apt.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-base font-semibold">Neueste Leads</h3>
            <a href="/leads" className="text-sm font-medium text-primary hover:underline">Alle anzeigen →</a>
          </div>
          <div className="px-6 pb-6">
            <div className="space-y-3">
              {activeLeads.slice(0, 5).map(lead => {
                const ag = agencies.find(a => a.id === lead.agencyId);
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.position} · {ag?.name ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SourceBadge source={lead.source} />
                      <LeadStatusBadge status={lead.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <LeadDetailSheet />
      <AddLeadDialog open={showAddLead} onOpenChange={setShowAddLead} />
    </div>
  );
}
