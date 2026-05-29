import { GraduationCap, LayoutDashboard, PersonStanding, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FutevoleiAccent = "amber" | "sky";

export type FutevoleiRoleFlags = {
  hasInstructor: boolean;
  hasStudent: boolean;
};

const accentStyles: Record<
  FutevoleiAccent,
  {
    icon: string;
    iconBg: string;
    ring: string;
    hoverBorder: string;
    hoverShadow: string;
    hoverGlow: string;
    cta: string;
  }
> = {
  amber: {
    icon: "text-amber-400",
    iconBg: "bg-amber-400/10 ring-amber-400/20",
    ring: "group-hover:ring-amber-400/40",
    hoverBorder: "hover:border-amber-400/50",
    hoverShadow: "hover:shadow-[0_0_40px_-8px_rgba(251,191,36,0.45)]",
    hoverGlow: "group-hover:bg-amber-400/20",
    cta: "text-amber-400/80",
  },
  sky: {
    icon: "text-sky-400",
    iconBg: "bg-sky-400/10 ring-sky-400/20",
    ring: "group-hover:ring-sky-400/40",
    hoverBorder: "hover:border-sky-400/50",
    hoverShadow: "hover:shadow-[0_0_40px_-8px_rgba(56,189,248,0.45)]",
    hoverGlow: "group-hover:bg-sky-400/20",
    cta: "text-sky-400/80",
  },
};

export function FutevoleiRoleChoice({
  flags,
  compact,
  onRegisterInstructor,
  onRegisterStudent,
  onOpenInstructorPanel,
  onOpenStudentPanel,
}: {
  flags: FutevoleiRoleFlags;
  compact?: boolean;
  onRegisterInstructor: () => void;
  onRegisterStudent: () => void;
  onOpenInstructorPanel: () => void;
  onOpenStudentPanel: () => void;
}) {
  const { hasInstructor, hasStudent } = flags;
  const both = hasInstructor && hasStudent;

  const subtitle = both
    ? "Você tem os dois perfis. Escolha para onde deseja ir."
    : hasInstructor
      ? "Você já é instrutor. Cadastre-se como aluno ou acesse seu painel."
      : hasStudent
        ? "Você já é aluno. Cadastre-se como instrutor para criar turmas."
        : "Escolha seu perfil para começar no módulo de Futevôlei do iFut.";

  const cards: Array<{
    key: string;
    label: string;
    description: string;
    icon: LucideIcon;
    accent: FutevoleiAccent;
    cta: string;
    onClick: () => void;
  }> = [];

  if (both) {
    cards.push(
      {
        key: "panel-instructor",
        label: "Painel do Instrutor",
        description: "Gerencie turmas, alunos e treinos.",
        icon: LayoutDashboard,
        accent: "amber",
        cta: "Abrir painel →",
        onClick: onOpenInstructorPanel,
      },
      {
        key: "panel-student",
        label: "Painel do Aluno",
        description: "Acompanhe evolução, notas e treinos.",
        icon: LayoutDashboard,
        accent: "sky",
        cta: "Abrir painel →",
        onClick: onOpenStudentPanel,
      },
    );
  } else if (hasInstructor) {
    cards.push(
      {
        key: "goto-instructor",
        label: "Ir para meu painel",
        description: "Acesse o dashboard de instrutor que você já possui.",
        icon: GraduationCap,
        accent: "amber",
        cta: "Painel instrutor →",
        onClick: onOpenInstructorPanel,
      },
      {
        key: "register-student",
        label: "Sou Aluno",
        description: "Cadastre seu perfil de aluno e vincule-se a um instrutor.",
        icon: PersonStanding,
        accent: "sky",
        cta: "Cadastrar como aluno →",
        onClick: onRegisterStudent,
      },
    );
  } else if (hasStudent) {
    cards.push({
      key: "register-instructor",
      label: "Sou Instrutor",
      description: "Crie seu perfil de instrutor e convide seus alunos.",
      icon: GraduationCap,
      accent: "amber",
      cta: "Cadastrar como instrutor →",
      onClick: onRegisterInstructor,
    });
  } else {
    cards.push(
      {
        key: "register-instructor",
        label: "Sou Instrutor",
        description: "Gerencie turmas, aprove alunos e organize os treinos da sua escola.",
        icon: GraduationCap,
        accent: "amber",
        cta: "Continuar →",
        onClick: onRegisterInstructor,
      },
      {
        key: "register-student",
        label: "Sou Aluno",
        description: "Acompanhe sua evolução, notas e o histórico dos seus treinos.",
        icon: PersonStanding,
        accent: "sky",
        cta: "Continuar →",
        onClick: onRegisterStudent,
      },
    );
  }

  return (
    <>
      <header className={compact ? "mb-6 text-center" : "mb-8 text-center"}>
        <span
          className="mb-3 inline-block text-4xl drop-shadow-[0_0_24px_rgba(251,191,36,0.35)] sm:text-5xl"
          aria-hidden
        >
          🏐
        </span>
        <h2 className="text-balance text-xl font-bold tracking-tight text-white sm:text-2xl">
          Quem é você na quadra?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-balance text-sm text-zinc-400 sm:text-base">
          {subtitle}
        </p>
      </header>

      <div
        className={cn(
          "grid gap-4 sm:gap-5",
          cards.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-md mx-auto",
        )}
      >
        {cards.map((card) => (
          <FutevoleiRoleCard key={card.key} compact={compact} {...card} />
        ))}
      </div>
    </>
  );
}

function FutevoleiRoleCard({
  label,
  description,
  icon: Icon,
  accent,
  cta,
  onClick,
  compact,
}: {
  label: string;
  description: string;
  icon: LucideIcon;
  accent: FutevoleiAccent;
  cta: string;
  onClick: () => void;
  compact?: boolean;
}) {
  const s = accentStyles[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col items-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-center",
        compact ? "gap-4 p-5 sm:p-6" : "gap-5 p-8",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        s.hoverBorder,
        s.hoverShadow,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          accent === "amber"
            ? "bg-gradient-to-b from-amber-400/10 to-transparent"
            : "bg-gradient-to-b from-sky-400/10 to-transparent",
        )}
      />

      <div
        className={cn(
          "relative flex items-center justify-center rounded-2xl ring-1 transition-all duration-300 group-hover:scale-110",
          compact ? "h-16 w-16" : "h-20 w-20",
          s.iconBg,
          s.ring,
        )}
      >
        <Icon
          className={cn("relative", compact ? "h-8 w-8" : "h-10 w-10", s.icon)}
          strokeWidth={1.75}
        />
      </div>

      <div className="relative space-y-1.5 px-2">
        <span className="block text-lg font-semibold tracking-tight text-white sm:text-xl">
          {label}
        </span>
        <p className="text-xs leading-relaxed text-zinc-400 sm:text-sm">{description}</p>
      </div>

      <span
        className={cn(
          "relative text-xs font-medium uppercase tracking-widest opacity-70 transition-all duration-300 group-hover:opacity-100",
          s.cta,
        )}
      >
        {cta}
      </span>
    </button>
  );
}
