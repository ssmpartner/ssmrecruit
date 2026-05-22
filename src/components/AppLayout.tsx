import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import GlobalSearchDialog from './GlobalSearchDialog';
import { Search, ChevronDown, ExternalLink, Settings, LogOut } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '@/context/AuthContext';
import { useSidebarState } from '@/context/SidebarContext';
import { resolveDisplayName } from '@/lib/display-name';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const { collapsed } = useSidebarState();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const displayName = resolveDisplayName(profile?.display_name, user?.email, 'Benutzer');
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handlePortalSwitch = () => {
    window.open('https://ssmpartner.ch', '_blank');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className={`transition-all duration-300 ${collapsed ? 'pl-[68px]' : 'pl-64'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/90 backdrop-blur-md px-8">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group relative flex h-9 w-96 items-center gap-2 rounded-xl border bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-background hover:border-ring/40 transition-all"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left truncate">Suchen…</span>
            <kbd className="hidden md:inline-flex h-5 items-center rounded border bg-background px-1.5 text-[10px] font-medium">⌘K</kbd>
          </button>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60 transition-colors outline-none">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile?.display_name || 'Profil'}
                      className="h-8 w-8 rounded-xl object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                      {initials}
                    </div>
                  )}
                  <span className="text-sm font-medium">{profile?.display_name || 'Benutzer'}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Einstellungen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePortalSwitch} className="cursor-pointer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Zum SSM Portal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
