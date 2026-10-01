import { useSelector } from "react-redux";
import { ShieldCheck, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationSettings } from "./NotificationSettings";
import { selectScope, selectUser } from "@/app/authSlice";
import { ROLE_LABEL } from "@/lib/stages";
import { dateTime } from "@/lib/format";

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Row({ label, value }) {
  return <div className="flex justify-between gap-3 border-b py-2 text-sm last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value || "—"}</span></div>;
}

export default function ProfilePage() {
  const user = useSelector(selectUser);
  const scope = useSelector(selectScope);
  const p = user?.salesProfile || {};
  const hours = p.workingHours ? `${(p.workingHours.days || []).map((d) => DAYS[d]).join(", ") || "Every day"} · ${p.workingHours.start || "—"}–${p.workingHours.end || "—"}` : "Not set";
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{user?.name}</CardTitle></CardHeader>
        <CardContent>
          <Row label="Email" value={user?.email} />
          <Row label="Role" value={ROLE_LABEL[scope?.salesRole]} />
          <Row label="You see" value={scope?.kind === "own" ? "Leads assigned to you" : scope?.kind === "team" ? "Your team's leads + the unassigned pool" : "All franchise leads"} />
          <Row label="Department" value="Franchise Sales · MWG" />
          {scope?.salesRole !== "ADMIN" && <>
            <Row label="Employee code" value={p.employeeCode} />
            <Row label="Availability" value={p.availability === "ON_LEAVE" && p.leaveUntil ? `On leave until ${dateTime(p.leaveUntil)}` : p.availability} />
            <Row label="Max active leads" value={p.maxActiveLeads ? String(p.maxActiveLeads) : "Team default"} />
            <Row label="Working hours (IST)" value={hours} />
            <Row label="Languages" value={(p.languages || []).join(", ")} />
          </>}
          <Row label="Last sign in" value={dateTime(user?.lastLogin)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
          <p className="flex items-start gap-2"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />All WhatsApp conversations go through the official Mr. White Gloves number. Your personal WhatsApp number is never needed.</p>
          <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Availability, capacity and working hours are set by your manager / admin.</p>
        </CardContent>
      </Card>
      <NotificationSettings />
    </div>
  );
}
