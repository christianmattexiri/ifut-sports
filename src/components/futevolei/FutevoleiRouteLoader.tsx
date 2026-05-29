import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function FutevoleiRouteLoader({
  variant = "page",
  className,
}: {
  variant?: "page" | "inline" | "modal";
  className?: string;
}) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" strokeWidth={1.5} />
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <div className={cn("flex min-h-[280px] flex-col items-center justify-center gap-4", className)}>
        <Loader2 className="h-9 w-9 animate-spin text-zinc-500" strokeWidth={1.5} />
        <p className="text-sm text-zinc-500">Verificando seu perfil…</p>
      </div>
    );
  }

  return (
    <main
      className={cn(
        "flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 pt-14",
        className,
      )}
    >
      <Loader2 className="h-10 w-10 animate-spin text-zinc-600" strokeWidth={1.5} />
      <p className="mt-4 text-sm text-zinc-500">Carregando…</p>
      <div className="mt-8 w-full max-w-md space-y-3">
        <Skeleton className="h-10 w-full bg-zinc-800/80" />
        <Skeleton className="h-10 w-full bg-zinc-800/60" />
        <Skeleton className="h-10 w-3/4 bg-zinc-800/40" />
      </div>
    </main>
  );
}
