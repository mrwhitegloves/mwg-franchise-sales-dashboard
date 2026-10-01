// FS09 — Proposals and Payments pages (scope: own / team / all)
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { FileText, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/LeadBits";
import { PageSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";
import { errorText, inr } from "@/lib/format";
import { hasSalesRole } from "@/lib/roles";
import { selectScope } from "@/app/authSlice";
import { usePaymentsQuery, useProposalsQuery } from "@/app/api";
import { ProposalRow } from "./ProposalList";
import { PaymentRow } from "./PaymentList";

function Chips({ items, value, counts, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={cn("rounded-full border px-3 py-1.5 text-sm", value === v ? "border-red-200 bg-red-50 font-semibold text-red-700" : "hover:bg-muted")}>
          {l}{counts?.[v] !== undefined && <span className={cn("ml-1.5 text-xs", v === "approval" || v === "verify" ? "font-bold text-amber-700" : "text-muted-foreground")}>{counts[v]}</span>}
        </button>
      ))}
    </div>
  );
}

function Pager({ pagination, page, onPage }) {
  if (!pagination || (!pagination.hasNext && page <= 1)) return null;
  return (
    <div className="flex justify-center gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}

export function ProposalsPage() {
  const [params, setParams] = useSearchParams();
  const isManager = hasSalesRole(useSelector(selectScope), "MANAGER");
  const status = params.get("status") || "open";
  const page = Number(params.get("page") || 1);
  const { data, isLoading, error } = useProposalsQuery({ status, page });
  const chips = [["open", "Open"], ["sent", "Sent / negotiating"], ...(isManager ? [["approval", "Waiting for approval"]] : []), ["won", "Accepted"], ["closed", "Closed"], ["all", "All"]];
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><FileText className="h-5 w-5 text-primary" />Proposals</h1>
      <Chips items={chips} value={status} counts={data?.counts} onChange={(v) => setParams({ status: v }, { replace: true })} />
      {isLoading ? <PageSkeleton /> : error ? <p className="text-sm text-red-600">{errorText(error)}</p> : !data.items.length ? (
        <EmptyState icon={FileText} title="No proposals here" text="Create a proposal from a lead (Proposals tab) — the PDF goes out from the MWG WhatsApp number." />
      ) : <Card><CardContent className="divide-y p-0">{data.items.map((p) => <ProposalRow key={p.id} p={p} />)}</CardContent></Card>}
      <Pager pagination={data?.pagination} page={page} onPage={(n) => setParams({ status, page: String(n) }, { replace: true })} />
    </div>
  );
}

export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const isManager = hasSalesRole(useSelector(selectScope), "MANAGER");
  const status = params.get("status") || "open";
  const page = Number(params.get("page") || 1);
  const { data, isLoading, error } = usePaymentsQuery({ status, page });
  const chips = [["open", "Open"], ["verify", isManager ? "To verify" : "Waiting for verification"], ["verified", "Verified"], ["all", "All"]];
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold"><IndianRupee className="h-5 w-5 text-primary" />Payments</h1>
        {data?.totals && <span className="text-sm text-muted-foreground">Verified {inr(data.totals.verified || 0)} · pending {inr(data.totals.pending || 0)}</span>}
      </div>
      <Chips items={chips} value={status} counts={data?.counts} onChange={(v) => setParams({ status: v }, { replace: true })} />
      {isLoading ? <PageSkeleton /> : error ? <p className="text-sm text-red-600">{errorText(error)}</p> : !data.items.length ? (
        <EmptyState icon={IndianRupee} title="No payments here" text="Request a payment from a lead (Payments tab): a Razorpay link sent on WhatsApp, or UPI / bank with a proof. A manager verifies it." />
      ) : <Card><CardContent className="divide-y p-0">{data.items.map((p) => <PaymentRow key={p.id} p={p} />)}</CardContent></Card>}
      <Pager pagination={data?.pagination} page={page} onPage={(n) => setParams({ status, page: String(n) }, { replace: true })} />
    </div>
  );
}
