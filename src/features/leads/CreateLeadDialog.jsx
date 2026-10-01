// §18 + CREATE FRANCHISE LEAD, with the §19 duplicate check before saving
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCheckDuplicateMutation, useCreateLeadMutation, useMetaQuery } from "@/app/api";
import { selectScope, selectTeam, selectUser } from "@/app/authSlice";
import { ago, errorText, inr } from "@/lib/format";

const schema = z.object({
  name: z.string().trim().min(2, "Enter the full name").max(100),
  phone: z.string().trim().regex(/^[+\d\s()-]{10,16}$/, "Enter a valid phone number"),
  whatsapp: z.string().trim().regex(/^([+\d\s()-]{10,16})?$/, "Enter a valid WhatsApp number").optional(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().optional(),
  preferredTerritory: z.string().trim().optional(),
  investmentCapacity: z.string().trim().optional(),
  businessBackground: z.string().trim().optional(),
  expectedTimeline: z.string().trim().optional(),
  franchiseInterest: z.string().trim().optional(),
  source: z.string().optional(),
  assignTo: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const TIMELINES = ["Immediately / within 1 month", "Within 1–3 months", "Within 3–6 months", "Within 6–12 months", "Just exploring"];

function Field({ label, error, children, className }) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Duplicates({ result }) {
  if (!result?.duplicates?.length) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-amber-900"><AlertTriangle className="h-4 w-4" />{result.message || result.error}</p>
      <ul className="mt-2 space-y-1.5">
        {result.duplicates.map((d, i) => (
          <li key={i} className="rounded bg-white/70 px-2 py-1.5 text-xs">
            <b>{d.leadCode || (d.type === "FRANCHISE" ? "Franchise lead" : "Existing MWG lead (customer / partner)")}</b>
            {" · "}Owner: <b>{d.currentOwner || "Unassigned"}</b>
            {d.stage ? ` · ${d.stage}` : ""}{d.status ? ` · ${d.status}` : ""}
            {" · "}Last activity {ago(d.lastActivity)}{d.lastContact ? ` · Last contact ${ago(d.lastContact)}` : ""}
            <span className="text-muted-foreground"> — matched by {(d.matchedBy || []).join(", ")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CreateLeadDialog({ open, onOpenChange }) {
  const scope = useSelector(selectScope);
  const team = useSelector(selectTeam);
  const user = useSelector(selectUser);
  const isExec = scope?.kind === "own";
  const { data: meta } = useMetaQuery(undefined, { skip: !open });
  const [create, { isLoading }] = useCreateLeadMutation();
  const [checkDup] = useCheckDuplicateMutation();
  const [dupResult, setDupResult] = useState(null);
  const [blocked, setBlocked] = useState(null);   // 409 answer from create
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { source: isExec ? "SALES_EXECUTIVE" : scope?.kind === "all" ? "MANUAL_ADMIN" : "SALES_EXECUTIVE", assignTo: isExec ? "" : "self", whatsapp: "", email: "" },
  });

  // Editing the form after a refused save starts a fresh check
  useEffect(() => {
    const sub = watch((_, { name }) => { if (["name", "phone", "whatsapp", "email"].includes(name)) setBlocked(null); });
    return () => sub.unsubscribe();
  }, [watch]);

  const close = (o) => { onOpenChange(o); if (!o) { reset(); setDupResult(null); setBlocked(null); } };

  const onPhoneBlur = async () => {
    const phone = watch("phone");
    if (!phone || phone.replace(/\D/g, "").length < 10) return;
    try {
      const r = await checkDup({ phone, whatsapp: watch("whatsapp") || undefined, email: watch("email") || undefined }).unwrap();
      setDupResult(r.duplicate ? { message: r.message, duplicates: r.matches } : null);
    } catch { /* checked again on save */ }
  };

  const submit = async (values, extra = {}) => {
    const body = { ...values, ...extra };
    if (body.assignTo === "self") body.assignTo = user?._id;
    else if (body.assignTo === "auto" || !body.assignTo) delete body.assignTo;
    for (const k of Object.keys(body)) if (body[k] === "") delete body[k];
    try {
      const r = await create(body).unwrap();
      toast.success(`${r.leadCode || "Lead"} ${r.converted ? "moved to franchise" : "created"}`);
      close(false);
      navigate(`/leads/${r.leadId}`);
    } catch (err) {
      if (err?.status === 409) setBlocked({ error: err.data?.error, duplicates: err.data?.duplicates, canConfirm: err.data?.canConfirm, canConvert: err.data?.canConvert, values: body });
      else toast.error(errorText(err, "Could not create the lead"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create franchise lead</DialogTitle>
          <DialogDescription>
            {isExec ? "The lead will be assigned to you (self-created)." : "Assign it to yourself, a team member, or let the assignment engine pick."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => submit(v))} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name *" error={errors.name?.message}><Input {...register("name")} placeholder="Full name" /></Field>
            <Field label="Phone *" error={errors.phone?.message}><Input {...register("phone")} onBlur={onPhoneBlur} placeholder="98765 43210" inputMode="tel" /></Field>
            <Field label="WhatsApp (if different)" error={errors.whatsapp?.message}><Input {...register("whatsapp")} placeholder="Same as phone" inputMode="tel" /></Field>
            <Field label="Email" error={errors.email?.message}><Input {...register("email")} type="email" placeholder="name@email.com" /></Field>
            <Field label="City *" error={errors.city?.message}><Input {...register("city")} placeholder="Ranchi" /></Field>
            <Field label="State"><Input {...register("state")} placeholder="Jharkhand" /></Field>
            <Field label="Preferred territory"><Input {...register("preferredTerritory")} placeholder="Area / pincode they want" /></Field>
            <Field label="Investment capacity"><Input {...register("investmentCapacity")} placeholder="e.g. ₹2–5 lakh" /></Field>
            <Field label="Franchise interest / plan">
              <Select value={watch("franchiseInterest") || ""} onValueChange={(v) => setValue("franchiseInterest", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Not decided" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not decided</SelectItem>
                  {(meta?.plans || []).map((p) => <SelectItem key={p.name} value={p.name}>{p.name} · {inr(p.price)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Expected timeline">
              <Select value={watch("expectedTimeline") || ""} onValueChange={(v) => setValue("expectedTimeline", v)}>
                <SelectTrigger><SelectValue placeholder="When do they want to start?" /></SelectTrigger>
                <SelectContent>{TIMELINES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Business background" className="sm:col-span-2"><Input {...register("businessBackground")} placeholder="Current business / experience" /></Field>
            <Field label="Source">
              <Select value={watch("source")} onValueChange={(v) => setValue("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(meta?.createSources || []).filter((s) => s.key !== "MANUAL_ADMIN" || scope?.kind === "all").map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {!isExec && (
              <Field label="Assign to">
                <Select value={watch("assignTo")} onValueChange={(v) => setValue("assignTo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Me</SelectItem>
                    <SelectItem value="auto">Assignment engine</SelectItem>
                    {team.filter((m) => m._id !== user?._id && m.salesRole === "FRANCHISE_SALES_EXECUTIVE").map((m) => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Notes" className="sm:col-span-2"><Textarea rows={3} {...register("notes")} placeholder="Where you met, what they asked…" /></Field>
          </div>

          {!blocked && <Duplicates result={dupResult} />}
          {blocked && <Duplicates result={blocked} />}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
            {blocked?.canConvert && (
              <Button type="button" variant="secondary" disabled={isLoading} onClick={() => submit(blocked.values, { convertExisting: true })}>Move existing lead to franchise</Button>
            )}
            {blocked?.canConfirm ? (
              <Button type="button" disabled={isLoading} onClick={() => submit(blocked.values, { confirmNameMatch: true })}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Not the same person — create
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading || (blocked && !blocked.canConfirm && !blocked.canConvert)}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create lead
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
