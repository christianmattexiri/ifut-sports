import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Modules = {
  rankings: boolean; somMvp: boolean; financas: boolean; votacoes: boolean; musica: boolean;
};
export type VoteModes = { mvp: boolean; pereba: boolean; apitto: boolean };
export type PodiumDisplay = {
  matador: boolean; maestro: boolean; mvp: boolean; pereba: boolean; apitto: boolean;
};
export type AdminSettings = {
  accent: string;
  modules: Modules;
  voteModes: VoteModes;
  podium: PodiumDisplay;
};

export const DEFAULT_SETTINGS: AdminSettings = {
  accent: "#00FF00",
  modules: { rankings: true, somMvp: false, financas: true, votacoes: true, musica: false },
  voteModes: { mvp: true, pereba: false, apitto: false },
  podium: { matador: true, maestro: true, mvp: true, pereba: true, apitto: true },
};

export function mergeAdminSettings(raw: unknown): AdminSettings {
  const parsed = (raw && typeof raw === "object" ? raw : {}) as Partial<AdminSettings>;
  return {
    accent: parsed.accent ?? DEFAULT_SETTINGS.accent,
    modules: { ...DEFAULT_SETTINGS.modules, ...(parsed.modules ?? {}) },
    voteModes: { ...DEFAULT_SETTINGS.voteModes, ...(parsed.voteModes ?? {}) },
    podium: { ...DEFAULT_SETTINGS.podium, ...(parsed.podium ?? {}) },
  };
}

export const peladaSettingsQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ["pelada-settings", id],
    enabled: !!id,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<AdminSettings> => {
      const { data } = await supabase
        .from("matches")
        .select("settings")
        .eq("id", id!)
        .maybeSingle();
      return mergeAdminSettings((data as { settings?: unknown } | null)?.settings);
    },
  });

export function usePeladaSettings(id: string | undefined): AdminSettings {
  const { data } = useQuery(peladaSettingsQuery(id));
  return data ?? DEFAULT_SETTINGS;
}

export function useUpdatePeladaSettings(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: AdminSettings) => {
      const { error } = await supabase
        .from("matches")
        // @ts-expect-error - settings column added via migration; types regen pending
        .update({ settings })
        .eq("id", id);
      if (error) throw error;
      return settings;
    },
    onSuccess: (settings) => {
      qc.setQueryData(["pelada-settings", id], settings);
    },
  });
}