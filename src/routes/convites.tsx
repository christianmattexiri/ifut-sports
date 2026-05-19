import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Home,
  Mail,
  LogOut,
  UserCircle2,
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Check,
  X,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ifutCrest from "@/assets/ifut-crest.png";
import { InstallPwaModal } from "@/components/InstallPwaModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/convites")({
  component: ConvitesPage,
  head: () => ({ meta: [{ title: "iFut — Convites" }] }),
});

type Invitation = {
  id: string;
  match_id: string;
  inviter_id: string;
  status: string;
  created_at: string;
  match: {
    id: string;
    name: string;
    day_of_week: string | null;
    match_time: string | null;
    location: string | null;
    logo_url: string | null;
  } | null;
  inviter: {
    id: string;
    full_name: string | null;
    username: string;
  } | null;
};

function ConvitesPage() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState<Set<string>>(new Set());
  const [me, setMe] = useState<{ id: string; firstName: string } | null>(null);
  const [positionFor, setPositionFor] = useState<Invitation | null>(null);
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      const uid = sess.session.user.id;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", uid)
        .maybeSingle();
      const name = (prof?.full_name?.trim() || prof?.username || "Jogador").split(" ")[0];
      setMe({ id: uid, firstName: name });

      const { data: rows, error } = await supabase
        .from("match_invitations")
        .select("id, match_id, inviter_id, status, created_at")
        .eq("invitee_id", uid)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[convites] load error", error);
        toast.error("Erro ao carregar convites");
        setLoading(false);
        return;
      }

      const list = rows ?? [];
      const matchIds = Array.from(new Set(list.map((r) => r.match_id).filter(Boolean))) as string[];
      const inviterIds = Array.from(new Set(list.map((r) => r.inviter_id).filter(Boolean))) as string[];

      const [matchesRes, invitersRes] = await Promise.all([
        matchIds.length
          ? supabase
              .from("matches")
              .select("id, name, day_of_week, match_time, location, logo_url")
              .in("id", matchIds)
          : Promise.resolve({ data: [], error: null } as const),
        inviterIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name, username")
              .in("id", inviterIds)
          : Promise.resolve({ data: [], error: null } as const),
      ]);

      const matchMap = new Map((matchesRes.data ?? []).map((m: any) => [m.id, m]));
      const inviterMap = new Map((invitersRes.data ?? []).map((p: any) => [p.id, p]));

      const enriched: Invitation[] = list.map((r) => ({
        id: r.id,
        match_id: r.match_id as string,
        inviter_id: r.inviter_id as string,
        status: r.status as string,
        created_at: r.created_at as string,
        match: matchMap.get(r.match_id as string) ?? null,
        inviter: inviterMap.get(r.inviter_id as string) ?? null,
      }));
      setInvites(enriched);
      setLoading(false);
    })();
  }, [navigate]);

  async function handleReject(invite: Invitation) {
    setClosing((s) => new Set(s).add(invite.id));
    const { error } = await supabase
      .from("match_invitations")
      .update({ status: "rejected" })
      .eq("id", invite.id);
    if (error) {
      toast.error("Não foi possível recusar o convite");
      setClosing((s) => {
        const n = new Set(s);
        n.delete(invite.id);
        return n;
      });
      return;
    }
    toast("Convite recusado");
    // wait for animation
    setTimeout(() => {
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    }, 250);
  }

  function handleAccept(invite: Invitation) {
    if (!me) return;
    setPositionFor(invite);
  }

  async function confirmAccept(invite: Invitation, isGoalkeeper: boolean) {
    if (!me) return;
    setPositionFor(null);
    setClosing((s) => new Set(s).add(invite.id));

    // 1) update invitation status
    const { error: upErr } = await supabase
      .from("match_invitations")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    if (upErr) {
      toast.error("Não foi possível aceitar o convite");
      setClosing((s) => {
        const n = new Set(s);
        n.delete(invite.id);
        return n;
      });
      return;
    }

    // 2) link user as a member of the pelada
    const { error: memErr } = await supabase
      .from("match_members")
      .insert({ match_id: invite.match_id, user_id: me.id, is_goalkeeper: isGoalkeeper });

    // ignore duplicate membership (already a member)
    if (memErr && !/duplicate/i.test(memErr.message)) {
      toast.error("Convite aceito, mas falhou ao vincular à pelada");
    }

    toast.success(`Boa! Você agora faz parte do ${invite.match?.name ?? "Pelada"}.`);
    setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 600);
  }

  return (
    <main className="relative min-h-screen w-full bg-zinc-950 pt-14 text-zinc-100 font-sans antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#00FF00]/10 blur-[160px]"
      />
      <div className="relative z-10 flex min-h-screen">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[280px] shrink-0 flex-col justify-between overflow-y-auto border-r border-white/5 bg-zinc-900/40 px-5 py-6 pb-6 backdrop-blur-xl md:flex">
          <div>
            <div className="flex items-center justify-center pb-6">
              <img
                src={ifutCrest}
                alt="iFut"
                className="h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(0,255,0,0.45)]"
              />
            </div>
            <nav className="space-y-1.5">
              <Link to="/dashboard" className="block">
                <NavItem icon={<Home className="h-4 w-4" />} label="Início" />
              </Link>
              <NavItem
                icon={<Mail className="h-4 w-4" />}
                label="Convites"
                active
                badgeCount={invites.length}
              />
            </nav>
          </div>
          <div className="space-y-2">
          <button
            type="button"
            onClick={() => setInstallOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-yellow-400/30 bg-yellow-400/5 px-2 py-1.5 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-400/15"
          >
            <Smartphone className="h-3.5 w-3.5" />
            📱 Instalar App
          </button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-red-500/20 hover:text-red-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
          </div>
        </aside>

        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00FF00]/80">
              Caixa de entrada
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Convites
              {invites.length > 0 && (
                <span className="ml-3 inline-flex items-center justify-center rounded-full bg-amber-400 px-2.5 py-0.5 align-middle text-sm font-bold text-zinc-900">
                  {invites.length}
                </span>
              )}
            </h1>
          </header>

          {loading ? (
            <p className="py-10 text-center text-sm text-zinc-500">Carregando...</p>
          ) : invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-16 text-center backdrop-blur-xl">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#00FF00]/30 bg-[#00FF00]/5 text-[#00FF00] shadow-[0_0_40px_-12px_rgba(0,255,0,0.6)]">
                <Mail className="h-9 w-9" strokeWidth={1.6} />
              </div>
              <p className="max-w-sm text-base text-zinc-400">
                Você não tem convites pendentes por enquanto.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => {
                const isClosing = closing.has(inv.id);
                const inviterName =
                  inv.inviter?.full_name?.trim() ||
                  (inv.inviter?.username ? `@${inv.inviter.username}` : "Alguém");
                const matchName = inv.match?.name ?? "uma pelada";
                return (
                  <div
                    key={inv.id}
                    className={`overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur-xl transition-all duration-300 ${
                      isClosing ? "opacity-0 -translate-y-2 scale-95" : "opacity-100"
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#00FF00]/40 bg-zinc-800 shadow-[0_0_20px_-8px_rgba(0,255,0,0.6)]">
                          {inv.match?.logo_url ? (
                            <img
                              src={inv.match.logo_url}
                              alt={matchName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Trophy className="h-6 w-6 text-[#00FF00]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-zinc-300 md:text-base">
                            <span className="font-semibold text-white">{inviterName}</span>{" "}
                            te convidou para jogar no{" "}
                            <span className="font-semibold text-[#00FF00]">{matchName}</span>.
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                            {inv.match?.day_of_week && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-[#00FF00]" />
                                {inv.match.day_of_week}
                              </span>
                            )}
                            {inv.match?.match_time && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#00FF00]" />
                                {inv.match.match_time}
                              </span>
                            )}
                            {inv.match?.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-[#00FF00]" />
                                {inv.match.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={isClosing}
                          onClick={() => handleReject(inv)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-transparent px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Recusar
                        </button>
                        <button
                          type="button"
                          disabled={isClosing}
                          onClick={() => handleAccept(inv)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#00FF00]/50 bg-[#00FF00]/15 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#00FF00] transition hover:bg-[#00FF00]/25 hover:shadow-[0_0_20px_-5px_rgba(0,255,0,0.7)] disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          Aceitar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!positionFor} onOpenChange={(v) => !v && setPositionFor(null)}>
        <DialogContent className="max-w-md border border-[#00FF00]/40 bg-zinc-950 text-zinc-100 shadow-[0_0_60px_-10px_rgba(0,255,0,0.5)]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-white">
              Qual sua posição principal nesta pelada?
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-3">
            <button
              type="button"
              onClick={() => positionFor && confirmAccept(positionFor, false)}
              className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#00FF00]/40 bg-zinc-900/60 p-6 transition hover:border-[#00FF00] hover:bg-[#00FF00]/10 hover:shadow-[0_0_30px_-5px_rgba(0,255,0,0.6)]"
            >
              <span className="text-5xl">👟</span>
              <span className="text-sm font-bold uppercase tracking-wider text-zinc-100 group-hover:text-[#00FF00]">
                Jogador de Linha
              </span>
            </button>
            <button
              type="button"
              onClick={() => positionFor && confirmAccept(positionFor, true)}
              className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-blue-400/40 bg-zinc-900/60 p-6 transition hover:border-blue-400 hover:bg-blue-400/10 hover:shadow-[0_0_30px_-5px_rgba(96,165,250,0.6)]"
            >
              <span className="text-5xl">🧤</span>
              <span className="text-sm font-bold uppercase tracking-wider text-zinc-100 group-hover:text-blue-300">
                Goleiro
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function NavItem({
  icon,
  label,
  active,
  badgeCount,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badgeCount?: number;
  badge?: string;
}) {
  return (
    <div
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#00FF00]/10 text-[#00FF00] shadow-[inset_0_0_0_1px_rgba(0,255,0,0.25)]"
          : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-zinc-900 shadow-[0_0_10px_-2px_rgba(251,191,36,0.7)]">
          {badgeCount}
        </span>
      )}
      {badge && (
        <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
          {badge}
        </span>
      )}
    </div>
  );
}