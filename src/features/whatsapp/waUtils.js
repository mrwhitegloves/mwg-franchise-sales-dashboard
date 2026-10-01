// Small helpers for the WhatsApp screens (ported from the admin inbox)
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { FileText, FileSpreadsheet, FileImage, Presentation, File as FileIcon } from "lucide-react";

export function listTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM");
}

export const bubbleTime = (ts) => (ts ? format(new Date(ts), "HH:mm") : "");
export const fullTime = (ts) => (ts ? format(new Date(ts), "dd MMM yyyy, HH:mm") : "—");

export function dayLabel(ts) {
  const d = new Date(ts);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM yyyy");
}

// WhatsApp 24-hour window: free text only within 24 h of the prospect's last message
export function windowInfo(lastInboundAt) {
  if (!lastInboundAt) return { open: false, label: "They have not written yet — template only" };
  const minsLeft = 24 * 60 - differenceInMinutes(new Date(), new Date(lastInboundAt));
  if (minsLeft <= 0) return { open: false, label: "24h window closed — template only" };
  const h = Math.floor(minsLeft / 60);
  const m = minsLeft % 60;
  return { open: true, label: h > 0 ? `${h}h ${m}m left to reply` : `${m}m left to reply` };
}

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter((p) => !/^\+?\d+$/.test(p));
  if (!parts.length) return "#";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700", "bg-violet-100 text-violet-700", "bg-teal-100 text-teal-700",
];
export function avatarColor(id = "") {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const AI_MODE = {
  AI: { label: "AI replying", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  AI_HUMAN: { label: "AI + you", className: "bg-sky-50 text-sky-700 border-sky-200" },
  HUMAN: { label: "You (AI paused)", className: "bg-violet-50 text-violet-700 border-violet-200" },
};

// Text preview of a message (list rows, quotes)
export function previewText(m) {
  if (!m) return "";
  if (m.content && !/^\[(Voice Message|Audio|Sticker)\]$/.test(m.content)) return m.content;
  return { image: "📷 Photo", video: "🎬 Video", audio: "🎤 Audio", document: `📄 ${m.fileName || m.media?.fileName || "Document"}`, sticker: "Sticker", location: "📍 Location", template: "Template" }[m.messageType] || m.content || "Message";
}

// File card look per document type
export function fileKind(mimeType = "", fileName = "") {
  const n = `${mimeType} ${fileName}`.toLowerCase();
  if (/pdf/.test(n)) return { label: "PDF", Icon: FileText, className: "bg-red-100 text-red-700" };
  if (/sheet|excel|\.xlsx?\b|csv/.test(n)) return { label: "Excel", Icon: FileSpreadsheet, className: "bg-emerald-100 text-emerald-700" };
  if (/word|\.docx?\b/.test(n)) return { label: "Word", Icon: FileText, className: "bg-blue-100 text-blue-700" };
  if (/presentation|powerpoint|\.pptx?\b/.test(n)) return { label: "PowerPoint", Icon: Presentation, className: "bg-orange-100 text-orange-700" };
  if (/image/.test(n)) return { label: "Image", Icon: FileImage, className: "bg-violet-100 text-violet-700" };
  return { label: "File", Icon: FileIcon, className: "bg-slate-100 text-slate-700" };
}

export const fileSize = (b) => (!b ? "" : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

