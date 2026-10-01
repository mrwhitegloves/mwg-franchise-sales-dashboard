// §46 Unassigned lead queue — managers / admins assign one or many leads
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Inbox, Search, Loader2, Flame } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ScoreBadge } from "@/components/LeadBits";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useBulkAssignMutation, useUnassignedQuery } from "@/app/api";
import { selectTeam, selectUser } from "@/app/authSlice";
import { dateOnly, errorText, inrShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function UnassignedPage() {
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState(new Set());
  const [to, setTo] = useState("");
  const team = useSelector(selectTeam);
  const me = useSelector(selectUser);
  const navigate = useNavigate();
  const { data, isLoading, isFetching } = useUnassignedQuery({ page, limit: 50, ...(q.trim() ? { search: q.trim() } : {}), ...(reason ? { reason } : {}) });
  const [bulk, { isLoading: assigning }] = useBulkAssignMutation();
  const execs = team.filter((m) => m.isActive !== false && m.salesRole === "FRANCHISE_SALES_EXECUTIVE");

  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const leads = data?.leads || [];
  const allPicked = leads.length > 0 && leads.every((l) => picked.has(l.leadId));

  const assign = async () => {
    try {
      const body = { leadIds: [...picked], reason: "Assigned from the unassigned queue", ...(to && to !== "auto" ? { userId: to === "me" ? me._id : to } : {}) };
      const r = await bulk(body).unwrap();
      toast.success(`${r.assigned} assigned${r.failed ? ` · ${r.failed} could not be assigned` : ""}`);
      if (r.failed) toast.warning([...new Set(r.results.filter((x) => !x.ok).map((x) => x.error))].join(" · "));
      setPicked(new Set());
    } catch (e) { toast.error(errorText(e)); }
  };

  if (isLoading) return <PageSkeleton />;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Unassigned leads</h1>
        <p className="text-sm text-muted-foreground">Franchise leads waiting for an owner. Pick leads, choose a person (or the assignment engine) and assign.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => { setReason(""); setPage(1); }} className={cn("rounded-full border px-3 py-1 text-xs", !reason ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>All {data?.total ?? ""}</button>
        {(data?.reasons || []).map((r) => (
          <button key={r.code || "none"} onClick={() => { setReason(r.code || ""); setPage(1); }} title={r.label}
            className={cn("rounded-full border px-3 py-1 text-xs", reason === r.code ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
            {r.label.split(" — ")[0]} <span className="opacity-70">{r.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, FRN code, city, phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select value={to} onValueChange={setTo}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Assign to…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Assignment engine (round robin)</SelectItem>
            <SelectItem value="me">Me</SelectItem>
            {execs.map((m) => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button disabled={!picked.size || !to || assigning} onClick={assign}>
          {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Assign {picked.size || ""}
        </Button>
      </div>

      {!leads.length ? <EmptyState icon={Inbox} title="No unassigned leads" text="Every franchise lead has an owner." /> : (
        <div className={cn("overflow-x-auto rounded-lg border bg-card", isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"><input type="checkbox" className="h-4 w-4 accent-primary" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(leads.map((l) => l.leadId)))} /></TableHead>
                <TableHead>Lead</TableHead><TableHead>Source</TableHead><TableHead>City</TableHead><TableHead>Score</TableHead><TableHead>Value</TableHead><TableHead>Created</TableHead><TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.leadId} className="cursor-pointer" onClick={() => navigate(`/leads/${l.leadId}`)}>
                  <TableCell onClick={(e) => e.stopPropagation()}><input type="checkbox" className="h-4 w-4 accent-primary" checked={picked.has(l.leadId)} onChange={() => toggle(l.leadId)} /></TableCell>
                  <TableCell><p className="font-medium">{l.name || "—"} {l.hot && <Flame className="inline h-3.5 w-3.5 text-orange-500" />}</p><p className="text-xs text-muted-foreground">{l.leadCode} · {l.stage}</p></TableCell>
                  <TableCell className="text-xs">{l.source}</TableCell>
                  <TableCell className="text-xs">{[l.city, l.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell><ScoreBadge score={l.score} band={l.band} hot={l.hot} /></TableCell>
                  <TableCell className="text-xs">{l.opportunityValue ? inrShort(l.opportunityValue) : "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{dateOnly(l.createdAt)}</TableCell>
                  <TableCell className="max-w-[220px] text-xs text-muted-foreground">{l.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {data.page} of {Math.ceil(data.total / data.limit)}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / data.limit)} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
