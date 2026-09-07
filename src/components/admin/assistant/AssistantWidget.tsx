import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ArrowRight, Loader2, SendHorizonal, Trash2, X } from "lucide-react";
import evaAvatar from "@/assets/eva-avatar.jpg.asset.json";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  clearAssistantHistory,
  getAssistantHistory,
  type AssistantMessage,
} from "@/lib/assistant.functions";
import { ASSISTANT_MAX_MESSAGE_CHARS } from "@/lib/assistant-knowledge";

type LocalMessage = Pick<AssistantMessage, "id" | "role" | "content">;

const LINK_RE = /\[\[link:(\/admin[^|\]]*)\|([^\]]+)\]\]/g;

/** Apvalus Evos avataras su subtiliu rėmeliu. */
function EvaAvatar({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={evaAvatar.url}
      alt="Eva"
      className={`${className} shrink-0 rounded-full object-cover ring-2 ring-primary/30 ring-offset-2 ring-offset-background`}
    />
  );
}

/** Paverčia paprastą markdown (**bold**, sąrašai) ir [[link:...]] žymas į React. */
function renderContent(text: string, onNavigate: (href: string) => void): ReactNode[] {
  const links: { path: string; label: string }[] = [];
  const body = text
    .replace(LINK_RE, (_m, path: string, label: string) => {
      links.push({ path, label });
      return "";
    })
    .trim();

  const lines = body.split("\n");
  const nodes: ReactNode[] = [];
  lines.forEach((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={j}>{p.slice(2, -2)}</strong>
      ) : (
        <span key={j}>{p}</span>
      ),
    );
    nodes.push(
      <p key={i} className={line.trim() === "" ? "h-2" : "leading-relaxed"}>
        {parts}
      </p>,
    );
  });
  if (links.length > 0) {
    nodes.push(
      <div key="links" className="mt-2 flex flex-wrap gap-2">
        {links.map((l) => (
          <button
            key={l.path + l.label}
            type="button"
            onClick={() => onNavigate(l.path)}
            className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-background px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            {l.label}
            <ArrowRight className="h-3 w-3" />
          </button>
        ))}
      </div>,
    );
  }
  return nodes;
}

export function AssistantWidget() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<LocalMessage | null>(null);
  const [pending, setPending] = useState(false);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onNavigate = (href: string) => {
    setOpen(false);
    void router.navigate({ href });
  };

  const fetchHistory = useServerFn(getAssistantHistory);
  const clearFn = useServerFn(clearAssistantHistory);

  const { data: history, isLoading } = useQuery({
    queryKey: ["assistant-history"],
    queryFn: () => fetchHistory(),
    enabled: open,
  });

  const clear = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => {
      setLocalMessages([]);
      setStreaming(null);
      qc.setQueryData(["assistant-history"], []);
      toast.success(t("assistant.cleared"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("assistant.error")),
  });

  const messages: LocalMessage[] = [...(history ?? []), ...localMessages];

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open, pending]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streaming?.content, open]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || pending) return;
    if (message.length > ASSISTANT_MAX_MESSAGE_CHARS) {
      toast.error(t("assistant.tooLong", { max: ASSISTANT_MAX_MESSAGE_CHARS }));
      return;
    }
    setInput("");
    setPending(true);
    const userMsg: LocalMessage = { id: `local-${Date.now()}`, role: "user", content: message };
    setLocalMessages((m) => [...m, userMsg]);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error(t("assistant.error"));

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message,
          lang: i18n.language.startsWith("en") ? "en" : "lt",
          path: pathname,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || t("assistant.error"));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      const assistantId = `local-a-${Date.now()}`;
      setStreaming({ id: assistantId, role: "assistant", content: "" });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 2);
          if (!chunk.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(chunk.slice(6)) as { t?: string; done?: boolean };
            if (parsed.t) {
              acc += parsed.t;
              setStreaming({ id: assistantId, role: "assistant", content: acc });
            }
          } catch {
            /* ignore */
          }
        }
      }

      const finalText = acc.trim() || t("assistant.empty");
      setLocalMessages((m) => [...m, { id: assistantId, role: "assistant", content: finalText }]);
      setStreaming(null);
    } catch (e) {
      setStreaming(null);
      setLocalMessages((m) => [
        ...m,
        {
          id: `local-err-${Date.now()}`,
          role: "assistant",
          content: e instanceof Error ? e.message : t("assistant.error"),
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const suggestions = t("assistant.suggestions", { returnObjects: true }) as string[];
  const showSuggestions = !isLoading && messages.length === 0 && !streaming;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("assistant.open")}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <EvaAvatar className="h-12 w-12" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md [&>button]:hidden"
        >
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <EvaAvatar className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-sm font-semibold leading-tight">{t("assistant.title")}</SheetTitle>
              <SheetDescription className="truncate text-xs">{t("assistant.subtitle")}</SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label={t("assistant.clear")}
                disabled={clear.isPending || messages.length === 0}
                onClick={() => clear.mutate()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label={t("common.close")}
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
              </div>
            ) : null}

            {showSuggestions ? (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-3 pt-2 text-center">
                  <EvaAvatar className="h-16 w-16" />
                  <p className="text-muted-foreground">{t("assistant.intro")}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onNavigate={onNavigate} />
            ))}
            {streaming ? (
              <MessageBubble message={streaming} typing={streaming.content === ""} onNavigate={onNavigate} />
            ) : pending ? (
              <MessageBubble message={{ id: "typing", role: "assistant", content: "" }} typing onNavigate={onNavigate} />
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            className="border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder={t("assistant.placeholder")}
                rows={2}
                maxLength={ASSISTANT_MAX_MESSAGE_CHARS}
                disabled={pending}
                className="min-h-[44px] resize-none"
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 shrink-0"
                disabled={pending || !input.trim()}
                aria-label={t("assistant.send")}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{t("assistant.disclaimer")}</p>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MessageBubble({
  message,
  typing,
  onNavigate,
}: {
  message: LocalMessage;
  typing?: boolean;
  onNavigate: (href: string) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-lg px-3 py-2 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {typing ? (
          <span className="inline-flex gap-1 py-1" aria-live="polite">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
          </span>
        ) : isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          renderContent(message.content, onNavigate)
        )}
      </div>
    </div>
  );
}
