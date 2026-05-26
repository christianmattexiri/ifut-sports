import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Incrementa os totais globais do perfil (gols, assistências, partidas,
 * vitórias, derrotas, empates) com base nas estatísticas de uma partida.
 * Idempotente: usa games.profiles_synced para não dobrar contagem caso o admin
 * salve a mesma partida duas vezes (ex: editou a súmula).
 */
export const applyMatchToProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ gameId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { gameId } = data;
    const { data: game, error: gErr } = await supabaseAdmin
      .from("games")
      .select("id, score_a, score_b, profiles_synced")
      .eq("id", gameId)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!game) return { ok: false, reason: "game-not-found" };
    if (game.profiles_synced) return { ok: true, skipped: true };

    const { data: stats, error: sErr } = await supabaseAdmin
      .from("game_player_stats")
      .select("user_id, team, goals, assists, own_goals")
      .eq("game_id", gameId);
    if (sErr) throw new Error(sErr.message);
    if (!stats || stats.length === 0) {
      await supabaseAdmin.from("games").update({ profiles_synced: true }).eq("id", gameId);
      return { ok: true, applied: 0 };
    }

    const sa = game.score_a ?? 0;
    const sb = game.score_b ?? 0;
    const draw = sa === sb;

    const ids = Array.from(new Set(stats.map((s) => s.user_id)));
    const { data: profs, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, total_goals, total_assists, total_matches, total_wins, total_losses, total_draws, total_own_goals",
      )
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    const profMap = new Map((profs ?? []).map((p) => [p.id as string, p]));

    let applied = 0;
    for (const s of stats) {
      const p = profMap.get(s.user_id);
      if (!p) continue;
      const inA = s.team === "A";
      const my = inA ? sa : sb;
      const opp = inA ? sb : sa;
      const isWin = !draw && my > opp;
      const isLoss = !draw && my < opp;
      const { error: uErr } = await supabaseAdmin
        .from("profiles")
        .update({
          total_goals: (p.total_goals ?? 0) + (s.goals ?? 0),
          total_assists: (p.total_assists ?? 0) + (s.assists ?? 0),
          total_matches: (p.total_matches ?? 0) + 1,
          total_wins: (p.total_wins ?? 0) + (isWin ? 1 : 0),
          total_losses: (p.total_losses ?? 0) + (isLoss ? 1 : 0),
          total_draws: (p.total_draws ?? 0) + (draw ? 1 : 0),
          total_own_goals: (p.total_own_goals ?? 0) + (s.own_goals ?? 0),
        })
        .eq("id", p.id);
      if (uErr) throw new Error(uErr.message);
      applied++;
    }

    await supabaseAdmin.from("games").update({ profiles_synced: true }).eq("id", gameId);
    return { ok: true, applied };
  });