import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Users, ArrowLeft, LogOut } from "lucide-react";
import { getMyInstructor, type InstructorProfile } from "@/lib/futevolei";

export const Route = createFileRoute("/futevolei/instrutor")({
  component: InstrutorLayout,
});

function InstrutorLayout() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<InstructorProfile | null | undefined>(undefined);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    getMyInstructor().then((p) => {
      setProfile(p);
      if (p === null) navigate({ to: "/futevolei/onboarding", replace: true });
    });
  }, [navigate]);

  if (profile === undefined) {
    return <div className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-400">Carregando…</div>;
  }
  if (!profile) return null;

  const nav = [
    { to: "/futevolei/instrutor", label: "Visão Geral", icon: Home, exact: true },
    { to: "/futevolei/instrutor/alunos", label: "Alunos", icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 bg-zinc-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Sair do Futevôlei
          </Link>
          <div className="text-sm text-zinc-300">
            <span className="text-zinc-500">Instrutor:</span> <span className="font-semibold">{profile.nome}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 md:flex-row flex-col">
        <nav className="md:w-56 md:shrink-0">
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {nav.map((n) => {
              const Icon = n.icon;
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              return (
                <li key={n.to} className="shrink-0">
                  <Link
                    to={n.to}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? "bg-amber-400 text-zinc-950 font-semibold"
                        : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}