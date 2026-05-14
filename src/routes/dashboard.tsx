import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Home,
  ShieldCheck,
  UserCircle2,
  LogOut,
  Plus,
  CalendarDays,
  ArrowDown,
  Trophy,
  Repeat,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ifutCrest from "@/assets/ifut-crest.png";
import { MatchCard, type Pelada } from "@/components/MatchCard";
import { ProfileDialog } from "@/components/ProfileDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: "iFut — Minhas Peladas" }],
  }),
});

const SUPER_ADMIN_USERNAME = "christianmatte";

type Profile = {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
};

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [peladas] = useState<Pelada[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      const uid = sess.session.user.id;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      if (!active) return;
      setProfile(
        data ?? {
          id: uid,
          full_name: sess.session.user.email ?? "Jogador",
          username: "jogador",
          avatar_url: null,
        },
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

  if (!ready || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Carregando...
      </div>
    );
  }

  const firstName = (profile.full_name?.trim() || profile.username || "Jogador").split(" ")[0];
  const username = profile.username;
  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=00ff00`;
  const avatarUrl = profile.avatar_url || fallbackAvatar;
  const isSuperAdmin = username === SUPER_ADMIN_USERNAME;

  return (
    <main className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#00FF00]/10 blur-[160px]"
      />

      <div className="relative z-10 flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-[280px] shrink-0 flex-col justify-between border-r border-white/5 bg-zinc-900/40 px-5 py-6 backdrop-blur-xl md:flex">
          <div>
            <div className="flex items-center justify-center pb-6">
              <img
                src={ifutCrest}
                alt="iFut"
                className="h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(0,255,0,0.45)]"
              />
            </div>

            <nav className="space-y-1.5">
              <NavItem icon={<Home className="h-4 w-4" />} label="Início" active />
              {isSuperAdmin && (
                <NavItem
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Painel Admin"
                  badge="Super admin"
                />
              )}
            </nav>
          </div>

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
                onClick={() => setProfileOpen(true)}
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
              <span className="font-semibold text-zinc-200">{peladas.length}</span> Peladas no Total
            </p>
          </header>

          {peladas.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {peladas.map((p) => (
                <MatchCard key={p.id} pelada={p} />
              ))}
            </div>
          )}

          {/* CTA Dropdown */}
          <div className="mt-10 flex justify-center pb-6">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-[#00FF00] px-6 py-4 text-base font-bold text-black shadow-[0_0_40px_-6px_rgba(0,255,0,0.9)] transition-transform duration-200 hover:scale-[1.02] hover:bg-[#22ff22] focus:outline-none focus:ring-2 focus:ring-[#00FF00]/60 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              Criar pelada
            </button>
          </div>
        </section>
      </div>

      <CreatePeladaDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        userId={profile.id}
        fullName={profile.full_name ?? ""}
        username={profile.username}
        avatarUrl={profile.avatar_url}
        fallbackAvatar={fallbackAvatar}
        onUpdated={(data) => setProfile((p) => (p ? { ...p, ...data } : p))}
      />
    </main>
  );
}

function CreatePeladaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const options = [
    {
      icon: RefreshCw,
      emoji: "⚽",
      title: "Futebol Avulso",
      desc: "Pelada de um dia só",
    },
    {
      icon: RefreshCw,
      emoji: null,
      title: "Futebol Fixo",
      desc: "Pelada recorrente (ex: toda quarta)",
    },
    {
      icon: Trophy,
      emoji: null,
      title: "Organizar Campeonato",
      desc: "Módulo de torneio",
    },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl border border-[#00FF00] bg-zinc-950 p-8 sm:rounded-3xl shadow-[0_0_60px_-5px_rgba(0,255,0,0.7)]"
      >
        <DialogTitle className="text-center text-2xl font-bold text-white md:text-3xl">
          Criar uma nova Pelada
        </DialogTitle>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {options.map(({ icon: Icon, emoji, title, desc }) => (
            <button
              key={title}
              type="button"
              onClick={() => {
                toast("Em breve", { description: title });
                onOpenChange(false);
              }}
              className="group flex flex-col items-center justify-between gap-5 rounded-2xl border border-green-500/50 bg-zinc-900 p-6 text-center transition-all duration-200 hover:scale-[1.03] hover:border-[#00FF00] hover:shadow-[0_0_30px_-5px_rgba(0,255,0,0.7)]"
            >
              {emoji ? (
                <span className="text-6xl leading-none drop-shadow-[0_0_12px_rgba(0,255,0,0.8)]">
                  {emoji}
                </span>
              ) : (
                <Icon
                  className="h-16 w-16 text-[#00FF00] drop-shadow-[0_0_8px_rgba(0,255,0,0.8)]"
                  strokeWidth={2}
                />
              )}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                <p className="text-sm text-zinc-400">{desc}</p>
              </div>
              <span className="rounded-full border border-[#00FF00]/60 px-5 py-1.5 text-sm font-medium text-[#00FF00] transition group-hover:bg-[#00FF00]/10">
                Selecionar
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-16 text-center backdrop-blur-xl">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#00FF00]/30 bg-[#00FF00]/5 text-[#00FF00] shadow-[0_0_40px_-12px_rgba(0,255,0,0.6)]">
        <CalendarDays className="h-9 w-9" strokeWidth={1.6} />
      </div>
      <p className="max-w-sm text-base text-zinc-400">
        Você ainda não participa de nenhuma pelada.
      </p>
      <div className="mt-2 flex flex-col items-center gap-1 text-sm font-medium text-[#00FF00]">
        <span>Crie a sua primeira logo abaixo</span>
        <ArrowDown className="h-5 w-5 animate-bounce" />
      </div>
    </div>
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