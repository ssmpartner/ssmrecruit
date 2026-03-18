import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeadsProvider } from "./context/LeadsProvider";
import { NotificationsProvider } from "./context/NotificationsProvider";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import LeadsTable from "./pages/LeadsTable";
import Agencies from "./pages/Agencies";
import Employees from "./pages/Employees";
import Analytics from "./pages/Analytics";
import CalendarPage from "./pages/CalendarPage";
import Settings from "./pages/Settings";
import Processes from "./pages/Processes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// App root – v2
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <NotificationsProvider>
      <LeadsProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/leads" element={<LeadsTable />} />
              <Route path="/agencies" element={<Agencies />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/processes" element={<Processes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LeadsProvider>
      </NotificationsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
