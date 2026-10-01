// My Leads / Hot Leads / Team Leads — §8 list with filters, search, sort, paging (all server-side)
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search, Users, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/LeadBits";
import { useLeadCountsQuery, useLeadsQuery } from "@/app/api";
import { selectTeam } from "@/app/authSlice";
import { FILTER_LABELS } from "@/lib/stages";
import { LeadsTable } from "./LeadsTable";
import { cn } from "@/lib/utils";

const TABS = ["all", "new", "hot", "contacted", "qualified", "meeting", "proposal", "payment_pending", "won", "lost", "overdue"];
const SORTS = [["recent", "Recent activity"], ["followup", "Next follow-up"], ["score", "Lead score"], ["value", "Value"], ["created", "Newest"]];
const TITLES = {
  my: ["My Leads", "Franchise leads assigned to you"],
  hot: ["Hot Leads", "Ready to buy and high-score leads — call these first"],
  team: ["Team Leads", "Every franchise lead in your scope"],
};

export default function LeadsPage({ mode = "my" }) {
  const [params, setParams] = useSearchParams();
  const team = useSelector(selectTeam);
  const filter = mode === "hot" ? "hot" : params.get("filter") || "all";
  const sort = params.get("sort") || (mode === "hot" ? "score" : "recent");
  const page = Number(params.get("page") || 1);
  const owner = params.get("owner") || "";
  const [q, setQ] = useState(params.get("q") || "");

  // Debounced search → URL (so back / refresh keep the view)
  useEffect(() => {
    const id = setTimeout(() => {
      if ((params.get("q") || "") !== q) update({ q, page: 1 });
    }, 350);
    return () => clearTimeout(id);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(next) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === "" || v === null || v === undefined || (k === "filter" && v === "all") || (k === "page" && Number(v) === 1)) p.delete(k);
      else p.set(k, String(v));
    }
    setParams(p, { replace: true });
  }

  const apiMode = mode === "team" ? "all" : mode;
  const { data, isFetching, isLoading } = useLeadsQuery({
    mode: apiMode, ...(filter !== "all" && mode !== "hot" ? { filter } : {}), sort, page, limit: 25,
    ...(q.trim() ? { q: q.trim() } : {}), ...(mode === "team" && owner ? { owner } : {}),
  });
  const { data: countData } = useLeadCountsQuery(mode === "my" ? { mine: "1" } : mode === "team" && owner ? { owner } : {});
  const counts = countData?.counts || {};
  const [title, sub] = TITLES[mode];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{sub}</p>
        </div>
        <Button size="sm" onClick={() => window.dispatchEvent(new Event("sales:create-lead"))}><Plus className="mr-1 h-4 w-4" />Create lead</Button>
      </div>

      {mode !== "hot" && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => update({ filter: t, page: 1 })}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === t ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted", t === "overdue" && filter !== t && counts.overdue ? "border-red-200 text-red-700" : "")}>
              {FILTER_LABELS[t]}{counts[t] !== undefined ? <span className="ml-1 opacity-70">{counts[t]}</span> : null}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, phone, FRN code, email, city" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {mode === "team" && (
          <Select value={owner || "any"} onValueChange={(v) => update({ owner: v === "any" ? "" : v, page: 1 })}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Owner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Everyone</SelectItem>
              {team.map((m) => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={(v) => update({ sort: v, page: 1 })}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{SORTS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!isLoading && !data?.leads?.length ? (
        <EmptyState icon={Users} title={q ? "No lead matches your search" : "No leads here yet"}
          text={mode === "my" ? "Leads assigned to you and leads you create show up here." : "Nothing matches these filters."} />
      ) : (
        <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-60")}>
          <LeadsTable leads={data?.leads || []} loading={isLoading} showOwner={mode !== "my"} />
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{data.total} leads · page {data.page} of {data.pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: page - 1 })}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => update({ page: page + 1 })}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
