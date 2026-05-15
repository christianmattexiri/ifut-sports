import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PeladaProfile } from "@/components/PeladaProfile";

export const Route = createFileRoute("/pelada/$id_/perfil")({
  component: PerfilPage,
  head: () => ({ meta: [{ title: "iFut — Meu Perfil" }] }),
});

function PerfilPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id_/perfil" });
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      setUid(sess.session.user.id);
    })();
  }, [navigate]);

  if (!uid) return null;
  return <PeladaProfile matchId={id} targetUserId={uid} />;
}
