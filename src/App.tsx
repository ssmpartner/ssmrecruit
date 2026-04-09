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
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const InsightsFormPage = lazy(() => import("./pages/InsightsFormPage"));
const DocumentUploadPage = lazy(() => import("./pages/DocumentUploadPage"));
const ApplicationFormPage = lazy(() => import("./pages/ApplicationFormPage"));
const BewerbungWizard = lazy(() => import("./pages/BewerbungWizard"));
const AIVoiceAgent = lazy(() => import("./pages/AIVoiceAgent"));

// AI Voice sub-pages
const VoiceDashboardTab = lazy(() => import("./components/ai-voice/VoiceDashboardTab"));
const LiveMonitoringTab = lazy(() => import("./components/ai-voice/LiveMonitoringTab"));
const AlertsStatusTab = lazy(() => import("./components/ai-voice/AlertsStatusTab"));
const AgentStudioTab = lazy(() => import("./components/ai-voice/AgentStudioTab"));
const DeploymentsTab = lazy(() => import("./components/ai-voice/DeploymentsTab"));
const CampaignsTab = lazy(() => import("./components/ai-voice/CampaignsTab"));
const SessionsTab = lazy(() => import("./components/ai-voice/SessionsTab"));
const EscalationsTab = lazy(() => import("./components/ai-voice/EscalationsTab"));
const KnowledgeTab = lazy(() => import("./components/ai-voice/KnowledgeTab"));
const ActionRulesTab = lazy(() => import("./components/ai-voice/ActionRulesTab"));
const ComplianceTab = lazy(() => import("./components/ai-voice/ComplianceTab"));
const ConversationGuidelinesTab = lazy(() => import("./components/ai-voice/ConversationGuidelinesTab"));
const NumbersTab = lazy(() => import("./components/ai-voice/NumbersTab"));
const ProviderSettingsTab = lazy(() => import("./components/ai-voice/ProviderSettingsTab"));
const ApiWebhooksTab = lazy(() => import("./components/ai-voice/ApiWebhooksTab"));
const CostControlTab = lazy(() => import("./components/ai-voice/CostControlTab"));
const KillSwitchTab = lazy(() => import("./components/ai-voice/KillSwitchTab"));
const VoiceAnalyticsTab = lazy(() => import("./components/ai-voice/VoiceAnalyticsTab"));
const AuditLogTab = lazy(() => import("./components/ai-voice/AuditLogTab"));
const SessionReviewsTab = lazy(() => import("./components/ai-voice/SessionReviewsTab"));
const TestCenterTab = lazy(() => import("./components/ai-voice/TestCenterTab"));
const VoiceDocsTab = lazy(() => import("./components/ai-voice/VoiceDocsTab"));

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
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/insights-form" element={<Suspense fallback={<FullScreenLoader />}><InsightsFormPage /></Suspense>} />
              <Route path="/document-upload" element={<Suspense fallback={<FullScreenLoader />}><DocumentUploadPage /></Suspense>} />
              <Route path="/apply" element={<Suspense fallback={<FullScreenLoader />}><ApplicationFormPage /></Suspense>} />
              <Route path="/bewerbung" element={<Suspense fallback={<FullScreenLoader />}><BewerbungWizard /></Suspense>} />

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

                {/* AI Voice Agent – grouped sub-routes */}
                <Route path="/ai-voice" element={<P><AIVoiceAgent /></P>}>
                  {/* Übersicht */}
                  <Route path="dashboard" element={<P><VoiceDashboardTab /></P>} />
                  <Route path="live" element={<P><LiveMonitoringTab /></P>} />
                  <Route path="alerts" element={<P><AlertsStatusTab /></P>} />
                  {/* Betrieb */}
                  <Route path="studio" element={<P><AgentStudioTab /></P>} />
                  <Route path="deployments" element={<P><DeploymentsTab /></P>} />
                  <Route path="campaigns" element={<P><CampaignsTab /></P>} />
                  <Route path="sessions" element={<P><SessionsTab /></P>} />
                  <Route path="escalations" element={<P><EscalationsTab /></P>} />
                  {/* Wissen & Steuerung */}
                  <Route path="knowledge" element={<P><KnowledgeTab /></P>} />
                  <Route path="actions" element={<P><ActionRulesTab /></P>} />
                  <Route path="compliance" element={<P><ComplianceTab /></P>} />
                  <Route path="guidelines" element={<P><ConversationGuidelinesTab /></P>} />
                  {/* Infrastruktur */}
                  <Route path="numbers" element={<P><NumbersTab /></P>} />
                  <Route path="providers" element={<P><ProviderSettingsTab /></P>} />
                  <Route path="api-webhooks" element={<P><ApiWebhooksTab /></P>} />
                  <Route path="costs" element={<P><CostControlTab /></P>} />
                  <Route path="kill-switch" element={<P><KillSwitchTab /></P>} />
                  {/* Qualität & Analyse */}
                  <Route path="analytics" element={<P><VoiceAnalyticsTab /></P>} />
                  <Route path="audit" element={<P><AuditLogTab /></P>} />
                  <Route path="reviews" element={<P><SessionReviewsTab /></P>} />
                  <Route path="test" element={<P><TestCenterTab /></P>} />
                  {/* Dokumentation */}
                  <Route path="docs" element={<P><VoiceDocsTab /></P>} />
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
