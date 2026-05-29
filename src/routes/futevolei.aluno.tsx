import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Activity, Calendar, Target } from "lucide-react";
import {
  getInstructorById,
  getMyMembership,
  getMyStudent,
  type Membership,
  type StudentProfile,
} from "@/lib/futevolei";

export const Route = createFileRoute("/futevolei/aluno")({
  component: AlunoDashboard,
  head: () => ({ meta: [{ title: "Futevôlei — Aluno" }] }),
});

function AlunoDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [instructorName, setInstructorName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const s = await getMyStudent();
      if (!s) {
        navigate({ to: "/futevolei/aluno/cadastro", replace: true });
        return;
      }
      setStudent(s);
      const m = await getMyMembership();
      setMembership(m);
      if (m) {
        const inst = await getInstructorById(m.instructor_id);
        setInstructorName(inst?.nome ?? "");
      }
      setLoading(false);
    })();
  }, [navigate]);

  if (loading || !student) {
    return <div className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-400">Carregando…</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 bg-zinc-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Sair do Futevôlei
          </Link>
          <div className="text-sm text-zinc-300">
            <span className="text-zinc-500">Aluno:</span> <span className="font-semibold">{student.nome}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!membership || membership.status === "pending" ? (
          <BlockedScreen status={membership?.status ?? "pending"} />
        ) : membership.status === "rejected" ? (
          <RejectedScreen onRetry={() => navigate({ to: "/futevolei/aluno/cadastro" })} />
        ) : (
          <ApprovedDashboard student={student} instructorName={instructorName} />
        )}
      </main>
    </div>
  );
}

function BlockedScreen({ status }: { status: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-20 text-center">
      <Clock className="h-12 w-12 text-amber-400" />
      <h2 className="mt-4 text-xl font-bold">Aguardando o professor aprovar sua entrada…</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Assim que seu instrutor aceitar sua solicitação, o painel será liberado automaticamente.
      </p>
      <p className="mt-4 text-xs uppercase tracking-wider text-zinc-500">Status: {status}</p>
    </div>
  );
}

function RejectedScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-20 text-center">
      <h2 className="text-xl font-bold">Solicitação recusada</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Você pode tentar com outro código de professor.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-sky-400 px-4 py-2 font-semibold text-zinc-950 hover:bg-sky-300"
      >
        Inserir outro código
      </button>
    </div>
  );
}

function ApprovedDashboard({ student, instructorName }: { student: StudentProfile; instructorName: string }) {
  return (
    <div className="space-y-6">
      {instructorName && (
        <p className="text-sm text-zinc-400">
          Instrutor: <span className="font-semibold text-white">{instructorName}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-sky-400/40 bg-gradient-to-br from-sky-400/10 to-zinc-900 p-6">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-sky-300" />
            <p className="text-sm uppercase tracking-wider text-sky-300/80">Nível Atual</p>
          </div>
          <div className="mt-3 text-3xl font-bold capitalize">{student.nivel_atual}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-zinc-300" />
            <p className="text-sm uppercase tracking-wider text-zinc-400">Radar de Habilidades</p>
          </div>
          <div className="mt-6 grid h-32 place-items-center rounded-lg border border-dashed border-white/10 text-xs text-zinc-500">
            Em breve
          </div>
        </div>
      </div>

      <Section icon={Calendar} title="Próximos Treinos">
        <Empty msg="Nenhum treino agendado." />
      </Section>

      <Section icon={Clock} title="Treinos Passados">
        <Empty msg="Sem histórico ainda." />
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {children}
    </section>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
      {msg}
    </div>
  );
}