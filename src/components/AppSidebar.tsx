import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Kanban, Table, Building2, UserCog, BarChart3, Settings, CalendarDays, Workflow, Code2, FileText, CheckSquare, LogOut, PanelLeftClose, PanelLeft, HelpCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSidebarState } from '@/context/SidebarContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const allNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: null, excludeRoles: ['controlling', 'geschaeftsleitung', 'hr'] as string[] },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline', roles: null, excludeRoles: ['controlling', 'geschaeftsleitung', 'hr'] as string[] },
  { to: '/leads', icon: Table, label: 'Leads', roles: null, excludeRoles: [] as string[] },
  { to: '/tasks', icon: CheckSquare, label: 'Aufgaben', roles: null, excludeRoles: ['controlling', 'geschaeftsleitung', 'hr'] as string[] },
  { to: '/calendar', icon: CalendarDays, label: 'Kalender', roles: null, excludeRoles: ['controlling', 'geschaeftsleitung', 'hr'] as string[] },
  { to: '/agencies', icon: Building2, label: 'Agenturen', roles: ['superadmin', 'admin', 'backoffice', 'analyst'] as string[], excludeRoles: [] as string[] },
  { to: '/employees', icon: UserCog, label: 'Mitarbeiter', roles: ['superadmin', 'admin', 'backoffice', 'analyst'] as string[], excludeRoles: [] as string[] },
  { to: '/analytics', icon: BarChart3, label: 'Statistik', roles: null, excludeRoles: ['controlling', 'geschaeftsleitung', 'hr'] as string[] },
];

const allBottomItems = [
  { to: '/settings', icon: Settings, label: 'Einstellungen', roles: null, excludeRoles: ['controlling', 'geschaeftsleitung', 'hr'] as string[] },
  { to: '/processes', icon: Workflow, label: 'Prozesse', roles: ['superadmin', 'admin', 'backoffice', 'analyst'] as string[], excludeRoles: [] as string[] },
  { to: '/api-docs', icon: Code2, label: 'API-Dokumentation', roles: ['superadmin', 'admin'] as string[], excludeRoles: [] as string[] },
  { to: '/documentation', icon: FileText, label: 'Dokumentation', roles: ['superadmin', 'admin', 'backoffice', 'analyst'] as string[], excludeRoles: [] as string[] },
  { to: '/help', icon: HelpCircle, label: 'Hilfe-Center', roles: null, excludeRoles: [] as string[] },
];

function SidebarNavItem({ to, icon: Icon, label, isActive, collapsed }: { to: string; icon: React.ElementType; label: string; isActive: boolean; collapsed: boolean }) {
  const link = (
    <NavLink
      to={to}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        collapsed ? 'justify-center' : ''
      } ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && label}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user, role } = useAuth();
  const { collapsed, toggle } = useSidebarState();

  const navItems = allNavItems.filter(item => {
    if (item.roles && (!role || !item.roles.includes(role))) return false;
    if (item.excludeRoles.length > 0 && role && item.excludeRoles.includes(role)) return false;
    return true;
  });
  const bottomItems = allBottomItems.filter(item => {
    if (item.roles && (!role || !item.roles.includes(role))) return false;
    if (item.excludeRoles.length > 0 && role && item.excludeRoles.includes(role)) return false;
    return true;
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
      <div className={`flex h-16 items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-6'} border-b border-sidebar-border`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary shrink-0">
          <Users className="h-4.5 w-4.5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && <span className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SSM Recruit</span>}
      </div>

      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, icon, label }) => (
          <SidebarNavItem key={to} to={to} icon={icon} label={label} isActive={location.pathname === to} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-0.5">
        {bottomItems.map(({ to, icon, label }) => (
          <SidebarNavItem key={to} to={to} icon={icon} label={label} isActive={location.pathname === to} collapsed={collapsed} />
        ))}

        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">Abmelden</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Abmelden
          </button>
        )}


        <button
          onClick={toggle}
          className="flex w-full items-center justify-center rounded-xl px-3 py-2 mt-1 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all duration-200"
        >
          {collapsed ? <PanelLeft className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </aside>
  );
}
