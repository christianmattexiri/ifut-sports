import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Mail, Lock, User, AtSign, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ifutCrest from "@/assets/ifut-crest.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "iFut — Organize sua pelada do jeito certo" },
      {
        name: "description",
        content:
          "Entre ou cadastre-se no iFut e organize suas peladas com facilidade.",
      },
    ],
  }),
});

type Mode = "login" | "signup";

function Index() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Se já houver sessão ativa, manda direto pro dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    // Validação básica de senha
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const id = identifier.trim();
        if (!id) {
          toast.error("Informe seu e-mail ou username.");
          return;
        }

        let loginEmail = id;

        // Se NÃO contiver "@", tratamos como username e buscamos o e-mail.
        if (!id.includes("@")) {
          const { data: foundEmail, error: lookupError } = await supabase.rpc(
            "get_email_by_username",
            { uname: id },
          );
          if (lookupError) {
            toast.error("Erro ao buscar usuário. Tente novamente.");
            return;
          }
          if (!foundEmail) {
            toast.error("Usuário não encontrado.");
            return;
          }
          loginEmail = foundEmail as string;
        } else if (!emailRegex.test(id)) {
          toast.error("E-mail inválido.");
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) {
          toast.error(
            error.message === "Invalid login credentials"
              ? "E-mail/usuário ou senha inválidos."
              : error.message,
          );
          return;
        }
        toast.success("Login realizado!");
        navigate({ to: "/dashboard" });
      } else {
        // SIGN UP
        if (!fullName.trim()) {
          toast.error("Informe seu nome completo.");
          return;
        }
        if (!username.trim() || username.includes(" ")) {
          toast.error("Username inválido (sem espaços).");
          return;
        }
        if (!emailRegex.test(email)) {
          toast.error("E-mail inválido.");
          return;
        }

        const redirectUrl =
          typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            // Metadata vai pro raw_user_meta_data e a trigger handle_new_user
            // grava em public.profiles automaticamente.
            data: {
              full_name: fullName.trim(),
              username: username.trim(),
            },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("already")) {
            toast.error("Este e-mail já está cadastrado. Faça login.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (data.session) {
          toast.success("Conta criada! Bem-vindo.");
          navigate({ to: "/dashboard" });
        } else {
          toast.success("Conta criada! Verifique seu e-mail para confirmar.");
          setMode("login");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-zinc-950 font-sans antialiased">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#00FF00]/20 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-200px] right-[-100px] h-[420px] w-[420px] rounded-full bg-[#00FF00]/10 blur-[160px]"
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src={ifutCrest}
              alt="iFut"
              className="mx-auto h-44 w-auto object-contain drop-shadow-[0_0_30px_rgba(0,255,0,0.55)] sm:h-48"
            />
            <p
              className="mt-4 text-2xl tracking-wide text-zinc-100 [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]"
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              Venha organizar sua pelada do jeito certo.
            </p>
          </div>

          {/* Glass card */}
          <div className="relative rounded-2xl border border-white/10 bg-zinc-900/40 p-7 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 after:pointer-events-none after:absolute after:inset-x-6 after:-bottom-px after:h-px after:bg-gradient-to-r after:from-transparent after:via-[#00FF00] after:to-transparent after:shadow-[0_0_20px_2px_rgba(0,255,0,0.6)]">

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <Field
                  icon={<User className="h-5 w-5" />}
                  type="text"
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={setFullName}
                  autoComplete="name"
                  required
                />
                <Field
                  icon={<AtSign className="h-5 w-5" />}
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={setUsername}
                  autoComplete="username"
                  required
                />
                <Field
                  icon={<Mail className="h-5 w-5" />}
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  required
                />
              </>
            )}

            {mode === "login" && (
              <Field
                icon={<Mail className="h-5 w-5" />}
                type="text"
                placeholder="E-mail ou username"
                value={identifier}
                onChange={setIdentifier}
                autoComplete="username"
                required
              />
            )}

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-base text-zinc-100 placeholder:text-zinc-500 transition focus:border-[#00FF00]/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#00FF00]/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 transition hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00FF00]/40"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-zinc-400 transition hover:text-[#00FF00] focus:outline-none"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#00FF00] py-3 text-base font-bold text-black shadow-[0_0_30px_-6px_rgba(0,255,0,0.9)] transition-transform duration-200 hover:scale-105 hover:bg-[#22ff22] focus:outline-none focus:ring-2 focus:ring-[#00FF00]/60 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading
                ? "Aguarde..."
                : mode === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
            </form>

          {/* Footer toggle */}
          <p className="mt-6 text-center text-sm text-zinc-400">
            {mode === "login" ? (
              <>
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-[#00FF00] transition hover:underline focus:outline-none"
                >
                  Crie agora.
                </button>
              </>
            ) : (
              <>
                Já tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-medium text-[#00FF00] transition hover:underline focus:outline-none"
                >
                  Faça login.
                </button>
              </>
            )}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-3 text-base text-zinc-100 placeholder:text-zinc-500 transition focus:border-[#00FF00]/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#00FF00]/40"
      />
    </div>
  );
}
