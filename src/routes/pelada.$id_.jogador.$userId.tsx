import { createFileRoute, useParams } from "@tanstack/react-router";
import { PeladaProfile } from "@/components/PeladaProfile";

export const Route = createFileRoute("/pelada/$id_/jogador/$userId")({
  component: PerfilDoJogadorPage,
  head: () => ({ meta: [{ title: "iFut — Perfil do Jogador" }] }),
});

function PerfilDoJogadorPage() {
  const { id, userId } = useParams({ from: "/pelada/$id_/perfil/$userId" });
  return <PeladaProfile matchId={id} targetUserId={userId} />;
}
