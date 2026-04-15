import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/auth-types";
import { getInitials } from "@/lib/auth-types";

interface SignUpPayload {
  nome: string;
  email: string;
  password: string;
  role: UserRole;
  observacaoFuncao: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (payload: SignUpPayload) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Wrapper de timeout — se uma Promise demorar mais que N ms, resolve com fallback
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  return Promise.race([
    p.catch((err) => {
      console.error(`[Auth] ${label} ERRO:`, err);
      return fallback;
    }),
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.warn(`[Auth] ${label} TIMEOUT após ${ms}ms — usando fallback`);
        resolve(fallback);
      }, ms)
    ),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca profile com retry automático: se a primeira tentativa demora ou falha,
  // tenta mais uma vez antes de desistir. Timeout maior (12s) pra tolerar conexões lentas.
  async function fetchProfile(userId: string): Promise<Profile | null> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`[Auth] fetchProfile tentativa ${attempt}/2 — user ${userId}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = supabase.from("profiles").select("*").eq("id", userId).maybeSingle() as any;
      const result = await withTimeout<{ data: Profile | null; error: unknown }>(
        Promise.resolve(query),
        12000,
        { data: null, error: null },
        `fetchProfile#${attempt}`
      );
      if (result.error) {
        console.error(`[Auth] fetchProfile erro (tentativa ${attempt}):`, result.error);
        if (attempt < 2) continue;
        return null;
      }
      if (result.data) {
        console.log("[Auth] Profile carregado OK");
        return result.data;
      }
      // data null e sem erro: perfil não existe mesmo — não adianta tentar de novo
      if (attempt === 1 && !result.error) {
        // Pode ser timeout silencioso — tenta mais uma
        console.log("[Auth] Profile veio null, retry...");
        continue;
      }
    }
    return null;
  }

  async function refreshProfile() {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }

  useEffect(() => {
    let mounted = true;
    console.log("[Auth] Inicializando...");

    withTimeout(
      supabase.auth.getSession(),
      6000,
      { data: { session: null }, error: null },
      "getSession"
    )
      .then(async ({ data: { session: s } }) => {
        if (!mounted) return;
        console.log("[Auth] getSession resolveu. Session:", s ? "ativa" : "null");
        setSession(s);
        setUser(s?.user ?? null);

        // CRÍTICO: libera o loading ANTES de buscar profile
        // Se profile hangar, tela de login/pending aparece mesmo assim
        setLoading(false);

        if (s?.user) {
          const p = await fetchProfile(s.user.id);
          if (mounted) setProfile(p);
        }
      })
      .catch((err) => {
        console.error("[Auth] getSession erro fatal:", err);
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      console.log("[Auth] onAuthStateChange:", event);
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);

      if (s?.user) {
        const p = await fetchProfile(s.user.id);
        if (mounted) setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Realtime: escuta mudanças no próprio perfil (approval pelo Almirante)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as Profile;
          setProfile(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Revalida profile quando a tab volta de background (evita estado travado)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && user && !profile) {
        console.log("[Auth] Tab voltou — refazendo fetchProfile");
        refreshProfile();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.id]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp({ nome, email, password, role, observacaoFuncao }: SignUpPayload) {
    // v7: sem trigger no Supabase. Signup em auth.users é isolado e rápido.
    // O profile é criado logo após via RPC ensure_profile.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          role,
          observacao_funcao: observacaoFuncao,
          avatar_iniciais: getInitials(nome),
        },
      },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Falha ao criar usuário." };

    // Aguarda a session estabilizar antes de chamar RPC (precisa de auth.uid)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Fallback robusto: tenta criar profile via RPC (função ensure_profile).
    // Essa função roda como SECURITY DEFINER e é idempotente.
    // Se o trigger já criou, não faz nada. Se não criou, cria agora.
    // Usamos RPC em vez de insert direto pra evitar issues de RLS/session.
    try {
      const { error: rpcError } = await supabase.rpc("ensure_profile", {
        p_nome: nome,
        p_role: role,
        p_obs: observacaoFuncao,
        p_avatar: getInitials(nome),
      });
      if (rpcError) {
        console.warn("[Auth] ensure_profile RPC falhou, tentando insert direto:", rpcError);
        // Segundo fallback: insert direto (caso RPC não exista ainda no Supabase)
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();
        if (!existingProfile) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            nome,
            email,
            role,
            observacao_funcao: observacaoFuncao,
            avatar_iniciais: getInitials(nome),
            approved: false,
          });
        }
      }
    } catch (err) {
      console.error("[Auth] Falha em fallback de profile:", err);
      // Ainda retorna sucesso — user existe em auth.users, Almirante pode criar profile manualmente
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
