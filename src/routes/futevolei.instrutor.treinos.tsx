import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarPlus, MapPin, Clock, User, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/futevolei/instrutor/treinos")({
  component: TreinosPage,
});

// Dados falsos só para vermos a lista funcionando
const MOCK_TREINOS = [
  { id: 1, aluno: "Zé", data: "2026-06-02T19:00", quadra: "Quadra Central", modelo: "Treino Padrão" },
  { id: 2, aluno: "Terry", data: "2026-06-03T18:30", quadra: "Quadra 2", modelo: "Treino de Saque" },
];

function TreinosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [treinos, setTreinos] = useState(MOCK_TREINOS);
  
  // Estado do formulário
  const [aluno, setAluno] = useState("Zé");
  const [dataHora, setDataHora] = useState("");
  const [quadra, setQuadra] = useState("");
  const [modelo, setModelo] = useState("Treino Padrão");

  function handleSaveTreino(e: React.FormEvent) {
    e.preventDefault();
    
    if (!dataHora) {
      toast.error("Preencha a data e horário do treino.");
      return;
    }

    // Aqui no futuro vai entrar o código do Supabase!
    console.log("Salvar no banco:", { aluno, dataHora, quadra, modelo });

    // Adiciona na tela só para visualizarmos
    const novoTreino = {
      id: Math.random(),
      aluno,
      data: dataHora,
      quadra: quadra || "Não informada",
      modelo,
    };
    
    setTreinos([novoTreino, ...treinos]);
    toast.success("Treino agendado com sucesso!");
    setIsModalOpen(false);
    
    // Limpa o form
    setDataHora("");
    setQuadra("");
    setModelo("Treino Padrão");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/80">
            Futevôlei · Gestão do Instrutor
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">Treinos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gerencie a agenda e os fundamentos dos seus alunos.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-zinc-950 shadow-[0_0_20px_-6px_rgba(251,191,36,0.6)] transition hover:bg-amber-300 shrink-0"
        >
          <CalendarPlus className="h-5 w-5" />
          Criar Treino
        </button>
      </header>

      {/* LISTA DE TREINOS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {treinos.map((t) => (
          <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-50">{t.aluno}</p>
                  <span className="inline-block rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                    {t.modelo}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 space-y-2 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-zinc-500" />
                <p>{new Date(t.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-zinc-500" />
                <p>{t.quadra}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CRIAR TREINO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Novo Treino</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTreino} className="space-y-4">
              {/* Aluno (Mockado) */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Aluno</label>
                <select 
                  value={aluno}
                  onChange={(e) => setAluno(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Zé">Zé</option>
                  <option value="Terry">Terry</option>
                  <option value="Jorginho">Jorginho</option>
                </select>
              </div>

              {/* Data e Hora */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Data e Horário</label>
                <input
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 [color-scheme:dark]"
                />
              </div>

              {/* Quadra */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Quadra / Arena (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Quadra 1"
                  value={quadra}
                  onChange={(e) => setQuadra(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Modelo de Treino */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Modelo de Treino</label>
                <select
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Treino Padrão">🟢 Treino Padrão</option>
                  <option value="Treino de Saque">🏐 Treino de Saque</option>
                  <option value="Treino de Recepção">🛡️ Treino de Recepção</option>
                  <option value="Treino de Levantada">📐 Treino de Levantada</option>
                  <option value="Treino de Ataque">🔥 Treino de Ataque</option>
                  <option value="Treino de Defesa">🧱 Treino de Defesa</option>
                  <option value="Treino Físico e Tático">🏃‍♂️ Treino Físico e Tático</option>
                </select>
              </div>

              {/* Botões */}
              <div className="mt-8 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-400 px-6 py-2 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
                >
                  Salvar Treino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}