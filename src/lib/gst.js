// Amount incl. GST → the part without GST + the GST part (2026-11-19).
// Franchise amounts are incl. 18% GST. An invoice can pass its own subtotal / grand total
// so the paid part is split in the invoice's own ratio.
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function splitGst(amount, { rate = 18, subtotal, grandTotal } = {}) {
  const total = r2(amount);
  const ratio = Number(grandTotal) > 0 && subtotal != null ? Number(subtotal) / Number(grandTotal) : 1 / (1 + rate / 100);
  const base = r2(total * ratio);
  return { total, base, gst: r2(total - base) };
}

export const inr2 = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
