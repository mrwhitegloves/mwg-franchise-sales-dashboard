// Invoice money + text helpers (owner request 2026-11-17).
// Same maths as backend2/src/services/invoiceMath.js — keep the two in step.
//   priceMode "excl" → price WITHOUT GST (GST added on top)
//   priceMode "incl" → final price WITH GST (actual price + GST worked out from it)
export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function computeInvoice(items = [], gstRate = 18) {
  const rate = Math.max(0, Number(gstRate) || 0) / 100;
  let subtotal = 0;
  let gstAmount = 0;
  const lines = items.map((it) => {
    const qty = Math.max(0, Number(it.qty) || 0);
    const priceMode = it.priceMode === "incl" ? "incl" : "excl";
    const enteredPrice = r2(it.enteredPrice ?? it.unitPrice);
    let total;
    let gst;
    if (priceMode === "incl") {
      const gross = r2(qty * enteredPrice);
      total = r2(gross / (1 + rate));
      gst = r2(gross - total);
    } else {
      total = r2(qty * enteredPrice);
      gst = r2(total * rate);
    }
    subtotal += total;
    gstAmount += gst;
    return { ...it, qty, priceMode, enteredPrice, unitPrice: qty ? r2(total / qty) : 0, total, gst, gross: r2(total + gst) };
  });
  subtotal = r2(subtotal);
  gstAmount = r2(gstAmount);
  return { items: lines, subtotal, gstAmount, grandTotal: r2(subtotal + gstAmount), gstRate: Number(gstRate) || 0 };
}

export const money = (n) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const two = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);
const three = (n) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : "", n % 100 ? two(n % 100) : ""].filter(Boolean).join(" ");

/** Indian numbering in words: 1,23,45,678 → "One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight" */
export function numberInWords(num) {
  let n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return "Zero";
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(`${crore >= 100 ? numberInWords(crore) : two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  return parts.join(" ");
}

/** 470.82 → "Rupees Four Hundred Seventy and Eighty-Two Paise Only" */
export function amountInWords(amount) {
  const total = r2(amount);
  const rupees = Math.floor(total);
  const paise = Math.round((total - rupees) * 100);
  return `Rupees ${numberInWords(rupees)}${paise ? ` and ${two(paise)} Paise` : ""} Only`;
}

/** "2025-07-17" or a Date → "17 Jul 2025" */
export function invoiceDate(d) {
  if (!d) return "";
  const t = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  return Number.isNaN(t.getTime()) ? "" : t.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
