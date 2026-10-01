// §8 list — TanStack Table for the column model, server does paging / sorting / filtering.
// Desktop: table · phone: cards.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Phone, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge, ScoreBadge } from "@/components/LeadBits";
import { ago, dateTime, inrShort, prettyPhone, telLink } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LeadsTable({ leads = [], loading, showOwner = false, compact = false, selectable = false, selected, onToggle }) {
  const navigate = useNavigate();
  const columns = useMemo(() => {
    const cols = [
      ...(selectable ? [{
        id: "pick", header: "", cell: ({ row }) => (
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={selected?.has(row.original.leadId) || false}
            onClick={(e) => e.stopPropagation()} onChange={() => onToggle?.(row.original.leadId)} />
        ),
      }] : []),
      {
        id: "lead", header: "Lead", cell: ({ row: { original: l } }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{l.name || "—"}</p>
            <p className="text-xs text-muted-foreground">{l.leadCode} · {l.source || "—"}</p>
          </div>
        ),
      },
      {
        id: "phone", header: "Phone", cell: ({ row: { original: l } }) => (
          <a href={telLink(l.phone)} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 whitespace-nowrap text-sm hover:text-primary">
            <Phone className="h-3 w-3" />{prettyPhone(l.phone)}
          </a>
        ),
      },
      { id: "city", header: "City", cell: ({ row: { original: l } }) => <span className="whitespace-nowrap">{l.city || "—"}</span> },
      { id: "score", header: "Score", cell: ({ row: { original: l } }) => <ScoreBadge score={l.leadScore} band={l.band} hot={l.hot} /> },
      { id: "stage", header: "Status", cell: ({ row: { original: l } }) => <StageBadge stage={l.stage} label={l.stageLabel} status={l.status} lostReason={l.lostReason} /> },
      ...(compact ? [] : [{ id: "contact", header: "Last contact", cell: ({ row: { original: l } }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{l.lastContactAt ? ago(l.lastContactAt) : "—"}</span> }]),
      {
        id: "next", header: "Next follow-up", cell: ({ row: { original: l } }) => (
          <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-xs", l.overdue ? "font-semibold text-red-600" : "text-muted-foreground")}>
            {l.overdue && <AlertCircle className="h-3 w-3" />}{l.nextFollowUpAt ? dateTime(l.nextFollowUpAt) : "—"}
          </span>
        ),
      },
      ...(compact ? [] : [
        { id: "days", header: "Idle", cell: ({ row: { original: l } }) => <span className="text-xs tabular-nums text-muted-foreground">{l.daysSinceActivity ?? "—"}d</span> },
        { id: "value", header: "Value", cell: ({ row: { original: l } }) => <span className="whitespace-nowrap text-xs tabular-nums">{l.opportunityValue ? inrShort(l.opportunityValue) : "—"}</span> },
      ]),
      ...(showOwner ? [{ id: "owner", header: "Owner", cell: ({ row: { original: l } }) => <span className="whitespace-nowrap text-xs">{l.owner?.name || <span className="text-amber-600">Unassigned</span>}</span> }] : []),
    ];
    return cols;
  }, [compact, showOwner, selectable, selected, onToggle]);

  const table = useReactTable({ data: leads, columns, getCoreRowModel: getCoreRowModel(), getRowId: (r) => r.leadId });

  if (loading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>{hg.headers.map((h) => <TableHead key={h.id} className="whitespace-nowrap text-xs">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/leads/${row.original.leadId}`)}>
                {row.getVisibleCells().map((c) => <TableCell key={c.id} className="py-2.5">{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 md:hidden">
        {leads.map((l) => (
          <button key={l.leadId} onClick={() => navigate(`/leads/${l.leadId}`)} className="w-full rounded-lg border bg-card p-3 text-left">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{l.name || "—"}</p>
                <p className="text-xs text-muted-foreground">{l.leadCode} · {l.city || "—"}</p>
              </div>
              <ScoreBadge score={l.leadScore} band={l.band} hot={l.hot} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StageBadge stage={l.stage} label={l.stageLabel} status={l.status} lostReason={l.lostReason} />
              {l.nextFollowUpAt && <span className={cn("text-xs", l.overdue ? "font-semibold text-red-600" : "text-muted-foreground")}>Next: {dateTime(l.nextFollowUpAt)}</span>}
              {showOwner && <span className="text-xs text-muted-foreground">· {l.owner?.name || "Unassigned"}</span>}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
