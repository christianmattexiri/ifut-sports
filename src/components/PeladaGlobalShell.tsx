import { useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { loadAdminSettings } from "@/routes/pelada.$id_.admin";
import { AudioFooterPlayer } from "@/components/AudioFooterPlayer";

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
  const [isPro, setIsPro] = useState<boolean>(false);
  const [viewerId, setViewerId] = useState<string>("");
  const [latestMvp, setLatestMvp] = useState<{ id: string; name: string } | null>(null);

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

  // Fetch is_pro from DB.
  useEffect(() => {
    if (!peladaId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, is_pro")
        .eq("id", peladaId)
        .maybeSingle();
      if (cancelled) return;
      setIsPro(!!(data as any)?.is_pro);
    })();
    return () => { cancelled = true; };
  }, [peladaId]);

  // Viewer id (for somMvp permission).
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setViewerId(data.session?.user.id ?? "");
    })();
  }, []);

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

  // Apply accent globally so it survives navigation between sub-routes.
  // PRO-locked peladas always use the default green.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const accent = settings && isPro ? settings.accent || "#00FF00" : "#00FF00";
    document.documentElement.style.setProperty("--pelada-accent", accent);
    return () => {
      // Reset when leaving the pelada area entirely.
      if (!peladaId) {
        document.documentElement.style.removeProperty("--pelada-accent");
      }
    };
  }, [settings, isPro, peladaId]);

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
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    if (!viewerId) return;
    let cancelled = false;
    (async () => {
      const [{ data: m }, { data: prof }] = await Promise.all([
        supabase.from("matches").select("admin_id").eq("id", peladaId).maybeSingle(),
        supabase.from("profiles").select("username").eq("id", viewerId).maybeSingle(),
      ]);
      if (cancelled) return;
      const isOwner = (m as any)?.admin_id === viewerId;
      const isSuper = (prof?.username ?? "").toLowerCase() === "christianmatte";
      setCanEdit(isOwner || isSuper);
    })();
    return () => { cancelled = true; };
  }, [peladaId, viewerId]);
  return (
    <AudioFooterPlayer
      peladaId={peladaId}
      mode="musica"
      canEdit={canEdit}
      titlePrefix="Música da Pelada"
    />
  );
}