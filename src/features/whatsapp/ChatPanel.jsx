// One franchise conversation: messages (newest page from the cache, older pages on
// demand), and the composer — text, files, templates, replies. Everything is sent
// by the backend through the central Mr. White Gloves WhatsApp number (§25, §56).
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Send, Loader2, AlertCircle, Info, Paperclip, X, FileText, ShieldCheck, ExternalLink, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { errorText, prettyPhone } from "@/lib/format";
import { selectUser } from "@/app/authSlice";
import {
  useConversationQuery, useLazyConversationQuery, useMarkConversationReadMutation, useSendWhatsappFileMutation, useSendWhatsappMutation,
} from "@/app/api";
import ChatBubble, { ReplyQuote } from "./ChatBubble";
import { TemplateDialog } from "./TemplateDialog";
import { AI_MODE, avatarColor, dayLabel, fileKind, fileSize, initials, windowInfo } from "./waUtils";

const ACCEPT = [
  "image/jpeg", "image/png", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".ppt", ".pptx", ".txt",
  "video/mp4", "video/3gpp", "audio/mpeg", "audio/ogg", "audio/aac", "audio/mp4", ".m4a",
].join(",");
const MAX_MB = 25;

function AttachmentPreview({ file, onRemove }) {
  const thumb = useMemo(() => (file?.type?.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (thumb) URL.revokeObjectURL(thumb); }, [thumb]);
  const kind = fileKind(file.type, file.name);
  return (
    <div className="mb-2 flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
      {thumb ? <img src={thumb} alt="" className="h-14 w-14 rounded object-cover" /> : <span className={cn("flex h-12 w-12 items-center justify-center rounded", kind.className)}><kind.Icon className="h-6 w-6" /></span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">{kind.label} · {fileSize(file.size)} — add a caption below (optional)</p>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} aria-label="Remove attachment"><X className="h-4 w-4" /></Button>
    </div>
  );
}

export function ChatPanel({ conversationId, onBack }) {
  const me = useSelector(selectUser)?._id;
  const { data, isLoading, isFetching, error } = useConversationQuery({ id: conversationId }, { refetchOnMountOrArgChange: true });
  const [loadOlder, { isFetching: loadingOlder }] = useLazyConversationQuery();
  const [markRead] = useMarkConversationReadMutation();
  const [sendText, { isLoading: sendingText }] = useSendWhatsappMutation();
  const [sendFile, { isLoading: sendingFile }] = useSendWhatsappFileMutation();
  const sending = sendingText || sendingFile;

  const [older, setOlder] = useState([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [flashId, setFlashId] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const nearBottom = useRef(true);
  const keepOffset = useRef(null);

  // (the page mounts a fresh ChatPanel per conversation — key={id} — so state starts empty)

  const conv = data?.conversation;
  // Older pages + the live newest page; the newest copy of a message wins (status ticks)
  const messages = useMemo(() => {
    const byId = new Map();
    for (const m of [...older, ...(data?.messages || [])]) byId.set(m.id, m);
    const sorted = [...byId.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    // day separator before the first message of each day
    return sorted.map((m, i) => {
      const day = m.timestamp ? dayLabel(m.timestamp) : null;
      const prev = i > 0 && sorted[i - 1].timestamp ? dayLabel(sorted[i - 1].timestamp) : null;
      return { ...m, dayHeader: day && day !== prev ? day : null };
    });
  }, [older, data?.messages]);
  const moreAvailable = hasMoreOlder ?? data?.hasMore;

  // Opening the chat (and new incoming messages while it is open) marks it read
  useEffect(() => {
    if (conv?.unreadCount > 0) markRead(conversationId);
  }, [conv?.unreadCount, conversationId, markRead]);

  // Scroll: bottom on open / new messages (if already near bottom); keep position after loading older
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (keepOffset.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    } else if (nearBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 40), 160)}px`;
    el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
  }, [text, file, replyTo]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const fetchOlder = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest) return;
    try {
      const r = await loadOlder({ id: conversationId, before: oldest.timestamp }).unwrap();
      keepOffset.current = scrollRef.current ? scrollRef.current.scrollHeight - scrollRef.current.scrollTop : null;
      // keep the current page too, so no message falls between pages when new ones arrive
      setOlder((o) => [...r.messages, ...o, ...(data?.messages || [])]);
      setHasMoreOlder(r.hasMore);
    } catch (e) { toast.error(errorText(e)); }
  }, [messages, loadOlder, conversationId, data?.messages]);

  const jumpTo = (quote) => {
    const target = quote?.messageId && messages.find((m) => m.id === quote.messageId);
    if (!target) return;
    document.getElementById(`msg-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(target.id);
    setTimeout(() => setFlashId(null), 1600);
  };

  const pickFile = (f) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`File is larger than ${MAX_MB} MB`); return; }
    setFile(f);
    inputRef.current?.focus();
  };

  const submit = async () => {
    const body = text.trim();
    if (sending || (!body && !file)) return;
    const replyToMessageId = replyTo?.id || undefined;
    try {
      nearBottom.current = true;
      if (file) await sendFile({ id: conversationId, file, caption: body, replyToMessageId }).unwrap();
      else await sendText({ id: conversationId, text: body, replyToMessageId }).unwrap();
      setText(""); setFile(null); setReplyTo(null);
    } catch (e) {
      if (e?.data?.code === "WINDOW_CLOSED") setTemplateOpen(true);
      toast.error(errorText(e));
    }
  };

  if (error) {
    const denied = error.status === 403 || error.status === 404;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#efeae2] p-6 text-center">
        <ShieldCheck className="h-10 w-10 text-slate-400" />
        <p className="text-sm font-medium">{denied ? "You don't have access to this conversation" : errorText(error)}</p>
        {denied && <p className="max-w-xs text-xs text-slate-500">It may have been moved to another salesperson.</p>}
        <Button variant="outline" size="sm" onClick={onBack}>Back to conversations</Button>
      </div>
    );
  }

  if (isLoading || !conv) {
    return (
      <div className="flex h-full flex-col bg-[#efeae2]">
        <div className="flex h-14 items-center gap-3 border-b bg-card px-4"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 w-40" /></div>
        <div className="flex-1 space-y-3 p-6">{[60, 45, 70, 50].map((w, i) => <Skeleton key={i} className={cn("h-10", i % 2 ? "ml-auto" : "")} style={{ width: `${w}%` }} />)}</div>
      </div>
    );
  }

  const win = windowInfo(data.conversation.lastInboundAt);
  const mode = AI_MODE[conv.aiMode] || AI_MODE.AI;

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack} aria-label="Back"><ArrowLeft className="h-4 w-4" /></Button>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold", avatarColor(conv.conversationId))}>{initials(conv.name)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{conv.name}</span>
            {conv.leadCode && <span className="hidden rounded bg-muted px-1.5 font-mono text-[10px] sm:inline">{conv.leadCode}</span>}
            <span className={cn("hidden rounded border px-1.5 py-px text-[10px] font-medium sm:inline", mode.className)}>{mode.label}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{prettyPhone(conv.phone)}</span>
            <span className={cn("flex items-center gap-1", win.open ? "text-emerald-600" : "text-amber-600")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", win.open ? "bg-emerald-500" : "bg-amber-500")} />{win.label}
            </span>
          </div>
        </div>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Button asChild variant="outline" size="sm" className="h-8"><Link to={`/leads/${conv.leadId}`}><ExternalLink className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Lead</span></Link></Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll}
        onDragOver={(e) => { if (win.open && !conv.optedOut) e.preventDefault(); }}
        onDrop={(e) => { if (!win.open || conv.optedOut) return; e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
        className="flex-1 space-y-1.5 overflow-y-auto bg-[#efeae2] px-3 py-3 md:px-8">
        {moreAvailable && (
          <div className="flex justify-center pb-1">
            <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={fetchOlder} disabled={loadingOlder}>
              {loadingOlder ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ChevronUp className="mr-1 h-3 w-3" />}Older messages
            </Button>
          </div>
        )}
        {messages.length === 0 && <p className="py-10 text-center text-xs text-slate-500">No messages yet.</p>}
        {messages.map((m) => {
          return (
            <Fragment key={m.id}>
              {m.dayHeader && <div className="flex justify-center py-1.5"><span className="rounded-md bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm">{m.dayHeader}</span></div>}
              <ChatBubble msg={m} me={me} onReply={(msg) => { setReplyTo(msg); inputRef.current?.focus(); }} onJump={jumpTo} highlighted={flashId === m.id} />
            </Fragment>
          );
        })}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t bg-card p-3">
        {conv.optedOut ? (
          <p className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4" />This person opted out of WhatsApp messages — please call them instead.</p>
        ) : !win.open ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Info className="h-4 w-4 shrink-0" />
            <span className="flex-1">WhatsApp allows only an approved template now (no message from them in the last 24 hours).</span>
            <Button size="sm" className="h-8" onClick={() => setTemplateOpen(true)}><FileText className="mr-1 h-3.5 w-3.5" />Send a template</Button>
          </div>
        ) : (
          <>
            {conv.aiMode !== "HUMAN" && <p className="mb-2 text-[11px] text-muted-foreground">Your message pauses the AI for this chat — you continue the conversation.</p>}
            {replyTo && (
              <div className="mb-2 flex items-start gap-2">
                <div className="min-w-0 flex-1"><ReplyQuote quote={replyTo} onJump={() => jumpTo({ messageId: replyTo.id })} compact /></div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X className="h-4 w-4" /></Button>
              </div>
            )}
            {file && <AttachmentPreview file={file} onRemove={() => setFile(null)} />}
            <div className="flex items-end gap-1.5">
              <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => fileRef.current?.click()} disabled={sending} aria-label="Attach a file" title="Attach image, PDF, Word, Excel, audio or video"><Paperclip className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setTemplateOpen(true)} disabled={sending} aria-label="Send a template" title="Send an approved WhatsApp template"><FileText className="h-5 w-5" /></Button>
              <Textarea ref={inputRef} value={text} rows={1} disabled={sending}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === "Escape") setReplyTo(null); }}
                onPaste={(e) => { const item = [...(e.clipboardData?.items || [])].find((i) => i.kind === "file"); if (item) { e.preventDefault(); pickFile(item.getAsFile()); } }}
                placeholder={file ? "Add a caption (optional)" : "Type a message"}
                className="min-h-[40px] resize-none py-2 leading-5" />
              <Button onClick={submit} disabled={(!text.trim() && !file) || sending} className="h-10 w-10 shrink-0 p-0" aria-label="Send">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
      <TemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} conversation={conv} />
    </div>
  );
}
