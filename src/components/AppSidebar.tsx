import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Kanban, Table, Building2, UserCog, BarChart3, Settings, CalendarDays, Workflow, Code2, FileText, CheckSquare, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/leads', icon: Table, label: 'Leads' },
  { to: '/tasks', icon: CheckSquare, label: 'Aufgaben' },
  { to: '/calendar', icon: CalendarDays, label: 'Kalender' },
  { to: '/agencies', icon: Building2, label: 'Agenturen' },
  { to: '/employees', icon: UserCog, label: 'Mitarbeiter' },
  { to: '/analytics', icon: BarChart3, label: 'Statistik' },
  { to: '/processes', icon: Workflow, label: 'Prozesse' },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary">
          <Users className="h-4.5 w-4.5 text-sidebar-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SSM Recruit</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-0.5">
        {[
          { to: '/settings', icon: Settings, label: 'Einstellungen' },
          { to: '/api-docs', icon: Code2, label: 'API-Dokumentation' },
          { to: '/documentation', icon: FileText, label: 'Dokumentation' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              location.pathname === to
                ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Abmelden
        </button>
        <div className="mt-2 border-t border-sidebar-border pt-2 px-1">
          <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.display_name || user?.email}</p>
          <p className="text-[10px] text-sidebar-foreground/40 truncate">{user?.email}</p>
        </div>
      </div>
    </aside>
  );
}
