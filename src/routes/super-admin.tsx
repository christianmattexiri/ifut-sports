import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, Trophy, KeyRound, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSuperAdminUsername } from "@/lib/admin";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ProTag } from "@/routes/pelada.$id";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { listAllUsers, resetUserPassword, type AdminUserRow } from "@/lib/admin-users.functions";

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
    const { error } = await supabase
      .from("matches")
      .update({ is_pro: value } as any)
      .eq("id", row.id);
    setSavingId(null);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_pro: value } : r)));
    toast.success(value ? "Pelada ativada como PRO" : "PRO desativado");
  }

  if (allowed === null) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">Carregando...</div>;
  }
  if (!allowed) return null;

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
                      <button
                        onClick={() => { setResetTarget(u); setNewPw(""); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-400/20"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Resetar
                      </button>
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
    </main>
  );
}