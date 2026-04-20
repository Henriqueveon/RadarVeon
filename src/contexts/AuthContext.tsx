import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/auth-types";
import { getInitials } from "@/lib/auth-types";

// ============================================================
// Estratégia: Cache do profile no localStorage ("stale-while-revalidate")
//
// 1. Abre app → lê profile do cache → entra IMEDIATAMENTE (0ms)
// 2. Em background, revalida com Supabase
// 3. Se Supabase responde → atualiza cache + state
// 4. Se falha → mantém cache → app funciona normalmente
//
// Resultado: ZERO spinners de "carregando perfil" após o primeiro login.
// ============================================================

const PROFILE_CACHE_KEY = "rv_profile";

function getCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // cache corrompido
  }
  return null;
}

function setCachedProfile(p: Profile | null) {
  if (p) {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
  } else {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  }
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(getCachedProfile);
  const [loading, setLoading] = useState(true);

  function updateProfile(p: Profile | null) {
    setProfile(p);
    setCachedProfile(p);
  }

  async function fetchProfile(userId: string): Promise<Profile | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle() as any);
      if (error) {
        console.error("[Auth] fetchProfile erro:", error);
        return null;
      }
      return data as Profile | null;
    } catch (err) {
      console.error("[Auth] fetchProfile exception:", err);
      return null;
    }
  }

  async function refreshProfile() {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) updateProfile(p);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data: { session: s } }) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);

        if (s?.user) {
          // Se tem cache, entra imediatamente. Revalida em background.
          const cached = getCachedProfile();
          if (cached && cached.id === s.user.id) {
            setProfile(cached);
          }
          // Busca fresh do Supabase (em background, sem bloquear)
          const fresh = await fetchProfile(s.user.id);
          if (mounted && fresh) {
            updateProfile(fresh);
          }
        } else {
          // Sem sessão → limpa cache
          updateProfile(null);
        }
      })
      .catch((err) => {
        console.error("[Auth] getSession erro:", err);
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);

      if (s?.user) {
        const p = await fetchProfile(s.user.id);
        if (mounted && p) updateProfile(p);
      } else {
        updateProfile(null);
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
          updateProfile(updated);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Revalida quando tab volta de background
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && user) {
        refreshProfile();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp({ nome, email, password, role, observacaoFuncao }: SignUpPayload) {
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

    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const { error: rpcError } = await supabase.rpc("ensure_profile", {
        p_nome: nome,
        p_role: role,
        p_obs: observacaoFuncao,
        p_avatar: getInitials(nome),
      });
      if (rpcError) {
        console.warn("[Auth] ensure_profile falhou, tentando insert:", rpcError);
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
    } catch (err) {
      console.error("[Auth] Fallback de profile:", err);
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    updateProfile(null);
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
