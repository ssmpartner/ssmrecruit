import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { Search } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/90 backdrop-blur-md px-8">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads, agencies..."
              className="h-9 w-full rounded-xl border bg-muted/50 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-secondary" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                SC
              </div>
              <div className="text-sm">
                <p className="font-medium leading-none">Sarah Chen</p>
                <p className="text-xs text-muted-foreground">Admin</p>
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
