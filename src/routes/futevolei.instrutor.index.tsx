import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { getMyInstructor, listInstructorMembers, type InstructorProfile } from "@/lib/futevolei";

export const Route = createFileRoute("/futevolei/instrutor/")({
  component: InstrutorHomePage,
});

function InstrutorHomePage() {
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [counts, setCounts] = useState({ approved: 0, pending: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getMyInstructor();
      if (!p) return;
      setProfile(p);
      const members = await listInstructorMembers(p.user_id);
      setCounts({
        approved: members.filter((m) => m.status === "approved").length,
        pending: members.filter((m) => m.status === "pending").length,
      });
    })();
  }, []);

  if (!profile) return null;

  async function copyCode() {
    await navigator.clipboard.writeText(profile!.invite_code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-zinc-900 p-6">
        <p className="text-sm uppercase tracking-wider text-amber-300/80">Seu código de convite</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="font-mono text-4xl font-bold tracking-[0.3em] text-white">{profile.invite_code}</div>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-400/10"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <p className="mt-3 text-sm text-zinc-400">Compartilhe este código com seus alunos para que eles solicitem vínculo.</p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card icon={Users} title="Alunos Atuais" value={counts.approved} hint={`${counts.pending} pendentes`} />
        <Card icon={Calendar} title="Treinos do Dia" value={0} hint="Em breve" />
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, value, hint }: { icon: any; title: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-400/10 p-2 text-amber-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm text-zinc-400">{title}</div>
      </div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}