// WhatsApp filter: a centre modal (Assigned to · Tags · Stages, tick boxes, Apply) + the row of
// applied filters above the conversation list (each one can be removed on its own).
import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { countFilters } from "./waUtils";

const EMPTY = { owners: [], tags: [], stages: [] };

/** sections: [{ key: 'owners' | 'tags' | 'stages', label, options: [{ value, label, count? }] }] */
export function WaFilterDialog({ open, onOpenChange, value, onApply, sections }) {
  // Mounted only while open, so the draft always starts from the applied filters
  return <Dialog open={open} onOpenChange={onOpenChange}>{open && <Body value={value} onApply={onApply} onOpenChange={onOpenChange} sections={sections} />}</Dialog>;
}

function Body({ value, onApply, onOpenChange, sections }) {
  const [draft, setDraft] = useState({ ...EMPTY, ...value });
  const [tab, setTab] = useState(sections[0]?.key);
  const sec = sections.find((s) => s.key === tab) || sections[0];
  const picked = draft[sec.key] || [];
  const all = sec.options.length > 0 && sec.options.every((o) => picked.includes(o.value));
  const toggle = (v) => setDraft((d) => ({ ...d, [sec.key]: picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v] }));
  return (
    <DialogContent className="flex max-h-[85dvh] w-[95vw] max-w-3xl flex-col gap-0 p-0 [&>button]:hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <DialogTitle className="text-lg">Filters</DialogTitle>
        <DialogDescription className="sr-only">Filter the WhatsApp conversations</DialogDescription>
        <button type="button" className="text-sm font-semibold uppercase tracking-wide text-primary hover:underline" onClick={() => setDraft({ ...EMPTY })}>Clear all</button>
      </div>
      <div className="flex min-h-[320px] flex-1 overflow-hidden">
        <div className="w-36 shrink-0 overflow-y-auto border-r bg-muted/30 sm:w-56">
          {sections.map((s) => (
            <button key={s.key} type="button" onClick={() => setTab(s.key)}
              className={cn("flex w-full items-center justify-between border-b px-4 py-3 text-left text-sm", tab === s.key ? "bg-background font-medium text-primary" : "hover:bg-muted")}>
              {s.label}{draft[s.key]?.length > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{draft[s.key].length}</span>}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!sec.options.length ? <p className="py-8 text-center text-sm text-muted-foreground">{sec.emptyText || "Nothing to choose yet."}</p> : (
            <>
              <label className="flex cursor-pointer items-center gap-3 py-2 text-sm font-semibold">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={all} onChange={() => setDraft((d) => ({ ...d, [sec.key]: all ? [] : sec.options.map((o) => o.value) }))} />Select All
              </label>
              {sec.options.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-3 py-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={picked.includes(o.value)} onChange={() => toggle(o.value)} />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{o.count}</span>}
                </label>
              ))}
            </>
          )}
        </div>
      </div>
      <div className="flex gap-3 border-t px-5 py-4">
        <Button variant="outline" className="flex-1 rounded-full uppercase" onClick={() => onOpenChange(false)}>Close</Button>
        <Button className="flex-1 rounded-full uppercase" onClick={() => { onApply(draft); onOpenChange(false); }}>Apply</Button>
      </div>
    </DialogContent>
  );
}

/** Applied filters as removable chips */
export function WaFilterChips({ value, sections, onChange }) {
  if (!countFilters(value)) return null;
  const chips = sections.flatMap((s) => (value[s.key] || []).map((v) => ({ key: s.key, v, text: `${s.chip}: ${s.options.find((o) => o.value === v)?.label || v}` })));
  return (
    <div className="flex flex-wrap items-center gap-1">
      {chips.map((c) => (
        <span key={`${c.key}:${c.v}`} className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-primary/5 py-0.5 pl-2 pr-1 text-[11px]">
          <span className="truncate">{c.text}</span>
          <button type="button" onClick={() => onChange({ ...value, [c.key]: value[c.key].filter((x) => x !== c.v) })} className="rounded-full p-0.5 hover:bg-primary/20" aria-label={`Remove filter ${c.text}`}><X className="h-3 w-3" /></button>
        </span>
      ))}
      <button type="button" onClick={() => onChange({ ...EMPTY })} className="px-1 text-[11px] text-primary hover:underline">Clear all</button>
    </div>
  );
}
