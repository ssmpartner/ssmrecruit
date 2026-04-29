import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeadsProvider } from "./context/LeadsProvider";
import { NotificationsProvider } from "./context/NotificationsProvider";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";
import { SidebarProvider } from "./context/SidebarContext";
import { Loader2 } from "lucide-react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const LeadsTable = lazy(() => import("./pages/LeadsTable"));
const Agencies = lazy(() => import("./pages/Agencies"));
const Employees = lazy(() => import("./pages/Employees"));
const Analytics = lazy(() => import("./pages/Analytics"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Settings = lazy(() => import("./pages/Settings"));
const Processes = lazy(() => import("./pages/Processes"));
const Tasks = lazy(() => import("./pages/Tasks"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Documentation = lazy(() => import("./pages/Documentation"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const InsightsFormPage = lazy(() => import("./pages/InsightsFormPage"));
const DocumentUploadPage = lazy(() => import("./pages/DocumentUploadPage"));
const ApplicationFormPage = lazy(() => import("./pages/ApplicationFormPage"));
const BewerbungWizard = lazy(() => import("./pages/BewerbungWizard"));
const SsoCallback = lazy(() => import("./pages/SsoCallback"));
const AIVoiceAgent = lazy(() => import("./pages/AIVoiceAgent"));

// AI Voice – 6 container pages
const AIVoiceOverview = lazy(() => import("./pages/ai-voice/AIVoiceOverview"));
const AIVoiceBetrieb = lazy(() => import("./pages/ai-voice/AIVoiceBetrieb"));
const AIVoiceWissen = lazy(() => import("./pages/ai-voice/AIVoiceWissen"));
const AIVoiceInfrastruktur = lazy(() => import("./pages/ai-voice/AIVoiceInfrastruktur"));
const AIVoiceQualitaet = lazy(() => import("./pages/ai-voice/AIVoiceQualitaet"));
const AIVoiceDokumentation = lazy(() => import("./pages/ai-voice/AIVoiceDokumentation"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false } },
});

function PageLoader() {
  return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
}

function FullScreenLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
}

const REVIEW_ROLE_ALLOWED: Record<string, string[]> = {
  controlling: ['/', '/leads', '/help'],
  geschaeftsleitung: ['/', '/leads', '/help'],
  hr: ['/', '/leads', '/help'],
};

// Routes blocked for backoffice role (agency-scoped users)
const BACKOFFICE_BLOCKED_PREFIXES = ['/agencies', '/employees', '/processes', '/documentation', '/api-docs'];

// Routes restricted to superadmin only
const SUPERADMIN_ONLY_PREFIXES = ['/ai-voice'];

const SSM_PORTAL_URL = 'https://ssmpartner.lovable.app/portal';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role === null) return <FullScreenLoader />;
  return <>{children}</>;
}

function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const { role, isSuperadmin } = useAuth();
  const location = useLocation();
  if (SUPERADMIN_ONLY_PREFIXES.some(p => location.pathname.startsWith(p)) && !isSuperadmin) {
    return <Navigate to="/" replace />;
  }
  if (role === 'backoffice' && BACKOFFICE_BLOCKED_PREFIXES.some(p => location.pathname.startsWith(p))) {
    return <Navigate to="/" replace />;
  }
  const allowed = role ? REVIEW_ROLE_ALLOWED[role] : null;
  if (allowed && !allowed.includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function P({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/insights-form" element={<Suspense fallback={<FullScreenLoader />}><InsightsFormPage /></Suspense>} />
              <Route path="/document-upload" element={<Suspense fallback={<FullScreenLoader />}><DocumentUploadPage /></Suspense>} />
              <Route path="/apply" element={<Suspense fallback={<FullScreenLoader />}><ApplicationFormPage /></Suspense>} />
              <Route path="/bewerbung" element={<Suspense fallback={<FullScreenLoader />}><BewerbungWizard /></Suspense>} />
              <Route path="/sso-callback" element={<Suspense fallback={<FullScreenLoader />}><SsoCallback /></Suspense>} />

              <Route element={
                <ProtectedRoute>
                  <NotificationsProvider>
                    <LeadsProvider>
                      <SidebarProvider>
                        <RoleRouteGuard>
                          <AppLayout />
                        </RoleRouteGuard>
                      </SidebarProvider>
                    </LeadsProvider>
                  </NotificationsProvider>
                </ProtectedRoute>
              }>
                <Route path="/" element={<P><Dashboard /></P>} />
                <Route path="/pipeline" element={<P><Pipeline /></P>} />
                <Route path="/leads" element={<P><LeadsTable /></P>} />
                <Route path="/agencies" element={<P><Agencies /></P>} />
                <Route path="/employees" element={<P><Employees /></P>} />
                <Route path="/calendar" element={<P><CalendarPage /></P>} />
                <Route path="/analytics" element={<P><Analytics /></P>} />
                <Route path="/settings" element={<P><Settings /></P>} />
                <Route path="/processes" element={<P><Processes /></P>} />
                <Route path="/tasks" element={<P><Tasks /></P>} />
                <Route path="/api-docs" element={<P><ApiDocs /></P>} />
                <Route path="/documentation" element={<P><Documentation /></P>} />
                <Route path="/help" element={<P><HelpCenter /></P>} />

                {/* AI Voice Agent – 6 Hauptbereiche mit Tabs */}
                <Route path="/ai-voice" element={<P><AIVoiceAgent /></P>}>
                  <Route index element={<Navigate to="/ai-voice/overview" replace />} />
                  <Route path="overview" element={<P><AIVoiceOverview /></P>} />
                  <Route path="betrieb" element={<P><AIVoiceBetrieb /></P>} />
                  <Route path="wissen" element={<P><AIVoiceWissen /></P>} />
                  <Route path="infrastruktur" element={<P><AIVoiceInfrastruktur /></P>} />
                  <Route path="qualitaet" element={<P><AIVoiceQualitaet /></P>} />
                  <Route path="docs" element={<P><AIVoiceDokumentation /></P>} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
