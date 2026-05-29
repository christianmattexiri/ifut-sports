import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useInstructorProfile } from "@/routes/futevolei.instrutor";
import {
  Activity,
  Calendar,
  Check,
  Clock,
  Copy,
  Dumbbell,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/futevolei/instrutor/")({
  component: InstrutorDashboardPage,
});

/** Mock visual — substituir por dados reais depois */
const MOCK_INVITE_CODE = "FVCOACH7";

const MOCK_STATS = {
  students: 24,
  studentsTrend: "+12%",
  trainings: 156,
  classesToday: 4,
  totalHours: 312,
};

const MOCK_CLASSES = [
  {
    id: "1",
    time: "08:00",
    title: "Fundamentos",
    students: ["JA", "MS", "PK", "RL"],
    status: "confirmed" as const,
  },
  {
    id: "2",
    time: "10:30",
    title: "Técnica de Ataque",
    students: ["JA", "MS"],
    status: "confirmed" as const,
  },
  {
    id: "3",
    time: "14:00",
    title: "Condicionamento na Areia",
    students: ["PK"],
    status: "pending" as const,
  },
  {
    id: "4",
    time: "17:30",
    title: "Simulação de Jogo",
    students: ["JA", "MS", "PK", "RL", "TC"],
    status: "pending" as const,
  },
];

function InstrutorDashboardPage() {
  const profile = useInstructorProfile();
  const inviteCode = profile?.invite_code ?? MOCK_INVITE_CODE;
  const coachName = profile?.apelido?.trim() || profile?.nome?.split(" ")[0] || "Instrutor";

  const [copied, setCopied] = useState(false);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500/80">
          Futevôlei · Gestão do Instrutor
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white md:text-4xl">Visão Geral</h1>
        <p className="mt-2 text-base text-zinc-400 md:text-lg">
          Bem-vindo de volta, <span className="font-medium text-zinc-200">{coachName}</span>!
        </p>
      </header>

      {/* Invite banner */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/90 via-zinc-900 to-zinc-900 p-6 shadow-[0_0_50px_-12px_rgba(16,185,129,0.45)] md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-full bg-gradient-to-t from-emerald-500/5 to-transparent"
        />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
              Código de Convite
            </p>
            <p className="mt-1 max-w-md text-sm text-zinc-400">
              Compartilhe com seus alunos para que entrem na sua turma.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="font-mono text-3xl font-bold tracking-[0.35em] text-white drop-shadow-[0_0_20px_rgba(52,211,153,0.35)] md:text-4xl">
              {inviteCode}
            </div>
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 hover:shadow-[0_0_24px_-6px_rgba(16,185,129,0.5)]"
            >
              {copied ? (
                <Check className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Copy className="h-4 w-4" strokeWidth={1.5} />
              )}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Alunos"
          value={String(MOCK_STATS.students)}
          sub={MOCK_STATS.studentsTrend}
          icon={Users}
          accent="emerald"
          chart
        />
        <StatCard
          label="Treinos"
          value={String(MOCK_STATS.trainings)}
          icon={Dumbbell}
          accent="zinc"
        />
        <StatCard
          label="Aulas Hoje"
          value={String(MOCK_STATS.classesToday)}
          icon={Calendar}
          accent="sky"
        />
        <StatCard
          label="Horas Totais"
          value={String(MOCK_STATS.totalHours)}
          suffix="h"
          icon={Timer}
          accent="amber"
        />
      </section>

      {/* Today's classes */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white md:text-xl">
              Aulas de Hoje
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">Sua agenda para hoje</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-400 sm:inline-flex">
            <Activity className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
            Visão ao vivo
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <ul className="divide-y divide-zinc-800/80">
            {MOCK_CLASSES.map((cls) => (
              <ClassRow key={cls.id} {...cls} />
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  suffix,
  icon: Icon,
  accent,
  chart,
}: {
  label: string;
  value: string;
  sub?: string;
  suffix?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: "emerald" | "sky" | "amber" | "zinc";
  chart?: boolean;
}) {
  const accentMap = {
    emerald: {
      icon: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
      sub: "text-emerald-400",
    },
    sky: { icon: "text-sky-400 bg-sky-500/10 ring-sky-500/20", sub: "text-sky-400" },
    amber: { icon: "text-amber-400 bg-amber-500/10 ring-amber-500/20", sub: "text-amber-400" },
    zinc: { icon: "text-zinc-400 bg-zinc-800 ring-zinc-700", sub: "text-zinc-400" },
  };
  const a = accentMap[accent];

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700 md:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className={cn("rounded-lg p-2 ring-1", a.icon)}>
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </div>
        {chart && <MiniLineChart />}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight text-white md:text-3xl">{value}</span>
        {suffix && <span className="text-sm font-medium text-zinc-500">{suffix}</span>}
      </div>
      {sub && (
        <p className={cn("mt-1 flex items-center gap-1 text-xs font-semibold", a.sub)}>
          <TrendingUp className="h-3 w-3" strokeWidth={2} />
          {sub}
        </p>
      )}
    </div>
  );
}

function MiniLineChart() {
  return (
    <svg viewBox="0 0 64 28" className="h-7 w-16 shrink-0" aria-hidden>
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(52, 211, 153)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 22 L12 18 L24 20 L36 12 L48 14 L64 6 L64 28 L0 28 Z"
        fill="url(#chartFill)"
      />
      <polyline
        points="0,22 12,18 24,20 36,12 48,14 64,6"
        fill="none"
        stroke="rgb(52, 211, 153)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClassRow({
  time,
  title,
  students,
  status,
}: {
  time: string;
  title: string;
  students: string[];
  status: "confirmed" | "pending";
}) {
  const isConfirmed = status === "confirmed";

  return (
    <li className="flex flex-col gap-4 p-4 transition hover:bg-zinc-900/50 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <div className="flex shrink-0 items-center gap-3 sm:w-28">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 sm:hidden">
          <Clock className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums text-zinc-300">{time}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {students.length === 1
            ? "1 aluno confirmado"
            : `${students.length} alunos confirmados`}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        <div className="flex -space-x-2">
          {students.slice(0, 4).map((initials) => (
            <Avatar
              key={initials}
              className="h-8 w-8 border-2 border-zinc-900 ring-1 ring-zinc-800"
            >
              <AvatarFallback className="bg-zinc-800 text-[10px] font-bold text-zinc-300">
                {initials}
              </AvatarFallback>
            </Avatar>
          ))}
          {students.length > 4 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-800 text-[10px] font-semibold text-zinc-400 ring-1 ring-zinc-700">
              +{students.length - 4}
            </div>
          )}
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            isConfirmed
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border border-amber-500/30 bg-amber-500/10 text-amber-400",
          )}
        >
          {isConfirmed ? "Confirmado" : "Pendente"}
        </span>
      </div>
    </li>
  );
}
