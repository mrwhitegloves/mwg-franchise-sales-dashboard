// §36 / §67 — Control Center overview: the whole franchise operation (managers: their team + pool)
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { AlertTriangle, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/PageSkeleton";
import { errorText, inr, inrShort } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope } from "@/app/authSlice";
import { useControlOverviewQuery, useControlPerformanceQuery } from "@/app/api";
import { PeriodPicker, Stat } from "./reportBits";
import { fmtMinutes, usePeriod } from "./reportUtils";

export default function OverviewPage() {
  const navigate = useNavigate();
  const isAdmin = hasSalesRole(useSelector(selectScope), "ADMIN");
  const { range, setRange, params } = usePeriod();
  const { data, isLoading, error } = useControlOverviewQuery(params);
  const { data: perf } = useControlPerformanceQuery(params);
  if (isLoading) return <PageSkeleton />;
  if (error) return <p className="text-sm text-red-600">{errorText(error)}</p>;
  const c = data.counts;
  const maxStage = Math.max(1, ...data.stages.map((s) => s.n));
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold"><LayoutDashboard className="h-5 w-5 text-primary" />{isAdmin ? "Franchise sales — whole company" : "My team"}</h1>
        <div className="ml-auto"><PeriodPicker range={range} setRange={setRange} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="All franchise leads" value={c.total} onClick={() => navigate("/control/leads")} />
        <Stat label="Unassigned" value={c.unassigned} tone={c.unassigned ? "text-amber-700" : ""} onClick={() => navigate("/control/unassigned")} />
        <Stat label="Assigned (open)" value={c.assigned} />
        <Stat label="New" value={c.new} />
        <Stat label="Hot" value={c.hot} tone={c.hot ? "text-orange-600" : ""} onClick={() => navigate("/hot-leads")} />
        <Stat label="Qualified" value={c.qualified} />
        <Stat label="Meetings stage" value={c.meetings} onClick={() => navigate("/meetings")} />
        <Stat label="Proposal stage" value={c.proposals} onClick={() => navigate("/proposals")} />
        <Stat label="Payment pending" value={c.paymentPending} onClick={() => navigate("/payments")} />
        <Stat label="Won" value={c.won} tone="text-emerald-700" />
        <Stat label="Lost" value={c.lost} />
        <Stat label="Revenue (period)" value={inrShort(data.period.revenue)} hint={`${data.period.payments} verified payment(s)`} tone="text-emerald-700" onClick={() => navigate("/control/revenue")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Open pipeline · {inr(data.pipelineValue)}</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {data.stages.map((s) => (
              <div key={s.key} className="grid grid-cols-[150px_1fr_90px] items-center gap-2 text-sm">
                <span className="truncate">{s.label}</span>
                <div className="h-2.5 rounded bg-muted"><div className="h-full rounded bg-red-500/80" style={{ width: `${(s.n / maxStage) * 100}%` }} /></div>
                <span className="text-right tabular-nums">{s.n} · {inrShort(s.value)}</span>
              </div>
            ))}
            {!data.stages.length && <p className="text-sm text-muted-foreground">No open leads.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">This period</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{data.period.newLeads} new franchise lead(s) · {data.period.won} won · {inr(data.period.revenue)} received</p>
            {data.stuck > 0 && <p className="flex items-center gap-1.5 text-amber-800"><AlertTriangle className="h-4 w-4" />{data.stuck} assigned lead(s) without activity for 7+ days</p>}
            {perf?.totals && (
              <>
                <p>Team: {perf.totals.leadsAssigned} assigned → {perf.totals.contacted} contacted → {perf.totals.qualified} qualified → {perf.totals.meetings} meetings → {perf.totals.proposals} proposals → {perf.totals.won} won</p>
                {perf.totals.overdueFollowUps > 0 && <p className="text-red-700">{perf.totals.overdueFollowUps} follow-up(s) overdue right now</p>}
              </>
            )}
            <button type="button" className="text-primary underline" onClick={() => navigate("/control/performance")}>Per salesperson →</button>
          </CardContent>
        </Card>
      </div>
      {perf?.rows?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Team at a glance</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {perf.rows.slice(0, 9).map((r) => (
              <button key={r.userId} type="button" onClick={() => navigate(`/control/people/${r.userId}`)} className="rounded-md border p-2.5 text-left text-sm hover:bg-muted/40">
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.leadsAssigned} leads · {r.won} won · {inrShort(r.revenue)} · response {fmtMinutes(r.avgResponseMinutes)}</p>
                {r.overdueFollowUps > 0 && <p className="text-xs text-red-700">{r.overdueFollowUps} overdue</p>}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
