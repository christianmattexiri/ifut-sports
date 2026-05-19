import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Menu, LogOut, UserCircle2, Home, Mail, ShieldCheck,
  ClipboardList, Trophy, History as HistoryIcon, BarChart3, UserCog, ArrowLeft, User as UserIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { peladaMatchQuery, viewerQuery } from "@/lib/pelada-queries";
import { loadAdminSettings } from "@/routes/pelada.$id_.admin";
import ifutCrest from "@/assets/ifut-crest.png";
import { toast } from "sonner";

const SUPER_ADMIN_USERNAME = "christianmatte";

/**
 * Global fixed topbar visible on every authenticated screen.
 * - Mobile: hamburger "MENU" opens a context-aware Sheet drawer.
 * - Center: iFut logo (links to /dashboard).
 * - Right: avatar dropdown (Meu perfil / Sair).
 */
export function GlobalTopbar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: viewer } = useQuery(viewerQuery());
  const [open, setOpen] = useState(false);

  const peladaId = useMemo(() => {
    const m = pathname.match(/^\/pelada\/([^/]+)/);
    return m ? m[1] : null;
  }, [pathname]);

  // Hide on auth/landing pages.
  const hide = pathname === "/" || pathname.startsWith("/auth");
  if (hide) return null;
  if (!viewer) return null;

  const username = viewer.username ?? "jogador";
  const fullName = viewer.full_name?.trim() || username;
  const isSuperAdmin = (username || "").toLowerCase() === SUPER_ADMIN_USERNAME;

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Até a próxima!");
    navigate({ to: "/" });
  }

  function handleProfile() {
    if (peladaId) {
      navigate({ to: "/pelada/$id/perfil", params: { id: peladaId } });
    } else {
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 border-b border-white/10 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="flex h-full items-center justify-between px-3 md:px-5">
        {/* LEFT: hamburger (mobile) */}
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-200 transition hover:bg-white/10 md:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-4 w-4" />
                MENU
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[280px] border-r border-white/10 bg-zinc-950 p-0 text-zinc-100"
            >
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <MobileMenuContent
                peladaId={peladaId}
                isSuperAdmin={isSuperAdmin}
                viewerId={viewer.id}
                onClose={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
          {/* desktop spacer to keep logo centered visually with the avatar */}
          <div className="hidden h-9 w-9 md:block" aria-hidden />
        </div>

        {/* CENTER: logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src={ifutCrest}
            alt="iFut"
            className="h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(0,255,0,0.45)]"
          />
          <span className="hidden text-sm font-bold tracking-widest text-white sm:inline">
            iFut
          </span>
        </Link>

        {/* RIGHT: avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#00FF00]/40 bg-zinc-900 text-zinc-200 transition hover:border-[#00FF00] hover:text-[#00FF00]"
              aria-label="Abrir menu do usuário"
            >
              <UserIcon className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 border border-white/10 bg-zinc-950 text-zinc-100"
          >
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-semibold">{fullName}</p>
              <p className="truncate text-xs text-zinc-400">@{username}</p>
            </div>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={handleProfile}
              className="cursor-pointer focus:bg-white/10 focus:text-zinc-100"
            >
              <UserCircle2 className="mr-2 h-4 w-4" />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-red-300 focus:bg-red-500/20 focus:text-red-200"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function MobileMenuContent({
  peladaId,
  isSuperAdmin,
  viewerId,
  onClose,
}: {
  peladaId: string | null;
  isSuperAdmin: boolean;
  viewerId: string;
  onClose: () => void;
}) {
  const { data: match } = useQuery(peladaMatchQuery(peladaId ?? undefined));
  const [modulesRankings, setModulesRankings] = useState(true);
  useEffect(() => {
    if (!peladaId) return;
    const s = loadAdminSettings(peladaId);
    setModulesRankings(!!s.modules.rankings);
  }, [peladaId]);

  const isPeladaAdmin = !!match && match.admin_id === viewerId;

  if (peladaId) {
    return (
      <div className="flex h-full flex-col px-4 pt-6 pb-6">
        <Link
          to="/dashboard"
          onClick={onClose}
          className="mb-5 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 transition hover:text-[var(--pelada-accent)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao Início do App
        </Link>

        <nav className="space-y-1.5">
          <DrawerLink onClick={onClose} to="/pelada/$id" params={{ id: peladaId }} icon={<Home className="h-4 w-4" />} label="Início" />
          <DrawerLink onClick={onClose} to="/pelada/$id/lista" params={{ id: peladaId }} icon={<ClipboardList className="h-4 w-4" />} label="Lista de Presença" />
          <DrawerLink onClick={onClose} to="/pelada/$id/partida" params={{ id: peladaId }} icon={<Trophy className="h-4 w-4" />} label="Partida" />
          <DrawerLink onClick={onClose} to="/pelada/$id/historico" params={{ id: peladaId }} icon={<HistoryIcon className="h-4 w-4" />} label="Histórico" />
          {modulesRankings && (
            <DrawerLink onClick={onClose} to="/pelada/$id/rankings" params={{ id: peladaId }} icon={<BarChart3 className="h-4 w-4" />} label="Rankings" />
          )}
          <DrawerLink onClick={onClose} to="/pelada/$id/perfil" params={{ id: peladaId }} icon={<UserCircle2 className="h-4 w-4" />} label="Meu perfil na pelada" />
        </nav>

        <div className="mt-auto space-y-1.5 pt-6">
          {isPeladaAdmin && (
            <DrawerLink onClick={onClose} to="/pelada/$id/usuarios" params={{ id: peladaId }} icon={<UserCog className="h-4 w-4" />} label="Gerenciamento de Usuários" />
          )}
          {isPeladaAdmin && (
            <Link
              to="/pelada/$id/admin"
              params={{ id: peladaId }}
              onClick={onClose}
              className="flex w-full items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"
            >
              <ShieldCheck className="h-4 w-4" />
              Administrador
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-4 pt-6 pb-6">
      <p className="mb-4 px-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
        Menu
      </p>
      <nav className="space-y-1.5">
        <DrawerLink onClick={onClose} to="/dashboard" icon={<Home className="h-4 w-4" />} label="Início" />
        <DrawerLink onClick={onClose} to="/convites" icon={<Mail className="h-4 w-4" />} label="Convites" />
        {isSuperAdmin && (
          <DrawerLink onClick={onClose} to="/super-admin" icon={<ShieldCheck className="h-4 w-4" />} label="Super Admin" />
        )}
      </nav>
    </div>
  );
}

function DrawerLink({
  to, params, icon, label, onClick,
}: {
  to: string;
  params?: Record<string, string>;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to as any}
      params={params as any}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/10 hover:bg-white/10"
    >
      {icon}
      {label}
    </Link>
  );
}