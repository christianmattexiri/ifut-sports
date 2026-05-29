import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/futevolei/onboarding")({
  component: OnboardingRedirect,
  head: () => ({ meta: [{ title: "Futevôlei — Onboarding" }] }),
});

/** Legado: redireciona para o modal na Dashboard. */
function OnboardingRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({
      to: "/dashboard",
      search: { openFutevolei: true },
      replace: true,
    });
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
      Abrindo Futevôlei…
    </main>
  );
}
