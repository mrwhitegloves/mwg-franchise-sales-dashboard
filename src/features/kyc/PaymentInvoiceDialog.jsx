// Franchise invoice of one Partner KYC payment — Sales App copy of the admin dashboard's
// pages/partnerKYC/PaymentInvoiceDialog.jsx (owner request 2026-11-18; same server invoice).
// Opens the invoice already sent for the payment (and when / where it went) or, the first
// time, the invoice made from the payment. Everything can be edited, then sent to the
// partner's WhatsApp number — the server makes the PDF (same design) and sends it.
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Download, ExternalLink, FileText, Loader2, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useKycPaymentInvoiceQuery, useSaveKycPaymentInvoiceMutation, useSendKycPaymentInvoiceMutation } from "@/app/api";
import InvoiceDocument from "./invoice/InvoiceDocument";
import { computeInvoice, money } from "./invoice/invoiceMath";
import { fullDateTime as dateTime } from "./kycUtils";

const SCALE = 0.62;        // preview beside the form (large screens)
const SMALL_SCALE = 0.4;   // preview under the form (phones)
const toDateInput = (d) => {
  const t = d ? new Date(d) : new Date();
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
  return t.toISOString().slice(0, 10);
};
const VIA = { WHATSAPP_DOCUMENT: "WhatsApp document (chat open)", WHATSAPP_TEMPLATE: "WhatsApp invoice template" };

export default function PaymentInvoiceDialog({ kycId, payment, onClose }) {
  const { data, isLoading, error } = useKycPaymentInvoiceQuery({ id: kycId, paymentId: payment.id });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94vh] w-[96vw] max-w-6xl overflow-y-auto p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-4 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Franchise invoice — {payment.number} · ₹{money(payment.amount)}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error?.data?.error || "Could not load the invoice"}</p>
        ) : (
          <Editor key={data.invoice?.id || "draft"} kycId={kycId} payment={payment} data={data} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Editor({ kycId, payment, data, onClose }) {
  const start = data.invoice;
  const [form, setForm] = useState({
    name: start.name || "",
    address: start.address || "",
    date: toDateInput(start.date),
    items: (start.items || []).map((it) => ({ description: it.description, qty: it.qty, priceMode: it.priceMode || "incl", enteredPrice: it.enteredPrice })),
    gstRate: start.gstRate ?? 18,
    paymentStatus: start.paymentStatus || "PAID",
    stampText: start.stampText || start.paymentStatus || "PAID",
    franchise: { totalDeal: start.franchise?.totalDeal ?? 0, paidTillNow: start.franchise?.paidTillNow ?? 0, remaining: start.franchise?.remaining ?? 0 },
  });
  const [send, { isLoading: sending }] = useSendKycPaymentInvoiceMutation();
  const [save, { isLoading: saving }] = useSaveKycPaymentInvoiceMutation();
  const [savedNo, setSavedNo] = useState(data.invoice?.invoiceNo || null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setItem = (patch) => setForm((f) => ({ ...f, items: [{ ...f.items[0], ...patch }, ...f.items.slice(1)] }));
  const setFr = (k, v) => setForm((f) => ({ ...f, franchise: { ...f.franchise, [k]: v } }));
  const calc = computeInvoice(form.items, form.gstRate);
  const item = form.items[0] || {};
  const sent = data.invoice?.send;
  const preview = { ...form, invoiceNo: savedNo || data.nextInvoiceNo || "MWG—", franchise: { totalDeal: Number(form.franchise.totalDeal) || 0, paidTillNow: Number(form.franchise.paidTillNow) || 0, remaining: Number(form.franchise.remaining) || 0 } };

  const resetToPayment = () => {
    const d = data.draft;
    setForm({
      name: d.name, address: d.address, date: toDateInput(d.date),
      items: d.items.map((it) => ({ ...it })), gstRate: d.gstRate, paymentStatus: d.paymentStatus, stampText: d.stampText,
      franchise: { totalDeal: d.franchise.totalDeal, paidTillNow: d.franchise.paidTillNow, remaining: d.franchise.remaining },
    });
  };

  const invoiceBody = () => ({
    ...form,
    items: form.items.map((it) => ({ ...it, qty: Number(it.qty) || 1, enteredPrice: Number(it.enteredPrice) })),
    franchise: { totalDeal: Number(form.franchise.totalDeal) || 0, paidTillNow: Number(form.franchise.paidTillNow) || 0, remaining: Number(form.franchise.remaining) || 0 },
  });
  const valid = () => {
    if (!form.name.trim()) { toast.error("Enter the partner name"); return false; }
    if (!String(item.description || "").trim() || !(Number(item.enteredPrice) > 0)) { toast.error("The item needs a description and an amount"); return false; }
    return true;
  };

  // Save + PDF on the server, then download it — nothing goes on WhatsApp
  const download = async () => {
    if (!valid()) return;
    try {
      const r = await save({ id: kycId, paymentId: payment.id, invoice: invoiceBody() }).unwrap();
      const no = r.invoice?.invoiceNo;
      setSavedNo(no);
      const url = r.invoice?.pdf?.url;
      if (!url) throw new Error("No PDF");
      const fileName = `MWG_Franchise_Invoice_${no}.pdf`;
      try {
        const blob = await (await fetch(url)).blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      } catch {
        window.open(url, "_blank", "noopener");
      }
      toast.success(`Invoice ${no} saved — PDF downloaded (not sent on WhatsApp)`);
    } catch (e) {
      toast.error(e?.data?.error || e?.message || "Could not make the PDF");
    }
  };

  const submit = async () => {
    if (!valid()) return;
    const invoice = {
      ...form,
      items: form.items.map((it) => ({ ...it, qty: Number(it.qty) || 1, enteredPrice: Number(it.enteredPrice) })),
      franchise: { totalDeal: Number(form.franchise.totalDeal) || 0, paidTillNow: Number(form.franchise.paidTillNow) || 0, remaining: Number(form.franchise.remaining) || 0 },
    };
    try {
      const r = await send({ id: kycId, paymentId: payment.id, invoice }).unwrap();
      if (r.result?.status !== "SENT") {
        // 207: the invoice is saved but WhatsApp did not take it
        toast.error(`Invoice ${r.invoice?.invoiceNo || ""} saved but not sent — ${r.result?.error || r.error || "WhatsApp send failed"}`, { duration: 10000 });
        return;
      }
      toast.success(`Invoice ${r.invoice?.invoiceNo} sent on WhatsApp`);
      onClose();
    } catch (e) {
      // 207 = saved but the WhatsApp send failed
      toast.error(e?.data?.error || "Could not send the invoice", { duration: 9000 });
    }
  };

  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto]">
      {/* Form */}
      <div className="space-y-4">
        {sent && (
          <div className={`rounded-lg border p-3 text-sm ${sent.status === "SENT" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
            <p className="flex items-center gap-1.5 font-bold">
              {sent.status === "SENT" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {sent.status === "SENT" ? `Invoice ${data.invoice.invoiceNo} sent` : `Invoice ${data.invoice.invoiceNo} not sent`}
            </p>
            <p className="mt-0.5 text-xs">
              {dateTime(sent.at)} · {sent.phone ? `+${sent.phone}` : "no number"}{sent.via ? ` · ${VIA[sent.via] || sent.via}` : ""}{sent.byName ? ` · by ${sent.byName}` : ""}
            </p>
            {sent.error && <p className="mt-1 text-xs">{sent.error}</p>}
            {data.invoice.pdf?.url && (
              <a href={data.invoice.pdf.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold underline">
                Open the PDF that was {sent.status === "SENT" ? "sent" : "made"} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
        {data.stale && (
          <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />The payment amount changed after this invoice was made.
            <button type="button" className="font-bold underline" onClick={resetToPayment}>Use the payment's figures</button>
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bill to — partner name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Invoice date"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
        </div>
        <Field label="Address (one line per row)">
          <textarea rows={3} value={form.address} onChange={(e) => set("address", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </Field>

        <div className="space-y-2 rounded-lg border p-3">
          <Field label="Item"><Input value={item.description || ""} onChange={(e) => setItem({ description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1 text-xs font-semibold">
            {[["incl", `Amount with ${form.gstRate || 0}% GST`], ["excl", "Amount without GST"]].map(([m, l]) => (
              <button key={m} type="button" onClick={() => setItem({ priceMode: m })} className={`rounded px-2 py-1.5 ${item.priceMode === m ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}>{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Qty"><Input type="number" min="1" value={item.qty} onChange={(e) => setItem({ qty: e.target.value })} className="text-center" /></Field>
            <Field label="Amount (₹)"><Input type="number" min="0" step="0.01" value={item.enteredPrice} onChange={(e) => setItem({ enteredPrice: e.target.value })} className="text-right" /></Field>
            <Field label="GST %"><Input type="number" min="0" value={form.gstRate} onChange={(e) => set("gstRate", e.target.value === "" ? "" : Number(e.target.value))} className="text-right" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-2 text-center text-xs">
            <div><p className="text-slate-500">Actual price</p><p className="font-bold">₹{money(calc.subtotal)}</p></div>
            <div><p className="text-slate-500">GST</p><p className="font-bold text-amber-700">₹{money(calc.gstAmount)}</p></div>
            <div><p className="text-slate-500">Total</p><p className="font-bold text-emerald-700">₹{money(calc.grandTotal)}</p></div>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-semibold text-slate-600">Franchise summary (printed on the invoice)</p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Total franchise (₹)"><Input type="number" value={form.franchise.totalDeal} onChange={(e) => setFr("totalDeal", e.target.value)} /></Field>
            <Field label="Paid till now (₹)"><Input type="number" value={form.franchise.paidTillNow} onChange={(e) => setFr("paidTillNow", e.target.value)} /></Field>
            <Field label="Remaining (₹)"><Input type="number" value={form.franchise.remaining} onChange={(e) => setFr("remaining", e.target.value)} /></Field>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-600">Stamp</p>
          <div className="grid grid-cols-2 gap-2">
            {[["PAID", "border-emerald-500 bg-emerald-50 text-emerald-700"], ["UNPAID", "border-amber-500 bg-amber-50 text-amber-700"]].map(([s, on]) => (
              <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, paymentStatus: s, stampText: s }))}
                className={`flex items-center justify-center gap-1.5 rounded-md border-2 py-1.5 text-sm font-bold ${form.paymentStatus === s ? on : "border-slate-200 bg-white text-slate-500"}`}>
                {s === "PAID" ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}{s === "PAID" ? "Paid" : "Unpaid"}
              </button>
            ))}
          </div>
          <Field label="Word in stamp"><Input maxLength={12} value={form.stampText} onChange={(e) => set("stampText", e.target.value)} className="bg-white font-bold uppercase" /></Field>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          Goes to the partner's WhatsApp number from the KYC form: <b>{data.phone ? `+${data.phone}` : "no number in the KYC"}</b>.
          If they have not written in the last 24 hours, WhatsApp sends it with the approved template <span className="font-mono">{data.template}</span>.
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={download} disabled={saving || sending} className="gap-2" title="Save the invoice and download the PDF without sending it">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download PDF
          </Button>
          <Button onClick={submit} disabled={sending || !data.phone} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sent?.status === "SENT" ? "Send again on WhatsApp" : "Send on WhatsApp"}
          </Button>
        </div>
        {(data.invoice.sendLog || []).length > 1 && (
          <div className="text-xs text-muted-foreground">
            <p className="mb-1 font-semibold">All sends</p>
            {data.invoice.sendLog.slice().reverse().map((l, i) => (
              <p key={i}>{dateTime(l.at)} · {l.status === "SENT" ? "sent" : `failed — ${l.error || ""}`}{l.byName ? ` · ${l.byName}` : ""}{l.pdfUrl ? <> · <a className="underline" href={l.pdfUrl} target="_blank" rel="noreferrer">PDF</a></> : null}</p>
            ))}
          </div>
        )}
      </div>

      {/* Live preview (A4, scaled) — under the form on phones */}
      <div className="lg:hidden">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</p>
        <div className="mx-auto overflow-hidden rounded-lg border shadow-md" style={{ width: 794 * SMALL_SCALE, height: 1123 * SMALL_SCALE }}>
          <div style={{ transform: `scale(${SMALL_SCALE})`, transformOrigin: "top left" }}>
            <InvoiceDocument invoice={preview} />
          </div>
        </div>
      </div>
      {/* Live preview (A4, scaled) */}
      <div className="hidden lg:block">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</p>
        <div className="overflow-hidden rounded-lg border shadow-md" style={{ width: 794 * SCALE, height: 1123 * SCALE }}>
          <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
            <InvoiceDocument invoice={preview} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
