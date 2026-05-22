import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Home,
  ClipboardList,
  History,
  BarChart3,
  UserCircle2,
  ShieldCheck,
  Trophy,
  Trash2,
  UserPlus,
  Search,
  UserCog,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSuperAdminUsername } from "@/lib/admin";
import { useServerFn } from "@tanstack/react-start";
import {
  listMatchMembers,
  setMemberRating,
  inviteRefereeToMatch,
} from "@/lib/admin-users.functions";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Flag } from "lucide-react";

export const Route = createFileRoute("/pelada/$id_/usuarios")({
  component: UsuariosPage,
  head: () => ({ meta: [{ title: "iFut — Gerenciamento de Usuários" }] }),
});

type Match = {
  id: string;
  name: string;
  logo_url: string | null;
  admin_id: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function UsuariosPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id_/usuarios" });
  const fetchMembers = useServerFn(listMatchMembers);
  const saveRating = useServerFn(setMemberRating);
  const callReferee = useServerFn(inviteRefereeToMatch);
  const queryClient = useQueryClient();
  const [match, setMatch] = useState<Match | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [roles, setRoles] = useState<Record<string, "player" | "juiz">>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [refereeOpen, setRefereeOpen] = useState(false);
  const [pendingInviteIds, setPendingInviteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      const uid = sess.session.user.id;
      const { data: m } = await supabase
        .from("matches")
        .select("id, name, logo_url, admin_id")
        .eq("id", id)
        .maybeSingle();
      const match = m as Match | null;
      // Carrega meu profile primeiro para checar super admin
      const { data: myProf } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      const isOwner = match?.admin_id === uid;
      const isSuper = isSuperAdminUsername(myProf?.username);
      if (!match || (!isOwner && !isSuper)) {
        toast.error("Acesso restrito ao admin da pelada");
        navigate({ to: "/pelada/$id", params: { id } });
        return;
      }
      setMatch(match);

      // Server fn bypasses RLS for owner/super admin so todos os membros aparecem
      try {
        const res = await fetchMembers({ data: { matchId: id } });
        const profMap = new Map<string, Profile>();
        for (const p of (res.profiles ?? []) as Profile[]) profMap.set(p.id, p);
        const list: Profile[] = [];
        const adminProf = profMap.get(res.adminId);
        if (adminProf) list.push(adminProf);
        for (const uid2 of res.memberIds) {
          if (list.some((p) => p.id === uid2)) continue;
          const p = profMap.get(uid2);
          if (p) list.push(p);
        }
        setMembers(list);
        setRatings(res.ratings ?? {});
        setRoles((res as any).roles ?? {});
        setPendingInviteIds(new Set(res.pendingInviteIds));
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao carregar membros");
      }
      setLoading(false);
    })();
  }, [navigate, id]);

  const removeMember = async (pid: string) => {
    if (!confirm("Remover este jogador da pelada?")) return;
    const { error } = await supabase
      .from("match_members")
      .delete()
      .eq("match_id", id)
      .eq("user_id", pid);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== pid));
    toast.success("Jogador removido");
  };

  const inviteMember = async (p: Profile) => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) {
      toast.error("Faça login novamente");
      return;
    }
    if (members.some((m) => m.id === p.id)) {
      toast.info("Esse jogador já está na pelada");
      return;
    }
    if (pendingInviteIds.has(p.id)) {
      toast.info("Esse jogador já tem um convite pendente");
      return;
    }
    const { error } = await supabase.from("match_invitations").insert({
      match_id: id,
      inviter_id: uid,
      invitee_id: p.id,
      status: "pending",
    });
    if (error) {
      toast.error("Erro ao enviar convite");
      return;
    }
    setPendingInviteIds((s) => new Set(s).add(p.id));
    toast.success(`Convite enviado para ${p.full_name || p.username}!`);
  };

  const inviteReferee = async (p: Profile) => {
    if (members.some((m) => m.id === p.id && roles[m.id] === "juiz")) {
      toast.info("Esse usuário já é juiz dessa pelada");
      return;
    }
    try {
      await callReferee({ data: { matchId: id, userId: p.id } });
      setMembers((prev) => (prev.some((m) => m.id === p.id) ? prev : [...prev, p]));
      setRoles((prev) => ({ ...prev, [p.id]: "juiz" }));
      setRatings((prev) => ({ ...prev, [p.id]: 0 }));
      queryClient.invalidateQueries({ queryKey: ["match_referees", id] });
      toast.success(`${p.full_name || p.username} chamado como Juiz!`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao chamar juiz");
    }
  };

  const peladaName = match?.name ?? "Minha Pelada";
  const peladaLogo = match?.logo_url ?? null;
  const referees = members.filter((m) => roles[m.id] === "juiz");
  const players = members.filter((m) => roles[m.id] !== "juiz");

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-zinc-950 pt-14 text-zinc-100 font-sans antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#00FF00]/10 blur-[160px]"
      />

      <div className="relative z-10 flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-zinc-900/40 px-5 py-5 backdrop-blur-xl md:flex">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="mb-5 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition hover:text-[#00FF00]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Início do App
          </button>

          <div className="flex flex-col items-center gap-2 pb-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#00FF00]/40 bg-zinc-900 shadow-[0_0_30px_-8px_rgba(0,255,0,0.7)]">
              {peladaLogo ? (
                <img src={peladaLogo} alt={peladaName} className="h-full w-full object-cover" />
              ) : (
                <Trophy className="h-9 w-9 text-[#00FF00]" />
              )}
            </div>
            <p className="text-center text-base font-bold tracking-tight text-white">{peladaName}</p>
          </div>

          <nav className="space-y-1.5">
            <Link to="/pelada/$id" params={{ id }} className="block">
              <NavItem icon={<Home className="h-4 w-4" />} label="Início" />
            </Link>
            <Link to="/pelada/$id/lista" params={{ id }} className="block">
              <NavItem icon={<ClipboardList className="h-4 w-4" />} label="Lista de Presença" />
            </Link>
            <Link to="/pelada/$id/partida" params={{ id }} className="block">
              <NavItem icon={<Trophy className="h-4 w-4" />} label="Partida" gold />
            </Link>
            <Link to="/pelada/$id/historico" params={{ id }} className="block">
              <NavItem icon={<History className="h-4 w-4" />} label="Histórico" />
            </Link>
            <Link to="/pelada/$id/rankings" params={{ id }} className="block"><NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" /></Link>
            <Link to="/pelada/$id/perfil" params={{ id }} className="block"><NavItem icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil na pelada" /></Link>
          </nav>

          <div className="mt-auto pt-6">
            <NavItem icon={<UserCog className="h-4 w-4" />} label="Gerenciamento de Usuários" active />
            <div className="h-2" />
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"
            >
              <ShieldCheck className="h-4 w-4" />
              Administrador
            </button>
          </div>
          <div className="h-32 w-full shrink-0" aria-hidden />
        </aside>

        <section className="flex-1 px-4 py-6 md:px-10 md:py-10">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-tight text-[#00FF00] md:text-3xl">
                  Gerenciamento de Usuários
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Adicione ou remova jogadores desta pelada.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-[#00FF00] bg-[#00FF00]/10 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-[#00FF00] transition hover:bg-[#00FF00]/20 shadow-[0_0_25px_-8px_rgba(0,255,0,0.7)]"
                >
                  <UserPlus className="h-4 w-4" />
                  Incluir Jogador
                </button>
                <button
                  type="button"
                  onClick={() => setRefereeOpen(true)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-yellow-400 bg-yellow-400/10 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-yellow-300 transition hover:bg-yellow-400/20"
                >
                  <Flag className="h-4 w-4" />
                  Chamar Juiz
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {loading ? (
                <p className="py-10 text-center text-sm text-zinc-500">Carregando...</p>
              ) : members.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  Ninguém na pelada ainda. Clique em "Incluir Jogador".
                </p>
              ) : (
                <>
                  {referees.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-yellow-300/80">
                        Juízes
                      </p>
                      {referees.map((m) => (
                        <RefereeRow
                          key={m.id}
                          profile={m}
                          onRemove={() => removeMember(m.id)}
                        />
                      ))}
                    </div>
                  )}
                  {players.map((m) => (
                    <MemberRow
                      key={m.id}
                      profile={m}
                      isAdmin={m.id === match?.admin_id}
                      rating={ratings[m.id] ?? 5}
                      onRatingChange={async (val) => {
                        setRatings((prev) => ({ ...prev, [m.id]: val }));
                        try {
                          await saveRating({
                            data: { matchId: id, userId: m.id, rating: val },
                          });
                          queryClient.invalidateQueries({ queryKey: ["match_attendance", id] });
                          toast.success("Nota atualizada");
                        } catch (e: any) {
                          toast.error(e?.message ?? "Erro ao salvar nota");
                        }
                      }}
                      onRemove={() => removeMember(m.id)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <AddPlayerDialog
        open={open}
        onOpenChange={setOpen}
        existingIds={members.map((m) => m.id)}
        pendingIds={Array.from(pendingInviteIds)}
        onPick={(p) => {
          inviteMember(p);
          setOpen(false);
        }}
      />

      <AddPlayerDialog
        open={refereeOpen}
        onOpenChange={setRefereeOpen}
        existingIds={referees.map((m) => m.id)}
        pendingIds={[]}
        title="Chamar Juiz"
        actionLabel="Chamar Juiz"
        accentClass="amber"
        onPick={(p) => {
          inviteReferee(p);
          setRefereeOpen(false);
        }}
      />
    </main>
  );
}

function NavItem({ icon, label, active, gold }: { icon: React.ReactNode; label: string; active?: boolean; gold?: boolean }) {
  return (
    <div
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#00FF00]/10 text-[#00FF00] shadow-[inset_0_0_0_1px_rgba(0,255,0,0.25)]"
          : gold
          ? "text-yellow-500 hover:bg-yellow-500/10"
          : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function MemberRow({
  profile,
  isAdmin,
  rating,
  onRatingChange,
  onRemove,
}: {
  profile: Profile;
  isAdmin: boolean;
  rating: number;
  onRatingChange: (value: number) => void;
  onRemove: () => void;
}) {
  const display = profile.full_name?.trim() || profile.username;
  const [localRating, setLocalRating] = useState<number>(rating);
  useEffect(() => {
    setLocalRating(rating);
  }, [rating]);
  return (
    <div className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/40 p-2 backdrop-blur-xl sm:gap-3 sm:px-3 sm:py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#00FF00]/30 bg-zinc-800 text-xs font-bold text-[#00FF00] sm:h-10 sm:w-10">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={display} className="h-full w-full object-cover" />
        ) : display ? (
          initials(display)
        ) : (
          <UserIcon className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">{display}</p>
        <p className="truncate text-xs text-zinc-500">@{profile.username}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/5 px-1.5 py-1 sm:gap-1.5 sm:px-2">
        <span className="hidden text-[10px] font-bold uppercase tracking-wider text-amber-300/80 sm:inline">Nota</span>
        <input
          type="number"
          min={1}
          max={10}
          step={0.5}
          value={localRating}
          onChange={(e) => setLocalRating(Number(e.target.value))}
          onBlur={() => {
            const v = Math.max(1, Math.min(10, Number(localRating) || 5));
            setLocalRating(v);
            if (v !== rating) onRatingChange(v);
          }}
          className="w-11 rounded-md border border-amber-400/30 bg-zinc-950/60 px-1 py-0.5 text-center text-sm font-bold text-amber-200 outline-none focus:border-amber-300 sm:w-14 sm:px-1.5"
        />
      </div>
      {isAdmin ? (
        <span className="shrink-0 rounded-md border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 sm:px-2">
          Admin
        </span>
      ) : (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover do grupo"
          className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/5 p-1.5 text-red-400 transition hover:bg-red-500/15 hover:text-red-300 sm:p-2"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function AddPlayerDialog({
  open,
  onOpenChange,
  existingIds,
  pendingIds,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingIds: string[];
  pendingIds?: string[];
  onPick: (p: Profile) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const [{ data: byUsername }, { data: byFullName }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .ilike("username", `%${q}%`)
          .limit(10),
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .ilike("full_name", `%${q}%`)
          .limit(10),
      ]);
      if (cancelled) return;
      const map = new Map<string, Profile>();
      for (const p of [...(byUsername ?? []), ...(byFullName ?? [])] as Profile[]) {
        map.set(p.id, p);
      }
      setResults(Array.from(map.values()));
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-[#00FF00]">Incluir Jogador</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por @username ou nome completo"
              className="border-white/10 bg-zinc-900 pl-9 text-zinc-100"
            />
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {query.trim().length < 2 ? (
              <p className="py-6 text-center text-xs text-zinc-500">
                Digite ao menos 2 letras (username ou nome) para buscar.
              </p>
            ) : searching ? (
              <p className="py-6 text-center text-xs text-zinc-500">Buscando...</p>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">Nenhum usuário encontrado.</p>
            ) : (
              results.map((p) => {
                const already = existingIds.includes(p.id);
                const pending = pendingIds?.includes(p.id) ?? false;
                const display = p.full_name?.trim() || p.username;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#00FF00]/30 bg-zinc-800 text-xs font-bold text-[#00FF00]">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={display} className="h-full w-full object-cover" />
                      ) : (
                        initials(display)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">{display}</p>
                      <p className="truncate text-xs text-zinc-500">@{p.username}</p>
                    </div>
                    <button
                      type="button"
                      disabled={already || pending}
                      onClick={() => onPick(p)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                        already || pending
                          ? "cursor-not-allowed border-white/10 bg-zinc-900 text-zinc-600"
                          : "border-[#00FF00]/50 bg-[#00FF00]/10 text-[#00FF00] hover:bg-[#00FF00]/20"
                      }`}
                    >
                      {already ? "Já incluso" : pending ? "Convite enviado" : "Convidar"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}