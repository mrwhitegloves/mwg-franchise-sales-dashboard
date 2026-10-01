// Tasks — all follow-ups / to-dos: open or done, by type (calls, proposals, payments, KYC …)
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/LeadBits";
import { PageSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope, selectTeam } from "@/app/authSlice";
import { useTasksQuery } from "@/app/api";
import { TaskList } from "./TaskList";
import { TaskDialog } from "./TaskDialogs";
import { TASK_TYPES } from "./workUtils";

export default function TasksPage() {
  const [params, setParams] = useSearchParams();
  const scope = useSelector(selectScope);
  const team = useSelector(selectTeam);
  const isManager = hasSalesRole(scope, "MANAGER");
  const status = params.get("status") || "open";
  const type = params.get("type") || "";
  const owner = params.get("owner") || "";
  const page = Number(params.get("page") || 1);
  const [newOpen, setNewOpen] = useState(false);
  const { data, isLoading, error } = useTasksQuery({ status, page, ...(type ? { type } : {}), ...(owner ? { owner } : {}) });
  const set = (patch) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!("page" in patch)) n.delete("page"); setParams(n, { replace: true }); };
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold"><ListChecks className="h-5 w-5 text-primary" />Tasks</h1>
        <Button size="sm" className="ml-auto" onClick={() => setNewOpen(true)}><Plus className="mr-1 h-4 w-4" />New task</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {[["open", "Open"], ["done", "Done"], ["all", "All"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => set({ status: v })} className={cn("rounded-full border px-3 py-1.5 text-sm", status === v ? "border-red-200 bg-red-50 font-semibold text-red-700" : "hover:bg-muted")}>{l}</button>
        ))}
        <Select value={type || "any"} onValueChange={(v) => set({ type: v === "any" ? "" : v })}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="any">All types</SelectItem>{TASK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        {isManager && (
          <Select value={owner || "any"} onValueChange={(v) => set({ owner: v === "any" ? "" : v })}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="any">Everyone</SelectItem>{team.map((m) => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>
      {isLoading ? <PageSkeleton /> : error ? <p className="text-sm text-red-600">{errorText(error)}</p> : (
        <Card><CardContent className="p-0">
          <TaskList items={data.items} showOwner={isManager} showDate empty={<EmptyState icon={ListChecks} title="No tasks here" text="Tasks you plan on leads, and your own to-dos, show up here." />} />
        </CardContent></Card>
      )}
      {data?.pagination && (data.pagination.hasNext || page > 1) && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</Button>
          <Button variant="outline" size="sm" disabled={!data.pagination.hasNext} onClick={() => set({ page: String(page + 1) })}>Next</Button>
        </div>
      )}
      {newOpen && <TaskDialog open onOpenChange={setNewOpen} defaultType="GENERAL" />}
    </div>
  );
}
