// Web Push for the Sales App (FS10): service worker + subscription saved for this person
// (workspace FRANCHISE_SALES — admin dashboard pushes never arrive here).
import { SALES_API } from "@/lib/config";
import { store } from "@/app/store";

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const call = async (path, body) => {
  const token = store.getState().auth.token;
  const res = await fetch(`${SALES_API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
};

function keyBytes(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerWorker() {
  if (!pushSupported()) return null;
  try { return await navigator.serviceWorker.register("/sw.js"); } catch { return null; }
}

/** 'unsupported' | 'denied' | 'on' | 'off' */
export async function pushStatus() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export async function enablePush() {
  if (!pushSupported()) throw new Error("This browser cannot show notifications");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked — allow them in the browser settings");
  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerWorker());
  if (!reg) throw new Error("Could not start notifications on this device");
  const { publicKey } = await call("/push/key");
  if (!publicKey) throw new Error("Push is not configured on the server");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  await call("/push/subscribe", sub.toJSON());
  return "on";
}

export async function disablePush() {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await call("/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => null);
    await sub.unsubscribe().catch(() => null);
  }
  return "off";
}

export const testPush = () => call("/push/test", {});

/** On sign-in: keep this device's subscription linked to the signed-in person */
export async function refreshSubscription() {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const reg = await registerWorker();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) await call("/push/subscribe", sub.toJSON()).catch(() => null);
}

/** On sign-out: this device stops receiving the previous person's pushes */
export async function forgetSubscription() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await call("/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => null);
    await sub.unsubscribe().catch(() => null);
  }
}
