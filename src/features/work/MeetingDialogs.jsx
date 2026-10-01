// FS08 — schedule a meeting (video with Google Meet / phone / in person) and close it with an outcome
import { useState } from "react";
import { Loader2, MapPin, Phone, Video } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/format";
import { useCreateMeetingMutation, useUpdateMeetingMutation } from "@/app/api";
import { fromLocalInput, quickTimes, toLocalInput } from "./workUtils";

const TYPES = [
  { value: "VIDEO", label: "Video (Google Meet)", Icon: Video },
  { value: "PHONE", label: "Phone call", Icon: Phone },
  { value: "IN_PERSON", label: "In person", Icon: MapPin },
];

export function MeetingDialog({ open, onOpenChange, leadId, leadName }) {
  const [create, { isLoading }] = useCreateMeetingMutation();
  const [type, setType] = useState("VIDEO");
  const [when, setWhen] = useState(toLocalInput(quickTimes()[2]?.at));
  const [duration, setDuration] = useState(30);
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const save = async () => {
    try {
      const r = await create({ leadId, type, startTime: fromLocalInput(when), durationMinutes: Number(duration), attendeeEmail: email || undefined, location: location || undefined, notes: notes || undefined }).unwrap();
      if (r.warning) toast.warning(r.warning);
      else toast.success(r.meeting?.meetLink ? "Meeting scheduled — Google Meet link created" : "Meeting scheduled");
      onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a meeting</DialogTitle>
          <DialogDescription>{leadName ? `With ${leadName}. ` : ""}It shows on your follow-ups with a reminder.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            {TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={cn("flex flex-col items-center gap-1 rounded-md border p-2 text-xs", type === t.value ? "border-red-200 bg-red-50 text-red-700" : "hover:bg-muted")}>
                <t.Icon className="h-4 w-4" />{t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <div className="space-y-1.5"><Label>When</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Minutes</Label><Input type="number" min={10} max={480} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          </div>
          {type === "VIDEO" && <div className="space-y-1.5"><Label>Guest email <span className="text-muted-foreground">(gets the invite)</span></Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prospect@email.com" /></div>}
          {type === "IN_PERSON" && <div className="space-y-1.5"><Label>Place</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office / their shop address" maxLength={300} /></div>}
          <div className="space-y-1.5"><Label>Agenda / notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={isLoading || !when}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** mode: 'completed' | 'cancelled' | 'reschedule' */
export function MeetingUpdateDialog({ open, onOpenChange, meeting, mode }) {
  const [update, { isLoading }] = useUpdateMeetingMutation();
  const [outcome, setOutcome] = useState("");
  const [when, setWhen] = useState(toLocalInput(meeting?.start));
  const save = async () => {
    try {
      const body = mode === "reschedule" ? { startTime: fromLocalInput(when) } : { status: mode, outcome: outcome || undefined };
      await update({ id: meeting.id, ...body }).unwrap();
      toast.success(mode === "completed" ? "Meeting completed" : mode === "cancelled" ? "Meeting cancelled" : "Meeting moved");
      onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  };
  if (!meeting) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "completed" ? "How did the meeting go?" : mode === "cancelled" ? "Cancel the meeting" : "Move the meeting"}</DialogTitle>
          <DialogDescription>{meeting.title}</DialogDescription>
        </DialogHeader>
        {mode === "reschedule"
          ? <div className="space-y-1.5"><Label>New time</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
          : <div className="space-y-1.5"><Label>{mode === "completed" ? "Outcome" : "Reason"}</Label><Textarea rows={3} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder={mode === "completed" ? "e.g. Interested in Growth plan — send proposal" : "e.g. They asked to postpone"} maxLength={300} /></div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Back</Button>
          <Button onClick={save} disabled={isLoading || (mode === "reschedule" && !when)} variant={mode === "cancelled" ? "destructive" : "default"}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
