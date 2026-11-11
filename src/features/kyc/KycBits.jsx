// Partner KYC Verification — small shared components
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { KYC_STATUS } from "./kycUtils";

export function StatusBadge({ status, prefix = "", className }) {
  const s = KYC_STATUS[status] || { label: status || "—", color: "bg-slate-100 text-slate-700" };
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold", s.color, className)}>{prefix}{s.label}</span>;
}

// "What to do next": small red text when it is late
export function NextStep({ next, className }) {
  if (!next?.text) return null;
  return (
    <p className={cn("text-[11px] leading-snug", next.late ? "font-semibold text-red-600" : "text-muted-foreground", className)}>
      {next.late && <AlertTriangle className="mr-1 inline h-3 w-3 -translate-y-px" />}
      {next.text}
    </p>
  );
}

export function Progress({ progress }) {
  if (!progress) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-500" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{progress.done}/{progress.total}</span>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Section({ title, icon: Icon, action, children, className }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">{Icon && <Icon className="h-4 w-4 text-muted-foreground" />}{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
