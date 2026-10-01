// FS10 — the bell: my notifications (new lead, hot lead, WhatsApp reply, follow-ups, payments …),
// unread count, mark read / clear, older; live through the /sales socket (sales_alert).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, CheckCheck, Loader2, Settings, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ago, errorText } from "@/lib/format";
import { useClearNotificationMutation, useLazyNotificationsQuery, useNotificationsQuery, useReadNotificationMutation } from "@/app/api";
import { enablePush, pushSupported } from "@/lib/push";

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useNotificationsQuery({}, { pollingInterval: 120000 });
  const [loadOlder, { isFetching: loadingOlder }] = useLazyNotificationsQuery();
  const [older, setOlder] = useState([]);
  const [more, setMore] = useState(null);
  const [read] = useReadNotificationMutation();
  const [clear] = useClearNotificationMutation();
  const [askPush, setAskPush] = useState(() => pushSupported() && Notification.permission === "default");
  const items = [...(data?.items || []), ...older.filter((o) => !(data?.items || []).some((i) => i.id === o.id))];
  const unread = data?.unread || 0;
  const hasMore = more ?? data?.hasMore;

  const openItem = async (n) => {
    if (!n.isRead) read(n.id);
    setOpen(false);
    if (n.url) navigate(n.url);
  };
  const fetchOlder = async () => {
    const last = items[items.length - 1];
    if (!last) return;
    const r = await loadOlder({ before: last.at }).unwrap();
    setOlder((o) => [...o, ...r.items]);
    setMore(r.hasMore);
  };
  const turnOnPush = async () => {
    try { await enablePush(); toast.success("Notifications are on for this device"); setAskPush(false); } catch (e) { toast.error(errorText(e)); setAskPush(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? ` (${unread} new)` : ""}`}>
          {unread ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center gap-1 border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <div className="ml-auto flex items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark all as read" disabled={!unread} onClick={() => read(undefined)}><CheckCheck className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Clear all" disabled={!items.length} onClick={() => { clear(undefined); setOlder([]); }}><X className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Notification settings" onClick={() => { setOpen(false); navigate("/profile#notifications"); }}><Settings className="h-4 w-4" /></Button>
          </div>
        </div>
        {askPush && (
          <div className="flex items-center gap-2 border-b bg-sky-50 px-3 py-2 text-xs text-sky-900">
            <span className="flex-1">Get alerts on this device even when the app is closed.</span>
            <Button size="sm" className="h-7" onClick={turnOnPush}>Turn on</Button>
          </div>
        )}
        <div className="max-h-[65vh] overflow-y-auto">
          {!items.length ? <p className="px-3 py-10 text-center text-sm text-muted-foreground">You're all caught up.</p> : items.map((n) => (
            <div key={n.id} className={cn("group flex gap-2 border-b px-3 py-2.5 last:border-0", !n.isRead && "bg-red-50/50")}>
              <button type="button" onClick={() => openItem(n)} className="min-w-0 flex-1 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{n.label}</p>
                <p className={cn("text-sm", !n.isRead && "font-semibold")}>{n.title}</p>
                {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-0.5 text-[11px] text-muted-foreground">{ago(n.at)}</p>
              </button>
              <button type="button" onClick={() => { clear(n.id); setOlder((o) => o.filter((x) => x.id !== n.id)); }} className="self-start rounded p-1 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 focus:opacity-100" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {hasMore && <div className="p-2 text-center"><Button variant="ghost" size="sm" disabled={loadingOlder} onClick={fetchOlder}>Older</Button></div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
