import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Kanban, Table, Building2, UserCog, BarChart3, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/leads', icon: Table, label: 'Leads' },
  { to: '/agencies', icon: Building2, label: 'Agenturen' },
  { to: '/employees', icon: UserCog, label: 'Mitarbeiter' },
  { to: '/analytics', icon: BarChart3, label: 'Statistik' },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Users className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">RecruitFlow</span>
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary-foreground'
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary-foreground transition-colors"
        >
          <Settings className="h-4.5 w-4.5" />
          Einstellungen
        </NavLink>
      </div>
    </aside>
  );
}
