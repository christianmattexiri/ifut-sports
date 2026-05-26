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
  own_goals: number;
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
  videoUrl?: string | null;
};

type VoteWinnerRow = {
  game_id: string;
  mvp_id: string | null;
  pereba_id: string | null;
  apitto_ratings: Record<string, number> | null;
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function topVote(tally: Map<string, number>, lowest = false): string | null {
  let winner: string | null = null;
  let best = lowest ? Number.POSITIVE_INFINITY : 0;
  for (const [id, count] of tally.entries()) {
    if ((lowest && count < best) || (!lowest && count > best)) {
      winner = id;
      best = count;
    }
  }
  return winner;
}

function closedVoteWinners(
  rows: VoteWinnerRow[],
): Map<string, { mvp_id: string | null; pereba_id: string | null }> {
  const grouped = new Map<string, VoteWinnerRow[]>();
  for (const row of rows) grouped.set(row.game_id, [...(grouped.get(row.game_id) ?? []), row]);
  const resolved = new Map<string, { mvp_id: string | null; pereba_id: string | null }>();
  for (const [gameId, votes] of grouped.entries()) {
    const mvpTally = new Map<string, number>();
    const perebaTally = new Map<string, number>();
    const apitto = new Map<string, { sum: number; n: number }>();
    for (const vote of votes) {
      if (vote.mvp_id && isUuid(vote.mvp_id))
        mvpTally.set(vote.mvp_id, (mvpTally.get(vote.mvp_id) ?? 0) + 1);
      if (vote.pereba_id && isUuid(vote.pereba_id))
        perebaTally.set(vote.pereba_id, (perebaTally.get(vote.pereba_id) ?? 0) + 1);
      for (const [playerId, rating] of Object.entries(vote.apitto_ratings ?? {})) {
        if (!isUuid(playerId) || typeof rating !== "number") continue;
        const cur = apitto.get(playerId) ?? { sum: 0, n: 0 };
        cur.sum += rating;
        cur.n += 1;
        apitto.set(playerId, cur);
      }
    }
    const apittoRanked = [...apitto.entries()]
      .map(([id, r]) => ({ id, avg: r.n ? r.sum / r.n : 0 }))
      .sort((a, b) => b.avg - a.avg);
    resolved.set(gameId, {
      mvp_id: topVote(mvpTally) ?? apittoRanked[0]?.id ?? null,
      pereba_id: topVote(perebaTally) ?? apittoRanked[apittoRanked.length - 1]?.id ?? null,
    });
  }
  return resolved;
}

function buildHistMatch(
  game: {
    id: string;
    game_date: string;
    score_a: number | null;
    score_b: number | null;
    mvp_id: string | null;
    pereba_id: string | null;
    video_url?: string | null;
  },
  stats: Array<{
    user_id: string;
    player_name: string | null;
    team: string;
    goals: number | null;
    assists: number | null;
    own_goals?: number | null;
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
      own_goals: s.own_goals ?? 0,
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
    videoUrl: game.video_url ?? null,
  };
}

export async function fetchHistory(peladaId: string, peladaName = "Pelada"): Promise<HistMatch[]> {
  const { data: games, error } = await supabase
    .from("games")
    .select("id, game_date, score_a, score_b, mvp_id, pereba_id, video_url, voting_open, created_at")
    .eq("match_id", peladaId)
    .order("game_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error || !games || games.length === 0) return [];
  const ids = games.map((g) => g.id);
  const { data: stats } = await supabase
    .from("game_player_stats")
    .select("game_id, user_id, player_name, team, goals, assists, own_goals")
    .in("game_id", ids);
  const byGame = new Map<string, typeof stats>();
  for (const s of stats ?? []) {
    const arr = byGame.get(s.game_id) ?? [];
    arr.push(s);
    byGame.set(s.game_id, arr);
  }
  const closedWithoutWinners = games
    .filter((g) => g.voting_open === false && (!g.mvp_id || !g.pereba_id))
    .map((g) => g.id);
  const { data: voteRows } =
    closedWithoutWinners.length > 0
      ? await supabase
          .from("game_votes")
          .select("game_id, mvp_id, pereba_id, apitto_ratings")
          .in("game_id", closedWithoutWinners)
      : { data: [] };
  const fallbackWinners = closedVoteWinners((voteRows ?? []) as VoteWinnerRow[]);
  return games.map((g) => {
    const fallback = fallbackWinners.get(g.id);
    return buildHistMatch(
      {
        ...g,
        mvp_id: g.mvp_id ?? fallback?.mvp_id ?? null,
        pereba_id: g.pereba_id ?? fallback?.pereba_id ?? null,
      },
      byGame.get(g.id) ?? [],
      peladaName,
    );
  });
}

export async function fetchLatest(
  peladaId: string,
  peladaName = "Pelada",
): Promise<HistMatch | null> {
  const { data: game, error } = await supabase
    .from("games")
    .select("id, game_date, score_a, score_b, mvp_id, pereba_id, video_url, voting_open, created_at")
    .eq("match_id", peladaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !game) return null;

  const { data: stats } = await supabase
    .from("game_player_stats")
    .select("game_id, user_id, player_name, team, goals, assists, own_goals")
    .eq("game_id", game.id);

  let mvp_id = game.mvp_id ?? null;
  let pereba_id = game.pereba_id ?? null;
  if (game.voting_open === false && (!mvp_id || !pereba_id)) {
    const { data: voteRows } = await supabase
      .from("game_votes")
      .select("game_id, mvp_id, pereba_id, apitto_ratings")
      .eq("game_id", game.id);
    const fallback = closedVoteWinners((voteRows ?? []) as VoteWinnerRow[]).get(game.id);
    mvp_id = mvp_id ?? fallback?.mvp_id ?? null;
    pereba_id = pereba_id ?? fallback?.pereba_id ?? null;
  }

  return buildHistMatch({ ...game, mvp_id, pereba_id }, stats ?? [], peladaName);
}

/**
 * Insert OR update a game and replace its player stats atomically (best-effort
 * on the client). On the second save we delete previous stats rows and re-insert.
 */
export async function saveMatch(
  peladaId: string,
  m: HistMatch,
  opts?: { votingOpen?: boolean },
): Promise<void> {
  const goalsA = m.teamA.players.reduce((s, p) => s + (p.goals || 0), 0);
  const goalsB = m.teamB.players.reduce((s, p) => s + (p.goals || 0), 0);
  const ogA = m.teamA.players.reduce((s, p) => s + (p.own_goals || 0), 0);
  const ogB = m.teamB.players.reduce((s, p) => s + (p.own_goals || 0), 0);
  // Gol contra conta para o time adversário.
  const score_a = goalsA + ogB;
  const score_b = goalsB + ogA;

  const baseRow: {
    id: string;
    match_id: string;
    game_date: string;
    score_a: number;
    score_b: number;
    mvp_id: string | null;
    pereba_id: string | null;
    voting_open?: boolean;
    video_url?: string | null;
  } = {
    id: m.id,
    match_id: peladaId,
    game_date: m.date,
    score_a,
    score_b,
    mvp_id: m.mvp && isUuid(m.mvp) ? m.mvp : null,
    pereba_id: m.pereba && isUuid(m.pereba) ? m.pereba : null,
    video_url: m.videoUrl ? m.videoUrl.trim() || null : null,
  };
  if (typeof opts?.votingOpen === "boolean") {
    baseRow.voting_open = opts.votingOpen;
  }

  const { error: gErr } = await supabase.from("games").upsert(baseRow, { onConflict: "id" });
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
    own_goals: number;
  }> = [];
  for (const p of m.teamA.players) {
    rows.push({
      game_id: m.id,
      user_id: p.id,
      player_name: p.name,
      team: "A",
      goals: p.goals || 0,
      assists: p.assists || 0,
      own_goals: p.own_goals || 0,
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
      own_goals: p.own_goals || 0,
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

/**
 * Persist the current draw (Time A vs Time B) on the matches table so the
 * Partida screen can restore it on reload.
 */
export async function saveCurrentDraw(
  peladaId: string,
  draw: unknown | null,
): Promise<void> {
  const { error } = await supabase
    .from("matches")
    .update({ current_draw: draw as never })
    .eq("id", peladaId);
  if (error) throw new Error(`Falha ao salvar sorteio: ${error.message}`);
}

/**
 * Increment a single stat (goals / assists) for a player in a given game.
 * Used by the Live Tracking mode so each tap persists instantly.
 */
export async function incrementPlayerStat(
  gameId: string,
  userId: string,
  field: "goals" | "assists" | "own_goals",
  delta = 1,
): Promise<number> {
  const { data: cur, error: selErr } = await supabase
    .from("game_player_stats")
    .select("id, goals, assists, own_goals")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!cur) throw new Error("Jogador não encontrado nessa partida");
  const next = Math.max(0, ((cur[field] as number | null) ?? 0) + delta);
  const patch =
    field === "goals"
      ? { goals: next }
      : field === "assists"
      ? { assists: next }
      : { own_goals: next };
  const { error: updErr } = await supabase
    .from("game_player_stats")
    .update(patch)
    .eq("id", cur.id);
  if (updErr) throw new Error(updErr.message);
  // Recompute score whenever goals or own-goals change.
  if (field === "goals" || field === "own_goals") {
    const { data: stats } = await supabase
      .from("game_player_stats")
      .select("team, goals, own_goals")
      .eq("game_id", gameId);
    const rows = stats ?? [];
    const goalsA = rows.filter((s) => s.team === "A").reduce((s, r) => s + (r.goals ?? 0), 0);
    const goalsB = rows.filter((s) => s.team === "B").reduce((s, r) => s + (r.goals ?? 0), 0);
    const ogA = rows.filter((s) => s.team === "A").reduce((s, r) => s + (r.own_goals ?? 0), 0);
    const ogB = rows.filter((s) => s.team === "B").reduce((s, r) => s + (r.own_goals ?? 0), 0);
    const score_a = goalsA + ogB;
    const score_b = goalsB + ogA;
    await supabase.from("games").update({ score_a, score_b }).eq("id", gameId);
  }
  return next;
}

export async function updateMatchWinners(
  gameId: string,
  patch: { mvp_id?: string | null; pereba_id?: string | null },
): Promise<void> {
  const clean: { mvp_id?: string | null; pereba_id?: string | null } = {};
  if (patch.mvp_id !== undefined)
    clean.mvp_id = patch.mvp_id && isUuid(patch.mvp_id) ? patch.mvp_id : null;
  if (patch.pereba_id !== undefined)
    clean.pereba_id = patch.pereba_id && isUuid(patch.pereba_id) ? patch.pereba_id : null;
  if (Object.keys(clean).length === 0) return;
  const { error } = await supabase.from("games").update(clean).eq("id", gameId);
  if (error) throw new Error(`Falha ao gravar vencedores: ${error.message}`);
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
  empates: number;
  perebas: number;
  jogos: number;
};

export type PlayerMvpSummary = {
  total: number;
  recent: Array<{ id: string; date: string; name: string }>;
};

export async function fetchAggregatedStats(peladaId: string): Promise<AggregatedStat[]> {
  const { data: games } = await supabase
    .from("games")
    .select("id, score_a, score_b, mvp_id, pereba_id, voting_open")
    .eq("match_id", peladaId);
  if (!games || games.length === 0) return [];
  const gameIds = games.map((g) => g.id);
  const { data: stats } = await supabase
    .from("game_player_stats")
    .select("game_id, user_id, player_name, team, goals, assists")
    .in("game_id", gameIds);
  const closedWithoutWinners = games
    .filter((g) => g.voting_open === false && (!g.mvp_id || !g.pereba_id))
    .map((g) => g.id);
  const { data: voteRows } =
    closedWithoutWinners.length > 0
      ? await supabase
          .from("game_votes")
          .select("game_id, mvp_id, pereba_id, apitto_ratings")
          .in("game_id", closedWithoutWinners)
      : { data: [] };
  const fallbackWinners = closedVoteWinners((voteRows ?? []) as VoteWinnerRow[]);
  const gamesWithWinners = games.map((g) => {
    const fallback = fallbackWinners.get(g.id);
    return {
      ...g,
      mvp_id: g.mvp_id ?? fallback?.mvp_id ?? null,
      pereba_id: g.pereba_id ?? fallback?.pereba_id ?? null,
    };
  });
  const gameById = new Map(gamesWithWinners.map((g) => [g.id, g]));
  const map = new Map<string, AggregatedStat>();
  const ensure = (id: string, name: string) => {
    let p = map.get(id);
    if (!p) {
      p = { id, name, gols: 0, assistencias: 0, mvps: 0, vitorias: 0, derrotas: 0, empates: 0, perebas: 0, jogos: 0 };
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
    else row.empates += 1;
  }
  // MVP counts
  for (const g of gamesWithWinners) {
    if (g.mvp_id) {
      const entry = map.get(g.mvp_id);
      if (entry) entry.mvps += 1;
    }
    if (g.pereba_id) {
      const entry = map.get(g.pereba_id);
      if (entry) entry.perebas += 1;
    }
  }
  // Apply profile overrides (total_matches / total_assists / total_perebas / total_mvps / total_goals / total_wins)
  const ids = Array.from(map.keys());
  if (ids.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, total_matches, total_assists, total_perebas, total_mvps, total_goals, total_wins, total_losses, total_draws")
      .in("id", ids);
    for (const p of (profs ?? []) as Array<{ id: string; total_matches: number | null; total_assists: number | null; total_perebas: number | null; total_mvps: number | null; total_goals: number | null; total_wins: number | null; total_losses: number | null; total_draws: number | null }>) {
      const entry = map.get(p.id);
      if (!entry) continue;
      if (p.total_matches != null) entry.jogos = p.total_matches;
      if (p.total_assists != null) entry.assistencias = p.total_assists;
      if (p.total_perebas != null) entry.perebas = p.total_perebas;
      if (p.total_mvps != null) entry.mvps = p.total_mvps;
      if (p.total_goals != null) entry.gols = p.total_goals;
      if (p.total_wins != null) entry.vitorias = p.total_wins;
      if (p.total_losses != null) entry.derrotas = p.total_losses;
      if (p.total_draws != null) entry.empates = p.total_draws;
    }
  }
  return Array.from(map.values());
}

export async function fetchPlayerMvpSummary(
  peladaId: string,
  userId: string,
  limit = 5,
): Promise<PlayerMvpSummary> {
  const history = await fetchHistory(peladaId, "Pelada");
  const wins = history.filter((m) => m.mvp === userId).sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    total: wins.length,
    recent: wins.slice(0, limit).map((m) => ({ id: m.id, date: m.date, name: m.name })),
  };
}

/* ------------------------------------------------------------------ */
/* CAMPEONATO (PRO) — tabela estilo Brasileirão, escopo POR PELADA.    */
/* Não usa overrides de profile.total_* (que são globais cross-pelada).*/
/* ------------------------------------------------------------------ */

export type CampeonatoRow = {
  id: string;
  name: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  presencaPct: number;
};

export async function fetchCampeonato(peladaId: string): Promise<CampeonatoRow[]> {
  const { data: games } = await supabase
    .from("games")
    .select("id, score_a, score_b")
    .eq("match_id", peladaId);
  if (!games || games.length === 0) return [];
  const totalGames = games.length;
  const gameById = new Map(games.map((g) => [g.id, g]));

  const { data: stats } = await supabase
    .from("game_player_stats")
    .select("game_id, user_id, player_name, team, goals")
    .in("game_id", games.map((g) => g.id));

  type Acc = {
    id: string; name: string; jogos: number;
    vitorias: number; empates: number; derrotas: number; golsPro: number;
  };
  const map = new Map<string, Acc>();
  for (const s of stats ?? []) {
    const g = gameById.get(s.game_id);
    if (!g) continue;
    let row = map.get(s.user_id);
    if (!row) {
      row = { id: s.user_id, name: s.player_name || "Jogador", jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0 };
      map.set(s.user_id, row);
    } else if (!row.name && s.player_name) {
      row.name = s.player_name;
    }
    row.jogos += 1;
    row.golsPro += s.goals ?? 0;
    const sa = g.score_a ?? 0;
    const sb = g.score_b ?? 0;
    const inA = s.team === "A";
    const my = inA ? sa : sb;
    const opp = inA ? sb : sa;
    if (my > opp) row.vitorias += 1;
    else if (my < opp) row.derrotas += 1;
    else row.empates += 1;
  }

  const rows: CampeonatoRow[] = Array.from(map.values()).map((r) => ({
    id: r.id,
    name: r.name,
    pontos: r.vitorias * 3 + r.empates,
    jogos: r.jogos,
    vitorias: r.vitorias,
    empates: r.empates,
    derrotas: r.derrotas,
    golsPro: r.golsPro,
    presencaPct: totalGames > 0 ? Math.round((r.jogos / totalGames) * 1000) / 10 : 0,
  }));

  rows.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    return b.golsPro - a.golsPro;
  });

  return rows;
}
