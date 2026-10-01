// FS12 — AI Sales Assistant (executives) / Management AI Assistant (managers, admins). §39, §40
// Answers come only from the person's own scope (server side). Lead cards open the lead in one click;
// lead codes in the answer are links only when the server returned that lead.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { NextAction, StageBadge } from "@/components/LeadBits";
import { useAskAssistantMutation, useAssistantSuggestionsQuery } from "@/app/api";
import { selectScope, selectUser } from "@/app/authSlice";
import { errorText, inrShort } from "@/lib/format";
import { cn } from "@/lib/utils";

const storeKey = (userId) => `sales-assistant:${userId}`;
const load = (userId) => { try { return JSON.parse(sessionStorage.getItem(storeKey(userId)) || "[]"); } catch { return []; } };
const save = (userId, msgs) => { try { sessionStorage.setItem(storeKey(userId), JSON.stringify(msgs.slice(-30))); } catch { /* storage off */ } };

/** Answer text with FRN codes as links (only codes of leads the server returned) */
function AnswerText({ text, leads, onOpen }) {
  const byCode = useMemo(() => new Map((leads || []).filter((l) => l.leadCode).map((l) => [l.leadCode.toUpperCase(), l])), [leads]);
  const parts = String(text || "").split(/(\bFRN-[\w-]+)/gi);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((p, i) => {
        const l = byCode.get(p.toUpperCase());
        return l ? <button key={i} type="button" onClick={() => onOpen(l.leadId)} className="font-medium text-primary underline-offset-2 hover:underline">{p}</button> : <Fragment key={i}>{p}</Fragment>;
      })}
    </p>
  );
}

function LeadCard({ l, showOwner, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(l.leadId)} className="w-full rounded-md border bg-card p-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-muted/40">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate"><b className="text-sm">{l.name || "Lead"}</b> <span className="text-muted-foreground">{l.leadCode}{l.city ? ` · ${l.city}` : ""}</span></span>
        <StageBadge stage={l.stage} label={l.stageLabel} status={l.status} />
      </div>
      {l.why && <p className="mt-1 text-muted-foreground">{l.why}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {l.action && <NextAction p={{ action: l.action, score: l.callScore }} />}
        {l.value ? <span className="text-muted-foreground">{inrShort(l.value)}</span> : null}
        {showOwner && <span className="text-muted-foreground">· {l.owner || "Unassigned"}</span>}
      </div>
    </button>
  );
}

export function AssistantDrawer({ open, onOpenChange }) {
  const user = useSelector(selectUser);
  const scope = useSelector(selectScope);
  const isManager = scope && scope.kind !== "own";
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // "this lead" = the lead page that is open behind the drawer
  const leadId = matchPath("/leads/:id", pathname)?.params?.id || null;
  const { data: sug } = useAssistantSuggestionsQuery(leadId || undefined, { skip: !open });
  const [ask, { isLoading }] = useAskAssistantMutation();
  const [messages, setMessages] = useState(() => load(user?._id));
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => { save(user?._id, messages); }, [messages, user?._id]);
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: "end" }); }, [messages, open, isLoading]);

  const send = async (q) => {
    const question = String(q || "").trim();
    if (!question || isLoading) return;
    setText("");
    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "user", text: question }]);
    try {
      const r = await ask({ question, history, ...(leadId ? { leadId } : {}) }).unwrap();
      setMessages((m) => [...m, { role: "assistant", text: r.answer, leads: r.leads, source: r.source }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: errorText(e, "Could not answer just now"), error: true }]);
    }
  };

  // "What should I say?" on a lead page, or any other screen, can ask a question here
  useEffect(() => {
    const onAsk = (e) => { onOpenChange(true); setTimeout(() => send(e.detail), 0); };
    window.addEventListener("sales:ask-ai", onAsk);
    return () => window.removeEventListener("sales:ask-ai", onAsk);
  });

  const openLead = (id) => { onOpenChange(false); navigate(`/leads/${id}`); };
  const suggestions = sug?.suggestions || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4 text-left">
          <SheetTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{isManager ? "Management AI Assistant" : "AI Sales Assistant"}</SheetTitle>
          <SheetDescription className="text-xs">
            {isManager ? (scope.kind === "all" ? "Answers from every franchise lead and the whole team." : "Answers from your team's leads and the unassigned pool.") : "Answers only from your own leads."}
            {leadId ? " This lead is open — ask about it." : ""} Read-only: it suggests, you act.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!messages.length && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Ask in English or Hinglish, for example:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border bg-card px-3 py-1 text-left text-xs hover:border-primary/40 hover:bg-muted">{s}</button>)}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            m.role === "user" ? (
              <div key={i} className="ml-8 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">{m.text}</div>
            ) : (
              <div key={i} className={cn("mr-4 space-y-2 rounded-lg border bg-muted/30 px-3 py-2", m.error && "border-red-200 bg-red-50 text-red-700")}>
                <AnswerText text={m.text} leads={m.leads} onOpen={openLead} />
                {m.leads?.length > 0 && <div className="space-y-1.5">{m.leads.map((l) => <LeadCard key={l.leadId} l={l} showOwner={isManager} onOpen={openLead} />)}</div>}
                {m.source === "rules" && <p className="text-[10px] text-muted-foreground">Answered from the rules (AI not available right now).</p>}
              </div>
            )
          ))}
          {isLoading && <div className="mr-4 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Looking at your leads…</div>}
          {messages.length > 0 && !isLoading && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.slice(0, 4).map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border bg-card px-2.5 py-0.5 text-[11px] hover:bg-muted">{s}</button>)}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="flex items-end gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={500} placeholder={leadId ? "Ask about this lead or your leads…" : "Ask about your leads…"} className="min-h-0 resize-none text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
          <div className="flex flex-col gap-1">
            <Button type="submit" size="icon" disabled={isLoading || !text.trim()} title="Ask"><Send className="h-4 w-4" /></Button>
            {messages.length > 0 && <Button type="button" size="icon" variant="ghost" title="Clear the chat" onClick={() => setMessages([])}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
