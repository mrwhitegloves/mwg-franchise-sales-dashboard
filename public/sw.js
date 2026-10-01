/* MWG Franchise Sales — service worker for Web Push (FS10).
   The server sends { title, body, url, tag, category, requireInteraction }.
   Tapping a notification focuses an open Sales App tab (or opens one) on its link. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "MWG Franchise Sales", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "MWG Franchise Sales";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    icon: "/red-logo.png",
    badge: "/icon.png",
    requireInteraction: !!data.requireInteraction,
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const tab of tabs) {
      if (tab.url.startsWith(self.location.origin)) {
        await tab.focus();
        if ("navigate" in tab) return tab.navigate(url);
        return undefined;
      }
    }
    return self.clients.openWindow(url);
  })());
});
