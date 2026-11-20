// Service Zones Z7: on a franchise lead — "12 customers waiting in Patna" / "MWG works in
// Jamshedpur" — so the salesperson can use it in the pitch. Counts only.
import { MapPinned } from "lucide-react";
import { usePlaceInfoQuery } from "@/app/api";

export default function CityDemandHint({ city }) {
  const { data } = usePlaceInfoQuery({ city }, { skip: !city });
  if (!city || !data) return null;
  const d = data.demand;
  const text = data.zone
    ? `MWG works in ${data.zone.name}${d?.people ? ` · ${d.people} customer${d.people === 1 ? "" : "s"} waiting in areas without a partner` : ""}`
    : d?.people
      ? `${d.people} customer${d.people === 1 ? "" : "s"} in ${d.city} already asked for MWG — no partner there yet`
      : `No MWG partner in ${city} yet`;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${data.zone ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
      <MapPinned className="h-3.5 w-3.5" />{text}
    </span>
  );
}
