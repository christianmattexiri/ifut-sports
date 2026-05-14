import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Home,
  ShieldCheck,
  UserCircle2,
  LogOut,
  Clock,
  CheckCircle2,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ifutCrest from "@/assets/ifut-crest.png";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: "iFut — Minhas Peladas" }],
  }),
});

type Profile = { full_name: string | null; username: string };

type Pelada = {
  id: string;
  name: string;
  time: string;
  participants: number;
  status: "Ativa" | "Confirmada";
  avatars: string[];
};

const MOCK_PELADAS: Pelada[] = [
  { id: "1", name: "Pelada da Turma", time: "Sábado · 16h00", participants: 12, status: "Ativa", avatars: avatarSeeds(5) },
  { id: "2", name: "Quarta no Sintético", time: "Quarta · 20h30", participants: 10, status: "Confirmada", avatars: avatarSeeds(5) },
  { id: "3", name: "Racha do Trampo", time: "Sexta · 19h00", participants: 8, status: "Ativa", avatars: avatarSeeds(4) },
  { id: "4", name: "Domingueira", time: "Domingo · 09h00", participants: 14, status: "Confirmada", avatars: avatarSeeds(5) },
  { id: "5", name: "Pelada dos Veteranos", time: "Terça · 21h00", participants: 9, status: "Ativa", avatars: avatarSeeds(5) },
  { id: "6", name: "Resenha FC", time: "Quinta · 19h30", participants: 11, status: "Confirmada", avatars: avatarSeeds(5) },
  { id: "7", name: "Society Center", time: "Sábado · 10h00", participants: 7, status: "Ativa", avatars: avatarSeeds(4) },
  { id: "8", name: "Pelada Relâmpago", time: "Sexta · 22h00", participants: 6, status: "Confirmada", avatars: avatarSeeds(3) },
];

function avatarSeeds(n: number): string[] {
  const seeds = ["Felipe", "Bruno", "Caio", "Diego", "Eduardo", "Fabio", "Gustavo"];
  return seeds.slice(0, n).map(
    (s) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&backgroundColor=00ff00,1a1a1a`,
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", sess.session.user.id)
        .maybeSingle();
      if (!active) return;
      setProfile(
        data ?? { full_name: sess.session.user.email ?? "Jogador", username: "jogador" },
      );
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Até a próxima!");
    navigate({ to: "/" });
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Carregando...
      </div>
    );
  }

  const firstName = (profile?.full_name?.trim() || profile?.username || "Jogador").split(" ")[0];
  const username = profile?.username ?? "jogador";
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=00ff00`;

  return (
    <main className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans antialiased">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#00FF00]/10 blur-[160px]"
      />

      <div className="relative z-10 flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-[280px] shrink-0 flex-col justify-between border-r border-white/5 bg-zinc-900/40 px-5 py-6 backdrop-blur-xl md:flex">
          {/* Top: logo */}
          <div>
            <div className="flex items-center justify-center pb-6">
              <img src={ifutCrest} alt="iFut" className="h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(0,255,0,0.45)]" />
            </div>

            {/* Nav */}
            <nav className="space-y-1.5">
              <NavItem icon={<Home className="h-4 w-4" />} label="Início" active />
              <NavItem
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Painel Admin"
                badge="Only for super admin"
              />
            </nav>
          </div>

          {/* Profile card */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt={firstName}
                className="h-11 w-11 rounded-full border border-[#00FF00]/40 bg-zinc-800 object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{firstName}</p>
                <p className="truncate text-xs text-zinc-400">@{username}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10"
              >
                <UserCircle2 className="h-3.5 w-3.5" />
                Meu perfil
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-red-500/20 hover:text-red-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          {/* Header */}
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00FF00]/80">
                Minhas peladas
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
                Olá, {firstName} <span className="inline-block">👋</span>
              </h1>
            </div>
            <p className="text-sm text-zinc-400">
              <span className="font-semibold text-zinc-200">{MOCK_PELADAS.length}</span> Peladas no Total
            </p>
          </header>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {MOCK_PELADAS.map((p) => (
              <PeladaCard key={p.id} pelada={p} />
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 flex justify-center pb-6">
            <button
              type="button"
              className="inline-flex w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-[#00FF00] px-6 py-4 text-base font-bold text-black shadow-[0_0_40px_-6px_rgba(0,255,0,0.9)] transition-transform duration-200 hover:scale-[1.02] hover:bg-[#22ff22] focus:outline-none focus:ring-2 focus:ring-[#00FF00]/60 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              Criar pelada
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function NavItem({
  icon,
  label,
  active,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#00FF00]/10 text-[#00FF00] shadow-[inset_0_0_0_1px_rgba(0,255,0,0.25)]"
          : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
      }`}
    >
      <span className="flex items-center gap-2.5">
        {icon}
        {label}
      </span>
      {badge && (
        <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
          {badge}
        </span>
      )}
    </button>
  );
}

function PeladaCard({ pelada }: { pelada: Pelada }) {
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