import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Pencil, Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  peladaId: string;
  mode: "musica" | "somMvp";
  canEdit: boolean;
  titlePrefix: string;
  disabled?: boolean;
  disabledHint?: string;
  /** When mode is somMvp, scope the saved song by MVP user id */
  scopeKey?: string;
};

type Saved = { url: string; title: string };

const storageKey = (peladaId: string, mode: string, scope: string) =>
  `pelada:${peladaId}:audio:${mode}:${scope}`;

function ytId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
    return m?.[2] ?? null;
  } catch {
    return null;
  }
}

// Carrega o script da YouTube IFrame API uma única vez por página.
// Usar a API oficial (em vez de postMessage cru) garante que o
// player.playVideo() rode síncrono dentro do clique do usuário —
// requisito do iOS/Android para liberar áudio no primeiro toque.
let ytApiPromise: Promise<unknown> | null = null;
function loadYouTubeApi(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const w = window as unknown as { YT?: { Player: unknown }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT);
    };
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}

export function AudioFooterPlayer({ peladaId, mode, canEdit, titlePrefix, disabled, disabledHint, scopeKey }: Props) {
  const scope = mode === "musica" ? "global" : (scopeKey || "current");
  const key = storageKey(peladaId, mode, scope);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [playing, setPlaying] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUrl, setEditUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<{ playVideo: () => void; pauseVideo: () => void; destroy: () => void } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(key);
      setSaved(raw ? JSON.parse(raw) : null);
    } catch { setSaved(null); }
    setPlaying(false);
  }, [key]);

  const videoId = useMemo(() => (saved?.url ? ytId(saved.url) : null), [saved]);

  // Cria/atualiza o player via YouTube IFrame API.
  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    let cancelled = false;
    setReady(false);
    playerRef.current?.destroy?.();
    playerRef.current = null;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !YT || !containerRef.current) return;
      const Ctor = (YT as { Player: new (el: Element, opts: unknown) => typeof playerRef.current }).Player;
      playerRef.current = new Ctor(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          playsinline: 1,
          loop: 1,
          playlist: videoId,
        },
        events: {
          onReady: () => { if (!cancelled) setReady(true); },
          onStateChange: (e: { data: number }) => {
            // 1 = playing, 2 = paused, 0 = ended
            if (e.data === 1) setPlaying(true);
            else if (e.data === 2 || e.data === 0) setPlaying(false);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId]);

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    // Chamada síncrona dentro do clique — necessária para iOS/Android
    // liberarem o áudio na primeira interação.
    if (playing) p.pauseVideo();
    else p.playVideo();
  }

  function openEdit() {
    setEditUrl(saved?.url ?? "");
    setEditTitle(saved?.title ?? "");
    setEditOpen(true);
  }
  function persist() {
    const next = { url: editUrl.trim(), title: editTitle.trim() };
    localStorage.setItem(key, JSON.stringify(next));
    setSaved(next);
    setEditOpen(false);
  }

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-white/10 bg-zinc-950/95 backdrop-blur-xl">
        <div
          className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.625rem)" }}
        >
          <button
            type="button"
            disabled={disabled || !videoId || !ready}
            onClick={togglePlay}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--pelada-accent)] text-black shadow-[0_0_20px_-6px_var(--pelada-accent)] transition active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
            aria-label={playing ? "Pausar" : "Tocar"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-wider text-zinc-500">
              {mode === "musica" ? "Música da Pelada" : titlePrefix}
            </p>
            <p className="truncate text-sm font-semibold text-zinc-100">
              {disabled ? (disabledHint ?? "Indisponível") : saved?.title || (videoId ? "Reproduzindo" : "Sem música definida")}
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={openEdit}
              disabled={disabled}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:bg-white/5 hover:text-amber-300 active:scale-95 disabled:opacity-40"
              aria-label="Editar música"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Container montado pela YouTube IFrame API. Permanece invisível. */}
        <div
          aria-hidden
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
        >
          {videoId && <div ref={containerRef} />}
        </div>
      </footer>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md border border-white/10 bg-zinc-950 text-zinc-100">
          <DialogTitle>Editar áudio</DialogTitle>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Título</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Nome da música" className="mt-1 bg-zinc-900 border-white/10" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">URL do YouTube</label>
              <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://youtu.be/..." className="mt-1 bg-zinc-900 border-white/10" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={persist} className="bg-[var(--pelada-accent)] text-black hover:opacity-90">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
