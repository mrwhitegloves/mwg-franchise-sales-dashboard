// Which sidebar item is the current screen — exactly one.
// Exact path match first; otherwise the longest item whose path is a parent of the current
// path (so /leads/123 highlights "My Leads"). "/" only matches the dashboard itself.
export function activeNavUrl(pathname, urls) {
  if (urls.includes(pathname)) return pathname;
  let best = null;
  for (const u of urls) {
    if (u === "/") continue;
    if (pathname.startsWith(`${u}/`) && (!best || u.length > best.length)) best = u;
  }
  return best;
}

export const NAV_ACTIVE = "flex items-center gap-3 rounded-lg !bg-red-50 px-3 py-2 font-semibold !text-red-700 ring-1 ring-red-200";
export const NAV_IDLE = "flex items-center gap-3 rounded-lg !bg-transparent px-3 py-2 text-sidebar-foreground hover:!bg-sidebar-accent/60";
