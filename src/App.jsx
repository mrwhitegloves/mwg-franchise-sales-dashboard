import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectToken } from "@/app/authSlice";
import { SessionGate } from "@/components/SessionGate";
import { AppLayout } from "@/components/AppLayout";
import { RoleRoute } from "@/components/RoleRoute";
import { PageSkeleton } from "@/components/PageSkeleton";
import LoginPage from "@/features/auth/LoginPage";

// Route-level code splitting (§79: fast first load)
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const LeadsPage = lazy(() => import("@/features/leads/LeadsPage"));
const LeadDetailPage = lazy(() => import("@/features/leads/LeadDetailPage"));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage"));
const ComingSoonPage = lazy(() => import("@/features/misc/ComingSoonPage"));
const UnassignedPage = lazy(() => import("@/features/control/UnassignedPage"));
const TeamPage = lazy(() => import("@/features/control/TeamPage"));
const TeamLeadsPage = lazy(() => import("@/features/control/TeamLeadsPage"));
const WhatsAppPage = lazy(() => import("@/features/whatsapp/WhatsAppPage"));
const FollowUpsPage = lazy(() => import("@/features/work/FollowUpsPage"));
const TasksPage = lazy(() => import("@/features/work/TasksPage"));
const MeetingsPage = lazy(() => import("@/features/work/MeetingsPage"));
const SlaPage = lazy(() => import("@/features/control/SlaPage"));
const ProposalsPage = lazy(() => import("@/features/deals/DealPages").then((m) => ({ default: m.ProposalsPage })));
const PaymentsPage = lazy(() => import("@/features/deals/DealPages").then((m) => ({ default: m.PaymentsPage })));
const RevenuePage = lazy(() => import("@/features/control/RevenuePage"));
const OverviewPage = lazy(() => import("@/features/control/OverviewPage"));
const PerformancePage = lazy(() => import("@/features/control/PerformancePage"));
const PersonAuditPage = lazy(() => import("@/features/control/PerformancePage").then((m) => ({ default: m.PersonAuditPage })));
const ReportsPage = lazy(() => import("@/features/control/ReportsPage"));
const ActivitiesPage = lazy(() => import("@/features/control/ReportsPage").then((m) => ({ default: m.ActivitiesPage })));
const RulesPage = lazy(() => import("@/features/control/RulesPage"));
const MyPerformancePage = lazy(() => import("@/features/performance/MyPerformancePage"));

function Protected({ children }) {
  const token = useSelector(selectToken);
  if (!token) return <Navigate to="/login" replace />;
  return <SessionGate>{children}</SessionGate>;
}

export default function App() {
  const token = useSelector(selectToken);
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<Protected><AppLayout /></Protected>}>
        <Route index element={<Lazy><DashboardPage /></Lazy>} />
        <Route path="leads" element={<Lazy><LeadsPage key="my" mode="my" /></Lazy>} />
        <Route path="hot-leads" element={<Lazy><LeadsPage key="hot" mode="hot" /></Lazy>} />
        <Route path="leads/:id" element={<Lazy><LeadDetailPage /></Lazy>} />
        <Route path="whatsapp" element={<Lazy><WhatsAppPage /></Lazy>} />
        <Route path="whatsapp/:id" element={<Lazy><WhatsAppPage /></Lazy>} />
        <Route path="follow-ups" element={<Lazy><FollowUpsPage /></Lazy>} />
        <Route path="meetings" element={<Lazy><MeetingsPage /></Lazy>} />
        <Route path="proposals" element={<Lazy><ProposalsPage /></Lazy>} />
        <Route path="payments" element={<Lazy><PaymentsPage /></Lazy>} />
        <Route path="tasks" element={<Lazy><TasksPage /></Lazy>} />
        <Route path="performance" element={<Lazy><MyPerformancePage /></Lazy>} />
        <Route path="profile" element={<Lazy><ProfilePage /></Lazy>} />
        <Route path="control" element={<RoleRoute min="MANAGER" />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Lazy><OverviewPage /></Lazy>} />
          <Route path="performance" element={<Lazy><PerformancePage /></Lazy>} />
          <Route path="people/:userId" element={<Lazy><PersonAuditPage /></Lazy>} />
          <Route path="reports" element={<Lazy><ReportsPage /></Lazy>} />
          <Route path="activities" element={<Lazy><ActivitiesPage /></Lazy>} />
          <Route path="rules" element={<Lazy><RulesPage /></Lazy>} />
          <Route path="unassigned" element={<Lazy><UnassignedPage /></Lazy>} />
          <Route path="team" element={<Lazy><TeamPage /></Lazy>} />
          <Route path="leads" element={<Lazy><TeamLeadsPage /></Lazy>} />
          <Route path="sla" element={<Lazy><SlaPage /></Lazy>} />
          <Route path="revenue" element={<Lazy><RevenuePage /></Lazy>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function Lazy({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
