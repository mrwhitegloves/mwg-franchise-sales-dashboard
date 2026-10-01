import { formatDistanceToNowStrict } from "date-fns";

const IST = "Asia/Kolkata";

export const inr = (n) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? "—"
    : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n));

// ₹1,85,000 → ₹1.85 L, ₹2,86,55,000 → ₹2.87 Cr (for tiles)
export const inrShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
  return inr(v);
};

export const dateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";

export const dateOnly = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" }) : "—";

export const ago = (d) => (d ? formatDistanceToNowStrict(new Date(d), { addSuffix: true }) : "—");

// 919876543210 → +91 98765 43210
export const prettyPhone = (p) => {
  const s = String(p || "");
  if (/^91\d{10}$/.test(s)) return `+91 ${s.slice(2, 7)} ${s.slice(7)}`;
  return s ? `+${s}` : "—";
};

export const telLink = (p) => (p ? `tel:+${String(p).replace(/\D/g, "")}` : undefined);

export const errorText = (err, fallback = "Something went wrong") =>
  err?.data?.error || err?.data?.message || err?.error || (typeof err === "string" ? err : fallback);
