import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Kanban, Table, Building2, UserCog, BarChart3, Settings, CalendarDays, Workflow, Code2, FileText, CheckSquare, LogOut, PanelLeftClose, PanelLeft, HelpCircle, Bot, ChevronDown, ChevronRight, Activity, Cog, TrendingUp, BookOpen, FileSearch, MessageSquare, FileSignature } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSidebarState } from '@/context/SidebarContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { useAIVoicePermissions } from '@/hooks/useAIVoicePermissions';

const allNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: null, excludeRoles: [] as string[] },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline', roles: null, excludeRoles: ['controlling', 'geschaeftsleitung', 'hr'] as string[] },
  { to: '/leads', icon: Table, label: 'Leads', roles: null, excludeRoles: [] as string[] },
  { to: '/tasks', icon: CheckSquare, label: 'Aufgaben', roles: null, excludeRoles: ['controlling', 'geschaeftsleitung', 'hr'] as string[] },
  { to: '/calendar', icon: CalendarDays, label: 'Kalender', roles: null, excludeRoles: ['hr'] as string[] },
  { to: '/agencies', icon: Building2, label: 'Agenturen', roles: ['superadmin', 'admin', 'analyst'] as string[], excludeRoles: [] as string[] },
  { to: '/employees', icon: UserCog, label: 'Mitarbeiter', roles: ['superadmin', 'admin', 'analyst'] as string[], excludeRoles: [] as string[] },
  { to: '/analytics', icon: BarChart3, label: 'Statistik', roles: null, excludeRoles: ['hr'] as string[] },
  { to: '/contracts', icon: FileSignature, label: 'Verträge', roles: ['superadmin'] as string[], excludeRoles: [] as string[] },
];

const aiVoiceSubItems = [
  { to: '/ai-voice/overview', icon: BarChart3, label: 'Übersicht' },
  { to: '/ai-voice/betrieb', icon: Activity, label: 'Betrieb' },
  { to: '/ai-voice/wissen', icon: BookOpen, label: 'Wissen & Regeln' },
  { to: '/ai-voice/infrastruktur', icon: Cog, label: 'Infrastruktur' },
  { to: '/ai-voice/qualitaet', icon: TrendingUp, label: 'Qualität & Analyse' },
  { to: '/ai-voice/docs', icon: FileSearch, label: 'Dokumentation' },
];

const allBottomItems = [
  { to: '/settings', icon: Settings, label: 'Einstellungen', roles: null, excludeRoles: ['hr'] as string[] },
  { to: '/processes', icon: Workflow, label: 'Prozesse', roles: ['superadmin', 'admin', 'analyst'] as string[], excludeRoles: [] as string[] },
  { to: '/api-docs', icon: Code2, label: 'API-Dokumentation', roles: ['superadmin', 'admin'] as string[], excludeRoles: [] as string[] },
  { to: '/documentation', icon: FileText, label: 'Dokumentation', roles: ['superadmin', 'admin', 'analyst'] as string[], excludeRoles: [] as string[] },
  { to: '/feedback', icon: MessageSquare, label: 'Feedback', roles: null, excludeRoles: [] as string[] },
  { to: '/help', icon: HelpCircle, label: 'Hilfe-Center', roles: null, excludeRoles: [] as string[] },
];

function SidebarNavItem({ to, icon: Icon, label, isActive, collapsed, indent = false }: { to: string; icon: React.ElementType; label: string; isActive: boolean; collapsed: boolean; indent?: boolean }) {
  const link = (
    <NavLink
      to={to}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
        collapsed ? 'justify-center' : ''
      } ${indent && !collapsed ? 'pl-8' : ''} ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      }`}
    >
      <Icon className="shrink-0 h-[18px] w-[18px]" />
      {!collapsed && <span className="text-sm">{label}</span>}
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
  const { signOut, role, loading } = useAuth();
  const { collapsed, toggle } = useSidebarState();
  const perms = useAIVoicePermissions();

  const isAiVoiceActive = location.pathname.startsWith('/ai-voice');
  const [aiVoiceOpen, setAiVoiceOpen] = useState(isAiVoiceActive);

  const roleReady = !loading && role !== null;
  const canSeeAiVoice = roleReady && perms.canAccessModule;

  const navItems = roleReady ? allNavItems.filter(item => {
    if (item.roles && !item.roles.includes(role!)) return false;
    if (item.excludeRoles.length > 0 && item.excludeRoles.includes(role!)) return false;
    return true;
  }) : [];
  const bottomItems = roleReady ? allBottomItems.filter(item => {
    if (item.roles && !item.roles.includes(role!)) return false;
    if (item.excludeRoles.length > 0 && item.excludeRoles.includes(role!)) return false;
    return true;
  }) : [];

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
        {!roleReady ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${collapsed ? 'justify-center' : ''}`}>
              <div className="h-[18px] w-[18px] rounded bg-sidebar-accent/40 animate-pulse shrink-0" />
              {!collapsed && <div className="h-4 w-24 rounded bg-sidebar-accent/40 animate-pulse" />}
            </div>
          ))
        ) : (
          <>
            {navItems.map(({ to, icon, label }) => (
              <SidebarNavItem key={to} to={to} icon={icon} label={label} isActive={location.pathname === to} collapsed={collapsed} />
            ))}

            {/* AI Voice Agent – 6 Unterpunkte */}
            {canSeeAiVoice && (
              <>
                {collapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate('/ai-voice/overview')}
                        className={`flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                          isAiVoiceActive
                            ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                        }`}
                      >
                        <Bot className="h-[18px] w-[18px] shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">AI Voice Agent</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <button
                      onClick={() => setAiVoiceOpen(prev => !prev)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 mt-2 ${
                        isAiVoiceActive
                          ? 'bg-sidebar-accent/40 text-sidebar-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <Bot className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 text-left">AI Voice Agent</span>
                      {aiVoiceOpen || isAiVoiceActive ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      )}
                    </button>

                    {(aiVoiceOpen || isAiVoiceActive) && (
                      <div className="mt-1 space-y-0.5">
                        {aiVoiceSubItems.map(item => (
                          <SidebarNavItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            isActive={location.pathname === item.to}
                            collapsed={false}
                            indent
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-0.5">
        {bottomItems.map(({ to, icon, label }) => (
          <SidebarNavItem key={to} to={to} icon={icon} label={label} isActive={location.pathname === to} collapsed={collapsed} />
        ))}

        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button onClick={handleLogout} className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-200">
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">Abmelden</TooltipContent>
          </Tooltip>
        ) : (
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-200">
            <LogOut className="h-[18px] w-[18px]" />
            Abmelden
          </button>
        )}

        <button onClick={toggle} className="flex w-full items-center justify-center rounded-xl px-3 py-2 mt-1 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all duration-200">
          {collapsed ? <PanelLeft className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </aside>
  );
}
