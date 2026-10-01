import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useLazySearchQuery } from "@/app/api";
import { prettyPhone } from "@/lib/format";

// Searches only inside the user's own scope (the API enforces it)
export function SearchCommand({ open, onOpenChange }) {
  const [q, setQ] = useState("");
  const [run, { data, isFetching }] = useLazySearchQuery();
  const navigate = useNavigate();

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) return undefined;
    const id = setTimeout(() => run(t), 250);
    return () => clearTimeout(id);
  }, [q, run]);

  const leads = q.trim().length >= 2 ? data?.leads || [] : [];
  return (
    <CommandDialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQ(""); }}>
      <CommandInput placeholder="Name, phone, FRN code, email or city…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>{q.trim().length < 2 ? "Type at least 2 characters" : isFetching ? "Searching…" : "No lead found in your leads"}</CommandEmpty>
        {leads.length > 0 && (
          <CommandGroup heading="Leads">
            {leads.map((l) => (
              <CommandItem key={l.leadId} value={`${l.leadCode} ${l.name} ${l.phone} ${l.city}`} onSelect={() => { onOpenChange(false); setQ(""); navigate(`/leads/${l.leadId}`); }}>
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.name || "Lead"} <span className="text-xs text-muted-foreground">{l.leadCode}</span></p>
                    <p className="truncate text-xs text-muted-foreground">{prettyPhone(l.phone)} · {l.city || "—"} · {l.stageLabel}</p>
                  </div>
                  {l.owner?.name && <span className="shrink-0 text-xs text-muted-foreground">{l.owner.name}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
