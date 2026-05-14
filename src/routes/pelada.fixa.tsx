import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Home,
  ClipboardList,
  History,
  BarChart3,
  UserCircle2,
  ShieldCheck,
  Users,
  BarChart,
  User as UserIcon,
  Trophy,
  MapPin,
  Pencil,
  Crown,
  Target,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pelada/fixa")({
  component: PeladaFixa,
  head: () => ({ meta: [{ title: "iFut — Pelada" }] }),
});

function PeladaFixa() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("Jogador");
  const [peladaName, setPeladaName] = useState("Minha Pelada");
  const [peladaLogo, setPeladaLogo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      const uid = sess.session.user.id;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", uid)
        .maybeSingle();
      const full = data?.full_name?.trim() || data?.username || "Jogador";
      setFirstName(full.split(" ")[0]);
    })();

    try {
      const raw = localStorage.getItem("ifut:pelada:fixa");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.name) setPeladaName(p.name);
        if (p.logo) setPeladaLogo(p.logo);
      }
    } catch {
      /* noop */
    }
  }, [navigate]);

  return (
    <main className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#00FF00]/10 blur-[160px]"
      />

      <div className="relative z-10 flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-[280px] shrink-0 flex-col border-r border-white/5 bg-zinc-900/40 px-5 py-5 backdrop-blur-xl md:flex">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="mb-5 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition hover:text-[#00FF00]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Início do App
          </button>

          <div className="flex flex-col items-center gap-2 pb-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#00FF00]/40 bg-zinc-900 shadow-[0_0_30px_-8px_rgba(0,255,0,0.7)]">
              {peladaLogo ? (
                <img src={peladaLogo} alt={peladaName} className="h-full w-full object-cover" />
              ) : (
                <Trophy className="h-9 w-9 text-[#00FF00]" />
              )}
            </div>
            <p className="text-center text-base font-bold tracking-tight text-white">
              {peladaName}
            </p>
          </div>

          <nav className="space-y-1.5">
            <NavItem icon={<Home className="h-4 w-4" />} label="Início" active />
            <NavItem icon={<ClipboardList className="h-4 w-4" />} label="Lista de Presença" />
            <NavItem icon={<History className="h-4 w-4" />} label="Histórico" />
            <NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" />
            <NavItem icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil na pelada" />
          </nav>

          <div className="mt-auto pt-6">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"
            >
              <ShieldCheck className="h-4 w-4" />
              Administrador
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <h1 className="text-3xl font-bold uppercase tracking-tight text-[#00FF00] md:text-4xl">
            Bem-vindo, {firstName}! <span className="inline-block">👋</span>
          </h1>

          {/* Banner próximo jogo */}
          <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-[#00FF00]/30 bg-zinc-900/50 px-6 py-5 backdrop-blur-xl shadow-[0_0_40px_-15px_rgba(0,255,0,0.5)]">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-[#00FF00]" />
              <p className="text-sm font-medium text-zinc-200 md:text-base">
                Adicione a <span className="text-[#00FF00]">data</span> /{" "}
                <span className="text-[#00FF00]">local</span> /{" "}
                <span className="text-[#00FF00]">horário</span> da próxima pelada.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-[#00FF00]"
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          {/* Acesso rápido */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <QuickCard icon={<Users className="h-6 w-6" />} label="Presença" color="#00FF00" />
            <QuickCard icon={<BarChart className="h-6 w-6" />} label="Ranking" color="#fb923c" />
            <QuickCard icon={<UserIcon className="h-6 w-6" />} label="Stats" color="#60a5fa" />
          </div>

          {/* Última partida */}
          <div className="mt-10 rounded-2xl border border-white/5 bg-zinc-900/40 px-6 py-8 backdrop-blur-xl">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold tracking-wide text-zinc-200">
                Última Partida
              </h2>
            </div>
            <div className="mt-6 flex items-center justify-center gap-10">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Time A</p>
                <p className="mt-2 text-5xl font-black text-[#00FF00] drop-shadow-[0_0_20px_rgba(0,255,0,0.6)]">
                  0
                </p>
              </div>
              <p className="text-2xl font-light text-zinc-600">vs</p>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Time B</p>
                <p className="mt-2 text-5xl font-black text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                  0
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-zinc-500">Sem registros ainda</p>
          </div>

          {/* Pódio */}
          <div className="mt-10">
            <div className="mb-5 flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold tracking-wide text-zinc-200">
                Pódio da Última Partida
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-center">
              <PodiumCard
                icon={<Target className="h-6 w-6" />}
                title="Matador"
                subtitle="Gols"
                color="#fb923c"
              />
              <PodiumCard
                icon={<Sparkles className="h-6 w-6" />}
                title="Maestro"
                subtitle="Assists"
                color="#60a5fa"
                highlighted
              />
              <PodiumCard
                icon={<Crown className="h-6 w-6" />}
                title="Craque do Jogo"
                subtitle="MVP"
                color="#00FF00"
              />
            </div>
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
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#00FF00]/10 text-[#00FF00] shadow-[inset_0_0_0_1px_rgba(0,255,0,0.25)]"
          : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function QuickCard({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <button
      type="button"
      className="group flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 px-5 py-6 backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:border-[var(--qc-color)] hover:shadow-[0_0_30px_-8px_var(--qc-color)]"
      style={{ ["--qc-color" as string]: color }}
    >
      <span style={{ color }} className="transition group-hover:drop-shadow-[0_0_10px_currentColor]">
        {icon}
      </span>
      <span className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
        {label}
      </span>
    </button>
  );
}

function PodiumCard({
  icon,
  title,
  subtitle,
  color,
  highlighted,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border bg-zinc-900/50 px-5 backdrop-blur-xl transition ${
        highlighted
          ? "border-[var(--pc-color)] py-10 shadow-[0_0_40px_-10px_var(--pc-color)]"
          : "border-white/10 py-8"
      }`}
      style={{ ["--pc-color" as string]: color }}
    >
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed bg-zinc-900 text-zinc-700"
        style={{ borderColor: `${color}55` }}
      >
        <UserCircle2 className="h-10 w-10" />
      </div>
      <p className="text-sm text-zinc-500">Aguardando partida</p>
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <p className="text-base font-bold uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-xs uppercase tracking-wider text-zinc-500">{subtitle}</p>
    </div>
  );
}