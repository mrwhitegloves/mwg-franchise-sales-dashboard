// Stage / lost / reopen / reassign dialogs for one lead (§20, §21, D6)
import { useState } from "react";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChangeStatusMutation, useMetaQuery, useReassignLeadMutation } from "@/app/api";
import { selectScope, selectTeam, selectUser } from "@/app/authSlice";
import { errorText } from "@/lib/format";

export function StageDialog({ lead, open, onOpenChange }) {
  const scope = useSelector(selectScope);
  const { data: meta } = useMetaQuery();
  const [stage, setStage] = useState(lead.stage);
  const [reason, setReason] = useState("");
  const [change, { isLoading }] = useChangeStatusMutation();
  const stages = meta?.stages || [];
  const maxIdx = stages.findIndex((s) => s.key === meta?.execMaxStage);
  const allowed = scope?.kind === "own" ? stages.slice(0, maxIdx + 1) : stages;

  const save = async () => {
    try {
      const r = await change({ id: lead.leadId, stage, reason: reason || undefined }).unwrap();
      toast.success(`Stage: ${r.stageLabel}`);
      onOpenChange(false);
    } catch (err) { toast.error(errorText(err)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change stage</DialogTitle>
          <DialogDescription>{scope?.kind === "own" ? "Payment received and later stages are confirmed by your manager / admin." : "Your choice sticks; the system only moves it forward when new facts prove a later stage."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{allowed.map((s, i) => <SelectItem key={s.key} value={s.key}>{i + 1}. {s.label}</SelectItem>)}</SelectContent>
          </Select>
          <div><Label className="text-xs text-muted-foreground">Note (optional)</Label><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. meeting booked for Friday" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={isLoading || stage === lead.stage} onClick={save}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LostDialog({ lead, open, onOpenChange }) {
  const { data: meta } = useMetaQuery();
  const [code, setCode] = useState("LOST");
  const [reason, setReason] = useState("");
  const [change, { isLoading }] = useChangeStatusMutation();
  const save = async () => {
    try {
      await change({ id: lead.leadId, status: "lost", reasonCode: code, reason: reason || undefined }).unwrap();
      toast.success("Lead closed");
      onOpenChange(false);
    } catch (err) { toast.error(errorText(err)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Close lead</DialogTitle><DialogDescription>Pick why this lead is closed. A manager can reopen it.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <Select value={code} onValueChange={setCode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(meta?.lostReasons || []).map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened? (helps re-activation later)" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={isLoading} onClick={save}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Close lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReassignDialog({ lead, open, onOpenChange }) {
  const team = useSelector(selectTeam);
  const me = useSelector(selectUser);
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [force, setForce] = useState(false);
  const [reassign, { isLoading }] = useReassignLeadMutation();
  const options = [{ _id: me?._id, name: `${me?.name} (me)` }, ...team.filter((m) => m._id !== me?._id && m.isActive !== false)];
  const save = async () => {
    try {
      await reassign({ id: lead.leadId, userId: to === "pool" ? null : to, reason, force }).unwrap();
      toast.success(to === "pool" ? "Returned to the unassigned pool" : "Lead reassigned");
      onOpenChange(false);
    } catch (err) {
      if (err?.status === 409 && err.data?.code?.startsWith("TARGET_")) { setForce(true); toast.warning(`${errorText(err)} — press Reassign again to confirm.`); }
      else toast.error(errorText(err));
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setTo(""); setReason(""); setForce(false); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{lead.owner ? "Reassign lead" : "Assign lead"}</DialogTitle><DialogDescription>The new owner gets the lead, its follow-ups and its chat; the old owner loses access.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <Select value={to} onValueChange={(v) => { setTo(v); setForce(false); }}>
            <SelectTrigger><SelectValue placeholder="Choose a person" /></SelectTrigger>
            <SelectContent>
              {options.filter((o) => o._id !== lead.owner?._id).map((o) => <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>)}
              {lead.owner && <SelectItem value="pool">Back to the unassigned pool</SelectItem>}
            </SelectContent>
          </Select>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={isLoading || !to || !reason.trim()} onClick={save}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{force ? "Confirm reassign" : "Reassign"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
