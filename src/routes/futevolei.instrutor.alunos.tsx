import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatars } from "@/lib/avatars";
import { supabase } from "@/integrations/supabase/client";
import {
  formatFutevoleiError,
  getMyInstructor,
  listInstructorMembers,
  removeStudentMembership,
  respondMembership,
  type Membership,
  type StudentProfile,
} from "@/lib/futevolei";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/futevolei/instrutor/alunos")({
  component: AlunosPage,
});

type Row = Membership & { student?: StudentProfile };
type TabKey = "approved" | "pending";

const TABS: { key: TabKey; label: string }[] = [
  { key: "approved", label: "Meus Alunos" },
  { key: "pending", label: "Solicitações Pendentes" },
];

function initialsFromName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function AlunosPage() {
  const [tab, setTab] = useState<TabKey>("approved");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isShadowModalOpen, setIsShadowModalOpen] = useState(false);
  const [shadowName, setShadowName] = useState("");
  const [isSubmittingShadow, setIsSubmittingShadow] = useState(false);

  async function handleSaveShadowStudent() {
    if (!shadowName.trim()) {
      toast.error("Digite o nome do aluno.");
      return;
    }
    if (!instructorId) return;

    setIsSubmittingShadow(true);
    try {
      // 1. Gera um ID único aleatório para esse aluno "fantasma"
      const shadowId = crypto.randomUUID();

      // 2. Insere na tabela de alunos
      const { error: studentErr } = await supabase
        .from("futevolei_students")
        .insert({
          user_id: shadowId,
          nome: shadowName.trim(),
          is_shadow: true
        });

      if (studentErr) throw studentErr;

      // 3. Cria o vínculo automático com o professor (já aprovado)
      const { error: memberErr } = await supabase
        .from("futevolei_members")
        .insert({
          instructor_id: instructorId,
          student_id: shadowId,
          status: "approved"
        });

      if (memberErr) throw memberErr;

      toast.success(`${shadowName} adicionado à sua turma!`);
      setShadowName(""); // Limpa o campo
      setIsShadowModalOpen(false); // Fecha o modal
      load(); // Recarrega a lista para o aluno aparecer na tela
      
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar o aluno. Verifique o console.");
    } finally {
      setIsSubmittingShadow(false);
    }
  }
  const load = useCallback(async () => {
    setLoading(true);
    const p = await getMyInstructor();
    if (!p) return;
    setInstructorId(p.user_id);
    const list = await listInstructorMembers(p.user_id);
    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const studentIds = useMemo(
    () => rows.map((r) => r.student_id).filter(Boolean),
    [rows],
  );
  const avatarMap = useAvatars(studentIds);

  async function respond(id: string, action: "approved" | "rejected") {
    try {
      await respondMembership(id, action);
      toast.success(action === "approved" ? "Aluno aceito!" : "Solicitação recusada.");
      await load();
    } catch (err: unknown) {
      toast.error(formatFutevoleiError(err));
    }
  }

  async function handleRemove(row: Row) {
    if (!instructorId) return;
    const nome = row.student?.nome ?? "este aluno";
    if (!window.confirm(`Remover ${nome} da sua turma? O vínculo será encerrado.`)) return;

    setRemovingId(row.id);
    try {
      await removeStudentMembership(instructorId, row.student_id);
      toast.success(`${nome} removido da turma.`);
      await load();
    } catch (err: unknown) {
      toast.error(formatFutevoleiError(err));
    } finally {
      setRemovingId(null);
    }
  }

  const filtered = rows.filter((r) => r.status === tab);
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const approvedCount = rows.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6">
<header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/80">
          Futevôlei · Gestão do Instrutor
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">Alunos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie solicitações e a turma de alunos aprovados.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-2 gap-4 sm:gap-0">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "relative px-4 py-3 text-sm font-medium transition-colors",
                tab === t.key ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-xs font-semibold",
                  tab === t.key
                    ? t.key === "approved"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-400/15 text-amber-300"
                    : "bg-zinc-800 text-zinc-400",
                )}
              >
                {t.key === "approved" ? approvedCount : pendingCount}
              </span>
              {tab === t.key && (
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-px h-0.5 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.6)]",
                    t.key === "approved" ? "bg-emerald-400" : "bg-amber-400",
                  )}
                />
              )}
            </button>
          ))}
        </div>

        {tab === "approved" && (
          <button
          onClick={() => setIsShadowModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_0_20px_-6px_rgba(251,191,36,0.6)] transition hover:bg-amber-300"
          >
            <UserPlus className="h-4 w-4" />
            Adicionar sem App
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-zinc-400">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 px-6 py-10 text-center text-zinc-400">
          {tab === "pending"
            ? "Nenhuma solicitação pendente."
            : "Você ainda não tem alunos aprovados."}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <StudentMemberRow
              key={r.id}
              row={r}
              avatarUrl={avatarMap[r.student_id]?.avatar_url ?? null}
              showActions={tab === "pending"}
              showRemove={tab === "approved"}
              removing={removingId === r.id}
              onApprove={() => respond(r.id, "approved")}
              onReject={() => respond(r.id, "rejected")}
              onRemove={() => handleRemove(r)}
            />
          ))}
        </ul>
      )}
    {/* MODAL DO ALUNO SHADOW */}
    {isShadowModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-white">Adicionar Aluno (Sem App)</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Cadastre um aluno manualmente para gerenciar treinos e notas. Ele poderá assumir essa conta futuramente.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Nome do Aluno
              </label>
              <input
                type="text"
                value={shadowName}
                onChange={(e) => setShadowName(e.target.value)}
                placeholder="Ex: Jorginho Praia"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={() => setIsShadowModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveShadowStudent}
              disabled={isSubmittingShadow}
              className="rounded-xl bg-amber-400 px-6 py-2 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmittingShadow ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmittingShadow ? "Salvando..." : "Salvar Aluno"}
            </button>
          </div>
        </div>
      </div>
    )}

  </div>
);
}

function StudentMemberRow({
  row,
  avatarUrl,
  showActions,
  showRemove,
  removing,
  onApprove,
  onReject,
  onRemove,
}: {
  row: Row;
  avatarUrl: string | null;
  showActions: boolean;
  showRemove: boolean;
  removing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRemove: () => void;
}) {
  const nome = row.student?.nome ?? "Aluno";
  const initials = initialsFromName(nome);
  const meta: string[] = [];

  if (row.student?.apelido) meta.push(row.student.apelido);
  if (row.student?.idade) meta.push(`${row.student.idade} anos`);
  if (row.student?.perna_dominante) {
    const leg =
      row.student.perna_dominante === "destra"
        ? "Destra"
        : row.student.perna_dominante === "canhota"
          ? "Canhota"
          : "Ambidestra";
    meta.push(leg);
  }

  return (
    <li className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700 sm:gap-5 sm:p-5">
      <Avatar className="h-12 w-12 shrink-0 border border-zinc-700 shadow-[0_0_20px_-6px_rgba(251,191,36,0.25)] sm:h-14 sm:w-14">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={nome} className="object-cover" />
        ) : null}
        <AvatarFallback className="bg-zinc-800 text-sm font-bold tracking-wide text-amber-300 sm:text-base">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-semibold tracking-tight text-zinc-50 sm:text-lg">
            {nome}
          </p>
          {row.student?.nivel_atual && showRemove && (
            <span className="shrink-0 rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
              {row.student.nivel_atual}
            </span>
          )}
        </div>
        {meta.length > 0 && (
          <p className="truncate text-sm text-zinc-500">{meta.join(" · ")}</p>
        )}
        {showActions && (
          <p className="text-xs text-zinc-600">Aguardando sua aprovação</p>
        )}
      </div>

      {showActions && (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(16,185,129,0.6)] transition hover:bg-emerald-400 sm:px-4"
          >
            <Check className="h-4 w-4 shrink-0" />
            Aceitar
          </button>
          <button
            type="button"
            onClick={onReject}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 sm:px-4"
          >
            <X className="h-4 w-4 shrink-0" />
            Recusar
          </button>
        </div>
      )}

      {showRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          title="Remover aluno da turma"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
        >
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 shrink-0" />
          )}
          <span className="hidden sm:inline">Remover</span>
        </button>
      )}
    </li>
  );
}
