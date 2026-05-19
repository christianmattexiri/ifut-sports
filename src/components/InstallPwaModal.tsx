import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share, PlusSquare, MoreVertical, MonitorSmartphone, Apple, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InstallPwaModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-zinc-900/95 text-zinc-100 backdrop-blur-xl">
        <DialogTitle className="text-center text-xl font-bold">
          📱 Tenha o iFut na palma da mão
        </DialogTitle>
        <DialogDescription className="text-center text-sm text-zinc-400">
          Instale o app na tela inicial do seu celular e acesse com um toque.
        </DialogDescription>

        <Tabs defaultValue="ios" className="mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-800/60">
            <TabsTrigger value="ios" className="gap-1.5 data-[state=active]:bg-zinc-950 data-[state=active]:text-[#00FF00]">
              <Apple className="h-4 w-4" /> iPhone (iOS)
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-1.5 data-[state=active]:bg-zinc-950 data-[state=active]:text-[#00FF00]">
              <Smartphone className="h-4 w-4" /> Android
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="mt-4 space-y-3">
            <Step n={1} text={<>Abra este site no navegador <strong>Safari</strong>.</>} />
            <Step
              n={2}
              text={
                <>
                  Toque no ícone de Compartilhar{" "}
                  <Share className="mx-1 inline h-4 w-4 text-[#00FF00]" /> na barra inferior.
                </>
              }
            />
            <Step
              n={3}
              text={
                <>
                  Role o menu e selecione <strong>"Adicionar à Tela de Início"</strong>{" "}
                  <PlusSquare className="mx-1 inline h-4 w-4 text-[#00FF00]" />.
                </>
              }
            />
            <Step n={4} text={<>Toque em <strong>"Adicionar"</strong> no canto superior direito.</>} />
          </TabsContent>

          <TabsContent value="android" className="mt-4 space-y-3">
            <Step n={1} text={<>Abra este site no navegador <strong>Chrome</strong>.</>} />
            <Step
              n={2}
              text={
                <>
                  Toque no menu de opções{" "}
                  <MoreVertical className="mx-1 inline h-4 w-4 text-[#00FF00]" /> no canto superior direito.
                </>
              }
            />
            <Step
              n={3}
              text={
                <>
                  Selecione <strong>"Adicionar à tela inicial"</strong> ou{" "}
                  <strong>"Instalar aplicativo"</strong>{" "}
                  <MonitorSmartphone className="mx-1 inline h-4 w-4 text-[#00FF00]" />.
                </>
              }
            />
            <Step n={4} text={<>Confirme tocando em <strong>"Instalar"</strong>.</>} />
          </TabsContent>
        </Tabs>

        <Button
          onClick={() => onOpenChange(false)}
          className="mt-4 w-full bg-[#00FF00] font-bold text-zinc-950 hover:bg-[#00FF00]/90"
        >
          Entendi
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-800/40 p-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00FF00]/15 text-sm font-bold text-[#00FF00]">
        {n}
      </span>
      <p className="pt-0.5 text-sm leading-relaxed text-zinc-200">{text}</p>
    </div>
  );
}