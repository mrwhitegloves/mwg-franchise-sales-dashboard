// FS09 helpers — proposal / payment status labels and the proposal price (same rule as the backend)
export const PROPOSAL_STATUS = {
  DRAFT: { label: "Draft", tone: "bg-slate-100 text-slate-700" },
  PENDING_APPROVAL: { label: "Waiting for approval", tone: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approved — ready to send", tone: "bg-sky-100 text-sky-800" },
  REJECTED_DISCOUNT: { label: "Discount rejected", tone: "bg-red-100 text-red-700" },
  SENT: { label: "Sent", tone: "bg-indigo-100 text-indigo-800" },
  NEGOTIATION: { label: "Negotiation", tone: "bg-orange-100 text-orange-800" },
  ACCEPTED: { label: "Accepted", tone: "bg-emerald-100 text-emerald-800" },
  DECLINED: { label: "Declined", tone: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", tone: "bg-slate-100 text-slate-500" },
};

export const PAYMENT_STATUS = {
  REQUESTED: { label: "Requested", tone: "bg-slate-100 text-slate-700" },
  LINK_SENT: { label: "Link sent", tone: "bg-sky-100 text-sky-800" },
  PAID_ONLINE: { label: "Paid online — verify", tone: "bg-amber-100 text-amber-800" },
  PROOF_SUBMITTED: { label: "Proof added — verify", tone: "bg-amber-100 text-amber-800" },
  VERIFIED: { label: "Verified", tone: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rejected", tone: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", tone: "bg-slate-100 text-slate-500" },
};

export const METHODS = [
  { value: "RAZORPAY_LINK", label: "Razorpay link (card / UPI / netbanking)" },
  { value: "UPI", label: "UPI (manual)" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
];
export const PURPOSES = [
  { value: "BOOKING_AMOUNT", label: "Booking amount" },
  { value: "FULL_PAYMENT", label: "Full payment" },
  { value: "INSTALMENT", label: "Instalment" },
];
export const methodLabel = (m) => METHODS.find((x) => x.value === m)?.label.split(" (")[0] || m;

/** Same rounding as backend franchiseProposals.priceProposal */
export function priceProposal({ price = 0, kind = "NONE", value = 0, gstPercent = 18 }) {
  const base = Math.round(Number(price) || 0);
  const v = Math.max(0, Number(value) || 0);
  let amount = kind === "AMOUNT" ? Math.round(v) : kind === "PERCENT" ? Math.round((base * v) / 100) : 0;
  amount = Math.min(amount, base);
  const subtotal = base - amount;
  const gst = Math.round((subtotal * gstPercent) / 100);
  return { amount, percent: base ? Math.round((amount / base) * 10000) / 100 : 0, subtotal, gst, total: subtotal + gst };
}
