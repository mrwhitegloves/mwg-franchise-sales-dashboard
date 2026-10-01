// §47 / §48 — team availability, capacity and workload; managers change availability here
import { useState } from "react";
import { UsersRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/LeadBits";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useAssignmentSettingsQuery, useTeamQuery, useUpdateTeamMemberMutation } from "@/app/api";
import { ago, errorText } from "@/lib/format";
import { cn } from "@/lib/utils";

const AV = { ACTIVE: "bg-emerald-100 text-emerald-700", INACTIVE: "bg-slate-200 text-slate-600", ON_LEAVE: "bg-amber-100 text-amber-800", SUSPENDED: "bg-red-100 text-red-700" };

function MemberCard({ m }) {
  const [edit, setEdit] = useState(false);
  const [availability, setAvailability] = useState(m.availability);
  const [leaveUntil, setLeaveUntil] = useState(m.leaveUntil ? String(m.leaveUntil).slice(0, 10) : "");
  const [cap, setCap] = useState(m.maxActiveLeads ?? "");
  const [save, { isLoading }] = useUpdateTeamMemberMutation();
  const used = m.maxActiveLeads ? Math.min(100, Math.round((m.open / m.maxActiveLeads) * 100)) : 0;
  const submit = async () => {
    try {
      await save({ userId: m._id, availability, leaveUntil: availability === "ON_LEAVE" && leaveUntil ? leaveUntil : null, maxActiveLeads: cap === "" ? null : Number(cap) }).unwrap();
      toast.success(`${m.name} updated`);
      setEdit(false);
    } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div><p className="font-semibold">{m.name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div>
          <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", AV[m.effectiveAvailability] || AV.ACTIVE)}>{m.effectiveAvailability.replace("_", " ")}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded bg-muted/50 p-2"><p className="text-lg font-bold">{m.open}</p><p className="text-[10px] text-muted-foreground">open</p></div>
          <div className="rounded bg-muted/50 p-2"><p className="text-lg font-bold text-orange-600">{m.hot}</p><p className="text-[10px] text-muted-foreground">hot</p></div>
          <div className="rounded bg-muted/50 p-2"><p className="text-lg font-bold">{m.followUps}</p><p className="text-[10px] text-muted-foreground">follow-ups</p></div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Capacity</span><span>{m.open} / {m.maxActiveLeads ?? "∞"}</span></div>
          <div className="mt-1 h-1.5 rounded bg-muted"><div className={cn("h-1.5 rounded", used >= 100 ? "bg-red-500" : used >= 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${used}%` }} /></div>
        </div>
        <p className={cn("text-xs", m.receivesLeads ? "text-emerald-700" : "text-amber-700")}>
          {m.receivesLeads ? `Receives new leads${m.onShift === false ? " (off shift now — after on-shift people)" : ""}` : `Not receiving new leads: ${m.notReceivingBecause}`}
          {m.lastAssignedAt ? ` · last lead ${ago(m.lastAssignedAt)}` : ""}
        </p>
        {!edit ? <Button size="sm" variant="outline" className="w-full" onClick={() => setEdit(true)}>Change availability / capacity</Button> : (
          <div className="space-y-2 rounded-lg border p-3">
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ON_LEAVE">On leave</SelectItem><SelectItem value="SUSPENDED">Suspended (admin only)</SelectItem>
              </SelectContent>
            </Select>
            {availability === "ON_LEAVE" && <Input type="date" value={leaveUntil} onChange={(e) => setLeaveUntil(e.target.value)} />}
            <Input type="number" min={1} placeholder="Max active leads (empty = team default)" value={cap} onChange={(e) => setCap(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setEdit(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" disabled={isLoading} onClick={submit}>{isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Save</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TeamPage() {
  const { data, isLoading } = useTeamQuery();
  const { data: s } = useAssignmentSettingsQuery();
  if (isLoading) return <PageSkeleton />;
  const team = data?.team || [];
  const set = s?.settings;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        {set && <p className="text-sm text-muted-foreground">Auto assignment <b>{set.autoAssign ? "ON" : "OFF"}</b> · mode <b>{set.mode.replace(/_/g, " ").toLowerCase()}</b> · default max <b>{set.defaultMaxActiveLeads ?? "no limit"}</b> active leads · working hours: <b>{set.workingHours}</b></p>}
      </div>
      {!team.length ? <EmptyState icon={UsersRound} title="No sales executives yet" text="An admin adds them in the admin dashboard → Admin Users (role: Sales Executive)." /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{team.map((m) => <MemberCard key={m._id} m={m} />)}</div>
      )}
    </div>
  );
}
