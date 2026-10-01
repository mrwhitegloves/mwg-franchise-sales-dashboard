import { Construction } from "lucide-react";
import { EmptyState } from "@/components/LeadBits";

export default function ComingSoonPage({ title, chapter, text }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <EmptyState icon={Construction} title={`Coming in ${chapter}`} text={text} />
    </div>
  );
}
