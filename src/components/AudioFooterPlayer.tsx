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

export function AudioFooterPlayer({ peladaId, mode, canEdit, titlePrefix, disabled, disabledHint, scopeKey }: Props) {
  const scope = mode === "musica" ? "global" : (scopeKey || "current");
  const key = storageKey(peladaId, mode, scope);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [playing, setPlaying] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUrl, setEditUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(key);
      setSaved(raw ? JSON.parse(raw) : null);
    } catch { setSaved(null); }
    setPlaying(false);
  }, [key]);

  const videoId = useMemo(() => (saved?.url ? ytId(saved.url) : null), [saved]);
  // Render iframe once per video; control via postMessage so mobile (iOS) plays
  // inside the same user gesture that toggled the button.
  const src = videoId
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1&playsinline=1&loop=1&playlist=${videoId}`
    : "";

  function togglePlay() {
    const win = iframeRef.current?.contentWindow;
    if (!win || !videoId) return;
    const func = playing ? "pauseVideo" : "playVideo";
    win.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
    setPlaying((p) => !p);
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
            disabled={disabled || !videoId}
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
        {/* Hidden YouTube player */}
        {src && (
          <iframe
            ref={iframeRef}
            src={src}
            allow="autoplay"
            title="audio"
            width={0}
            height={0}
            style={{ position: "absolute", width: 0, height: 0, border: 0, opacity: 0, pointerEvents: "none" }}
          />
        )}
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
