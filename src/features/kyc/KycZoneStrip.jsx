// Service Zones Z7 (2026-11-20): where this franchise will work — the city's zone and
// how many customers already wait there (app "Notify me", app customers, WhatsApp leads).
import { MapPin } from "lucide-react";
import { useKycZoneQuery } from "@/app/api";

const STATUS = { live: "live", coming_soon: "coming soon", paused: "paused" };

function zoneLine(info) {
  if (!info) return null;
  const city = info.city || info.demand?.city || "this city";
  const zone = info.zone
    ? `Zone ${info.zone.name} (${STATUS[info.zone.status] || info.zone.status}, ${info.zone.pincodeCount} pincodes)`
    : `${city}: no zone yet — create one on Service Zones when this franchise starts`;
  const d = info.demand;
  const wait = d && d.people
    ? `${d.people} customer${d.people === 1 ? "" : "s"} waiting in ${d.city} (${[d.sources.notify && `${d.sources.notify} notify me`, d.sources.app_user && `${d.sources.app_user} app`, d.sources.wa_lead && `${d.sources.wa_lead} WhatsApp`].filter(Boolean).join(", ")})`
    : "no customers waiting there yet";
  return { zone, wait, isNew: !info.zone };
}

export default function KycZoneStrip({ id }) {
  const { data, isError } = useKycZoneQuery(id);
  const line = zoneLine(data);
  if (isError || !line) return null;
  return (
    <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs ${line.isNew ? "border-orange-200 bg-orange-50 text-orange-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      <MapPin className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold">{line.zone}</span>
      <span>· {line.wait}</span>
    </div>
  );
}
