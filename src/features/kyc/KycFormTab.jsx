// Partner KYC → "KYC form" tab: everything the client filled (same sections as the admin
// dashboard), documents, edit mode (changed fields turn green) and status + remarks.
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle2, CreditCard, ExternalLink, FileText, Loader2, MapPin, MessageSquareText, Pencil, Save, ShieldCheck, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";
import { dateOnly, errorText } from "@/lib/format";
import { useKycFormQuery, useUpdateKycFormMutation } from "@/app/api";
import { fileUrl, fullDateTime, isPdf } from "./kycUtils";
import { Section } from "./KycBits";

// [field, label, kind] — kind: text (default) · date · area · plan · upper · mono
const SECTIONS = [
  { title: "Partner & basic details", icon: User, fields: [
    ["partnerName", "Partner display name"], ["franchisePlan", "Franchise plan", "plan"], ["city", "City"],
    ["fullName", "Full legal name"], ["fatherSpouseName", "Father / spouse name"], ["dob", "Date of birth", "date"],
    ["mobileNumber", "Mobile number", "mono"], ["whatsAppNumber", "WhatsApp number", "mono"], ["email", "Email"],
  ] },
  { title: "Identity & residential address", icon: FileText, fields: [
    ["panNumber", "PAN number", "upper"], ["aadhaarNumber", "Aadhaar number", "mono"], ["aadhaarAddress", "Address as on Aadhaar", "area"],
    ["residentialAddress", "Residential address", "area"], ["addressCity", "City"], ["addressState", "State"], ["pincode", "Pincode", "mono"],
  ], docs: [["panCard", "PAN card", "panCardDoc"], ["aadhaarCard", "Aadhaar card", "aadhaarCardDoc"]] },
  { title: "Business & firm details", icon: Building2, fields: [
    ["businessName", "Business / firm name"], ["gstin", "GSTIN", "upper"], ["businessRegistrationNo", "Business registration no."],
  ] },
  { title: "Bank & payout details", icon: CreditCard, fields: [
    ["accountHolderName", "Account holder name"], ["bankName", "Bank name"], ["accountNumber", "Account number", "mono"],
    ["ifscCode", "IFSC code", "upper"], ["branchName", "Branch"],
  ] },
  { title: "Operations & territory", icon: MapPin, fields: [
    ["primaryOperatingCity", "Primary operating city"], ["operatingState", "Operating state"], ["primaryOperatingPincode", "Primary pincode", "mono"],
    ["additionalPincodes", "Additional pincodes"], ["operatingAddress", "Operating address", "area"],
  ] },
  { title: "Supporting documents", icon: FileText, fields: [], docs: [
    ["addressProof", "Address proof", "documents.addressProofDoc"], ["photograph", "Photograph", "documents.photoDoc"],
    ["gstCertificate", "GST certificate", "documents.gstCertificateDoc"], ["businessRegistration", "Business registration", "documents.businessRegistrationDoc"],
    ["cancelledCheque", "Cancelled cheque", "documents.cancelledChequeDoc"], ["otherDoc", "Other document", "documents.otherDoc"],
  ] },
  { title: "Client comments", icon: MessageSquareText, fields: [["comments", "Comments / remarks from the client", "area"]] },
];
const STATUS_OPTIONS = [["pending", "Submitted (to review)"], ["approved", "Approved"], ["action_required", "Action required"], ["rejected", "Rejected"]];

const get = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
const asInput = (kind, v) => (kind === "date" ? (v ? new Date(v).toISOString().slice(0, 10) : "") : v ?? "");
const asText = (kind, v) => (kind === "date" ? (v ? dateOnly(v) : null) : v || null);

export default function KycFormTab({ id, plans = [] }) {
  const { data, isLoading, error } = useKycFormQuery(id);
  const kyc = data?.data;
  if (isLoading) return <PageSkeleton />;
  if (error || !kyc) return <p className="text-sm text-red-600">{errorText(error, "Could not load the KYC form")}</p>;
  // A fresh editor for every saved version (new values from the server reset the form)
  return <KycFormEditor key={`${kyc._id}:${kyc.updatedAt}`} id={id} kyc={kyc} plans={plans} />;
}

function KycFormEditor({ id, kyc, plans }) {
  const [save, { isLoading: saving }] = useUpdateKycFormMutation();
  const original = useMemo(() => {
    const o = {};
    SECTIONS.forEach((s) => s.fields.forEach(([k, , kind]) => { o[k] = String(asInput(kind, kyc?.[k])); }));
    return o;
  }, [kyc]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(original);
  const [files, setFiles] = useState({});
  const [status, setStatus] = useState(kyc.kycStatus === "not_filled" ? "pending" : kyc.kycStatus || "pending");
  const [remarks, setRemarks] = useState(kyc.adminRemarks || "");

  const changed = Object.keys(form).filter((k) => String(form[k] ?? "").trim() !== String(original[k] ?? "").trim());
  const statusChanged = status !== kyc.kycStatus || remarks !== (kyc.adminRemarks || "");

  const cancel = () => { setForm(original); setFiles({}); setEditing(false); };

  const saveAll = async () => {
    const body = new FormData();
    changed.forEach((k) => body.append(k, form[k] ?? ""));
    Object.entries(files).forEach(([k, f]) => f && body.append(k, f));
    body.append("kycStatus", status);
    body.append("adminRemarks", remarks || "");
    try {
      await save({ id, body }).unwrap();
      toast.success("KYC details saved");
      setEditing(false);
      setFiles({});
    } catch (e) {
      toast.error(errorText(e, "Could not save the KYC details"));
    }
  };

  const saveStatus = async () => {
    try {
      await save({ id, body: { kycStatus: status, adminRemarks: remarks } }).unwrap();
      toast.success("KYC status saved");
    } catch (e) {
      toast.error(errorText(e, "Could not save the status"));
    }
  };

  return (
    <div className="space-y-4">
      {/* Status + remarks */}
      <Section
        title="Status & review"
        icon={ShieldCheck}
        className="border-l-4 border-l-indigo-500"
        action={!editing
          ? <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit details</Button>
          : <div className="flex gap-2"><Button size="sm" variant="outline" onClick={cancel} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={saveAll} disabled={saving}>{saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}Save changes</Button></div>}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">KYC status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm font-semibold">
              {STATUS_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Remarks (e.g. what the client must correct)</span>
            <div className="flex items-start gap-2">
              <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Notes or instructions…" className="flex-1" />
              {!editing && <Button size="sm" className="self-end" onClick={saveStatus} disabled={saving || !statusChanged}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save status"}</Button>}
            </div>
          </label>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Submitted {fullDateTime(kyc.submittedAt || kyc.createdAt)} · Approving ticks "KYC approved" in Onboarding.
        </p>
        {editing && (
          <p className="mt-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            Edit mode: changed fields and new files turn <b>green</b>. {changed.length + Object.keys(files).length} change{changed.length + Object.keys(files).length === 1 ? "" : "s"} so far.
          </p>
        )}
      </Section>

      {SECTIONS.map((s) => (
        <Section key={s.title} title={s.title} icon={s.icon}>
          {s.fields.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.fields.map(([k, label, kind]) => {
                const isChanged = editing && changed.includes(k);
                const cls = cn(isChanged && "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/30", (kind === "mono" || kind === "upper") && "font-mono", kind === "upper" && "uppercase");
                return (
                  <div key={k} className={cn(kind === "area" && "sm:col-span-2 lg:col-span-3")}>
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      {label}
                      {isChanged && <span className="inline-flex items-center gap-0.5 rounded border border-emerald-300 bg-emerald-100 px-1 text-[10px] font-bold text-emerald-800"><CheckCircle2 className="h-3 w-3" />Changed</span>}
                    </p>
                    {!editing ? (
                      <p className={cn("min-h-9 whitespace-pre-wrap break-words rounded-md border bg-muted/30 px-2.5 py-2 text-sm font-medium", (kind === "mono" || kind === "upper") && "font-mono", kind === "upper" && "uppercase")}>
                        {asText(kind, kyc[k]) || <span className="font-normal text-muted-foreground">—</span>}
                      </p>
                    ) : kind === "plan" ? (
                      <select value={form[k] || ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className={cn("h-9 w-full rounded-md border bg-background px-3 text-sm", cls)}>
                        {[...new Set([form[k], ...plans].filter(Boolean))].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : kind === "area" ? (
                      <Textarea rows={2} value={form[k] || ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className={cls} />
                    ) : (
                      <Input type={kind === "date" ? "date" : "text"} value={form[k] || ""} onChange={(e) => setForm((f) => ({ ...f, [k]: kind === "upper" ? e.target.value.toUpperCase() : e.target.value }))} className={cls} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {s.docs && (
            <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", s.fields.length > 0 && "mt-4 border-t pt-4")}>
              {s.docs.map(([field, label, path]) => (
                <DocCard key={field} label={label} url={get(kyc, path)} editing={editing} file={files[field]}
                  onFile={(f) => setFiles((x) => { const n = { ...x }; if (f) n[field] = f; else delete n[field]; return n; })} />
              ))}
            </div>
          )}
        </Section>
      ))}
    </div>
  );
}

function DocCard({ label, url, editing, file, onFile }) {
  const full = fileUrl(url);
  return (
    <div className={cn("flex flex-col justify-between rounded-lg border p-3", file ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30" : "bg-muted/20")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{label}</span>
        {file && <span className="rounded border border-emerald-300 bg-emerald-100 px-1 text-[10px] font-bold text-emerald-800">New file</span>}
      </div>
      <div className="py-1 text-center">
        {!full ? <p className="py-4 text-xs italic text-muted-foreground">Not uploaded</p> : isPdf(full) ? (
          <a href={full} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 py-4 text-xs font-semibold text-blue-700 hover:underline"><FileText className="h-4 w-4" />Open PDF</a>
        ) : (
          <a href={full} target="_blank" rel="noreferrer" className="block" title="Open in a new tab">
            <img src={full} alt={label} loading="lazy" className="mx-auto h-28 rounded border object-contain" />
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700"><ExternalLink className="h-3 w-3" />Open</span>
          </a>
        )}
      </div>
      {editing && (
        <div className="mt-2 border-t pt-2">
          <Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => onFile(e.target.files?.[0] || null)} className="h-auto p-1 text-[11px]" />
          {file && <p className="mt-1 truncate text-[10px] text-emerald-800">{file.name}</p>}
        </div>
      )}
    </div>
  );
}
