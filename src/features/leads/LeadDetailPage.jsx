// §34 LEAD DETAIL — only what this user may see (the API returns 403 otherwise)
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft, Phone, MessageSquare, Pencil, GitBranch, XCircle, RotateCcw, UserCog, Bot, ShieldAlert, Send, Loader2, CalendarDays, Clock, Lightbulb, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PriorityBadge, ScoreBadge, StageBadge } from "@/components/LeadBits";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useActivitiesQuery, useAddNoteMutation, useAssignmentHistoryQuery, useChangeStatusMutation, useLeadQuery } from "@/app/api";
import { WhatsAppButton } from "@/features/whatsapp/WhatsAppButton";
import { InsightsPanel } from "@/features/whatsapp/InsightsPanel";
import { TaskList } from "@/features/work/TaskList";
import { TaskDialog } from "@/features/work/TaskDialogs";
import { MeetingDialog } from "@/features/work/MeetingDialogs";
import { MeetingRow } from "@/features/work/MeetingsPage";
import { OnboardingTab, PaymentsTab, ProposalsTab } from "@/features/deals/LeadDealTabs";
import { useLeadTasksQuery, useLazyActivitiesQuery } from "@/app/api";
import { useLeadInsightsQuery } from "@/app/api";
import { selectScope } from "@/app/authSlice";
import { ago, dateTime, errorText, inr, prettyPhone, telLink } from "@/lib/format";
import { EditLeadSheet } from "./EditLeadSheet";
import { LostDialog, ReassignDialog, StageDialog } from "./LeadActions";
import { cn } from "@/lib/utils";

// FS07: §22 qualification details + §30 conversation summary (same panel as next to the chat)
function LeadInsightsCard({ leadId }) {
  const { data, isLoading, error } = useLeadInsightsQuery(leadId);
  return <Card className="mt-4"><CardContent className="p-0"><InsightsPanel data={data} isLoading={isLoading} error={error} /></CardContent></Card>;
}

const v = (x) => (x && typeof x === "object" ? x.value : x);

function Row({ label, value, children }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children ?? (value || "—")}</span>
    </div>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const scope = useSelector(selectScope);
  const isManager = scope?.kind !== "own";
  const { data, error, isLoading } = useLeadQuery(id);
  const [params, setParams] = useSearchParams();
  // "?edit=1" (✎ in a lead list) opens the edit modal straight away
  const [dialog, setDialog] = useState(() => (params.get("edit") === "1" ? "edit" : null));
  useEffect(() => { if (params.get("edit")) setParams({}, { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [reopen, { isLoading: reopening }] = useChangeStatusMutation();

  // Reassigned away while open → the user loses access (§27)
  useEffect(() => {
    const onRevoked = (e) => { if (e.detail === id && !isManager) { toast.info("This lead now belongs to another salesperson"); navigate("/leads", { replace: true }); } };
    window.addEventListener("sales:lead-revoked", onRevoked);
    return () => window.removeEventListener("sales:lead-revoked", onRevoked);
  }, [id, isManager, navigate]);

  if (isLoading) return <PageSkeleton />;
  if (error) {
    return (
      <EmptyState icon={ShieldAlert} title={error.status === 403 ? "You don't have access to this lead" : "Lead not found"}
        text={error.status === 403 ? "It belongs to another salesperson or is not a franchise lead." : "It may have been removed."}
        action={<Button variant="outline" onClick={() => navigate("/leads")}>Back to my leads</Button>} />
    );
  }
  const lead = data.lead;
  const r = lead.requirement || {};
  const ai = lead.aiQualification || {};
  const na = lead.nextAction;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold">{lead.name || "Lead"}</h1>
              <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">{lead.leadCode}</span>
              <StageBadge stage={lead.stage} label={lead.stageLabel} status={lead.status} lostReason={lead.lostReason} />
              <ScoreBadge score={lead.leadScore} band={lead.band} hot={lead.hot} />
              <PriorityBadge priority={lead.priority} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <a href={telLink(lead.phone)} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3.5 w-3.5" />{prettyPhone(lead.phone)}</a>
              <span>{[lead.city, lead.state].filter(Boolean).join(", ") || "—"}</span>
              <span>{lead.source}</span>
              <span>Owner: <b className="text-foreground">{lead.owner?.name || "Unassigned"}</b>{lead.assignmentMethod ? ` (${lead.assignmentMethod.replace(/_/g, " ").toLowerCase()})` : ""}</span>
              {lead.opportunityValue ? <span>Value: <b className="text-foreground">{inr(lead.opportunityValue)}</b>{lead.opportunityPlan ? ` · ${lead.opportunityPlan}` : ""}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm"><a href={telLink(lead.phone)}><Phone className="mr-1 h-4 w-4" />Call</a></Button>
            <WhatsAppButton leadId={lead.leadId} />
            <Button size="sm" variant="outline" onClick={() => setDialog("edit")}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
            {lead.status !== "lost" && <Button size="sm" variant="outline" onClick={() => setDialog("stage")}><GitBranch className="mr-1 h-4 w-4" />Stage</Button>}
            {lead.status !== "lost"
              ? <Button size="sm" variant="outline" className="text-red-600" onClick={() => setDialog("lost")}><XCircle className="mr-1 h-4 w-4" />Close</Button>
              : isManager && <Button size="sm" variant="outline" disabled={reopening} onClick={async () => { try { await reopen({ id: lead.leadId, status: "open" }).unwrap(); toast.success("Reopened"); } catch (e) { toast.error(errorText(e)); } }}><RotateCcw className="mr-1 h-4 w-4" />Reopen</Button>}
            {isManager && <Button size="sm" variant="outline" onClick={() => setDialog("reassign")}><UserCog className="mr-1 h-4 w-4" />{lead.owner ? "Reassign" : "Assign"}</Button>}
          </div>
        </CardContent>
      </Card>

      {/* FS12: next best action + why this lead is where it is on the call-first list */}
      {lead.status === "open" && lead.callPriority?.action && (
        <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-sky-700" /><b>Next best action: {lead.callPriority.action.label}</b> <span className="text-xs text-muted-foreground">· call-first score {lead.callPriority.score}</span></p>
            <p className="text-muted-foreground">{lead.callPriority.action.why}</p>
            {lead.callPriority.reasons?.length > 0 && <div className="flex flex-wrap gap-1">{lead.callPriority.reasons.map((x) => <span key={x} className="rounded bg-white/70 px-1.5 py-0.5 text-[11px] text-sky-900">{x}</span>)}</div>}
          </div>
          <Button size="sm" variant="outline" className="bg-white" onClick={() => window.dispatchEvent(new CustomEvent("sales:ask-ai", { detail: "What should I say next?" }))}><Sparkles className="mr-1 h-4 w-4" />What should I say?</Button>
        </div>
      )}

      {lead.status === "open" && (lead.followUp ? (
        // The salesperson's own planned follow-up wins over the system's suggestion (FS08)
        <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm", lead.followUp.overdue ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50")}>
          <span><b>Next follow-up:</b> {lead.followUp.title || "Follow up"} <span className="text-muted-foreground">(planned)</span></span>
          <span className={cn("inline-flex items-center gap-1 text-xs", lead.followUp.overdue ? "font-semibold text-red-600" : "text-muted-foreground")}><Clock className="h-3 w-3" />{lead.followUp.overdue ? "Overdue · " : "Due "}{dateTime(lead.followUp.at)}</span>
        </div>
      ) : na && (
        <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm", na.owner === "human" ? "border-orange-200 bg-orange-50" : "border-emerald-200 bg-emerald-50")}>
          <span><b>Next:</b> {na.label} <span className="text-muted-foreground">({na.owner === "human" ? "you" : "AI"})</span></span>
          {na.dueAt && <span className={cn("inline-flex items-center gap-1 text-xs", lead.overdue ? "font-semibold text-red-600" : "text-muted-foreground")}><Clock className="h-3 w-3" />{lead.overdue ? "Overdue · " : "Due "}{dateTime(na.dueAt)}</span>}
        </div>
      ))}

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai">AI qualification</TabsTrigger>
          <TabsTrigger value="notes">Notes ({lead.notes?.length || 0})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups{lead.followUp ? (lead.followUp.overdue ? " ⚠" : " •") : ""}</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="kyc">KYC & onboarding</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>

        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Lead information</CardTitle></CardHeader>
            <CardContent>
              <Row label="Phone / WhatsApp" value={prettyPhone(lead.info?.phone)} />
              <Row label="Email" value={lead.info?.email} />
              <Row label="City / State" value={[lead.info?.city, lead.info?.state].filter(Boolean).join(", ")} />
              <Row label="Source" value={lead.info?.source} />
              <Row label="Campaign / form" value={lead.info?.campaign || lead.info?.form} />
              <Row label="Came in" value={dateTime(lead.info?.createdAt)} />
              <Row label="Last contact" value={lead.lastContactAt ? ago(lead.lastContactAt) : null} />
              <Row label="Idle for" value={lead.daysSinceActivity !== null ? `${lead.daysSinceActivity} days` : null} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Franchise requirement</CardTitle></CardHeader>
            <CardContent>
              <Row label="Investment capacity" value={r.investmentCapacity} />
              <Row label="Preferred territory" value={v(r.preferredTerritory)} />
              <Row label="Franchise model / plan" value={v(r.franchiseModel) || (r.opportunityPlan ? `${r.opportunityPlan} (estimate)` : null)} />
              <Row label="Expected timeline" value={r.expectedTimeline} />
              <Row label="Business experience" value={r.businessExperience} />
              <Row label="Current business" value={v(r.currentBusiness)} />
              <Row label="Business background" value={v(r.businessBackground)} />
              <Row label="Kit requirement" value={v(r.kitRequirement)} />
              <Row label="Expected launch" value={v(r.expectedLaunch)} />
              <Row label="Decision maker" value={v(r.decisionMaker)} />
              <Row label="Opportunity value" value={lead.opportunityValue ? inr(lead.opportunityValue) : null} />
            </CardContent>
          </Card>
          {r.formAnswers?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">Form answers</CardTitle></CardHeader>
              <CardContent className="grid gap-x-6 md:grid-cols-2">
                {r.formAnswers.map((a, i) => <Row key={i} label={a.question} value={a.answer} />)}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4" />AI qualification</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-3"><ScoreBadge score={ai.score} band={ai.band} hot={lead.hot} /><span className="text-muted-foreground">{ai.bandLabel || ai.band}</span>{ai.intent && <span className="rounded-full border px-2 text-xs">{ai.intent.replace(/_/g, " ").toLowerCase()}</span>}</div>
              {ai.reason && <p><b>Why this score:</b> {ai.reason}</p>}
              {ai.aiOpinion && <p><b>AI reviewer:</b> {ai.aiOpinion}</p>}
              {ai.missing?.length > 0 && <p><b>Still to find out:</b> {ai.missing.join(", ")}</p>}
            </CardContent>
          </Card>
          <LeadInsightsCard leadId={lead.leadId} />
        </TabsContent>

        <TabsContent value="notes"><NotesTab lead={lead} /></TabsContent>
        <TabsContent value="timeline"><TimelineTab id={lead.leadId} /></TabsContent>

        <TabsContent value="followups"><FollowUpsTab lead={lead} /></TabsContent>

        <TabsContent value="meetings">
          <div className="mb-2 flex justify-end"><Button size="sm" onClick={() => setDialog("meeting")}><CalendarDays className="mr-1 h-4 w-4" />Schedule meeting</Button></div>
          {lead.meetings?.length ? (
            <Card><CardContent className="divide-y p-0">
              {lead.meetings.map((m) => (
                <MeetingRow key={m._id} showLead={false} m={{ id: m._id, title: m.title, type: m.type, start: m.startAt, end: m.endAt, status: m.status, meetLink: m.link, outcome: m.outcome, lead: { id: lead.leadId } }} />
              ))}
            </CardContent></Card>
          ) : <EmptyState icon={CalendarDays} title="No meetings yet" text="Schedule a video (Google Meet), phone or in-person meeting — it lands on your follow-ups with a reminder." />}
        </TabsContent>

        <TabsContent value="proposals"><ProposalsTab lead={lead} /></TabsContent>
        <TabsContent value="payments"><PaymentsTab lead={lead} /></TabsContent>
        <TabsContent value="kyc"><OnboardingTab lead={lead} /></TabsContent>

        <TabsContent value="assignment"><AssignmentTab id={lead.leadId} /></TabsContent>

      </Tabs>

      {dialog === "edit" && <EditLeadSheet lead={lead} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "stage" && <StageDialog lead={lead} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "lost" && <LostDialog lead={lead} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "reassign" && <ReassignDialog lead={lead} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "meeting" && <MeetingDialog open leadId={lead.leadId} leadName={lead.name} onOpenChange={(o) => !o && setDialog(null)} />}
      <p className="text-center text-[11px] text-muted-foreground"><Link to="/leads" className="underline">My leads</Link></p>
    </div>
  );
}

function NotesTab({ lead }) {
  const [text, setText] = useState("");
  const [add, { isLoading }] = useAddNoteMutation();
  const save = async () => {
    try { await add({ id: lead.leadId, text }).unwrap(); setText(""); toast.success("Note added"); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-2">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note — what they said, what you promised…" />
          <Button className="self-end" disabled={!text.trim() || isLoading} onClick={save}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </div>
        {lead.notes?.length ? lead.notes.map((n, i) => (
          <div key={n._id || i} className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="whitespace-pre-wrap">{n.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">{n.by || "System"} · {dateTime(n.at)}</p>
          </div>
        )) : <p className="text-sm text-muted-foreground">No notes yet.</p>}
      </CardContent>
    </Card>
  );
}

const TL_GROUPS = [["", "All"], ["calls", "Calls"], ["messages", "WhatsApp"], ["followups", "Follow-ups"], ["meetings", "Meetings"], ["stage", "Stage"], ["assignment", "Assignment"], ["ai", "AI"], ["notes", "Notes & views"]];

function TimelineTab({ id }) {
  const [group, setGroup] = useState("");
  const [older, setOlder] = useState([]);
  const [more, setMore] = useState(null);
  const { data, isLoading } = useActivitiesQuery({ id, group });
  const [loadOlder, { isFetching }] = useLazyActivitiesQuery();
  const items = [...(data?.activities || []), ...older];
  const pick = (g) => { setGroup(g); setOlder([]); setMore(null); };
  const fetchOlder = async () => {
    const last = items[items.length - 1];
    if (!last) return;
    const r = await loadOlder({ id, group, before: last.at }).unwrap();
    setOlder((o) => [...o, ...r.activities]);
    setMore(r.hasMore);
  };
  const hasMore = more ?? data?.hasMore;
  return (
    <Card><CardContent className="space-y-3 p-4">
      <div className="flex flex-wrap gap-1">
        {TL_GROUPS.map(([v, l]) => <button key={v || "all"} type="button" onClick={() => pick(v)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", group === v ? "border-red-200 bg-red-50 font-semibold text-red-700" : "hover:bg-muted")}>{l}</button>)}
      </div>
      {isLoading ? <PageSkeleton /> : !items.length ? <p className="text-sm text-muted-foreground">Nothing here yet.</p> : (
        <ol className="relative space-y-4 border-l pl-5">
          {items.map((a, i) => (
            <li key={i} className="text-sm">
              <span className={cn("absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background", /MISSED|ESCALATED/.test(a.type) ? "bg-red-500" : /AI_/.test(a.type) ? "bg-emerald-500" : "bg-primary")} />
              <p>{a.summary || a.type.replace(/_/g, " ").toLowerCase()}</p>
              <p className="text-xs text-muted-foreground">{dateTime(a.at)}{a.by ? ` · ${a.by}` : ""}</p>
            </li>
          ))}
        </ol>
      )}
      {hasMore && <div className="text-center"><Button variant="outline" size="sm" disabled={isFetching} onClick={fetchOlder}>{isFetching ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}Older</Button></div>}
    </CardContent></Card>
  );
}

// §31 — this lead's follow-ups: open ones first, then the history
function FollowUpsTab({ lead }) {
  const { data, isLoading } = useLeadTasksQuery(lead.leadId);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{lead.followUp ? `Next: ${dateTime(lead.followUp.at)}${lead.followUp.overdue ? " — overdue" : ""}` : "No follow-up planned — the AI keeps nudging on WhatsApp until you plan one."}</p>
        <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}><CalendarDays className="mr-1 h-4 w-4" />Plan follow-up</Button>
      </div>
      {isLoading ? <PageSkeleton /> : (
        <>
          <Card><CardContent className="p-0"><TaskList items={data?.open || []} showLead={false} showDate empty={<p className="p-4 text-sm text-muted-foreground">Nothing open.</p>} /></CardContent></Card>
          {data?.done?.length > 0 && (
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Done</CardTitle></CardHeader><CardContent className="p-0"><TaskList items={data.done} showLead={false} showDate /></CardContent></Card>
          )}
        </>
      )}
      {open && <TaskDialog open leadId={lead.leadId} leadName={lead.name} onOpenChange={setOpen} />}
    </div>
  );
}

function AssignmentTab({ id }) {
  const { data, isLoading } = useAssignmentHistoryQuery(id);
  if (isLoading) return <PageSkeleton />;
  const rows = data?.history || [];
  if (!rows.length) return <EmptyState icon={UserCog} title="Not assigned yet" text="The lead is waiting in the unassigned pool." />;
  return (
    <Card><CardContent className="divide-y p-0">
      {rows.map((h, i) => (
        <div key={i} className="p-3 text-sm">
          <p><b>{h.newOwner || "Unassigned pool"}</b>{h.previousOwner ? <span className="text-muted-foreground"> (from {h.previousOwner})</span> : null} · {h.method?.replace(/_/g, " ").toLowerCase()}</p>
          <p className="text-xs text-muted-foreground">{dateTime(h.at)} · by {h.assignedBy || "—"}{h.ownedForHours !== null ? ` · owned ${h.ownedForHours} h` : ""}{h.endedAt ? " · ended" : " · current"}</p>
          {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
        </div>
      ))}
    </CardContent></Card>
  );
}
