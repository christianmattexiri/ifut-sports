import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { clearForcePasswordReset } from "@/lib/admin-users.functions";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export function ForcePasswordResetGate() {
  const [forced, setForced] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const clearFn = useServerFn(clearForcePasswordReset);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      const flag = !!data.user?.user_metadata?.force_password_reset;
      if (mounted) setForced(flag);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const flag = !!session?.user?.user_metadata?.force_password_reset;
      setForced(flag);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!forced) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Mínimo 6 caracteres");
    if (pw !== pw2) return toast.error("As senhas não coincidem");
    setSaving(true);
    try {
      await clearFn({ data: { newPassword: pw } });
      // Refresh local session metadata
      await supabase.auth.refreshSession();
      toast.success("Senha atualizada!");
      setForced(false);
      setPw("");
      setPw2("");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-amber-400/30 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-amber-300">
              Defina sua nova senha
            </h2>
            <p className="text-xs text-zinc-400">
              Sua senha foi resetada pelo administrador. Crie uma nova para continuar.
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <input
            type="password"
            autoFocus
            placeholder="Nova senha (mín. 6)"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
      </form>
    </div>
  );
}