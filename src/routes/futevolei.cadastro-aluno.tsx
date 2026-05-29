import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { FutevoleiRouteLoader } from "@/components/futevolei/FutevoleiRouteLoader";
import { createStudent, formatFutevoleiError, joinByInviteCode } from "@/lib/futevolei";
import { myMembershipQuery, myStudentQuery } from "@/lib/futevolei-queries";

export const Route = createFileRoute("/futevolei/cadastro-aluno")({
  validateSearch: (search: Record<string, unknown>) => ({
    novoCodigo: search.novoCodigo === true || search.novoCodigo === "true" || search.novoCodigo === "1",
  }),
  component: AlunoCadastroPage,
  head: () => ({ meta: [{ title: "Futevôlei — Cadastro Aluno" }] }),
});

function AlunoCadastroPage() {
  const navigate = useNavigate();
  const { novoCodigo } = Route.useSearch();
  const { data: student, isLoading: studentLoading } = useQuery(myStudentQuery());
  const { data: membership, isLoading: membershipLoading } = useQuery(myMembershipQuery());

  const [step, setStep] = useState<1 | 2>(1);
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [idade, setIdade] = useState<string>("");
  const [perna, setPerna] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const isLoading = studentLoading || membershipLoading;

  useEffect(() => {
    if (isLoading || bootstrapped) return;

    if (student) {
      if (membership?.status === "approved" || membership?.status === "pending") {
        navigate({ to: "/futevolei/aluno", replace: true });
        return;
      }
      setNome(student.nome);
      setApelido(student.apelido ?? "");
      setIdade(student.idade ? String(student.idade) : "");
      setPerna(student.perna_dominante ?? "");
      setStep(2);
      setCode("");
    }

    setBootstrapped(true);
  }, [isLoading, student, membership, navigate, novoCodigo, bootstrapped]);

  async function onSubmitStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    setSaving(true);
    try {
      if (!student) {
        await createStudent({
          nome: nome.trim(),
          apelido: apelido.trim() || undefined,
          idade: idade ? Number(idade) : undefined,
          perna_dominante: perna || undefined,
        });
      }
      setStep(2);
    } catch (err: unknown) {
      toast.error(formatFutevoleiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Informe o código do professor");
      return;
    }
    setSaving(true);
    try {
      await joinByInviteCode(code);
      toast.success("Solicitação enviada!");
      navigate({ to: "/futevolei/aluno" });
    } catch (err: unknown) {
      toast.error(formatFutevoleiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !bootstrapped) {
    return <FutevoleiRouteLoader />;
  }

  if (
    student &&
    (membership?.status === "approved" || membership?.status === "pending")
  ) {
    return <FutevoleiRouteLoader />;
  }

  const showCodeOnly = !!student && (novoCodigo || membership?.status === "rejected");

  return (
    <main className="min-h-screen bg-zinc-950 pt-14 text-white">
      <div className="mx-auto max-w-xl px-4 py-10">
        <Link
          to={showCodeOnly ? "/futevolei/aluno" : "/dashboard"}
          search={showCodeOnly ? undefined : { openFutevolei: true }}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="mt-6 text-2xl font-bold">
          {showCodeOnly || step === 2 ? "Código do Professor" : "Cadastro de Aluno"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {showCodeOnly ? "Nova solicitação de vínculo" : `Etapa ${step} de 2`}
        </p>

        {!showCodeOnly && step === 1 ? (
          <form onSubmit={onSubmitStep1} className="mt-6 space-y-4">
            <Field label="Nome *">
              <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Apelido">
              <input value={apelido} onChange={(e) => setApelido(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Idade">
              <input
                type="number"
                min={5}
                max={99}
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Perna dominante">
              <select value={perna} onChange={(e) => setPerna(e.target.value)} className={inputCls}>
                <option value="">Selecione…</option>
                <option value="destra">Destra</option>
                <option value="canhota">Canhota</option>
                <option value="ambidestra">Ambidestra</option>
              </select>
            </Field>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-sky-400 px-4 py-3 font-bold text-zinc-950 hover:bg-sky-300 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmitStep2} className="mt-6 space-y-4">
            <Field label="Código do Professor *">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className={inputCls + " text-center text-2xl font-mono tracking-[0.4em]"}
                placeholder="ABC123"
                required
              />
            </Field>
            <p className="text-xs text-zinc-500">Peça ao seu instrutor o código de 6 caracteres.</p>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-sky-400 px-4 py-3 font-bold text-zinc-950 hover:bg-sky-300 disabled:opacity-60"
            >
              {saving ? "Enviando..." : "Solicitar vínculo"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-sky-400 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
