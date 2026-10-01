// Edit contact + §22 qualification fields (team values stick — the AI never overwrites them)
import { useState } from "react";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMetaQuery, useUpdateLeadMutation } from "@/app/api";
import { selectScope } from "@/app/authSlice";
import { errorText } from "@/lib/format";

const val = (x) => (x && typeof x === "object" ? x.value : x) || "";

const FIELDS = [
  ["name", "Name"], ["email", "Email"], ["city", "City"], ["state", "State"],
  ["preferredTerritory", "Preferred territory"], ["investmentCapacity", "Investment capacity"], ["expectedTimeline", "Expected timeline"],
  ["businessExperience", "Business experience"], ["currentBusiness", "Current business"], ["businessBackground", "Business background"],
  ["franchiseModel", "Franchise model / plan"], ["kitRequirement", "Kit requirement"], ["expectedLaunch", "Expected launch"], ["decisionMaker", "Decision maker"],
];

export function EditLeadSheet({ lead, open, onOpenChange }) {
  const scope = useSelector(selectScope);
  const { data: meta } = useMetaQuery();
  const [update, { isLoading }] = useUpdateLeadMutation();
  // The sheet is mounted only while open, so the lead's values seed the form once
  const [form, setForm] = useState(() => {
    const r = lead.requirement || {};
    return {
      name: lead.info?.name || "", email: lead.info?.email || "", city: lead.info?.city || "", state: lead.info?.state || "",
      preferredTerritory: val(r.preferredTerritory), investmentCapacity: val(r.investmentCapacity), expectedTimeline: val(r.expectedTimeline),
      businessExperience: val(r.businessExperience), currentBusiness: val(r.currentBusiness), businessBackground: val(r.businessBackground),
      franchiseModel: val(r.franchiseModel), kitRequirement: val(r.kitRequirement), expectedLaunch: val(r.expectedLaunch), decisionMaker: val(r.decisionMaker),
      opportunityValue: lead.opportunityValue ?? "", priority: lead.priority || "", sourceChannel: lead.sourceChannel || "",
    };
  });

  const save = async () => {
    const initial = {
      name: lead.info?.name || "", email: lead.info?.email || "", city: lead.info?.city || "", state: lead.info?.state || "",
      opportunityValue: lead.opportunityValue ?? "", priority: lead.priority || "", sourceChannel: lead.sourceChannel || "",
      ...Object.fromEntries(FIELDS.slice(4).map(([k]) => [k, val(lead.requirement?.[k])])),
    };
    const body = {};
    for (const [k, v] of Object.entries(form)) if (String(v ?? "") !== String(initial[k] ?? "")) body[k] = v === "" ? null : v;
    if (body.name === null) return toast.error("Name cannot be empty");
    if (!Object.keys(body).length) { onOpenChange(false); return; }
    try {
      await update({ id: lead.leadId, ...body }).unwrap();
      toast.success("Lead updated");
      onOpenChange(false);
    } catch (err) { toast.error(errorText(err)); }
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>Edit lead</SheetTitle><SheetDescription>What you enter here is kept — automatic updates never overwrite it.</SheetDescription></SheetHeader>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FIELDS.map(([k, label]) => (
            <div key={k} className={["businessBackground", "currentBusiness"].includes(k) ? "sm:col-span-2" : ""}>
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input value={form[k] ?? ""} onChange={set(k)} />
            </div>
          ))}
          <div>
            <Label className="text-xs text-muted-foreground">Opportunity value (₹)</Label>
            <Input type="number" min={0} value={form.opportunityValue ?? ""} onChange={set("opportunityValue")} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select value={form.priority || ""} onValueChange={set("priority")}>
              <SelectTrigger><SelectValue placeholder="Automatic" /></SelectTrigger>
              <SelectContent>{["URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {scope?.kind !== "own" && (
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Lead source</Label>
              <Select value={form.sourceChannel || ""} onValueChange={set("sourceChannel")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(meta?.sources || []).map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={isLoading} onClick={save}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
