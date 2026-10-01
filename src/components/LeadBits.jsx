// Small shared pieces for lead screens
import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BAND, PRIORITY, stageClass } from "@/lib/stages";
import { cn } from "@/lib/utils";

export function StageBadge({ stage, label, status, lostReason }) {
  if (status === "lost") return <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Lost{lostReason ? ` · ${lostReason.replace(/_/g, " ").toLowerCase()}` : ""}</span>;
  if (status === "won" && !["onboarding", "activated", "kyc_pending", "kyc_completed"].includes(stage)) return <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Won · {label}</span>;
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium", stageClass(stage))}>{label || stage || "—"}</span>;
}

export function ScoreBadge({ score, band, hot }) {
  const b = BAND[band];
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-flex min-w-[2rem] justify-center rounded px-1.5 py-0.5 text-xs font-semibold", b?.className || "bg-slate-100 text-slate-600")} title={b?.label}>{score ?? "—"}</span>
      {hot && <Flame className="h-3.5 w-3.5 text-orange-500" />}
    </span>
  );
}

// FS12 next best action chip; the reasons show on hover
const ACTION_TONE = { CALL_NOW: "bg-red-50 text-red-700 border-red-200", REPLY: "bg-emerald-50 text-emerald-700 border-emerald-200", DO_FOLLOWUP: "bg-amber-50 text-amber-800 border-amber-200", FIRST_CALL: "bg-orange-50 text-orange-700 border-orange-200", CHECK_PAYMENT: "bg-violet-50 text-violet-700 border-violet-200" };
export function NextAction({ p }) {
  if (!p?.action) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span title={[p.action.why, ...(p.reasons || [])].filter(Boolean).join(" · ")} className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium", ACTION_TONE[p.action.code] || "bg-slate-50 text-slate-700 border-slate-200")}>
      {p.action.label}{p.score !== null && p.score !== undefined && <span className="ml-1 tabular-nums opacity-60">{p.score}</span>}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  if (!priority) return null;
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", PRIORITY[priority])}>{priority}</span>;
}

export function KpiCard({ title, value, icon: Icon, tone = "slate", hint, onClick }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700", indigo: "bg-indigo-100 text-indigo-700", orange: "bg-orange-100 text-orange-700",
    red: "bg-red-100 text-red-700", violet: "bg-violet-100 text-violet-700", amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700", sky: "bg-sky-100 text-sky-700",
  };
  return (
    <Card className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-md")} onClick={onClick}>
      <CardContent className="flex items-start justify-between p-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        {Icon && <div className={cn("rounded-lg p-2", tones[tone])}><Icon className="h-4 w-4" /></div>}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 h-8 w-8 text-muted-foreground" />}
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
