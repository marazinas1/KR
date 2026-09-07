import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOwner, isDeveloper } from "./users.server";


/** Developer accounts are untouchable for everybody except the developer. */
async function assertNotDeveloperTarget(
  context: { supabase: any; userId: string },
  targetUserId: string,
) {
  if (await isDeveloper(context)) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", targetUserId)
    .eq("role", "developer" as never)
    .maybeSingle();
  if (data) throw new Error("Developer paskyros keisti negalima.");
}

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().email(),
        role: z.enum(["developer", "owner", "administrator", "tenant"]),
        fullName: z.string().trim().max(120).optional(),
        redirectTo: z.string().url().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    // Only a developer may create another developer account.
    if (data.role === "developer" && !(await isDeveloper(context))) {
      throw new Error("Šiam veiksmui reikia developer teisių.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { appLink } = await import("@/lib/app-url.server");
    const opts = {
      redirectTo: appLink("/reset-password", data.redirectTo),
      ...(data.fullName ? { data: { full_name: data.fullName } } : {}),
    };
    let link = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: data.email,
      options: opts,
    });
    // Jei vartotojas jau egzistuoja — siunčiame slaptažodžio susikūrimo nuorodą.
    if (link.error && /registered|exists/i.test(link.error.message)) {
      link = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: opts,
      });
    }
    if (link.error) throw new Error(link.error.message);

    const newUserId = link.data.user?.id;
    const actionLink = link.data.properties?.action_link;
    if (!newUserId) throw new Error("Nepavyko sukurti vartotojo.");

    if (data.fullName) {
      await supabaseAdmin.auth.admin.updateUserById(newUserId, {
        user_metadata: { full_name: data.fullName },
      });
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUserId, role: data.role } as never, {
        onConflict: "user_id,role",
      });
    if (roleErr) throw new Error(roleErr.message);

    if (actionLink) {
      const { sendEmail } = await import("@/lib/notifications.server");
      const { getPublicBrandName } = await import("@/lib/brand-name.server");
      const brandName = await getPublicBrandName();
      const roleLabel =
        data.role === "developer"
          ? "developer"
          : data.role === "owner"
            ? "savininko"
            : data.role === "administrator"
              ? "administratoriaus"
              : "nuomininko";
      await sendEmail({
        to: data.email,
        subject: `Kvietimas prisijungti prie ${brandName} sistemos`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6">
            <p>Sveiki,</p>
            <p>Jums sukurta ${roleLabel} paskyra ${brandName} sistemoje.</p>
            <p>Paspauskite nuorodą ir susikurkite slaptažodį:</p>
            <p><a href="${actionLink}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Susikurti slaptažodį</a></p>
            <p style="font-size:13px;color:#666">Jei mygtukas neveikia, nukopijuokite šią nuorodą:<br>${actionLink}</p>
          </div>
        `,
      });
    }

    return { ok: true, userId: newUserId, emailed: Boolean(actionLink) };
  });

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{ user_id: string; role: string; created_at: string }>;
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const info = new Map(
      (authUsers?.users ?? []).map((u) => [
        u.id,
        {
          email: u.email ?? "",
          fullName: ((u.user_metadata as { full_name?: string } | null)?.full_name ?? "").trim(),
          lastSignInAt: u.last_sign_in_at ?? null,
        },
      ]),
    );

    return rows.map((r) => ({
      userId: r.user_id,
      role: r.role,
      createdAt: r.created_at,
      email: info.get(r.user_id)?.email ?? "",
      fullName: info.get(r.user_id)?.fullName ?? "",
      lastSignInAt: info.get(r.user_id)?.lastSignInAt ?? null,
    }));
  });

export const updateUserName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), fullName: z.string().trim().max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    await assertNotDeveloperTarget(context, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    if (data.userId === context.userId) throw new Error("Negalite ištrinti savo paskyros.");
    await assertNotDeveloperTarget(context, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });