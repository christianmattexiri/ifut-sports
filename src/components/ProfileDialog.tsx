import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export type ProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  fallbackAvatar: string;
  onUpdated: (data: { full_name?: string; avatar_url?: string }) => void;
};

export function ProfileDialog({
  open,
  onOpenChange,
  userId,
  fullName,
  username,
  avatarUrl,
  fallbackAvatar,
  onUpdated,
}: ProfileDialogProps) {
  const [name, setName] = useState(fullName);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const t = toast.loading("Enviando foto...");
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (dbErr) throw dbErr;
      setCurrentAvatar(url);
      onUpdated({ avatar_url: url });
      toast.success("Foto atualizada!", { id: t });
    } catch (err) {
      toast.error((err as Error).message || "Falha no upload", { id: t });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (name.trim() && name !== fullName) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: name.trim() })
          .eq("id", userId);
        if (error) throw error;
        onUpdated({ full_name: name.trim() });
      }
      if (password) {
        if (password.length < 6) {
          toast.error("Senha deve ter no mínimo 6 caracteres");
          setSaving(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
      }
      toast.success("Alterações salvas!");
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = currentAvatar || fallbackAvatar;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-900/80 text-zinc-100 backdrop-blur-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Meu perfil</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Atualize sua foto, nome e senha.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#00FF00]/40 bg-zinc-800"
              aria-label="Trocar foto"
            >
              <img src={displayAvatar} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-zinc-300">Nome de exibição</Label>
            <Input
              id="fullName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-white/10 bg-white/5 text-zinc-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-zinc-300">Username</Label>
            <Input
              id="username"
              value={username}
              disabled
              className="border-white/10 bg-white/5 text-zinc-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-300">Nova senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para manter"
              className="border-white/10 bg-white/5 text-zinc-100"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF00] px-4 py-3 text-sm font-bold text-black shadow-[0_0_30px_-6px_rgba(0,255,0,0.8)] transition hover:bg-[#22ff22] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alterações
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}