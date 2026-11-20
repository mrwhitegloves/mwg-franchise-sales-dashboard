// Service Zones Z7 (2026-11-20): customer demand by city — a selling point for franchise
// leads ("42 customers in Patna already asked for MWG"). Counts only, no customer details.
// Backend GET /api/franchise-sales/demand (services/demandReport.js).
import { useMemo, useState } from "react";
import { MapPinned, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/PageSkeleton";
import { errorText } from "@/lib/format";
import { useCityDemandQuery } from "@/app/api";

const PLACE = { outside: "No MWG partner yet", zone_gap: "Some areas without a partner", mixed: "Some areas without a partner" };

export default function CityDemandPage() {
  const { data, isLoading, error } = useCityDemandQuery(365);
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data?.groups || []).filter((g) => !n || `${g.city} ${g.state}`.toLowerCase().includes(n));
  }, [data, q]);

  if (isLoading) return <PageSkeleton />;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold"><MapPinned className="h-5 w-5 text-primary" />City demand</h1>
        <p className="text-sm text-muted-foreground">Customers who asked for MWG in the last year where no partner works yet — use it when you pitch a franchise in that city.</p>
      </div>
      {error && <p className="text-sm text-red-600">{errorText(error)}</p>}
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{data.totals.people}</p><p className="text-xs text-muted-foreground">customers waiting</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{data.groups.filter((g) => !g.zone).length}</p><p className="text-xs text-muted-foreground">cities with no MWG partner</p></CardContent></Card>
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city or state" className="pl-9" />
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {rows.map((g) => (
            <div key={g.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{g.city}{g.state ? <span className="font-normal text-muted-foreground">, {g.state}</span> : null}</p>
                <p className="text-xs text-muted-foreground">{PLACE[g.status] || ""}{g.pincodes.length ? ` · ${g.pincodes.length} pincode${g.pincodes.length === 1 ? "" : "s"}` : ""}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold tabular-nums">{g.people}</p>
                <p className="text-[11px] text-muted-foreground">waiting</p>
              </div>
            </div>
          ))}
          {!rows.length && <p className="p-4 text-sm text-muted-foreground">No city found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
