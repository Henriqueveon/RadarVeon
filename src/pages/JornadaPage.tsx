import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Plus,
  X,
  Calendar,
  Clock,
  Handshake,
  Megaphone,
  Palette,
  MessageSquare,
  AlertTriangle,
  Trophy,
  BookOpen,
  DollarSign,
  ChevronDown,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/hooks/useStore";
import {
  getActiveTripulantes,
  getTripulanteById,
  getTimelineForTripulante,
  getTripulanteHealth,
  addEventoManual,
  type TimelineEvent,
  type EventoManual,
} from "@/lib/store";
import { tenentes, formatCurrency, ANIMO_EMOJIS } from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  "reuniao",
  "campanha",
  "criativo",
  "observacao",
  "alerta",
  "marco",
  "onboarding",
  "oficina",
  "venda",
  "alerta_manual",
] as const;

type EventTipo = (typeof EVENT_TYPES)[number];

const EVENT_CONFIG: Record<
  EventTipo,
  { label: string; color: string; dotBg: string; icon: React.ElementType }
> = {
  onboarding: { label: "Onboarding", color: "text-[#4aa971]", dotBg: "bg-[#4aa971]", icon: BookOpen },
  reuniao: { label: "Reunião", color: "text-[#529cca]", dotBg: "bg-[#529cca]", icon: Handshake },
  campanha: { label: "Campanha", color: "text-[#a78bfa]", dotBg: "bg-[#a78bfa]", icon: Megaphone },
  criativo: { label: "Criativo", color: "text-[#e879a3]", dotBg: "bg-[#e879a3]", icon: Palette },
  venda: { label: "Venda", color: "text-[#4aa971]", dotBg: "bg-[#4aa971]", icon: DollarSign },
  oficina: { label: "Oficina", color: "text-[#6ac9cc]", dotBg: "bg-[#6ac9cc]", icon: BookOpen },
  observacao: { label: "Observação", color: "text-[#9b9b9b]", dotBg: "bg-[#9b9b9b]", icon: MessageSquare },
  alerta: { label: "Alerta", color: "text-[#e07464]", dotBg: "bg-[#e07464]", icon: AlertTriangle },
  marco: { label: "Marco", color: "text-[#d79b3f]", dotBg: "bg-[#d79b3f]", icon: Trophy },
  alerta_manual: { label: "Alerta Manual", color: "text-[#d79b3f]", dotBg: "bg-[#d79b3f]", icon: AlertTriangle },
};

const MANUAL_TIPOS: EventoManual["tipo"][] = [
  "onboarding",
  "marco",
  "alerta_manual",
  "observacao",
  "oficina",
  "venda",
];

const MANUAL_TIPO_LABELS: Record<EventoManual["tipo"], string> = {
  onboarding: "Onboarding",
  marco: "Marco",
  alerta_manual: "Alerta Manual",
  observacao: "Observação",
  oficina: "Oficina",
  venda: "Venda",
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function monthsSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TripulanteCombobox({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tripulantes = getActiveTripulantes();
  const filtered = tripulantes.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.loja.toLowerCase().includes(query.toLowerCase())
  );

  const selected = selectedId ? getTripulanteById(selectedId) : null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <label htmlFor="tripulante-search" className="sr-only">
        Buscar tripulante
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f6f6f]" aria-hidden="true" />
        <input
          ref={inputRef}
          id="tripulante-search"
          type="text"
          className="w-full bg-transparent border border-white/10 rounded pl-10 pr-10 py-1.5 text-[13px] text-white placeholder-[#6f6f6f] focus:outline-none focus:border-[#529cca]"
          placeholder={selected ? selected.name : "Buscar tripulante..."}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          role="combobox"
          aria-expanded={open}
          aria-controls="tripulante-listbox"
          aria-autocomplete="list"
        />
        {selected && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b9b9b] hover:text-white"
            onClick={() => {
              onSelect(null);
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Limpar seleção"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && (
        <ul
          id="tripulante-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded bg-[#1f1f1f] border border-white/[0.08]"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-[13px] text-[#6f6f6f]">Nenhum tripulante encontrado</li>
          ) : (
            filtered.map((t) => (
              <li
                key={t.id}
                role="option"
                aria-selected={t.id === selectedId}
                className={cn(
                  "flex flex-col px-4 py-2 cursor-pointer text-[13px] hover:bg-white/5 transition-colors",
                  t.id === selectedId && "bg-white/5"
                )}
                onClick={() => {
                  onSelect(t.id);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="text-white">{t.name}</span>
                <span className="text-[#6f6f6f] text-xs">{t.loja}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function SummaryCard({ tripulanteId }: { tripulanteId: string }) {
  const trip = getTripulanteById(tripulanteId);
  const health = getTripulanteHealth(tripulanteId);
  if (!trip) return null;

  const months = monthsSince(trip.dataEntrada);

  const scoreColor =
    health.score >= 70
      ? "text-[#4aa971]"
      : health.score >= 40
        ? "text-[#d79b3f]"
        : "text-[#e07464]";

  const scoreLabel =
    health.score >= 70 ? "Saudável" : health.score >= 40 ? "Atenção" : "Em Risco";

  const TrendIcon =
    health.tendencia === "crescente"
      ? TrendingUp
      : health.tendencia === "decrescente"
        ? TrendingDown
        : Minus;

  const trendColor =
    health.tendencia === "crescente"
      ? "text-[#4aa971]"
      : health.tendencia === "decrescente"
        ? "text-[#e07464]"
        : "text-[#9b9b9b]";

  const statusColor = trip.status === "ativo" ? "text-[#4aa971]" : "text-[#9b9b9b]";

  return (
    <div className="border border-white/[0.06] rounded-md p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Left */}
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold text-white truncate">{trip.name}</h2>
        <p className="text-[13px] text-[#9b9b9b] truncate">{trip.loja}</p>
        <p className="text-xs text-[#6f6f6f] mt-0.5">Tenente: {trip.tenente}</p>
      </div>

      {/* Center */}
      <div className="flex flex-col gap-1.5 text-[13px]">
        <p className="text-[#9b9b9b]">
          <Calendar className="inline h-3.5 w-3.5 mr-1 -mt-0.5" aria-hidden="true" />
          Entrada: <span className="text-[#e6e6e6]">{formatDate(trip.dataEntrada)}</span>{" "}
          <span className="text-[#6f6f6f]">
            (há {months} {months === 1 ? "mês" : "meses"})
          </span>
        </p>
        <span className={cn("text-xs font-medium", statusColor)}>
          ● {trip.status === "ativo" ? "Ativo" : "Inativo"}
        </span>
      </div>

      {/* Right — health */}
      <div className="flex flex-col gap-1.5 text-[13px] md:items-end">
        <span className={cn("text-xs font-medium", scoreColor)}>
          ● {health.score} — {scoreLabel}
        </span>
        {health.ultimoContato && (
          <p className="text-[#6f6f6f] text-xs">
            <Clock className="inline h-3 w-3 mr-1 -mt-0.5" aria-hidden="true" />
            Último contato: {formatDate(health.ultimoContato)}
          </p>
        )}
        <span className={cn("inline-flex items-center gap-1 text-xs", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Tendência {health.tendencia}
        </span>
      </div>
    </div>
  );
}

function IndicatorCards({ tripulanteId }: { tripulanteId: string }) {
  const health = getTripulanteHealth(tripulanteId);

  const freqLabel =
    health.freqMediaDias > 0 ? `1 a cada ${health.freqMediaDias} dias` : "Sem dados";

  const trendLabel =
    health.tendencia === "crescente"
      ? "Crescente"
      : health.tendencia === "decrescente"
        ? "Decrescente"
        : "Estável";

  const TrendIcon =
    health.tendencia === "crescente"
      ? TrendingUp
      : health.tendencia === "decrescente"
        ? TrendingDown
        : Minus;

  const trendColor =
    health.tendencia === "crescente"
      ? "text-[#4aa971]"
      : health.tendencia === "decrescente"
        ? "text-[#e07464]"
        : "text-[#9b9b9b]";

  const items = [
    { label: "Reuniões realizadas", value: String(health.totalReunioesLifetime) },
    { label: "Criativos entregues", value: String(health.totalCriativosLifetime) },
    { label: "Vendas declaradas", value: formatCurrency(health.totalVendas) },
    { label: "Campanhas ativas", value: String(health.campanhasAtivas) },
    { label: "Frequência de reuniões", value: freqLabel },
    { label: "Tendência", value: trendLabel, icon: TrendIcon, iconColor: trendColor },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item) => (
        <div key={item.label} className="border border-white/[0.06] rounded p-3 flex flex-col gap-1">
          <span className="text-xs text-[#9b9b9b]">{item.label}</span>
          <span className="text-white font-semibold text-[14px] flex items-center gap-1">
            {item.icon && (
              <item.icon className={cn("h-3.5 w-3.5", item.iconColor)} aria-hidden="true" />
            )}
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function TypeFilterPills({
  active,
  onChange,
}: {
  active: Set<EventTipo>;
  onChange: (next: Set<EventTipo>) => void;
}) {
  function toggle(tipo: EventTipo) {
    const next = new Set(active);
    if (next.has(tipo)) {
      next.delete(tipo);
    } else {
      next.add(tipo);
    }
    onChange(next);
  }

  return (
    <fieldset>
      <legend className="sr-only">Filtrar por tipo de evento</legend>
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map((tipo) => {
          const cfg = EVENT_CONFIG[tipo];
          const isActive = active.has(tipo);
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => toggle(tipo)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors",
                isActive
                  ? cn("border-white/20", cfg.color)
                  : "border-white/[0.06] text-[#6f6f6f] hover:text-[#9b9b9b]"
              )}
              aria-pressed={isActive}
            >
              <cfg.icon className="h-3 w-3" aria-hidden="true" />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function TimelineEventCard({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = EVENT_CONFIG[event.tipo] || EVENT_CONFIG.observacao;
  const Icon = cfg.icon;

  const needsTruncation = event.descricao.length > 140;
  const displayDesc = !expanded && needsTruncation ? event.descricao.slice(0, 140) + "..." : event.descricao;

  const animoKey = event.metadata?.animo as keyof typeof ANIMO_EMOJIS | undefined;
  const investimento = event.metadata?.investimento as number | undefined;
  const resultado = event.metadata?.resultado as string | undefined;
  const tipoCriativo = event.metadata?.tipoCriativo as string | undefined;
  const statusCriativo = event.metadata?.status as string | undefined;

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Dot + line */}
      <div className="flex flex-col items-center flex-shrink-0 w-2" aria-hidden="true">
        <span className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", cfg.dotBg)} />
        {!isLast && <span className="w-px flex-1 bg-white/[0.08] mt-1" />}
      </div>

      {/* Card */}
      <div className="border border-white/[0.06] rounded p-3 flex-1 min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-1.5">
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium", cfg.color)}>
            <Icon className="h-3 w-3" aria-hidden="true" />
            {cfg.label}
          </span>
          <span className="text-[#6f6f6f] text-xs">{formatDate(event.data)}</span>
          <span
            className={cn(
              "ml-auto text-xs",
              event.fonte === "automatico" ? "text-[#6f6f6f]" : "text-[#529cca]"
            )}
          >
            ● {event.fonte === "automatico" ? "Automático" : "Manual"}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-white text-[13px] font-semibold mb-1">{event.titulo}</h3>

        {/* Description */}
        <p className="text-[#e6e6e6] text-[13px] leading-relaxed whitespace-pre-line">{displayDesc}</p>
        {needsTruncation && (
          <button
            type="button"
            className="text-[#529cca] hover:text-[#6bb1de] text-xs mt-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "ver menos" : "ver mais"}
          </button>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[#9b9b9b]">
          <span>● Responsável: {event.responsavel}</span>
          {event.tipo === "reuniao" && animoKey && ANIMO_EMOJIS[animoKey] && (
            <span>● Ânimo: {ANIMO_EMOJIS[animoKey]}</span>
          )}
          {event.tipo === "campanha" && investimento !== undefined && (
            <span>● Investimento: {formatCurrency(investimento)}</span>
          )}
          {event.tipo === "campanha" && resultado && <span>● Resultado: {resultado}</span>}
          {event.tipo === "criativo" && tipoCriativo && <span>● Tipo: {tipoCriativo}</span>}
          {event.tipo === "criativo" && statusCriativo && <span>● Status: {statusCriativo}</span>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: Registrar Evento
// ---------------------------------------------------------------------------

interface ModalProps {
  tripulanteId: string;
  open: boolean;
  onClose: () => void;
}

function RegistrarEventoModal({ tripulanteId, open, onClose }: ModalProps) {
  const [tipo, setTipo] = useState<EventoManual["tipo"]>("observacao");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [responsavel, setResponsavel] = useState(tenentes[0]?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Trap focus — simplified: focus first input on open
  const firstInputRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (open) {
      firstInputRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error("Informe um título para o evento.");
      return;
    }
    if (!descricao.trim()) {
      toast.error("Informe uma descrição para o evento.");
      return;
    }
    setSubmitting(true);
    try {
      addEventoManual({
        tripulanteId,
        tipo,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data,
        responsavel,
      });
      toast.success("Evento registrado com sucesso!");
      setTitulo("");
      setDescricao("");
      setTipo("observacao");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Registrar evento"
    >
      <div className="bg-[#1f1f1f] border border-white/[0.08] rounded-lg w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[14px] font-semibold text-white">Registrar Evento</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9b9b9b] hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label htmlFor="evento-tipo" className="text-xs text-[#9b9b9b]">
              Tipo
            </label>
            <select
              ref={firstInputRef}
              id="evento-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as EventoManual["tipo"])}
              className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#529cca]"
            >
              {MANUAL_TIPOS.map((t) => (
                <option key={t} value={t}>
                  {MANUAL_TIPO_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div className="flex flex-col gap-1">
            <label htmlFor="evento-data" className="text-xs text-[#9b9b9b]">
              Data
            </label>
            <input
              id="evento-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#529cca]"
            />
          </div>

          {/* Titulo */}
          <div className="flex flex-col gap-1">
            <label htmlFor="evento-titulo" className="text-xs text-[#9b9b9b]">
              Título
            </label>
            <input
              id="evento-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título do evento"
              maxLength={120}
              className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-[13px] text-white placeholder-[#6f6f6f] focus:outline-none focus:border-[#529cca]"
            />
          </div>

          {/* Descricao */}
          <div className="flex flex-col gap-1">
            <label htmlFor="evento-descricao" className="text-xs text-[#9b9b9b]">
              Descrição
            </label>
            <textarea
              id="evento-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              placeholder="Descreva o evento..."
              className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-[13px] text-white placeholder-[#6f6f6f] focus:outline-none focus:border-[#529cca] resize-none"
            />
          </div>

          {/* Responsavel */}
          <div className="flex flex-col gap-1">
            <label htmlFor="evento-responsavel" className="text-xs text-[#9b9b9b]">
              Responsável
            </label>
            <select
              id="evento-responsavel"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#529cca]"
            >
              {tenentes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-white/10 hover:bg-white/5 text-[#e6e6e6] px-3 py-1.5 text-[13px] rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#529cca] hover:bg-[#6bb1de] disabled:opacity-50 text-white px-3 py-1.5 text-[13px] font-medium rounded"
            >
              {submitting ? "Salvando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

interface JornadaPageProps {
  preSelectedTripulanteId?: string | null;
  onClearPreSelection?: () => void;
}

export default function JornadaPage({ preSelectedTripulanteId, onClearPreSelection }: JornadaPageProps) {
  useStore();

  const [selectedId, setSelectedId] = useState<string | null>(preSelectedTripulanteId ?? null);

  useEffect(() => {
    if (preSelectedTripulanteId) {
      setSelectedId(preSelectedTripulanteId);
      onClearPreSelection?.();
    }
  }, [preSelectedTripulanteId, onClearPreSelection]);
  const [activeTypes, setActiveTypes] = useState<Set<EventTipo>>(new Set(EVENT_TYPES));
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [responsavelFilter, setResponsavelFilter] = useState("");
  const [showAutoAlerts, setShowAutoAlerts] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [modalOpen, setModalOpen] = useState(false);

  // Reset pagination when filters or tripulante change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedId, activeTypes, dateStart, dateEnd, responsavelFilter, showAutoAlerts]);

  const allEvents = useMemo(() => {
    if (!selectedId) return [];
    return getTimelineForTripulante(selectedId);
  }, [selectedId]);

  const filteredEvents = useMemo(() => {
    let events = allEvents;

    // Type filter
    events = events.filter((e) => activeTypes.has(e.tipo));

    // Auto alerts toggle
    if (!showAutoAlerts) {
      events = events.filter((e) => !(e.tipo === "alerta" && e.fonte === "automatico"));
    }

    // Date range
    if (dateStart) {
      events = events.filter((e) => e.data >= dateStart);
    }
    if (dateEnd) {
      events = events.filter((e) => e.data <= dateEnd);
    }

    // Responsavel
    if (responsavelFilter) {
      events = events.filter((e) => e.responsavel === responsavelFilter);
    }

    return events;
  }, [allEvents, activeTypes, showAutoAlerts, dateStart, dateEnd, responsavelFilter]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;

  // Collect unique responsaveis for filter dropdown
  const responsaveis = useMemo(() => {
    const set = new Set(allEvents.map((e) => e.responsavel));
    return Array.from(set).sort();
  }, [allEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-white">Jornada do Tripulante</h1>
          <p className="text-[13px] text-[#9b9b9b] mt-1">
            Timeline completa com todos os eventos de cada tripulante
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedId && (
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 border border-white/10 hover:bg-white/5 text-[#e6e6e6] px-3 py-1.5 text-[13px] rounded"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Exportar Jornada
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#529cca] hover:bg-[#6bb1de] text-white px-3 py-1.5 text-[13px] font-medium rounded"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Registrar Evento
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tripulante selector */}
      <TripulanteCombobox selectedId={selectedId} onSelect={setSelectedId} />

      {/* Empty state */}
      {!selectedId && (
        <div className="border border-white/[0.06] rounded-md flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="h-10 w-10 text-[#6f6f6f] mb-4" aria-hidden="true" />
          <p className="text-[14px] font-medium text-[#9b9b9b]">
            Selecione um tripulante para ver sua jornada completa
          </p>
          <p className="text-[13px] text-[#6f6f6f] mt-1">
            Use o campo de busca acima para encontrar um tripulante
          </p>
        </div>
      )}

      {/* Selected tripulante content */}
      {selectedId && (
        <>
          {/* Summary card */}
          <SummaryCard tripulanteId={selectedId} />

          {/* Indicator cards */}
          <IndicatorCards tripulanteId={selectedId} />

          {/* Filters */}
          <div className="border border-white/[0.06] rounded-md p-4 space-y-4">
            <div className="flex items-center gap-2 text-[#9b9b9b] text-[13px] font-medium">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filtros
            </div>

            {/* Type pills */}
            <TypeFilterPills active={activeTypes} onChange={setActiveTypes} />

            {/* Date + responsavel + toggle */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="filter-date-start" className="text-xs text-[#9b9b9b]">
                  De
                </label>
                <input
                  id="filter-date-start"
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#529cca]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="filter-date-end" className="text-xs text-[#9b9b9b]">
                  Até
                </label>
                <input
                  id="filter-date-end"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#529cca]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="filter-responsavel" className="text-xs text-[#9b9b9b]">
                  Responsável
                </label>
                <select
                  id="filter-responsavel"
                  value={responsavelFilter}
                  onChange={(e) => setResponsavelFilter(e.target.value)}
                  className="bg-transparent border border-white/10 rounded px-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#529cca]"
                >
                  <option value="">Todos</option>
                  {responsaveis.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none pb-1">
                <input
                  type="checkbox"
                  checked={showAutoAlerts}
                  onChange={(e) => setShowAutoAlerts(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-transparent text-[#529cca] focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[13px] text-[#9b9b9b]">Mostrar alertas automáticos</span>
              </label>
            </div>
          </div>

          {/* Timeline */}
          <div role="feed" aria-label="Timeline de eventos" className="relative">
            {visibleEvents.length === 0 ? (
              <div className="border border-white/[0.06] rounded-md py-12 text-center">
                <p className="text-[13px] text-[#6f6f6f]">Nenhum evento encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              visibleEvents.map((event, idx) => (
                <TimelineEventCard
                  key={event.id}
                  event={event}
                  isLast={idx === visibleEvents.length - 1 && !hasMore}
                />
              ))
            )}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="inline-flex items-center gap-1.5 border border-white/10 hover:bg-white/5 text-[#e6e6e6] px-3 py-1.5 text-[13px] rounded"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  Carregar mais ({filteredEvents.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {selectedId && (
        <RegistrarEventoModal
          tripulanteId={selectedId}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
