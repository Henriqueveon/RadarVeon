import { useState, useMemo } from "react";
import {
  Handshake,
  DollarSign,
  GraduationCap,
  Palette,
  Megaphone,
  Settings2,
  FileText,
  Calendar,
  Filter,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/useStore";
import { getActiveTripulantes, computeKPIs } from "@/lib/store";
import { formatCurrency, formatVariation } from "@/lib/mock-data";
import type { KPIData } from "@/lib/mock-data";

interface PeriodPreset {
  label: string;
  value: string;
  getDates: () => { startDate: string; endDate: string };
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(diff);
  return monday;
}

const PERIOD_PRESETS: PeriodPreset[] = [
  {
    label: "Esta semana",
    value: "this_week",
    getDates: () => {
      const now = new Date();
      const monday = getMonday(now);
      return { startDate: toISODate(monday), endDate: toISODate(now) };
    },
  },
  {
    label: "Semana passada",
    value: "last_week",
    getDates: () => {
      const now = new Date();
      const thisMonday = getMonday(now);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(lastSunday.getDate() - 1);
      return { startDate: toISODate(lastMonday), endDate: toISODate(lastSunday) };
    },
  },
  {
    label: "Este mês",
    value: "this_month",
    getDates: () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: toISODate(firstDay), endDate: toISODate(now) };
    },
  },
  {
    label: "Últimos 30 dias",
    value: "last_30_days",
    getDates: () => {
      const now = new Date();
      const past = new Date(now.getTime() - 30 * 86400000);
      return { startDate: toISODate(past), endDate: toISODate(now) };
    },
  },
];

interface KPICardConfig {
  key: keyof KPIData;
  label: string;
  icon: React.ElementType;
  isCurrency: boolean;
}

const KPI_CARDS: KPICardConfig[] = [
  { key: "reunioes", label: "Reuniões realizadas", icon: Handshake, isCurrency: false },
  { key: "vendas", label: "Vendas declaradas R$", icon: DollarSign, isCurrency: true },
  { key: "oficinas", label: "Oficinas realizadas", icon: GraduationCap, isCurrency: false },
  { key: "criativos", label: "Criativos produzidos", icon: Palette, isCurrency: false },
  { key: "campanhasNovas", label: "Campanhas novas", icon: Megaphone, isCurrency: false },
  { key: "otimizacoes", label: "Otimizações executadas", icon: Settings2, isCurrency: false },
];

interface DashboardPageProps {
  onNavigateJornada?: (tripulanteId?: string) => void;
}

export default function DashboardPage({ onNavigateJornada }: DashboardPageProps) {
  useStore();

  const [periodValue, setPeriodValue] = useState("this_week");
  const [selectedTripulante, setSelectedTripulante] = useState<string>("");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [tripulanteOpen, setTripulanteOpen] = useState(false);

  const activeTripulantes = getActiveTripulantes();

  const selectedPreset = PERIOD_PRESETS.find((p) => p.value === periodValue) ?? PERIOD_PRESETS[0];
  const { startDate, endDate } = useMemo(() => selectedPreset.getDates(), [selectedPreset]);

  const kpiData = useMemo(
    () => computeKPIs(selectedTripulante || undefined, startDate, endDate),
    [selectedTripulante, startDate, endDate],
  );

  const allZero = useMemo(() => {
    const { atual } = kpiData;
    return Object.values(atual).every((v) => v === 0);
  }, [kpiData]);

  const chartData = useMemo(() => {
    const { atual, anterior } = kpiData;
    return KPI_CARDS.map((card) => ({
      name: card.label,
      Atual: atual[card.key],
      Anterior: anterior[card.key],
    }));
  }, [kpiData]);

  const selectedPeriodLabel = selectedPreset.label;

  const selectedTripulanteLabel = selectedTripulante
    ? activeTripulantes.find((t) => t.id === selectedTripulante)?.name ?? "Visão Geral"
    : "Visão Geral";

  function closeAllDropdowns() {
    setPeriodOpen(false);
    setTripulanteOpen(false);
  }

  function handleKeyDown(
    event: React.KeyboardEvent,
    action: () => void,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
    if (event.key === "Escape") {
      closeAllDropdowns();
    }
  }

  function handleBackdropClick() {
    closeAllDropdowns();
  }

  return (
    <div className="space-y-6">
      {/* Backdrop to close dropdowns on outside click */}
      {(periodOpen || tripulanteOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={handleBackdropClick}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeAllDropdowns();
          }}
          aria-hidden="true"
        />
      )}

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-[13px] text-[#9b9b9b]">
            Acompanhe os indicadores da operação
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="relative z-20">
            <button
              type="button"
              className="flex items-center gap-2 rounded border border-white/10 hover:bg-white/5 text-[#e6e6e6] px-3 py-1.5 text-[13px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
              onClick={() => {
                setPeriodOpen((prev) => !prev);
                setTripulanteOpen(false);
              }}
              onKeyDown={(e) => handleKeyDown(e, () => {
                setPeriodOpen((prev) => !prev);
                setTripulanteOpen(false);
              })}
              aria-haspopup="listbox"
              aria-expanded={periodOpen}
              aria-label="Selecionar período"
            >
              <Calendar className="h-3.5 w-3.5 text-[#9b9b9b]" aria-hidden="true" />
              {selectedPeriodLabel}
              <ChevronDown className="h-3.5 w-3.5 text-[#9b9b9b]" aria-hidden="true" />
            </button>
            {periodOpen && (
              <ul
                role="listbox"
                aria-label="Períodos disponíveis"
                className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-white/[0.08] bg-[#1f1f1f] py-1"
              >
                {PERIOD_PRESETS.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={periodValue === opt.value}
                    tabIndex={0}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 text-[13px] transition-colors hover:bg-white/5",
                      periodValue === opt.value ? "text-[#529cca]" : "text-[#e6e6e6]",
                    )}
                    onClick={() => {
                      setPeriodValue(opt.value);
                      setPeriodOpen(false);
                    }}
                    onKeyDown={(e) =>
                      handleKeyDown(e, () => {
                        setPeriodValue(opt.value);
                        setPeriodOpen(false);
                      })
                    }
                  >
                    {opt.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tripulante Filter */}
          <div className="relative z-20">
            <button
              type="button"
              className="flex items-center gap-2 rounded border border-white/10 hover:bg-white/5 text-[#e6e6e6] px-3 py-1.5 text-[13px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
              onClick={() => {
                setTripulanteOpen((prev) => !prev);
                setPeriodOpen(false);
              }}
              onKeyDown={(e) => handleKeyDown(e, () => {
                setTripulanteOpen((prev) => !prev);
                setPeriodOpen(false);
              })}
              aria-haspopup="listbox"
              aria-expanded={tripulanteOpen}
              aria-label="Filtrar por tripulante"
            >
              <Filter className="h-3.5 w-3.5 text-[#9b9b9b]" aria-hidden="true" />
              <span className="max-w-[160px] truncate">{selectedTripulanteLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#9b9b9b]" aria-hidden="true" />
            </button>
            {tripulanteOpen && (
              <ul
                role="listbox"
                aria-label="Tripulantes disponíveis"
                className="absolute right-0 z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border border-white/[0.08] bg-[#1f1f1f] py-1"
              >
                <li
                  role="option"
                  aria-selected={selectedTripulante === ""}
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer px-3 py-1.5 text-[13px] transition-colors hover:bg-white/5",
                    selectedTripulante === "" ? "text-[#529cca]" : "text-[#e6e6e6]",
                  )}
                  onClick={() => {
                    setSelectedTripulante("");
                    setTripulanteOpen(false);
                  }}
                  onKeyDown={(e) =>
                    handleKeyDown(e, () => {
                      setSelectedTripulante("");
                      setTripulanteOpen(false);
                    })
                  }
                >
                  Visão Geral
                </li>
                {activeTripulantes.map((t) => (
                  <li
                    key={t.id}
                    role="option"
                    aria-selected={selectedTripulante === t.id}
                    tabIndex={0}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 text-[13px] transition-colors hover:bg-white/5",
                      selectedTripulante === t.id ? "text-[#529cca]" : "text-[#e6e6e6]",
                    )}
                    onClick={() => {
                      setSelectedTripulante(t.id);
                      setTripulanteOpen(false);
                    }}
                    onKeyDown={(e) =>
                      handleKeyDown(e, () => {
                        setSelectedTripulante(t.id);
                        setTripulanteOpen(false);
                      })
                    }
                  >
                    {t.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ver Jornada (when tripulante selected) */}
          {selectedTripulante && onNavigateJornada && (
            <button
              type="button"
              className="text-[#529cca] hover:text-[#6bb1de] hover:bg-white/5 px-3 py-1.5 text-[13px] rounded transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
              onClick={() => onNavigateJornada(selectedTripulante)}
            >
              Ver jornada completa →
            </button>
          )}

          {/* Gerar Relatório */}
          <button
            type="button"
            className="flex items-center gap-2 rounded bg-[#529cca] hover:bg-[#6bb1de] text-white px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
            aria-label="Gerar relatório"
            onClick={() => window.print()}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Gerar Relatório
          </button>
        </div>
      </header>

      {/* Empty state */}
      {allZero ? (
        <section
          className="border border-white/[0.06] rounded-md p-12 flex flex-col items-center justify-center text-center"
          aria-label="Sem dados"
        >
          <Calendar className="mb-4 h-10 w-10 text-[#6f6f6f]" aria-hidden="true" />
          <p className="text-[14px] font-semibold text-white">
            Nenhum dado no período selecionado
          </p>
          <p className="mt-1 text-[13px] text-[#9b9b9b]">
            Tente selecionar um período diferente ou verifique os registros.
          </p>
        </section>
      ) : (
        <>
          {/* KPI Cards */}
          <section aria-label="Indicadores de performance">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {KPI_CARDS.map((card) => {
                const atual = kpiData.atual[card.key];
                const anterior = kpiData.anterior[card.key];
                const variation = formatVariation(atual, anterior);
                const Icon = card.icon;
                const displayValue = card.isCurrency
                  ? formatCurrency(atual)
                  : atual.toLocaleString("pt-BR");

                const variationColor = variation.neutral
                  ? "text-[#6f6f6f]"
                  : variation.positive
                  ? "text-[#4aa971]"
                  : "text-[#e07464]";

                return (
                  <div
                    key={card.key}
                    className="border border-white/[0.06] hover:border-white/[0.10] rounded-md p-4 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[#9b9b9b]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className="text-xs">{card.label}</span>
                    </div>
                    <p className="mt-3 text-[24px] font-semibold text-white tracking-tight">
                      {displayValue}
                    </p>
                    <p
                      className={cn("mt-1 text-xs font-medium", variationColor)}
                      aria-label={`Variação: ${variation.value}`}
                    >
                      {variation.neutral ? "—" : variation.positive ? "▲" : "▼"} {variation.value}
                      <span className="text-[#6f6f6f] font-normal"> vs anterior</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Chart Section */}
          <section aria-label="Gráfico comparativo de métricas">
            <div className="border border-white/[0.06] rounded-md p-4">
              <h2 className="mb-4 text-[14px] font-semibold text-white">
                Comparativo: Período atual vs anterior
              </h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#9b9b9b", fontSize: 11 }}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis tick={{ fill: "#9b9b9b", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f1f1f",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "6px",
                        color: "#e6e6e6",
                        fontSize: "13px",
                      }}
                      labelStyle={{ color: "#9b9b9b" }}
                      formatter={(value, name) => {
                        const num = typeof value === "number" ? value : Number(value ?? 0);
                        const formatted =
                          name === "Atual" || name === "Anterior"
                            ? num.toLocaleString("pt-BR")
                            : num;
                        return [formatted, name as string];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ color: "#9b9b9b", paddingTop: 8, fontSize: 12 }}
                    />
                    <Bar
                      dataKey="Atual"
                      fill="#529cca"
                      radius={[2, 2, 0, 0]}
                      name="Atual"
                    />
                    <Bar
                      dataKey="Anterior"
                      fill="#3a3a3a"
                      radius={[2, 2, 0, 0]}
                      name="Anterior"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
