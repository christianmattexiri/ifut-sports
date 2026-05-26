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
  /** Cloud-stored audio (set by admin via Admin panel). Takes precedence over localStorage. */
  cloudAudio?: { url: string; title: string } | null;
};

type Saved = { url: string; title: string };

const storageKey = (peladaId: string, mode: string, scope: string) =>
  `pelada:${peladaId}:audio:${mode}:${scope}`;

function ytId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(embed|shorts|v|live)\/([^/?]+)/);
    return m?.[2] ?? null;
  } catch {
    return null;
  }
}

// Carrega a YouTube IFrame API uma única vez por sessão.
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  // @ts-expect-error YT global
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    // @ts-expect-error YT global
    const prev = window.onYouTubeIframeAPIReady;
    // @ts-expect-error YT global
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") try { prev(); } catch {}
      resolve();
    };
  });
  return ytApiPromise;
}

export function AudioFooterPlayer({
  peladaId,
  mode,
  canEdit,
  titlePrefix,
  disabled,
  disabledHint,
  scopeKey,
  cloudAudio,
}: Props) {
  const scope = mode === "musica" ? "global" : scopeKey || "current";
  const key = storageKey(peladaId, mode, scope);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [playing, setPlaying] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUrl, setEditUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  // Mantemos a refer última do videoId para o setup assíncrono.
  const pendingPlayRef = useRef(false);

  // Carrega URL salva no localStorage ao montar ou mudar de pelada.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Cloud-stored URL (definido pelo admin) tem prioridade sobre o localStorage.
    if (cloudAudio && cloudAudio.url) {
      setSaved({ url: cloudAudio.url, title: cloudAudio.title || "" });
      setPlaying(false);
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      setSaved(raw ? JSON.parse(raw) : null);
    } catch {
      setSaved(null);
    }
    setPlaying(false);
  }, [key, cloudAudio?.url, cloudAudio?.title]);

  const videoId = useMemo(() => (saved?.url ? ytId(saved.url) : null), [saved]);

  // Inicializa / atualiza o YouTube Player quando o videoId muda.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!videoId || disabled) {
      // Destrói player existente se não houver vídeo.
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      setReady(false);
      return;
    }

    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled) return;
      // @ts-expect-error YT global
      const YT = window.YT;
      if (!YT || !containerRef.current) return;

      // Se já existe player, troca o vídeo em vez de recriar.
      if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
        try {
          playerRef.current.cueVideoById(videoId);
          return;
        } catch {
          try { playerRef.current.destroy(); } catch {}
          playerRef.current = null;
        }
      }

      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          playsinline: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: () => {
            setReady(true);
            if (pendingPlayRef.current) {
              pendingPlayRef.current = false;
              try { playerRef.current?.playVideo(); } catch {}
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (e: any) => {
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
            if (e.data === 1) setPlaying(true);
            else if (e.data === 2) setPlaying(false);
            else if (e.data === 0) {
              // Loop manual
              try { playerRef.current?.playVideo(); } catch {}
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [videoId, disabled]);

  // Limpa ao desmontar componente inteiro.
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, []);

  function togglePlay() {
    const p = playerRef.current;
    // CRÍTICO p/ iOS/Android: chamar playVideo() SÍNCRONO dentro do gesto.
    if (!p || typeof p.playVideo !== "function") {
      // Player ainda não inicializado: marca intenção, onReady toca.
      pendingPlayRef.current = true;
      return;
    }
    try {
      if (playing) p.pauseVideo();
      else p.playVideo();
    } catch {}
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

  const statusText = () => {
    if (disabled) return disabledHint ?? "Indisponível";
    if (!videoId) return "Sem música definida";
    if (!ready) return saved?.title ? `${saved.title} (toque para tocar)` : "Toque para tocar";
    return saved?.title || "Reproduzindo";
  };

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-white/10 bg-zinc-950/95 backdrop-blur-xl">
        <div
          className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.625rem)" }}
        >
          <button
            type="button"
            disabled={disabled || !videoId}
            onClick={togglePlay}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--pelada-accent)] text-black shadow-[0_0_20px_-6px_var(--pelada-accent)] transition active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
            aria-label={playing ? "Pausar" : "Tocar"}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-wider text-zinc-500">
              {mode === "musica" ? "Música da Pelada" : titlePrefix}
            </p>
            <p className="truncate text-sm font-semibold text-zinc-100">
              {statusText()}
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

        {/* YouTube IFrame Player — invisível mas presente no DOM (necessário p/ áudio). */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: -1,
          }}
        >
          <div ref={containerRef} />
        </div>
      </footer>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md border border-white/10 bg-zinc-950 text-zinc-100">
          <DialogTitle>Editar áudio</DialogTitle>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Título
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Nome da música"
                className="mt-1 bg-zinc-900 border-white/10"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                URL do YouTube
              </label>
              <Input
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://youtu.be/..."
                className="mt-1 bg-zinc-900 border-white/10"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={persist}
                className="bg-[var(--pelada-accent)] text-black hover:opacity-90"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
