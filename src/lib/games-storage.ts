import { supabase } from "@/integrations/supabase/client";

/**
 * Per-pelada game history persisted in Supabase.
 *
 * Tables:
 *   - games (one row per partida; filtered by match_id = pelada id)
 *   - game_player_stats (one row per player per game, with team A/B + goals/assists)
 *
 * This keeps histórico, rankings, perfil and pódio isolated per pelada and
 * survives across sessions / devices.
 */

export type HistPlayer = {
  id: string;
  name: string;
  goals: number;
  assists: number;
};
export type HistTeam = { label: string; players: HistPlayer[] };
export type HistMatch = {
  id: string;
  date: string; // yyyy-mm-dd
  name: string;
  teamA: HistTeam;
  teamB: HistTeam;
  mvp: string | null;
  pereba?: string | null;
  topScorers: string[];
  topAssists: string[];
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function buildHistMatch(
  game: {
    id: string;
    game_date: string;
    score_a: number | null;
    score_b: number | null;
    mvp_id: string | null;
    pereba_id: string | null;
  },
  stats: Array<{
    user_id: string;
    player_name: string | null;
    team: string;
    goals: number | null;
    assists: number | null;
  }>,
  peladaName: string,
): HistMatch {
  const a: HistPlayer[] = [];
  const b: HistPlayer[] = [];
  for (const s of stats) {
    const p: HistPlayer = {
      id: s.user_id,
      name: s.player_name || "Jogador",
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
    };
    (s.team === "B" ? b : a).push(p);
  }
  // topScorers / topAssists derived from max
  const all = [...a, ...b];
  const maxG = all.reduce((m, p) => Math.max(m, p.goals), 0);
  const maxA = all.reduce((m, p) => Math.max(m, p.assists), 0);
  const topScorers = maxG > 0 ? all.filter((p) => p.goals === maxG).map((p) => p.id) : [];
  const topAssists = maxA > 0 ? all.filter((p) => p.assists === maxA).map((p) => p.id) : [];
  const [y, mo, d] = game.game_date.split("-");
  return {
    id: game.id,
    date: game.game_date,
    name: `${peladaName} ${d}/${mo}/${y}`,
    teamA: { label: "Time A", players: a },
    teamB: { label: "Time B", players: b },
    mvp: game.mvp_id,
    pereba: game.pereba_id,
    topScorers,
    topAssists,
  };
}

export async function fetchHistory(peladaId: string, peladaName = "Pelada"): Promise<HistMatch[]> {
  const { data: games, error } = await supabase
    .from("games")
    .select("id, game_date, score_a, score_b, mvp_id, pereba_id, created_at")
    .eq("match_id", peladaId)
    .order("game_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error || !games || games.length === 0) return [];
  const ids = games.map((g) => g.id);
  const { data: stats } = await supabase
    .from("game_player_stats")
    .select("game_id, user_id, player_name, team, goals, assists")
    .in("game_id", ids);
  const byGame = new Map<string, typeof stats>();
  for (const s of stats ?? []) {
    const arr = byGame.get(s.game_id) ?? [];
    arr.push(s);
    byGame.set(s.game_id, arr);
  }
  return games.map((g) => buildHistMatch(g, byGame.get(g.id) ?? [], peladaName));
}

export async function fetchLatest(peladaId: string, peladaName = "Pelada"): Promise<HistMatch | null> {
  const list = await fetchHistory(peladaId, peladaName);
  return list[0] ?? null;
}

/**
 * Insert OR update a game and replace its player stats atomically (best-effort
 * on the client). On the second save we delete previous stats rows and re-insert.
 */
export async function saveMatch(peladaId: string, m: HistMatch): Promise<void> {
  const score_a = m.teamA.players.reduce((s, p) => s + (p.goals || 0), 0);
  const score_b = m.teamB.players.reduce((s, p) => s + (p.goals || 0), 0);

  const { error: gErr } = await supabase
    .from("games")
    .upsert(
      {
        id: m.id,
        match_id: peladaId,
        game_date: m.date,
        score_a,
        score_b,
        mvp_id: m.mvp && isUuid(m.mvp) ? m.mvp : null,
        pereba_id: m.pereba && isUuid(m.pereba) ? m.pereba : null,
      },
      { onConflict: "id" },
    );
  if (gErr) throw new Error(`Falha ao salvar partida: ${gErr.message}`);

  // Replace stats rows
  await supabase.from("game_player_stats").delete().eq("game_id", m.id);

  const rows: Array<{
    game_id: string;
    user_id: string;
    player_name: string;
    team: string;
    goals: number;
    assists: number;
  }> = [];
  for (const p of m.teamA.players) {
    rows.push({
      game_id: m.id,
      user_id: p.id,
      player_name: p.name,
      team: "A",
      goals: p.goals || 0,
      assists: p.assists || 0,
    });
  }
  for (const p of m.teamB.players) {
    rows.push({
      game_id: m.id,
      user_id: p.id,
      player_name: p.name,
      team: "B",
      goals: p.goals || 0,
      assists: p.assists || 0,
    });
  }
  if (rows.length > 0) {
    const { error: sErr } = await supabase.from("game_player_stats").insert(rows);
    if (sErr) throw new Error(`Falha ao salvar estatísticas: ${sErr.message}`);
  }
}

export async function deleteMatch(gameId: string): Promise<void> {
  await supabase.from("game_player_stats").delete().eq("game_id", gameId);
  await supabase.from("games").delete().eq("id", gameId);
}

export async function updateMatchWinners(
  gameId: string,
  patch: { mvp_id?: string | null; pereba_id?: string | null },
): Promise<void> {
  const clean: Record<string, string | null> = {};
  if (patch.mvp_id !== undefined) clean.mvp_id = patch.mvp_id && isUuid(patch.mvp_id) ? patch.mvp_id : null;
  if (patch.pereba_id !== undefined) clean.pereba_id = patch.pereba_id && isUuid(patch.pereba_id) ? patch.pereba_id : null;
  if (Object.keys(clean).length === 0) return;
  await supabase.from("games").update(clean).eq("id", gameId);
}

/** Aggregated player stats across all games of one pelada (for Rankings). */
export type AggregatedStat = {
  id: string;
  name: string;
  gols: number;
  assistencias: number;
  mvps: number;
  vitorias: number;
  derrotas: number;
  jogos: number;
};

export async function fetchAggregatedStats(peladaId: string): Promise<AggregatedStat[]> {
  const { data: games } = await supabase
    .from("games")
    .select("id, score_a, score_b, mvp_id")
    .eq("match_id", peladaId);
  if (!games || games.length === 0) return [];
  const gameIds = games.map((g) => g.id);
  const { data: stats } = await supabase
    .from("game_player_stats")
    .select("game_id, user_id, player_name, team, goals, assists")
    .in("game_id", gameIds);
  const gameById = new Map(games.map((g) => [g.id, g]));
  const map = new Map<string, AggregatedStat>();
  const ensure = (id: string, name: string) => {
    let p = map.get(id);
    if (!p) {
      p = { id, name, gols: 0, assistencias: 0, mvps: 0, vitorias: 0, derrotas: 0, jogos: 0 };
      map.set(id, p);
    } else if (!p.name && name) {
      p.name = name;
    }
    return p;
  };
  for (const s of stats ?? []) {
    const g = gameById.get(s.game_id);
    if (!g) continue;
    const row = ensure(s.user_id, s.player_name || "Jogador");
    row.gols += s.goals ?? 0;
    row.assistencias += s.assists ?? 0;
    row.jogos += 1;
    const sa = g.score_a ?? 0;
    const sb = g.score_b ?? 0;
    const inA = s.team === "A";
    const my = inA ? sa : sb;
    const opp = inA ? sb : sa;
    if (my > opp) row.vitorias += 1;
    else if (my < opp) row.derrotas += 1;
  }
  // MVP counts
  for (const g of games) {
    if (g.mvp_id) {
      const entry = map.get(g.mvp_id);
      if (entry) entry.mvps += 1;
    }
  }
  return Array.from(map.values());
}