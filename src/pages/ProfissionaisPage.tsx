import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  fetchProfissionais,
  fetchHistoricoProfissional,
  type ProfissionalCompleto,
  type HistoricoAcao,
} from "@/lib/store";
import { ROLE_LABELS_SHORT, type UserRole } from "@/lib/auth-types";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 12;

const ROLE_OPTIONS: { value: "todos" | UserRole; label: string }[] = [
  { value: "todos", label: "Todos os cargos" },
  { value: "almirante", label: "Almirante" },
  { value: "capitao", label: "Capitão" },
  { value: "tenente", label: "Tenente" },
  { value: "cabo", label: "Cabo" },
];

const STATUS_OPTIONS: { value: "todos" | "aprovado" | "pendente"; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "aprovado", label: "Aprovado" },
  { value: "pendente", label: "Pendente" },
];

const TIPO_OPTIONS: { value: "todos" | HistoricoAcao["tipo"]; label: string }[] = [
  { value: "todos", label: "Todos os tipos" },
  { value: "tripulante_criado", label: "Tripulante criado" },
  { value: "tripulante_editado", label: "Tripulante editado" },
  { value: "reuniao", label: "Reunião" },
  { value: "campanha", label: "Campanha" },
  { value: "criativo", label: "Criativo" },
  { value: "observacao", label: "Observação" },
  { value: "evento_manual", label: "Evento manual" },
];

const TIPO_DOT_COLOR: Record<HistoricoAcao["tipo"], string> = {
  tripulante_criado: "bg-[#529cca]",
  tripulante_editado: "bg-[#d79b3f]",
  reuniao: "bg-cyan-400",
  campanha: "bg-yellow-400",
  criativo: "bg-purple-400",
  observacao: "bg-[#9b9b9b]",
  evento_manual: "bg-[#4aa971]",
};

function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<ProfissionalCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCargo, setFiltroCargo] = useState<"todos" | UserRole>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "aprovado" | "pendente">("todos");
  const [page, setPage] = useState(1);
  const [selecionado, setSelecionado] = useState<ProfissionalCompleto | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProfissionais()
      .then((data) => {
        if (active) setProfissionais(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Erro ao carregar profissionais");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return profissionais.filter((p) => {
      if (filtroCargo !== "todos" && p.role !== filtroCargo) return false;
      if (filtroStatus === "aprovado" && !p.approved) return false;
      if (filtroStatus === "pendente" && p.approved) return false;
      if (termo) {
        const nome = (p.nome ?? "").toLowerCase();
        const email = (p.email ?? "").toLowerCase();
        if (!nome.includes(termo) && !email.includes(termo)) return false;
      }
      return true;
    });
  }, [profissionais, busca, filtroCargo, filtroStatus]);

  useEffect(() => {
    setPage(1);
  }, [busca, filtroCargo, filtroStatus]);

  const total = filtrados.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageItems = filtrados.slice(start, end);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-white">Profissionais</h1>
          <p className="text-sm text-[#9b9b9b]">Diretório da equipe do Instituto Veon</p>
        </div>
        <div className="text-xs text-[#9b9b9b]">{profissionais.length} profissionais</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6f6f6f]" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou email"
            className="w-full bg-[#1f1f1f] border border-white/[0.06] rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#6f6f6f] focus:outline-none focus:border-white/[0.12]"
            aria-label="Buscar profissional"
          />
        </div>
        <select
          value={filtroCargo}
          onChange={(e) => setFiltroCargo(e.target.value as "todos" | UserRole)}
          className="bg-[#1f1f1f] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/[0.12]"
          aria-label="Filtrar por cargo"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as "todos" | "aprovado" | "pendente")}
          className="bg-[#1f1f1f] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/[0.12]"
          aria-label="Filtrar por status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-[#9b9b9b] py-12 text-center">Carregando profissionais...</div>
      ) : pageItems.length === 0 ? (
        <div className="text-sm text-[#9b9b9b] py-12 text-center">Nenhum profissional encontrado</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelecionado(p)}
              className="text-left border border-white/[0.06] rounded-md p-4 bg-transparent hover:bg-white/[0.02] transition-colors focus:outline-none focus:border-white/[0.12]"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-white/5 text-[#9b9b9b] flex items-center justify-center text-sm font-medium shrink-0">
                  {p.avatar_iniciais || (p.nome?.slice(0, 2).toUpperCase() ?? "??")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white truncate">{p.nome || "(sem nome)"}</div>
                  <div className="text-xs text-[#9b9b9b]">{ROLE_LABELS_SHORT[p.role as UserRole] ?? p.role}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span
                  className={
                    "text-xs " + (p.approved ? "text-[#4aa971]" : "text-[#d79b3f]")
                  }
                >
                  ● {p.approved ? "Aprovado" : "Pendente"}
                </span>
                <span className="text-xs text-[#6f6f6f]">Desde {formatDate(p.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-xs text-[#9b9b9b]">
          <div>
            {start + 1}-{end} de {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 border border-white/[0.06] rounded-md text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.02]"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 border border-white/[0.06] rounded-md text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.02]"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {selecionado && (
        <ProfissionalModal
          profissional={selecionado}
          onClose={() => setSelecionado(null)}
        />
      )}
    </div>
  );
}

interface ProfissionalModalProps {
  profissional: ProfissionalCompleto;
  onClose: () => void;
}

function ProfissionalModal({ profissional, onClose }: ProfissionalModalProps) {
  const [historico, setHistorico] = useState<HistoricoAcao[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [filtroTrip, setFiltroTrip] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | HistoricoAcao["tipo"]>("todos");

  useEffect(() => {
    setFiltroTrip("todos");
    setFiltroTipo("todos");
    setLoadingHist(true);
    let active = true;
    fetchHistoricoProfissional(profissional.id)
      .then((data) => {
        if (active) setHistorico(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Erro ao carregar histórico");
      })
      .finally(() => {
        if (active) setLoadingHist(false);
      });
    return () => {
      active = false;
    };
  }, [profissional.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tripulantesUnicos = useMemo(() => {
    const map = new Map<string, string>();
    historico.forEach((h) => {
      if (h.tripulanteId && h.tripulanteNome) {
        map.set(h.tripulanteId, h.tripulanteNome);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [historico]);

  const historicoFiltrado = useMemo(() => {
    return historico.filter((h) => {
      if (filtroTipo !== "todos" && h.tipo !== filtroTipo) return false;
      if (filtroTrip !== "todos" && h.tripulanteId !== filtroTrip) return false;
      return true;
    });
  }, [historico, filtroTipo, filtroTrip]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do profissional"
        className="bg-[#1f1f1f] border border-white/[0.08] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-[#9b9b9b] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="h-[60px] w-[60px] rounded-full bg-white/5 text-[#9b9b9b] flex items-center justify-center text-lg font-medium shrink-0">
            {profissional.avatar_iniciais || (profissional.nome?.slice(0, 2).toUpperCase() ?? "??")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold text-white">{profissional.nome || "(sem nome)"}</div>
            <div className="mt-1 flex items-center gap-3 text-xs">
              <span className="text-[#9b9b9b]">{ROLE_LABELS_SHORT[profissional.role as UserRole] ?? profissional.role}</span>
              <span className={profissional.approved ? "text-[#4aa971]" : "text-[#d79b3f]"}>
                ● {profissional.approved ? "Aprovado" : "Pendente"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div>
            <span className="text-[#6f6f6f] text-xs">Email</span>
            <div className="text-white">{profissional.email || "—"}</div>
          </div>
          {profissional.observacao_funcao && (
            <div>
              <span className="text-[#6f6f6f] text-xs">Observação da função</span>
              <div className="text-white whitespace-pre-wrap">{profissional.observacao_funcao}</div>
            </div>
          )}
          <div>
            <span className="text-[#6f6f6f] text-xs">Cadastrado em</span>
            <div className="text-white">{formatDate(profissional.created_at)}</div>
          </div>
        </div>

        <div className="mt-6 border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Histórico de Ações</h2>
            <span className="text-xs text-[#9b9b9b]">{historico.length} no total</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={filtroTrip}
              onChange={(e) => setFiltroTrip(e.target.value)}
              className="bg-[#191919] border border-white/[0.06] rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/[0.12]"
              aria-label="Filtrar por tripulante"
            >
              <option value="todos">Todos os tripulantes</option>
              {tripulantesUnicos.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as "todos" | HistoricoAcao["tipo"])}
              className="bg-[#191919] border border-white/[0.06] rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/[0.12]"
              aria-label="Filtrar por tipo de ação"
            >
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {loadingHist ? (
            <div className="text-sm text-[#9b9b9b] py-8 text-center">Carregando histórico...</div>
          ) : historicoFiltrado.length === 0 ? (
            <div className="text-sm text-[#9b9b9b] py-8 text-center">
              {historico.length === 0 ? "Sem ações registradas ainda" : "Nenhuma ação corresponde aos filtros"}
            </div>
          ) : (
            <div>
              {historicoFiltrado.map((acao, idx) => (
                <div
                  key={acao.id}
                  className={
                    "flex gap-3 py-3 " +
                    (idx > 0 ? "border-t border-white/[0.06]" : "")
                  }
                >
                  <div className="pt-1.5 shrink-0">
                    <span
                      className={"inline-block h-2 w-2 rounded-full " + TIPO_DOT_COLOR[acao.tipo]}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-[13px]">{acao.descricao}</div>
                    {acao.tripulanteNome && (
                      <div className="text-xs text-[#9b9b9b] mt-0.5">
                        Tripulante: {acao.tripulanteNome}
                      </div>
                    )}
                    {acao.detalhes && (
                      <div className="text-xs text-[#6f6f6f] mt-0.5">
                        {truncate(acao.detalhes)}
                      </div>
                    )}
                    <div className="text-xs text-[#6f6f6f] mt-0.5">
                      {formatDistanceToNow(new Date(acao.data), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
