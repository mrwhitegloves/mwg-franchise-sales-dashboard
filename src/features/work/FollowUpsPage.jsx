// §32 — Follow-ups: Overdue · Today · Upcoming as a timeline (11:00 Call Rajesh …)
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { CalendarClock, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/LeadBits";
import { PageSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope, selectTeam } from "@/app/authSlice";
import { useFollowUpsQuery } from "@/app/api";
import { TaskRow } from "./TaskList";
import { TaskDialog } from "./TaskDialogs";
import { dayKey } from "./workUtils";

const VIEWS = [
  { value: "overdue", label: "Overdue", tone: "text-red-700" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
];

export default function FollowUpsPage() {
  const [params, setParams] = useSearchParams();
  const scope = useSelector(selectScope);
  const team = useSelector(selectTeam);
  const isManager = hasSalesRole(scope, "MANAGER");
  const view = params.get("view") || "today";
  const owner = params.get("owner") || "";
  const [planOpen, setPlanOpen] = useState(false);
  const { data, isLoading, error } = useFollowUpsQuery({ view, ...(owner ? { owner } : {}) }, { pollingInterval: 60000 });
  const set = (patch) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); setParams(n, { replace: true }); };

  // Upcoming → grouped by day
  const groups = [];
  for (const t of data?.items || []) {
    const key = view === "upcoming" ? dayKey(t.dueAt) : view === "overdue" ? "Overdue" : "Today";
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, items: [] }));
    g.items.push(t);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold"><CalendarClock className="h-5 w-5 text-primary" />Follow-ups</h1>
        {data?.counts && <span className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{data.counts.doneToday} done today</span>}
        <div className="ml-auto flex items-center gap-2">
          {isManager && (
            <Select value={owner || "any"} onValueChange={(v) => set({ owner: v === "any" ? "" : v })}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Everyone I can see</SelectItem>
                <SelectItem value="unassigned">Unassigned leads</SelectItem>
                {team.map((m) => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={() => setPlanOpen(true)}><Plus className="mr-1 h-4 w-4" />Task</Button>
        </div>
      </div>
      <div className="flex gap-1.5">
        {VIEWS.map((v) => (
          <button key={v.value} type="button" onClick={() => set({ view: v.value })}
            className={cn("rounded-full border px-3 py-1.5 text-sm", view === v.value ? "border-red-200 bg-red-50 font-semibold text-red-700" : "hover:bg-muted")}>
            {v.label}
            <span className={cn("ml-1.5 text-xs", v.value === "overdue" && data?.counts?.overdue ? "font-bold text-red-700" : "text-muted-foreground")}>{data?.counts?.[v.value] ?? ""}</span>
          </button>
        ))}
      </div>
      {isLoading ? <PageSkeleton /> : error ? <p className="text-sm text-red-600">{errorText(error)}</p> : !data.items.length ? (
        <EmptyState icon={CalendarClock} title={view === "overdue" ? "Nothing overdue 🎉" : view === "today" ? "No more follow-ups today" : "Nothing planned yet"}
          text="Plan follow-ups from a lead (Follow-ups tab) or after a call — reminders come 15 minutes before." />
      ) : groups.map((g) => (
        <Card key={g.key}>
          {view === "upcoming" && <p className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">{g.key}</p>}
          <CardContent className="p-0"><div className="divide-y">{g.items.map((t) => <TaskRow key={t.id} task={t} showOwner={isManager} showDate={view === "overdue"} />)}</div></CardContent>
        </Card>
      ))}
      {planOpen && <TaskDialog open onOpenChange={setPlanOpen} defaultType="GENERAL" />}
    </div>
  );
}
