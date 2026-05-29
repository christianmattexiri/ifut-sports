import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, GraduationCap, User2 } from "lucide-react";

export const Route = createFileRoute("/futevolei/onboarding")({
  component: OnboardingPage,
  head: () => ({ meta: [{ title: "Futevôlei — Onboarding" }] }),
});

function OnboardingPage() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="mt-6 text-3xl font-bold">🏐 Futevôlei</h1>
        <p className="mt-2 text-zinc-400">Você é Instrutor ou Aluno?</p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/futevolei/cadastro-instrutor" })}
            className="group flex flex-col items-center gap-4 rounded-2xl border border-amber-400/40 bg-zinc-900 p-8 transition hover:border-amber-400 hover:shadow-[0_0_30px_-5px_rgba(251,191,36,0.5)]"
          >
            <GraduationCap className="h-16 w-16 text-amber-400" strokeWidth={1.8} />
            <div className="text-xl font-semibold">Sou Instrutor</div>
            <p className="text-sm text-zinc-400">Cadastre seus alunos e gerencie treinos</p>
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/futevolei/cadastro-aluno" })}
            className="group flex flex-col items-center gap-4 rounded-2xl border border-sky-400/40 bg-zinc-900 p-8 transition hover:border-sky-400 hover:shadow-[0_0_30px_-5px_rgba(56,189,248,0.5)]"
          >
            <User2 className="h-16 w-16 text-sky-400" strokeWidth={1.8} />
            <div className="text-xl font-semibold">Sou Aluno</div>
            <p className="text-sm text-zinc-400">Entre com o código do seu professor</p>
          </button>
        </div>
      </div>
    </main>
  );
}