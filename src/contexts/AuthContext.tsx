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

  async function fetchProfile(userId: string): Promise<Profile | null> {
    console.log("[Auth] Buscando profile de", userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = supabase.from("profiles").select("*").eq("id", userId).maybeSingle() as any;
    const result = await withTimeout<{ data: Profile | null; error: unknown }>(
      Promise.resolve(query),
      6000,
      { data: null, error: null },
      "fetchProfile"
    );
    if (result.error) {
      console.error("[Auth] fetchProfile error:", result.error);
      return null;
    }
    console.log("[Auth] Profile carregado:", result.data ? "OK" : "NULL");
    return result.data;
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

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp({ nome, email, password, role, observacaoFuncao }: SignUpPayload) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Falha ao criar usuário." };

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      nome,
      email,
      role,
      observacao_funcao: observacaoFuncao,
      avatar_iniciais: getInitials(nome),
      approved: false,
    });

    if (profileError) {
      console.error("signUp profile insert:", profileError);
      return { error: "Conta criada mas falha ao salvar perfil: " + profileError.message };
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
