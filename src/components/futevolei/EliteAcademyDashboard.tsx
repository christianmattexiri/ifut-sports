import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Calendar, MapPin, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatars } from "@/lib/avatars";
import type { StudentProfile } from "@/lib/futevolei";
import { cn } from "@/lib/utils";

const RADAR_DATA = [
  { skill: "Saque", value: 78 },
  { skill: "Recepção", value: 85 },
  { skill: "Levantada", value: 72 },
  { skill: "Ataque", value: 80 },
  { skill: "Defesa", value: 68 },
  { skill: "Físico & Tático", value: 74 },
];

const MOCK_PROGRESS = 72;

const MOCK_NEXT_CLASS = {
  dateLabel: "15 MAI",
  weekday: "Quinta-feira",
  title: "Treino Tático — Rede Alta",
  time: "18:30 – 20:00",
  location: "Arena Beach POA",
};

const MOCK_FEEDBACKS = [
  {
    id: "1",
    coachInitials: "RC",
    coachName: "Coach Ricardo",
    text: "Excelente leitura na recepção. Mantenha os cotovelos firmes na levantada.",
    tag: "Levantada",
  },
  {
    id: "2",
    coachInitials: "RC",
    coachName: "Coach Ricardo",
    text: "Ataque com bom timing. Trabalhe a aproximação no terceiro toque.",
    tag: "Ataque",
  },
  {
    id: "3",
    coachInitials: "RC",
    coachName: "Coach Ricardo",
    text: "Condicionamento em alta. Foque na comunicação na defesa de rede.",
    tag: "Físico & Tático",
  },
];

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "??";
}

function formatLevel(nivel: string) {
  const map: Record<string, string> = {
    iniciante: "Iniciante",
    intermediario: "Intermediário",
    avancado: "Avançado",
  };
  return map[nivel.toLowerCase()] ?? nivel.charAt(0).toUpperCase() + nivel.slice(1);
}

export function EliteAcademyDashboard({
  student,
  instructorId,
  instructorName,
}: {
  student: StudentProfile;
  instructorId: string;
  instructorName: string;
}) {
  const avatarMap = useAvatars([student.user_id, instructorId]);
  const studentAvatar = avatarMap[student.user_id]?.avatar_url ?? null;
  const coachAvatar = avatarMap[instructorId]?.avatar_url ?? null;
  const displayCoach = instructorName || "Seu instrutor";
  const levelLabel = formatLevel(student.nivel_atual || "intermediario");

  return (
    <div className="space-y-8">
      <header className="border-b border-zinc-800/80 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400/90">
          Elite Academy
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Seu painel de evolução
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        {/* Perfil */}
        <aside className="lg:col-span-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 border-2 border-sky-400/40 shadow-[0_0_30px_-8px_rgba(56,189,248,0.5)]">
                {studentAvatar ? <AvatarImage src={studentAvatar} alt={student.nome} /> : null}
                <AvatarFallback className="bg-zinc-800 text-xl font-bold text-sky-300">
                  {initialsFromName(student.nome)}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-bold text-white">{student.nome}</h2>
              {student.apelido && (
                <p className="text-sm text-zinc-500">&quot;{student.apelido}&quot;</p>
              )}
              <span className="mt-3 rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-300">
                {levelLabel}
              </span>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs">
                <span className="font-medium text-zinc-400">Progresso da temporada</span>
                <span className="font-bold text-[#00FF00]">{MOCK_PROGRESS}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-[#00FF00] shadow-[0_0_12px_rgba(0,255,0,0.5)]"
                  style={{ width: `${MOCK_PROGRESS}%` }}
                />
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Seu instrutor
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-amber-400/30">
                  {coachAvatar ? <AvatarImage src={coachAvatar} alt={displayCoach} /> : null}
                  <AvatarFallback className="bg-zinc-800 text-sm font-bold text-amber-300">
                    {initialsFromName(displayCoach)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                  <p className="truncate font-semibold text-zinc-100">{displayCoach}</p>
                  <p className="text-xs text-zinc-500">Head Coach</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Radar */}
        <section className="lg:col-span-5">
          <div className="flex h-full min-h-[380px] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6">
            <h3 className="text-center text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">
              Seu desempenho
            </h3>
            <div className="relative mt-2 flex flex-1 items-center justify-center">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-8 rounded-full bg-[#00FF00]/5 blur-2xl"
              />
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={RADAR_DATA} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="#3f3f46" strokeOpacity={0.9} />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Desempenho"
                    dataKey="value"
                    stroke="#00FF00"
                    strokeWidth={2}
                    fill="#00FF00"
                    fillOpacity={0.22}
                    dot={{ r: 3, fill: "#00FF00", strokeWidth: 0 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Próximo treino */}
        <aside className="lg:col-span-4">
          <div className="relative min-h-[380px] overflow-hidden rounded-2xl border border-zinc-800">
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-amber-900/40 via-zinc-900 to-zinc-950"
            />
            <div
              aria-hidden
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(160deg, rgba(120, 53, 15, 0.35) 0%, transparent 45%), radial-gradient(ellipse at 80% 20%, rgba(251, 191, 36, 0.15), transparent 50%)",
              }}
            />
            <div
              aria-hidden
              className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-amber-950/60 to-transparent"
            />

            <div className="relative flex h-full flex-col justify-between p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">
                  Próximo treino
                </p>
                <p className="mt-4 font-mono text-4xl font-black tracking-tight text-white">
                  {MOCK_NEXT_CLASS.dateLabel}
                </p>
                <p className="text-sm text-zinc-400">{MOCK_NEXT_CLASS.weekday}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-bold leading-snug text-white">
                  {MOCK_NEXT_CLASS.title}
                </h4>
                <p className="flex items-center gap-2 text-sm text-zinc-300">
                  <Calendar className="h-4 w-4 text-sky-400" strokeWidth={1.5} />
                  {MOCK_NEXT_CLASS.time}
                </p>
                <p className="flex items-center gap-2 text-sm text-zinc-400">
                  <MapPin className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                  {MOCK_NEXT_CLASS.location}
                </p>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center text-[10px] uppercase tracking-wider text-zinc-500 backdrop-blur-sm">
                Quadra de areia · mock visual
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Feedbacks */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Feedbacks recentes
          </h3>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {MOCK_FEEDBACKS.map((fb) => (
            <li
              key={fb.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0 border border-amber-400/20">
                  <AvatarFallback className="bg-zinc-800 text-xs font-bold text-amber-300">
                    {fb.coachInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-200">{fb.coachName}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{fb.text}</p>
                  <span
                    className={cn(
                      "mt-3 inline-block rounded-full border border-[#00FF00]/25 bg-[#00FF00]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#00FF00]/90",
                    )}
                  >
                    {fb.tag}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
