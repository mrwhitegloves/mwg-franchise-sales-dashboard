// Partner KYC Verification — shared labels, formatting and small pieces
import { API_BASE } from "@/lib/config";
import { inr } from "@/lib/format";

export const KYC_STATUS = {
  not_filled: { label: "Not filled", color: "border-slate-300 bg-slate-100 text-slate-700" },
  pending: { label: "Submitted", color: "border-amber-300 bg-amber-100 text-amber-800" },
  action_required: { label: "Action required", color: "border-orange-300 bg-orange-100 text-orange-800" },
  approved: { label: "Approved", color: "border-emerald-300 bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejected", color: "border-red-300 bg-red-100 text-red-800" },
};

export const STATUS_FILTERS = [
  ["all", "All statuses"],
  ["not_filled", "Not filled"],
  ["pending", "Submitted (to review)"],
  ["action_required", "Action required"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
];

export const STEP_STYLE = {
  done: { card: "border-emerald-300 bg-emerald-50", dot: "bg-emerald-500 text-white", chip: "border-emerald-300 bg-emerald-50 text-emerald-800", label: "Done" },
  in_progress: { card: "border-blue-300 bg-blue-50", dot: "bg-blue-500 text-white", chip: "border-blue-300 bg-blue-50 text-blue-800", label: "In progress" },
  pending: { card: "border-slate-200 bg-card", dot: "bg-slate-200 text-slate-600", chip: "border-slate-200 bg-card text-slate-500", label: "Not started" },
};

export const rupee = (n) => (n == null ? "—" : inr(n));

const IST = "Asia/Kolkata";
export const fullDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

// <input type="datetime-local"> values
export const toLocalInput = (v) => {
  const d = v ? new Date(v) : new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
export const nowLocal = () => toLocalInput();

export const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 864e5) : 0);

// Document links: Cloudinary URLs are full; older uploads are paths on the API server
export const fileUrl = (path) => (!path ? "" : /^https?:/.test(path) ? path : `${API_BASE.replace(/\/api$/, "")}${path}`);
export const isPdf = (url) => /\.pdf($|\?)/i.test(url || "");

// "When" filter → { from, to } ISO strings
// Date presets: the same list as the admin dashboard Partner KYC screen
export { DATE_PRESETS, rangeOf } from "@/lib/dateRanges";

export const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm";
