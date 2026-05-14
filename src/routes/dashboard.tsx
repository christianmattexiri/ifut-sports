import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: "iFut — Dashboard" }],
  }),
});

function Dashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/" });
        return;
      }
      setEmail(data.user.email ?? null);
    });
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Bem-vindo ao iFut! ⚽</h1>
        {email && <p className="text-zinc-400">Logado como {email}</p>}
        <button
          onClick={handleSignOut}
          className="rounded-xl bg-[#00FF00] px-5 py-2 font-bold text-black transition hover:scale-105"
        >
          Sair
        </button>
      </div>
    </main>
  );
}