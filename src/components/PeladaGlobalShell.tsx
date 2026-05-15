import { useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { loadAdminSettings } from "@/routes/pelada.$id_.admin";
import { AudioFooterPlayer } from "@/components/AudioFooterPlayer";
import { peladaMatchQuery, viewerQuery } from "@/lib/pelada-queries";

/**
 * Mounted once at the root. Detects when the user is inside any
 * `/pelada/:id*` route and:
 *  - applies the pelada's --pelada-accent CSS variable globally so the
 *    chosen color persists across tab navigation
 *  - renders the AudioFooterPlayer fixed at the bottom so the music keeps
 *    playing while the user navigates between Início / Histórico / etc.
 */
export function PeladaGlobalShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const peladaId = useMemo(() => {
    const m = pathname.match(/^\/pelada\/([^/]+)/);
    return m ? m[1] : null;
  }, [pathname]);

  const [settings, setSettings] = useState(() =>
    peladaId ? loadAdminSettings(peladaId) : null,
  );
  const [latestMvp, setLatestMvp] = useState<{ id: string; name: string } | null>(null);

  // Shared React Query cache — same keys used by every pelada route, so this
  // is a cache hit after the first load and never refetches on tab nav.
  const { data: match, isSuccess: matchLoaded } = useQuery(peladaMatchQuery(peladaId ?? undefined));
  const { data: viewer } = useQuery(viewerQuery());
  const isPro = !!match?.is_pro;
  const viewerId = viewer?.id ?? "";

  // Reload settings when pelada changes or admin saves (storage event).
  useEffect(() => {
    if (!peladaId) {
      setSettings(null);
      return;
    }
    setSettings(loadAdminSettings(peladaId));
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.includes(`pelada:${peladaId}:adminSettings`)) {
        setSettings(loadAdminSettings(peladaId));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [peladaId]);

  // Read latest MVP from histórico (used by Som do MVP player).
  useEffect(() => {
    if (!peladaId || typeof window === "undefined") {
      setLatestMvp(null);
      return;
    }
    const key = `pelada:${peladaId}:historico`;
    const read = () => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return setLatestMvp(null);
        const arr = JSON.parse(raw) as Array<{
          date: string;
          mvp: string | null;
          teamA: { players: { id: string; name: string }[] };
          teamB: { players: { id: string; name: string }[] };
        }>;
        const sorted = [...arr].sort((a, b) => (a.date < b.date ? 1 : -1));
        const latest = sorted[0];
        if (!latest?.mvp) return setLatestMvp(null);
        const all = [...latest.teamA.players, ...latest.teamB.players];
        const p = all.find((x) => x.id === latest.mvp);
        setLatestMvp(p ? { id: p.id, name: p.name } : null);
      } catch { setLatestMvp(null); }
    };
    read();
    const onStorage = (e: StorageEvent) => { if (e.key === key) read(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [peladaId]);

  // Apply accent globally — but only AFTER the match record loaded so we don't
  // briefly paint the default green over a PRO accent on first navigation.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!peladaId) {
      document.documentElement.style.removeProperty("--pelada-accent");
      return;
    }
    if (!matchLoaded) return; // wait for is_pro to be known
    const accent = settings && isPro ? settings.accent || "#00FF00" : "#00FF00";
    document.documentElement.style.setProperty("--pelada-accent", accent);
  }, [settings, isPro, peladaId, matchLoaded]);

  if (!peladaId || !settings) return null;
  // PRO gate: music modules only run on PRO peladas.
  if (!isPro) return null;
  if (!settings.modules.musica && !settings.modules.somMvp) return null;

  if (settings.modules.musica) {
    // Admin permission can't be derived globally without admin_id; fetched below.
    return <AdminAwareMusicPlayer peladaId={peladaId} viewerId={viewerId} />;
  }
  // Som do MVP
  return (
    <AudioFooterPlayer
      peladaId={peladaId}
      mode="somMvp"
      canEdit={!!latestMvp && viewerId === latestMvp.id}
      titlePrefix={latestMvp ? `Som do MVP: ${latestMvp.name}` : "Som do MVP"}
      disabled={!latestMvp}
      disabledHint="Aguardando o primeiro MVP"
      scopeKey={latestMvp?.id ?? "none"}
    />
  );
}

function AdminAwareMusicPlayer({ peladaId, viewerId }: { peladaId: string; viewerId: string }) {
  const { data: match } = useQuery(peladaMatchQuery(peladaId));
  const { data: viewer } = useQuery(viewerQuery());
  const isOwner = !!match && match.admin_id === viewerId;
  const isSuper = (viewer?.username ?? "").toLowerCase() === "christianmatte";
  const canEdit = isOwner || isSuper;
  return (
    <AudioFooterPlayer
      peladaId={peladaId}
      mode="musica"
      canEdit={canEdit}
      titlePrefix="Música da Pelada"
    />
  );
}