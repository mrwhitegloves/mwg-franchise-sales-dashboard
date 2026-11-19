// "Without GST" and "GST" parts of an amount, side by side (2026-11-19)
import { inr2, splitGst } from "@/lib/gst";

export default function GstSplit({ amount, rate = 18, subtotal, grandTotal, className = "", compact = false, align = "start" }) {
  if (amount == null || !(Number(amount) > 0)) return null;
  const { base, gst } = splitGst(amount, { rate, subtotal, grandTotal });
  const just = align === "end" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  if (compact) {
    return (
      <span className={`flex flex-wrap ${just} gap-x-1.5 text-[10px] font-normal leading-tight ${className}`} title={`${inr2(base)} without GST + ${inr2(gst)} GST`}>
        <span className="text-slate-600">{inr2(base)}</span>
        <span className="text-slate-400">+</span>
        <span className="text-amber-700">{inr2(gst)} GST</span>
      </span>
    );
  }
  return (
    <div className={`mt-1.5 flex flex-wrap ${just} gap-1.5 text-[11px] font-medium ${className}`}>
      <span className="rounded-md border border-slate-200 bg-white/80 px-1.5 py-0.5 text-slate-700">Without GST <b>{inr2(base)}</b></span>
      <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-800">GST <b>{inr2(gst)}</b></span>
    </div>
  );
}
