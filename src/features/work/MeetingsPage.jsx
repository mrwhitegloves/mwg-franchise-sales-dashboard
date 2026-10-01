// Meetings — list (today / upcoming / past) and a simple week calendar
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, MoreHorizontal, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/LeadBits";
import { PageSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope } from "@/app/authSlice";
import { useMeetingsQuery } from "@/app/api";
import { MeetingUpdateDialog } from "./MeetingDialogs";
import { dayKey, timeOnly } from "./workUtils";

const ICON = { VIDEO: Video, PHONE: Phone, IN_PERSON: MapPin };
const STATUS = { scheduled: "bg-sky-50 text-sky-700", completed: "bg-emerald-50 text-emerald-700", cancelled: "bg-slate-100 text-slate-500 line-through" };

export function MeetingRow({ m, showOwner = false, showLead = true }) {
  const [mode, setMode] = useState(null);
  const Icon = ICON[m.type] || CalendarDays;
  const open = m.status === "scheduled";
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <div className="w-20 shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{timeOnly(m.start)}</p>
        <p className="text-[10px] text-muted-foreground">{new Date(m.start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
      </div>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{m.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {showLead && m.lead?.name && <Link className="hover:text-primary hover:underline" to={`/leads/${m.lead.id}`}>{m.lead.leadCode ? `${m.lead.leadCode} · ` : ""}{m.lead.name}</Link>}
          <span className={cn("rounded px-1.5", STATUS[m.status])}>{m.status}</span>
          {showOwner && m.owner && <span>· {m.owner.name}</span>}
          {m.location && <span>· {m.location}</span>}
        </div>
        {m.outcome && <p className="mt-0.5 text-xs">{m.outcome}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {open && m.meetLink && <Button asChild size="sm" className="h-8"><a href={m.meetLink} target="_blank" rel="noreferrer"><Video className="mr-1 h-3.5 w-3.5" />Join</a></Button>}
        {open && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setMode("completed")}>Mark completed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("reschedule")}>Move</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => setMode("cancelled")}>Cancel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {mode && <MeetingUpdateDialog open meeting={m} mode={mode} onOpenChange={(o) => !o && setMode(null)} />}
    </div>
  );
}

function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

function WeekView({ from, onShift }) {
  const { data, isLoading } = useMeetingsQuery({ range: "week", from: from.toISOString() });
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(from); d.setDate(d.getDate() + i); return d; });
  const today = new Date().toDateString();
  return (
    <Card><CardContent className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onShift(-7)} aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></Button>
        <p className="text-sm font-medium">{dayKey(days[0])} – {dayKey(days[6])}</p>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onShift(7)} aria-label="Next week"><ChevronRight className="h-4 w-4" /></Button>
      </div>
      {isLoading ? <PageSkeleton /> : (
        <div className="grid gap-2 md:grid-cols-7">
          {days.map((d) => {
            const items = (data?.items || []).filter((m) => new Date(m.start).toDateString() === d.toDateString());
            return (
              <div key={d.toISOString()} className={cn("min-h-24 rounded-md border p-1.5", d.toDateString() === today && "border-red-200 bg-red-50/40")}>
                <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}</p>
                {items.map((m) => (
                  <Link key={m.id} to={`/leads/${m.lead.id}`} className={cn("mb-1 block rounded px-1.5 py-1 text-[11px] leading-tight hover:opacity-80", STATUS[m.status])}>
                    <span className="font-semibold">{timeOnly(m.start)}</span> {m.lead?.name || m.title}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </CardContent></Card>
  );
}

export default function MeetingsPage() {
  const [params, setParams] = useSearchParams();
  const scope = useSelector(selectScope);
  const isManager = hasSalesRole(scope, "MANAGER");
  const range = params.get("range") || "upcoming";
  const [weekFrom, setWeekFrom] = useState(() => startOfWeek(new Date()));
  const { data, isLoading, error } = useMeetingsQuery({ range }, { skip: range === "week" });
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="h-5 w-5 text-primary" />Meetings</h1>
      <div className="flex flex-wrap gap-1.5">
        {[["today", "Today"], ["upcoming", "Upcoming"], ["week", "Week"], ["past", "Past"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setParams({ range: v }, { replace: true })} className={cn("rounded-full border px-3 py-1.5 text-sm", range === v ? "border-red-200 bg-red-50 font-semibold text-red-700" : "hover:bg-muted")}>{l}</button>
        ))}
      </div>
      {range === "week" ? <WeekView from={weekFrom} onShift={(n) => setWeekFrom((f) => { const d = new Date(f); d.setDate(d.getDate() + n); return d; })} /> : isLoading ? <PageSkeleton /> : error ? <p className="text-sm text-red-600">{errorText(error)}</p> : !data.items.length ? (
        <EmptyState icon={CalendarDays} title="No meetings" text="Schedule a meeting from a lead (Meetings tab → Schedule). Video meetings get a Google Meet link." />
      ) : (
        <Card><CardContent className="divide-y p-0">{data.items.map((m) => <MeetingRow key={m.id} m={m} showOwner={isManager} />)}</CardContent></Card>
      )}
    </div>
  );
}
