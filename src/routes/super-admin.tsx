import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, Trophy, KeyRound, Users, Trash2, UserPlus, Settings, DatabaseZap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { isSuperAdminUsername } from "@/lib/admin";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ProTag } from "@/routes/pelada.$id";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { listAllUsers, resetUserPassword, setMatchPro, deleteMatch, directAddMember, deleteUser as deleteUserFn } from "@/lib/admin-users.functions";
import type { AdminUserRow } from "@/lib/admin-users.types";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminPage,
  head: () => ({ meta: [{ title: "iFut — Super Admin" }] }),
});

type Row = {
  id: string;
  name: string;
  logo_url: string | null;
  admin_id: string;
  is_pro: boolean;
  admin_username?: string | null;
};

function SuperAdminPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const fetchUsers = useServerFn(listAllUsers);
  const doReset = useServerFn(resetUserPassword);
  const doSetPro = useServerFn(setMatchPro);
  const doDelete = useServerFn(deleteMatch);
  const doLinkUser = useServerFn(directAddMember);
  const doDeleteUser = useServerFn(deleteUserFn);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<AdminUserRow | null>(null);
  const [linkTarget, setLinkTarget] = useState<AdminUserRow | null>(null);
  const [linkMatchId, setLinkMatchId] = useState("");
  const [linking, setLinking] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/" }); return; }
      const uid = sess.session.user.id;
      const { data: prof } = await supabase
        .from("profiles").select("username").eq("id", uid).maybeSingle();
      if (!isSuperAdminUsername(prof?.username)) {
        toast.error("Acesso restrito");
        navigate({ to: "/dashboard" });
        setAllowed(false);
        return;
      }
      setAllowed(true);
      const { data } = await supabase
        .from("matches")
        .select("id, name, logo_url, admin_id, is_pro")
        .order("created_at", { ascending: false });
      const list = (data ?? []) as any[];
      const adminIds = Array.from(new Set(list.map((r) => r.admin_id).filter(Boolean)));
      let usernameMap = new Map<string, string>();
      if (adminIds.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id, username").in("id", adminIds);
        for (const p of (profs ?? []) as any[]) usernameMap.set(p.id, p.username);
      }
      setRows(list.map((r) => ({
        id: r.id, name: r.name, logo_url: r.logo_url,
        admin_id: r.admin_id, is_pro: !!r.is_pro,
        admin_username: usernameMap.get(r.admin_id) ?? null,
      })));

      setUsersLoading(true);
      try {
        const u = await fetchUsers();
        setUsers(u);
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao carregar usuários");
      } finally {
        setUsersLoading(false);
      }
    })();
  }, [navigate, fetchUsers]);

  async function togglePro(row: Row, value: boolean) {
    setSavingId(row.id);
    try {
      await doSetPro({ data: { matchId: row.id, isPro: value } });
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_pro: value } : r)));
      toast.success(value ? "Pelada ativada como PRO" : "PRO desativado");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar");
    } finally {
      setSavingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await doDelete({ data: { matchId: deleteTarget.id } });
      setRows((rs) => rs.filter((r) => r.id !== deleteTarget.id));
      toast.success("Pelada excluída");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  if (allowed === null) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">Carregando...</div>;
  }
  if (!allowed) return null;

  async function reloadUsers() {
    try {
      const u = await fetchUsers();
      setUsers(u);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao recarregar usuários");
    }
  }

  async function confirmLink() {
    if (!linkTarget || !linkMatchId) return;
    setLinking(true);
    try {
      await doLinkUser({ data: { matchId: linkMatchId, userId: linkTarget.id } });
      const match = rows.find((r) => r.id === linkMatchId);
      toast.success(`Usuário vinculado com sucesso à pelada ${match?.name ?? ""}!`);
      setLinkTarget(null);
      setLinkMatchId("");
      setActionsTarget(null);
      await reloadUsers();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao vincular");
    } finally {
      setLinking(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteUserTarget) return;
    setDeletingUser(true);
    try {
      await doDeleteUser({ data: { userId: deleteUserTarget.id } });
      toast.success("Usuário removido da plataforma.");
      setUsers((us) => us.filter((u) => u.id !== deleteUserTarget.id));
      setRows((rs) => rs.filter((r) => r.admin_id !== deleteUserTarget.id));
      setDeleteUserTarget(null);
      setActionsTarget(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao deletar");
    } finally {
      setDeletingUser(false);
    }
  }

  async function runResetAndSeed() {
    const PELADA_ID = "7d5e2a58-2419-45ee-8176-eba8ae483513";
    setSeeding(true);
    try {
      // 1) Buscar IDs de jogos existentes da pelada
      const { data: existing, error: exErr } = await supabase
        .from("games").select("id").eq("match_id", PELADA_ID);
      if (exErr) throw exErr;
      const ids = (existing ?? []).map((g: any) => g.id);

      // 2) Apagar stats e votos vinculados, depois os jogos
      if (ids.length > 0) {
        await supabase.from("game_player_stats").delete().in("game_id", ids);
        await supabase.from("game_votes").delete().in("game_id", ids);
        const { error: delErr } = await supabase.from("games").delete().in("id", ids);
        if (delErr) throw delErr;
      }

      // 3) Dados das partidas (seed)
      const historicoPartidas = [
        {
          date: "2026-05-16",
          score_a: 12, score_b: 14,
          team_a: [
            { name: "Mauricio", goals: 0 }, { name: "Tiago Atanasoff", goals: 0 },
            { name: "Diego de souza", goals: 0 }, { name: "Jonathas pacheco", goals: 4 },
            { name: "Leonardo dos Santos lemos", goals: 0 }, { name: "Yang", goals: 3 },
            { name: "Daniel Selistre", goals: 5 },
          ],
          team_b: [
            { name: "Richard de souza", goals: 0 }, { name: "Dudu", goals: 0 },
            { name: "Leonardo Silveira", goals: 2 }, { name: "Paulo Nascimento dos Santos", goals: 3 },
            { name: "Airon", goals: 2 }, { name: "Tiago Folle", goals: 4 },
            { name: "Bruno Santos", goals: 3 },
          ],
        },
        {
          date: "2026-05-09",
          score_a: 10, score_b: 8,
          team_a: [
            { name: "Vin", goals: 0 }, { name: "Cássio", goals: 0 },
            { name: "Jonathas pacheco", goals: 1 }, { name: "Daniel Selistre", goals: 3 },
            { name: "Tiago Atanasoff", goals: 2 }, { name: "Mauricio", goals: 4 },
            { name: "Leonardo dos Santos lemos", goals: 0 },
          ],
          team_b: [
            { name: "Richard de souza", goals: 0 }, { name: "Airon", goals: 0 },
            { name: "Paulo Nascimento dos Santos", goals: 3 }, { name: "Tiago Folle", goals: 2 },
            { name: "Dudu", goals: 0 }, { name: "Diego de souza", goals: 0 },
            { name: "Bruno Santos", goals: 3 },
          ],
        },
        {
          date: "2026-04-25",
          score_a: 6, score_b: 8,
          team_a: [
            { name: "Richard de souza", goals: 0 }, { name: "Cássio", goals: 0 },
            { name: "Airon", goals: 0 }, { name: "Leonardo Silveira", goals: 1 },
            { name: "Tiago Folle", goals: 0 }, { name: "Diego de souza", goals: 3 },
            { name: "Bruno Santos", goals: 2 },
          ],
          team_b: [
            { name: "Vin", goals: 0 }, { name: "Dudu", goals: 0 },
            { name: "Jonathas pacheco", goals: 1 }, { name: "Tiago Atanasoff", goals: 3 },
            { name: "Mauricio", goals: 3 }, { name: "Paulo Nascimento dos Santos", goals: 0 },
            { name: "Leonardo dos Santos lemos", goals: 1 },
          ],
        },
      ];

      // 4) Resolver UUIDs por nome (case-insensitive via ilike em full_name e username).
      // Aliases para apelidos que não batem com o full_name no banco.
      const aliasMap: Record<string, string> = {
        "vin": "Jonas Ribeiro",
        "tiago": "Tiago Atanasoff",
      };
      const allNames = Array.from(
        new Set(
          historicoPartidas.flatMap((p) => [...p.team_a, ...p.team_b]).map((pl) => pl.name)
        )
      );
      const nameToId = new Map<string, string>();
      for (const original of allNames) {
        const key = original.toLowerCase();
        const lookup = aliasMap[key] ?? original;
        const { data: found } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .or(`full_name.ilike.${lookup},username.ilike.${lookup}`)
          .limit(1);
        const id = (found && found[0]?.id) || null;
        if (id) nameToId.set(original, id);
      }

      // 5) Inserir os jogos e as estatísticas. NENHUM update em profiles.
      for (const p of historicoPartidas) {
        const { data: game, error: gErr } = await supabase
          .from("games")
          .insert({
            match_id: PELADA_ID,
            game_date: p.date,
            score_a: p.score_a,
            score_b: p.score_b,
            voting_open: false,
          })
          .select("id")
          .single();
        if (gErr || !game) throw gErr ?? new Error("Falha ao criar jogo");

        const statsRows: any[] = [];
        for (const pl of p.team_a) {
          const uid = nameToId.get(pl.name);
          if (!uid) continue; // sem vínculo: pula (user_id é NOT NULL)
          statsRows.push({
            game_id: game.id, user_id: uid, team: "A",
            goals: pl.goals, assists: 0, player_name: pl.name,
          });
        }
        for (const pl of p.team_b) {
          const uid = nameToId.get(pl.name);
          if (!uid) continue;
          statsRows.push({
            game_id: game.id, user_id: uid, team: "B",
            goals: pl.goals, assists: 0, player_name: pl.name,
          });
        }
        if (statsRows.length > 0) {
          const { error: sErr } = await supabase.from("game_player_stats").insert(statsRows);
          if (sErr) throw sErr;
        }
      }

      await queryClient.invalidateQueries();
      toast.success("Histórico resetado e 3 partidas importadas com sucesso!");
      setSeedConfirmOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Erro ao resetar/semear histórico");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pt-14">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-[#00FF00]">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-400/40 bg-amber-400/10 text-amber-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-amber-300">Super Admin</h1>
            <p className="text-sm text-zinc-400">Gestão global de peladas e plano PRO</p>
          </div>
        </div>

        <Tabs defaultValue="peladas" className="mt-6">
          <TabsList className="bg-zinc-900/60 border border-white/10">
            <TabsTrigger value="peladas" className="data-[state=active]:bg-amber-400 data-[state=active]:text-zinc-950">
              <Trophy className="mr-1.5 h-3.5 w-3.5" /> Peladas
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-amber-400 data-[state=active]:text-zinc-950">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="peladas" className="mt-4">
        <div className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-300">Futebol da Gurizada</p>
              <p className="text-xs text-zinc-400">
                Apaga TODO o histórico de jogos desta pelada e injeta 3 partidas-seed (sem mexer em agregados de perfil).
              </p>
            </div>
            <button
              onClick={() => setSeedConfirmOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-400/20"
            >
              <DatabaseZap className="h-3.5 w-3.5" /> Reset e Seed Histórico
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 backdrop-blur-xl">
          <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
            {rows.length} peladas no total
          </p>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-950/60 px-3 py-3">
                <div className="relative">
                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                    {r.logo_url ? (
                      <img src={r.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Trophy className="h-5 w-5 text-zinc-500" />
                    )}
                  </div>
                  {r.is_pro && <ProTag className="absolute -right-1 -top-1" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-100">{r.name}</p>
                  <p className="truncate text-xs text-zinc-500">@{r.admin_username ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${r.is_pro ? "text-amber-300" : "text-zinc-500"}`}>
                    {r.is_pro ? "PRO" : "Free"}
                  </span>
                  <Switch
                    checked={r.is_pro}
                    disabled={savingId === r.id}
                    onCheckedChange={(v) => togglePro(r, v)}
                    className="data-[state=checked]:bg-amber-400"
                  />
                  <button
                    onClick={() => setDeleteTarget(r)}
                    title="Excluir pelada"
                    className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">Nenhuma pelada cadastrada.</p>
            )}
          </div>
        </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 backdrop-blur-xl">
              <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
                {usersLoading ? "Carregando..." : `${users.length} usuários cadastrados`}
              </p>
              <div className="space-y-2">
                {users.map((u) => {
                  const initials = (u.full_name ?? u.username ?? "?")
                    .split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                  return (
                    <div key={u.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-950/60 px-3 py-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-zinc-900 text-sm font-bold text-zinc-300">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-zinc-100">
                          {u.full_name || u.username || "—"}{" "}
                          <span className="text-xs font-normal text-zinc-500">@{u.username ?? "—"}</span>
                        </p>
                        <p className="truncate text-xs text-zinc-400">{u.email ?? "—"}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {u.peladas.length === 0 && (
                            <span className="text-[10px] uppercase tracking-wider text-zinc-600">Sem peladas</span>
                          )}
                          {u.peladas.map((p) => (
                            <span
                              key={`${p.id}-${p.role}`}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                p.role === "admin"
                                  ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                                  : "bg-white/5 text-zinc-300 border border-white/10"
                              }`}
                              title={p.role === "admin" ? "Admin" : "Membro"}
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => setActionsTarget(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-200 hover:bg-white/10"
                        >
                          <Settings className="h-3.5 w-3.5" /> Ações
                        </button>
                        <button
                          onClick={() => { setResetTarget(u); setNewPw(""); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-400/20"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Resetar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!usersLoading && users.length === 0 && (
                  <p className="py-8 text-center text-sm text-zinc-500">Nenhum usuário encontrado.</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="border-amber-400/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-300">
              Resetar senha de {resetTarget?.full_name || resetTarget?.username}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Defina uma senha provisória. O usuário será obrigado a alterá-la no próximo login.
          </p>
          <input
            type="text"
            autoFocus
            placeholder="Nova senha provisória (mín. 6)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
          />
          <DialogFooter>
            <button
              onClick={() => setResetTarget(null)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase text-zinc-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              disabled={resetSaving || newPw.length < 6}
              onClick={async () => {
                if (!resetTarget) return;
                setResetSaving(true);
                try {
                  await doReset({ data: { userId: resetTarget.id, newPassword: newPw } });
                  toast.success("Senha resetada! O usuário será obrigado a alterá-la no próximo login.");
                  setResetTarget(null);
                  setNewPw("");
                } catch (e: any) {
                  toast.error(e?.message ?? "Erro ao resetar senha");
                } finally {
                  setResetSaving(false);
                }
              }}
              className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold uppercase text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
            >
              {resetSaving ? "Salvando..." : "Confirmar reset"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <DialogContent className="border-red-500/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Excluir pelada {deleteTarget?.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Esta ação é <strong className="text-red-300">irreversível</strong>. Todos os jogos,
            estatísticas, votos, listas de presença e membros desta pelada serão removidos.
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase text-zinc-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              disabled={deleting}
              onClick={confirmDelete}
              className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold uppercase text-white hover:bg-red-400 disabled:opacity-60"
            >
              {deleting ? "Excluindo..." : "Excluir definitivamente"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Ações do Usuário */}
      <Dialog open={!!actionsTarget} onOpenChange={(o) => !o && setActionsTarget(null)}>
        <DialogContent className="border-white/10 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              Ações para {actionsTarget?.full_name || actionsTarget?.username}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">@{actionsTarget?.username} · {actionsTarget?.email ?? "—"}</p>
          <div className="mt-2 flex flex-col gap-2">
            <button
              onClick={() => { setLinkTarget(actionsTarget); setLinkMatchId(""); }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#00FF00]/40 bg-[#00FF00]/10 px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-[#00FF00] hover:bg-[#00FF00]/20"
            >
              <UserPlus className="h-4 w-4" /> ➕ Vincular a uma Pelada
            </button>
            <button
              onClick={() => setDeleteUserTarget(actionsTarget)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" /> 🗑️ Deletar Usuário
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-modal: Vincular usuário a uma pelada */}
      <Dialog open={!!linkTarget} onOpenChange={(o) => !o && !linking && (setLinkTarget(null), setLinkMatchId(""))}>
        <DialogContent className="border-[#00FF00]/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-[#00FF00]">
              Vincular {linkTarget?.full_name || linkTarget?.username} a uma pelada
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Selecione a pelada. O usuário será adicionado diretamente como membro,
            sem precisar aceitar convite.
          </p>
          <select
            value={linkMatchId}
            onChange={(e) => setLinkMatchId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#00FF00]"
          >
            <option value="">— escolha uma pelada —</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.admin_username ? `(@${r.admin_username})` : ""}
              </option>
            ))}
          </select>
          <DialogFooter>
            <button
              onClick={() => { setLinkTarget(null); setLinkMatchId(""); }}
              disabled={linking}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase text-zinc-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              disabled={linking || !linkMatchId}
              onClick={confirmLink}
              className="rounded-lg bg-[#00FF00] px-3 py-2 text-xs font-bold uppercase text-zinc-950 hover:bg-[#00FF00]/90 disabled:opacity-60"
            >
              {linking ? "Vinculando..." : "Confirmar Vínculo"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-modal: Confirmar deleção de usuário */}
      <Dialog open={!!deleteUserTarget} onOpenChange={(o) => !o && !deletingUser && setDeleteUserTarget(null)}>
        <DialogContent className="border-red-500/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Deletar {deleteUserTarget?.full_name || deleteUserTarget?.username}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Tem certeza? Esta ação é <strong className="text-red-300">irreversível</strong> e
            apagará o perfil, peladas administradas, presenças, votos e estatísticas deste usuário.
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteUserTarget(null)}
              disabled={deletingUser}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase text-zinc-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              disabled={deletingUser}
              onClick={confirmDeleteUser}
              className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold uppercase text-white hover:bg-red-400 disabled:opacity-60"
            >
              {deletingUser ? "Deletando..." : "Deletar definitivamente"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação Reset+Seed do Futebol da Gurizada */}
      <Dialog open={seedConfirmOpen} onOpenChange={(o) => !o && !seeding && setSeedConfirmOpen(false)}>
        <DialogContent className="border-amber-400/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-300">Reset e Seed Histórico</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Esta ação irá <strong className="text-red-300">apagar todos os jogos</strong> da pelada
            "Futebol da Gurizada" e inserir 3 partidas-seed. Os agregados de perfil
            (gols/assistências) <strong>não</strong> serão alterados.
          </p>
          <DialogFooter>
            <button
              onClick={() => setSeedConfirmOpen(false)}
              disabled={seeding}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase text-zinc-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              disabled={seeding}
              onClick={runResetAndSeed}
              className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold uppercase text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
            >
              {seeding ? "Processando..." : "Confirmar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}