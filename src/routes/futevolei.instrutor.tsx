import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import ifutCrest from "@/assets/ifut-crest.png";
import { FutevoleiRouteLoader } from "@/components/futevolei/FutevoleiRouteLoader";
import type { InstructorProfile } from "@/lib/futevolei";
import { myInstructorQuery } from "@/lib/futevolei-queries";
import { viewerQuery } from "@/lib/pelada-queries";

export const InstructorProfileContext = createContext<InstructorProfile | null>(null);

export function useInstructorProfile() {
  const ctx = useContext(InstructorProfileContext);
  if (!ctx) throw new Error("useInstructorProfile must be used within InstrutorLayout");
  return ctx;
}

export const Route = createFileRoute("/futevolei/instrutor")({
  component: InstrutorLayout,
});

type NavItem = {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  to?: "/futevolei/instrutor" | "/futevolei/instrutor/alunos";
  exact?: boolean;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  {
    key: "overview",
    label: "Visão Geral",
    icon: LayoutDashboard,
    to: "/futevolei/instrutor",
    exact: true,
  },
  {
    key: "students",
    label: "Alunos",
    icon: Users,
    to: "/futevolei/instrutor/alunos",
  },
  {
    key: "messages",
    label: "Mensagens",
    icon: MessageSquare,
    disabled: true,
  },
  {
    key: "settings",
    label: "Configurações",
    icon: Settings,
    disabled: true,
  },
  {
    key: "trainings",
    label: "Treinos",
    icon: CalendarDays,
    disabled: true,
  },
];

function displayInitials(fullName: string | null | undefined, fallback: string) {
  const name = fullName?.trim() || fallback;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "IF";
}

function InstrutorLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile, isLoading } = useQuery(myInstructorQuery());
  const { data: viewer } = useQuery(viewerQuery());

  useEffect(() => {
    if (isLoading) return;
    if (!profile) {
      navigate({ to: "/dashboard", search: { openFutevolei: true }, replace: true });
    }
  }, [isLoading, profile, navigate]);

  if (isLoading || !profile) {
    return <FutevoleiRouteLoader />;
  }

  const instructorDisplay = profile.apelido?.trim() || profile.nome;
  const userDisplay =
    viewer?.full_name?.trim() || viewer?.username || instructorDisplay;
  const avatarUrl = viewer?.avatar_url ?? null;

  return (
    <div className="min-h-screen bg-zinc-950 pt-14 text-white">
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <aside className="fixed left-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] w-[72px] flex-col border-r border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl md:w-[240px]">
          {/* Logo + marca */}
          <div className="border-b border-zinc-800/80 px-3 py-4 md:px-5 md:py-5">
            <Link
              to="/dashboard"
              className="group flex flex-col items-center gap-2 md:items-start md:gap-3"
            >
              <img
                src={ifutCrest}
                alt="iFut Sports"
                className="h-10 w-auto object-contain drop-shadow-[0_0_20px_rgba(0,255,0,0.35)] md:h-12"
              />
              <div className="hidden text-left md:block">
                <p className="text-sm font-semibold tracking-tight text-zinc-100">
                  Painel Técnico
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 transition group-hover:text-zinc-400">
                  <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
                  Voltar ao iFut
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-2 py-4 md:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.to
                ? item.exact
                  ? pathname === item.to || pathname === `${item.to}/`
                  : pathname.startsWith(item.to)
                : false;

              if (item.disabled || !item.to) {
                return (
                  <span
                    key={item.key}
                    title="Em breve"
                    className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-zinc-600 md:px-4"
                  >
                    <Icon className="mx-auto h-[18px] w-[18px] md:mx-0" strokeWidth={1.5} />
                    <span className="hidden text-sm font-medium md:inline">{item.label}</span>
                  </span>
                );
              }

              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 md:px-4",
                    active
                      ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)]"
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
                  )}
                >
                  <Icon
                    className={cn(
                      "mx-auto h-[18px] w-[18px] md:mx-0",
                      active && "drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="hidden text-sm font-medium md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-zinc-800/80 p-3 md:p-4">
            <div className="flex items-center gap-3 rounded-xl bg-zinc-900/60 p-2 ring-1 ring-zinc-800 md:p-3">
              <Avatar className="h-9 w-9 shrink-0 border border-emerald-500/30 md:h-10 md:w-10">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={userDisplay} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-zinc-800 text-xs font-bold text-emerald-400">
                  {displayInitials(viewer?.full_name, instructorDisplay)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 flex-1 md:block">
                <p className="truncate text-sm font-semibold text-zinc-100">{userDisplay}</p>
                <p className="truncate text-xs text-zinc-500">Instrutor</p>
              </div>
              <button
                type="button"
                title="Sair para a Home"
                onClick={() => navigate({ to: "/dashboard" })}
                className="hidden rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300 md:block"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 pl-[72px] md:pl-[240px]">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            <InstructorProfileContext.Provider value={profile}>
              <Outlet />
            </InstructorProfileContext.Provider>
          </div>
        </main>
      </div>
    </div>
  );
}
