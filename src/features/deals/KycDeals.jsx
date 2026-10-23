// Franchise KYC links on a lead (owner request 2026-10-22).
// The salesperson creates a unique KYC link (client name, city, plan, final amount incl. GST,
// token already paid). The client opens it without login; the KYC stays mapped to this lead.
// Payments, KYC review and onboarding are run by the admin team; this view follows them live.
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Copy, Link2, Loader2, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { dateTime, inr } from "@/lib/format";
import { useCreateKycLinkMutation, useLeadConversationQuery, useSendWhatsappMutation } from "@/app/api";

const STATUS_STYLE = {
  not_filled: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-800",
  action_required: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};
const STEP_STYLE = {
  done: "border-emerald-300 bg-emerald-50 text-emerald-800",
  in_progress: "border-blue-300 bg-blue-50 text-blue-800",
  pending: "border-slate-200 bg-white text-slate-500",
};
const rupee = (n) => (n == null ? "—" : inr(n));

export function KycDeals({ lead, data }) {
  const [open, setOpen] = useState(false);
  const deals = data?.deals || [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Franchise KYC</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Create KYC link</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {deals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No KYC link yet. When the client agrees to take the franchise, create a KYC link with the final amount and the token paid, and send it to them.
          </p>
        ) : deals.map((d) => <DealCard key={d.id} lead={lead} deal={d} />)}
      </CardContent>
      {open && <CreateKycLinkDialog lead={lead} data={data} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function DealCard({ lead, deal }) {
  const m = deal.money || {};
  const { data: conv } = useLeadConversationQuery(lead.leadId);
  const [send, { isLoading: sending }] = useSendWhatsappMutation();

  const copy = () => { navigator.clipboard?.writeText(deal.link); toast.success("KYC link copied"); };
  const sendOnWhatsApp = async () => {
    if (!conv?.conversationId) { toast.error("No WhatsApp chat with this lead yet — copy the link instead"); return; }
    const first = String(deal.partnerName || lead.name || "").split(" ")[0];
    const text = `Namaste${first ? ` ${first}` : ""} 🙏 Please complete your Mr. White Gloves franchise KYC here:\n${deal.link}\n\nYour details and franchise amount are already filled in. You only need your PAN, Aadhaar and bank details.`;
    try {
      await send({ id: conv.conversationId, text }).unwrap();
      toast.success("KYC link sent on WhatsApp");
    } catch (e) {
      if (e?.data?.code === "WINDOW_CLOSED") toast.error("The 24-hour WhatsApp window is closed — copy the link, or send a template first from the WhatsApp tab.");
      else toast.error(e?.data?.error || "Could not send on WhatsApp");
    }
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{deal.partnerName || lead.name} · {deal.plan || "—"}{deal.city ? ` · ${deal.city}` : ""}</p>
          <p className="text-[11px] text-muted-foreground">
            Link created {dateTime(deal.invitedAt || deal.createdAt)}{deal.invitedBy ? ` by ${deal.invitedBy}` : ""}
            {deal.submittedAt ? ` · KYC submitted ${dateTime(deal.submittedAt)}` : ""}
          </p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[deal.status] || "bg-slate-100")}>KYC: {deal.statusLabel}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Money label="Amount (incl. GST)" value={rupee(m.dealAmount)} />
        <Money label="Paid" value={rupee(m.paid)} className="text-emerald-700" />
        <Money label="Remaining" value={rupee(m.remaining)} className={m.remaining > 0 ? "text-red-600" : "text-muted-foreground"} />
      </div>

      {deal.next?.text && (
        <p className={cn("mt-2 text-[11px]", deal.next.late ? "font-semibold text-red-600" : "text-muted-foreground")}>
          {deal.next.late && <AlertTriangle className="mr-1 inline h-3 w-3" />}{deal.next.text}
        </p>
      )}

      {deal.link && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{deal.link}</span>
          </div>
          <Button size="sm" variant="outline" onClick={copy}><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button>
          <Button size="sm" variant="outline" onClick={sendOnWhatsApp} disabled={sending}>
            {sending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="mr-1 h-3.5 w-3.5" />}Send on WhatsApp
          </Button>
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1 text-[11px] text-muted-foreground">Onboarding {deal.progress?.done}/{deal.progress?.total}</p>
        <div className="flex flex-wrap gap-1">
          {(deal.steps || []).map((s) => (
            <span key={s.key} className={cn("rounded-full border px-2 py-0.5 text-[11px]", STEP_STYLE[s.status])} title={s.doneAt ? `Done ${dateTime(s.doneAt)}` : s.startedAt ? `Started ${dateTime(s.startedAt)}` : "Not started"}>
              {s.status === "done" && <CheckCircle2 className="mr-0.5 inline h-3 w-3" />}{s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Money({ label, value, className }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-bold", className)}>{value}</p>
    </div>
  );
}

// "Solo Partner" (lead opportunity) → "Solo Partner Plan" (KYC form plan)
const planOf = (plans, text) => plans.find((p) => text && p.toLowerCase().startsWith(String(text).toLowerCase().replace(/ plan$/, ""))) || plans[0];
const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function CreateKycLinkDialog({ lead, data, onClose }) {
  const plans = data?.plans || ["Solo Partner Plan", "Growth Partner Plan", "Master Franchise Plan"];
  const methods = data?.methods || [{ key: "UPI", label: "UPI" }];
  const [form, setForm] = useState({
    partnerName: lead.name || "",
    city: lead.city || "",
    franchisePlan: planOf(plans, lead.opportunityPlan),
    // opportunity value is the plan price without GST → + 18%
    dealAmount: lead.opportunityValue ? Math.round(lead.opportunityValue * 1.18) : "",
    tokenAmount: "",
    tokenMethod: "UPI",
    tokenPaidAt: nowLocal(),
    tokenReference: "",
  });
  const [created, setCreated] = useState(null);
  const [create, { isLoading }] = useCreateKycLinkMutation();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const remaining = Number(form.dealAmount || 0) - Number(form.tokenAmount || 0);

  const submit = async () => {
    try {
      const res = await create({
        leadId: lead.leadId,
        partnerName: form.partnerName,
        city: form.city,
        franchisePlan: form.franchisePlan,
        dealAmount: Number(form.dealAmount),
        ...(Number(form.tokenAmount) > 0 ? { token: { amount: Number(form.tokenAmount), method: form.tokenMethod, paidAt: new Date(form.tokenPaidAt).toISOString(), reference: form.tokenReference } } : {}),
      }).unwrap();
      setCreated(res.link);
      toast.success("KYC link created");
    } catch (e) {
      toast.error(e?.data?.error || "Could not create the KYC link");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{created ? "KYC link ready" : "Create franchise KYC link"}</DialogTitle></DialogHeader>
        {created ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Send this link to the client. It never expires and opens without login. The details below are shown on top of the form.</p>
            <div className="break-all rounded-md border bg-muted/40 p-2 text-sm">{created}</div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(created); toast.success("KYC link copied"); }}><Copy className="mr-1 h-4 w-4" />Copy link</Button>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Client name"><Input value={form.partnerName} onChange={(e) => set("partnerName", e.target.value)} /></Field>
              <Field label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="Franchise plan">
                <select value={form.franchisePlan} onChange={(e) => set("franchisePlan", e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  {plans.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Final amount incl. GST (₹)"><Input type="number" min="1" value={form.dealAmount} onChange={(e) => set("dealAmount", e.target.value)} /></Field>
            </div>
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-semibold">Token amount already paid <span className="font-normal text-muted-foreground">(optional)</span></p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Amount (₹)"><Input type="number" min="0" value={form.tokenAmount} onChange={(e) => set("tokenAmount", e.target.value)} placeholder="0" /></Field>
                <Field label="How was it paid?">
                  <select value={form.tokenMethod} onChange={(e) => set("tokenMethod", e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                    {methods.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                  </select>
                </Field>
                <Field label="Paid on"><Input type="datetime-local" value={form.tokenPaidAt} max={nowLocal()} onChange={(e) => set("tokenPaidAt", e.target.value)} /></Field>
                <Field label="Reference (UTR / UPI ref)"><Input value={form.tokenReference} onChange={(e) => set("tokenReference", e.target.value)} /></Field>
              </div>
              {Number(form.dealAmount) > 0 && <p className="mt-2 text-xs text-muted-foreground">Remaining after token: <b className="text-foreground">{inr(Math.max(0, remaining))}</b></p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={submit} disabled={isLoading || !form.partnerName || !form.city || !(Number(form.dealAmount) > 0)}>
                {isLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Create link
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
