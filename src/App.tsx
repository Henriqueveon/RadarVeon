import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage, { PendingApprovalPage } from "@/pages/AuthPage";
import { NotificationsBell } from "@/components/NotificationsBell";
import { initializeStore, setCurrentAuthor } from "@/lib/store";
import { ROLE_LABELS_SHORT } from "@/lib/auth-types";
import { getRandomQuote } from "@/lib/mission-quotes";

import DashboardPage from "@/pages/DashboardPage";
import TripulantesPage from "@/pages/TripulantesPage";
import GestaoCampanhasPage from "@/pages/GestaoCampanhasPage";
import ReunioesPage from "@/pages/ReunioesPage";
import CriativosPage from "@/pages/CriativosPage";
import JornadaPage from "@/pages/JornadaPage";
import ProfissionaisPage from "@/pages/ProfissionaisPage";

const TABS = [
  { id: "dashboard", label: "Visão Geral" },
  { id: "tripulantes", label: "Tripulantes" },
  { id: "campanhas", label: "Gestão de Campanhas" },
  { id: "reunioes", label: "Reuniões" },
  { id: "criativos", label: "Criativos" },
  { id: "jornada", label: "Jornada" },
  { id: "profissionais", label: "Profissionais" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function UserMenu() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!profile) return null;

  const initials =
    profile.avatar_iniciais ||
    profile.nome
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-[11px] font-medium text-[#9b9b9b] hover:text-white hover:border-white/20 transition-colors"
        aria-label="Menu do usuário"
      >
        {initials}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-64 rounded-lg border border-white/[0.08] bg-[#1f1f1f] p-1">
            <div className="border-b border-white/[0.06] px-3 py-2.5">
              <p className="text-[13px] font-medium text-white">{profile.nome}</p>
              <p className="text-[11px] text-[#9b9b9b]">{ROLE_LABELS_SHORT[profile.role]}</p>
              <p className="mt-0.5 text-[11px] text-[#6f6f6f]">{profile.email}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-[13px] text-[#9b9b9b] hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AppShell() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [jornadaTripulanteId, setJornadaTripulanteId] = useState<string | null>(null);
  const [storeReady, setStoreReady] = useState(false);
  // Escolhe uma quote aleatória no mount (muda a cada refresh)
  const [quote] = useState(() => getRandomQuote());

  useEffect(() => {
    if (!profile?.approved) return;
    setCurrentAuthor(profile.id, profile.nome);
    initializeStore()
      .then(() => setStoreReady(true))
      .catch((err) => {
        console.error("[App] Falha ao inicializar store:", err);
        setStoreReady(true);
      });
  }, [profile?.approved, profile?.id, profile?.nome]);

  if (!storeReady) {
    return (
      <div className="min-h-screen bg-[#191919] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-[#529cca] border-t-transparent" />
          <p className="text-[13px] text-[#9b9b9b]">Carregando dados...</p>
        </div>
      </div>
    );
  }

  function navigateToJornada(tripulanteId?: string) {
    if (tripulanteId) setJornadaTripulanteId(tripulanteId);
    setActiveTab("jornada");
  }

  return (
    <div className="min-h-screen bg-[#191919] text-[#e6e6e6]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#191919]">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid grid-cols-3 min-h-[120px] py-3 items-center">
            <div className="flex items-center justify-start">
              <NotificationsBell />
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src="/icone-logo.svg" alt="Instituto Veon" className="h-20 w-auto" />
              <p className="max-w-[420px] text-center text-[11px] leading-snug text-[#9b9b9b] italic">
                <span className="mr-1.5 not-italic font-semibold text-[#529cca]">
                  {quote.categoria}
                  {quote.numero ? ` ${quote.numero}` : ""}
                </span>
                <span>"{quote.texto}"</span>
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <UserMenu />
            </div>
          </div>
          <nav
            className="-mb-px flex justify-center gap-1 overflow-x-auto"
            aria-label="Navegação principal"
            role="tablist"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative whitespace-nowrap px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                    isActive ? "text-white" : "text-[#9b9b9b] hover:text-[#e6e6e6]"
                  )}
                  aria-selected={isActive}
                  role="tab"
                >
                  {tab.label}
                  {isActive && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-white" />}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 py-8">
        <div key={activeTab} className="animate-in">
          {activeTab === "dashboard" && <DashboardPage onNavigateJornada={navigateToJornada} />}
          {activeTab === "tripulantes" && <TripulantesPage onNavigateJornada={navigateToJornada} />}
          {activeTab === "campanhas" && <GestaoCampanhasPage />}
          {activeTab === "reunioes" && <ReunioesPage />}
          {activeTab === "criativos" && <CriativosPage />}
          {activeTab === "jornada" && (
            <JornadaPage
              preSelectedTripulanteId={jornadaTripulanteId}
              onClearPreSelection={() => setJornadaTripulanteId(null)}
            />
          )}
          {activeTab === "profissionais" && <ProfissionaisPage />}
        </div>
      </main>
    </div>
  );
}

function Gate() {
  const { session, profile, loading } = useAuth();

  // Loading: verificando sessão (< 1s normalmente)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#191919] flex items-center justify-center">
        <div className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-[#529cca] border-t-transparent" />
      </div>
    );
  }

  // Sem sessão → login
  if (!session) return <AuthPage />;

  // Sessão existe + profile do cache → entra imediatamente
  // Se profile ainda não carregou nem do cache (primeira vez) → spinner curto
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#191919] flex items-center justify-center">
        <div className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-[#529cca] border-t-transparent" />
      </div>
    );
  }

  // Profile existe mas não aprovado
  if (!profile.approved) return <PendingApprovalPage />;

  // Tudo OK → app
  return <AppShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Gate />
      </TooltipProvider>
      <Toaster position="top-right" theme="dark" />
    </AuthProvider>
  );
}
