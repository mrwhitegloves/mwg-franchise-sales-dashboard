import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useMeQuery } from "@/app/api";
import { loggedOut, sessionLoaded } from "@/app/authSlice";
import { SocketProvider } from "@/app/SocketProvider";
import { PageSkeleton } from "./PageSkeleton";

// Loads who I am (role, scope, team) once, then opens the realtime connection
export function SessionGate({ children }) {
  const dispatch = useDispatch();
  const { data, error, isLoading } = useMeQuery();

  useEffect(() => {
    if (data?.user) dispatch(sessionLoaded(data));
  }, [data, dispatch]);
  useEffect(() => {
    if (error && [401, 403].includes(error.status)) dispatch(loggedOut());
  }, [error, dispatch]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background p-6">
        <PageSkeleton />
      </div>
    );
  }
  return <SocketProvider>{children}</SocketProvider>;
}
