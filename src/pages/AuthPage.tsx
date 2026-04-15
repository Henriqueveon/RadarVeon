import { useState, type FormEvent } from "react";
import { Clock, LogOut, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type UserRole } from "@/lib/auth-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<UserRole>("tenente");
  const [observacaoFuncao, setObservacaoFuncao] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    if (mode === "login") {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        toast.error("Email ou senha inválidos.");
      }
    } else {
      if (!nome.trim() || !email.trim() || !password || !role) {
        toast.error("Preencha todos os campos obrigatórios.");
        setSubmitting(false);
        return;
      }
      if (password.length < 8) {
        toast.error("A senha precisa ter pelo menos 8 caracteres.");
        setSubmitting(false);
        return;
      }
      const { error } = await signUp({
        nome: nome.trim(),
        email: email.trim(),
        password,
        role,
        observacaoFuncao: observacaoFuncao.trim(),
      });
      if (error) {
        const lower = error.toLowerCase();
        if (lower.includes("already") || lower.includes("registered") || lower.includes("duplicate")) {
          toast.error("Este email já está cadastrado. Faça login ou use outro email.");
        } else {
          toast.error(error);
        }
      } else {
        setSignupSuccess(true);
      }
    }
    setSubmitting(false);
  }

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-[#191919] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/5 border border-white/10">
            <CheckCircle2 className="h-7 w-7 text-[#4aa971]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-white">Solicitação enviada</h1>
            <p className="mt-2 text-[13px] text-[#9b9b9b]">
              Sua conta foi criada e está aguardando aprovação do Almirante.
              Você receberá acesso assim que ela for aprovada.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSignupSuccess(false);
              setMode("login");
              setNome("");
              setPassword("");
              setObservacaoFuncao("");
            }}
            className="text-[13px] text-[#529cca] hover:text-[#6bb1de]"
          >
            Voltar para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#191919] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/icone-logo.svg" alt="Instituto Veon" className="h-16 w-auto" />
          <p className="text-[11px] uppercase tracking-widest text-[#6f6f6f]">
            RADAR VEON · Instituto Veon
          </p>
        </div>

        <div className="rounded-lg border border-white/[0.08] bg-[#1f1f1f] p-6">
          <h1 className="text-[18px] font-semibold text-white">
            {mode === "login" ? "Entrar" : "Solicitar acesso"}
          </h1>
          <p className="mt-1 text-[13px] text-[#9b9b9b]">
            {mode === "login"
              ? "Acesse sua conta"
              : "Cadastre-se. O Almirante precisa aprovar seu acesso."}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label htmlFor="nome">Nome completo</label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="w-full"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Mínimo 8 caracteres" : "Sua senha"}
                className="w-full"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
            </div>

            {mode === "signup" && (
              <>
                <div className="space-y-2 pt-1">
                  <label>Cargo</label>
                  <div className="grid gap-2">
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                      <label
                        key={r}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded border px-3 py-2.5 text-[13px] transition-colors",
                          role === r
                            ? "border-[#529cca] bg-[#529cca]/5"
                            : "border-white/[0.08] hover:border-white/[0.14]"
                        )}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={r}
                          checked={role === r}
                          onChange={() => setRole(r)}
                          className="mt-0.5 cursor-pointer accent-[#529cca]"
                          style={{ background: "transparent", border: "none", padding: 0 }}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-white">{ROLE_LABELS[r]}</div>
                          <div className="mt-0.5 text-[12px] text-[#9b9b9b]">
                            {ROLE_DESCRIPTIONS[r]}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label htmlFor="obs">
                    Na sua visão, o que você faz no Instituto Veon?
                  </label>
                  <textarea
                    id="obs"
                    value={observacaoFuncao}
                    onChange={(e) => setObservacaoFuncao(e.target.value)}
                    placeholder="Descreva brevemente seu papel, sua visão do trabalho..."
                    rows={3}
                    className="w-full"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded bg-[#529cca] hover:bg-[#6bb1de] disabled:opacity-50 text-white text-[13px] font-medium py-2 transition-colors"
            >
              {submitting
                ? "Enviando..."
                : mode === "login"
                ? "Entrar"
                : "Solicitar acesso"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-[12px] text-[#9b9b9b] hover:text-white transition-colors"
            >
              {mode === "login"
                ? "Primeira vez? Solicitar acesso"
                : "Já tem conta? Entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PendingApprovalPage() {
  const { signOut, profile, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  async function handleCheck() {
    setChecking(true);
    await refreshProfile();
    setTimeout(() => setChecking(false), 600);
  }

  return (
    <div className="min-h-screen bg-[#191919] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/5 border border-white/10">
          <Clock className="h-7 w-7 text-[#d79b3f]" />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold text-white">Aguardando aprovação</h1>
          <p className="mt-2 text-[13px] text-[#9b9b9b]">
            Olá <strong className="text-white">{profile?.nome || "—"}</strong>, sua conta
            foi criada mas ainda precisa ser aprovada pelo Almirante.
          </p>
          <p className="mt-2 text-[13px] text-[#9b9b9b]">
            Assim que for aprovado, esta tela vai atualizar automaticamente.
          </p>
        </div>

        {profile && (
          <div className="rounded-lg border border-white/[0.08] bg-[#1f1f1f] p-4 text-left">
            <p className="text-[11px] uppercase tracking-wider text-[#6f6f6f] mb-2">
              Sua solicitação
            </p>
            <div className="space-y-1.5 text-[13px]">
              <p>
                <span className="text-[#9b9b9b]">Email: </span>
                <span className="text-white">{profile.email}</span>
              </p>
              <p>
                <span className="text-[#9b9b9b]">Cargo: </span>
                <span className="text-white">{ROLE_LABELS[profile.role]}</span>
              </p>
              {profile.observacao_funcao && (
                <p>
                  <span className="text-[#9b9b9b]">Descrição: </span>
                  <span className="text-white">{profile.observacao_funcao}</span>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="inline-flex items-center gap-2 rounded border border-white/10 hover:bg-white/5 text-[#e6e6e6] text-[13px] px-3 py-1.5 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />
            {checking ? "Verificando..." : "Verificar agora"}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded border border-white/10 hover:bg-white/5 text-[#9b9b9b] hover:text-white text-[13px] px-3 py-1.5 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
