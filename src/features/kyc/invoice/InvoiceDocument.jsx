// The printed invoice (owner design 2026-11-17: Mr_White_Gloves_Modern_Invoice.docx).
// One A4 page (794 × 1123 px), used by Create / Edit (live preview + PDF) and the Invoices
// list (preview + download). The stamp prints the invoice's own word: PAID / UNPAID / custom.
import { forwardRef } from "react";
import { amountInWords, computeInvoice, invoiceDate, money } from "./invoiceMath";

const RED = "#D7000F";
const BLACK = "#0B0B0B";
const GREY = "#6B7280";
const LIGHT = "#F2F3F5";
const LINE = "#D9DCE1";
const STAMP_INK = "#1F3F8F";

const COMPANY = {
  legal: "White Gloves Technology Private Limited",
  line: "Jamshedpur, Jharkhand 831013  |  www.mrwhitegloves.com  |  +91 94296 91299",
  gst: "20AADCW1091R1Z3",
  upi: "7004810369@icici",
};

const th = { background: BLACK, color: "#fff", fontSize: 11, fontWeight: 700, padding: "9px 10px", letterSpacing: 0.3 };
const td = { fontSize: 13, padding: "9px 10px", borderBottom: `1px solid ${LINE}`, borderLeft: `1px solid ${LINE}` };

const InvoiceDocument = forwardRef(function InvoiceDocument({ invoice }, ref) {
  const inv = invoice || {};
  const calc = computeInvoice(inv.items || [], inv.gstRate ?? 18);
  const stampWord = String(inv.stampText || inv.paymentStatus || "PAID").trim() || "PAID";
  const unpaid = (inv.paymentStatus || "PAID") === "UNPAID";
  const upiUrl = `upi://pay?pa=${COMPANY.upi}&pn=White%20Gloves%20Technology&am=${calc.grandTotal}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(upiUrl)}`;
  const stampFont = stampWord.length <= 4 ? 17 : stampWord.length <= 6 ? 14 : stampWord.length <= 8 ? 11 : 9;

  return (
    <div
      ref={ref}
      style={{ width: 794, height: 1123, background: "#fff", color: BLACK, fontFamily: "Arial, Helvetica, sans-serif", lineHeight: 1.3, padding: "46px 53px 30px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}
    >
      {/* Header bar */}
      <div style={{ background: BLACK, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <div style={{ background: "#fff", padding: 2, lineHeight: 0 }}>
            <img src="/invoice/mwg-logo.png" alt="Mr. White Gloves" style={{ width: 72, height: 58, objectFit: "contain" }} />
          </div>
          <span style={{ color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: 0.2, marginBottom: 2 }}>MR. WHITE GLOVES</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#fff", fontSize: 32, fontWeight: 700, lineHeight: 1.15 }}>INVOICE</div>
          <div style={{ color: RED, fontSize: 9, fontWeight: 700, marginTop: 11, letterSpacing: 0.3 }}>PREMIUM CAR CARE AT YOUR DOORSTEP</div>
        </div>
      </div>
      <div style={{ height: 3, background: RED, marginTop: 18 }} />

      {/* Company */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{COMPANY.legal}</div>
        <div style={{ fontSize: 10, color: GREY, marginTop: 2 }}>{COMPANY.line}</div>
        <div style={{ fontSize: 10, color: GREY }}>GST Registration No: {COMPANY.gst}</div>
      </div>

      {/* Bill to + invoice details */}
      <div style={{ display: "flex", marginTop: 12, background: LIGHT, border: `1px solid ${LINE}` }}>
        <div style={{ flex: 1, padding: "12px 12px 10px", borderRight: `1px solid ${LINE}` }}>
          <div style={{ color: RED, fontSize: 12, fontWeight: 700 }}>BILL TO</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{inv.name || "Customer name"}</div>
          <div style={{ fontSize: 13, whiteSpace: "pre-line", lineHeight: 1.3 }}>{inv.address || ""}</div>
        </div>
        <div style={{ flex: 1, padding: "14px 12px 10px" }}>
          <div style={{ color: RED, fontSize: 12, fontWeight: 700 }}>INVOICE DETAILS</div>
          <div style={{ fontSize: 13, marginTop: 6 }}><span style={{ color: GREY }}>Invoice No.</span>&nbsp;&nbsp; <b>{inv.invoiceNo || "MWG-xxxxxx"}</b></div>
          <div style={{ fontSize: 13, marginTop: 4 }}><span style={{ color: GREY }}>Invoice Date</span>&nbsp;&nbsp; <b>{invoiceDate(inv.date)}</b></div>
        </div>
      </div>

      {/* Items */}
      <div style={{ color: RED, fontSize: 12, fontWeight: 700, marginTop: 26, marginBottom: 6 }}>SERVICE DETAILS</div>
      <table style={{ width: "100%", borderCollapse: "collapse", borderRight: `1px solid ${LINE}` }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "20%", textAlign: "center" }}>#</th>
            <th style={{ ...th, width: "20%", textAlign: "left" }}>DESCRIPTION</th>
            <th style={{ ...th, width: "20%", textAlign: "center", borderLeft: "1px solid #444" }}>QTY</th>
            <th style={{ ...th, width: "20%", textAlign: "center" }}>UNIT PRICE (₹)</th>
            <th style={{ ...th, width: "20%", textAlign: "center" }}>AMOUNT (₹)</th>
          </tr>
        </thead>
        <tbody>
          {calc.items.map((it, i) => (
            <tr key={i}>
              <td style={{ ...td, textAlign: "center" }}>{i + 1}</td>
              <td style={{ ...td, fontWeight: 700, wordBreak: "break-word" }}>{it.description || ""}</td>
              <td style={{ ...td, textAlign: "center" }}>{it.qty || ""}</td>
              <td style={{ ...td, textAlign: "center" }}>{money(it.unitPrice)}</td>
              <td style={{ ...td, textAlign: "center" }}>{money(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 22, border: `1px solid ${LINE}` }}>
        <tbody>
          <tr style={{ background: LIGHT }}>
            <td style={{ fontSize: 13, padding: "8px 10px", borderRight: `1px solid ${LINE}`, width: "51%" }}>Sub Total</td>
            <td style={{ fontSize: 13, padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {money(calc.subtotal)}</td>
          </tr>
          <tr style={{ background: LIGHT, borderTop: `1px solid ${LINE}` }}>
            <td style={{ fontSize: 13, padding: "8px 10px", borderRight: `1px solid ${LINE}` }}>GST ({calc.gstRate}%)</td>
            <td style={{ fontSize: 13, padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {money(calc.gstAmount)}</td>
          </tr>
          <tr style={{ background: RED, color: "#fff" }}>
            <td style={{ fontSize: 13, padding: "8px 10px", fontWeight: 700 }}>TOTAL AMOUNT</td>
            <td style={{ fontSize: 13, padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {money(calc.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Amount payable */}
      <div style={{ background: BLACK, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 12px", marginTop: 34 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#C9CDD3" }}>{unpaid ? "AMOUNT PAYABLE" : "AMOUNT PAID"}</div>
          <div style={{ fontSize: 11 }}>{amountInWords(calc.grandTotal)}</div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700 }}>₹ {money(calc.grandTotal)}</div>
      </div>

      {/* Franchise invoice (…_For_Franchise.docx): summary of the whole franchise deal */}
      {inv.franchise && (
        <div style={{ display: "flex", marginTop: 34, border: `1px solid ${LINE}`, height: 52 }}>
          {[["Franchise Summary", null, "25.8%"], ["Total Franchise Amount", inv.franchise.totalDeal, "26.5%"], ["Paid Till Now", inv.franchise.paidTillNow, "25.4%"], ["Remaining Amount", inv.franchise.remaining, "22.3%"]].map(([label, value, w], i) => (
            <div key={label} style={{ width: w, borderLeft: i ? `1px solid ${LINE}` : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              {value === null
                ? <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
                : <><span style={{ fontSize: 13 }}>{label}</span><span style={{ fontSize: 13, fontWeight: 700 }}>₹{Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></>}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Thank you for choosing Mr. White Gloves!</div>
        <div style={{ fontSize: 13 }}>We look forward to serving you again.</div>
      </div>

      {/* Payment details + stamp */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 22, padding: "0 6px" }}>
        <div>
          <div style={{ color: RED, fontSize: 12, fontWeight: 700 }}>PAYMENT DETAILS</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>UPI: {COMPANY.upi}</div>
          <div style={{ fontSize: 12, color: "#1D4E89" }}>Scan QR code to pay</div>
          <div style={{ border: "1px solid #999", padding: 2, marginTop: 7, width: 76, height: 76, boxShadow: "1px 1px 2px rgba(0,0,0,0.25)" }}>
            <img src={qrUrl} crossOrigin="anonymous" alt="UPI QR" style={{ width: 72, height: 72, display: "block" }} />
          </div>
        </div>
        <div style={{ textAlign: "center", width: 230, marginRight: 70 }}>
          <div style={{ position: "relative", width: 150, height: 138, margin: "0 auto" }}>
            <img src="/invoice/stamp.png" alt="" style={{ width: 150, height: 138, display: "block" }} />
            <span style={{ position: "absolute", left: "45.7%", top: "42.5%", transform: "translate(-50%, -50%) rotate(-4deg)", color: STAMP_INK, fontSize: stampFont, fontWeight: 800, letterSpacing: 0.5, whiteSpace: "nowrap", textTransform: "uppercase", lineHeight: 1 }}>
              {stampWord}
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>AUTHORISED SIGNATORY</div>
          <div style={{ fontSize: 11, color: GREY }}>{COMPANY.legal}</div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 10, paddingTop: 8, fontSize: 10, color: GREY }}>
        This is a computer-generated invoice. Thank you for your business.
      </div>
    </div>
  );
});

export default InvoiceDocument;
