// Partner KYC Verification → one franchise deal (same as the admin dashboard's KYC workspace).
// Tabs: Overview · KYC form · Notes · Proposals · Payments · Onboarding.
// Every change is final (no approval) and shows in the admin dashboard too — same records.
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Clock, Copy, FileText, History, IndianRupee, Pencil, PlayCircle,
  Plus, RefreshCw, RotateCcw, StickyNote, Trash2, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";
import { dateOnly, errorText } from "@/lib/format";
import {
  useAddKycNoteMutation, useAddKycPaymentMutation, useDeleteKycPaymentMutation, useKycWorkspaceQuery, useUpdateKycDealMutation,
  useUpdateKycFormMutation, useUpdateKycPaymentMutation, useUpdateKycStepMutation,
} from "@/app/api";
import KycFormTab from "./KycFormTab";
import { KYC_STATUS, STEP_STYLE, daysSince, fullDateTime, nowLocal, rupee, selectClass, toLocalInput } from "./kycUtils";
import { Field, NextStep, Section, StatusBadge } from "./KycBits";

export default function KycWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isFetching, error, refetch } = useKycWorkspaceQuery(id);
  const [tab, setTab] = useState("overview");

  if (isLoading) return <PageSkeleton />;
  if (error || !data?.kyc) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-lg font-bold">KYC record not found</h2>
        <p className="text-sm text-muted-foreground">{error?.status === 404 ? "It does not exist, or it belongs to a lead that is not yours." : errorText(error)}</p>
        <Button variant="outline" onClick={() => navigate("/kyc")}>Back to Partner KYC</Button>
      </div>
    );
  }

  const { kyc, money, next, link, progress } = data;
  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-10">
      {/* Header */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/kyc")} className="shrink-0"><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold">{kyc.partnerName || kyc.fullName || "—"}</h1>
                {kyc.leadCode && <span className="rounded border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{kyc.leadCode}</span>}
                <StatusBadge status={kyc.kycStatus} prefix="KYC: " />
                <span className="text-[11px] text-muted-foreground">Onboarding {progress.done}/{progress.total}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {kyc.franchisePlan || "—"} · {kyc.city || kyc.primaryOperatingCity || "—"} · {kyc.mobileNumber || "—"}
                {kyc.invitedByName ? ` · link by ${kyc.invitedByName}` : ""}
              </p>
              <NextStep next={next} className="mt-1 text-xs" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {link && (
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(link); toast.success("KYC link copied"); }}>
                <Copy className="mr-1 h-3.5 w-3.5" />Copy KYC link
              </Button>
            )}
            {data.lead?.id && (
              <Button variant="outline" size="sm" asChild><Link to={`/leads/${data.lead.id}`}><User className="mr-1 h-3.5 w-3.5" />Open lead</Link></Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh">
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MoneyBox label="Franchise amount (incl. GST)" value={rupee(money.dealAmount)} />
          <MoneyBox label="Paid" value={rupee(money.paid)} tone="text-emerald-700" />
          <MoneyBox label="Remaining" value={rupee(money.remaining)} tone={money.remaining > 0 ? "text-red-600" : "text-muted-foreground"} />
          <MoneyBox label="Waiting for verification" value={rupee(money.awaiting)} tone="text-amber-700" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="h-auto w-max justify-start gap-1 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="kyc">KYC form</TabsTrigger>
            <TabsTrigger value="notes">Notes ({data.notes.length})</TabsTrigger>
            <TabsTrigger value="proposals">Proposals ({data.proposals.length})</TabsTrigger>
            <TabsTrigger value="payments">Payments ({data.payments.length})</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding {progress.done}/{progress.total}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview"><OverviewTab data={data} onOpenTab={setTab} /></TabsContent>
        <TabsContent value="kyc">
          {kyc.kycStatus === "not_filled"
            ? <EmptyBox text="The client has not filled the KYC form yet." sub={link ? `Share the link: ${link}` : null} />
            : <KycFormTab id={kyc._id} plans={data.plans} />}
        </TabsContent>
        <TabsContent value="notes"><NotesTab data={data} /></TabsContent>
        <TabsContent value="proposals"><ProposalsTab data={data} /></TabsContent>
        <TabsContent value="payments"><PaymentsTab data={data} /></TabsContent>
        <TabsContent value="onboarding"><OnboardingTab data={data} /></TabsContent>
      </Tabs>
    </div>
  );
}

function MoneyBox({ label, value, tone = "text-foreground" }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-extrabold", tone)}>{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function EmptyBox({ text, sub }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-10 text-center">
      <p className="text-sm font-semibold">{text}</p>
      {sub && <p className="mt-1 break-all text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────
function OverviewTab({ data, onOpenTab }) {
  const { kyc, lead, link, history, steps } = data;
  const [editOpen, setEditOpen] = useState(false);
  const [statusValue, setStatusValue] = useState(kyc.kycStatus);
  const [save, { isLoading: saving }] = useUpdateKycFormMutation();

  const saveStatus = async () => {
    try {
      await save({ id: kyc._id, body: { kycStatus: statusValue } }).unwrap();
      toast.success("KYC status saved");
    } catch (e) {
      toast.error(errorText(e, "Could not save the status"));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Franchise deal" icon={IndianRupee} action={<Button size="sm" variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit deal</Button>}>
        <Row label="Client name" value={kyc.partnerName || kyc.fullName} />
        <Row label="Plan" value={kyc.franchisePlan} />
        <Row label="City" value={kyc.city} />
        <Row label="Franchise amount (incl. GST)" value={rupee(data.money.dealAmount)} />
        <Row label="Paid" value={<span className="text-emerald-700">{rupee(data.money.paid)}</span>} />
        <Row label="Remaining" value={<span className={data.money.remaining > 0 ? "text-red-600" : ""}>{rupee(data.money.remaining)}</span>} />
        <Row label="KYC link" value={link ? <span className="break-all text-xs font-normal text-blue-700">{link}</span> : "— (submitted without a link)"} />
        <Row label="Link created" value={kyc.invitedAt ? `${fullDateTime(kyc.invitedAt)}${kyc.invitedByName ? ` by ${kyc.invitedByName}` : ""}` : null} />
        <Row label="KYC submitted" value={kyc.submittedAt ? fullDateTime(kyc.submittedAt) : "Not yet"} />
      </Section>

      <div className="space-y-4">
        <Section title="KYC status" icon={CheckCircle2}>
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
              {Object.entries(KYC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Button size="sm" onClick={saveStatus} disabled={saving || statusValue === kyc.kycStatus}>{saving ? "Saving…" : "Save status"}</Button>
          </div>
          <NextStep next={data.next} className="mt-2 text-xs" />
          {kyc.adminRemarks && <p className="mt-2 text-xs text-muted-foreground">Remarks: {kyc.adminRemarks}</p>}
        </Section>

        <Section title="Lead" icon={User} action={lead?.id ? <Button size="sm" variant="ghost" asChild><Link to={`/leads/${lead.id}`}>Open</Link></Button> : null}>
          {lead ? (
            <>
              <Row label="Lead" value={`${lead.name || "—"}${lead.leadCode ? ` (${lead.leadCode})` : ""}`} />
              <Row label="Salesperson" value={lead.owner} />
              <Row label="Stage" value={lead.stage ? `${lead.stage}${lead.status ? ` · ${lead.status}` : ""}` : null} />
              <Row label="Source" value={lead.source} />
              <Row label="Lead came in" value={lead.createdAt ? dateOnly(lead.createdAt) : null} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Not linked to a lead (KYC filled without a sales link and no lead with this mobile number).</p>
          )}
        </Section>

        <Section title="Onboarding" icon={Clock} action={<Button size="sm" variant="ghost" onClick={() => onOpenTab("onboarding")}>Open</Button>}>
          <div className="flex flex-wrap gap-1.5">
            {steps.map((s) => <span key={s.key} className={cn("rounded-full border px-2 py-0.5 text-[11px]", STEP_STYLE[s.status].chip)}>{s.label}</span>)}
          </div>
        </Section>

        <Section title="Recent activity" icon={History}>
          {history.length === 0 ? <p className="text-sm text-muted-foreground">Nothing yet.</p> : (
            <ul className="space-y-2">
              {history.slice(0, 6).map((h, i) => (
                <li key={i} className="text-xs">
                  <span>{h.text}</span>
                  <span className="block text-[10px] text-muted-foreground">{fullDateTime(h.at)}{h.byName ? ` · ${h.byName}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {editOpen && <EditDealDialog data={data} onClose={() => setEditOpen(false)} />}
    </div>
  );
}

function EditDealDialog({ data, onClose }) {
  const { kyc } = data;
  const [form, setForm] = useState({ partnerName: kyc.partnerName || kyc.fullName || "", city: kyc.city || "", franchisePlan: kyc.franchisePlan || data.plans[0], dealAmount: kyc.dealAmount || "" });
  const [save, { isLoading }] = useUpdateKycDealMutation();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    try {
      await save({ id: kyc._id, ...form, dealAmount: Number(form.dealAmount) }).unwrap();
      toast.success("Deal saved");
      onClose();
    } catch (e) {
      toast.error(errorText(e, "Could not save the deal"));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit franchise deal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Client name"><Input value={form.partnerName} onChange={(e) => set("partnerName", e.target.value)} /></Field>
          <Field label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Plan">
            <select value={form.franchisePlan} onChange={(e) => set("franchisePlan", e.target.value)} className={selectClass}>
              {data.plans.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Final franchise amount incl. GST (₹)"><Input type="number" min="1" value={form.dealAmount} onChange={(e) => set("dealAmount", e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isLoading}>{isLoading ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Notes ────────────────────────────────────────────────────────
function NotesTab({ data }) {
  const [text, setText] = useState("");
  const [add, { isLoading }] = useAddKycNoteMutation();
  const submit = async () => {
    if (!text.trim()) return;
    try {
      await add({ id: data.kyc._id, text: text.trim() }).unwrap();
      setText("");
      toast.success("Note added");
    } catch (e) {
      toast.error(errorText(e, "Could not add the note"));
    }
  };
  return (
    <Section title="Notes" icon={StickyNote}>
      <div className="mb-4 space-y-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a note (also shows on the lead and in the admin dashboard)…" rows={3} />
        <div className="flex justify-end"><Button size="sm" onClick={submit} disabled={isLoading || !text.trim()}>{isLoading ? "Saving…" : "Add note"}</Button></div>
      </div>
      {data.notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : (
        <ul className="space-y-3">
          {data.notes.map((n) => (
            <li key={n.id} className="rounded-lg border bg-muted/30 p-3">
              <p className="whitespace-pre-wrap text-sm">{n.text}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{n.by || "—"} · {fullDateTime(n.at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ── Proposals (made on the lead page) ────────────────────────────
function ProposalsTab({ data }) {
  if (!data.proposals.length) {
    return <EmptyBox text="No proposals for this lead." sub={data.lead?.id ? "Make one from the lead page → Proposals." : null} />;
  }
  return (
    <Section title="Proposals" icon={FileText}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Number</th><th>Plan</th><th className="text-right">Discount</th><th className="text-right">Total</th><th className="pl-3">Status</th><th>Sent</th><th>Valid until</th><th /></tr></thead>
          <tbody>
            {data.proposals.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 font-mono text-xs">{p.number}</td>
                <td>{p.plan}</td>
                <td className="text-right">{p.discount ? rupee(p.discount) : "—"}</td>
                <td className="text-right font-semibold">{rupee(p.total)}</td>
                <td className="pl-3"><span className="rounded-full border px-2 py-0.5 text-[11px] capitalize">{String(p.status).replace(/_/g, " ").toLowerCase()}</span></td>
                <td className="text-xs">{p.sentAt ? dateOnly(p.sentAt) : "—"}</td>
                <td className="text-xs">{dateOnly(p.validUntil)}</td>
                <td>{p.pdf && <a href={p.pdf} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">PDF</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ── Payments ─────────────────────────────────────────────────────
const PAY_BADGE = (s) => (s === "VERIFIED" ? ["Received", "bg-emerald-100 text-emerald-800"]
  : s === "PAID_ONLINE" ? ["Paid online — verify", "bg-amber-100 text-amber-800"]
    : s === "PROOF_SUBMITTED" ? ["Proof — verify", "bg-amber-100 text-amber-800"]
      : [String(s || "").toLowerCase(), "bg-slate-100 text-slate-700"]);

function PaymentsTab({ data }) {
  const canEdit = !!data.can?.editPayments;
  const [dialog, setDialog] = useState(null);   // null | { mode: 'add' } | { mode: 'edit', payment }
  const [remove, { isLoading: deleting }] = useDeleteKycPaymentMutation();
  const m = data.money;

  const onDelete = async (p) => {
    if (!window.confirm(`Delete payment ${p.number} of ${rupee(p.amount)}?`)) return;
    try {
      await remove({ id: data.kyc._id, paymentId: p.id }).unwrap();
      toast.success("Payment deleted");
    } catch (e) {
      toast.error(errorText(e, "Could not delete the payment"));
    }
  };

  return (
    <Section title="Payment history" icon={IndianRupee} action={<Button size="sm" onClick={() => setDialog({ mode: "add" })}><Plus className="mr-1 h-3.5 w-3.5" />Add payment</Button>}>
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <MoneyBox label="Franchise amount" value={rupee(m.dealAmount)} />
        <MoneyBox label="Paid" value={rupee(m.paid)} tone="text-emerald-700" />
        <MoneyBox label="Remaining" value={rupee(m.remaining)} tone={m.remaining > 0 ? "text-red-600" : "text-muted-foreground"} />
      </div>
      {m.dealAmount > 0 && (
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (m.paid / m.dealAmount) * 100)}%` }} />
        </div>
      )}
      {data.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2">Date &amp; time</th><th className="text-right">Amount</th><th className="pl-3">How</th><th>Reference</th><th>Status</th><th>Added by</th><th>Note</th>{canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => {
                const [label, color] = PAY_BADGE(p.status);
                return (
                  <tr key={p.id} className="border-b align-top last:border-0">
                    <td className="whitespace-nowrap py-2 text-xs">{fullDateTime(p.paidAt)}<span className="block font-mono text-[10px] text-muted-foreground">{p.number}</span></td>
                    <td className="text-right font-semibold">{rupee(p.amount)}</td>
                    <td className="pl-3 text-xs">{p.methodLabel}</td>
                    <td className="text-xs">{p.reference || "—"}</td>
                    <td><span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", color)}>{label}</span></td>
                    <td className="text-xs">{p.addedBy || (p.source === "sales_app" ? "Sales App" : "—")}</td>
                    <td className="max-w-[200px] text-xs text-muted-foreground">{p.note || "—"}</td>
                    {canEdit && (
                      <td className="whitespace-nowrap text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => setDialog({ mode: "edit", payment: p })}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" title="Delete" disabled={deleting} onClick={() => onDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!canEdit && <p className="mt-3 text-[11px] text-muted-foreground">Only an Admin can edit or delete a payment.</p>}
      {dialog && <PaymentDialog key={dialog.payment?.id || "new"} data={data} dialog={dialog} onClose={() => setDialog(null)} />}
    </Section>
  );
}

function PaymentDialog({ data, dialog, onClose }) {
  const editing = dialog.mode === "edit" ? dialog.payment : null;
  const [form, setForm] = useState({
    amount: editing?.amount ?? (data.money.remaining || ""),
    method: editing?.method || "UPI",
    paidAt: toLocalInput(editing?.paidAt),
    reference: editing?.reference || "",
    note: editing?.note || "",
  });
  const [add, { isLoading: adding }] = useAddKycPaymentMutation();
  const [update, { isLoading: updating }] = useUpdateKycPaymentMutation();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const body = { ...form, amount: Number(form.amount), paidAt: new Date(form.paidAt).toISOString() };
    try {
      if (editing) await update({ id: data.kyc._id, paymentId: editing.id, ...body, ...(editing.status !== "VERIFIED" ? { status: "VERIFIED" } : {}) }).unwrap();
      else await add({ id: data.kyc._id, ...body }).unwrap();
      toast.success(editing ? "Payment updated" : "Payment added");
      onClose();
    } catch (e) {
      toast.error(errorText(e, "Could not save the payment"));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{editing ? `Edit payment ${editing.number}` : "Add payment received"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Amount (₹)"><Input type="number" min="1" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
          <Field label="How was it paid?">
            <select value={form.method} onChange={(e) => set("method", e.target.value)} className={selectClass}>
              {data.methods.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Date & time paid"><Input type="datetime-local" value={form.paidAt} max={nowLocal()} onChange={(e) => set("paidAt", e.target.value)} /></Field>
          <Field label="Reference (UTR / UPI ref / cheque no.)"><Input value={form.reference} onChange={(e) => set("reference", e.target.value)} /></Field>
          <Field label="Note"><Textarea rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} /></Field>
          {!editing && <p className="text-xs text-muted-foreground">Saved as received straight away (no approval), like in the admin dashboard.</p>}
          {editing && editing.status !== "VERIFIED" && <p className="text-xs text-amber-700">Saving marks this payment as received.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={adding || updating || !(Number(form.amount) > 0)}>{adding || updating ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Onboarding ───────────────────────────────────────────────────
function OnboardingTab({ data }) {
  const [action, setAction] = useState(null);   // { step, kind: 'done' | 'note' }
  const [update, { isLoading }] = useUpdateKycStepMutation();
  const { steps, stepDays, progress, history, next } = data;

  const quick = async (step, kind) => {
    try {
      await update({ id: data.kyc._id, step: step.key, action: kind }).unwrap();
      toast.success(`${step.label}: ${kind === "reset" ? "reset" : "started"}`);
    } catch (e) {
      toast.error(errorText(e, "Could not update the step"));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Section title={`Onboarding — ${progress.done} of ${progress.total} done`} icon={CheckCircle2} className="lg:col-span-2">
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
        <div className="mb-3 flex flex-wrap gap-3 text-[11px]">
          {Object.entries(STEP_STYLE).map(([k, s]) => <span key={k} className="flex items-center gap-1"><span className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot.split(" ")[0]}`} />{s.label}</span>)}
          <span className="flex items-center gap-1 text-red-600"><AlertTriangle className="h-3 w-3" />Late</span>
          <span className="text-muted-foreground">Steps can be started and finished in any order.</span>
        </div>
        <NextStep next={next} className="mb-3 text-xs" />
        <ol className="space-y-2">
          {steps.map((s, i) => {
            const st = STEP_STYLE[s.status];
            const lateDays = s.status === "in_progress" && s.startedAt ? daysSince(s.startedAt) - stepDays[s.key] : 0;
            return (
              <li key={s.key} className={cn("rounded-lg border p-3", st.card, lateDays > 0 && "ring-1 ring-red-300")}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", st.dot)}>
                      {s.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{s.label} <span className="ml-1 text-[11px] font-normal text-muted-foreground">({st.label})</span></p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.startedAt && `Started ${fullDateTime(s.startedAt)}`}
                        {s.doneAt && ` · Done ${fullDateTime(s.doneAt)}`}
                        {s.byName && ` · ${s.byName}`}
                        {!s.startedAt && !s.doneAt && `Usually takes ${stepDays[s.key]} day${stepDays[s.key] === 1 ? "" : "s"}`}
                      </p>
                      {lateDays > 0 && <p className="text-[11px] font-semibold text-red-600"><AlertTriangle className="mr-1 inline h-3 w-3" />{lateDays} day{lateDays === 1 ? "" : "s"} late</p>}
                      {s.note && <p className="mt-0.5 text-xs">“{s.note}”</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    {s.status === "pending" && <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isLoading} onClick={() => quick(s, "start")}><PlayCircle className="mr-1 h-3.5 w-3.5" />Start</Button>}
                    {s.status !== "done" && <Button size="sm" className="h-7 bg-emerald-600 text-xs hover:bg-emerald-700" onClick={() => setAction({ step: s, kind: "done" })}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Mark done</Button>}
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAction({ step: s, kind: "note" })}>Note</Button>
                    {s.status !== "pending" && <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" disabled={isLoading} onClick={() => quick(s, "reset")}><RotateCcw className="mr-1 h-3 w-3" />Reset</Button>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title="Time history" icon={History}>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">Nothing yet.</p> : (
          <ol className="relative space-y-3 border-l pl-4">
            {history.map((h, i) => (
              <li key={i} className="relative text-xs">
                <span className={cn("absolute -left-[21px] mt-1 h-2.5 w-2.5 rounded-full", h.type === "payment" ? "bg-emerald-500" : h.type === "step" ? "bg-blue-500" : h.type === "status" ? "bg-amber-500" : "bg-slate-400")} />
                <p>{h.text}</p>
                <p className="text-[10px] text-muted-foreground">{fullDateTime(h.at)}{h.byName ? ` · ${h.byName}` : ""}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {action && <StepDialog key={`${action.step.key}-${action.kind}`} data={data} action={action} onClose={() => setAction(null)} />}
    </div>
  );
}

function StepDialog({ data, action, onClose }) {
  const [when, setWhen] = useState(nowLocal());
  const [note, setNote] = useState(action.kind === "note" ? action.step.note || "" : "");
  const [update, { isLoading }] = useUpdateKycStepMutation();
  const submit = async () => {
    try {
      await update({ id: data.kyc._id, step: action.step.key, action: action.kind, note: note || undefined, ...(action.kind === "done" ? { at: new Date(when).toISOString() } : {}) }).unwrap();
      toast.success(action.kind === "done" ? `${action.step.label} — done` : "Note saved");
      onClose();
    } catch (e) {
      toast.error(errorText(e, "Could not update the step"));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{action.kind === "done" ? `Mark done: ${action.step.label}` : `Note: ${action.step.label}`}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {action.kind === "done" && <Field label="When was it done?"><Input type="datetime-local" value={when} max={nowLocal()} onChange={(e) => setWhen(e.target.value)} /></Field>}
          <Field label="Note (optional)"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Kit sent by courier, AWB 123…" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isLoading || (action.kind === "note" && !note.trim())}>{isLoading ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

