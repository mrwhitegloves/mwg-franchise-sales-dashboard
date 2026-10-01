// Lead detail → its WhatsApp chat on the central MWG number (opens it, or starts one)
import { useNavigate } from "react-router-dom";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLeadConversationQuery, useStartConversationMutation } from "@/app/api";
import { errorText } from "@/lib/format";

export function WhatsAppButton({ leadId }) {
  const navigate = useNavigate();
  const { data, isLoading } = useLeadConversationQuery(leadId);
  const [start, { isLoading: starting }] = useStartConversationMutation();
  const open = async () => {
    try {
      const id = data?.conversationId || (await start(leadId).unwrap()).conversationId;
      navigate(`/whatsapp/${id}`);
    } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <Button size="sm" variant="outline" onClick={open} disabled={isLoading || starting}
      title={data?.conversationId ? "Open the WhatsApp chat" : "Start a WhatsApp chat (first message = approved template)"}>
      {starting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-1 h-4 w-4 text-emerald-600" />}WhatsApp
    </Button>
  );
}
