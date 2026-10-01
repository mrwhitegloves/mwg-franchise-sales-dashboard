// FS07 — AI + human controls for one chat: conversation state switch, the AI's draft
// (AI + human mode) and "what should I say next" suggestions. Nothing here sends a
// message — the salesperson picks / edits the text and presses Send.
import { useEffect, useState } from "react";
import { Bot, Loader2, RefreshCw, Sparkles, User, Users, X, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorText } from "@/lib/format";
import { useSetChatModeMutation, useSuggestRepliesMutation } from "@/app/api";

const MODES = [
  { value: "AI", label: "AI", Icon: Bot, hint: "The AI answers on its own" },
  { value: "AI_HUMAN", label: "AI drafts", Icon: Users, hint: "The AI writes a draft for every message — you check it and send" },
  { value: "HUMAN", label: "Me", Icon: User, hint: "You answer — the AI stays silent" },
];

export function ModeSwitch({ conversationId, mode }) {
  const [setMode, { isLoading }] = useSetChatModeMutation();
  const change = async (m) => {
    if (m === mode) return;
    try {
      await setMode({ id: conversationId, mode: m }).unwrap();
      toast.success(m === "AI" ? "The AI answers this chat again" : m === "AI_HUMAN" ? "The AI will draft answers — you send them" : "You answer this chat — the AI is silent");
    } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <div className="flex items-center rounded-lg border p-0.5" role="radiogroup" aria-label="Who answers this chat">
      {MODES.map((m) => {
        const { value, label, hint } = m;
        return (
        <button key={value} type="button" role="radio" aria-checked={mode === value} title={hint} disabled={isLoading}
          onClick={() => change(value)}
          className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
            mode === value ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "text-muted-foreground hover:bg-muted")}>
          <m.Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span>
        </button>
        );
      })}
    </div>
  );
}

export function DraftBanner({ draft, onUse }) {
  const [hidden, setHidden] = useState(null);
  if (!draft?.text || hidden === draft.text) return null;
  return (
    <div className="mb-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-sky-800">
        <Sparkles className="h-3.5 w-3.5" />AI draft — check it, edit if needed, then send
        <button type="button" className="ml-auto rounded p-0.5 hover:bg-sky-100" onClick={() => setHidden(draft.text)} aria-label="Hide draft"><X className="h-3.5 w-3.5" /></button>
      </div>
      <p className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-800">{draft.text}</p>
      <div className="mt-2 flex justify-end"><Button size="sm" className="h-7" onClick={() => { onUse(draft.text); setHidden(draft.text); }}>Use this draft</Button></div>
    </div>
  );
}

export function SuggestPanel({ conversationId, open, onClose, onPick }) {
  const [suggest, { data, isLoading, error }] = useSuggestRepliesMutation();
  // Once per opening (the trigger is stable; never depend on reset(), it changes every render)
  useEffect(() => {
    if (!open) return undefined;
    const req = suggest({ id: conversationId });
    return () => req.abort();
  }, [open, conversationId, suggest]);
  if (!open) return null;
  return (
    <div className="mb-2 max-h-[45vh] overflow-y-auto rounded-lg border bg-card p-2.5 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <Sparkles className="h-3.5 w-3.5 text-primary" />What should I say next?
        <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" disabled={isLoading} onClick={() => suggest({ id: conversationId, refresh: true })} aria-label="New suggestions"><RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close"><X className="h-3.5 w-3.5" /></Button>
      </div>
      {isLoading && <p className="flex items-center gap-2 py-3 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />The AI is reading the chat…</p>}
      {error && <p className="text-xs text-red-600">{errorText(error)}</p>}
      {data && !isLoading && (
        <div className="space-y-1.5">
          {data.note && <p className="text-[11px] text-muted-foreground">{data.note}</p>}
          {data.items.map((it, i) => (
            <button key={i} type="button" onClick={() => onPick(it.text)}
              className={cn("w-full rounded-md border p-2 text-left text-sm transition-colors hover:bg-muted", it.kind === "ai" && "border-sky-200 bg-sky-50/60 hover:bg-sky-50")}>
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{it.label}</span>
              <span className="line-clamp-4 whitespace-pre-wrap">{it.text}</span>
            </button>
          ))}
          {data.tips?.length > 0 && (
            <div className="space-y-1 pt-1">
              {data.tips.map((t, i) => (
                <p key={i} className="flex gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><span className="font-semibold">{t.label}:</span> {t.how}</span>
                </p>
              ))}
            </div>
          )}
          <p className="pt-1 text-[10px] text-muted-foreground">Tap a suggestion to put it in the message box — nothing is sent until you press Send.</p>
        </div>
      )}
    </div>
  );
}
