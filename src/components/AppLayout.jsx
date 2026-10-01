import { lazy, Suspense, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, Plus, Search, UserCircle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AppSidebar } from "./AppSidebar";
import { SearchCommand } from "./SearchCommand";
const CreateLeadDialog = lazy(() => import("@/features/leads/CreateLeadDialog").then((m) => ({ default: m.CreateLeadDialog })));
import { useSocket } from "@/app/socketContext";
import { useLogoutMutation } from "@/app/api";
import { loggedOut, selectScope, selectUser } from "@/app/authSlice";
import { ROLE_LABEL } from "@/lib/stages";
import { cn } from "@/lib/utils";

const initials = (n = "") => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export function AppLayout() {
  const user = useSelector(selectUser);
  const scope = useSelector(selectScope);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status } = useSocket();
  const [logout] = useLogoutMutation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // ⌘K / Ctrl+K search; toasts can ask to open a lead
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen((o) => !o); }
    };
    const onOpen = (e) => navigate(`/leads/${e.detail}`);
    const onCreate = () => setCreateOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("sales:open-lead", onOpen);
    window.addEventListener("sales:create-lead", onCreate);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("sales:open-lead", onOpen);
      window.removeEventListener("sales:create-lead", onCreate);
    };
  }, [navigate]);

  const signOut = async () => {
    try { await logout().unwrap(); } catch { /* token may already be invalid */ }
    dispatch(loggedOut());
    navigate("/login", { replace: true });
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-[100vw] overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b bg-card px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger />
              <h2 className="hidden truncate text-lg font-medium sm:block">Welcome, {user?.name?.split(" ")[0]}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden w-56 justify-start text-muted-foreground md:flex" onClick={() => setSearchOpen(true)}>
                <Search className="mr-2 h-4 w-4" /> Search leads…
                <kbd className="ml-auto rounded border bg-muted px-1.5 text-[10px]">Ctrl K</kbd>
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)}><Search className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Create lead</span></Button>
              <span title={status === "online" ? "Live updates on" : "Reconnecting…"} className={cn("h-2.5 w-2.5 rounded-full", status === "online" ? "bg-emerald-500" : "animate-pulse bg-amber-500")} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials(user?.name)}</AvatarFallback></Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="truncate">{user?.name}</p>
                    <p className="text-xs font-normal text-muted-foreground">{ROLE_LABEL[scope?.salesRole] || "Sales"}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}><UserCircle className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-red-600"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      {createOpen && <Suspense fallback={null}><CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} /></Suspense>}
    </SidebarProvider>
  );
}
