// FS08 — plan / reschedule a follow-up, and close one with a quick outcome (§31)
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/format";
import { useCreateTaskMutation, useUpdateTaskMutation } from "@/app/api";
import { CALL_OUTCOMES, TASK_TYPES, fromLocalInput, quickTimes, toLocalInput } from "./workUtils";

function WhenField({ value, onChange, label = "When" }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="flex flex-wrap gap-1">
        {quickTimes().map((q) => (
          <button key={q.label} type="button" onClick={() => onChange(toLocalInput(q.at))} className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted">{q.label}</button>
        ))}
      </div>
    </div>
  );
}

/**
 * Plan a follow-up / task (lead optional) or reschedule an existing one.
 * task given → edit mode (type, title, time, notes).
 */
export function TaskDialog({ open, onOpenChange, leadId = null, leadName = null, task = null, defaultType = "CALL" }) {
  const [create, { isLoading: creating }] = useCreateTaskMutation();
  const [update, { isLoading: updating }] = useUpdateTaskMutation();
  const [type, setType] = useState(task?.type || defaultType);
  const [title, setTitle] = useState(task?.title || "");
  const [when, setWhen] = useState(task ? toLocalInput(task.dueAt) : toLocalInput(quickTimes()[2]?.at));
  const [notes, setNotes] = useState(task?.notes || "");
  const busy = creating || updating;
  const save = async () => {
    try {
      if (task) await update({ id: task.id, type, title: title || undefined, dueAt: fromLocalInput(when), notes }).unwrap();
      else await create({ leadId: leadId || undefined, type, title: title || undefined, dueAt: fromLocalInput(when), notes: notes || undefined }).unwrap();
      toast.success(task ? "Follow-up updated" : "Follow-up planned");
      onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Change follow-up" : "Plan a follow-up"}</DialogTitle>
          <DialogDescription>{leadName ? `For ${leadName}. ` : ""}You get a reminder before it is due; if it is missed your manager is told.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Check proposal status" maxLength={200} />
            </div>
          </div>
          <WhenField value={when} onChange={setWhen} />
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy || !when}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Close a follow-up: call outcome (calls) or done, note, next follow-up */
export function CompleteTaskDialog({ open, onOpenChange, task }) {
  const [update, { isLoading }] = useUpdateTaskMutation();
  const isCall = task?.type === "CALL";
  const [outcome, setOutcome] = useState(isCall ? null : "DONE");
  const [note, setNote] = useState("");
  const [planNext, setPlanNext] = useState(false);
  const [when, setWhen] = useState(toLocalInput(quickTimes()[2]?.at));
  const [nextType, setNextType] = useState("CALL");
  const meta = CALL_OUTCOMES.find((o) => o.value === outcome);
  const needsNext = outcome === "CALL_BACK";
  const autoRetry = ["NO_ANSWER", "BUSY", "NOT_REACHABLE"].includes(outcome);
  const save = async () => {
    try {
      const next = needsNext || (planNext && !autoRetry) ? { dueAt: fromLocalInput(when), type: needsNext ? "CALL" : nextType } : undefined;
      const r = await update({ id: task.id, status: "DONE", outcome, outcomeNote: note || undefined, next }).unwrap();
      toast.success(r.next ? `Done — next follow-up planned for ${new Date(r.next.dueAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : "Done");
      onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  };
  if (!task) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCall ? "How did the call go?" : "Mark as done"}</DialogTitle>
          <DialogDescription>{task.title}{task.lead?.name ? ` · ${task.lead.name}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isCall && (
            <div className="grid grid-cols-2 gap-1.5">
              {CALL_OUTCOMES.map((o) => (
                <button key={o.value} type="button" onClick={() => setOutcome(o.value)}
                  className={cn("rounded-md border px-2 py-2 text-left text-sm", outcome === o.value ? `${o.tone} ring-2 ring-offset-1 ring-red-200` : "hover:bg-muted")}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {meta?.hint && <p className="text-xs text-muted-foreground">{meta.hint}</p>}
          <div className="space-y-1.5">
            <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did they say?" maxLength={1000} />
          </div>
          {needsNext ? <WhenField value={when} onChange={setWhen} label="Call back at" /> : !autoRetry && (
            <div className="space-y-2 rounded-md border p-2.5">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={planNext} onChange={(e) => setPlanNext(e.target.checked)} />Plan the next follow-up</label>
              {planNext && (
                <>
                  <Select value={nextType} onValueChange={setNextType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <WhenField value={when} onChange={setWhen} />
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={isLoading || !outcome || (needsNext && !when)}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
