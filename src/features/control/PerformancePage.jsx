// §37 performance per salesperson (raw numbers + rates) and §38 the audit of one person
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";
import { dateTime, errorText, inr } from "@/lib/format";
import { useControlPerformanceQuery, useLazyPersonAuditQuery, usePersonAuditQuery } from "@/app/api";
import { PeriodPicker, Stat } from "./reportBits";
import { fmtMinutes, pctText, usePeriod } from "./reportUtils";

const COLS = [
  ["leadsAssigned", "Assigned"], ["contacted", "Contacted"], ["connected", "Connected"], ["qualified", "Qualified"], ["meetings", "Meetings"],
  ["proposals", "Proposals"], ["payments", "Payments"], ["won", "Won"], ["lost", "Lost"],
];

export default function PerformancePage() {
  const navigate = useNavigate();
  const { range, setRange, params } = usePeriod();
  const { data, isLoading, error } = useControlPerformanceQuery(params);
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Users className="h-5 w-5 text-primary" />Team performance</h1>
        <div className="ml-auto"><PeriodPicker range={range} setRange={setRange} /></div>
      </div>
      {isLoading ? <PageSkeleton /> : error ? <p className="text-sm text-red-600">{errorText(error)}</p> : (
        <Card><CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Salesperson</th>
                {COLS.map(([, l]) => <th key={l} className="px-2 py-2 text-right font-medium">{l}</th>)}
                <th className="px-2 py-2 text-right font-medium">Conversion</th>
                <th className="px-2 py-2 text-right font-medium">Revenue</th>
                <th className="px-2 py-2 text-right font-medium">Avg. response</th>
                <th className="px-2 py-2 text-right font-medium">Follow-ups done</th>
                <th className="px-3 py-2 text-right font-medium">Overdue now</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.userId} className="cursor-pointer border-b last:border-0 hover:bg-muted/40" onClick={() => navigate(`/control/people/${r.userId}`)}>
                  <td className="px-3 py-2"><span className="font-medium">{r.name}</span>{r.availability && r.availability !== "ACTIVE" && <span className="ml-1.5 rounded bg-muted px-1 text-[10px]">{r.availability.toLowerCase().replace("_", " ")}</span>}</td>
                  {COLS.map(([k]) => <td key={k} className="px-2 py-2 text-right tabular-nums">{r[k]}</td>)}
                  <td className="px-2 py-2 text-right tabular-nums">{pctText(r.conversion)}</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">{inr(r.revenue)}</td>
                  <td className="px-2 py-2 text-right tabular-nums" title={`${r.responseSample} lead(s)`}>{fmtMinutes(r.avgResponseMinutes)}</td>
                  <td className="px-2 py-2 text-right tabular-nums" title={`${r.followUpsDone}/${r.followUpsDue} done, ${r.followUpsOnTime} on time`}>{pctText(r.followUpCompletion)}</td>
                  <td className={cn("px-3 py-2 text-right tabular-nums", r.overdueFollowUps && "font-semibold text-red-700")}>{r.overdueFollowUps}</td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <td className="px-3 py-2">Total</td>
                {COLS.map(([k]) => <td key={k} className="px-2 py-2 text-right tabular-nums">{data.totals[k] ?? ""}</td>)}
                <td className="px-2 py-2 text-right">{pctText(data.totals.conversion)}</td>
                <td className="px-2 py-2 text-right">{inr(data.totals.revenue)}</td>
                <td /><td />
                <td className="px-3 py-2 text-right">{data.totals.overdueFollowUps}</td>
              </tr>
            </tbody>
          </table>
        </CardContent></Card>
      )}
      <p className="text-xs text-muted-foreground">Assigned = leads given to the person in the period; contacted / connected / qualified = of those leads. Response = working minutes from assignment to the first call / WhatsApp. Follow-ups done = due in the period and closed (on time = within 15 min). Click a row for the person's activity.</p>
    </div>
  );
}

const AUDIT = [
  ["leadsReceived", "Leads received"], ["leadsCreated", "Leads created"], ["leadsContacted", "Leads contacted"], ["whatsappMessages", "WhatsApp messages"],
  ["calls", "Calls"], ["notes", "Notes"], ["statusChanges", "Status changes"], ["followUps", "Follow-ups"], ["followUpsMissed", "Follow-ups missed"],
  ["meetings", "Meetings"], ["proposals", "Proposals"], ["payments", "Payments"], ["won", "Won"], ["lost", "Lost"], ["leadsViewed", "Leads opened"], ["logins", "Sign-ins"],
];

export function AuditView({ userId, back = true, title }) {
  const { range, setRange, params } = usePeriod();
  const [group, setGroup] = useState("");
  const [older, setOlder] = useState([]);
  const [more, setMore] = useState(null);
  const { data, isLoading, error } = usePersonAuditQuery({ userId, ...params, group: group || undefined });
  const [loadOlder, { isFetching }] = useLazyPersonAuditQuery();
  if (isLoading) return <PageSkeleton />;
  if (error) return <p className="text-sm text-red-600">{errorText(error)}</p>;
  const items = [...data.items, ...older];
  const hasMore = more ?? data.hasMore;
  const pick = (g) => { setGroup((x) => (x === g ? "" : g)); setOlder([]); setMore(null); };
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {back && <Button variant="ghost" size="sm" asChild><Link to="/control/performance"><ArrowLeft className="mr-1 h-4 w-4" />Team</Link></Button>}
        <h1 className="text-xl font-bold">{title || data.user.name}</h1>
        <span className="text-xs text-muted-foreground">{data.user.lastLogin ? `last sign-in ${dateTime(data.user.lastLogin)}` : ""}</span>
        <div className="ml-auto"><PeriodPicker range={range} setRange={setRange} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {AUDIT.map(([k, l]) => <Stat key={k} label={l} value={data.counts[k] ?? 0} tone={group && group === k ? "text-red-700" : ""} onClick={["leadsContacted", "won", "lost"].includes(k) ? undefined : () => pick(k)} />)}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Activity{group ? ` · ${AUDIT.find(([k]) => k === group)?.[1]}` : ""}</CardTitle></CardHeader>
        <CardContent>
          {!items.length ? <p className="text-sm text-muted-foreground">Nothing in this period.</p> : (
            <ol className="space-y-2.5">
              {items.map((a, i) => (
                <li key={i} className="text-sm">
                  <p>{a.leadId ? <Link className="hover:text-primary hover:underline" to={`/leads/${a.leadId}`}>{a.summary || a.type}</Link> : (a.summary || a.type)}</p>
                  <p className="text-xs text-muted-foreground">{dateTime(a.at)} · {a.type.replace(/_/g, " ").toLowerCase()}{a.by ? ` · ${a.by}` : ""}</p>
                </li>
              ))}
            </ol>
          )}
          {hasMore && <div className="pt-3 text-center"><Button variant="outline" size="sm" disabled={isFetching} onClick={async () => { const r = await loadOlder({ userId, ...params, group: group || undefined, before: items[items.length - 1].at }).unwrap(); setOlder((o) => [...o, ...r.items]); setMore(r.hasMore); }}>{isFetching && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Older</Button></div>}
        </CardContent>
      </Card>
    </div>
  );
}

export function PersonAuditPage() {
  const { userId } = useParams();
  return <AuditView key={userId} userId={userId} />;
}
