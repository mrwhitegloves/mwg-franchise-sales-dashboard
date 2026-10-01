// FS11 helpers (period in IST dates, number formats)
import { useState } from "react";

const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const istIso = (day, end = false) => new Date(`${day}T00:00:00+05:30`).getTime() + (end ? 864e5 : 0);

export function usePeriod() {
  const [range, setRange] = useState(() => { const n = new Date(); return { from: ymd(new Date(n.getFullYear(), n.getMonth(), 1)), to: ymd(n) }; });
  const params = { from: new Date(istIso(range.from)).toISOString(), to: new Date(istIso(range.to, true)).toISOString() };
  return { range, setRange, params };
}


/** [label, { from, to }] quick ranges (computed once per picker) */
export function presetRanges() {
  const n = new Date();
  const t = ymd(n);
  return [
    ["Today", { from: t, to: t }],
    ["7 days", { from: ymd(new Date(n.getTime() - 6 * 864e5)), to: t }],
    ["This month", { from: ymd(new Date(n.getFullYear(), n.getMonth(), 1)), to: t }],
    ["Last month", { from: ymd(new Date(n.getFullYear(), n.getMonth() - 1, 1)), to: ymd(new Date(n.getFullYear(), n.getMonth(), 0)) }],
  ];
}

export const fmtMinutes = (m) => (m === null || m === undefined ? "—" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);
export const pctText = (v) => (v === null || v === undefined ? "—" : `${v}%`);
