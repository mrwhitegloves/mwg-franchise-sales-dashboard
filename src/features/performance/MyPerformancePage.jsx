// §61 — My Performance: only my own numbers + my activity
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/PageSkeleton";
import { dateTime, errorText, inr } from "@/lib/format";
import { useMyPerformanceQuery } from "@/app/api";
import { PeriodPicker, Stat } from "@/features/control/reportBits";
import { fmtMinutes, pctText, usePeriod } from "@/features/control/reportUtils";

export default function MyPerformancePage() {
  const { range, setRange, params } = usePeriod();
  const { data, isLoading, error } = useMyPerformanceQuery(params);
  if (isLoading) return <PageSkeleton />;
  if (error) return <p className="text-sm text-red-600">{errorText(error)}</p>;
  const m = data.me || {};
  const c = data.counts || {};
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold"><TrendingUp className="h-5 w-5 text-primary" />My performance</h1>
        <div className="ml-auto"><PeriodPicker range={range} setRange={setRange} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Leads given to me" value={m.leadsAssigned ?? 0} />
        <Stat label="Contacted" value={m.contacted ?? 0} hint={m.leadsAssigned ? `${Math.round(((m.contacted || 0) / m.leadsAssigned) * 100)}% of my leads` : null} />
        <Stat label="Qualified" value={m.qualified ?? 0} />
        <Stat label="Meetings" value={m.meetings ?? 0} hint={`${m.meetingsDone ?? 0} done`} />
        <Stat label="Proposals sent" value={m.proposals ?? 0} />
        <Stat label="Won" value={m.won ?? 0} tone="text-emerald-700" hint={`conversion ${pctText(m.conversion)}`} />
        <Stat label="Revenue" value={inr(m.revenue || 0)} tone="text-emerald-700" />
        <Stat label="Lost" value={m.lost ?? 0} />
        <Stat label="Avg. first response" value={fmtMinutes(m.avgResponseMinutes)} hint="assignment → first call / WhatsApp" />
        <Stat label="Follow-ups done" value={pctText(m.followUpCompletion)} hint={`${m.followUpsDone ?? 0} of ${m.followUpsDue ?? 0} due · ${m.followUpsOnTime ?? 0} on time`} />
        <Stat label="Overdue now" value={m.overdueFollowUps ?? 0} tone={m.overdueFollowUps ? "text-red-700" : ""} />
        <Stat label="WhatsApp messages · calls" value={`${c.whatsappMessages ?? 0} · ${c.calls ?? 0}`} />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">My recent activity</CardTitle></CardHeader>
        <CardContent>
          {!data.items?.length ? <p className="text-sm text-muted-foreground">Nothing in this period.</p> : (
            <ol className="space-y-2.5">
              {data.items.map((a, i) => (
                <li key={i} className="text-sm">
                  <p>{a.leadId ? <Link className="hover:text-primary hover:underline" to={`/leads/${a.leadId}`}>{a.summary || a.type}</Link> : (a.summary || a.type)}</p>
                  <p className="text-xs text-muted-foreground">{dateTime(a.at)}{a.by ? ` · ${a.by}` : ""}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
