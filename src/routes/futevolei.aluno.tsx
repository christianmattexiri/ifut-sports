import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { EliteAcademyDashboard } from "@/components/futevolei/EliteAcademyDashboard";
import { FutevoleiRouteLoader } from "@/components/futevolei/FutevoleiRouteLoader";
import {
  formatFutevoleiError,
  getInstructorById,
  getMyStudent,
  joinByInviteCode,
} from "@/lib/futevolei";
import {
  futevoleiQueryKeys,
  myMembershipQuery,
  myStudentQuery,
} from "@/lib/futevolei-queries";

export const Route = createFileRoute("/futevolei/aluno")({
  component: AlunoDashboard,
  head: () => ({ meta: [{ title: "Futevôlei — Aluno" }] }),
});

function AlunoDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [retryingInvite, setRetryingInvite] = useState(false);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: student, isLoading: studentLoading, isFetched: studentFetched } = useQuery({
    ...myStudentQuery(),
    queryFn: getMyStudent,
  });

  useEffect(() => {
    if (!studentFetched || studentLoading) return;
    if (!student) navigate({ to: "/futevolei/cadastro-aluno", replace: true });
  }, [student, studentFetched, studentLoading, navigate]);

  const { data: membership, isLoading: membershipLoading } = useQuery(myMembershipQuery());

  const { data: instructor, isLoading: instructorLoading } = useQuery({
    queryKey: ["futevolei", "instructor-profile", membership?.instructor_id ?? ""],
    enabled: membership?.status === "approved" && !!membership.instructor_id,
    queryFn: () => getInstructorById(membership!.instructor_id),
  });

  const isLoading = studentLoading || membershipLoading;

  async function submitNewCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Informe o código do professor");
      return;
    }
    setSaving(true);
    try {
      await joinByInviteCode(code);
      await queryClient.invalidateQueries({ queryKey: futevoleiQueryKeys.membership });
      await queryClient.invalidateQueries({ queryKey: futevoleiQueryKeys.roles });
      toast.success("Nova solicitação enviada!");
      setRetryingInvite(false);
      setCode("");
    } catch (err: unknown) {
      toast.error(formatFutevoleiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !studentFetched || !student) {
    return <FutevoleiRouteLoader />;
  }

  const showRejected = membership?.status === "rejected" && !retryingInvite;
  const showPending = !membership || membership.status === "pending";
  const showApproved = membership?.status === "approved";

  return (
    <div className="min-h-screen bg-zinc-950 pt-14 text-white">
      <header className="sticky top-14 z-20 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Voltar à Home
          </Link>
          <div className="text-right text-sm">
            <span className="text-zinc-600">Aluno · </span>
            <span className="font-semibold text-zinc-200">{student.nome}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {showRejected ? (
          <RejectedScreen
            onRetry={() => {
              setCode("");
              setRetryingInvite(true);
            }}
          />
        ) : retryingInvite ? (
          <InviteCodePanel
            code={code}
            saving={saving}
            onCodeChange={setCode}
            onSubmit={submitNewCode}
            onCancel={() => {
              setRetryingInvite(false);
              setCode("");
            }}
          />
        ) : showPending ? (
          <BlockedScreen status={membership?.status ?? "sem vínculo"} />
        ) : showApproved ? (
          instructorLoading ? (
            <FutevoleiRouteLoader variant="inline" />
          ) : (
            <EliteAcademyDashboard
              student={student}
              instructorId={membership.instructor_id}
              instructorName={instructor?.nome ?? ""}
            />
          )
        ) : (
          <BlockedScreen status="pendente" />
        )}
      </main>
    </div>
  );
}

function InviteCodePanel({
  code,
  saving,
  onCodeChange,
  onSubmit,
  onCancel,
}: {
  code: string;
  saving: boolean;
  onCodeChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-sky-400/30 bg-zinc-900/80 p-6 shadow-[0_0_40px_-12px_rgba(56,189,248,0.35)]">
      <h2 className="text-xl font-bold text-white">Novo código do professor</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Informe o código de 6 caracteres do instrutor com quem deseja treinar.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          maxLength={6}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
          placeholder="ABC123"
          required
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-sky-400 px-4 py-3 font-bold text-zinc-950 hover:bg-sky-300 disabled:opacity-60"
        >
          {saving ? "Enviando..." : "Solicitar vínculo"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-sm text-zinc-500 hover:text-zinc-300"
        >
          Cancelar
        </button>
      </form>
    </div>
  );
}

function BlockedScreen({ status }: { status: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-24 text-center">
      <Clock className="h-12 w-12 text-amber-400" strokeWidth={1.5} />
      <h2 className="mt-4 text-xl font-bold">Aguardando o professor aprovar sua entrada…</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Assim que seu instrutor aceitar sua solicitação, o painel Elite Academy será liberado.
      </p>
      <p className="mt-4 text-xs uppercase tracking-wider text-zinc-600">Status: {status}</p>
    </div>
  );
}

function RejectedScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-24 text-center">
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
