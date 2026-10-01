// §44–§48 Assignment rules, Round Robin order, Territories (admins change; managers see)
import { useState } from "react";
import { useSelector } from "react-redux";
import { ArrowDown, ArrowUp, Loader2, MapPin, Pencil, Plus, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSkeleton } from "@/components/PageSkeleton";
import { errorText } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope } from "@/app/authSlice";
import {
  useAssignmentSettingsQuery, useDeleteTerritoryMutation, useSaveTerritoryMutation, useTeamQuery, useTerritoriesQuery, useUpdateAssignmentSettingsMutation, useUpdateTeamMemberMutation,
} from "@/app/api";

const MODE_LABEL = { ROUND_ROBIN: "Round robin (one by one)", LOAD_BALANCED: "Load balanced (least busy first)", TERRITORY_BASED: "By territory (city / pincode rules)" };
const WH_LABEL = { ignore: "Ignore working hours", prefer: "Prefer people on shift", strict: "Only people on shift" };
const LEAVE_LABEL = { keep: "Keep their leads", hot: "Move hot leads", all: "Move all open leads" };

function SettingsCard({ canEdit }) {
  const { data, isLoading } = useAssignmentSettingsQuery();
  const [save, { isLoading: saving }] = useUpdateAssignmentSettingsMutation();
  if (isLoading || !data) return <PageSkeleton />;
  const s = data.settings;
  const set = async (patch) => { try { await save(patch).unwrap(); toast.success("Saved"); } catch (e) { toast.error(errorText(e)); } };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Shuffle className="h-4 w-4" />Assignment rules</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Row label="Assign new franchise leads automatically"><Switch checked={!!s.autoAssign} disabled={!canEdit || saving} onCheckedChange={(v) => set({ autoAssign: v })} /></Row>
        <Row label="How">
          <Select value={s.mode} disabled={!canEdit || saving} onValueChange={(v) => set({ mode: v })}><SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger><SelectContent>{data.options.modes.map((m) => <SelectItem key={m} value={m}>{MODE_LABEL[m] || m}</SelectItem>)}</SelectContent></Select>
        </Row>
        {s.mode === "TERRITORY_BASED" && (
          <Row label="When no territory matches">
            <Select value={s.fallbackMode} disabled={!canEdit || saving} onValueChange={(v) => set({ fallbackMode: v })}><SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger><SelectContent>{data.options.fallbackModes.map((m) => <SelectItem key={m} value={m}>{MODE_LABEL[m] || m.replace(/_/g, " ").toLowerCase()}</SelectItem>)}</SelectContent></Select>
          </Row>
        )}
        <Row label="Working hours">
          <Select value={s.workingHours} disabled={!canEdit || saving} onValueChange={(v) => set({ workingHours: v })}><SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger><SelectContent>{data.options.workingHours.map((m) => <SelectItem key={m} value={m}>{WH_LABEL[m] || m}</SelectItem>)}</SelectContent></Select>
        </Row>
        <Row label="Someone goes on leave">
          <Select value={s.reassignFromLeave} disabled={!canEdit || saving} onValueChange={(v) => set({ reassignFromLeave: v })}><SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger><SelectContent>{data.options.reassignFromLeave.map((m) => <SelectItem key={m} value={m}>{LEAVE_LABEL[m] || m}</SelectItem>)}</SelectContent></Select>
        </Row>
        <Row label="Inactive / suspended owner → move their leads"><Switch checked={!!s.reassignFromInactive} disabled={!canEdit || saving} onCheckedChange={(v) => set({ reassignFromInactive: v })} /></Row>
        <Row label="Alert managers when a lead cannot be assigned"><Switch checked={!!s.alertUnassigned} disabled={!canEdit || saving} onCheckedChange={(v) => set({ alertUnassigned: v })} /></Row>
        <Row label="Max open leads per person (default)"><Input type="number" className="h-9 w-28" disabled={!canEdit || saving} defaultValue={s.defaultMaxActiveLeads ?? ""} placeholder="no limit" onBlur={(e) => set({ defaultMaxActiveLeads: e.target.value === "" ? null : Number(e.target.value) })} /></Row>
        {!canEdit && <p className="text-xs text-muted-foreground">Only an admin can change these.</p>}
      </CardContent>
    </Card>
  );
}

const Row = ({ label, children }) => <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"><span>{label}</span>{children}</div>;

function RoundRobinCard({ canEdit }) {
  const { data, isLoading } = useTeamQuery();
  const [update, { isLoading: saving }] = useUpdateTeamMemberMutation();
  if (isLoading || !data) return <PageSkeleton />;
  const team = data.team || [];
  // Move one person up / down: renumber everybody 1..n in the new order
  const move = async (i, d) => {
    const order = [...team];
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    try {
      for (const [k, p] of order.entries()) if (p.roundRobinOrder !== k + 1) await update({ userId: p._id, roundRobinOrder: k + 1 }).unwrap();
      toast.success("Order saved");
    } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Round robin order</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {team.map((p, i) => (
          <div key={p._id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
            <span className="w-6 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
            <span className="flex-1 font-medium">{p.name}</span>
            <span className="text-xs text-muted-foreground">{p.open}/{p.maxActiveLeads ?? "∞"} open · {p.receivesLeads ? "receives leads" : p.notReceivingBecause}</span>
            {canEdit && <><Button variant="ghost" size="icon" className="h-7 w-7" disabled={saving || i === 0} onClick={() => move(i, -1)} aria-label="Up"><ArrowUp className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" disabled={saving || i === team.length - 1} onClick={() => move(i, 1)} aria-label="Down"><ArrowDown className="h-3.5 w-3.5" /></Button></>}
          </div>
        ))}
        {!team.length && <p className="text-sm text-muted-foreground">No franchise sales executives yet.</p>}
      </CardContent>
    </Card>
  );
}

function TerritoryDialog({ rule, team, onOpenChange }) {
  const [save, { isLoading }] = useSaveTerritoryMutation();
  const [f, setF] = useState(() => ({
    name: rule?.name || "", priority: rule?.priority ?? 0, strategy: rule?.strategy || "ROUND_ROBIN", active: rule?.active ?? true,
    cities: (rule?.match?.cities || []).join(", "), pincodes: (rule?.match?.pincodes || []).join(", "), states: (rule?.match?.states || []).join(", "),
    userIds: (rule?.userIds || []).map((u) => String(u._id || u)),
  }));
  const submit = async () => {
    try {
      await save({ id: rule?._id, name: f.name, priority: Number(f.priority) || 0, strategy: f.strategy, active: f.active, userIds: f.userIds, match: { cities: f.cities, pincodes: f.pincodes, states: f.states } }).unwrap();
      toast.success("Territory saved"); onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{rule ? "Edit territory" : "New territory"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_100px] gap-2"><div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Jharkhand" /></div><div><Label>Priority</Label><Input type="number" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} /></div></div>
          <div><Label>Cities (comma separated)</Label><Input value={f.cities} onChange={(e) => setF({ ...f, cities: e.target.value })} placeholder="Ranchi, Jamshedpur" /></div>
          <div><Label>Pincodes</Label><Input value={f.pincodes} onChange={(e) => setF({ ...f, pincodes: e.target.value })} placeholder="834001, 834002" /></div>
          <div><Label>States</Label><Input value={f.states} onChange={(e) => setF({ ...f, states: e.target.value })} placeholder="Jharkhand" /></div>
          <div>
            <Label>Salespeople for this territory</Label>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {team.map((p) => (
                <label key={p._id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.userIds.includes(p._id)} onChange={(e) => setF({ ...f, userIds: e.target.checked ? [...f.userIds, p._id] : f.userIds.filter((x) => x !== p._id) })} />{p.name}</label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Select value={f.strategy} onValueChange={(v) => setF({ ...f, strategy: v })}><SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ROUND_ROBIN">Share one by one</SelectItem><SelectItem value="LOAD_BALANCED">Least busy first</SelectItem></SelectContent></Select>
            <label className="flex items-center gap-2 text-sm">Active <Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /></label>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={isLoading || !f.name.trim()}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TerritoriesCard({ canEdit }) {
  const { data, isLoading } = useTerritoriesQuery();
  const { data: teamData } = useTeamQuery();
  const [del] = useDeleteTerritoryMutation();
  const [edit, setEdit] = useState(null);
  if (isLoading || !data) return <PageSkeleton />;
  const team = teamData?.team || [];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" />Territories</CardTitle>{canEdit && <Button size="sm" onClick={() => setEdit({})}><Plus className="mr-1 h-4 w-4" />Territory</Button>}</CardHeader>
      <CardContent className="space-y-1.5">
        {data.rules.map((r) => (
          <div key={r._id} className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.name}{!r.active && <span className="ml-1.5 rounded bg-muted px-1 text-[10px]">off</span>}<span className="ml-1.5 text-xs text-muted-foreground">priority {r.priority}</span></p>
              <p className="text-xs text-muted-foreground">{[...(r.match?.cities || []), ...(r.match?.pincodes || []), ...(r.match?.states || [])].join(", ") || "—"} → {(r.userIds || []).map((u) => u.name).join(", ") || "nobody"}</p>
            </div>
            {canEdit && <><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEdit(r)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={async () => { if (window.confirm(`Delete territory ${r.name}?`)) { try { await del(r._id).unwrap(); toast.success("Deleted"); } catch (e) { toast.error(errorText(e)); } } }} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button></>}
          </div>
        ))}
        {!data.rules.length && <p className="text-sm text-muted-foreground">No territories. They are only used when the assignment is "By territory".</p>}
      </CardContent>
      {edit && <TerritoryDialog rule={edit._id ? edit : null} team={team} onOpenChange={() => setEdit(null)} />}
    </Card>
  );
}

export default function RulesPage() {
  const canEdit = hasSalesRole(useSelector(selectScope), "ADMIN");
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-bold">Assignment</h1>
      <SettingsCard canEdit={canEdit} />
      <RoundRobinCard canEdit={canEdit} />
      <TerritoriesCard canEdit={canEdit} />
    </div>
  );
}
