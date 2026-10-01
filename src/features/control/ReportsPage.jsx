// §60 reports: franchise leads of the period by source / campaign / salesperson / city / territory / stage /
// assignment method, with conversion + revenue; CSV for admins. Also: Control Center → Activities.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Activity, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";
import { dateTime, errorText, inr } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope, selectTeam } from "@/app/authSlice";
import { useControlActivitiesQuery, useControlReportQuery, useLazyControlActivitiesQuery } from "@/app/api";
import { CsvButton, PeriodPicker } from "./reportBits";
import { pctText, usePeriod } from "./reportUtils";

const GROUPS = [["source", "Source"], ["campaign", "Campaign"], ["salesperson", "Salesperson"], ["city", "City"], ["territory", "State"], ["status", "Stage"], ["method", "Assignment"]];

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const isAdmin = hasSalesRole(useSelector(selectScope), "ADMIN");
  const groupBy = params.get("by") || "source";
  const { range, setRange, params: period } = usePeriod();
  const { data, isLoading, isFetching, error } = useControlReportQuery({ groupBy, ...period });
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold"><BarChart3 className="h-5 w-5 text-primary" />Reports</h1>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto"><PeriodPicker range={range} setRange={setRange} /></div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Leads by</span>
        {GROUPS.map(([v, l]) => <button key={v} type="button" onClick={() => setParams({ by: v }, { replace: true })} className={cn("rounded-full border px-3 py-1 text-sm", groupBy === v ? "border-red-200 bg-red-50 font-semibold text-red-700" : "hover:bg-muted")}>{l}</button>)}
        {isAdmin && <div className="ml-auto flex gap-1.5"><CsvButton path="/control/reports/export.csv" params={{ groupBy, ...period }} label="This table (CSV)" /><CsvButton path="/control/leads/export.csv" params={period} label="All leads (CSV)" /></div>}
      </div>
      {isLoading ? <PageSkeleton /> : error ? <p className="text-sm text-red-600">{errorText(error)}</p> : (
        <Card><CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b text-xs text-muted-foreground"><tr>{[data.groups[groupBy], "Leads", "Assigned", "Contacted", "Qualified", "Won", "Lost", "Conversion", "Open pipeline", "Revenue"].map((h, i) => <th key={h} className={cn("px-3 py-2 font-medium", i ? "text-right" : "text-left")}>{h}</th>)}</tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.key || r.label} className="border-b last:border-0">
                  <td className="max-w-[260px] truncate px-3 py-2 font-medium capitalize">{r.label}</td>
                  {["leads", "assigned", "contacted", "qualified", "won", "lost"].map((k) => <td key={k} className="px-3 py-2 text-right tabular-nums">{r[k]}</td>)}
                  <td className="px-3 py-2 text-right tabular-nums">{pctText(r.conversion)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{inr(r.pipelineValue)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{inr(r.revenue)}</td>
                </tr>
              ))}
              {!data.rows.length && <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">No franchise leads came in during this period.</td></tr>}
              <tr className="bg-muted/30 font-semibold">
                <td className="px-3 py-2">Total</td>
                {["leads", "assigned", "contacted", "qualified", "won", "lost"].map((k) => <td key={k} className="px-3 py-2 text-right tabular-nums">{data.totals[k]}</td>)}
                <td className="px-3 py-2 text-right">{pctText(data.totals.conversion)}</td>
                <td className="px-3 py-2 text-right">{inr(data.totals.pipelineValue)}</td>
                <td className="px-3 py-2 text-right">{inr(data.totals.revenue)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent></Card>
      )}
      <p className="text-xs text-muted-foreground">Leads that came in during the period, grouped; their current stage. Revenue = verified payments of those leads. WhatsApp / self-created / round-robin / manual leads: group by Source or Assignment.</p>
    </div>
  );
}

const TYPES = [["", "Everything"], ["calls", "Calls"], ["whatsappMessages", "WhatsApp"], ["followUps", "Follow-ups"], ["followUpsMissed", "Missed / escalated"], ["meetings", "Meetings"], ["proposals", "Proposals"], ["payments", "Payments"], ["statusChanges", "Stage changes"], ["leadsReceived", "Assignments"], ["notes", "Notes"]];

export function ActivitiesPage() {
  const team = useSelector(selectTeam);
  const [type, setType] = useState("");
  const [user, setUser] = useState("");
  const [older, setOlder] = useState([]);
  const [more, setMore] = useState(null);
  const q = { ...(type ? { type } : {}), ...(user ? { user } : {}) };
  const { data, isLoading, error } = useControlActivitiesQuery(q, { pollingInterval: 60000 });
  const [loadOlder, { isFetching }] = useLazyControlActivitiesQuery();
  const items = [...(data?.items || []), ...older];
  const hasMore = more ?? data?.hasMore;
  const reset = () => { setOlder([]); setMore(null); };
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><Activity className="h-5 w-5 text-primary" />Team activity</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={type || "all"} onValueChange={(v) => { setType(v === "all" ? "" : v); reset(); }}>
          <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map(([v, l]) => <SelectItem key={v || "all"} value={v || "all"}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={user || "all"} onValueChange={(v) => { setUser(v === "all" ? "" : v); reset(); }}>
          <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Everyone</SelectItem>{team.map((m) => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {isLoading ? <PageSkeleton /> : error ? <p className="text-sm text-red-600">{errorText(error)}</p> : (
        <Card><CardContent className="p-4">
          {!items.length ? <p className="text-sm text-muted-foreground">No activity.</p> : (
            <ol className="space-y-2.5">
              {items.map((a, i) => (
                <li key={i} className="text-sm">
                  <p>{a.leadId ? <Link className="hover:text-primary hover:underline" to={`/leads/${a.leadId}`}>{a.summary || a.type}</Link> : (a.summary || a.type)}</p>
                  <p className="text-xs text-muted-foreground">{dateTime(a.at)}{a.by ? ` · ${a.by}` : ""}</p>
                </li>
              ))}
            </ol>
          )}
          {hasMore && <div className="pt-3 text-center"><Button variant="outline" size="sm" disabled={isFetching} onClick={async () => { const r = await loadOlder({ ...q, before: items[items.length - 1].at }).unwrap(); setOlder((o) => [...o, ...r.items]); setMore(r.hasMore); }}>Older</Button></div>}
        </CardContent></Card>
      )}
    </div>
  );
}
