import { memo } from "react";
import { Clock, CheckCircle2, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ProTag } from "@/routes/pelada.$id";

export type Pelada = {
  id: string;
  name: string;
  time: string;
  participants: number;
  status: "Ativa" | "Confirmada";
  avatars: string[];
  logoUrl?: string | null;
  isPro?: boolean;
};

function MatchCardImpl({ pelada }: { pelada: Pelada; onClick?: () => void }) {
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <Link
      to="/pelada/$id"
      params={{ id: pelada.id }}
      className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02] hover:border-[#00FF00]/30 focus:outline-none focus:ring-2 focus:ring-[#00FF00]/60"
    >
      <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-[#00FF00]/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="relative">
            {pelada.logoUrl ? (
              <img
                src={pelada.logoUrl}
                alt={pelada.name}
                className="h-20 w-20 rounded-full border-2 border-[#00FF00]/40 bg-zinc-800 object-cover shadow-[0_0_25px_-8px_rgba(0,255,0,0.55)]"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#00FF00]/40 bg-zinc-800 text-2xl font-black text-[#00FF00] shadow-[0_0_25px_-8px_rgba(0,255,0,0.55)]">
                {pelada.name.charAt(0).toUpperCase()}
              </div>
            )}
            {pelada.isPro && <ProTag className="absolute -right-1 -top-1" />}
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-50">{pelada.name}</h3>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-zinc-400">
              <Clock className="h-4 w-4" />
              {pelada.time}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 flex items-center gap-3">
        <div className="flex -space-x-2">
          {pelada.avatars.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-8 w-8 rounded-full border-2 border-zinc-900 bg-zinc-800 object-cover"
            />
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-sm font-semibold text-zinc-200">
          <Users className="h-4 w-4" />
          {pelada.participants} {pelada.participants === 1 ? "membro" : "membros"}
        </span>
      </div>

      <footer className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00FF00]">
          <CheckCircle2 className="h-4 w-4" />
          {pelada.status}
        </span>
        <button
          type="button"
          onClick={stop}
          className="text-xs font-medium text-zinc-400 transition hover:text-[#00FF00]"
        >
          Ver detalhes →
        </button>
      </footer>
    </Link>
  );
}

export const MatchCard = memo(MatchCardImpl);