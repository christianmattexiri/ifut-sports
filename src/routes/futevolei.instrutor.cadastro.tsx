import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createInstructor, getMyInstructor } from "@/lib/futevolei";

export const Route = createFileRoute("/futevolei/instrutor/cadastro")({
  component: InstrutorCadastroPage,
  head: () => ({ meta: [{ title: "Futevôlei — Cadastro Instrutor" }] }),
});

function InstrutorCadastroPage() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [idade, setIdade] = useState<string>("");
  const [localAula, setLocalAula] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyInstructor().then((p) => {
      if (p) navigate({ to: "/futevolei/instrutor", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    setSaving(true);
    try {
      await createInstructor({
        nome: nome.trim(),
        apelido: apelido.trim() || undefined,
        idade: idade ? Number(idade) : undefined,
        local_aula: localAula.trim() || undefined,
      });
      toast.success("Cadastro criado!");
      navigate({ to: "/futevolei/instrutor" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao cadastrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-xl px-4 py-10">
        <Link to="/futevolei/onboarding" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Cadastro de Instrutor</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Nome *">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Apelido">
            <input value={apelido} onChange={(e) => setApelido(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Idade">
            <input type="number" min={5} max={99} value={idade} onChange={(e) => setIdade(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Onde dá aula">
            <input value={localAula} onChange={(e) => setLocalAula(e.target.value)} className={inputCls} placeholder="Ex: Arena Beach, Porto Alegre" />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Criar cadastro"}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      {children}
    </label>
  );
}