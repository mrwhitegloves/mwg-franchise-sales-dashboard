// FS09 — lead page tabs: Proposals, Payments, KYC & onboarding (read-only)
import { useState } from "react";
import { CheckCircle2, Circle, CircleDot, FileText, IndianRupee, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/LeadBits";
import { PageSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";
import { dateOnly, dateTime, inr } from "@/lib/format";
import { useLeadOnboardingQuery, useLeadPaymentsQuery, useLeadProposalsQuery } from "@/app/api";
import { ProposalDialog } from "./ProposalDialog";
import { ProposalRow } from "./ProposalList";
import { PaymentRow, RequestPaymentDialog } from "./PaymentList";

export function ProposalsTab({ lead }) {
  const { data, isLoading } = useLeadProposalsQuery(lead.leadId);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Plan prices come from the website; the PDF is sent from the MWG WhatsApp number.</p>
        <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}><FileText className="mr-1 h-4 w-4" />New proposal</Button>
      </div>
      {isLoading ? <PageSkeleton /> : data?.items?.length
        ? <Card><CardContent className="divide-y p-0">{data.items.map((p) => <ProposalRow key={p.id} p={p} showLead={false} />)}</CardContent></Card>
        : <EmptyState icon={FileText} title="No proposal yet" text="Create one when they are ready to see the numbers." />}
      {open && <ProposalDialog open onOpenChange={setOpen} leadId={lead.leadId} leadName={lead.name} suggestedPlan={lead.requirement?.opportunityPlan || undefined} />}
    </div>
  );
}

export function PaymentsTab({ lead }) {
  const { data, isLoading } = useLeadPaymentsQuery(lead.leadId);
  const { data: props } = useLeadProposalsQuery(lead.leadId);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{data?.verifiedTotal ? `Verified so far: ${inr(data.verifiedTotal)}` : "Nothing received yet."}</p>
        <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}><IndianRupee className="mr-1 h-4 w-4" />Request payment</Button>
      </div>
      {isLoading ? <PageSkeleton /> : data?.items?.length
        ? <Card><CardContent className="divide-y p-0">{data.items.map((p) => <PaymentRow key={p.id} p={p} showLead={false} />)}</CardContent></Card>
        : <EmptyState icon={IndianRupee} title="No payment requested" text="Send a Razorpay link on WhatsApp, or record a UPI / bank payment with its proof." />}
      {open && <RequestPaymentDialog open onOpenChange={setOpen} leadId={lead.leadId} proposals={(props?.items || []).filter((p) => !["CANCELLED", "DECLINED", "REJECTED_DISCOUNT"].includes(p.status))} />}
    </div>
  );
}

const STEP_ICON = { done: CheckCircle2, skipped: MinusCircle, in_progress: CircleDot, pending: Circle };

export function OnboardingTab({ lead }) {
  const { data, isLoading } = useLeadOnboardingQuery(lead.leadId);
  if (isLoading) return <PageSkeleton />;
  const onb = data?.onboarding;
  const kyc = data?.kyc;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Onboarding{onb ? ` · ${onb.code}` : ""}</CardTitle></CardHeader>
        <CardContent>
          {!onb ? <p className="text-sm text-muted-foreground">Starts automatically when a manager verifies the payment (or the KYC form is submitted).</p> : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">{onb.progress ? `${onb.progress.done} of ${onb.progress.total} steps` : ""}{onb.status === "completed" ? " · complete" : onb.dueAt ? ` · current step due ${dateTime(onb.dueAt)}${onb.overdue ? " (overdue)" : ""}` : ""}</p>
              <ol className="space-y-2">
                {onb.steps.map((s) => {
                  const Icon = STEP_ICON[s.status] || Circle;
                  return (
                    <li key={s.key} className="flex items-start gap-2 text-sm">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.status === "done" ? "text-emerald-600" : s.status === "in_progress" ? "text-amber-600" : "text-muted-foreground")} />
                      <div className="min-w-0">
                        <p className={cn(s.status === "skipped" && "text-muted-foreground line-through")}>{s.label}</p>
                        {(s.evidence || s.note || s.doneAt) && <p className="text-xs text-muted-foreground">{[s.note || s.evidence, s.doneAt ? dateOnly(s.doneAt) : null].filter(Boolean).join(" · ")}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 text-[11px] text-muted-foreground">The operations team runs onboarding in the admin dashboard — this view is read-only.</p>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">KYC</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {!kyc ? <p className="text-muted-foreground">Not submitted yet.</p> : (
            <>
              <p>Status: <b className="capitalize">{String(kyc.status || "").replace(/_/g, " ")}</b></p>
              {kyc.plan && <p>Plan on the form: {kyc.plan}</p>}
              {kyc.city && <p>City: {kyc.city}</p>}
              <p className="text-xs text-muted-foreground">Submitted {dateOnly(kyc.submittedAt)}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
