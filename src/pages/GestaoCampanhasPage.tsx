import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Trash2,
  MoreHorizontal,
  Calendar,
  User,
  Pencil,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchColunas,
  fetchDemandas,
  addDemanda,
  updateDemanda,
  deleteDemanda,
  addColuna,
  updateColuna,
  deleteColuna,
  getActiveTripulantes,
  getTripulanteById,
  type Demanda,
  type DemandaColuna,
} from "@/lib/store";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_COLUNAS = ["nao_iniciado", "em_andamento", "concluido"];

const COR_OPTIONS = [
  "gray",
  "blue",
  "green",
  "yellow",
  "purple",
  "red",
  "pink",
] as const;

type CorColuna = (typeof COR_OPTIONS)[number];

const COR_TEXT: Record<string, string> = {
  gray: "text-[#9b9b9b]",
  blue: "text-[#529cca]",
  green: "text-[#4aa971]",
  yellow: "text-[#d79b3f]",
  purple: "text-[#a78bfa]",
  red: "text-[#e07464]",
  pink: "text-[#e879a3]",
};

const COR_BG: Record<string, string> = {
  gray: "bg-[#9b9b9b]",
  blue: "bg-[#529cca]",
  green: "bg-[#4aa971]",
  yellow: "bg-[#d79b3f]",
  purple: "bg-[#a78bfa]",
  red: "bg-[#e07464]",
  pink: "bg-[#e879a3]",
};

const COR_LABEL: Record<string, string> = {
  gray: "Cinza",
  blue: "Azul",
  green: "Verde",
  yellow: "Amarelo",
  purple: "Roxo",
  red: "Vermelho",
  pink: "Rosa",
};

const WEEKDAY_LABELS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function eachDayBetween(startIso: string, endIso: string): string[] {
  const start = isoToDate(startIso);
  const end = isoToDate(endIso);
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(dateToIso(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GestaoCampanhasPage() {
  const { profile } = useAuth();
  // useStore keeps this page reactive to mutations outside realtime
  useStore();

  const [colunas, setColunas] = useState<DemandaColuna[]>([]);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [dataRef, setDataRef] = useState<string>(todayIso());
  const [periodo, setPeriodo] = useState<"dia" | "semana" | "mes">("dia");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showColunaPanel, setShowColunaPanel] = useState(false);

  const [newDemandaOpen, setNewDemandaOpen] = useState(false);
  const [newDemandaDataDefault, setNewDemandaDataDefault] = useState<string>(todayIso());
  const [detailDemandaId, setDetailDemandaId] = useState<string | null>(null);

  /* ------------------- Period range ------------------- */
  const { dataInicio, dataFim } = useMemo(() => {
    const d = isoToDate(dataRef);
    if (periodo === "dia") {
      return { dataInicio: dataRef, dataFim: dataRef };
    }
    if (periodo === "semana") {
      const dia = d.getDay();
      const diffSegunda = dia === 0 ? -6 : 1 - dia;
      const segunda = new Date(d);
      segunda.setDate(d.getDate() + diffSegunda);
      const domingo = new Date(segunda);
      domingo.setDate(segunda.getDate() + 6);
      return {
        dataInicio: dateToIso(segunda),
        dataFim: dateToIso(domingo),
      };
    }
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      dataInicio: dateToIso(inicio),
      dataFim: dateToIso(fim),
    };
  }, [dataRef, periodo]);

  /* ------------------- Load ------------------- */
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([fetchColunas(), fetchDemandas(dataInicio, dataFim)])
      .then(([cols, dems]) => {
        if (!mounted) return;
        setColunas(cols);
        setDemandas(dems);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [dataInicio, dataFim]);

  /* ------------------- Realtime ------------------- */
  useEffect(() => {
    const channel = supabase
      .channel("demandas-kanban")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demandas" },
        () => {
          fetchDemandas(dataInicio, dataFim).then(setDemandas).catch(() => {});
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demanda_colunas" },
        () => {
          fetchColunas().then(setColunas).catch(() => {});
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dataInicio, dataFim]);

  /* ------------------- Filters ------------------- */
  const filteredDemandas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return demandas;
    return demandas.filter((d) => {
      const trip = d.tripulanteId ? getTripulanteById(d.tripulanteId) : null;
      const tripNome = trip?.name.toLowerCase() ?? "";
      return (
        d.titulo.toLowerCase().includes(q) ||
        d.descricao.toLowerCase().includes(q) ||
        tripNome.includes(q) ||
        d.responsavelNome.toLowerCase().includes(q)
      );
    });
  }, [demandas, search]);

  const orderedColunas = useMemo(
    () => [...colunas].sort((a, b) => a.ordem - b.ordem),
    [colunas]
  );

  /* ------------------- Actions ------------------- */
  async function handleMove(demanda: Demanda, dir: "esquerda" | "direita") {
    const idx = orderedColunas.findIndex((c) => c.id === demanda.colunaId);
    if (idx === -1) return;
    const target = dir === "esquerda" ? idx - 1 : idx + 1;
    if (target < 0 || target >= orderedColunas.length) return;
    const novaColuna = orderedColunas[target];
    try {
      await updateDemanda(demanda.id, { colunaId: novaColuna.id });
      // optimistic update
      setDemandas((prev) =>
        prev.map((d) => (d.id === demanda.id ? { ...d, colunaId: novaColuna.id } : d))
      );
    } catch (err) {
      toast.error("Falha ao mover demanda");
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir esta demanda?")) return;
    try {
      await deleteDemanda(id);
      setDemandas((prev) => prev.filter((d) => d.id !== id));
      toast.success("Demanda excluída");
    } catch (err) {
      toast.error("Falha ao excluir demanda");
      console.error(err);
    }
  }

  /* ------------------- Date nav ------------------- */
  function shiftRef(delta: number) {
    const d = isoToDate(dataRef);
    if (periodo === "dia") d.setDate(d.getDate() + delta);
    else if (periodo === "semana") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setDataRef(dateToIso(d));
  }

  /* ------------------- Render ------------------- */
  const detailDemanda = detailDemandaId
    ? demandas.find((d) => d.id === detailDemandaId) ?? null
    : null;

  const periodoLabel = (() => {
    if (periodo === "dia") return formatDate(dataRef);
    if (periodo === "semana") return `${formatDate(dataInicio)} — ${formatDate(dataFim)}`;
    const d = isoToDate(dataRef);
    const monthName = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  })();

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Gestão de Campanhas</h1>
            <p className="text-sm text-[#9b9b9b] mt-1">
              Demandas operacionais do dia a dia
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewDemandaDataDefault(dataRef);
              setNewDemandaOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-[#529cca] hover:bg-[#4789b4] text-white text-sm px-3 py-2 rounded-md transition-colors"
            aria-label="Nova demanda"
          >
            <Plus size={16} /> Nova Demanda
          </button>
        </header>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Period toggle */}
          <div
            className="inline-flex rounded-md border border-white/[0.08] p-0.5 bg-white/[0.02]"
            role="group"
            aria-label="Período"
          >
            {(["dia", "semana", "mes"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                className={cn(
                  "px-3 py-1 text-xs rounded-[4px] transition-colors capitalize",
                  periodo === p
                    ? "bg-white/[0.08] text-white"
                    : "text-[#9b9b9b] hover:text-white"
                )}
              >
                {p === "mes" ? "Mês" : p}
              </button>
            ))}
          </div>

          {/* Date picker with prev/next */}
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftRef(-1)}
              className="p-1.5 rounded-md border border-white/[0.08] hover:bg-white/[0.04] text-[#9b9b9b]"
              aria-label="Período anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <input
              type="date"
              value={dataRef}
              onChange={(e) => setDataRef(e.target.value)}
              className="bg-white/[0.02] border border-white/[0.08] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#529cca]"
              aria-label="Data de referência"
            />
            <button
              type="button"
              onClick={() => shiftRef(1)}
              className="p-1.5 rounded-md border border-white/[0.08] hover:bg-white/[0.04] text-[#9b9b9b]"
              aria-label="Próximo período"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Buscar demanda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-white placeholder:text-[#6f6f6f] focus:outline-none focus:border-[#529cca]"
            aria-label="Buscar demandas"
          />

          {/* Period label */}
          <span className="text-xs text-[#9b9b9b] px-2">{periodoLabel}</span>

          {/* Gerenciar colunas */}
          <button
            type="button"
            onClick={() => setShowColunaPanel((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors",
              showColunaPanel
                ? "border-[#529cca] text-[#529cca] bg-[#529cca]/10"
                : "border-white/[0.08] text-[#9b9b9b] hover:text-white hover:bg-white/[0.04]"
            )}
            aria-label="Gerenciar colunas"
            aria-expanded={showColunaPanel}
          >
            <MoreHorizontal size={14} /> Gerenciar colunas
          </button>
        </div>

        {/* Column manager panel (inline) */}
        {showColunaPanel && (
          <ColunaPanel
            colunas={orderedColunas}
            onClose={() => setShowColunaPanel(false)}
          />
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-24 text-[#6f6f6f] text-sm">Carregando...</div>
        ) : filteredDemandas.length === 0 && periodo !== "mes" ? (
          <div className="text-center py-24 text-[#6f6f6f] text-sm">
            Nenhuma demanda para este período. Clique em{" "}
            <span className="text-[#529cca]">+ Nova Demanda</span> para começar.
          </div>
        ) : periodo === "dia" ? (
          <DayKanban
            date={dataRef}
            colunas={orderedColunas}
            demandas={filteredDemandas.filter((d) => d.dataDemanda === dataRef)}
            onOpenDetail={setDetailDemandaId}
            onMove={handleMove}
            onDelete={handleDelete}
            onAddInColuna={(colunaId) => {
              setNewDemandaDataDefault(dataRef);
              setNewDemandaOpen(true);
              // default coluna handled inside modal via colunas[0] — simple approach
              void colunaId;
            }}
          />
        ) : periodo === "semana" ? (
          <div className="space-y-6">
            {eachDayBetween(dataInicio, dataFim).map((iso, idx) => {
              const dayDemandas = filteredDemandas.filter((d) => d.dataDemanda === iso);
              return (
                <div key={iso}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-[#6f6f6f]">
                      {WEEKDAY_LABELS[idx]}
                    </span>
                    <span className="text-sm text-white font-medium">
                      {formatDate(iso)}
                    </span>
                    <span className="text-xs text-[#6f6f6f]">
                      {dayDemandas.length} demanda{dayDemandas.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <DayKanban
                    date={iso}
                    colunas={orderedColunas}
                    demandas={dayDemandas}
                    onOpenDetail={setDetailDemandaId}
                    onMove={handleMove}
                    onDelete={handleDelete}
                    onAddInColuna={() => {
                      setNewDemandaDataDefault(iso);
                      setNewDemandaOpen(true);
                    }}
                    compact
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <MonthView
            dataInicio={dataInicio}
            dataFim={dataFim}
            demandas={filteredDemandas}
            colunas={orderedColunas}
            onClickDay={(iso) => {
              setDataRef(iso);
              setPeriodo("dia");
            }}
          />
        )}
      </div>

      {/* New demanda modal */}
      {newDemandaOpen && (
        <DemandaModal
          mode="new"
          colunas={orderedColunas}
          defaultDate={newDemandaDataDefault}
          defaultResponsavel={profile?.nome ?? ""}
          onClose={() => setNewDemandaOpen(false)}
          onSaved={(novaDataIso) => {
            // If the new demanda falls inside the current range, refetch
            if (novaDataIso >= dataInicio && novaDataIso <= dataFim) {
              fetchDemandas(dataInicio, dataFim).then(setDemandas).catch(() => {});
            }
            setNewDemandaOpen(false);
          }}
        />
      )}

      {/* Detail modal */}
      {detailDemanda && (
        <DemandaModal
          mode="edit"
          demanda={detailDemanda}
          colunas={orderedColunas}
          defaultDate={detailDemanda.dataDemanda}
          defaultResponsavel={detailDemanda.responsavelNome}
          onClose={() => setDetailDemandaId(null)}
          onSaved={() => {
            fetchDemandas(dataInicio, dataFim).then(setDemandas).catch(() => {});
            setDetailDemandaId(null);
          }}
          onDelete={() => {
            handleDelete(detailDemanda.id);
            setDetailDemandaId(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DayKanban                                                          */
/* ------------------------------------------------------------------ */

interface DayKanbanProps {
  date: string;
  colunas: DemandaColuna[];
  demandas: Demanda[];
  onOpenDetail: (id: string) => void;
  onMove: (d: Demanda, dir: "esquerda" | "direita") => void;
  onDelete: (id: string) => void;
  onAddInColuna?: (colunaId: string) => void;
  compact?: boolean;
}

function DayKanban({
  colunas,
  demandas,
  onOpenDetail,
  onMove,
  onDelete,
  compact,
}: DayKanbanProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto pb-2",
        compact ? "border border-white/[0.06] rounded-md bg-white/[0.01]" : ""
      )}
    >
      <div className="flex gap-3 min-w-full">
        {colunas.map((col) => {
          const colDemandas = demandas.filter((d) => d.colunaId === col.id);
          return (
            <div
              key={col.id}
              className="flex-1 min-w-[280px] bg-white/[0.01] border border-white/[0.06] rounded-md p-2"
            >
              <div className="flex items-center justify-between px-1 py-1.5 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("w-2 h-2 rounded-full", COR_BG[col.cor] ?? COR_BG.gray)}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      COR_TEXT[col.cor] ?? COR_TEXT.gray
                    )}
                  >
                    {col.nome}
                  </span>
                  <span className="text-[10px] text-[#6f6f6f]">
                    {colDemandas.length}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {colDemandas.length === 0 ? (
                  <div className="text-[11px] text-[#6f6f6f] px-1 py-2">
                    Sem demandas
                  </div>
                ) : (
                  colDemandas.map((d) => (
                    <DemandaCard
                      key={d.id}
                      demanda={d}
                      colunas={colunas}
                      onClick={() => onOpenDetail(d.id)}
                      onMove={(dir) => onMove(d, dir)}
                      onDelete={() => onDelete(d.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DemandaCard                                                        */
/* ------------------------------------------------------------------ */

interface DemandaCardProps {
  demanda: Demanda;
  colunas: DemandaColuna[];
  onClick: () => void;
  onMove: (dir: "esquerda" | "direita") => void;
  onDelete: () => void;
}

function DemandaCard({ demanda, colunas, onClick, onMove, onDelete }: DemandaCardProps) {
  const col = colunas.find((c) => c.id === demanda.colunaId);
  const idx = colunas.findIndex((c) => c.id === demanda.colunaId);
  const canLeft = idx > 0;
  const canRight = idx >= 0 && idx < colunas.length - 1;
  const trip = demanda.tripulanteId ? getTripulanteById(demanda.tripulanteId) : null;

  return (
    <div
      className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-md p-3 cursor-pointer transition-colors"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      aria-label={`Demanda: ${demanda.titulo}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
            COR_BG[col?.cor ?? "gray"] ?? COR_BG.gray
          )}
          aria-hidden
        />
        <h3 className="text-sm text-white leading-snug flex-1">{demanda.titulo}</h3>
      </div>

      {trip && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#9b9b9b] mb-1">
          <User size={11} />
          <span className="truncate">{trip.name}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10px] text-[#6f6f6f] mb-2">
        <Pencil size={10} />
        <span className="truncate">
          por {demanda.responsavelNome || demanda.autorNome || "—"} ·{" "}
          {formatDistanceToNow(new Date(demanda.updatedAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canLeft}
            onClick={(e) => {
              e.stopPropagation();
              onMove("esquerda");
            }}
            className="p-1 rounded hover:bg-white/[0.06] text-[#9b9b9b] disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Mover para coluna anterior"
          >
            <ArrowLeft size={12} />
          </button>
          <button
            type="button"
            disabled={!canRight}
            onClick={(e) => {
              e.stopPropagation();
              onMove("direita");
            }}
            className="p-1 rounded hover:bg-white/[0.06] text-[#9b9b9b] disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Mover para próxima coluna"
          >
            <ArrowRight size={12} />
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-[#e07464]/10 text-[#6f6f6f] hover:text-[#e07464] opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Excluir demanda"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MonthView (aggregated list)                                        */
/* ------------------------------------------------------------------ */

interface MonthViewProps {
  dataInicio: string;
  dataFim: string;
  demandas: Demanda[];
  colunas: DemandaColuna[];
  onClickDay: (iso: string) => void;
}

function MonthView({ dataInicio, dataFim, demandas, colunas, onClickDay }: MonthViewProps) {
  const days = eachDayBetween(dataInicio, dataFim);
  const concluidoIds = new Set(
    colunas.filter((c) => c.id === "concluido").map((c) => c.id)
  );

  const rows = days.map((iso) => {
    const list = demandas.filter((d) => d.dataDemanda === iso);
    const total = list.length;
    const concluidas = list.filter((d) => concluidoIds.has(d.colunaId)).length;
    return { iso, total, concluidas };
  });

  const totalMes = rows.reduce((sum, r) => sum + r.total, 0);

  if (totalMes === 0) {
    return (
      <div className="text-center py-24 text-[#6f6f6f] text-sm">
        Nenhuma demanda para este mês. Clique em{" "}
        <span className="text-[#529cca]">+ Nova Demanda</span> para começar.
      </div>
    );
  }

  return (
    <div className="border border-white/[0.06] rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.02] text-[#9b9b9b] text-xs">
          <tr>
            <th scope="col" className="text-left px-4 py-2 font-medium">
              Dia
            </th>
            <th scope="col" className="text-right px-4 py-2 font-medium">
              Demandas
            </th>
            <th scope="col" className="text-right px-4 py-2 font-medium">
              Concluídas
            </th>
            <th scope="col" className="text-right px-4 py-2 font-medium">
              Pendentes
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pendentes = r.total - r.concluidas;
            return (
              <tr
                key={r.iso}
                onClick={() => onClickDay(r.iso)}
                className={cn(
                  "border-t border-white/[0.04] cursor-pointer transition-colors",
                  r.total > 0
                    ? "hover:bg-white/[0.02]"
                    : "text-[#6f6f6f] hover:bg-white/[0.01]"
                )}
              >
                <td className="px-4 py-2 flex items-center gap-2">
                  <Calendar size={12} className="text-[#6f6f6f]" />
                  {formatDate(r.iso)}
                </td>
                <td className="text-right px-4 py-2">{r.total}</td>
                <td className="text-right px-4 py-2 text-[#4aa971]">{r.concluidas}</td>
                <td className="text-right px-4 py-2 text-[#d79b3f]">{pendentes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ColunaPanel                                                        */
/* ------------------------------------------------------------------ */

function ColunaPanel({
  colunas,
  onClose,
}: {
  colunas: DemandaColuna[];
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [newCor, setNewCor] = useState<CorColuna>("gray");
  const [saving, setSaving] = useState(false);

  async function handleRename(id: string) {
    const novoNome = editing[id]?.trim();
    if (!novoNome) {
      toast.error("Nome da coluna obrigatório");
      return;
    }
    try {
      await updateColuna(id, { nome: novoNome });
      setEditing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("Coluna renomeada");
    } catch (err) {
      toast.error("Falha ao renomear coluna");
      console.error(err);
    }
  }

  async function handleChangeCor(id: string, cor: string) {
    try {
      await updateColuna(id, { cor });
    } catch (err) {
      toast.error("Falha ao alterar cor");
      console.error(err);
    }
  }

  async function handleDeleteCol(id: string) {
    if (!window.confirm("Excluir esta coluna? Demandas vinculadas voltarão para 'Não iniciado'.")) {
      return;
    }
    try {
      await deleteColuna(id);
      toast.success("Coluna excluída");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao excluir coluna";
      toast.error(msg);
    }
  }

  async function handleAddColuna() {
    const nome = newName.trim();
    if (!nome) {
      toast.error("Nome da coluna obrigatório");
      return;
    }
    setSaving(true);
    try {
      await addColuna(nome, newCor);
      setNewName("");
      setNewCor("gray");
      toast.success("Coluna criada");
    } catch (err) {
      toast.error("Falha ao criar coluna");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 border border-white/[0.08] rounded-md bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Gerenciar colunas</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-white/[0.06] text-[#9b9b9b]"
          aria-label="Fechar painel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {colunas.map((col) => {
          const isDefault = DEFAULT_COLUNAS.includes(col.id);
          const editingName = editing[col.id];
          return (
            <div
              key={col.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded border border-white/[0.06] bg-white/[0.01]"
            >
              <span
                className={cn("w-2 h-2 rounded-full", COR_BG[col.cor] ?? COR_BG.gray)}
                aria-hidden
              />
              {editingName !== undefined ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, [col.id]: e.target.value }))
                    }
                    className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#529cca]"
                    aria-label="Novo nome da coluna"
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(col.id)}
                    className="p-1 rounded text-[#4aa971] hover:bg-[#4aa971]/10"
                    aria-label="Salvar nome"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing((p) => {
                        const next = { ...p };
                        delete next[col.id];
                        return next;
                      })
                    }
                    className="p-1 rounded text-[#9b9b9b] hover:bg-white/[0.06]"
                    aria-label="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-white">{col.nome}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing((p) => ({ ...p, [col.id]: col.nome }))
                    }
                    className="p-1 rounded text-[#9b9b9b] hover:bg-white/[0.06]"
                    aria-label="Renomear coluna"
                  >
                    <Pencil size={12} />
                  </button>
                </>
              )}

              <select
                value={col.cor}
                onChange={(e) => handleChangeCor(col.id, e.target.value)}
                className="bg-white/[0.02] border border-white/[0.08] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#529cca]"
                aria-label="Cor da coluna"
              >
                {COR_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {COR_LABEL[c]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={isDefault}
                onClick={() => handleDeleteCol(col.id)}
                className="p-1 rounded text-[#6f6f6f] hover:bg-[#e07464]/10 hover:text-[#e07464] disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Excluir coluna"
                title={isDefault ? "Coluna padrão não pode ser excluída" : "Excluir"}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
        <input
          type="text"
          placeholder="Nome da nova coluna..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white placeholder:text-[#6f6f6f] focus:outline-none focus:border-[#529cca]"
          aria-label="Nome da nova coluna"
        />
        <select
          value={newCor}
          onChange={(e) => setNewCor(e.target.value as CorColuna)}
          className="bg-white/[0.02] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#529cca]"
          aria-label="Cor da nova coluna"
        >
          {COR_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {COR_LABEL[c]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAddColuna}
          disabled={saving}
          className="inline-flex items-center gap-1 bg-[#529cca] hover:bg-[#4789b4] text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
        >
          <Plus size={12} /> Nova coluna
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DemandaModal                                                       */
/* ------------------------------------------------------------------ */

interface DemandaModalProps {
  mode: "new" | "edit";
  demanda?: Demanda;
  colunas: DemandaColuna[];
  defaultDate: string;
  defaultResponsavel: string;
  onClose: () => void;
  onSaved: (dataIso: string) => void;
  onDelete?: () => void;
}

function DemandaModal({
  mode,
  demanda,
  colunas,
  defaultDate,
  defaultResponsavel,
  onClose,
  onSaved,
  onDelete,
}: DemandaModalProps) {
  const firstColunaId =
    colunas.find((c) => c.id === "nao_iniciado")?.id ?? colunas[0]?.id ?? "nao_iniciado";

  const [titulo, setTitulo] = useState(demanda?.titulo ?? "");
  const [descricao, setDescricao] = useState(demanda?.descricao ?? "");
  const [tripulanteId, setTripulanteId] = useState<string>(demanda?.tripulanteId ?? "");
  const [colunaId, setColunaId] = useState<string>(demanda?.colunaId ?? firstColunaId);
  const [dataDemanda, setDataDemanda] = useState<string>(
    demanda?.dataDemanda ?? defaultDate
  );
  const [responsavelNome, setResponsavelNome] = useState<string>(
    demanda?.responsavelNome || defaultResponsavel || ""
  );
  const [saving, setSaving] = useState(false);

  const tripulantes = useMemo(() => getActiveTripulantes(), []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSave() {
    const t = titulo.trim();
    if (!t) {
      toast.error("Título obrigatório");
      return;
    }
    setSaving(true);
    try {
      if (mode === "new") {
        await addDemanda({
          titulo: t,
          descricao: descricao.trim(),
          tripulanteId: tripulanteId || null,
          colunaId,
          dataDemanda,
          responsavelNome: responsavelNome.trim() || undefined,
        });
        toast.success("Demanda criada");
      } else if (demanda) {
        await updateDemanda(demanda.id, {
          titulo: t,
          descricao: descricao.trim(),
          tripulanteId: tripulanteId || null,
          colunaId,
          dataDemanda,
          responsavelNome: responsavelNome.trim(),
        });
        toast.success("Demanda atualizada");
      }
      onSaved(dataDemanda);
    } catch (err) {
      console.error(err);
      toast.error(mode === "new" ? "Falha ao criar demanda" : "Falha ao atualizar demanda");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "new" ? "Nova demanda" : "Editar demanda"}
    >
      <div
        className="bg-[#1f1f1f] border border-white/[0.08] rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">
            {mode === "new" ? "Nova Demanda" : "Editar Demanda"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/[0.06] text-[#9b9b9b]"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs text-[#9b9b9b] mb-1">Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
              className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-[#6f6f6f] focus:outline-none focus:border-[#529cca]"
              placeholder="Ex.: Revisar criativo da loja X"
            />
          </div>

          <div>
            <label className="block text-xs text-[#9b9b9b] mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-[#6f6f6f] focus:outline-none focus:border-[#529cca] resize-y"
              placeholder="Detalhes da demanda..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#9b9b9b] mb-1">Tripulante</label>
              <select
                value={tripulanteId}
                onChange={(e) => setTripulanteId(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#529cca]"
              >
                <option value="">Nenhum</option>
                {tripulantes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#9b9b9b] mb-1">Coluna</label>
              <select
                value={colunaId}
                onChange={(e) => setColunaId(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#529cca]"
              >
                {colunas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#9b9b9b] mb-1">Data</label>
              <input
                type="date"
                value={dataDemanda}
                onChange={(e) => setDataDemanda(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#529cca]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9b9b9b] mb-1">Responsável</label>
              <input
                type="text"
                value={responsavelNome}
                onChange={(e) => setResponsavelNome(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-[#6f6f6f] focus:outline-none focus:border-[#529cca]"
                placeholder="Nome"
              />
            </div>
          </div>
        </div>

        {/* Footer metadata (edit mode) */}
        {mode === "edit" && demanda && (
          <div className="px-5 py-3 border-t border-white/[0.06] text-[11px] text-[#6f6f6f] space-y-0.5">
            <div>
              Criada por {demanda.autorNome ?? "—"} em {formatDate(demanda.createdAt)}
            </div>
            <div>
              Última edição:{" "}
              {formatDistanceToNow(new Date(demanda.updatedAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06] bg-white/[0.01]">
          <div>
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 text-xs text-[#e07464] hover:bg-[#e07464]/10 px-3 py-1.5 rounded-md"
                aria-label="Excluir demanda"
              >
                <Trash2 size={12} /> Excluir
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[#9b9b9b] hover:text-white px-3 py-1.5 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-[#529cca] hover:bg-[#4789b4] disabled:opacity-50 text-white text-xs px-4 py-1.5 rounded-md"
            >
              <Check size={12} /> Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
