import { useState, useEffect } from "react";
import {
  Plus,
  Image,
  Film,
  Layers,
  Smartphone,
  Search,
  X,
  Link,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/useStore";
import {
  getCriativos,
  addCriativo,
  getActiveTripulantes,
  getTripulanteById,
  getTeam,
} from "@/lib/store";
import {
  TIPO_CRIATIVO_LABELS,
  STATUS_CRIATIVO_LABELS,
  type CriativoMock,
} from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIPO_ICONS: Record<CriativoMock["tipo"], React.ElementType> = {
  imagem_estatica: Image,
  carrossel: Layers,
  video: Film,
  stories: Smartphone,
  outro: Image,
};

const STATUS_COLORS: Record<CriativoMock["status"], string> = {
  em_producao: "text-[#d79b3f]",
  aprovado: "text-[#529cca]",
  publicado: "text-[#4aa971]",
  reprovado: "text-[#e07464]",
};

type TipoFilter = CriativoMock["tipo"] | "todos";
type StatusFilter = CriativoMock["status"] | "todos";
type PeriodFilter = "esta_semana" | "este_mes" | "todos";

const INITIAL_FORM = {
  tripulanteId: "",
  data: "",
  tipo: "" as CriativoMock["tipo"] | "",
  status: "" as CriativoMock["status"] | "",
  descricao: "",
  responsavel: "",
  linkArquivo: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return date >= startOfWeek && date < endOfWeek;
}

function isThisMonth(dateStr: string): boolean {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CriativosPage() {
  useStore();
  const { profile } = useAuth();
  const team = getTeam();

  const [searchQuery, setSearchQuery] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("todos");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const allCriativos = getCriativos();
  const activeTripulantes = getActiveTripulantes();

  // Close modal on ESC
  useEffect(() => {
    if (!showModal) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowModal(false);
        setForm(INITIAL_FORM);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  // Pre-select logged-in user as responsavel when modal opens
  useEffect(() => {
    if (showModal && profile && !form.responsavel) {
      setForm((f) => ({ ...f, responsavel: profile.nome }));
    }
  }, [showModal, profile]);

  // Stats
  const stats = (() => {
    const byTipo: Record<string, number> = {
      imagem_estatica: 0,
      carrossel: 0,
      video: 0,
      stories: 0,
    };
    for (const c of allCriativos) {
      if (c.tipo in byTipo) byTipo[c.tipo]++;
    }
    return { total: allCriativos.length, byTipo };
  })();

  // Filtered + sorted criativos
  const filtered = (() => {
    let list = [...allCriativos];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const trip = getTripulanteById(c.tripulanteId);
        return trip?.name.toLowerCase().includes(q);
      });
    }

    if (tipoFilter !== "todos") {
      list = list.filter((c) => c.tipo === tipoFilter);
    }

    if (statusFilter !== "todos") {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (periodFilter === "esta_semana") {
      list = list.filter((c) => isThisWeek(c.data));
    } else if (periodFilter === "este_mes") {
      list = list.filter((c) => isThisMonth(c.data));
    }

    list.sort((a, b) => b.data.localeCompare(a.data));

    return list;
  })();

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.tripulanteId ||
      !form.data ||
      !form.tipo ||
      !form.status ||
      !form.descricao ||
      !form.responsavel
    ) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      await addCriativo({
        tripulanteId: form.tripulanteId,
        data: form.data,
        tipo: form.tipo as CriativoMock["tipo"],
        status: form.status as CriativoMock["status"],
        descricao: form.descricao,
        responsavel: form.responsavel,
        linkArquivo: form.linkArquivo,
      });
      toast.success("Criativo registrado com sucesso!");
      setForm(INITIAL_FORM);
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao registrar criativo: ${msg}`);
    }
  };

  // Backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
      setForm(INITIAL_FORM);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-white">Criativos</h1>
          <p className="text-[13px] text-[#9b9b9b] mt-1">
            Gestão de peças criativas dos tripulantes
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 bg-[#529cca] hover:bg-[#6bb1de] text-white px-3 py-1.5 text-[13px] font-medium rounded"
        >
          <Plus className="h-4 w-4" />
          Novo Criativo
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 text-[13px]">
        <span className="text-[#e6e6e6]">
          <span className="text-[#9b9b9b]">Total:</span> {stats.total}
        </span>
        {(["imagem_estatica", "carrossel", "video", "stories"] as const).map(
          (tipo) => {
            const Icon = TIPO_ICONS[tipo];
            return (
              <span
                key={tipo}
                className="inline-flex items-center gap-1.5 border border-white/10 text-[#9b9b9b] px-2 py-0.5 rounded text-xs"
              >
                <Icon className="h-3 w-3" />
                {TIPO_CRIATIVO_LABELS[tipo]}: {stats.byTipo[tipo]}
              </span>
            );
          },
        )}
      </div>

      {/* Filters row */}
      <div className="border border-white/[0.06] rounded-md p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f6f6f]" />
            <input
              type="text"
              placeholder="Buscar por tripulante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-white/10 bg-transparent py-1.5 pl-10 pr-3 text-[13px] text-white placeholder-[#6f6f6f] outline-none focus:border-[#529cca]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b9b9b] hover:text-white"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Tipo filter */}
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as TipoFilter)}
            className="rounded border border-white/10 bg-transparent px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#529cca]"
            aria-label="Filtrar por tipo"
          >
            <option value="todos">Todos os tipos</option>
            {(
              Object.keys(TIPO_CRIATIVO_LABELS) as Array<CriativoMock["tipo"]>
            ).map((key) => (
              <option key={key} value={key}>
                {TIPO_CRIATIVO_LABELS[key]}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded border border-white/10 bg-transparent px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#529cca]"
            aria-label="Filtrar por status"
          >
            <option value="todos">Todos os status</option>
            {(
              Object.keys(STATUS_CRIATIVO_LABELS) as Array<
                CriativoMock["status"]
              >
            ).map((key) => (
              <option key={key} value={key}>
                {STATUS_CRIATIVO_LABELS[key]}
              </option>
            ))}
          </select>

          {/* Period filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#9b9b9b]" />
            <select
              value={periodFilter}
              onChange={(e) =>
                setPeriodFilter(e.target.value as PeriodFilter)
              }
              className="rounded border border-white/10 bg-transparent px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#529cca]"
              aria-label="Filtrar por período"
            >
              <option value="todos">Todos os períodos</option>
              <option value="esta_semana">Esta semana</option>
              <option value="este_mes">Este mês</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gallery grid */}
      {filtered.length === 0 ? (
        <div className="border border-white/[0.06] rounded-md flex flex-col items-center justify-center py-20 text-center">
          <Image className="h-10 w-10 text-[#6f6f6f] mb-4" />
          <p className="text-[14px] font-medium text-[#9b9b9b]">
            Nenhum criativo encontrado
          </p>
          <p className="text-[13px] text-[#6f6f6f] mt-1">
            Tente ajustar os filtros ou crie um novo criativo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((criativo) => {
            const trip = getTripulanteById(criativo.tripulanteId);
            const Icon = TIPO_ICONS[criativo.tipo];
            return (
              <div
                key={criativo.id}
                className="border border-white/[0.06] rounded-md p-4"
              >
                {/* Header row: icon + tripulante name + status dot */}
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-[#6f6f6f] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-white truncate">
                        {trip?.name ?? "Tripulante desconhecido"}
                      </p>
                      <span
                        className={`text-xs font-medium ${STATUS_COLORS[criativo.status]} flex-shrink-0`}
                      >
                        ● {STATUS_CRIATIVO_LABELS[criativo.status]}
                      </span>
                    </div>
                    <p className="text-xs text-[#6f6f6f] mt-0.5">
                      {TIPO_CRIATIVO_LABELS[criativo.tipo]}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[13px] text-[#e6e6e6] leading-snug mt-3 line-clamp-2">
                  {criativo.descricao}
                </p>

                {/* Metadata row */}
                <div className="flex items-center gap-3 mt-3 text-xs text-[#6f6f6f]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateBR(criativo.data)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {criativo.responsavel}
                  </span>
                  {criativo.linkArquivo && (
                    <a
                      href={criativo.linkArquivo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#529cca] hover:text-[#6bb1de] ml-auto"
                    >
                      <Link className="h-3 w-3" />
                      Arquivo
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Novo Criativo */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Novo Criativo"
          onClick={handleBackdropClick}
        >
          <div className="bg-[#1f1f1f] border border-white/[0.08] rounded-lg w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-semibold text-white">
                Novo Criativo
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setForm(INITIAL_FORM);
                }}
                className="text-[#9b9b9b] hover:text-white"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tripulante */}
              <div>
                <label
                  htmlFor="modal-tripulante"
                  className="block text-xs text-[#9b9b9b] mb-1"
                >
                  Tripulante *
                </label>
                <select
                  id="modal-tripulante"
                  value={form.tripulanteId}
                  onChange={(e) =>
                    setForm({ ...form, tripulanteId: e.target.value })
                  }
                  className="w-full rounded border border-white/10 bg-transparent px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#529cca]"
                  required
                >
                  <option value="">Selecione...</option>
                  {activeTripulantes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div>
                <label
                  htmlFor="modal-data"
                  className="block text-xs text-[#9b9b9b] mb-1"
                >
                  Data *
                </label>
                <input
                  id="modal-data"
                  type="date"
                  value={form.data}
                  onChange={(e) =>
                    setForm({ ...form, data: e.target.value })
                  }
                  className="w-full rounded border border-white/10 bg-transparent px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#529cca]"
                  required
                />
              </div>

              {/* Tipo + Status row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="modal-tipo"
                    className="block text-xs text-[#9b9b9b] mb-1"
                  >
                    Tipo *
                  </label>
                  <select
                    id="modal-tipo"
                    value={form.tipo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tipo: e.target.value as CriativoMock["tipo"],
                      })
                    }
                    className="w-full rounded border border-white/10 bg-transparent px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#529cca]"
                    required
                  >
                    <option value="">Selecione...</option>
                    {(
                      Object.keys(TIPO_CRIATIVO_LABELS) as Array<
                        CriativoMock["tipo"]
                      >
                    ).map((key) => (
                      <option key={key} value={key}>
                        {TIPO_CRIATIVO_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="modal-status"
                    className="block text-xs text-[#9b9b9b] mb-1"
                  >
                    Status *
                  </label>
                  <select
                    id="modal-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as CriativoMock["status"],
                      })
                    }
                    className="w-full rounded border border-white/10 bg-transparent px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#529cca]"
                    required
                  >
                    <option value="">Selecione...</option>
                    {(
                      Object.keys(STATUS_CRIATIVO_LABELS) as Array<
                        CriativoMock["status"]
                      >
                    ).map((key) => (
                      <option key={key} value={key}>
                        {STATUS_CRIATIVO_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descricao */}
              <div>
                <label
                  htmlFor="modal-descricao"
                  className="block text-xs text-[#9b9b9b] mb-1"
                >
                  Descrição *
                </label>
                <textarea
                  id="modal-descricao"
                  rows={3}
                  value={form.descricao}
                  onChange={(e) =>
                    setForm({ ...form, descricao: e.target.value })
                  }
                  className="w-full rounded border border-white/10 bg-transparent px-3 py-1.5 text-[13px] text-white placeholder-[#6f6f6f] outline-none focus:border-[#529cca] resize-none"
                  placeholder="Descreva o criativo..."
                  required
                />
              </div>

              {/* Responsavel */}
              <div>
                <label
                  htmlFor="modal-responsavel"
                  className="block text-xs text-[#9b9b9b] mb-1"
                >
                  Responsável *
                </label>
                <select
                  id="modal-responsavel"
                  value={form.responsavel}
                  onChange={(e) =>
                    setForm({ ...form, responsavel: e.target.value })
                  }
                  className="w-full rounded border border-white/10 bg-transparent px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#529cca]"
                  required
                >
                  <option value="">Selecionar responsável</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.nome}>
                      {m.nome} — {m.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Link */}
              <div>
                <label
                  htmlFor="modal-link"
                  className="block text-xs text-[#9b9b9b] mb-1"
                >
                  Link do arquivo
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f6f6f]" />
                  <input
                    id="modal-link"
                    type="url"
                    value={form.linkArquivo}
                    onChange={(e) =>
                      setForm({ ...form, linkArquivo: e.target.value })
                    }
                    className="w-full rounded border border-white/10 bg-transparent py-1.5 pl-10 pr-3 text-[13px] text-white placeholder-[#6f6f6f] outline-none focus:border-[#529cca]"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setForm(INITIAL_FORM);
                  }}
                  className="border border-white/10 hover:bg-white/5 text-[#e6e6e6] px-3 py-1.5 text-[13px] rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 bg-[#529cca] hover:bg-[#6bb1de] text-white px-3 py-1.5 text-[13px] font-medium rounded"
                >
                  <Plus className="h-4 w-4" />
                  Registrar Criativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
