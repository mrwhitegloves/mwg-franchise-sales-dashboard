// FS09 — proposal rows: PDF, send on WhatsApp / mark as sent, their answer, manager approval
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { CheckCircle2, FileDown, Loader2, MoreHorizontal, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { dateOnly, errorText, inr } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope } from "@/app/authSlice";
import { useDecideDiscountMutation, useProposalOutcomeMutation, useProposalPdfMutation, useSendProposalMutation } from "@/app/api";
import { PROPOSAL_STATUS } from "./dealUtils";

function NoteDialog({ title, description, confirm, destructive, onConfirm, onOpenChange, required = false }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={required ? "Required" : "Optional note"} maxLength={500} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Back</Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={busy || (required && !note.trim())} onClick={async () => { setBusy(true); const ok = await onConfirm(note); setBusy(false); if (ok) onOpenChange(false); }}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProposalRow({ p, showLead = true }) {
  const scope = useSelector(selectScope);
  const isManager = hasSalesRole(scope, "MANAGER");
  const [dialog, setDialog] = useState(null);
  const [pdf, { isLoading: pdfLoading }] = useProposalPdfMutation();
  const [send, { isLoading: sending }] = useSendProposalMutation();
  const [outcome] = useProposalOutcomeMutation();
  const [decide] = useDecideDiscountMutation();
  const st = PROPOSAL_STATUS[p.status] || { label: p.status, tone: "bg-muted" };
  const canSend = ["DRAFT", "APPROVED", "SENT", "NEGOTIATION"].includes(p.status) && !p.expired;
  const open = !["ACCEPTED", "DECLINED", "CANCELLED"].includes(p.status);
  const run = async (fn, ok) => { try { await fn(); toast.success(ok); return true; } catch (e) { toast.error(errorText(e)); return false; } };
  const openPdf = async () => {
    const w = window.open("", "_blank");
    try { const r = await pdf(p.id).unwrap(); if (w) w.location.href = r.url; else window.location.href = r.url; } catch (e) { w?.close(); toast.error(errorText(e)); }
  };
  return (
    <div className="flex flex-wrap items-start gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{p.number}</span>
          <span className="text-sm font-semibold">{p.plan.name}</span>
          <span className="text-sm tabular-nums">{inr(p.total)}</span>
          {p.discount?.amount > 0 && <span className="text-xs text-muted-foreground">({p.discount.percent}% off)</span>}
          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", st.tone)}>{st.label}</span>
          {p.expired && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] text-red-700">expired</span>}
        </div>
        <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {showLead && p.lead && <Link className="hover:text-primary hover:underline" to={`/leads/${p.lead.id}`}>{p.leadCode ? `${p.leadCode} · ` : ""}{p.lead.name}</Link>}
          <span>valid until {dateOnly(p.validUntil)}</span>
          {p.sentAt && <span>· sent {dateOnly(p.sentAt)}{p.sentVia === "MANUAL" ? " (by hand)" : " on WhatsApp"}</span>}
          {showLead && p.owner && <span>· {p.owner.name}</span>}
        </div>
        {p.discount?.reason && <p className="text-xs text-muted-foreground">Discount: {p.discount.reason}</p>}
        {(p.approval?.note || p.responseNote) && <p className="text-xs">{p.responseNote || p.approval.note}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {p.status === "PENDING_APPROVAL" && isManager && (
          <>
            <Button size="sm" className="h-8" onClick={() => setDialog("approve")}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Approve</Button>
            <Button size="sm" variant="outline" className="h-8 text-red-600" onClick={() => setDialog("reject")}><XCircle className="mr-1 h-3.5 w-3.5" />Reject</Button>
          </>
        )}
        {canSend && p.status !== "PENDING_APPROVAL" && <Button size="sm" className="h-8" disabled={sending} onClick={() => run(() => send({ id: p.id, via: "WHATSAPP" }).unwrap(), "Sent on WhatsApp from the MWG number")}>{sending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}{p.sentAt ? "Send again" : "Send"}</Button>}
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Open PDF" disabled={pdfLoading} onClick={openPdf}><FileDown className="h-4 w-4" /></Button>
        {open && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canSend && p.status !== "PENDING_APPROVAL" && <DropdownMenuItem onClick={() => run(() => send({ id: p.id, via: "MANUAL" }).unwrap(), "Marked as sent")}>Mark as sent (email / in person)</DropdownMenuItem>}
              {["SENT", "NEGOTIATION"].includes(p.status) && (
                <>
                  <DropdownMenuItem onClick={() => setDialog("NEGOTIATION")}>They want to negotiate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialog("ACCEPTED")}>They accepted</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialog("DECLINED")}>They declined</DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => setDialog("CANCELLED")}>Cancel proposal</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {dialog === "approve" && <NoteDialog title={`Approve ${p.discount?.percent}% discount?`} description={`${p.number} · ${p.plan.name} · ${inr(p.total)} — ${p.discount?.reason || ""}`} confirm="Approve" onOpenChange={() => setDialog(null)} onConfirm={(note) => run(() => decide({ id: p.id, approve: true, note }).unwrap(), "Discount approved")} />}
      {dialog === "reject" && <NoteDialog title="Reject the discount" required destructive confirm="Reject" onOpenChange={() => setDialog(null)} onConfirm={(note) => run(() => decide({ id: p.id, approve: false, note }).unwrap(), "Discount rejected")} />}
      {["NEGOTIATION", "ACCEPTED", "DECLINED", "CANCELLED"].includes(dialog) && (
        <NoteDialog title={{ NEGOTIATION: "They want to negotiate", ACCEPTED: "Proposal accepted 🎉", DECLINED: "They declined", CANCELLED: "Cancel this proposal" }[dialog]}
          description={dialog === "ACCEPTED" ? "Next: request the payment (Payments tab)." : null} destructive={dialog === "CANCELLED" || dialog === "DECLINED"}
          confirm="Save" onOpenChange={() => setDialog(null)} onConfirm={(note) => run(() => outcome({ id: p.id, status: dialog, note }).unwrap(), "Saved")} />
      )}
    </div>
  );
}
