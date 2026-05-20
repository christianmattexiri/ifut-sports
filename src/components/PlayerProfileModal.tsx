import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Target, Handshake, Trophy, Gamepad2, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { loadHistoryAsync, type HistMatch } from "@/routes/pelada.$id_.historico";
import { onProfileUpdate, onStatsUpdated } from "@/lib/profile-sync";
import { fetchPlayerMvpSummary, type PlayerMvpSummary } from "@/lib/games-storage";

export function PlayerProfileModal({
  open,
  onOpenChange,
  matchId,
  userId,
  fallbackName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matchId: string;
  userId: string | null;
  fallbackName?: string;
}) {
  const [name, setName] = useState(fallbackName ?? "Jogador");
  const [username, setUsername] = useState<string>("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [history, setHistory] = useState<HistMatch[]>([]);
  const [mvpSummary, setMvpSummary] = useState<PlayerMvpSummary>({ total: 0, recent: [] });

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    loadHistoryAsync(matchId).then((h) => { if (!cancelled) setHistory(h); });
    fetchPlayerMvpSummary(matchId, userId, 3).then((s) => { if (!cancelled) setMvpSummary(s); });
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        setName(data.full_name || data.username || fallbackName || "Jogador");
        setUsername(data.username || "");
        setAvatar(data.avatar_url ?? null);
      } else {
        setName(fallbackName ?? "Jogador");
        setUsername("");
        setAvatar(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, userId, matchId, fallbackName]);

  useEffect(() => {
    if (!open || !userId) return () => {};
    return onStatsUpdated(() => {
      loadHistoryAsync(matchId).then(setHistory);
      fetchPlayerMvpSummary(matchId, userId, 3).then(setMvpSummary);
    });
  }, [open, userId, matchId]);

  useEffect(() => {
    return onProfileUpdate((u) => {
      if (u.userId !== userId) return;
      if (u.full_name !== undefined && u.full_name !== null) setName(u.full_name);
      if (u.avatar_url !== undefined) setAvatar(u.avatar_url ?? null);
    });
  }, [userId]);

  const stats = useMemo(() => {
    let goals = 0, assists = 0, mvp = 0, wins = 0, draws = 0, losses = 0;
    const my = history.filter((h) =>
      [...h.teamA.players, ...h.teamB.players].some((p) => p.id === userId),
    );
    for (const m of my) {
      const all = [...m.teamA.players, ...m.teamB.players];
      const me = all.find((p) => p.id === userId)!;
      goals += me.goals || 0;
      assists += me.assists || 0;
      if (m.mvp === me.id) mvp += 1;
      const sa = m.teamA.players.reduce((a, p) => a + (p.goals || 0), 0);
      const sb = m.teamB.players.reduce((a, p) => a + (p.goals || 0), 0);
      const inA = m.teamA.players.some((p) => p.id === me.id);
      const myS = inA ? sa : sb;
      const opp = inA ? sb : sa;
      if (myS > opp) wins++; else if (myS === opp) draws++; else losses++;
    }
    const games = my.length;
    return {
      goals, assists, mvp: mvpSummary.total || mvp, games, wins, draws, losses,
      winRate: games ? Math.round((wins / games) * 100) : 0,
    };
  }, [history, userId, mvpSummary.total]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-zinc-950 text-zinc-100 p-0 overflow-hidden">
        <div className="relative bg-gradient-to-br from-zinc-900 to-zinc-950 px-6 pb-6 pt-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-amber-400 bg-zinc-900 shadow-[0_0_30px_-5px_rgba(251,191,36,0.6)]">
              {avatar ? (
                <img src={avatar} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-zinc-500">
                  {(name || "?").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black uppercase tracking-wider text-amber-400">{name}</h3>
            {username && <p className="text-xs font-medium text-[var(--pelada-accent)]">@{username}</p>}
            <div className="mt-2 inline-flex items-center gap-2 rounded-xl border-2 border-amber-400/60 bg-amber-400/5 px-4 py-2">
              <span className="font-mono text-2xl font-black tabular-nums text-amber-400">
                {stats.goals + stats.assists}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">G+A</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            <Mini icon={<Target className="h-4 w-4" />} value={stats.goals} label="Gols" color="#fb923c" />
            <Mini icon={<Handshake className="h-4 w-4" />} value={stats.assists} label="Assists" color="#60a5fa" />
            <Mini icon={<Trophy className="h-4 w-4" />} value={stats.mvp} label="MVP" color="#facc15" />
            <Mini icon={<Gamepad2 className="h-4 w-4" />} value={stats.games} label="Jogos" color="var(--pelada-accent)" />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-zinc-900/40 px-3 py-3">
            <Cell value={stats.wins} label="V" color="text-[var(--pelada-accent)]" />
            <Cell value={stats.draws} label="E" color="text-zinc-400" />
            <Cell value={stats.losses} label="D" color="text-red-500" />
            <Cell value={`${stats.winRate}%`} label="Win" color="text-white" />
          </div>

          {mvpSummary.recent.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Últimos MVPs
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mvpSummary.recent.map((m) => (
                  <span key={m.id} className="rounded-md bg-zinc-900/70 px-2 py-1 text-[10px] font-semibold text-zinc-300">
                    {formatDate(m.date)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {userId && (
            <Link
              to="/pelada/$id/jogador/$userId"
              params={{ id: matchId, userId }}
              onClick={() => onOpenChange(false)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--pelada-accent)]/40 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--pelada-accent)] transition hover:bg-[var(--pelada-accent)]/10"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver perfil completo
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function Mini({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-white/10 bg-zinc-900/40 py-2">
      <span style={{ color }}>{icon}</span>
      <p className="font-mono text-lg font-black tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
    </div>
  );
}

function Cell({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className={`font-mono text-base font-black tabular-nums ${color}`}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
    </div>
  );
}
