// §43 — revenue attribution: verified money by salesperson / source / city / plan, and the funnel per salesperson
import { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/PageSkeleton";
import { dateOnly, errorText, inr } from "@/lib/format";
import { useRevenueQuery } from "@/app/api";

const ymd = (d) => new Date(d).toISOString().slice(0, 10);
function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }

function Breakdown({ title, rows }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        {!rows?.length ? <p className="text-muted-foreground">—</p> : rows.map((r) => (
          <div key={r.key} className="flex justify-between gap-2"><span className="truncate">{String(r.key).replace(/_/g, " ")}</span><span className="tabular-nums">{r.won} · {inr(r.revenue)}</span></div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function RevenuePage() {
  const [from, setFrom] = useState(() => ymd(monthStart()));
  const [to, setTo] = useState(() => ymd(new Date(Date.now() + 864e5)));
  const { data, isLoading, error } = useRevenueQuery({ from: new Date(`${from}T00:00:00+05:30`).toISOString(), to: new Date(`${to}T00:00:00+05:30`).toISOString() });
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold"><TrendingUp className="h-5 w-5 text-primary" />Revenue</h1>
        <div className="ml-auto flex items-end gap-2">
          <div><Label className="text-xs">From</Label><Input type="date" className="h-9" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">Until</Label><Input type="date" className="h-9" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
      </div>
      {isLoading ? <PageSkeleton /> : error ? <p className="text-sm text-red-600">{errorText(error)}</p> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[["Won deals", data.totals.won], ["Verified revenue", inr(data.totals.revenue)], ["Waiting payments", `${data.totals.pendingPayments} · ${inr(data.totals.pendingAmount)}`], ["Avg. days to win", data.totals.avgDaysToConvert ?? "—"]].map(([l, v]) => (
              <Card key={l}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-bold tabular-nums">{v}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Per salesperson</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="border-b text-xs text-muted-foreground"><tr>{["Salesperson", "Assigned", "Qualified", "Meetings", "Proposals", "Won", "Revenue"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {data.funnel.length ? data.funnel.map((r) => (
                    <tr key={r.userId} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      {[r.assigned, r.qualified, r.meetings, r.proposals, r.won].map((v, i) => <td key={i} className="px-3 py-2 tabular-nums">{v}</td>)}
                      <td className="px-3 py-2 font-semibold tabular-nums">{inr(r.revenue)}</td>
                    </tr>
                  )) : <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No activity in this period.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-4">
            <Breakdown title="By source" rows={data.bySource} />
            <Breakdown title="By city" rows={data.byCity} />
            <Breakdown title="By plan" rows={data.byPlan} />
            <Breakdown title="By assignment" rows={data.byMethod} />
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Won franchise deals</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b text-xs text-muted-foreground"><tr>{["Lead", "Salesperson", "Source / campaign", "City", "Plan", "Came in", "Won", "Revenue"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {data.conversions.length ? data.conversions.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-3 py-2"><Link className="text-primary hover:underline" to={`/leads/${c.leadId}`}>{c.leadCode || c.name}</Link></td>
                      <td className="px-3 py-2">{c.salespersonName || "—"}<span className="block text-[11px] text-muted-foreground">{String(c.assignmentMethod || "").replace(/_/g, " ").toLowerCase()}</span></td>
                      <td className="px-3 py-2">{String(c.sourceChannel || c.source || "—").replace(/_/g, " ")}<span className="block max-w-[180px] truncate text-[11px] text-muted-foreground">{c.campaign || ""}</span></td>
                      <td className="px-3 py-2">{c.city || "—"}</td>
                      <td className="px-3 py-2">{c.plan || "—"}</td>
                      <td className="px-3 py-2">{dateOnly(c.createdDate)}</td>
                      <td className="px-3 py-2">{dateOnly(c.convertedDate)}<span className="block text-[11px] text-muted-foreground">{c.daysToConvert ?? "—"} days</span></td>
                      <td className="px-3 py-2 font-semibold tabular-nums">{inr(c.revenue)}{c.status === "partial" && <span className="block text-[11px] font-normal text-amber-700">of {inr(c.planValue)}</span>}</td>
                    </tr>
                  )) : <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No won deals in this period.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">Revenue = payments verified by a manager / admin. A deal is won when its first payment is verified.</p>
        </>
      )}
    </div>
  );
}
