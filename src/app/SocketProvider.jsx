// One Socket.IO connection per tab to the /sales namespace (JWT in the handshake).
// The server only sends this user's events (per-user / manager / admin rooms), so
// handlers just refresh the right cached data — no polling, no extra sockets.
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { SOCKET_URL } from "@/lib/config";
import { baseApi } from "./baseApi";
import { loggedOut, selectToken } from "./authSlice";

import { SocketContext } from "./socketContext";

export function SocketProvider({ children }) {
  const token = useSelector(selectToken);
  const dispatch = useDispatch();
  const [state, setState] = useState({ socket: null, status: "offline" });
  const toastIds = useRef(new Set());

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(`${SOCKET_URL}/sales`, {
      auth: (cb) => cb({ token }),
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
    const refresh = (tags) => dispatch(baseApi.util.invalidateTags(tags));
    let wasDown = false;

    socket.on("connect", () => {
      setState({ socket, status: "online" });
      // After a drop, refresh what we show (the server keeps everything)
      if (wasDown) refresh(["Dashboard", "Leads", "Counts", "Unassigned", "Team", "Lead", "Conversations", "Conversation"]);
      wasDown = false;
    });
    socket.on("disconnect", () => { wasDown = true; setState({ socket, status: "reconnecting" }); });
    socket.on("connect_error", (err) => {
      setState({ socket, status: "reconnecting" });
      if (/suspended|not active|no franchise sales access/i.test(err?.message || "")) {
        toast.error(err.message);
        dispatch(loggedOut());
      }
    });

    socket.on("lead_assigned", (p) => {
      refresh(["Dashboard", "Leads", "Counts", "Unassigned", { type: "Lead", id: p.leadId }]);
      if (!toastIds.current.has(`a:${p.leadId}:${p.at}`)) {
        toastIds.current.add(`a:${p.leadId}:${p.at}`);
        toast.success(`New franchise lead: ${p.name}${p.leadCode ? ` (${p.leadCode})` : ""}`, {
          action: { label: "Open", onClick: () => window.dispatchEvent(new CustomEvent("sales:open-lead", { detail: p.leadId })) },
        });
      }
    });
    socket.on("lead_revoked", (p) => {
      refresh(["Dashboard", "Leads", "Counts", "Conversations", "Conversation", { type: "Lead", id: p.leadId }]);
      toast.info(`${p.leadCode || p.name} was moved to another salesperson`);
      window.dispatchEvent(new CustomEvent("sales:lead-revoked", { detail: p.leadId }));
    });
    socket.on("team_lead_changed", (p) => refresh(["Leads", "Counts", "Unassigned", "Team", "Dashboard", { type: "Lead", id: p.leadId }]));
    socket.on("unassigned_lead", () => refresh(["Unassigned", "Team"]));
    // Central WhatsApp (FS06): the server sends only chats of leads this user may see
    const chatChanged = (p = {}) => refresh(["Conversations", "Insights", ...(p.sessionId ? [{ type: "Conversation", id: p.sessionId }] : ["Conversation"])]);
    ["wa_outbound_message", "wa_message_status", "wa_message_media", "wa_ai_control_changed", "wa_human_mode_message", "wa_lead_updated", "wa_follow_up_update"]
      .forEach((ev) => socket.on(ev, chatChanged));
    socket.on("wa_ai_draft", chatChanged);
    // FS08: follow-ups / tasks changed (also when a lead moved), reminders + missed / escalated alerts
    // FS09: proposals / payments changed, approvals waiting
    socket.on("proposal_updated", () => refresh(["Proposals", "Lead", "Leads"]));
    socket.on("payment_updated", () => refresh(["Payments", "Lead", "Leads", "Dashboard", "Revenue"]));
    socket.on("approval_needed", (p = {}) => {
      refresh(["Proposals"]);
      toast.warning(`Discount approval needed: ${p.number || "proposal"}`, { action: { label: "Open", onClick: () => window.dispatchEvent(new CustomEvent("sales:navigate", { detail: "/proposals?status=approval" })) } });
    });
    socket.on("tasks_changed", () => refresh(["Tasks", "Meetings", "Dashboard"]));
    socket.on("sales_alert", (p = {}) => {
      refresh(["Tasks", "Dashboard"]);
      const show = p.kind === "FOLLOWUP_REMINDER" ? toast.info : toast.warning;
      show(p.title || "Follow-up", {
        description: p.body, duration: p.kind === "FOLLOWUP_REMINDER" ? 8000 : 20000,
        action: p.url ? { label: "Open", onClick: () => window.dispatchEvent(new CustomEvent("sales:navigate", { detail: p.url })) } : undefined,
      });
    });
    socket.on("lead_insights_updated", () => refresh(["Insights"]));
    // FS07 §29: the AI handed a franchise chat to its owner
    socket.on("wa_handoff", (p = {}) => {
      refresh(["Conversations", "Insights", "Leads", "Dashboard", ...(p.sessionId ? [{ type: "Conversation", id: p.sessionId }] : [])]);
      toast.warning(`Take over: ${p.name || "Franchise lead"}${p.leadCode ? ` (${p.leadCode})` : ""}`, {
        description: (p.reasons || []).map((r) => r.label).join(", ") || "The AI handed this chat to you",
        duration: 15000,
        action: p.sessionId ? { label: "Open chat", onClick: () => window.dispatchEvent(new CustomEvent("sales:open-chat", { detail: p.sessionId })) } : undefined,
      });
    });
    socket.on("wa_new_message", (p = {}) => {
      chatChanged(p);
      if (p.sessionId && window.location.pathname === `/whatsapp/${p.sessionId}`) return;   // already reading it
      toast.message(`WhatsApp · ${p.leadName || "Prospect"}`, {
        description: String(p.content || "New message").slice(0, 90),
        action: p.sessionId ? { label: "Open", onClick: () => window.dispatchEvent(new CustomEvent("sales:open-chat", { detail: p.sessionId })) } : undefined,
      });
    });
    socket.on("force_logout", ({ reason } = {}) => {
      toast.error(reason === "deactivated" || reason === "suspended" ? "Your access was changed by an admin. Please sign in again." : "Session ended. Please sign in again.");
      dispatch(loggedOut());
    });

    return () => { socket.removeAllListeners(); socket.disconnect(); setState({ socket: null, status: "offline" }); };
  }, [token, dispatch]);

  return <SocketContext.Provider value={state}>{children}</SocketContext.Provider>;
}
