// §34 LEAD DETAIL — only what this user may see (the API returns 403 otherwise)
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft, Phone, MessageSquare, Pencil, GitBranch, XCircle, RotateCcw, UserCog, Bot, ShieldAlert, Send, Loader2, CalendarDays, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PriorityBadge, ScoreBadge, StageBadge } from "@/components/LeadBits";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useActivitiesQuery, useAddNoteMutation, useAssignmentHistoryQuery, useChangeStatusMutation, useLeadQuery } from "@/app/api";
import { selectScope } from "@/app/authSlice";
import { ago, dateOnly, dateTime, errorText, inr, prettyPhone, telLink } from "@/lib/format";
import { EditLeadSheet } from "./EditLeadSheet";
import { LostDialog, ReassignDialog, StageDialog } from "./LeadActions";
import { cn } from "@/lib/utils";

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
            <Button size="sm" variant="outline" disabled title="WhatsApp from the central MWG number — coming in FS06"><MessageSquare className="mr-1 h-4 w-4" />WhatsApp</Button>
            <Button size="sm" variant="outline" onClick={() => setDialog("edit")}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
            {lead.status !== "lost" && <Button size="sm" variant="outline" onClick={() => setDialog("stage")}><GitBranch className="mr-1 h-4 w-4" />Stage</Button>}
            {lead.status !== "lost"
              ? <Button size="sm" variant="outline" className="text-red-600" onClick={() => setDialog("lost")}><XCircle className="mr-1 h-4 w-4" />Close</Button>
              : isManager && <Button size="sm" variant="outline" disabled={reopening} onClick={async () => { try { await reopen({ id: lead.leadId, status: "open" }).unwrap(); toast.success("Reopened"); } catch (e) { toast.error(errorText(e)); } }}><RotateCcw className="mr-1 h-4 w-4" />Reopen</Button>}
            {isManager && <Button size="sm" variant="outline" onClick={() => setDialog("reassign")}><UserCog className="mr-1 h-4 w-4" />{lead.owner ? "Reassign" : "Assign"}</Button>}
          </div>
        </CardContent>
      </Card>

      {na && lead.status === "open" && (
        <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm", na.owner === "human" ? "border-orange-200 bg-orange-50" : "border-emerald-200 bg-emerald-50")}>
          <span><b>Next:</b> {na.label} <span className="text-muted-foreground">({na.owner === "human" ? "you" : "AI"})</span></span>
          {na.dueAt && <span className={cn("inline-flex items-center gap-1 text-xs", lead.overdue ? "font-semibold text-red-600" : "text-muted-foreground")}><Clock className="h-3 w-3" />{lead.overdue ? "Overdue · " : "Due "}{dateTime(na.dueAt)}</span>}
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai">AI qualification</TabsTrigger>
          <TabsTrigger value="notes">Notes ({lead.notes?.length || 0})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="kyc">KYC & onboarding</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="soon">WhatsApp · Proposal · Payment</TabsTrigger>
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
              <p className="text-xs text-muted-foreground">Conversation summary and "what to say next" arrive with the WhatsApp view (FS07).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes"><NotesTab lead={lead} /></TabsContent>
        <TabsContent value="timeline"><TimelineTab id={lead.leadId} /></TabsContent>

        <TabsContent value="meetings">
          {lead.meetings?.length ? (
            <Card><CardContent className="divide-y p-0">
              {lead.meetings.map((m) => (
                <div key={m._id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div><p className="font-medium">{m.title}</p><p className="text-xs text-muted-foreground">{dateTime(m.startAt)} · {m.status}</p></div>
                  {m.link && <a className="text-xs text-primary underline" href={m.link} target="_blank" rel="noreferrer">Join</a>}
                </div>
              ))}
            </CardContent></Card>
          ) : <EmptyState icon={CalendarDays} title="No meetings yet" text="Scheduling meetings from the Sales App comes in FS08." />}
        </TabsContent>

        <TabsContent value="kyc">
          <Card><CardContent className="p-4">
            <Row label="KYC status" value={lead.kyc?.status ? `${lead.kyc.status} (since ${dateOnly(lead.kyc.submittedAt)})` : "Not submitted"} />
            <Row label="Onboarding" value={lead.onboarding ? `${lead.onboarding.code} · ${lead.onboarding.status}` : "Not started"} />
            {lead.onboarding && <Row label="Current step" value={`${(lead.onboarding.currentStep || "—").replace(/_/g, " ")}${lead.onboarding.dueAt ? ` · due ${dateTime(lead.onboarding.dueAt)}` : ""}`} />}
            {lead.onboarding?.progress && <Row label="Progress" value={`${lead.onboarding.progress.done} / ${lead.onboarding.progress.total} steps`} />}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="assignment"><AssignmentTab id={lead.leadId} /></TabsContent>

        <TabsContent value="soon">
          <EmptyState icon={MessageSquare} title="Coming next" text="WhatsApp conversation (FS06), proposals and payments (FS09) will appear on this lead." />
        </TabsContent>
      </Tabs>

      {dialog === "edit" && <EditLeadSheet lead={lead} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "stage" && <StageDialog lead={lead} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "lost" && <LostDialog lead={lead} open onOpenChange={(o) => !o && setDialog(null)} />}
      {dialog === "reassign" && <ReassignDialog lead={lead} open onOpenChange={(o) => !o && setDialog(null)} />}
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

function TimelineTab({ id }) {
  const { data, isLoading } = useActivitiesQuery(id);
  if (isLoading) return <PageSkeleton />;
  return (
    <Card><CardContent className="p-4">
      <ol className="relative space-y-4 border-l pl-5">
        {(data?.activities || []).map((a, i) => (
          <li key={i} className="text-sm">
            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            <p>{a.summary || a.type.replace(/_/g, " ").toLowerCase()}</p>
            <p className="text-xs text-muted-foreground">{dateTime(a.at)}{a.by ? ` · ${a.by}` : ""}</p>
          </li>
        ))}
      </ol>
    </CardContent></Card>
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
