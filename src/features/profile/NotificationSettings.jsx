// FS10 — my notification settings: this device (push), quiet hours, which alerts I get
import { useEffect, useState } from "react";
import { BellOff, BellRing, Loader2, Moon, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageSkeleton } from "@/components/PageSkeleton";
import { errorText } from "@/lib/format";
import { useNotificationPrefsQuery, useUpdateNotificationPrefsMutation } from "@/app/api";
import { disablePush, enablePush, pushStatus, testPush } from "@/lib/push";

function DevicePush() {
  const [status, setStatus] = useState("…");
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushStatus().then(setStatus); }, []);
  const run = async (fn, ok) => {
    setBusy(true);
    try { const s = await fn(); if (typeof s === "string") setStatus(s); if (ok) toast.success(ok); } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
      {status === "on" ? <BellRing className="h-4 w-4 text-emerald-600" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
      <p className="flex-1 text-sm">
        {status === "on" ? "Push notifications are on for this device." : status === "denied" ? "Notifications are blocked in this browser — allow them in the site settings." : status === "unsupported" ? "This browser cannot show push notifications (on iPhone: add the app to the Home Screen first)." : "Push notifications are off for this device."}
      </p>
      {status === "on" && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(async () => { const r = await testPush(); return r.delivered ? undefined : "on"; }, "Test sent — it should pop up now")}><Send className="mr-1 h-3.5 w-3.5" />Test</Button>}
      {status === "on" && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(disablePush, "Turned off for this device")}>Turn off</Button>}
      {status === "off" && <Button size="sm" disabled={busy} onClick={() => run(enablePush, "Notifications are on for this device")}>{busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}Turn on</Button>}
    </div>
  );
}

export function NotificationSettings() {
  const { data, isLoading } = useNotificationPrefsQuery();
  const [save, { isLoading: saving }] = useUpdateNotificationPrefsMutation();
  if (isLoading || !data) return <PageSkeleton />;
  const { prefs, categories } = data;
  const update = async (patch, ok) => {
    try { await save(patch).unwrap(); if (ok) toast.success(ok); } catch (e) { toast.error(errorText(e)); }
  };
  const toggle = (key, on) => update({ muted: on ? prefs.muted.filter((k) => k !== key) : [...prefs.muted, key] });
  const groups = [["sales", "My leads"], ["management", "Team / management"]];
  return (
    <Card id="notifications">
      <CardHeader className="pb-2"><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <DevicePush />
        <div className="flex flex-wrap items-end gap-2">
          <Moon className="mb-2.5 h-4 w-4 text-muted-foreground" />
          <div><Label className="text-xs">Quiet from</Label><Input type="time" className="h-9 w-32" defaultValue={prefs.quietStart || ""} onBlur={(e) => update({ quietStart: e.target.value || null }, "Saved")} /></div>
          <div><Label className="text-xs">until</Label><Input type="time" className="h-9 w-32" defaultValue={prefs.quietEnd || ""} onBlur={(e) => update({ quietEnd: e.target.value || null }, "Saved")} /></div>
          <p className="mb-2 text-xs text-muted-foreground">No phone alerts then — they still wait in the bell.</p>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <span className="text-sm">Phone / desktop alerts (push) for my account</span>
          <Switch checked={prefs.push} disabled={saving} onCheckedChange={(v) => update({ push: v })} />
        </div>
        {groups.map(([g, title]) => {
          const list = categories.filter((c) => c.group === g);
          return (
            <div key={g} className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
              {list.map((c) => (
                <label key={c.key} className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50">
                  <span>{c.label}</span>
                  <Switch checked={!prefs.muted.includes(c.key)} disabled={saving} onCheckedChange={(on) => toggle(c.key, on)} />
                </label>
              ))}
            </div>
          );
        })}
        <p className="text-[11px] text-muted-foreground">Turned-off alerts do not appear in your bell either. Alerts are only ever about your own leads (managers: your team).</p>
      </CardContent>
    </Card>
  );
}
