import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Home, ClipboardList, History as HistoryIcon, BarChart3,
  UserCircle2, ShieldCheck, Trophy, UserCog, Upload, Trash2, Save,
  BarChart, Headphones, DollarSign, Vote, Music,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSuperAdminUsername } from "@/lib/admin";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/pelada/$id_/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "iFut — Administrador" }] }),
});

const PALETTE = [
  { name: "Verde Néon", value: "#00FF00" },
  { name: "Azul Ciano", value: "#06b6d4" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Amarelo", value: "#facc15" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Laranja", value: "#f97316" },
  { name: "Cyan Brilhante", value: "#22d3ee" },
];

type Match = {
  id: string; name: string; day_of_week: string | null; match_time: string | null;
  location: string | null; logo_url: string | null; admin_id?: string | null;
};

type Modules = {
  rankings: boolean; somMvp: boolean; financas: boolean; votacoes: boolean; musica: boolean;
};
type VoteModes = { mvp: boolean; pereba: boolean; apitto: boolean };
type AdminSettings = { accent: string; modules: Modules; voteModes: VoteModes };

const DEFAULT_SETTINGS: AdminSettings = {
  accent: "#00FF00",
  modules: { rankings: true, somMvp: true, financas: true, votacoes: true, musica: false },
  voteModes: { mvp: true, pereba: false, apitto: false },
};

export const adminSettingsKey = (id: string) => `pelada:${id}:adminSettings`;

export function loadAdminSettings(id: string): AdminSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(adminSettingsKey(id));
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_SETTINGS; }
}

function AdminPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/pelada/$id_/admin" });
  const [match, setMatch] = useState<Match | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [loc, setLoc] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setSettings(loadAdminSettings(id));
  }, [id]);

  // Live theme preview via CSS var (scoped to this pelada via localStorage key read on dashboard).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--pelada-accent", settings.accent);
  }, [settings.accent]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return navigate({ to: "/" });
      const uid = sess.session.user.id;
      const [{ data: m }, { data: prof }] = await Promise.all([
        supabase.from("matches")
          .select("id, name, day_of_week, match_time, location, logo_url, admin_id")
          .eq("id", id).maybeSingle(),
        supabase.from("profiles").select("username").eq("id", uid).maybeSingle(),
      ]);
      const mm = m as Match | null;
      const owner = (mm?.admin_id ?? null) === uid;
      const allowed = owner || isSuperAdminUsername(prof?.username);
      if (!allowed) {
        toast.error("Acesso restrito");
        return navigate({ to: "/pelada/$id", params: { id } });
      }
      setIsAdmin(true);
      setMatch(mm);
      setName(mm?.name ?? "");
      setDay(mm?.day_of_week ?? "");
      setTime(mm?.match_time ?? "");
      setLoc(mm?.location ?? "");
      setLogo(mm?.logo_url ?? null);
    })();
  }, [id, navigate]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `match-logos/${id}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setLogo(pub.publicUrl);
      toast.success("Logo carregado");
    } catch (err) {
      toast.error("Erro ao carregar logo");
      console.error(err);
    } finally { setUploading(false); }
  }

  async function handleSave() {
    const { error } = await supabase
      .from("matches")
      .update({ name, day_of_week: day, match_time: time, location: loc, logo_url: logo })
      .eq("id", id);
    if (error) { toast.error("Erro ao salvar"); return; }
    if (typeof window !== "undefined") {
      localStorage.setItem(adminSettingsKey(id), JSON.stringify(settings));
    }
    toast.success("Configurações salvas!");
  }

  function setVoteMode(k: keyof VoteModes, v: boolean) {
    setSettings((s) => {
      let voteModes = { ...s.voteModes, [k]: v };
      // Apitto exclusive
      if (k === "apitto" && v) voteModes = { mvp: false, pereba: false, apitto: true };
      else if ((k === "mvp" || k === "pereba") && v) voteModes.apitto = false;
      return { ...s, voteModes };
    });
  }

  if (!isAdmin) return null;

  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col md:flex-row">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-white/5 bg-zinc-950/80 px-5 py-7 md:flex">
          <button
            onClick={() => navigate({ to: "/pelada/$id", params: { id } })}
            className="mb-6 inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-[#00FF00]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </button>
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-[#00FF00]/40 bg-zinc-900">
              {logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : <Trophy className="h-5 w-5 text-[#00FF00]" />}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Pelada</p>
              <p className="text-sm font-bold">{match?.name ?? "—"}</p>
            </div>
          </div>
          <nav className="space-y-1.5">
            <Link to="/pelada/$id" params={{ id }}><NavItem icon={<Home className="h-4 w-4" />} label="Início" /></Link>
            <Link to="/pelada/$id/lista" params={{ id }}><NavItem icon={<ClipboardList className="h-4 w-4" />} label="Lista de Presença" /></Link>
            <Link to="/pelada/$id/partida" params={{ id }}><NavItem icon={<Trophy className="h-4 w-4" />} label="Partida" gold /></Link>
            <Link to="/pelada/$id/historico" params={{ id }}><NavItem icon={<HistoryIcon className="h-4 w-4" />} label="Histórico" /></Link>
            <Link to="/pelada/$id/rankings" params={{ id }}><NavItem icon={<BarChart3 className="h-4 w-4" />} label="Rankings" /></Link>
            <Link to="/pelada/$id/perfil" params={{ id }}><NavItem icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil" /></Link>
          </nav>
          <div className="mt-auto pt-6">
            <Link to="/pelada/$id/usuarios" params={{ id }} className="mb-2 block">
              <NavItem icon={<UserCog className="h-4 w-4" />} label="Gerenciamento de Usuários" />
            </Link>
            <NavItem icon={<ShieldCheck className="h-4 w-4" />} label="Administrador" amberActive />
          </div>
        </aside>

        <section className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-amber-300 md:text-4xl">Administrador</h1>
                <p className="mt-1 text-sm text-zinc-400">Configurações da pelada — visíveis apenas para admins.</p>
              </div>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl border border-[#00FF00]/40 bg-[#00FF00]/10 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-[#00FF00] hover:bg-[#00FF00]/20"
              >
                <Save className="h-4 w-4" /> Salvar
              </button>
            </div>

            {/* Identidade */}
            <Section title="Identidade" subtitle="Nome, logo e cor do grupo">
              <div className="space-y-4">
                <div>
                  <Label>Logo da pelada</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                      {logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : <Trophy className="h-6 w-6 text-zinc-500" />}
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800">
                      <Upload className="h-3.5 w-3.5" /> {uploading ? "Carregando..." : "Trocar logo"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                    </label>
                    {logo && (
                      <button onClick={() => setLogo(null)} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-red-400">
                        <Trash2 className="h-3 w-3" /> Remover
                      </button>
                    )}
                  </div>
                </div>

                <Field label="Nome da pelada">
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-900 border-white/10" />
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Dia e Hora">
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={day} onChange={(e) => setDay(e.target.value)} placeholder="Domingo" className="bg-zinc-900 border-white/10" />
                      <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="19:00" className="bg-zinc-900 border-white/10" />
                    </div>
                  </Field>
                  <Field label="Quadra/Local">
                    <Input value={loc} onChange={(e) => setLoc(e.target.value)} className="bg-zinc-900 border-white/10" />
                  </Field>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label>Cor de destaque</Label>
                    <ProBadge />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {PALETTE.map((c) => {
                      const active = settings.accent === c.value;
                      return (
                        <button
                          key={c.value}
                          onClick={() => setSettings((s) => ({ ...s, accent: c.value }))}
                          aria-label={c.name}
                          className={`h-9 w-9 rounded-full border-2 transition ${active ? "scale-110 border-white shadow-[0_0_15px_currentColor]" : "border-white/20"}`}
                          style={{ background: c.value, color: c.value }}
                        />
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">Pré-visualização ao vivo aplicada nesta tela. Salve para tornar permanente.</p>
                </div>
              </div>
            </Section>

            {/* Módulos */}
            <Section title="Módulos" subtitle="Ative funcionalidades extras para sua pelada.">
              <div className="space-y-2">
                <ModuleRow icon={<BarChart className="h-4 w-4" />} title="Rankings" desc="Ranking de jogadores e estatísticas"
                  value={settings.modules.rankings} onChange={(v) => setSettings((s) => ({ ...s, modules: { ...s.modules, rankings: v } }))} />
                <ModuleRow icon={<Headphones className="h-4 w-4" />} title="Som do MVP" desc="Player do YouTube na home com música do craque" pro
                  value={settings.modules.somMvp} onChange={(v) => setSettings((s) => ({ ...s, modules: { ...s.modules, somMvp: v } }))} />
                <ModuleRow icon={<DollarSign className="h-4 w-4" />} title="Finanças" desc="Caixinha do grupo: saldo atual e atualizações" pro
                  value={settings.modules.financas} onChange={(v) => setSettings((s) => ({ ...s, modules: { ...s.modules, financas: v } }))} />
                <ModuleRow icon={<Vote className="h-4 w-4" />} title="Votações" desc="Eleger craque/pereba do dia"
                  value={settings.modules.votacoes} onChange={(v) => setSettings((s) => ({ ...s, modules: { ...s.modules, votacoes: v } }))} />
                <ModuleRow icon={<Music className="h-4 w-4" />} title="Música" desc="Música do site, escolhida pelo adm." pro
                  value={settings.modules.musica} onChange={(v) => setSettings((s) => ({ ...s, modules: { ...s.modules, musica: v } }))} />
              </div>
            </Section>

            {/* Modos de votação */}
            <Section title="Modos de votação" subtitle='"Estilo Apitto" é exclusivo. MVP e Pereba podem ser usados juntos.'>
              <div className="space-y-3">
                <CheckRow label="Melhor Jogador (MVP)" checked={settings.voteModes.mvp} onChange={(v) => setVoteMode("mvp", v)} />
                <CheckRow label="Pereba da Rodada" checked={settings.voteModes.pereba} onChange={(v) => setVoteMode("pereba", v)} />
                <CheckRow label="Estilo Apitto (notas 0,5–5)" checked={settings.voteModes.apitto} onChange={(v) => setVoteMode("apitto", v)} />
              </div>
            </Section>

            <button
              onClick={handleSave}
              className="w-full rounded-xl border border-[#00FF00]/40 bg-[#00FF00]/10 px-5 py-3 text-sm font-bold uppercase tracking-wider text-[#00FF00] hover:bg-[#00FF00]/20"
            >
              Salvar Configurações
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-xl">
      <h2 className="text-base font-bold text-zinc-100">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">{children}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ProBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/40">
      ⭐ PRO
    </span>
  );
}

function ModuleRow({
  icon, title, desc, pro, value, onChange,
}: { icon: React.ReactNode; title: string; desc: string; pro?: boolean; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-950/50 px-3 py-3">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-zinc-100">{title}</p>
          {pro && <ProBadge />}
        </div>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} className="data-[state=checked]:bg-emerald-500" />
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="border-white/20 data-[state=checked]:bg-[#00FF00] data-[state=checked]:text-zinc-950" />
      <span>{label}</span>
    </label>
  );
}

function NavItem({
  icon, label, active, gold, amberActive,
}: { icon: React.ReactNode; label: string; active?: boolean; gold?: boolean; amberActive?: boolean }) {
  return (
    <div
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        amberActive
          ? "border border-amber-400/30 bg-amber-400/5 text-amber-300"
          : active
          ? "bg-[#00FF00]/10 text-[#00FF00]"
          : gold
          ? "text-yellow-500 hover:bg-yellow-500/10"
          : "text-zinc-300 hover:bg-white/5"
      }`}
    >
      {icon}<span>{label}</span>
    </div>
  );
}
