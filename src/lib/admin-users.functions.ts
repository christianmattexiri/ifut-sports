import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isSuperAdminUsername } from "@/lib/admin";
import type { AdminUserRow } from "@/lib/admin-users.types";

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("username").eq("id", context.userId).maybeSingle();
    if (!isSuperAdminUsername(prof?.username)) throw new Error("Acesso restrito");

    const { data: profs, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, username, avatar_url")
      .order("username", { ascending: true });
    if (pErr) throw pErr;

    const { data: matches } = await supabaseAdmin
      .from("matches")
      .select("id, name, admin_id");
    const { data: members } = await supabaseAdmin
      .from("match_members")
      .select("user_id, match_id");

    const matchMap = new Map<string, { id: string; name: string; admin_id: string }>();
    for (const m of (matches ?? []) as any[]) matchMap.set(m.id, m);

    const peladasByUser = new Map<string, AdminUserRow["peladas"]>();
    for (const m of (matches ?? []) as any[]) {
      const arr = peladasByUser.get(m.admin_id) ?? [];
      arr.push({ id: m.id, name: m.name, role: "admin" });
      peladasByUser.set(m.admin_id, arr);
    }
    for (const mm of (members ?? []) as any[]) {
      const m = matchMap.get(mm.match_id);
      if (!m) continue;
      if (m.admin_id === mm.user_id) continue;
      const arr = peladasByUser.get(mm.user_id) ?? [];
      arr.push({ id: m.id, name: m.name, role: "member" });
      peladasByUser.set(mm.user_id, arr);
    }

    return ((profs ?? []) as any[]).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      username: p.username,
      avatar_url: p.avatar_url,
      peladas: peladasByUser.get(p.id) ?? [],
    }));
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        newPassword: z.string().min(6).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("username").eq("id", context.userId).maybeSingle();
    if (!isSuperAdminUsername(prof?.username)) throw new Error("Acesso restrito");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
      user_metadata: { force_password_reset: true },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearForcePasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ newPassword: z.string().min(6).max(72) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // User updates their own password and clears the flag.
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.newPassword,
      user_metadata: { force_password_reset: false },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMatchPro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ matchId: z.string().uuid(), isPro: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("username").eq("id", context.userId).maybeSingle();
    if (!isSuperAdminUsername(prof?.username)) throw new Error("Acesso restrito");
    const { error } = await supabaseAdmin
      .from("matches")
      .update({ is_pro: data.isPro })
      .eq("id", data.matchId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });