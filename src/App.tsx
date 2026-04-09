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

// Lazy-loaded pages for code splitting
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
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const InsightsFormPage = lazy(() => import("./pages/InsightsFormPage"));
const DocumentUploadPage = lazy(() => import("./pages/DocumentUploadPage"));
const ApplicationFormPage = lazy(() => import("./pages/ApplicationFormPage"));
const BewerbungWizard = lazy(() => import("./pages/BewerbungWizard"));
const AIVoiceAgent = lazy(() => import("./pages/AIVoiceAgent"));

// AI Voice sub-pages
const VoiceDashboardTab = lazy(() => import("./components/ai-voice/VoiceDashboardTab"));
const AgentStudioTab = lazy(() => import("./components/ai-voice/AgentStudioTab"));
const DeploymentsTab = lazy(() => import("./components/ai-voice/DeploymentsTab"));
const TestCenterTab = lazy(() => import("./components/ai-voice/TestCenterTab"));
const CampaignsTab = lazy(() => import("./components/ai-voice/CampaignsTab"));
const SessionsTab = lazy(() => import("./components/ai-voice/SessionsTab"));
const NumbersTab = lazy(() => import("./components/ai-voice/NumbersTab"));
const KnowledgeTab = lazy(() => import("./components/ai-voice/KnowledgeTab"));
const ActionRulesTab = lazy(() => import("./components/ai-voice/ActionRulesTab"));
const EscalationsTab = lazy(() => import("./components/ai-voice/EscalationsTab"));
const VoiceAnalyticsTab = lazy(() => import("./components/ai-voice/VoiceAnalyticsTab"));
const CostControlTab = lazy(() => import("./components/ai-voice/CostControlTab"));
const ComplianceTab = lazy(() => import("./components/ai-voice/ComplianceTab"));
const ProviderSettingsTab = lazy(() => import("./components/ai-voice/ProviderSettingsTab"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Routes allowed for each review role
const REVIEW_ROLE_ALLOWED: Record<string, string[]> = {
  controlling: ['/', '/leads', '/help'],
  geschaeftsleitung: ['/', '/leads', '/help'],
  hr: ['/', '/leads', '/help'],
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (role === null) return <FullScreenLoader />;
  return <>{children}</>;
}

function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const location = useLocation();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Public lead forms (no auth required) */}
              <Route path="/insights-form" element={<Suspense fallback={<FullScreenLoader />}><InsightsFormPage /></Suspense>} />
              <Route path="/document-upload" element={<Suspense fallback={<FullScreenLoader />}><DocumentUploadPage /></Suspense>} />
              <Route path="/apply" element={<Suspense fallback={<FullScreenLoader />}><ApplicationFormPage /></Suspense>} />
              <Route path="/bewerbung" element={<Suspense fallback={<FullScreenLoader />}><BewerbungWizard /></Suspense>} />

              {/* Protected routes */}
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
                <Route path="/" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                <Route path="/pipeline" element={<Suspense fallback={<PageLoader />}><Pipeline /></Suspense>} />
                <Route path="/leads" element={<Suspense fallback={<PageLoader />}><LeadsTable /></Suspense>} />
                <Route path="/agencies" element={<Suspense fallback={<PageLoader />}><Agencies /></Suspense>} />
                <Route path="/employees" element={<Suspense fallback={<PageLoader />}><Employees /></Suspense>} />
                <Route path="/calendar" element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />
                <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
                <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
                <Route path="/processes" element={<Suspense fallback={<PageLoader />}><Processes /></Suspense>} />
                <Route path="/tasks" element={<Suspense fallback={<PageLoader />}><Tasks /></Suspense>} />
                <Route path="/api-docs" element={<Suspense fallback={<PageLoader />}><ApiDocs /></Suspense>} />
                <Route path="/documentation" element={<Suspense fallback={<PageLoader />}><Documentation /></Suspense>} />
                <Route path="/help" element={<Suspense fallback={<PageLoader />}><HelpCenter /></Suspense>} />

                {/* AI Voice Agent with nested sub-routes */}
                <Route path="/ai-voice" element={<Suspense fallback={<PageLoader />}><AIVoiceAgent /></Suspense>}>
                  <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><VoiceDashboardTab /></Suspense>} />
                  <Route path="studio" element={<Suspense fallback={<PageLoader />}><AgentStudioTab /></Suspense>} />
                  <Route path="deployments" element={<Suspense fallback={<PageLoader />}><DeploymentsTab /></Suspense>} />
                  <Route path="test" element={<Suspense fallback={<PageLoader />}><TestCenterTab /></Suspense>} />
                  <Route path="campaigns" element={<Suspense fallback={<PageLoader />}><CampaignsTab /></Suspense>} />
                  <Route path="sessions" element={<Suspense fallback={<PageLoader />}><SessionsTab /></Suspense>} />
                  <Route path="numbers" element={<Suspense fallback={<PageLoader />}><NumbersTab /></Suspense>} />
                  <Route path="knowledge" element={<Suspense fallback={<PageLoader />}><KnowledgeTab /></Suspense>} />
                  <Route path="actions" element={<Suspense fallback={<PageLoader />}><ActionRulesTab /></Suspense>} />
                  <Route path="escalations" element={<Suspense fallback={<PageLoader />}><EscalationsTab /></Suspense>} />
                  <Route path="analytics" element={<Suspense fallback={<PageLoader />}><VoiceAnalyticsTab /></Suspense>} />
                  <Route path="costs" element={<Suspense fallback={<PageLoader />}><CostControlTab /></Suspense>} />
                  <Route path="compliance" element={<Suspense fallback={<PageLoader />}><ComplianceTab /></Suspense>} />
                  <Route path="providers" element={<Suspense fallback={<PageLoader />}><ProviderSettingsTab /></Suspense>} />
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
