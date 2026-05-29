import { Link } from "@tanstack/react-router";
import { GraduationCap, PersonStanding } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "instructor" | "student";

const styles: Record<
  Variant,
  {
    border: string;
    hover: string;
    icon: string;
    badge: string;
    title: string;
    to: "/futevolei/instrutor" | "/futevolei/aluno";
  }
> = {
  instructor: {
    border: "border-amber-400/30",
    hover: "md:hover:border-amber-400/50 md:hover:shadow-[0_0_30px_-8px_rgba(251,191,36,0.45)]",
    icon: "text-amber-400",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    title: "Painel do Instrutor",
    to: "/futevolei/instrutor",
  },
  student: {
    border: "border-sky-400/30",
    hover: "md:hover:border-sky-400/50 md:hover:shadow-[0_0_30px_-8px_rgba(56,189,248,0.45)]",
    icon: "text-sky-400",
    badge: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    title: "Painel do Aluno",
    to: "/futevolei/aluno",
  },
};

export function FutevoleiQuickAccessCard({ variant }: { variant: Variant }) {
  const s = styles[variant];
  const Icon = variant === "instructor" ? GraduationCap : PersonStanding;

  return (
    <Link
      to={s.to}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border bg-zinc-900/60 p-6 backdrop-blur-xl",
        "transition-transform duration-200 md:hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950",
        s.border,
        s.hover,
        variant === "instructor" ? "focus:ring-amber-400/60" : "focus:ring-sky-400/60",
      )}
    >
      <span
        className={cn(
          "absolute right-4 top-4 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          s.badge,
        )}
      >
        🏐 Futevôlei
      </span>

      <div
        aria-hidden
        className={cn(
          "absolute inset-x-6 -top-px h-px opacity-0 transition-opacity md:group-hover:opacity-100",
          variant === "instructor"
            ? "bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
            : "bg-gradient-to-r from-transparent via-sky-400/40 to-transparent",
        )}
      />

      <div className="flex items-center gap-4 pr-16">
        <div
          className={cn(
            "flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 bg-zinc-800",
            variant === "instructor" ? "border-amber-400/40" : "border-sky-400/40",
          )}
        >
          <Icon className={cn("h-9 w-9", s.icon)} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-zinc-50">{s.title}</h3>
          <p className="mt-1.5 text-sm text-zinc-400">
            {variant === "instructor"
              ? "Gerencie alunos e treinos"
              : "Acompanhe sua evolução"}
          </p>
        </div>
      </div>

      <footer className="mt-5 flex items-center justify-end border-t border-white/5 pt-4">
        <span
          className={cn(
            "text-xs font-medium transition md:group-hover:opacity-100",
            variant === "instructor" ? "text-amber-400/80" : "text-sky-400/80",
          )}
        >
          Abrir painel →
        </span>
      </footer>
    </Link>
  );
}
