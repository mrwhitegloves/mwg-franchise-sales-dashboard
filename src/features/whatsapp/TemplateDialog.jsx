// Send an approved WhatsApp template (the only way after the 24-hour window closes).
// {{1}} = first name, {{2}} = city are filled in; the salesperson can change them.
import { useMemo, useState } from "react";
import { FileText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendWhatsappTemplateMutation, useWaTemplatesQuery } from "@/app/api";
import { errorText } from "@/lib/format";
import { cn } from "@/lib/utils";

const fill = (text, values) => String(text || "").replace(/\{\{\s*(\d+)\s*\}\}/g, (m, i) => values[Number(i) - 1] || m);

export function TemplateDialog({ open, onOpenChange, conversation }) {
  const { data, isLoading, error } = useWaTemplatesQuery(undefined, { skip: !open });
  const [send, { isLoading: sending }] = useSendWhatsappTemplateMutation();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(null);
  const [values, setValues] = useState([]);
  const [media, setMedia] = useState("");

  const defaults = useMemo(() => {
    const first = String(conversation?.name || "").trim().split(/\s+/)[0];
    return [first && !/^\+?\d+$/.test(first) ? first : "", conversation?.city || ""];
  }, [conversation]);

  const pick = (t) => {
    setPicked(t);
    setValues(Array.from({ length: t.bodyParamCount }, (_, i) => defaults[i] || ""));
    setMedia(t.headerExampleUrl || "");
  };
  const close = (o) => { onOpenChange(o); if (!o) setPicked(null); };
  const list = (data?.templates || []).filter((t) => !q || `${t.name} ${t.bodyText}`.toLowerCase().includes(q.toLowerCase()));
  const needsMedia = picked && ["IMAGE", "VIDEO", "DOCUMENT"].includes(picked.headerType);

  const submit = async () => {
    try {
      await send({ id: conversation.conversationId, templateName: picked.name, language: picked.language, params: values, ...(needsMedia ? { headerMediaUrl: media } : {}) }).unwrap();
      toast.success("Template sent");
      close(false);
    } catch (e) { toast.error(errorText(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Send a WhatsApp template</DialogTitle>
          <DialogDescription>Approved templates can be sent any time — also after the 24-hour window has closed. Sent from the official Mr. White Gloves number.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
          <div className="flex min-h-0 flex-col">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="max-h-[45vh] space-y-1.5 overflow-y-auto pr-1">
              {isLoading && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
              {error && <p className="py-6 text-center text-sm text-red-600">{errorText(error)}</p>}
              {data && !list.length && <p className="py-6 text-center text-sm text-muted-foreground">No approved template found.</p>}
              {list.map((t) => (
                <button key={`${t.name}|${t.language}`} type="button" onClick={() => pick(t)}
                  className={cn("w-full rounded-lg border p-2.5 text-left text-xs transition-colors", picked?.name === t.name && picked?.language === t.language ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                  <p className="flex items-center justify-between gap-2 font-semibold">
                    <span className="truncate">{t.name}</span>
                    <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] font-normal">{String(t.category || "").toLowerCase()} · {t.language}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{t.bodyText}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-[200px] rounded-xl border bg-muted/20 p-3">
            {!picked ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Pick a template</p>
            ) : (
              <div className="space-y-3">
                {values.map((v, i) => (
                  <div key={i}>
                    <Label className="text-xs text-muted-foreground">{`{{${i + 1}}}`} {i === 0 ? "(usually the first name)" : i === 1 ? "(usually the city)" : ""}</Label>
                    <Input value={v} onChange={(e) => setValues((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
                  </div>
                ))}
                {needsMedia && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{picked.headerType.toLowerCase()} link (header)</Label>
                    <Input value={media} onChange={(e) => setMedia(e.target.value)} placeholder="https://…" />
                  </div>
                )}
                <div className="rounded-lg bg-[#dcf8c6] p-3 text-sm shadow-sm">
                  {picked.headerText && <p className="mb-1 font-semibold">{picked.headerText}</p>}
                  <p className="whitespace-pre-wrap">{fill(picked.bodyText, values)}</p>
                  {picked.footerText && <p className="mt-1 text-xs text-muted-foreground">{picked.footerText}</p>}
                  {picked.buttons?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{picked.buttons.map((b) => <span key={b} className="rounded bg-white px-2 py-0.5 text-xs text-sky-700">{b}</span>)}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!picked || sending || values.some((v) => !v.trim()) || (needsMedia && !media.trim())}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
