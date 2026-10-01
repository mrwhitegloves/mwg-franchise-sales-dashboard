// §24 — WhatsApp in the Sales App: the franchise conversations this user may see
// (own / team + unassigned for managers / all for admins), on the central MWG number.
// Live: the /sales socket refreshes the list and the open chat (SocketProvider).
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { MessagesSquare, Search, ShieldCheck, Bot, User, Flame, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope, selectTeam } from "@/app/authSlice";
import { useConversationsQuery } from "@/app/api";
import { ChatPanel } from "./ChatPanel";
import { avatarColor, initials, listTime, previewText } from "./waUtils";

const FILTERS = [
  ["", "All"], ["unread", "Unread"], ["needs_reply", "Needs reply"], ["window_open", "Can reply (24h)"], ["human", "AI paused"],
];

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function Row({ c, active, onOpen }) {
  const last = c.lastMessage;
  return (
    <button type="button" onClick={onOpen}
      className={cn("flex w-full items-start gap-3 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/60", active && "bg-red-50 hover:bg-red-50")}>
      <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", avatarColor(c.conversationId))}>{initials(c.name)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("truncate text-sm", c.unreadCount ? "font-semibold" : "font-medium")}>{c.name}</span>
          {c.hot && <Flame className="h-3.5 w-3.5 shrink-0 text-orange-500" />}
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{listTime(c.lastMessageAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {last?.direction === "outgoing" && (last.senderType === "AI" ? <Bot className="h-3 w-3 shrink-0 text-emerald-600" /> : <User className="h-3 w-3 shrink-0 text-violet-600" />)}
          <span className="truncate text-xs text-muted-foreground">{previewText(last) || "—"}</span>
          {c.unreadCount > 0 && <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold text-white">{c.unreadCount}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
          {c.leadCode && <span className="rounded bg-muted px-1 font-mono">{c.leadCode}</span>}
          {c.stageLabel && <span className="rounded bg-muted px-1">{c.stageLabel}</span>}
          {c.needsReply && <span className="rounded bg-amber-100 px-1 text-amber-800">needs reply</span>}
          {!c.window.open && <span className="rounded bg-slate-100 px-1 text-slate-600">template only</span>}
          {c.owner ? <span className="text-muted-foreground">· {c.owner.name}</span> : <span className="rounded bg-red-100 px-1 text-red-700">unassigned</span>}
        </div>
      </div>
    </button>
  );
}

export default function WhatsAppPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const scope = useSelector(selectScope);
  const team = useSelector(selectTeam);
  const isManager = hasSalesRole(scope, "MANAGER");
  const filter = params.get("filter") || "";
  const owner = params.get("owner") || "";
  const [q, setQ] = useState(params.get("q") || "");
  const dq = useDebounced(q);
  const [limit, setLimit] = useState(30);

  const query = { ...(filter ? { filter } : {}), ...(dq.trim() ? { q: dq.trim() } : {}), ...(isManager && owner ? { owner } : {}), limit };
  const { data, isLoading, isFetching, error } = useConversationsQuery(query);
  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
    setLimit(30);
  };
  const open = (cid) => navigate(`/whatsapp/${cid}${params.toString() ? `?${params}` : ""}`);
  const back = () => navigate(`/whatsapp${params.toString() ? `?${params}` : ""}`);
  const list = data?.conversations || [];

  return (
    <div className="-m-4 flex h-[calc(100dvh-4rem)] overflow-hidden border-t bg-card md:-m-6">
      {/* Conversation list */}
      <aside className={cn("flex w-full min-w-0 flex-col border-r lg:w-[360px] lg:shrink-0", id && "hidden lg:flex")}>
        <div className="space-y-2 border-b p-3">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold">WhatsApp</h1>
            {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 pl-9" placeholder="Name, phone or FRN code" value={q} onChange={(e) => { setQ(e.target.value); setLimit(30); }} />
          </div>
          {isManager && (
            <Select value={owner || "any"} onValueChange={(v) => set({ owner: v === "any" ? "" : v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Everyone I can see</SelectItem>
                <SelectItem value="unassigned">Unassigned leads</SelectItem>
                {team.map((m) => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
            {FILTERS.map(([v, label]) => {
              const n = v ? data?.counts?.[v] : data?.counts?.all;
              return (
                <button key={v || "all"} type="button" onClick={() => set({ filter: v })}
                  className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs", filter === v ? "border-red-200 bg-red-50 font-semibold text-red-700" : "hover:bg-muted")}>
                  {label}{n !== undefined && n !== null ? <span className="ml-1 text-muted-foreground">{n}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 border-b p-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>
          ))}
          {error && <p className="p-6 text-center text-sm text-red-600">{errorText(error)}</p>}
          {data && !list.length && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <MessagesSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
              {filter || dq ? "No conversation matches." : "No WhatsApp conversations yet. Chats of your franchise leads appear here."}
            </div>
          )}
          {list.map((c) => <Row key={c.conversationId} c={c} active={c.conversationId === id} onOpen={() => open(c.conversationId)} />)}
          {data?.pagination?.hasNext && (
            <div className="p-3 text-center"><Button variant="outline" size="sm" onClick={() => setLimit((l) => Math.min(100, l + 30))} disabled={limit >= 100}>Show more</Button></div>
          )}
        </div>
        <p className="flex items-center gap-1.5 border-t px-3 py-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />Messages go from the official Mr. White Gloves number.
        </p>
      </aside>

      {/* Open conversation */}
      <section className={cn("min-w-0 flex-1", !id && "hidden lg:block")}>
        {id ? <ChatPanel key={id} conversationId={id} onBack={back} /> : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#efeae2] text-center text-slate-500">
            <MessagesSquare className="h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="max-w-xs text-xs">AI replies and your messages appear here live. Prospects always see Mr. White Gloves.</p>
          </div>
        )}
      </section>
    </div>
  );
}
