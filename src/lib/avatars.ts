import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { onProfileUpdate } from "@/lib/profile-sync";

export type AvatarInfo = { avatar_url: string | null; full_name: string | null };

const cache = new Map<string, AvatarInfo>();
const inflight = new Map<string, Promise<void>>();

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

async function fetchOne(id: string) {
  if (cache.has(id)) return;
  if (inflight.has(id)) return inflight.get(id)!;
  const p = (async () => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", id)
      .maybeSingle();
    cache.set(id, {
      avatar_url: data?.avatar_url ?? null,
      full_name: data?.full_name ?? null,
    });
  })();
  inflight.set(id, p);
  try { await p; } finally { inflight.delete(id); }
}

export function useAvatars(ids: string[]): Record<string, AvatarInfo> {
  const [, setTick] = useState(0);
  useEffect(() => {
    let cancel = false;
    const targets = ids.filter((x) => x && isUuid(x) && !cache.has(x));
    if (targets.length) {
      Promise.all(targets.map(fetchOne)).then(() => {
        if (!cancel) setTick((t) => t + 1);
      });
    }
    const off = onProfileUpdate((u) => {
      const cur = cache.get(u.userId) ?? { avatar_url: null, full_name: null };
      cache.set(u.userId, {
        avatar_url: u.avatar_url !== undefined ? u.avatar_url : cur.avatar_url,
        full_name: u.full_name !== undefined ? u.full_name : cur.full_name,
      });
      setTick((t) => t + 1);
    });
    return () => { cancel = true; off(); };
  }, [ids.join(",")]);
  const out: Record<string, AvatarInfo> = {};
  for (const id of ids) if (cache.has(id)) out[id] = cache.get(id)!;
  return out;
}
