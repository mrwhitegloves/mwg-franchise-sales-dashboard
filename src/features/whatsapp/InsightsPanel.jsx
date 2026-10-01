// FS07 — AI qualification (§22) + conversation summary (§30) for one lead.
// Used next to the chat and on the lead page. Facts only from the lead / chat; the
// summary is refreshed by the server when the chat goes quiet.
import { AlertTriangle, Brain, CheckCircle2, CircleDashed, Flame, ListChecks, MessageCircleQuestion, ShieldAlert, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ago, dateTime, errorText } from "@/lib/format";

const BAND = {
  immediate: "bg-red-600 text-white", hot: "bg-red-100 text-red-700", qualified: "bg-orange-100 text-orange-700",
  nurture: "bg-amber-100 text-amber-700", low: "bg-sky-100 text-sky-700",
};

function Section({ icon, title, children, className }) {
  const Glyph = icon;
  return (
    <section className={cn("space-y-1.5", className)}>
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Glyph className="h-3.5 w-3.5" />{title}</h3>
      {children}
    </section>
  );
}

const Line = ({ label, value }) => (
  <div className="flex justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value || "—"}</span>
  </div>
);

export function InsightsPanel({ data, isLoading, error, className }) {
  if (isLoading) return <div className={cn("space-y-3 p-4", className)}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (error) return <p className={cn("p-4 text-sm text-red-600", className)}>{errorText(error)}</p>;
  if (!data) return null;
  const q = data.qualification || {};
  const s = data.summary || {};
  return (
    <div className={cn("space-y-5 p-4", className)}>
      {data.hot && (
        <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">
          <Flame className="mt-0.5 h-4 w-4 shrink-0" />
          <div><p className="font-semibold">{data.hot.label}</p>{data.hot.said && <p className="text-xs">“{data.hot.said}” · {ago(data.hot.at)}</p>}</div>
        </div>
      )}
      {data.handoff && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{data.handoff.status === "escalated" ? "AI handed this chat to the team" : "Needs attention"}</p>
            <p className="text-xs">{data.handoff.reasons.map((r) => r.label).join(", ")}</p>
          </div>
        </div>
      )}

      <Section icon={Brain} title="AI qualification">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl font-bold">{q.score ?? "—"}</span>
          {q.band && <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium capitalize", BAND[q.band] || "bg-muted")}>{q.band}</span>}
          {q.intent && <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{q.intent.replace(/_/g, " ").toLowerCase()}</span>}
        </div>
        {q.scoreReason && <p className="text-xs text-muted-foreground">{q.scoreReason}</p>}
        {q.nextAction && (
          <p className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-sm text-emerald-900">
            <span className="font-semibold">Next: </span>{q.nextAction.label}{q.nextAction.dueAt ? ` · due ${dateTime(q.nextAction.dueAt)}` : ""}
          </p>
        )}
      </Section>

      <Section icon={ListChecks} title={`Details known · ${q.completeness ?? 0}%`}>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-emerald-500" style={{ width: `${q.completeness ?? 0}%` }} /></div>
        <ul className="space-y-1 pt-1">
          {(q.fields || []).filter((f) => f.key !== "intent").map((f) => (
            <li key={f.key} className="flex items-start gap-2 text-sm">
              {f.value ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <span className="text-muted-foreground">{f.label}</span>
              <span className={cn("ml-auto text-right", f.value ? "font-medium" : "text-xs italic text-muted-foreground")}>{f.value ? String(f.value) : "ask"}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={Sparkles} title="Conversation summary">
        {s.leadSummary ? <p className="text-sm leading-relaxed">{s.leadSummary}</p> : <p className="text-sm text-muted-foreground">No summary yet.</p>}
        <div className="space-y-1 pt-1">
          <Line label="Investment" value={s.investment} />
          <Line label="Territory" value={s.territory} />
          <Line label="Plan" value={s.plan} />
          <Line label="Background" value={s.businessBackground} />
        </div>
        <p className="pt-1 text-[11px] text-muted-foreground">
          {s.source === "ai" ? "Written by AI from the chat" : "From the lead details"}{s.generatedAt ? ` · ${ago(s.generatedAt)}` : ""}{s.stale ? " · updating…" : ""}
        </p>
      </Section>

      {s.questionsAsked?.length > 0 && (
        <Section icon={MessageCircleQuestion} title="Questions they asked">
          <ul className="list-disc space-y-0.5 pl-4 text-sm">{s.questionsAsked.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </Section>
      )}
      {s.objections?.length > 0 && (
        <Section icon={AlertTriangle} title="Objections · how to answer">
          <ul className="space-y-2">
            {s.objections.map((o, i) => (
              <li key={i} className="rounded-md border p-2 text-sm">
                <p className="font-medium">{o.label}</p>
                {o.said && <p className="text-xs italic text-muted-foreground">“{o.said}”</p>}
                {o.response && <p className="mt-1 text-xs">{o.response}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {(s.recommendedNextAction || s.lastConversation) && (
        <Section icon={CheckCircle2} title="Recommended next action">
          {s.recommendedNextAction && <p className="text-sm font-medium">{s.recommendedNextAction}</p>}
          {s.recommendedResponse && <p className="text-xs text-muted-foreground">{s.recommendedResponse}</p>}
          {s.lastConversation && <p className="text-xs text-muted-foreground">Last message ({s.lastConversation.direction === "incoming" ? "them" : "us"}, {ago(s.lastConversation.at)}): “{String(s.lastConversation.text).slice(0, 140)}”</p>}
        </Section>
      )}
    </div>
  );
}
