import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitInquiry } from "@/lib/public-vacancies.functions";
import type { Locale } from "@/lib/locale";

/** One move-in date. No date range, no guest counters — this is long-term rental. */
export function InquiryForm({ unitId, locale }: { unitId?: string | null; locale: Locale }) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(locale);
  const send = useServerFn(submitInquiry);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  if (state === "done") {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <p className="text-base font-semibold">{t("public.inquiry.thanksTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("public.inquiry.thanksText")}</p>
      </div>
    );
  }

  return (
    <form
      className="rounded-md border border-border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        setError("");
        try {
          await send({
            data: {
              unit_id: unitId ?? null,
              name,
              phone,
              email,
              move_in_date: moveIn || null,
              message,
              company,
            },
          });
          setState("done");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          setError(
            msg.includes("ContactRequired")
              ? t("public.inquiry.contactRequired")
              : t("public.inquiry.failed"),
          );
          setState("error");
        }
      }}
    >
      <h2 className="text-lg font-semibold">{t("public.inquiry.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("public.inquiry.lead")}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="iq-name">{t("public.inquiry.name")}</Label>
          <Input
            id="iq-name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 h-11"
            autoComplete="name"
          />
        </div>
        <div>
          <Label htmlFor="iq-phone">{t("public.inquiry.phone")}</Label>
          <Input
            id="iq-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 h-11"
            autoComplete="tel"
          />
        </div>
        <div>
          <Label htmlFor="iq-email">{t("public.inquiry.email")}</Label>
          <Input
            id="iq-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 h-11"
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="iq-date">{t("public.inquiry.moveIn")}</Label>
          <Input
            id="iq-date"
            type="date"
            value={moveIn}
            onChange={(e) => setMoveIn(e.target.value)}
            className="mt-1.5 h-11"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="iq-msg">{t("public.inquiry.message")}</Label>
          <Textarea
            id="iq-msg"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Honeypot — hidden from people, tempting to bots. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="iq-company">Company</label>
        <input
          id="iq-company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={state === "sending"} className="mt-5 h-11 w-full sm:w-auto">
        {state === "sending" ? t("public.inquiry.sending") : t("public.inquiry.submit")}
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">{t("public.inquiry.contactHint")}</p>
    </form>
  );
}
