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
        <Route path="whatsapp" element={<Lazy><ComingSoonPage title="WhatsApp" chapter="FS06" text="Your franchise conversations on the central MWG WhatsApp number — reply as Mr. White Gloves from here." /></Lazy>} />
        <Route path="follow-ups" element={<Lazy><ComingSoonPage title="Follow-ups" chapter="FS08" text="Today / Overdue / Upcoming follow-ups with reminders and escalation." /></Lazy>} />
        <Route path="meetings" element={<Lazy><ComingSoonPage title="Meetings" chapter="FS08" text="Your franchise meetings and calendar. Meetings already booked show on each lead." /></Lazy>} />
        <Route path="proposals" element={<Lazy><ComingSoonPage title="Proposals" chapter="FS09" text="Create and send franchise proposals through the central WhatsApp." /></Lazy>} />
        <Route path="payments" element={<Lazy><ComingSoonPage title="Payments" chapter="FS09" text="Payment links and payment status (a manager / admin confirms payments)." /></Lazy>} />
        <Route path="tasks" element={<Lazy><ComingSoonPage title="Tasks" chapter="FS08" text="Calls, WhatsApps, KYC and onboarding tasks for your leads." /></Lazy>} />
        <Route path="performance" element={<Lazy><ComingSoonPage title="My Performance" chapter="FS11" text="Your leads, conversion, meetings, proposals, won deals and revenue." /></Lazy>} />
        <Route path="profile" element={<Lazy><ProfilePage /></Lazy>} />
        <Route path="control" element={<RoleRoute min="MANAGER" />}>
          <Route index element={<Navigate to="unassigned" replace />} />
          <Route path="unassigned" element={<Lazy><UnassignedPage /></Lazy>} />
          <Route path="team" element={<Lazy><TeamPage /></Lazy>} />
          <Route path="leads" element={<Lazy><TeamLeadsPage /></Lazy>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function Lazy({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
