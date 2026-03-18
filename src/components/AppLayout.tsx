import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { Search } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '@/context/AuthContext';

export default function AppLayout() {
  const { profile, user } = useAuth();

  const initials = (profile?.display_name || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/90 backdrop-blur-md px-8">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Leads, Agenturen suchen..."
              className="h-9 w-full rounded-xl border bg-muted/50 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                {initials}
              </div>
              <div className="text-sm">
                <p className="font-medium leading-none">{profile?.display_name || 'Benutzer'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
