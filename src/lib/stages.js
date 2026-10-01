// Colour groups for the §21 franchise stages (keys come from the API /meta)
const GROUP = {
  new_lead: "slate", assigned: "slate",
  contact_attempted: "sky", connected: "sky",
  qualified: "indigo", interested: "indigo",
  meeting_scheduled: "violet", meeting_completed: "violet", plan_discussed: "violet",
  proposal_shared: "amber", negotiation: "amber",
  payment_pending: "orange", payment_received: "emerald",
  kyc_pending: "teal", kyc_completed: "teal", onboarding: "teal", activated: "emerald",
};
const CLASSES = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
};
export const stageClass = (key) => CLASSES[GROUP[key] || "slate"];

export const BAND = {
  immediate: { label: "Immediate", className: "bg-red-600 text-white" },
  hot: { label: "Hot", className: "bg-orange-500 text-white" },
  qualified: { label: "Qualified", className: "bg-indigo-100 text-indigo-700" },
  nurture: { label: "Nurture", className: "bg-slate-100 text-slate-600" },
  low: { label: "Low", className: "bg-slate-100 text-slate-500" },
};

export const PRIORITY = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-slate-100 text-slate-600",
};

export const FILTER_LABELS = {
  all: "All", new: "New", hot: "Hot", contacted: "Contacted", qualified: "Qualified", meeting: "Meeting",
  proposal: "Proposal", payment_pending: "Payment Pending", won: "Won", lost: "Lost", overdue: "Overdue",
};

export const ROLE_LABEL = {
  FRANCHISE_SALES_EXECUTIVE: "Sales Executive",
  FRANCHISE_SALES_MANAGER: "Sales Manager",
  ADMIN: "Admin",
};
