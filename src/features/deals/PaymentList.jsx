// FS09 — payments: request (Razorpay link / offline), send link, proof, check, verify (manager / admin only — D6)
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { CheckCircle2, Copy, Loader2, MoreHorizontal, RefreshCw, Send, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { dateTime, errorText, inr } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope } from "@/app/authSlice";
import {
  useCancelPaymentMutation, useCheckPaymentMutation, useRequestPaymentMutation, useSendPaymentLinkMutation, useSubmitProofMutation, useVerifyPaymentMutation,
} from "@/app/api";
import { METHODS, PAYMENT_STATUS, PURPOSES, methodLabel } from "./dealUtils";

export function RequestPaymentDialog({ open, onOpenChange, leadId, proposals = [] }) {
  const [request, { isLoading }] = useRequestPaymentMutation();
  const accepted = proposals.find((p) => p.status === "ACCEPTED") || proposals.find((p) => ["SENT", "NEGOTIATION", "APPROVED"].includes(p.status));
  const [proposalId, setProposalId] = useState(accepted?.id || "none");
  const [amount, setAmount] = useState(accepted ? String(accepted.total) : "");
  const [method, setMethod] = useState("RAZORPAY_LINK");
  const [purpose, setPurpose] = useState("BOOKING_AMOUNT");
  const [note, setNote] = useState("");
  const save = async () => {
    try {
      const r = await request({ leadId, amount: Number(amount), method, purpose, proposalId: proposalId === "none" ? undefined : proposalId, note: note || undefined }).unwrap();
      toast.success(method === "RAZORPAY_LINK" ? `${r.payment.number}: link ready — press "Send link"` : `${r.payment.number} created — add the proof when they pay`);
      onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Request a payment</DialogTitle><DialogDescription>A manager or admin confirms the money arrived before the lead counts as won.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {proposals.length > 0 && (
            <div className="space-y-1.5">
              <Label>For proposal</Label>
              <Select value={proposalId} onValueChange={(v) => { setProposalId(v); const p = proposals.find((x) => x.id === v); if (p) setAmount(String(p.total)); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">No proposal</SelectItem>{proposals.map((p) => <SelectItem key={p.id} value={p.id}>{p.number} · {p.plan.name} · {inr(p.total)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Amount (₹, incl. GST)</Label><Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>For</Label>
              <Select value={purpose} onValueChange={setPurpose}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PURPOSES.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>How</Label>
            <Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METHODS.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label>Note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={isLoading || !(Number(amount) > 0)}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{method === "RAZORPAY_LINK" ? "Create link" : "Create request"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProofDialog({ payment, onOpenChange }) {
  const [submit, { isLoading }] = useSubmitProofMutation();
  const [file, setFile] = useState(null);
  const [reference, setReference] = useState("");
  const save = async () => {
    try { await submit({ id: payment.id, file, reference }).unwrap(); toast.success("Proof added — your manager verifies it"); onOpenChange(false); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Payment proof</DialogTitle><DialogDescription>{payment.number} · {inr(payment.amount)} · {methodLabel(payment.method)}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Screenshot / receipt (photo or PDF)</Label><Input type="file" accept="image/jpeg,image/png,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          <div className="space-y-1.5"><Label>Transaction reference (UTR / UPI ref / cheque no.)</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={isLoading || (!file && !reference.trim())}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save proof</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VerifyDialog({ payment, approve, onOpenChange }) {
  const [verify, { isLoading }] = useVerifyPaymentMutation();
  const [reason, setReason] = useState("");
  const noProof = !payment.needsVerification;
  const needReason = !approve || noProof;
  const save = async () => {
    try { await verify({ id: payment.id, approve, reason: reason || undefined }).unwrap(); toast.success(approve ? "Payment verified — lead won, onboarding started" : "Payment rejected"); onOpenChange(false); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{approve ? `Verify ${inr(payment.amount)}?` : "Reject this payment"}</DialogTitle>
          <DialogDescription>{payment.number} · {methodLabel(payment.method)}{payment.proof?.reference ? ` · ref ${payment.proof.reference}` : ""}{payment.linkStatus === "paid" ? " · Razorpay: paid" : ""}</DialogDescription>
        </DialogHeader>
        {payment.proof?.url && <a href={payment.proof.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Open the proof</a>}
        {approve && <p className="text-xs text-muted-foreground">Verified money marks the lead as won (Payment Received), starts onboarding and counts in revenue.</p>}
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={!approve ? "Why is it rejected? (required)" : noProof ? "No proof yet — how did you confirm the money arrived? (required)" : "Note (optional)"} maxLength={300} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Back</Button>
          <Button variant={approve ? "default" : "destructive"} onClick={save} disabled={isLoading || (needReason && !reason.trim())}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{approve ? "Verify" : "Reject"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentRow({ p, showLead = true }) {
  const scope = useSelector(selectScope);
  const isManager = hasSalesRole(scope, "MANAGER");
  const [dialog, setDialog] = useState(null);
  const [sendLink, { isLoading: sending }] = useSendPaymentLinkMutation();
  const [check, { isLoading: checking }] = useCheckPaymentMutation();
  const [cancel] = useCancelPaymentMutation();
  const st = PAYMENT_STATUS[p.status] || { label: p.status, tone: "bg-muted" };
  const open = !["VERIFIED", "CANCELLED"].includes(p.status);
  const run = async (fn, ok) => { try { const r = await fn(); if (ok) toast.success(typeof ok === "function" ? ok(r) : ok); } catch (e) { toast.error(errorText(e)); } };
  return (
    <div className="flex flex-wrap items-start gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{p.number}</span>
          <span className="text-sm font-semibold tabular-nums">{inr(p.amount)}</span>
          <span className="text-xs text-muted-foreground">{methodLabel(p.method)} · {PURPOSES.find((x) => x.value === p.purpose)?.label}</span>
          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", st.tone)}>{st.label}</span>
        </div>
        <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {showLead && p.lead && <Link className="hover:text-primary hover:underline" to={`/leads/${p.lead.id}`}>{p.leadCode ? `${p.leadCode} · ` : ""}{p.lead.name}</Link>}
          <span>{dateTime(p.createdAt)}</span>
          {showLead && p.owner && <span>· {p.owner.name}</span>}
          {p.proof?.reference && <span>· ref {p.proof.reference}</span>}
          {p.proof?.url && <a className="text-primary underline" href={p.proof.url} target="_blank" rel="noreferrer">proof</a>}
          {p.verifiedAt && <span>· {p.status === "VERIFIED" ? "verified" : "checked"} {dateTime(p.verifiedAt)}</span>}
        </div>
        {p.rejectReason && <p className="text-xs text-red-700">Rejected: {p.rejectReason}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isManager && open && p.status !== "REJECTED" && (p.needsVerification ? <Button size="sm" className="h-8" onClick={() => setDialog("verify")}><ShieldCheck className="mr-1 h-3.5 w-3.5" />Verify</Button> : null)}
        {p.link && ["REQUESTED", "LINK_SENT"].includes(p.status) && <Button size="sm" variant={p.status === "REQUESTED" ? "default" : "outline"} className="h-8" disabled={sending} onClick={() => run(() => sendLink(p.id).unwrap(), "Link sent on WhatsApp")}>{sending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}{p.status === "LINK_SENT" ? "Send again" : "Send link"}</Button>}
        {open && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {p.link && <DropdownMenuItem onClick={() => { navigator.clipboard?.writeText(p.link); toast.success("Link copied"); }}><Copy className="mr-2 h-4 w-4" />Copy link</DropdownMenuItem>}
              {p.link && ["REQUESTED", "LINK_SENT"].includes(p.status) && <DropdownMenuItem disabled={checking} onClick={() => run(() => check(p.id).unwrap(), (r) => (r.payment?.status === "PAID_ONLINE" ? "Paid! Waiting for verification" : "Not paid yet"))}><RefreshCw className="mr-2 h-4 w-4" />Check if paid</DropdownMenuItem>}
              {["REQUESTED", "LINK_SENT", "PROOF_SUBMITTED", "REJECTED"].includes(p.status) && <DropdownMenuItem onClick={() => setDialog("proof")}><Upload className="mr-2 h-4 w-4" />Add payment proof</DropdownMenuItem>}
              {isManager && ["REQUESTED", "LINK_SENT"].includes(p.status) && <DropdownMenuItem onClick={() => setDialog("verify")}><CheckCircle2 className="mr-2 h-4 w-4" />Verify without proof</DropdownMenuItem>}
              {isManager && ["PAID_ONLINE", "PROOF_SUBMITTED"].includes(p.status) && <DropdownMenuItem className="text-red-600" onClick={() => setDialog("reject")}>Reject</DropdownMenuItem>}
              <DropdownMenuItem className="text-red-600" onClick={() => run(() => cancel({ id: p.id }).unwrap(), "Cancelled")}>Cancel request</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {dialog === "proof" && <ProofDialog payment={p} onOpenChange={() => setDialog(null)} />}
      {dialog === "verify" && <VerifyDialog payment={p} approve onOpenChange={() => setDialog(null)} />}
      {dialog === "reject" && <VerifyDialog payment={p} approve={false} onOpenChange={() => setDialog(null)} />}
    </div>
  );
}
