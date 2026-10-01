import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectScope } from "@/app/authSlice";

import { hasSalesRole } from "@/lib/roles";
import { PageSkeleton } from "./PageSkeleton";

// UI gate only — the backend refuses these APIs for executives anyway (403)
export function RoleRoute({ min = "MANAGER" }) {
  const scope = useSelector(selectScope);
  // Opened by URL: wait for the session (scope) before deciding — never bounce a manager to "/"
  if (!scope) return <PageSkeleton />;
  if (!hasSalesRole(scope, min)) return <Navigate to="/" replace />;
  return <Outlet />;
}
