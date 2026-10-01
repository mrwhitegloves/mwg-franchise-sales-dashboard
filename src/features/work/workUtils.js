// FS08 helpers — task types, call outcomes, date-time inputs (local ↔ ISO)
import { CalendarDays, CreditCard, FileCheck2, FileText, ListTodo, MessageCircle, Phone, Rocket } from "lucide-react";

export const TASK_TYPES = [
  { value: "CALL", label: "Call", Icon: Phone },
  { value: "WHATSAPP", label: "WhatsApp", Icon: MessageCircle },
  { value: "MEETING", label: "Meeting", Icon: CalendarDays },
  { value: "PROPOSAL", label: "Proposal", Icon: FileText },
  { value: "PAYMENT", label: "Payment", Icon: CreditCard },
  { value: "KYC", label: "KYC", Icon: FileCheck2 },
  { value: "ONBOARDING", label: "Onboarding", Icon: Rocket },
  { value: "GENERAL", label: "Follow up", Icon: ListTodo },
];
export const typeMeta = (t) => TASK_TYPES.find((x) => x.value === t) || TASK_TYPES[TASK_TYPES.length - 1];

// Quick outcomes (§31) — calls get the call list, everything else just "done"
export const CALL_OUTCOMES = [
  { value: "CONNECTED", label: "Connected", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "NO_ANSWER", label: "No answer", tone: "bg-amber-50 text-amber-700 border-amber-200", hint: "We plan another call in 2 hours" },
  { value: "BUSY", label: "Busy", tone: "bg-amber-50 text-amber-700 border-amber-200", hint: "We plan another call in 2 hours" },
  { value: "CALL_BACK", label: "Call back later", tone: "bg-sky-50 text-sky-700 border-sky-200", hint: "Pick when to call back" },
  { value: "NOT_REACHABLE", label: "Not reachable", tone: "bg-slate-50 text-slate-700 border-slate-200", hint: "We plan another call in 2 hours" },
  { value: "WRONG_NUMBER", label: "Wrong number", tone: "bg-red-50 text-red-700 border-red-200" },
  { value: "NOT_INTERESTED", label: "Not interested", tone: "bg-red-50 text-red-700 border-red-200", hint: "Close the lead from Stage if they are really out" },
];
export const OUTCOME_LABEL = Object.fromEntries([...CALL_OUTCOMES.map((o) => [o.value, o.label]), ["DONE", "Done"]]);

// <input type="datetime-local"> works in local time without a zone
const pad = (n) => String(n).padStart(2, "0");
export function toLocalInput(d) {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}
export const fromLocalInput = (s) => (s ? new Date(s).toISOString() : null);

/** Quick picks for a follow-up time */
export function quickTimes(now = new Date()) {
  const at = (days, h, m = 0) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };
  const inHours = (h) => { const d = new Date(now.getTime() + h * 3600e3); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); return d; };
  return [
    { label: "In 1 hour", at: inHours(1) },
    { label: "In 3 hours", at: inHours(3) },
    { label: "Tomorrow 11:00", at: at(1, 11) },
    { label: "Tomorrow 16:00", at: at(1, 16) },
    { label: "In 3 days", at: at(3, 11) },
  ].filter((q) => q.at > now);
}

export const timeOnly = (d) => (d ? new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");
export const dayKey = (d) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
