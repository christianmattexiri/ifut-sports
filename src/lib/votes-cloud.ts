import { useEffect } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MatchVotes } from "@/lib/voting";

type GameVoteRow = {
  id: string;
  game_id: string;
  voter_id: string;
  mvp_id: string | null;
  pereba_id: string | null;
  apitto_ratings: Record<string, number> | null;
};

type GameRow = { voting_open: boolean | null };

export type CloudVotes = MatchVotes;

function rowsToVotes(rows: GameVoteRow[], gameVotingOpen: boolean): MatchVotes {
  const v: MatchVotes = {
    mvpVotes: {},
    perebaVotes: {},
    apitto: {},
    closed: !gameVotingOpen,
  };
  for (const r of rows) {
    if (r.mvp_id) v.mvpVotes[r.voter_id] = r.mvp_id;
    if (r.pereba_id) v.perebaVotes[r.voter_id] = r.pereba_id;
    if (r.apitto_ratings && typeof r.apitto_ratings === "object") {
      v.apitto[r.voter_id] = r.apitto_ratings;
    }
  }
  return v;
}

export const matchVotesQuery = (gameId: string | undefined) =>
  queryOptions({
    queryKey: ["match-votes", gameId],
    enabled: !!gameId,
    staleTime: 10 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<{ votes: MatchVotes; voterIds: string[] }> => {
      const [votesRes, gameRes] = await Promise.all([
        supabase
          .from("game_votes")
          .select("id, game_id, voter_id, mvp_id, pereba_id, apitto_ratings")
          .eq("game_id", gameId!),
        supabase
          .from("games")
          .select("voting_open")
          .eq("id", gameId!)
          .maybeSingle(),
      ]);
      const rows = (votesRes.data ?? []) as GameVoteRow[];
      const game = (gameRes.data ?? null) as GameRow | null;
      // Default to "open" unless the game explicitly sets voting_open=false.
      const open = game ? game.voting_open !== false : true;
      return {
        votes: rowsToVotes(rows, open),
        voterIds: rows.map((r) => r.voter_id),
      };
    },
  });

export function useMatchVotes(gameId: string | undefined) {
  return useQuery(matchVotesQuery(gameId));
}

/** Subscribes to realtime changes for this game's votes/voting_open. */
export function useMatchVotesRealtime(gameId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined" || !gameId) return;
    const invalidate = () =>
      qc.invalidateQueries({ queryKey: ["match-votes", gameId] });
    const channel = supabase
      .channel(`game-votes:${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_votes", filter: `game_id=eq.${gameId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        invalidate,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, qc]);
}

export function useSubmitVote(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      voterId: string;
      mvpId?: string | null;
      perebaId?: string | null;
      apittoRatings?: Record<string, number> | null;
    }) => {
      const { error } = await supabase
        .from("game_votes")
        .upsert(
          {
            game_id: gameId,
            voter_id: payload.voterId,
            mvp_id: payload.mvpId ?? null,
            pereba_id: payload.perebaId ?? null,
            apitto_ratings: payload.apittoRatings ?? null,
          } as never,
          { onConflict: "game_id,voter_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match-votes", gameId] });
    },
  });
}

export function useCloseVoting(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("games")
        .update({ voting_open: false } as never)
        .eq("id", gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match-votes", gameId] });
    },
  });
}

export function viewerHasVoted(voterIds: string[] | undefined, viewerId: string): boolean {
  if (!voterIds || !viewerId) return false;
  return voterIds.includes(viewerId);
}