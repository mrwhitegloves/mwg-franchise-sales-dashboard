// Labelled lead fields used on every lead screen: "Intent: Franchise", "Tag: …", stage counts,
// dropdown filters (several values), and the two inline editors (stage, tags).
import { useState } from "react";
import { Check, ChevronDown, Loader2, Plus, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useChangeStatusMutation, useMetaQuery, useSetLeadTagsMutation, useTagsQuery } from "@/app/api";
import { errorText } from "@/lib/format";
import { stageClass } from "@/lib/stages";
import { cn } from "@/lib/utils";

const CHIP = "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium";

export function IntentBadge({ label }) {
  if (!label) return null;
  return <span className={cn(CHIP, "border-cyan-200 bg-cyan-50 text-cyan-800")}><span className="font-normal opacity-70">Intent:</span>{label}</span>;
}

export function TagChips({ tags = [], onRemove, max = 0 }) {
  if (!tags?.length) return null;
  const shown = max ? tags.slice(0, max) : tags;
  return (
    <>
      {shown.map((t) => (
        <span key={t} className={cn(CHIP, "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800")}>
          <span className="font-normal opacity-70">Tag:</span>{t}
          {onRemove && <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(t); }} className="-mr-0.5 rounded hover:bg-fuchsia-200" aria-label={`Remove tag ${t}`}><X className="h-3 w-3" /></button>}
        </span>
      ))}
      {max > 0 && tags.length > max && <span className="text-[11px] text-muted-foreground" title={tags.slice(max).join(", ")}>+{tags.length - max}</span>}
    </>
  );
}

/** "Total Leads N" + one chip per stage with its count; click a stage to filter by it */
export function StageCounts({ total, stageCounts = [], selected = [], onToggle, onClear }) {
  if (total === undefined || total === null) return null;
  return (
    <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
      <button type="button" onClick={onClear} className={cn("shrink-0 rounded-lg border px-3 py-1.5 text-left", !selected.length ? "border-primary bg-primary/5" : "bg-card hover:bg-muted")}>
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Total Leads</span>
        <span className="block text-base font-bold tabular-nums leading-tight">{total}</span>
      </button>
      {stageCounts.map((s) => (
        <button key={s.stage} type="button" onClick={() => onToggle?.(s.stage)}
          className={cn("shrink-0 rounded-lg border px-3 py-1.5 text-left", selected.includes(s.stage) ? "border-primary bg-primary/5" : "bg-card hover:bg-muted")}>
          <span className="block whitespace-nowrap text-[10px] uppercase tracking-wide text-muted-foreground">Stage: {s.label}</span>
          <span className="block text-base font-bold tabular-nums leading-tight">{s.count}</span>
        </button>
      ))}
    </div>
  );
}

/** Dropdown with checkboxes. options: [{ value, label, count? }] · value: [values] */
export function MultiSelect({ label, options = [], value = [], onChange, className, emptyText = "Nothing to choose yet" }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const picked = options.filter((o) => value.includes(o.value));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn("flex h-9 items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted/50", value.length && "border-primary/50", className)}>
          <span className="truncate"><span className="text-muted-foreground">{label}:</span> {picked.length === 0 ? "All" : picked.length === 1 ? picked[0].label : `${picked.length} selected`}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-64 overflow-y-auto p-1">
        {!options.length && <p className="px-2 py-3 text-center text-xs text-muted-foreground">{emptyText}</p>}
        {value.length > 0 && <button type="button" onClick={() => onChange([])} className="mb-1 w-full rounded px-2 py-1 text-left text-xs text-primary hover:bg-muted">Clear</button>}
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => toggle(o.value)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted">
            <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", value.includes(o.value) && "border-primary bg-primary text-primary-foreground")}>{value.includes(o.value) && <Check className="h-3 w-3" />}</span>
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
            {o.count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{o.count}</span>}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Stage of one lead as a dropdown — changing it saves at once (same rules as the lead page) */
export function StageSelect({ leadId, stage, stageLabel, status, className }) {
  const { data: meta } = useMetaQuery();
  const [change, { isLoading }] = useChangeStatusMutation();
  if (status && status !== "open") {
    return <span className={cn(CHIP, status === "lost" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}><span className="font-normal opacity-70">Stage:</span>{status === "lost" ? "Lost" : `Won · ${stageLabel || stage}`}</span>;
  }
  const save = async (next) => {
    if (next === stage) return;
    try { await change({ id: leadId, stage: next }).unwrap(); toast.success("Stage updated"); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Select value={stage || ""} onValueChange={save} disabled={isLoading}>
      <SelectTrigger className={cn("h-7 w-auto gap-1 rounded-md px-2 text-[11px] font-medium", stageClass(stage), className)}>
        <span className="font-normal opacity-70">Stage:</span><SelectValue placeholder={stageLabel || "—"} />{isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      </SelectTrigger>
      <SelectContent>{(meta?.stages || []).map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

/** Tags of one lead: chips (✕ removes) + "Tag" button → pick existing tags or create a new one */
export function LeadTagsEditor({ leadId, tags = [], max = 0 }) {
  const { data } = useTagsQuery();
  const [save, { isLoading }] = useSetLeadTagsMutation();
  const [text, setText] = useState("");
  const all = data?.tags || [];
  const apply = async (next) => { try { await save({ id: leadId, tags: next }).unwrap(); } catch (e) { toast.error(errorText(e)); } };
  const toggle = (name) => apply(tags.includes(name) ? tags.filter((t) => t !== name) : [...tags, name]);
  const name = text.trim().replace(/\s+/g, " ");
  const same = all.find((t) => t.name.toLowerCase() === name.toLowerCase());
  const shown = all.filter((t) => !name || t.name.toLowerCase().includes(name.toLowerCase()));
  const create = async () => {
    if (name.length < 2) return;
    const use = same?.name || name;
    if (!tags.includes(use)) await apply([...tags, use]);
    setText("");
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <TagChips tags={tags} max={max} onRemove={(t) => apply(tags.filter((x) => x !== t))} />
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" onClick={(e) => e.stopPropagation()} className={cn(CHIP, "border-dashed text-muted-foreground hover:bg-muted")} title="Add or remove tags">
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}{tags.length ? "Edit tags" : "Add tag"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={(e) => { e.preventDefault(); create(); }} className="flex gap-1">
            <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={40} placeholder="Find or create a tag" className="h-8 text-sm" autoFocus />
          </form>
          <div className="mt-1 max-h-56 overflow-y-auto">
            {name.length >= 2 && !same && (
              <button type="button" onClick={create} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-primary hover:bg-muted"><Plus className="h-3.5 w-3.5" />Create tag “{name}”</button>
            )}
            {shown.map((t) => (
              <button key={t.id} type="button" onClick={() => toggle(t.name)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted">
                <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", tags.includes(t.name) && "border-primary bg-primary text-primary-foreground")}>{tags.includes(t.name) && <Check className="h-3 w-3" />}</span>
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
              </button>
            ))}
            {!all.length && name.length < 2 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No tags yet — type a name to create the first one.</p>}
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}
