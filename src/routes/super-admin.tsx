import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSuperAdminUsername } from "@/lib/admin";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ProTag } from "@/routes/pelada.$id";

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
    })();
  }, [navigate]);

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
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
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

        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/40 p-4 backdrop-blur-xl">
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
      </div>
    </main>
  );
}