// Partner KYC Verification (owner request 2026-11-11) — the admin dashboard's
// "Franchise & Partner KYC Verifications" list inside the Sales App.
// Executive: KYCs of their own leads · Manager / Admin: every KYC (backend enforces it).
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Eye, Handshake, Hourglass, IndianRupee, RefreshCw, Search, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/LeadBits";
import { PageSkeleton } from "@/components/PageSkeleton";
import { errorText } from "@/lib/format";
import { useKycListQuery } from "@/app/api";
import { DATE_PRESETS, STATUS_FILTERS, fullDateTime, rangeOf, rupee } from "./kycUtils";
import { NextStep, Progress, StatusBadge } from "./KycBits";

const LIMIT = 15;

export default function KycListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [when, setWhen] = useState("any");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [owner, setOwner] = useState("all");   // salesperson (Manager / Admin only)
  const range = useMemo(() => rangeOf(when, custom), [when, custom]);
  const { data, isLoading, isFetching, error, refetch } = useKycListQuery({
    page, limit: LIMIT, status, ...(search.trim() ? { search: search.trim() } : {}),
    ...(owner !== "all" ? { owner } : {}),
    ...(range.from ? { from: range.from.toISOString() } : {}),
    ...(range.to ? { to: range.to.toISOString() } : {}),
  });

  const items = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };
  const counts = data?.counts || {};
  const summary = data?.summary || { totalDeal: 0, paid: 0, remaining: 0, deals: 0 };
  const own = data?.scope === "own";
  const salespeople = data?.salespeople || [];
  const unassignedCount = data?.unassignedCount || 0;
  // Date filter = payment date (2026-11-12): the cards count only payments made in the period
  const dated = !!summary.dated;
  const reset = () => setPage(1);
  const open = (k) => navigate(`/kyc/${k._id}`);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="h-5 w-5 text-primary" />Partner KYC Verification</h1>
          <p className="text-xs text-muted-foreground">
            {own ? "KYC, payments and onboarding of your franchise leads." : "Every franchise deal: KYC, payments and onboarding — in one place."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Money summary (follows the filters) */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total franchise deals", value: rupee(summary.totalDeal), sub: dated ? `${summary.deals || 0} partner${summary.deals === 1 ? "" : "s"} who paid in this period (incl. GST)` : `${summary.deals || 0} KYC record${summary.deals === 1 ? "" : "s"} (incl. GST)`, icon: Handshake, color: "text-foreground", bg: "bg-card" },
          { label: dated ? "Amount paid (in this period)" : "Amount paid", value: rupee(summary.paid), sub: `${dated ? "Payments made in the selected dates" : "Received and verified"}${summary.awaiting ? ` · + ${rupee(summary.awaiting)} waiting for verification` : ""}`, icon: Wallet, color: "text-emerald-700", bg: "bg-emerald-50/60" },
          { label: "Remaining (pending)", value: rupee(summary.remaining), sub: dated ? "Still to collect from these partners (as of today)" : "Still to be collected", icon: Hourglass, color: "text-red-600", bg: "bg-red-50/60" },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className={`mt-1 text-2xl font-extrabold ${c.color}`}>{c.value}</p>
            <p className="text-[11px] text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          {/* Search + status + date */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search name, city, mobile, FRN code…" value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} className="pl-9" />
            </div>
            <select value={status} onChange={(e) => { setStatus(e.target.value); reset(); }} className="h-9 rounded-md border bg-background px-3 text-sm">
              {STATUS_FILTERS.map(([k, l]) => <option key={k} value={k}>{l}{counts[k] != null ? ` (${counts[k]})` : ""}</option>)}
            </select>
            <select value={when} onChange={(e) => { setWhen(e.target.value); reset(); }} className="h-9 rounded-md border bg-background px-3 text-sm">
              {DATE_PRESETS.map(([k, l]) => <option key={k} value={k}>When: {l}</option>)}
            </select>
            {!own && (
              <select value={owner} onChange={(e) => { setOwner(e.target.value); reset(); }} className="h-9 rounded-md border bg-background px-3 text-sm" title="Salesperson of the partner's lead">
                <option value="all">All salespeople</option>
                {salespeople.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.count})</option>)}
                {unassignedCount > 0 && <option value="none">No salesperson ({unassignedCount})</option>}
                {owner !== "all" && owner !== "none" && !salespeople.some((p) => p.id === owner) && <option value={owner}>Selected salesperson (0)</option>}
              </select>
            )}
            {when === "custom" && (
              <div className="flex items-center gap-2 text-xs">
                <Input type="date" value={custom.from} onChange={(e) => { setCustom((c) => ({ ...c, from: e.target.value })); reset(); }} className="h-9 w-36" />
                <span className="text-muted-foreground">to</span>
                <Input type="date" value={custom.to} onChange={(e) => { setCustom((c) => ({ ...c, to: e.target.value })); reset(); }} className="h-9 w-36" />
              </div>
            )}
            <p className="text-xs text-muted-foreground lg:ml-auto">{pagination.totalCount} record{pagination.totalCount === 1 ? "" : "s"}</p>
          </div>

          {dated && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
              Date filter works on <b>payment dates</b>: only partners with a payment in these dates are listed, and <b>Amount paid</b> counts only the payments made in these dates.
            </p>
          )}

          {isLoading ? <PageSkeleton /> : error ? <p className="text-sm text-red-600">{errorText(error)}</p> : items.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No KYC records found"
              text={status !== "all" || search || when !== "any" ? "Change the status, date or search filters." : "Open a franchise lead → KYC & onboarding → Create KYC link. The KYC shows here right away."}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Client</th>
                      <th className="px-3 py-2">Plan · City</th>
                      <th className="px-3 py-2 text-right">Deal (incl. GST)</th>
                      <th className="px-3 py-2 text-right">{dated ? "Paid in period" : "Paid"}</th>
                      <th className="px-3 py-2 text-right">Remaining</th>
                      <th className="px-3 py-2">KYC status</th>
                      <th className="min-w-[220px] px-3 py-2">Onboarding · next step</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((k) => {
                      const m = k.money || {};
                      return (
                        <tr key={k._id} className="cursor-pointer border-b align-top last:border-0 hover:bg-muted/30" onClick={() => open(k)}>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <p className="text-xs font-bold">{k.partnerName || k.fullName || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{k.leadCode ? <span className="font-mono">{k.leadCode} · </span> : null}{k.mobileNumber || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{k.submittedAt ? `Submitted ${fullDateTime(k.submittedAt)}` : `Link created ${fullDateTime(k.invitedAt || k.createdAt)}`}</p>
                            {!own && k.ownerName && <p className="text-[10px] text-muted-foreground">Salesperson: {k.ownerName}</p>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                            <p className="font-medium">{k.franchisePlan || "—"}</p>
                            <p className="text-muted-foreground">{k.city || k.primaryOperatingCity || "—"}</p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold">{rupee(m.dealAmount)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-emerald-700">
                            {m.periodPaid != null ? <>{rupee(m.periodPaid)}<p className="text-[10px] font-normal text-muted-foreground">of {rupee(m.paid)} total</p></> : rupee(m.paid)}
                          </td>
                          <td className={`whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold ${m.remaining > 0 ? "text-red-600" : "text-muted-foreground"}`}>{rupee(m.remaining)}</td>
                          <td className="px-3 py-2.5"><StatusBadge status={k.kycStatus} /></td>
                          <td className="px-3 py-2.5 text-xs"><div className="mb-1"><Progress progress={k.progress} /></div><NextStep next={k.next} /></td>
                          <td className="px-3 py-2.5 text-right">
                            <Button variant="ghost" size="sm" className="text-blue-600" onClick={(e) => { e.stopPropagation(); open(k); }}><Eye className="mr-1 h-4 w-4" />Open</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phone cards */}
              <ul className="space-y-2 md:hidden">
                {items.map((k) => {
                  const m = k.money || {};
                  return (
                    <li key={k._id}>
                      <button type="button" onClick={() => open(k)} className="w-full rounded-lg border p-3 text-left hover:bg-muted/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{k.partnerName || k.fullName || "—"}</p>
                            <p className="text-[11px] text-muted-foreground">{k.leadCode ? `${k.leadCode} · ` : ""}{k.franchisePlan || "—"} · {k.city || "—"}</p>
                          </div>
                          <StatusBadge status={k.kycStatus} />
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                          <div><p className="text-[10px] text-muted-foreground">Deal</p><p className="font-semibold">{rupee(m.dealAmount)}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">{m.periodPaid != null ? "Paid in period" : "Paid"}</p><p className="font-semibold text-emerald-700">{rupee(m.periodPaid ?? m.paid)}</p></div>
                          <div><p className="text-[10px] text-muted-foreground">Remaining</p><p className={`font-bold ${m.remaining > 0 ? "text-red-600" : ""}`}>{rupee(m.remaining)}</p></div>
                        </div>
                        <div className="mt-2"><Progress progress={k.progress} /></div>
                        <NextStep next={k.next} className="mt-1" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <IndianRupee className="h-3 w-3" /> Paid = payments received and verified. Create a KYC link from a lead → KYC &amp; onboarding.
      </p>
    </div>
  );
}
