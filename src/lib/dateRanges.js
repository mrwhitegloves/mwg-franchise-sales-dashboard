// Same presets as the admin dashboard (admin_dashboard/src/lib/dateRanges.js) — keep the two in step.
// "When" filter presets (browser time — the team works in IST).
// Quarters / financial year follow the Indian financial year (1 April – 31 March).
export const DATE_PRESETS = [
  ["any", "any time"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["last7", "Last 7 days"],
  ["last30", "Last 30 days"],
  ["last90", "Last 90 days"],
  ["thisWeek", "This week"],
  ["thisMonth", "This month"],
  ["thisQuarter", "This quarter"],
  ["thisFY", "This financial year"],
  ["lastMonth", "Last month"],
  ["lastQuarter", "Last quarter"],
  ["lastFY", "Last financial year"],
  ["custom", "Custom range"],
];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const quarterStart = (d) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
const fyStart = (d) => new Date(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1, 3, 1);

/** { from, to } as Date for a preset (null = no limit). custom = { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } */
export function rangeOf(preset, custom = {}, now = new Date()) {
  const today = startOfDay(now);
  switch (preset) {
    case "today": return { from: today, to: endOfDay(now) };
    case "yesterday": return { from: addDays(today, -1), to: endOfDay(addDays(today, -1)) };
    case "last7": return { from: addDays(today, -6), to: endOfDay(now) };
    case "last30": return { from: addDays(today, -29), to: endOfDay(now) };
    case "last90": return { from: addDays(today, -89), to: endOfDay(now) };
    case "thisWeek": return { from: addDays(today, -((today.getDay() + 6) % 7)), to: endOfDay(now) };   // Monday start
    case "thisMonth": return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case "thisQuarter": return { from: quarterStart(now), to: endOfDay(now) };
    case "thisFY": return { from: fyStart(now), to: endOfDay(now) };
    case "lastMonth": return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case "lastQuarter": {
      const qs = quarterStart(now);
      return { from: new Date(qs.getFullYear(), qs.getMonth() - 3, 1), to: endOfDay(addDays(qs, -1)) };
    }
    case "lastFY": {
      const fs = fyStart(now);
      return { from: new Date(fs.getFullYear() - 1, 3, 1), to: endOfDay(addDays(fs, -1)) };
    }
    case "custom": return {
      from: custom.from ? new Date(`${custom.from}T00:00:00`) : null,
      to: custom.to ? new Date(`${custom.to}T23:59:59.999`) : null,
    };
    default: return { from: null, to: null };
  }
}

/** Local calendar day as "YYYY-MM-DD" (for APIs that take whole days) */
export const ymdOf = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : null);
