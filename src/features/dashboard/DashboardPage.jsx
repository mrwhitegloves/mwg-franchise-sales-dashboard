import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Sparkles, Flame, CalendarClock, AlertTriangle, CalendarDays, FileText, IndianRupee, Trophy, Wallet, PhoneCall, RefreshCw, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard, EmptyState } from "@/components/LeadBits";
import { useDashboardQuery } from "@/app/api";
import { selectScope } from "@/app/authSlice";
import { hasSalesRole } from "@/lib/roles";
import { LeadsTable } from "@/features/leads/LeadsTable";
import { PageSkeleton } from "@/components/PageSkeleton";
import { inrShort } from "@/lib/format";

// §7 — MY FRANCHISE SALES DASHBOARD
export default function DashboardPage() {
  const scope = useSelector(selectScope);
  const isManager = hasSalesRole(scope, "MANAGER");
  const [view, setView] = useState("my");
  const { data, isLoading, isFetching, refetch } = useDashboardQuery(view);
  const navigate = useNavigate();
  const go = (filter, sort) => {
    const q = new URLSearchParams({ ...(filter ? { filter } : {}), ...(sort ? { sort } : {}) }).toString();
    navigate(`${view === "team" ? "/control/leads" : "/leads"}${q ? `?${q}` : ""}`);
  };

  if (isLoading) return <PageSkeleton />;
  const k = data?.kpis || {};
  const tiles = [
    { title: "New leads", value: k.newLeads, icon: Sparkles, tone: "indigo", filter: "new" },
    { title: "Hot leads", value: k.hotLeads, icon: Flame, tone: "orange", filter: "hot" },
    { title: "Follow-ups today", value: k.followUpsToday, icon: CalendarClock, tone: "sky", filter: "", sort: "followup", hint: "incl. team next actions" },
    { title: "Overdue", value: k.overdue, icon: AlertTriangle, tone: "red", filter: "overdue" },
    { title: "Meetings today", value: k.meetingsToday, icon: CalendarDays, tone: "violet", filter: "meeting" },
    { title: "Proposals pending", value: k.proposalsPending, icon: FileText, tone: "amber", filter: "proposal" },
    { title: "Payments pending", value: k.paymentsPending, icon: Wallet, tone: "amber", filter: "payment_pending" },
    { title: "Won this month", value: k.wonThisMonth, icon: Trophy, tone: "emerald", filter: "won" },
    { title: "Revenue this month", value: inrShort(k.revenueThisMonth), icon: IndianRupee, tone: "emerald", filter: "won", hint: k.revenueBasis === "plan_value" ? "plan value of won deals" : undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{view === "team" ? "Team franchise sales" : "My franchise sales dashboard"}</h1>
          <p className="text-sm text-muted-foreground">Live numbers — updates when leads are assigned or change.</p>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <Tabs value={view} onValueChange={setView}>
              <TabsList><TabsTrigger value="my">Mine</TabsTrigger><TabsTrigger value="team">{scope?.kind === "all" ? "Everyone" : "My team"}</TabsTrigger></TabsList>
            </Tabs>
          )}
          <Button variant="outline" size="icon" onClick={refetch} title="Refresh"><RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => <KpiCard key={t.title} {...t} value={t.value ?? 0} onClick={() => go(t.filter, t.sort)} />)}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><PhoneCall className="h-4 w-4 text-primary" />Call first</CardTitle>
          <span className="text-xs text-muted-foreground">Ready to buy → hot → overdue → new</span>
        </CardHeader>
        <CardContent>
          {data?.callFirst?.length
            ? <LeadsTable leads={data.callFirst} compact showOwner={view === "team"} />
            : <EmptyState icon={PhoneCall} title="Nothing urgent right now" text="New, hot and overdue leads show up here first."
                action={<Button size="sm" onClick={() => window.dispatchEvent(new Event("sales:create-lead"))}><Plus className="mr-1 h-4 w-4" />Create a lead</Button>} />}
        </CardContent>
      </Card>
    </div>
  );
}
