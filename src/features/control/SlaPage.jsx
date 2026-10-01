// §42 / §33 — SLA rules: first response, follow-up escalation, working hours. Admins change; managers read.
import { useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/PageSkeleton";
import { errorText, inr } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope } from "@/app/authSlice";
import { useSlaSettingsQuery, useUpdateSlaMutation } from "@/app/api";

const FIELDS = [
  ["First contact", [
    ["firstContactMinutes", "Lead assigned → first call / WhatsApp within (min)", "Owner is alerted after this"],
    ["firstContactManagerMinutes", "Manager is alerted after (min)", null],
  ]],
  ["Follow-ups", [
    ["reminderMinutes", "Reminder before a follow-up (min)", null],
    ["ownerAlertMinutes", "Missed follow-up → owner alert after (min)", null],
    ["managerAlertMinutes", "→ manager alert after (min)", null],
    ["managementAlertMinutes", "→ management alert after (min, high-value leads)", null],
    ["highValueAmount", "High-value lead from plan value (₹)", "Also URGENT / HIGH priority and hot leads"],
  ]],
];

export default function SlaPage() {
  const { data, isLoading } = useSlaSettingsQuery();
  if (isLoading || !data?.sla) return <PageSkeleton />;
  return <SlaForm key={JSON.stringify(data.sla)} initial={data.sla} />;
}

function SlaForm({ initial }) {
  const scope = useSelector(selectScope);
  const canEdit = hasSalesRole(scope, "ADMIN");
  const [save, { isLoading: saving }] = useUpdateSlaMutation();
  const [form, setForm] = useState(initial);
  const submit = async () => {
    try { await save(form).unwrap(); toast.success("SLA rules saved"); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><Timer className="h-5 w-5 text-primary" />SLA rules</h1>
      <p className="text-sm text-muted-foreground">Clocks only run in working hours ({form.workStart}–{form.workEnd} IST) and alerts only go out then — a lead assigned at night is due the next morning. {canEdit ? "" : "Only an admin can change these."}</p>
      {FIELDS.map(([title, rows]) => (
        <Card key={title}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rows.map(([key, label, hint]) => (
              <div key={key} className="grid items-center gap-1 sm:grid-cols-[1fr_140px]">
                <div><Label htmlFor={key}>{label}</Label>{hint && <p className="text-xs text-muted-foreground">{hint}{key === "highValueAmount" ? ` · now ${inr(form[key])}` : ""}</p>}</div>
                <Input id={key} type="number" disabled={!canEdit} value={form[key] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value === "" ? "" : Number(e.target.value) }))} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Working hours (IST)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label htmlFor="ws">Start</Label><Input id="ws" type="time" disabled={!canEdit} value={form.workStart} onChange={(e) => setForm((f) => ({ ...f, workStart: e.target.value }))} /></div>
          <div className="space-y-1"><Label htmlFor="we">End</Label><Input id="we" type="time" disabled={!canEdit} value={form.workEnd} onChange={(e) => setForm((f) => ({ ...f, workEnd: e.target.value }))} /></div>
        </CardContent>
      </Card>
      {canEdit && <div className="flex justify-end"><Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save rules</Button></div>}
    </div>
  );
}
