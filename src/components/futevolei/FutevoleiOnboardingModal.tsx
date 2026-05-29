import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FutevoleiRouteLoader } from "@/components/futevolei/FutevoleiRouteLoader";
import {
  FutevoleiRoleChoice,
  type FutevoleiRoleFlags,
} from "@/components/futevolei/FutevoleiRoleCards";
import { cn } from "@/lib/utils";
import {
  createInstructor,
  createStudent,
  formatFutevoleiError,
  getFutevoleiOnboardingState,
  getMyStudent,
  joinByInviteCode,
} from "@/lib/futevolei";
import { futevoleiQueryKeys } from "@/lib/futevolei-queries";

type Role = "instructor" | "student";

const inputBase =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 transition focus:outline-none focus:ring-2";

const emptyFlags: FutevoleiRoleFlags = { hasInstructor: false, hasStudent: false };

export function FutevoleiOnboardingModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);
  const [roleFlags, setRoleFlags] = useState<FutevoleiRoleFlags>(emptyFlags);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [idade, setIdade] = useState("");
  const [localAula, setLocalAula] = useState("");
  const [perna, setPerna] = useState("");
  const [code, setCode] = useState("");
  const [checkingProfile, setCheckingProfile] = useState(false);

  function resetAll() {
    setStep(1);
    setRole(null);
    setRoleFlags(emptyFlags);
    setNome("");
    setApelido("");
    setIdade("");
    setLocalAula("");
    setPerna("");
    setCode("");
    setSaving(false);
    setCheckingProfile(false);
  }

  function prefillStudentFields(student: NonNullable<Awaited<ReturnType<typeof getMyStudent>>>) {
    setNome(student.nome);
    setApelido(student.apelido ?? "");
    setIdade(student.idade ? String(student.idade) : "");
    setPerna(student.perna_dominante ?? "");
  }

  useEffect(() => {
    if (!open) {
      resetAll();
      return;
    }

    let cancelled = false;
    setCheckingProfile(true);

    (async () => {
      const state = await getFutevoleiOnboardingState();
      if (cancelled) return;

      setRoleFlags({
        hasInstructor: state.hasInstructor,
        hasStudent: state.hasStudent,
      });

      if (state.student) prefillStudentFields(state.student);
    })()
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível carregar seu perfil.");
      })
      .finally(() => {
        if (!cancelled) setCheckingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleBack() {
    if (step === 3) {
      if (roleFlags.hasStudent) {
        setStep(1);
        setRole(null);
      } else {
        setStep(2);
      }
      return;
    }
    setStep(1);
    setRole(null);
  }

  function openInstructorPanel() {
    onOpenChange(false);
    navigate({ to: "/futevolei/instrutor" });
  }

  function openStudentPanel() {
    onOpenChange(false);
    navigate({ to: "/futevolei/aluno" });
  }

  function startInstructorRegistration() {
    if (roleFlags.hasInstructor) {
      openInstructorPanel();
      return;
    }
    setRole("instructor");
    setStep(2);
  }

  async function startStudentRegistration() {
    setRole("student");
    if (roleFlags.hasStudent) {
      const student = await getMyStudent();
      if (student) prefillStudentFields(student);
      setStep(3);
      return;
    }
    setStep(2);
  }

  async function submitInstructor(e: React.FormEvent) {
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
      await queryClient.invalidateQueries({ queryKey: futevoleiQueryKeys.roles });
      toast.success("Cadastro de instrutor criado!");
      onOpenChange(false);
      navigate({ to: "/futevolei/instrutor" });
    } catch (err: unknown) {
      toast.error(formatFutevoleiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitStudentProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    setSaving(true);
    try {
      const existing = await getMyStudent();
      if (!existing) {
        await createStudent({
          nome: nome.trim(),
          apelido: apelido.trim() || undefined,
          idade: idade ? Number(idade) : undefined,
          perna_dominante: perna || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: futevoleiQueryKeys.roles });
        setRoleFlags((f) => ({ ...f, hasStudent: true }));
      }
      setStep(3);
    } catch (err: unknown) {
      toast.error(formatFutevoleiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitInviteCode(e: React.FormEvent) {
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
      toast.success("Solicitação enviada! Aguarde a aprovação do instrutor.");
      onOpenChange(false);
      navigate({ to: "/futevolei/aluno" });
    } catch (err: unknown) {
      toast.error(formatFutevoleiError(err));
    } finally {
      setSaving(false);
    }
  }

  const isStudent = role === "student";
  const glowClass = isStudent
    ? "border-sky-400/40 shadow-[0_0_60px_-8px_rgba(56,189,248,0.55)]"
    : "border-amber-400/40 shadow-[0_0_60px_-8px_rgba(251,191,36,0.55)]";

  const focusRing = isStudent
    ? "focus:border-sky-400 focus:ring-sky-400/30"
    : "focus:border-amber-400 focus:ring-amber-400/30";

  const title =
    step === 1
      ? "Futevôlei"
      : step === 2 && role === "instructor"
        ? "Cadastro de Instrutor"
        : step === 2 && role === "student"
          ? "Cadastro de Aluno"
          : "Código do Professor";

  const showBack = !checkingProfile && step > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] max-w-2xl overflow-y-auto border bg-zinc-950 p-5 text-white sm:p-8",
          "mx-4 rounded-2xl sm:rounded-3xl",
          step === 1 ? "border-zinc-800 shadow-[0_0_40px_-12px_rgba(0,0,0,0.8)]" : glowClass,
        )}
      >
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        )}

        {!checkingProfile && step > 1 && (
          <DialogTitle className="text-center text-xl font-bold text-white md:text-2xl">
            {title}
          </DialogTitle>
        )}

        {checkingProfile ? (
          <FutevoleiRouteLoader variant="modal" />
        ) : step === 1 ? (
          <>
            <DialogTitle className="sr-only">Futevôlei — escolha seu perfil</DialogTitle>
            <FutevoleiRoleChoice
              compact
              flags={roleFlags}
              onRegisterInstructor={startInstructorRegistration}
              onRegisterStudent={startStudentRegistration}
              onOpenInstructorPanel={openInstructorPanel}
              onOpenStudentPanel={openStudentPanel}
            />
          </>
        ) : null}

        {!checkingProfile && step === 2 && role === "instructor" && (
          <form onSubmit={submitInstructor} className="mt-6 space-y-4">
            <FormField label="Nome *">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={cn(inputBase, focusRing)}
                required
              />
            </FormField>
            <FormField label="Apelido">
              <input
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                className={cn(inputBase, focusRing)}
              />
            </FormField>
            <FormField label="Idade">
              <input
                type="number"
                min={5}
                max={99}
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className={cn(inputBase, focusRing)}
              />
            </FormField>
            <FormField label="Onde dá aula">
              <input
                value={localAula}
                onChange={(e) => setLocalAula(e.target.value)}
                placeholder="Ex: Arena Beach, Porto Alegre"
                className={cn(inputBase, focusRing)}
              />
            </FormField>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Criar cadastro"}
            </button>
          </form>
        )}

        {!checkingProfile && step === 2 && role === "student" && (
          <form onSubmit={submitStudentProfile} className="mt-6 space-y-4">
            <p className="text-center text-xs text-zinc-500">Etapa 2 de 3</p>
            <FormField label="Nome *">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={cn(inputBase, focusRing)}
                required
              />
            </FormField>
            <FormField label="Apelido">
              <input
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                className={cn(inputBase, focusRing)}
              />
            </FormField>
            <FormField label="Idade">
              <input
                type="number"
                min={5}
                max={99}
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className={cn(inputBase, focusRing)}
              />
            </FormField>
            <FormField label="Perna dominante">
              <select
                value={perna}
                onChange={(e) => setPerna(e.target.value)}
                className={cn(inputBase, focusRing)}
              >
                <option value="">Selecione…</option>
                <option value="destra">Destra</option>
                <option value="canhota">Canhota</option>
                <option value="ambidestra">Ambidestra</option>
              </select>
            </FormField>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-sky-400 px-4 py-3 font-bold text-zinc-950 transition hover:bg-sky-300 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Continuar"}
            </button>
          </form>
        )}

        {!checkingProfile && step === 3 && role === "student" && (
          <form onSubmit={submitInviteCode} className="mt-6 space-y-4">
            <p className="text-center text-xs text-zinc-500">Código do professor</p>
            <FormField label="Código do Professor *">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className={cn(
                  inputBase,
                  focusRing,
                  "text-center font-mono text-2xl tracking-[0.4em]",
                )}
                placeholder="ABC123"
                required
              />
            </FormField>
            <p className="text-center text-xs text-zinc-500">
              Peça ao seu instrutor o código de 6 caracteres.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-sky-400 px-4 py-3 font-bold text-zinc-950 transition hover:bg-sky-300 disabled:opacity-60"
            >
              {saving ? "Enviando..." : "Solicitar vínculo"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
