import { Clock, CheckCircle2, Users } from "lucide-react";

export type Pelada = {
  id: string;
  name: string;
  time: string;
  participants: number;
  status: "Ativa" | "Confirmada";
  avatars: string[];
};

export function MatchCard({ pelada }: { pelada: Pelada }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02] hover:border-[#00FF00]/30">
      <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-[#00FF00]/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-50">{pelada.name}</h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            {pelada.time}
          </p>
        </div>
      </header>

      <div className="mt-5 flex items-center gap-3">
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
        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-300">
          <Users className="h-3 w-3" />
          {pelada.participants}
        </span>
      </div>

      <footer className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00FF00]">
          <CheckCircle2 className="h-4 w-4" />
          {pelada.status}
        </span>
        <button
          type="button"
          className="text-xs font-medium text-zinc-400 transition hover:text-[#00FF00]"
        >
          Ver detalhes →
        </button>
      </footer>
    </article>
  );
}