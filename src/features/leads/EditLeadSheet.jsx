// Edit lead — centred modal (owner request 2026-10-01). Two saves behind one button:
//   PATCH /leads/:id/details  contact, main location, chat location, form answers, qualification
//                             (shared lead editor; phone number: managers / admins only)
//   PATCH /leads/:id          franchise extras (§22), value, priority, source (managers)
import { useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, Phone, MapPin, MessageSquare, Briefcase, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditDetailsMutation, useLeadEditQuery, useMetaQuery, useUpdateLeadMutation } from "@/app/api";
import { selectScope } from "@/app/authSlice";
import { errorText } from "@/lib/format";

const val = (x) => (x && typeof x === "object" ? x.value : x) || "";
const EXTRAS = [
  ["preferredTerritory", "Preferred territory"], ["currentBusiness", "Current business"], ["businessBackground", "Business background"],
  ["franchiseModel", "Franchise model / plan"], ["kitRequirement", "Kit requirement"], ["expectedLaunch", "Expected launch"], ["decisionMaker", "Decision maker"],
];

function Section({ icon: Icon, title, hint, children }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">{Icon && <Icon className="h-4 w-4 text-primary" />}{title}</p>
      {hint && <p className="-mt-2 mb-3 text-xs text-muted-foreground">{hint}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}
const Field = ({ label, wide, children }) => <div className={wide ? "sm:col-span-2" : ""}><Label className="mb-1 block text-xs text-muted-foreground">{label}</Label>{children}</div>;

function EditForm({ lead, view, onDone }) {
  const scope = useSelector(selectScope);
  const { data: meta } = useMetaQuery();
  const [saveDetails, { isLoading: s1 }] = useEditDetailsMutation();
  const [saveExtras, { isLoading: s2 }] = useUpdateLeadMutation();
  const chat0 = view.location.chat || {};
  const [d, setD] = useState({
    contact: { ...view.contact },
    location: { city: view.location.city, state: view.location.state, pincode: view.location.pincode },
    chat: { text: chat0.text || "", city: chat0.city || "", area: chat0.area || "", pincode: chat0.pincode || "" },
    qualification: Object.fromEntries(view.qualification.map((q) => [q.key, q.value])),
    answers: Object.fromEntries(view.answers.map((a) => [a.key, a.value])),
  });
  const r = lead.requirement || {};
  const extras0 = { ...Object.fromEntries(EXTRAS.map(([k]) => [k, val(r[k])])), opportunityValue: lead.opportunityValue ?? "", priority: lead.priority || "", sourceChannel: lead.sourceChannel || "" };
  const [x, setX] = useState(extras0);
  const setIn = (g, k) => (e) => setD((s) => ({ ...s, [g]: { ...s[g], [k]: e?.target ? e.target.value : e } }));

  const save = async () => {
    try {
      const chatEmpty = !d.chat.text && !d.chat.city && !d.chat.area && !d.chat.pincode;
      const r1 = await saveDetails({
        id: lead.leadId,
        contact: view.canEditPhone ? d.contact : { ...d.contact, phone_number: undefined },
        location: { ...d.location, chat: chatEmpty ? (view.location.chat ? null : undefined) : d.chat },
        ...(view.qualification.length ? { qualification: d.qualification } : {}),
        ...(view.answers.length ? { answers: d.answers } : {}),
      }).unwrap();
      const extras = {};
      for (const [k, v] of Object.entries(x)) if (String(v ?? "") !== String(extras0[k] ?? "")) extras[k] = v === "" ? null : v;
      if (extras.priority === null) delete extras.priority;
      if (extras.sourceChannel === null) delete extras.sourceChannel;
      if (Object.keys(extras).length) await saveExtras({ id: lead.leadId, ...extras }).unwrap();
      const n = (r1.changed?.length || 0) + Object.keys(extras).length;
      toast.success(n ? `Saved ${n} change(s)` : "Nothing changed");
      onDone();
    } catch (err) { toast.error(errorText(err)); }
  };

  return (
    <>
      <div className="space-y-4">
        <Section icon={Phone} title="Contact">
          <Field label="Full name"><Input value={d.contact.full_name} onChange={setIn("contact", "full_name")} /></Field>
          <Field label={view.canEditPhone ? "Phone number" : "Phone number (manager can change)"}><Input value={d.contact.phone_number} onChange={setIn("contact", "phone_number")} disabled={!view.canEditPhone} /></Field>
          <Field label="WhatsApp number (only if different)"><Input value={d.contact.whatsapp_number} onChange={setIn("contact", "whatsapp_number")} placeholder="Same as phone" /></Field>
          <Field label="Email"><Input type="email" value={d.contact.work_email} onChange={setIn("contact", "work_email")} /></Field>
        </Section>
        <Section icon={MapPin} title="Main location (from the form)">
          <Field label="City"><Input value={d.location.city} onChange={setIn("location", "city")} /></Field>
          <Field label="State"><Input value={d.location.state} onChange={setIn("location", "state")} /></Field>
          <Field label="Pincode"><Input value={d.location.pincode} onChange={setIn("location", "pincode")} maxLength={6} inputMode="numeric" /></Field>
        </Section>
        <Section icon={MessageSquare} title="Latest location from the chat" hint="A new location replaces the old one.">
          <Field label="As written" wide><Input value={d.chat.text} onChange={setIn("chat", "text")} placeholder="e.g. Lalpur, Ranchi 834001" /></Field>
          <Field label="City"><Input value={d.chat.city} onChange={setIn("chat", "city")} /></Field>
          <Field label="Area"><Input value={d.chat.area} onChange={setIn("chat", "area")} /></Field>
          <Field label="Pincode"><Input value={d.chat.pincode} onChange={setIn("chat", "pincode")} maxLength={6} inputMode="numeric" /></Field>
        </Section>
        <Section icon={Briefcase} title="Franchise qualification" hint="Saved as team answers — the AI never overwrites them.">
          {view.qualification.map((q) => <Field key={q.key} label={q.label}><Input value={d.qualification[q.key] || ""} onChange={setIn("qualification", q.key)} /></Field>)}
          {EXTRAS.map(([k, label]) => <Field key={k} label={label}><Input value={x[k] ?? ""} onChange={(e) => setX((s) => ({ ...s, [k]: e.target.value }))} /></Field>)}
          <Field label="Opportunity value (₹)"><Input type="number" min={0} value={x.opportunityValue ?? ""} onChange={(e) => setX((s) => ({ ...s, opportunityValue: e.target.value }))} /></Field>
          <Field label="Priority">
            <Select value={x.priority || ""} onValueChange={(v) => setX((s) => ({ ...s, priority: v }))}>
              <SelectTrigger><SelectValue placeholder="Automatic" /></SelectTrigger>
              <SelectContent>{["URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {scope?.kind !== "own" && (
            <Field label="Lead source" wide>
              <Select value={x.sourceChannel || ""} onValueChange={(v) => setX((s) => ({ ...s, sourceChannel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(meta?.sources || []).map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
        </Section>
        {view.answers.length > 0 && (
          <Section icon={ClipboardList} title="Form answers">
            {view.answers.map((a) => <Field key={a.key} label={a.label}><Input value={d.answers[a.key] ?? ""} onChange={setIn("answers", a.key)} /></Field>)}
          </Section>
        )}
      </div>
      <DialogFooter className="mt-4 gap-2">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button disabled={s1 || s2} onClick={save}>{(s1 || s2) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button>
      </DialogFooter>
    </>
  );
}

export function EditLeadSheet({ lead, open, onOpenChange }) {
  const { data, isLoading, error } = useLeadEditQuery(lead.leadId, { skip: !open });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit lead <span className="ml-1 rounded border px-1.5 text-xs font-normal text-muted-foreground">{lead.leadCode}</span></DialogTitle>
          <DialogDescription>One phone, one email and one name per lead. What you enter here is kept — automatic updates never overwrite it.</DialogDescription>
        </DialogHeader>
        {isLoading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
        {error && <p className="text-sm text-red-600">{errorText(error)}</p>}
        {data?.data && <EditForm lead={lead} view={data.data} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
