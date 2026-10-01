// FS11 shared bits: period picker (IST dates), CSV download (admins), small number cards
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SALES_API } from "@/lib/config";
import { store } from "@/app/store";
import { presetRanges } from "./reportUtils";

export function PeriodPicker({ range, setRange }) {
  const [presets] = useState(presetRanges);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-1">
        {presets.map(([l, v]) => { const on = v.from === range.from && v.to === range.to; return <button key={l} type="button" onClick={() => setRange(v)} className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-red-200 bg-red-50 font-semibold text-red-700" : "hover:bg-muted")}>{l}</button>; })}
      </div>
      <div><Label className="text-[11px]">From</Label><Input type="date" className="h-8 w-36" value={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} /></div>
      <div><Label className="text-[11px]">Until</Label><Input type="date" className="h-8 w-36" value={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} /></div>
    </div>
  );
}

export function CsvButton({ path, params, label = "CSV" }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${SALES_API}${path}?${new URLSearchParams(params)}`, { headers: { authorization: `Bearer ${store.getState().auth.token}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Export failed");
      const blob = await res.blob();
      const name = (res.headers.get("content-disposition") || "").match(/filename="([^"]+)"/)?.[1] || "franchise.csv";
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return <Button variant="outline" size="sm" onClick={download} disabled={busy}>{busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}{label}</Button>;
}

export function Stat({ label, value, hint, tone, onClick }) {
  return (
    <Card className={cn(onClick && "cursor-pointer transition-colors hover:bg-muted/40")} onClick={onClick}>
      <CardContent className="p-3.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-2xl font-bold tabular-nums", tone)}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

