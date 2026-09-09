import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOwner, isDeveloper } from "./users.server";

/** Developer accounts may only be touched by their own owner (self). */
async function assertNotDeveloperTarget(
  context: { supabase: any; userId: string },
  targetUserId: string,
) {
  if (targetUserId === context.userId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", targetUserId)
    .eq("role", "developer" as never)
    .maybeSingle();
  if (data) throw new Error("Developer paskyros keisti negalima.");
}

/** Creates (or re-invites) the auth user, grants the role and emails the link. */
async function provisionUser(input: {
  email: string;
  role: "developer" | "owner" | "manager" | "tenant";
  fullName?: string;
  redirectTo?: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { appLink } = await import("@/lib/app-url.server");
  const opts = {
    redirectTo: appLink("/reset-password", input.redirectTo),
    ...(input.fullName ? { data: { full_name: input.fullName } } : {}),
  };
  let link = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: opts,
  });
  // Jei vartotojas jau egzistuoja — siunčiame slaptažodžio susikūrimo nuorodą.
  if (link.error && /registered|exists/i.test(link.error.message)) {
    link = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: input.email,
      options: opts,
    });
  }
  if (link.error) throw new Error(link.error.message);

  const newUserId = link.data.user?.id;
  const actionLink = link.data.properties?.action_link;
  if (!newUserId) throw new Error("Nepavyko sukurti vartotojo.");

  if (input.fullName) {
    await supabaseAdmin.auth.admin.updateUserById(newUserId, {
      user_metadata: { full_name: input.fullName },
    });
  }

  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: newUserId, role: input.role } as never, {
      onConflict: "user_id,role",
    });
  if (roleErr) throw new Error(roleErr.message);

  if (actionLink) {
    const { sendEmail } = await import("@/lib/notifications.server");
    const { getPublicBrandName } = await import("@/lib/brand-name.server");
    const brandName = await getPublicBrandName();
    const roleLabel =
      input.role === "developer"
        ? "developer"
        : input.role === "owner"
          ? "savininko"
          : input.role === "manager"
            ? "vadybininko"
            : "nuomininko";
    await sendEmail({
      to: input.email,
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

  return { userId: newUserId, emailed: Boolean(actionLink) };
}

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().email(),
        role: z.enum(["developer", "owner", "manager"]),
        fullName: z.string().trim().max(120).optional(),
        redirectTo: z.string().url().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);

    // Developer paskyra kuriama tik per visų esamų developerių patvirtinimą.
    if (data.role === "developer") {
      if (!(await isDeveloper(context))) {
        throw new Error("Šiam veiksmui reikia developer teisių.");
      }
      const { data: invite, error } = await context.supabase
        .from("developer_invites")
        .insert({
          email: data.email,
          full_name: data.fullName ?? "",
          proposed_by: context.userId,
        } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const inviteId = (invite as { id: string }).id;

      // Siūlytojo balsas įskaitomas automatiškai.
      await context.supabase
        .from("developer_invite_approvals")
        .insert({ invite_id: inviteId, approver_id: context.userId } as never);

      const { data: ready, error: claimErr } = await context.supabase.rpc(
        "claim_developer_invite",
        { _invite_id: inviteId },
      );
      if (claimErr) throw new Error(claimErr.message);

      if (ready === true) {
        const res = await provisionUser({
          email: data.email,
          role: "developer",
          ...(data.fullName ? { fullName: data.fullName } : {}),
          ...(data.redirectTo ? { redirectTo: data.redirectTo } : {}),
        });
        return { ok: true, pending: false, ...res };
      }
      return { ok: true, pending: true, userId: null, emailed: false };
    }

    const res = await provisionUser({
      email: data.email,
      role: data.role,
      ...(data.fullName ? { fullName: data.fullName } : {}),
      ...(data.redirectTo ? { redirectTo: data.redirectTo } : {}),
    });
    return { ok: true, pending: false, ...res };
  });

export const listDeveloperInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isDeveloper(context))) return [];
    const { data, error } = await context.supabase
      .from("developer_invites")
      .select("id, email, full_name, proposed_by, status, expires_at, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const invites = (data ?? []) as Array<{
      id: string;
      email: string;
      full_name: string;
      proposed_by: string;
      expires_at: string;
      created_at: string;
    }>;
    if (invites.length === 0) return [];

    const { data: approvals } = await context.supabase
      .from("developer_invite_approvals")
      .select("invite_id, approver_id")
      .in(
        "invite_id",
        invites.map((i) => i.id),
      );
    const { data: devs } = await context.supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "developer" as never);
    const totalDevelopers = new Set((devs ?? []).map((d: { user_id: string }) => d.user_id)).size;

    const rows = (approvals ?? []) as Array<{ invite_id: string; approver_id: string }>;
    return invites.map((i) => {
      const mine = rows.filter((a) => a.invite_id === i.id);
      return {
        id: i.id,
        email: i.email,
        fullName: i.full_name,
        proposedBy: i.proposed_by,
        expiresAt: i.expires_at,
        createdAt: i.created_at,
        approvals: mine.length,
        totalDevelopers,
        approvedByMe: mine.some((a) => a.approver_id === context.userId),
      };
    });
  });

export const approveDeveloperInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ inviteId: z.string().uuid(), redirectTo: z.string().url().optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isDeveloper(context))) throw new Error("Šiam veiksmui reikia developer teisių.");
    const { data: invite, error: readErr } = await context.supabase
      .from("developer_invites")
      .select("id, email, full_name, status")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!invite) throw new Error("Kvietimas nerastas.");
    const inv = invite as { email: string; full_name: string; status: string };
    if (inv.status !== "pending") throw new Error("Kvietimas jau apdorotas.");

    const { error: apprErr } = await context.supabase
      .from("developer_invite_approvals")
      .insert({ invite_id: data.inviteId, approver_id: context.userId } as never);
    if (apprErr && !/duplicate|unique/i.test(apprErr.message)) throw new Error(apprErr.message);

    const { data: ready, error: claimErr } = await context.supabase.rpc(
      "claim_developer_invite",
      { _invite_id: data.inviteId },
    );
    if (claimErr) throw new Error(claimErr.message);

    if (ready === true) {
      await provisionUser({
        email: inv.email,
        role: "developer",
        ...(inv.full_name ? { fullName: inv.full_name } : {}),
        ...(data.redirectTo ? { redirectTo: data.redirectTo } : {}),
      });
      return { ok: true, approved: true };
    }
    return { ok: true, approved: false };
  });

export const rejectDeveloperInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ inviteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isDeveloper(context))) throw new Error("Šiam veiksmui reikia developer teisių.");
    const { error } = await context.supabase
      .from("developer_invites")
      .update({ status: "rejected" } as never)
      .eq("id", data.inviteId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
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

/** Role changes are always downwards: `developer` is never assignable here. */
export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["owner", "manager", "tenant"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    if (data.userId === context.userId) throw new Error("Savo rolės keisti negalima.");
    await assertNotDeveloperTarget(context, data.userId);
    if (data.role === "owner" && !(await isDeveloper(context))) {
      // Owner-lygio vartotojas gali skirti tik žemesnes roles.
      const roles = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId);
      const mine = (roles.data ?? []).map((r: { role: string }) => r.role);
      if (!mine.includes("owner")) throw new Error("Neturite teisių šiai rolei.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .neq("role", "developer" as never);
    if (delErr) throw new Error(delErr.message);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    await assertNotDeveloperTarget(context, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Paskutinio developerio ištrinti negalima (patvirtina ir DB trigeris).
    if (data.userId === context.userId && (await isDeveloper(context))) {
      const { data: devs } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "developer" as never);
      const others = new Set((devs ?? []).map((d: { user_id: string }) => d.user_id));
      others.delete(context.userId);
      if (others.size === 0) throw new Error("Negalima ištrinti paskutinio developerio.");
    } else if (data.userId === context.userId) {
      throw new Error("Negalite ištrinti savo paskyros.");
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
