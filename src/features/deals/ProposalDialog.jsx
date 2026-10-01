// FS09 — proposal builder: plan from the website plans, optional discount (approval above the limit), validity
import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { errorText, inr } from "@/lib/format";
import { useCreateProposalMutation, useProposalSettingsQuery } from "@/app/api";
import { priceProposal } from "./dealUtils";

export function ProposalDialog({ open, onOpenChange, leadId, leadName, suggestedPlan }) {
  const { data } = useProposalSettingsQuery();
  const [create, { isLoading }] = useCreateProposalMutation();
  const plans = data?.plans || [];
  const settings = data?.settings || { maxDiscountPercent: 5, validityDays: 7, gstPercent: 18 };
  const [plan, setPlan] = useState(suggestedPlan || "");
  const [kind, setKind] = useState("NONE");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("");
  const [notes, setNotes] = useState("");
  const chosen = plans.find((p) => p.name === plan) || null;
  const price = priceProposal({ price: chosen?.price || 0, kind, value, gstPercent: settings.gstPercent });
  const needsApproval = kind !== "NONE" && price.percent > settings.maxDiscountPercent;
  const save = async () => {
    try {
      const r = await create({ leadId, plan, discount: { kind, value: Number(value) || 0, reason }, validityDays: Number(days) || undefined, notes: notes || undefined }).unwrap();
      toast.success(r.proposal.status === "PENDING_APPROVAL" ? `${r.proposal.number} created — waiting for discount approval` : `${r.proposal.number} created — send it from the list`);
      onOpenChange(false);
    } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New franchise proposal</DialogTitle>
          <DialogDescription>{leadName ? `For ${leadName}. ` : ""}Prices are the official website plans; a discount above {settings.maxDiscountPercent}% needs a manager's approval.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
              <SelectContent>{plans.map((p) => <SelectItem key={p.name} value={p.name}>{p.name} — {inr(p.price)} + GST</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <div className="space-y-1.5">
              <Label>Discount</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No discount</SelectItem>
                  <SelectItem value="PERCENT">Percent (%)</SelectItem>
                  <SelectItem value="AMOUNT">Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{kind === "PERCENT" ? "%" : "₹"}</Label><Input type="number" min={0} disabled={kind === "NONE"} value={value} onChange={(e) => setValue(e.target.value)} /></div>
          </div>
          {kind !== "NONE" && <div className="space-y-1.5"><Label>Why this discount?</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Two outlets planned" /></div>}
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <div className="space-y-1.5"><Label>Valid (days)</Label><Input type="number" min={1} max={90} placeholder={String(settings.validityDays)} value={days} onChange={(e) => setDays(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Notes on the PDF</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="What is included, next steps…" /></div>
          </div>
          {chosen && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <Line label={`${chosen.name} plan`} value={inr(chosen.price)} />
              {price.amount > 0 && <Line label={`Discount (${price.percent}%)`} value={`− ${inr(price.amount)}`} />}
              <Line label="Before GST" value={inr(price.subtotal)} />
              <Line label={`GST ${settings.gstPercent}%`} value={inr(price.gst)} />
              <Line label="Total" value={inr(price.total)} bold />
            </div>
          )}
          {needsApproval && <p className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-900"><AlertTriangle className="h-3.5 w-3.5" />{price.percent}% is above {settings.maxDiscountPercent}% — your manager approves before it can be sent.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={isLoading || !chosen || (kind !== "NONE" && (!Number(value) || !reason.trim()))}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{needsApproval ? "Ask for approval" : "Create proposal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Line({ label, value, bold }) {
  return <div className={cn("flex justify-between py-0.5", bold && "border-t pt-1.5 font-bold")}><span>{label}</span><span className="tabular-nums">{value}</span></div>;
}
