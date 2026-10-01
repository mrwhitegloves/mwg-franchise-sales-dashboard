import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  LayoutDashboard, Users, Flame, MessagesSquare, CalendarClock, CalendarDays, FileText, IndianRupee,
  ListChecks, TrendingUp, UserCircle, Inbox, UsersRound, Table2,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { selectScope } from "@/app/authSlice";
import { hasSalesRole } from "@/lib/roles";
import { useLeadCountsQuery } from "@/app/api";

// §6 — only what a salesperson needs; nothing from the admin dashboard
const MAIN = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Leads", url: "/leads", icon: Users },
  { title: "Hot Leads", url: "/hot-leads", icon: Flame, badge: "hot" },
  { title: "WhatsApp", url: "/whatsapp", icon: MessagesSquare, soon: true },
  { title: "Follow-ups", url: "/follow-ups", icon: CalendarClock, soon: true },
  { title: "Meetings", url: "/meetings", icon: CalendarDays, soon: true },
  { title: "Proposals", url: "/proposals", icon: FileText, soon: true },
  { title: "Payments", url: "/payments", icon: IndianRupee, soon: true },
  { title: "Tasks", url: "/tasks", icon: ListChecks, soon: true },
  { title: "My Performance", url: "/performance", icon: TrendingUp, soon: true },
  { title: "Profile", url: "/profile", icon: UserCircle },
];
const CONTROL = [
  { title: "Unassigned Leads", url: "/control/unassigned", icon: Inbox },
  { title: "Team Leads", url: "/control/leads", icon: Table2 },
  { title: "Team", url: "/control/team", icon: UsersRound },
];

const linkClass = ({ isActive }) =>
  isActive
    // Current screen: light red background so you always know where you are
    ? "flex items-center gap-3 rounded-lg !bg-red-50 px-3 py-2 font-semibold !text-red-700 ring-1 ring-red-100"
    : "flex items-center gap-3 rounded-lg !bg-transparent px-3 py-2 text-sidebar-foreground hover:!bg-sidebar-accent/60";

function Item({ item, badge }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink to={item.url} end={item.url === "/"} className={linkClass}>
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
          {item.soon && <span className="ml-auto rounded bg-muted px-1.5 text-[10px] text-muted-foreground">soon</span>}
        </NavLink>
      </SidebarMenuButton>
      {badge ? <SidebarMenuBadge className="bg-orange-500 text-white">{badge}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const scope = useSelector(selectScope);
  const { data } = useLeadCountsQuery(undefined, { pollingInterval: 0 });
  const isManager = hasSalesRole(scope, "MANAGER");
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
              {MAIN.map((item) => <Item key={item.url} item={item} badge={item.badge === "hot" && data?.counts?.hot ? data.counts.hot : null} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isManager && (
          <SidebarGroup>
            <SidebarGroupLabel>Control Center</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {CONTROL.map((item) => <Item key={item.url} item={item} />)}
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
