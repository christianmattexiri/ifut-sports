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

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("username").eq("id", context.userId).maybeSingle();
    if (!isSuperAdminUsername(prof?.username)) throw new Error("Acesso restrito");
    if (data.userId === context.userId) throw new Error("Você não pode deletar a si mesmo");

    // 1. Delete every match owned by this user (cascades to its child rows).
    const { data: ownedMatches } = await supabaseAdmin
      .from("matches").select("id").eq("admin_id", data.userId);
    for (const m of (ownedMatches ?? []) as { id: string }[]) {
      const { data: games } = await supabaseAdmin
        .from("games").select("id").eq("match_id", m.id);
      const gameIds = (games ?? []).map((g: any) => g.id);
      if (gameIds.length) {
        await supabaseAdmin.from("game_votes").delete().in("game_id", gameIds);
        await supabaseAdmin.from("game_player_stats").delete().in("game_id", gameIds);
        await supabaseAdmin.from("games").delete().in("id", gameIds);
      }
      await supabaseAdmin.from("match_attendance").delete().eq("match_id", m.id);
      await supabaseAdmin.from("match_invitations").delete().eq("match_id", m.id);
      await supabaseAdmin.from("match_members").delete().eq("match_id", m.id);
      await supabaseAdmin.from("matches").delete().eq("id", m.id);
    }

    // 2. Clean references in remaining peladas.
    await supabaseAdmin.from("match_members").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("match_invitations").delete().eq("invitee_id", data.userId);
    await supabaseAdmin.from("match_invitations").delete().eq("inviter_id", data.userId);
    await supabaseAdmin.from("match_attendance").delete().eq("player_id", data.userId);
    await supabaseAdmin.from("game_player_stats").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("game_votes").delete().eq("voter_id", data.userId);
    await supabaseAdmin.from("game_votes").update({ mvp_id: null }).eq("mvp_id", data.userId);
    await supabaseAdmin.from("game_votes").update({ pereba_id: null }).eq("pereba_id", data.userId);

    // 3. Delete profile + auth user.
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
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

export const deleteMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ matchId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const [{ data: prof }, { data: match }] = await Promise.all([
      supabaseAdmin.from("profiles").select("username").eq("id", context.userId).maybeSingle(),
      supabaseAdmin.from("matches").select("id, admin_id").eq("id", data.matchId).maybeSingle(),
    ]);
    if (!match) throw new Error("Pelada não encontrada");
    const isSuper = isSuperAdminUsername(prof?.username);
    const isOwner = match.admin_id === context.userId;
    if (!isSuper && !isOwner) throw new Error("Acesso restrito");

    // Collect game ids for this match to clean up votes/stats.
    const { data: games } = await supabaseAdmin
      .from("games").select("id").eq("match_id", data.matchId);
    const gameIds = (games ?? []).map((g: any) => g.id);

    if (gameIds.length) {
      await supabaseAdmin.from("game_votes").delete().in("game_id", gameIds);
      await supabaseAdmin.from("game_player_stats").delete().in("game_id", gameIds);
      await supabaseAdmin.from("games").delete().in("id", gameIds);
    }
    await supabaseAdmin.from("match_attendance").delete().eq("match_id", data.matchId);
    await supabaseAdmin.from("match_invitations").delete().eq("match_id", data.matchId);
    await supabaseAdmin.from("match_members").delete().eq("match_id", data.matchId);
    const { error } = await supabaseAdmin.from("matches").delete().eq("id", data.matchId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const directAddMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        matchId: z.string().uuid(),
        userId: z.string().uuid(),
        isGoalkeeper: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("username").eq("id", context.userId).maybeSingle();
    if (!isSuperAdminUsername(prof?.username)) throw new Error("Acesso restrito");

    const { error } = await supabaseAdmin
      .from("match_members")
      .upsert(
        {
          match_id: data.matchId,
          user_id: data.userId,
          is_goalkeeper: data.isGoalkeeper ?? false,
        },
        { onConflict: "match_id,user_id" },
      );
    if (error) throw new Error(error.message);

    // Mark any pending invitation as accepted to keep state coherent.
    await supabaseAdmin
      .from("match_invitations")
      .update({ status: "accepted" })
      .eq("match_id", data.matchId)
      .eq("invitee_id", data.userId)
      .eq("status", "pending");

    return { ok: true };
  });