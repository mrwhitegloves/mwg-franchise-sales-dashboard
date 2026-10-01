// FS08 — follow-up / task rows with quick actions (done, reschedule, cancel, call, chat)
import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, MessageSquare, MoreHorizontal, Phone, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ago, errorText, telLink } from "@/lib/format";
import { useUpdateTaskMutation } from "@/app/api";
import { CompleteTaskDialog, TaskDialog } from "./TaskDialogs";
import { OUTCOME_LABEL, timeOnly, typeMeta } from "./workUtils";

const ESC = { 1: "Missed — you were reminded", 2: "Escalated to your manager", 3: "Escalated to management" };

export function TaskRow({ task, showOwner = false, showLead = true, showDate = false }) {
  const [dialog, setDialog] = useState(null);
  const [update] = useUpdateTaskMutation();
  const { Icon: TypeIcon } = typeMeta(task.type);
  const open = task.status === "OPEN";
  const cancel = async () => {
    try { await update({ id: task.id, status: "CANCELLED" }).unwrap(); toast.success("Cancelled"); } catch (e) { toast.error(errorText(e)); }
  };
  const reopen = async () => {
    try { await update({ id: task.id, status: "OPEN" }).unwrap(); toast.success("Opened again"); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <div className={cn("flex items-start gap-3 px-3 py-2.5", task.overdue && "bg-red-50/60")}>
      <div className="w-16 shrink-0 pt-0.5 text-right">
        <p className={cn("text-sm font-semibold tabular-nums", task.overdue && "text-red-700")}>{timeOnly(task.dueAt)}</p>
        {showDate && <p className="text-[10px] text-muted-foreground">{new Date(task.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
      </div>
      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", open ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}><TypeIcon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", !open && "text-muted-foreground line-through decoration-1")}>{task.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {showLead && task.lead && <Link to={`/leads/${task.lead.id}`} className="hover:text-primary hover:underline">{task.lead.leadCode || task.lead.name}{task.lead.leadCode && task.lead.name ? ` · ${task.lead.name}` : ""}</Link>}
          {task.lead?.stage && <span>{task.lead.stage}</span>}
          {task.lead?.hot && <span className="text-orange-600">🔥 hot</span>}
          {showOwner && <span>· {task.owner?.name || "Unassigned"}</span>}
          {task.overdue && <span className="font-medium text-red-700">overdue {ago(task.dueAt).replace(" ago", "")}</span>}
          {!open && task.outcome && <span>· {OUTCOME_LABEL[task.outcome] || task.outcome}</span>}
          {task.status === "CANCELLED" && <span>· cancelled</span>}
        </div>
        {task.escalationLevel > 0 && open && <p className="mt-0.5 flex items-center gap-1 text-[11px] text-red-700"><AlertTriangle className="h-3 w-3" />{ESC[task.escalationLevel]}</p>}
        {(task.notes || task.outcomeNote) && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{task.outcomeNote || task.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {open && task.lead?.phone && task.type === "CALL" && <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Call"><a href={telLink(task.lead.phone)}><Phone className="h-4 w-4" /></a></Button>}
        {open && task.lead?.conversationId && task.type === "WHATSAPP" && <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Open chat"><Link to={`/whatsapp/${task.lead.conversationId}`}><MessageSquare className="h-4 w-4" /></Link></Button>}
        {open && <Button size="sm" variant="outline" className="h-8" onClick={() => setDialog("done")}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Done</Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {open ? (
              <>
                <DropdownMenuItem onClick={() => setDialog("edit")}>Reschedule / edit</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={cancel}><XCircle className="mr-2 h-4 w-4" />Cancel</DropdownMenuItem>
              </>
            ) : <DropdownMenuItem onClick={reopen}>Open again</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {dialog === "done" && <CompleteTaskDialog open task={task} onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "edit" && <TaskDialog open task={task} leadName={task.lead?.name} onOpenChange={(o) => !o && setDialog(null)} />}
    </div>
  );
}

export function TaskList({ items = [], empty, ...rowProps }) {
  if (!items.length) return empty || null;
  return <div className="divide-y">{items.map((t) => <TaskRow key={t.id} task={t} {...rowProps} />)}</div>;
}
