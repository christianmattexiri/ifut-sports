import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  getMyInstructor,
  listInstructorMembers,
  respondMembership,
  type Membership,
  type StudentProfile,
} from "@/lib/futevolei";

export const Route = createFileRoute("/futevolei/instrutor/alunos")({
  component: AlunosPage,
});

type Row = Membership & { student?: StudentProfile };

function AlunosPage() {
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const p = await getMyInstructor();
    if (!p) return;
    const list = await listInstructorMembers(p.user_id);
    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(id: string, action: "approved" | "rejected") {
    try {
      await respondMembership(id, action);
      toast.success(action === "approved" ? "Aluno aceito" : "Aluno recusado");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro");
    }
  }

  const filtered = rows.filter((r) => r.status === tab);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-white/10">
        {(["pending", "approved"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === t ? "border-b-2 border-amber-400 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t === "pending" ? "Solicitações Pendentes" : "Meus Alunos"}
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">
              {rows.filter((r) => r.status === t).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-zinc-400">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-zinc-900/40 p-6 text-center text-zinc-400">
          {tab === "pending" ? "Nenhuma solicitação pendente." : "Você ainda não tem alunos aprovados."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 p-4">
              <div>
                <div className="font-semibold">{r.student?.nome ?? "Aluno"}</div>
                <div className="text-xs text-zinc-400">
                  {r.student?.apelido && <span>{r.student.apelido} · </span>}
                  {r.student?.idade && <span>{r.student.idade} anos · </span>}
                  {r.student?.perna_dominante && <span>Perna: {r.student.perna_dominante}</span>}
                </div>
              </div>
              {tab === "pending" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respond(r.id, "approved")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-400"
                  >
                    <Check className="h-4 w-4" /> Aceitar
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(r.id, "rejected")}
                    className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
                  >
                    <X className="h-4 w-4" /> Recusar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}