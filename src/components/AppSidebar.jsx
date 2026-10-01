import { NavLink, useLocation } from "react-router-dom";
import { activeNavUrl, NAV_ACTIVE, NAV_IDLE } from "@/lib/activeNav";
import { useSelector } from "react-redux";
import {
  LayoutDashboard, Users, Flame, MessagesSquare, CalendarClock, CalendarDays, FileText, IndianRupee,
  ListChecks, TrendingUp, UserCircle, Inbox, UsersRound, Table2, Timer,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { selectScope } from "@/app/authSlice";
import { hasSalesRole } from "@/lib/roles";
import { useConversationsQuery, useFollowUpsQuery, useLeadCountsQuery } from "@/app/api";

// §6 — only what a salesperson needs; nothing from the admin dashboard
const MAIN = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Leads", url: "/leads", icon: Users },
  { title: "Hot Leads", url: "/hot-leads", icon: Flame, badge: "hot" },
  { title: "WhatsApp", url: "/whatsapp", icon: MessagesSquare, badge: "unread" },
  { title: "Follow-ups", url: "/follow-ups", icon: CalendarClock, badge: "overdue" },
  { title: "Meetings", url: "/meetings", icon: CalendarDays },
  { title: "Proposals", url: "/proposals", icon: FileText, soon: true },
  { title: "Payments", url: "/payments", icon: IndianRupee, soon: true },
  { title: "Tasks", url: "/tasks", icon: ListChecks },
  { title: "My Performance", url: "/performance", icon: TrendingUp, soon: true },
  { title: "Profile", url: "/profile", icon: UserCircle },
];
const CONTROL = [
  { title: "Unassigned Leads", url: "/control/unassigned", icon: Inbox },
  { title: "Team Leads", url: "/control/leads", icon: Table2 },
  { title: "Team", url: "/control/team", icon: UsersRound },
  { title: "SLA rules", url: "/control/sla", icon: Timer },
];

function Item({ item, badge, active }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink to={item.url} className={active ? NAV_ACTIVE : NAV_IDLE} aria-current={active ? "page" : undefined}>
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
          {item.soon && <span className="ml-auto rounded bg-muted px-1.5 text-[10px] text-muted-foreground">soon</span>}
        </NavLink>
      </SidebarMenuButton>
      {badge ? <SidebarMenuBadge className={item.badge === "unread" ? "bg-emerald-500 text-white" : item.badge === "overdue" ? "bg-red-600 text-white" : "bg-orange-500 text-white"}>{badge}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const scope = useSelector(selectScope);
  const { data } = useLeadCountsQuery(undefined, { pollingInterval: 0 });
  const { data: wa } = useConversationsQuery({ limit: 1 });
  const { data: fu } = useFollowUpsQuery({ view: "overdue" }, { pollingInterval: 120000 });
  const isManager = hasSalesRole(scope, "MANAGER");
  const { pathname } = useLocation();
  const current = activeNavUrl(pathname, [...MAIN, ...(isManager ? CONTROL : [])].map((i) => i.url));
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <img src="/red-logo.png" alt="MWG" className="h-8 w-8 rounded-md object-cover" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">MWG Franchise Sales</p>
            <p className="text-[11px] text-muted-foreground">Sales workspace</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN.map((item) => <Item key={item.url} item={item} active={current === item.url} badge={item.badge === "hot" ? data?.counts?.hot || null : item.badge === "unread" ? wa?.counts?.unread || null : item.badge === "overdue" ? fu?.counts?.overdue || null : null} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isManager && (
          <SidebarGroup>
            <SidebarGroupLabel>Control Center</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {CONTROL.map((item) => <Item key={item.url} item={item} active={current === item.url} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
        All chats use the official Mr. White Gloves WhatsApp — never a personal number.
      </SidebarFooter>
    </Sidebar>
  );
}
