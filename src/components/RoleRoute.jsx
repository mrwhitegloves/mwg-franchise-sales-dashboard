import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectScope } from "@/app/authSlice";

import { hasSalesRole } from "@/lib/roles";

// UI gate only — the backend refuses these APIs for executives anyway (403)
export function RoleRoute({ min = "MANAGER" }) {
  const scope = useSelector(selectScope);
  if (!hasSalesRole(scope, min)) return <Navigate to="/" replace />;
  return <Outlet />;
}
