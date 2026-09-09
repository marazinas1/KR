import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2, RotateCcw, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  clearAssistantHistory,
  getAssistantHistory,
  type AssistantMessage,
} from "@/lib/assistant.functions";
import { ASSISTANT_MAX_MESSAGE_CHARS } from "@/lib/assistant-knowledge";
import avatarUrl from "@/assets/assistant-eva.png";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

/** Renders **bold** and [[link:/admin/x|label]] tags; everything else is plain text. */
function RichText({ text, onNavigate }: { text: string; onNavigate: (to: string) => void }) {
  const nodes: React.ReactNode[] = [];
  const pattern = /\[\[link:(\/[^|\]]+)\|([^\]]+)\]\]|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      const to = m[1];
      nodes.push(
        <button
          key={`l${i++}`}
          type="button"
          onClick={() => onNavigate(to)}
          className="font-medium underline underline-offset-2 hover:opacity-70"
        >
          {m[2]}
        </button>,
      );
    } else if (m[3]) {
      nodes.push(<strong key={`b${i++}`}>{m[3]}</strong>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span className="whitespace-pre-wrap">{nodes}</span>;
}

export function AssistantWidget() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { location } = useRouterState();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const fetchHistory = useServerFn(getAssistantHistory);
  const clearHistory = useServerFn(clearAssistantHistory);
  const { data: history } = useQuery({
    queryKey: ["assistant-history"],
    queryFn: () => fetchHistory(),
    enabled: open,
  });

  useEffect(() => {
    if (history) {
      setMessages(
        (history as AssistantMessage[]).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      );
    }
  }, [history]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const suggestions = t("assistant.suggestions", { returnObjects: true }) as unknown;
  const suggestionList = Array.isArray(suggestions) ? (suggestions as string[]) : [];

  const goTo = (to: string) => {
    setOpen(false);
    navigate({ to }).catch(() => toast.error(t("assistant.linkFailed")));
  };

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: message },
    ]);
    setStreaming(true);

    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("no-session");

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message,
          lang: i18n.language.startsWith("en") ? "en" : "lt",
          path: location.pathname,
        }),
      });

      if (!res.ok || !res.body) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || t("assistant.error"));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).replace(/\r$/, "");
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { t?: string; done?: boolean };
            if (parsed.t) {
              acc += parsed.t;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
              );
            }
          } catch {
            // ignore partial frame
          }
        }
      }
      if (!acc.trim()) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: t("assistant.empty") } : m,
          ),
        );
      }
      queryClient.invalidateQueries({ queryKey: ["assistant-history"] });
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : t("assistant.error");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      toast.error(msg);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t("assistant.open")}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border bg-card shadow-lg transition hover:scale-105"
        >
          <img
            src={avatarUrl}
            alt=""
            loading="lazy"
            width={512}
            height={512}
            className="h-full w-full object-cover"
          />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <img
            src={avatarUrl}
            alt=""
            width={512}
            height={512}
            className="h-9 w-9 shrink-0 rounded-full border object-cover"
          />
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-base">{t("assistant.name")}</SheetTitle>
            <p className="truncate text-xs text-muted-foreground">{t("assistant.subtitle")}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("assistant.clear")}
            disabled={streaming || messages.length === 0}
            onClick={async () => {
              try {
                await clearHistory({ data: undefined });
                setMessages([]);
                queryClient.invalidateQueries({ queryKey: ["assistant-history"] });
              } catch {
                toast.error(t("assistant.error"));
              }
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("assistant.greeting")}</p>
              <div className="flex flex-col gap-2">
                {suggestionList.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-lg border px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="max-w-[95%] text-sm leading-relaxed text-foreground">
                {m.content ? (
                  <RichText text={m.content} onNavigate={goTo} />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            ),
          )}
        </div>

        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              rows={2}
              maxLength={ASSISTANT_MAX_MESSAGE_CHARS}
              placeholder={t("assistant.placeholder")}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              className="min-h-[44px] resize-none"
            />
            <Button
              type="button"
              size="icon"
              aria-label={t("assistant.send")}
              disabled={streaming || input.trim().length === 0}
              onClick={() => void send(input)}
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{t("assistant.disclaimer")}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
