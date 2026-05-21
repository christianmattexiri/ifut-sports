import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { peladaMatchQuery, matchAttendanceQuery } from "@/lib/pelada-queries";
import {
  Home,
  ShieldCheck,
  UserCircle2,
  LogOut,
  Plus,
  CalendarDays,
  ArrowDown,
  Trophy,
  Repeat,
  RefreshCw,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ifutCrest from "@/assets/ifut-crest.png";
import { MatchCard, type Pelada } from "@/components/MatchCard";
import { isSuperAdminUsername } from "@/lib/admin";
import { ProfileDialog } from "@/components/ProfileDialog";
import { InstallPwaModal } from "@/components/InstallPwaModal";
import { Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: "iFut — Minhas Peladas" }],
  }),
});

type Profile = {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
};

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [fixoOpen, setFixoOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      const uid = sess.session.user.id;
      const [{ data }, { data: ownMatches }, { data: memberRows }, { count: invitesCount }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", uid)
          .maybeSingle(),
        supabase
          .from("matches")
          .select("id, name, day_of_week, match_time, location, logo_url, is_pro")
          .eq("admin_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("match_members")
          .select("match:matches(id, name, day_of_week, match_time, location, logo_url, is_pro)")
          .eq("user_id", uid),
        supabase
          .from("match_invitations")
          .select("id", { count: "exact", head: true })
          .eq("invitee_id", uid)
          .eq("status", "pending"),
      ]);
      if (!active) return;
      setProfile(
        data ?? {
          id: uid,
          full_name: sess.session.user.email ?? "Jogador",
          username: "jogador",
          avatar_url: null,
        },
      );
      const ownIds = new Set<string>();
      const list: Pelada[] = [];
      for (const m of (ownMatches ?? []) as any[]) {
        ownIds.add(m.id);
        list.push({
          id: m.id,
          name: m.name,
          time: [m.day_of_week, m.match_time].filter(Boolean).join(" • ") || "Sem horário",
          participants: 0,
          status: "Ativa" as const,
          avatars: [],
          logoUrl: m.logo_url ?? null,
          isPro: !!m.is_pro,
        });
      }
      for (const row of (memberRows ?? []) as any[]) {
        const m = row.match;
        if (!m || ownIds.has(m.id)) continue;
        list.push({
          id: m.id,
          name: m.name,
          time: [m.day_of_week, m.match_time].filter(Boolean).join(" • ") || "Sem horário",
          participants: 0,
          status: "Ativa" as const,
          avatars: [],
          logoUrl: m.logo_url ?? null,
          isPro: !!m.is_pro,
        });
      }

      // Fetch GLOBAL participant counts via SECURITY DEFINER RPC so the number
      // is identical for every viewer (admin or member). RLS would otherwise
      // hide rows that belong to other users.
      const matchIds = list.map((p) => p.id);
      if (matchIds.length) {
        const { data: counts } = await supabase.rpc("get_match_member_counts", {
          match_ids: matchIds,
        });
        const map = new Map<string, number>();
        for (const r of (counts ?? []) as any[]) {
          map.set(r.match_id, Number(r.total) || 1);
        }
        for (const p of list) p.participants = map.get(p.id) ?? 1;
      }

      setPeladas(list);
      setPendingInvites(invitesCount ?? 0);
      setReady(true);

      // Prefetch silencioso: assim que os cards aparecem, já buscamos em
      // background os dados básicos (match + lista de presença) de cada
      // pelada para que a navegação fique instantânea.
      for (const p of list) {
        queryClient.prefetchQuery(peladaMatchQuery(p.id));
        queryClient.prefetchQuery(matchAttendanceQuery(p.id));
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate, queryClient]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Até a próxima!");
    navigate({ to: "/" });
  }

  if (!ready || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Carregando...
      </div>
    );
  }

  const firstName = (profile.full_name?.trim() || profile.username || "Jogador").split(" ")[0];
  const username = profile.username;
  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=00ff00`;
  const avatarUrl = profile.avatar_url || fallbackAvatar;
  const isSuperAdmin = isSuperAdminUsername(username);

  return (
    <main className="relative min-h-screen w-full bg-zinc-950 pt-14 text-zinc-100 font-sans antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#00FF00]/10 blur-[160px]"
      />

      <div className="relative z-10 flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[280px] shrink-0 flex-col justify-between overflow-y-auto border-r border-white/5 bg-zinc-900/40 px-5 py-6 pb-6 backdrop-blur-xl md:flex">
          <div>
            <div className="flex items-center justify-center pb-6">
              <img
                src={ifutCrest}
                alt="iFut"
                loading="lazy"
                decoding="async"
                className="h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(0,255,0,0.45)]"
              />
            </div>

            <nav className="space-y-1.5">
              <NavItem icon={<Home className="h-4 w-4" />} label="Início" active />
              <Link to="/convites" className="block">
                <NavItem
                  icon={<Mail className="h-4 w-4" />}
                  label="Convites"
                  badgeCount={pendingInvites}
                />
              </Link>
              {isSuperAdmin && (
                <Link to="/super-admin" className="block">
                  <NavItem
                    icon={<ShieldCheck className="h-4 w-4" />}
                    label="Super Admin"
                    badge="Global"
                  />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setInstallOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-400/10"
              >
                <Smartphone className="h-4 w-4" />
                📱 Instalar App
              </button>
            </nav>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt={firstName}
                className="h-11 w-11 rounded-full border border-[#00FF00]/40 bg-zinc-800 object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{firstName}</p>
                <p className="truncate text-xs text-zinc-400">@{username}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10"
              >
                <UserCircle2 className="h-3.5 w-3.5" />
                Meu perfil
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-red-500/20 hover:text-red-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00FF00]/80">
                Minhas peladas
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
                Olá, {firstName} <span className="inline-block">👋</span>
              </h1>
            </div>
            <p className="text-sm text-zinc-400">
              <span className="font-semibold text-zinc-200">{peladas.length}</span> Peladas no Total
            </p>
          </header>

          {peladas.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {peladas.map((p) => (
                <MatchCard key={p.id} pelada={p} />
              ))}
            </div>
          )}

          {/* CTA Dropdown */}
          <div className="mt-10 flex justify-center pb-6">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-[#00FF00] px-6 py-4 text-base font-bold text-black shadow-[0_0_40px_-6px_rgba(0,255,0,0.9)] transition-transform duration-200 md:hover:scale-[1.02] md:hover:bg-[#22ff22] focus:outline-none focus:ring-2 focus:ring-[#00FF00]/60 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              Criar pelada
            </button>
          </div>
        </section>
      </div>

      <CreatePeladaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSuperAdmin={isSuperAdmin}
        onSelectFixo={() => {
          setCreateOpen(false);
          setFixoOpen(true);
        }}
      />

      <CreateFixoDialog open={fixoOpen} onOpenChange={setFixoOpen} />

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        userId={profile.id}
        fullName={profile.full_name ?? ""}
        username={profile.username}
        avatarUrl={profile.avatar_url}
        fallbackAvatar={fallbackAvatar}
        onUpdated={(data) => setProfile((p) => (p ? { ...p, ...data } : p))}
      />
      <InstallPwaModal open={installOpen} onOpenChange={setInstallOpen} />
    </main>
  );
}

function CreatePeladaDialog({
  open,
  onOpenChange,
  onSelectFixo,
  isSuperAdmin,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectFixo: () => void;
  isSuperAdmin: boolean;
}) {
  const options = [
    {
      icon: RefreshCw,
      emoji: "⚽",
      title: "Futebol Avulso",
      desc: "Pelada de um dia só",
      key: "avulso" as const,
    },
    {
      icon: RefreshCw,
      emoji: null,
      title: "Futebol Fixo",
      desc: "Pelada recorrente (ex: toda quarta)",
      key: "fixo" as const,
    },
    {
      icon: Trophy,
      emoji: null,
      title: "Organizar Campeonato",
      desc: "Módulo de torneio",
      key: "torneio" as const,
    },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl border border-[#00FF00] bg-zinc-950 p-5 sm:p-8 mx-4 max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl shadow-[0_0_60px_-5px_rgba(0,255,0,0.7)]"
      >
        <DialogTitle className="text-center text-xl font-bold text-white md:text-3xl">
          Criar uma nova Pelada
        </DialogTitle>

        <div className="mt-6 grid grid-cols-1 gap-3 md:gap-6 md:grid-cols-3">
          {options.map(({ icon: Icon, emoji, title, desc, key }) => {
            const locked = (key === "avulso" || key === "torneio") && !isSuperAdmin;
            return (
            <button
              key={title}
              type="button"
              disabled={locked}
              onClick={() => {
                if (locked) return;
                if (key === "fixo") {
                  onSelectFixo();
                  return;
                }
                toast("Em breve", { description: title });
                onOpenChange(false);
              }}
              className={`group relative flex flex-row items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 md:flex-col md:items-center md:justify-between md:gap-5 md:p-6 md:text-center ${
                locked
                  ? "cursor-not-allowed border-white/10 bg-zinc-900/60 opacity-60"
                  : "border-green-500/50 bg-zinc-900 md:hover:border-[#00FF00] md:hover:shadow-[0_0_30px_-5px_rgba(0,255,0,0.7)] md:hover:scale-[1.03]"
              }`}
            >
              {locked && (
                <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-900 shadow-[0_0_10px_-2px_rgba(251,191,36,0.7)]">
                  Em breve
                </span>
              )}
              {emoji ? (
                <span className={`shrink-0 text-4xl leading-none md:text-6xl ${locked ? "grayscale" : "drop-shadow-[0_0_12px_rgba(0,255,0,0.8)]"}`}>
                  {emoji}
                </span>
              ) : (
                <Icon
                  className={`h-12 w-12 shrink-0 md:h-16 md:w-16 ${locked ? "text-zinc-500" : "text-[#00FF00] drop-shadow-[0_0_8px_rgba(0,255,0,0.8)]"}`}
                  strokeWidth={2}
                />
              )}
              <div className="flex-1 space-y-1 md:space-y-2">
                <h3 className="text-base font-semibold text-white md:text-xl">{title}</h3>
                <p className="text-xs text-zinc-400 md:text-sm">{desc}</p>
              </div>
              <span className={`ml-auto shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition md:ml-0 md:px-5 md:py-1.5 md:text-sm ${
                locked
                  ? "border-white/10 text-zinc-500"
                  : "border-[#00FF00]/60 text-[#00FF00] group-hover:bg-[#00FF00]/10"
              }`}>
                {locked ? "Em breve" : "Selecionar"}
              </span>
            </button>
          );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-16 text-center backdrop-blur-xl">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#00FF00]/30 bg-[#00FF00]/5 text-[#00FF00] shadow-[0_0_40px_-12px_rgba(0,255,0,0.6)]">
        <CalendarDays className="h-9 w-9" strokeWidth={1.6} />
      </div>
      <p className="max-w-sm text-base text-zinc-400">
        Você ainda não participa de nenhuma pelada.
      </p>
      <div className="mt-2 flex flex-col items-center gap-1 text-sm font-medium text-[#00FF00]">
        <span>Crie a sua primeira logo abaixo</span>
        <ArrowDown className="h-5 w-5 animate-bounce" />
      </div>
    </div>
  );
}

function CreateFixoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !day || !time || !place) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        toast.error("Faça login novamente");
        setSubmitting(false);
        return;
      }

      let logo_url: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `${uid}/match-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
        logo_url = pub.publicUrl;
      }

      const { data: inserted, error } = await supabase
        .from("matches")
        .insert({
          name,
          day_of_week: day,
          match_time: time,
          location: place,
          logo_url,
          match_type: "fixa",
          admin_id: uid,
        })
        .select("id")
        .single();
      if (error || !inserted) throw error ?? new Error("Falha ao criar");

      toast.success("Pelada criada!");
      onOpenChange(false);
      navigate({ to: "/pelada/$id", params: { id: inserted.id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar pelada");
    } finally {
      setSubmitting(false);
    }
  }

  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border border-[#00FF00] bg-zinc-950 p-6 shadow-[0_0_60px_-5px_rgba(0,255,0,0.7)] sm:rounded-3xl">
        <DialogTitle className="text-center text-xl font-bold text-white md:text-2xl">
          Nova Pelada Fixa
        </DialogTitle>
        <p className="mt-1 text-center text-sm text-zinc-400">
          Configure sua pelada recorrente
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pelada-name" className="text-zinc-300">Nome da Pelada</Label>
            <Input
              id="pelada-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pelada da Quarta"
              className="border-white/10 bg-zinc-900 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Dia da Semana</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="border-white/10 bg-zinc-900 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 text-white">
                  {days.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pelada-time" className="text-zinc-300">Horário</Label>
              <Input
                id="pelada-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="border-white/10 bg-zinc-900 text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pelada-place" className="text-zinc-300">Nome da Quadra/Local</Label>
            <Input
              id="pelada-place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Ex: Arena Martello"
              className="border-white/10 bg-zinc-900 text-white"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pelada-logo" className="text-zinc-300">Logo (opcional)</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-900">
                {logo ? (
                  <img src={logo} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <Trophy className="h-6 w-6 text-zinc-600" />
                )}
              </div>
              <Input
                id="pelada-logo"
                type="file"
                accept="image/*"
                onChange={handleLogo}
                className="border-white/10 bg-zinc-900 text-zinc-300 file:text-zinc-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
           className="mt-2 w-full rounded-xl bg-[#00FF00] py-3 text-base font-bold text-black shadow-[0_0_30px_-6px_rgba(0,255,0,0.9)] transition md:hover:scale-[1.01] md:hover:bg-[#22ff22] disabled:opacity-60"
          >
            {submitting ? "Criando..." : "CRIAR"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NavItem({
  icon,
  label,
  active,
  badge,
  badgeCount,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  badgeCount?: number;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#00FF00]/10 text-[#00FF00] shadow-[inset_0_0_0_1px_rgba(0,255,0,0.25)]"
          : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
      }`}
    >
      <span className="flex items-center gap-2.5">
        {icon}
        {label}
      </span>
      {badge && (
        <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
          {badge}
        </span>
      )}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-zinc-900 shadow-[0_0_10px_-2px_rgba(251,191,36,0.7)]">
          {badgeCount}
        </span>
      )}
    </button>
  );
}