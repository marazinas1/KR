import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Viešas slaptažodžio atstatymas.
 * Nuorodą generuojame per Auth Admin API ir siunčiame per patvirtintą Resend domeną
 * (Supabase numatytieji auth laiškai šiam projektui nenaudojami).
 * Visada grąžina { ok: true }, kad neatskleistume, ar el. paštas registruotas.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email(),
        redirectTo: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { appLink } = await import("@/lib/app-url.server");
      const link = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: { redirectTo: appLink("/reset-password", data.redirectTo) },
      });
      const actionLink = link.data?.properties?.action_link;
      if (link.error || !actionLink) {
        console.warn("[password-reset] nepavyko sugeneruoti nuorodos", link.error?.message);
        return { ok: true };
      }

      const { sendEmail } = await import("@/lib/notifications.server");
      await sendEmail({
        to: data.email,
        subject: "Slaptažodžio atstatymas — Dharma Stay",
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6">
            <p>Sveiki,</p>
            <p>Gavome prašymą atstatyti jūsų paskyros slaptažodį.</p>
            <p><a href="${actionLink}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Nustatyti naują slaptažodį</a></p>
            <p style="font-size:13px;color:#666">Jei mygtukas neveikia, nukopijuokite šią nuorodą:<br>${actionLink}</p>
            <p style="font-size:13px;color:#666">Jei prašymo neteikėte — tiesiog ignoruokite šį laišką.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("[password-reset]", e);
    }
    return { ok: true };
  });
