// One WhatsApp message (ported from the admin inbox). Outgoing messages show who
// sent them — AI assistant or the salesperson — always via the central MWG number.
import { Fragment } from "react";
import {
  Bot, User, Megaphone, Check, CheckCheck, Clock, AlertCircle, FileText, FileImage, Mic, Video, Loader2, Reply, ExternalLink, Download, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleTime, fileKind, fileSize, fullTime, previewText } from "./waUtils";

const SENDER = {
  AI: { Icon: Bot, className: "text-emerald-700" },
  HUMAN: { Icon: User, className: "text-violet-700" },
  SYSTEM: { Icon: Megaphone, className: "text-sky-700" },
};

function Linkified({ text }) {
  const parts = String(text || "").split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) => (/^https?:\/\//.test(p)
    ? <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all text-sky-700 underline">{p}</a>
    : <Fragment key={i}>{p}</Fragment>));
}

function Ticks({ status, failureReason }) {
  if (status === "failed") return <span title={failureReason || "Delivery failed"}><AlertCircle className="h-3.5 w-3.5 text-red-500" /></span>;
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-sky-500" aria-label="Read" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" aria-label="Delivered" />;
  if (status === "sent") return <Check className="h-3.5 w-3.5 text-muted-foreground" aria-label="Sent" />;
  return <Clock className="h-3 w-3 text-muted-foreground" aria-label="Sending" />;
}

export function ReplyQuote({ quote, onJump, compact = false }) {
  if (!quote) return null;
  const incoming = quote.direction === "incoming";
  return (
    <button type="button" onClick={onJump} className={cn("mb-1 flex w-full items-stretch gap-2 overflow-hidden rounded-md bg-black/5 text-left hover:bg-black/10", compact && "bg-muted")}>
      <span className={cn("w-1 shrink-0", incoming ? "bg-violet-500" : "bg-emerald-500")} />
      <span className="min-w-0 flex-1 py-1 pr-2">
        <span className={cn("block text-[11px] font-semibold", incoming ? "text-violet-700" : "text-emerald-700")}>{incoming ? "Prospect" : "MWG"}</span>
        <span className="line-clamp-2 block text-xs text-slate-600">{previewText(quote) || "Original message not in this chat"}</span>
      </span>
    </button>
  );
}

function MediaBlock({ msg }) {
  const media = msg.media || {};
  const url = media.url || msg.mediaUrl;
  const type = msg.messageType;
  if (!url) {
    const pending = media.status === "pending";
    const Icon = { image: FileImage, video: Video, audio: Mic }[type] || FileText;
    return (
      <div className="mb-1 flex items-center gap-2 rounded-md bg-black/5 px-2.5 py-2 text-xs text-slate-600">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        <span className="truncate">{pending ? "Saving file…" : media.status === "failed" ? "File not available" : media.fileName || type}</span>
      </div>
    );
  }
  if (type === "image" || type === "sticker") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mb-1 block" title="Open in new tab">
        <img src={url} alt={media.fileName || "Image"} loading="lazy" className={cn("rounded-md object-cover", type === "sticker" ? "h-28 w-28 object-contain" : "max-h-72 w-full min-w-[180px]")} />
      </a>
    );
  }
  if (type === "video") return <video src={url} controls preload="metadata" className="mb-1 max-h-72 w-full rounded-md bg-black" />;
  if (type === "audio") return <audio src={url} controls preload="metadata" className="mb-1 w-64 max-w-full" />;
  const kind = fileKind(media.mimeType, media.fileName);
  return (
    <div className="mb-1 flex items-center gap-3 rounded-md bg-black/5 p-2">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", kind.className)}><kind.Icon className="h-5 w-5" /></span>
      <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800">{media.fileName || "Document"}</span>
        <span className="block text-[11px] text-slate-500">{kind.label}{media.size ? ` · ${fileSize(media.size)}` : ""}</span>
      </a>
      <a href={url} target="_blank" rel="noreferrer" className="rounded p-1 text-slate-500 hover:bg-black/10" aria-label="Open in new tab"><ExternalLink className="h-4 w-4" /></a>
      <a href={url} download={media.fileName || true} className="rounded p-1 text-slate-500 hover:bg-black/10" aria-label="Download"><Download className="h-4 w-4" /></a>
    </div>
  );
}

const MEDIA_TYPES = ["image", "video", "audio", "document", "sticker"];

export default function ChatBubble({ msg, me, onReply, onJump, highlighted }) {
  const out = msg.direction === "outgoing";
  const sender = out ? SENDER[msg.senderType] || SENDER.HUMAN : null;
  const senderLabel = msg.senderType === "HUMAN" && msg.senderUserId && msg.senderUserId === me ? "You" : msg.senderName || (msg.senderType === "SYSTEM" ? "Template / campaign" : "MWG team");
  const hasMedia = MEDIA_TYPES.includes(msg.messageType);
  const isReaction = msg.messageType === "reaction";
  const text = hasMedia && /^\[(Voice Message|Audio|Video|Sticker)\]$/.test(msg.content || "") ? "" : msg.content;
  const replyBtn = msg.canReply && (
    <button type="button" onClick={() => onReply(msg)} className="rounded-full p-1 text-slate-500 opacity-0 transition hover:bg-white/70 group-hover:opacity-100 focus:opacity-100" aria-label="Reply">
      <Reply className="h-4 w-4" />
    </button>
  );

  return (
    <div id={`msg-${msg.id}`} className={cn("group flex items-center gap-1", out ? "justify-end" : "justify-start")}>
      {out && replyBtn}
      <div className={cn(
        "max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm shadow-sm sm:max-w-[78%]",
        out ? "rounded-tr-none bg-[#d9fdd3] text-slate-900" : "rounded-tl-none bg-white text-slate-900",
        msg.status === "failed" && "ring-1 ring-red-300",
        highlighted && "ring-2 ring-amber-400",
      )}>
        {sender && (
          <div className={cn("mb-0.5 flex items-center gap-1 text-[11px] font-semibold", sender.className)}>
            <sender.Icon className="h-3 w-3" />{senderLabel}
            {msg.templateName && <span className="rounded bg-sky-100 px-1 font-mono text-[10px] font-normal text-sky-800">{msg.templateName}</span>}
          </div>
        )}
        {isReaction ? (
          <>
            <p className="text-xs text-slate-500">Reacted {msg.content} to</p>
            <ReplyQuote quote={msg.replyTo} onJump={() => onJump(msg.replyTo)} />
          </>
        ) : (
          <>
            {msg.replyTo && <ReplyQuote quote={msg.replyTo} onJump={() => onJump(msg.replyTo)} />}
            {hasMedia && <MediaBlock msg={msg} />}
            {msg.messageType === "location" && <MapPin className="mb-0.5 inline h-3.5 w-3.5 text-red-500" />}
            {(text || !hasMedia) && <p className="whitespace-pre-wrap break-words px-0.5 leading-snug"><Linkified text={text || "—"} /></p>}
          </>
        )}
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-slate-500">
          <span title={fullTime(msg.timestamp)}>{bubbleTime(msg.timestamp)}</span>
          {out && <Ticks status={msg.status} failureReason={msg.failureReason} />}
        </div>
      </div>
      {!out && replyBtn}
    </div>
  );
}
