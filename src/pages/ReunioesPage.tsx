import { useState, useEffect } from "react";
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  getReunioes,
  addReuniao,
  updateReuniao,
  getActiveTripulantes,
  getTripulanteById,
  getTeam,
} from "@/lib/store";
import {
  ANIMO_LABELS,
  ANIMO_EMOJIS,
  formatCurrency,
  type ReuniaoMock,
} from "@/lib/mock-data";

type FilterTab = "todas" | "realizada" | "agendada" | "cancelada";

const STATUS_STYLES: Record<
  ReuniaoMock["status"],
  { color: string; label: string }
> = {
  realizada: { color: "#4aa971", label: "Realizada" },
  agendada: { color: "#529cca", label: "Agendada" },
  cancelada: { color: "#e07464", label: "Cancelada" },
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "realizada", label: "Realizadas" },
  { key: "agendada", label: "Agendadas" },
  { key: "cancelada", label: "Canceladas" },
];

const ANIMO_OPTIONS: ReuniaoMock["animo"][] = [
  "muito_bem",
  "bem",
  "neutro",
  "desmotivado",
  "critico",
];

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function getResponsavelNameById(id: string): string {
  const member = getTeam().find((t) => t.id === id);
  return member?.nome ?? "Desconhecido";
}

// ── Reuniao Card ──────────────────────────────────────────────

interface ReuniaoCardProps {
  reuniao: ReuniaoMock;
  isExpanded: boolean;
  onToggle: () => void;
}

function ReuniaoCard({ reuniao, isExpanded, onToggle }: ReuniaoCardProps) {
  const tripulante = getTripulanteById(reuniao.tripulanteId);
  const responsavelName = getResponsavelNameById(reuniao.tenenteId);
  const statusStyle = STATUS_STYLES[reuniao.status];
  const isRealizada = reuniao.status === "realizada";

  function handleTranscricaoBlur(value: string) {
    if (value !== reuniao.transcricao) {
      updateReuniao(reuniao.id, { transcricao: value });
      toast.success("Transcrição atualizada com sucesso!");
    }
  }

  function handleDocLinkSave(value: string) {
    const trimmed = value.trim();
    if (trimmed && trimmed !== reuniao.linkDocumento) {
      updateReuniao(reuniao.id, { linkDocumento: trimmed });
      toast.success("Link salvo com sucesso!");
    }
  }

  return (
    <div className="border-t border-white/[0.06]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-white/[0.02] focus:bg-white/[0.02] focus:outline-none"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
          <span
            className="text-xs font-medium"
            style={{ color: statusStyle.color }}
          >
            ● {statusStyle.label}
          </span>

          <span className="text-[13px] text-[#9b9b9b]">
            {formatDateBR(reuniao.data)} · {reuniao.horario}
          </span>

          <span className="text-[13px] text-[#e6e6e6]">
            {tripulante?.name ?? "—"}
          </span>

          <span className="text-[13px] text-[#6f6f6f]">
            {tripulante?.loja ?? ""}
          </span>

          <span className="text-[13px] text-[#6f6f6f]">
            Responsável: {responsavelName}
          </span>
        </div>

        <span className="shrink-0 text-[#6f6f6f]">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-5 pb-4 pl-4">
          {/* Transcricao */}
          <div>
            <h4 className="mb-1.5 text-xs uppercase tracking-wider text-[#6f6f6f]">
              Transcrição
            </h4>
            {isRealizada ? (
              <textarea
                defaultValue={reuniao.transcricao || ""}
                placeholder="Adicionar transcrição..."
                onBlur={(e) => handleTranscricaoBlur(e.target.value)}
                rows={4}
                aria-label="Transcrição da reunião"
              />
            ) : (
              <p className="text-[13px] text-[#9b9b9b]">
                {reuniao.transcricao || "Sem transcrição registrada."}
              </p>
            )}
          </div>

          {/* Link Documento */}
          <div>
            <h4 className="mb-1.5 text-xs uppercase tracking-wider text-[#6f6f6f]">
              Link do Documento
            </h4>
            {reuniao.linkDocumento ? (
              <a
                href={reuniao.linkDocumento}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#529cca] hover:underline"
              >
                {reuniao.linkDocumento}
              </a>
            ) : (
              <input
                type="url"
                placeholder="Colar link do documento..."
                onBlur={(e) => handleDocLinkSave(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDocLinkSave(e.currentTarget.value);
                  }
                }}
                aria-label="Colar link do documento"
              />
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            <span className="text-[#e6e6e6]">
              {ANIMO_EMOJIS[reuniao.animo]}{" "}
              <span className="text-[#9b9b9b]">
                {ANIMO_LABELS[reuniao.animo]}
              </span>
            </span>

            <span
              className="font-medium"
              style={{
                color: reuniao.produtiva ? "#4aa971" : "#e07464",
              }}
            >
              ● {reuniao.produtiva ? "Produtiva" : "Não produtiva"}
            </span>

            <span
              className="font-medium"
              style={{
                color:
                  reuniao.vendasDeclaradas && reuniao.valorVendas !== null
                    ? "#4aa971"
                    : "#6f6f6f",
              }}
            >
              ●{" "}
              {reuniao.vendasDeclaradas && reuniao.valorVendas !== null
                ? `Vendas: ${formatCurrency(reuniao.valorVendas)}`
                : "Vendas não declaradas"}
            </span>

            <span
              className="font-medium"
              style={{
                color: reuniao.diagnosticoBussola ? "#4aa971" : "#6f6f6f",
              }}
            >
              ●{" "}
              {reuniao.diagnosticoBussola
                ? "Diagnóstico Bússola realizado"
                : "Diagnóstico Bússola pendente"}
            </span>
          </div>

          {/* Observacoes */}
          {reuniao.observacoes && (
            <div>
              <h4 className="mb-1.5 text-xs uppercase tracking-wider text-[#6f6f6f]">
                Observações
              </h4>
              <p className="text-[13px] leading-relaxed text-[#e6e6e6]">
                {reuniao.observacoes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function ReunioesPage() {
  useStore();
  const { profile } = useAuth();
  const team = getTeam();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("todas");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    data: "",
    horario: "",
    tripulanteId: "",
    tenenteId: "",
    status: "agendada" as ReuniaoMock["status"],
    animo: "neutro" as ReuniaoMock["animo"],
    produtiva: false,
    vendasDeclaradas: false,
    valorVendas: "",
    diagnosticoBussola: false,
    transcricao: "",
    observacoes: "",
  });

  // ESC to close modal
  useEffect(() => {
    if (!isModalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsModalOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  // Pre-select current user as responsável when opening modal
  useEffect(() => {
    if (isModalOpen && profile && !formData.tenenteId) {
      setFormData((prev) => ({ ...prev, tenenteId: profile.id }));
    }
  }, [isModalOpen, profile, formData.tenenteId]);

  const allReunioes = getReunioes();

  const filtered =
    activeFilter === "todas"
      ? allReunioes
      : allReunioes.filter((r) => r.status === activeFilter);

  const proximas = filtered
    .filter((r) => r.status === "agendada")
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario),
    );

  const historico = filtered
    .filter((r) => r.status === "realizada" || r.status === "cancelada")
    .sort(
      (a, b) =>
        b.data.localeCompare(a.data) || b.horario.localeCompare(a.horario),
    );

  const hasResults = proximas.length > 0 || historico.length > 0;

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function resetForm() {
    setFormData({
      data: "",
      horario: "",
      tripulanteId: "",
      tenenteId: "",
      status: "agendada",
      animo: "neutro",
      produtiva: false,
      vendasDeclaradas: false,
      valorVendas: "",
      diagnosticoBussola: false,
      transcricao: "",
      observacoes: "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !formData.data ||
      !formData.horario ||
      !formData.tripulanteId ||
      !formData.tenenteId
    ) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const isRealizada = formData.status === "realizada";

    const valorVendasNum =
      isRealizada && formData.vendasDeclaradas && formData.valorVendas
        ? parseFloat(formData.valorVendas.replace(",", "."))
        : null;

    if (
      isRealizada &&
      formData.vendasDeclaradas &&
      (valorVendasNum === null || isNaN(valorVendasNum))
    ) {
      toast.error("Informe um valor de vendas válido.");
      return;
    }

    addReuniao({
      tripulanteId: formData.tripulanteId,
      tenenteId: formData.tenenteId,
      data: formData.data,
      horario: formData.horario,
      status: formData.status,
      animo: isRealizada ? formData.animo : "neutro",
      produtiva: isRealizada ? formData.produtiva : false,
      vendasDeclaradas: isRealizada ? formData.vendasDeclaradas : false,
      valorVendas: isRealizada ? valorVendasNum : null,
      diagnosticoBussola: isRealizada ? formData.diagnosticoBussola : false,
      transcricao: isRealizada ? formData.transcricao : "",
      observacoes: isRealizada ? formData.observacoes : "",
      linkDocumento: "",
    });

    toast.success("Reunião criada com sucesso!");
    setIsModalOpen(false);
    resetForm();
  }

  function updateField<K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  const activeTripulantes = getActiveTripulantes();
  const isFormRealizada = formData.status === "realizada";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-white">Reuniões</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded bg-[#529cca] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#6bb1de] focus:outline-none focus:ring-2 focus:ring-[#529cca]/40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Nova Reunião
        </button>
      </header>

      {/* Filter Tabs */}
      <nav aria-label="Filtros de reuniões">
        <ul className="flex gap-1" role="tablist">
          {FILTER_TABS.map((tab) => (
            <li key={tab.key} role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={activeFilter === tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  "rounded px-2.5 py-1 text-[13px] transition-colors focus:outline-none",
                  activeFilter === tab.key
                    ? "bg-white/[0.08] text-white"
                    : "text-[#9b9b9b] hover:bg-white/5 hover:text-white",
                )}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Empty state */}
      {!hasResults && (
        <p className="py-12 text-center text-[13px] text-[#6f6f6f]">
          Nenhuma reunião encontrada para este filtro.
        </p>
      )}

      {/* Proximas Reunioes */}
      {proximas.length > 0 && (
        <section aria-labelledby="proximas-heading">
          <h2
            id="proximas-heading"
            className="mb-2 text-[14px] font-semibold text-white"
          >
            Próximas Reuniões
          </h2>
          <div>
            {proximas.map((r) => (
              <ReuniaoCard
                key={r.id}
                reuniao={r}
                isExpanded={expandedId === r.id}
                onToggle={() => handleToggle(r.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Historico */}
      {historico.length > 0 && (
        <section aria-labelledby="historico-heading">
          <h2
            id="historico-heading"
            className="mb-2 text-[14px] font-semibold text-white"
          >
            Histórico
          </h2>
          <div>
            {historico.map((r) => (
              <ReuniaoCard
                key={r.id}
                reuniao={r}
                isExpanded={expandedId === r.id}
                onToggle={() => handleToggle(r.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modal Nova Reuniao */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-[#1f1f1f] border border-white/[0.08] rounded-lg w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="modal-title"
                className="text-[16px] font-semibold text-white"
              >
                Nova Reunião
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-[#9b9b9b] hover:bg-white/5 hover:text-white focus:outline-none"
                aria-label="Fechar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="reuniao-data"
                  className="mb-1 block text-xs text-[#9b9b9b]"
                >
                  Data
                </label>
                <input
                  id="reuniao-data"
                  type="date"
                  required
                  value={formData.data}
                  onChange={(e) => updateField("data", e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="reuniao-horario"
                  className="mb-1 block text-xs text-[#9b9b9b]"
                >
                  Horário
                </label>
                <input
                  id="reuniao-horario"
                  type="time"
                  required
                  value={formData.horario}
                  onChange={(e) => updateField("horario", e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="reuniao-tripulante"
                  className="mb-1 block text-xs text-[#9b9b9b]"
                >
                  Tripulante
                </label>
                <select
                  id="reuniao-tripulante"
                  required
                  value={formData.tripulanteId}
                  onChange={(e) => updateField("tripulanteId", e.target.value)}
                >
                  <option value="" disabled>
                    Selecionar tripulante
                  </option>
                  {activeTripulantes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.loja}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reuniao-tenente"
                  className="mb-1 block text-xs text-[#9b9b9b]"
                >
                  Responsável
                </label>
                <select
                  id="reuniao-tenente"
                  required
                  value={formData.tenenteId}
                  onChange={(e) => updateField("tenenteId", e.target.value)}
                >
                  <option value="" disabled>
                    Selecionar responsável
                  </option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} — {m.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reuniao-status"
                  className="mb-1 block text-xs text-[#9b9b9b]"
                >
                  Status
                </label>
                <select
                  id="reuniao-status"
                  required
                  value={formData.status}
                  onChange={(e) =>
                    updateField(
                      "status",
                      e.target.value as ReuniaoMock["status"],
                    )
                  }
                >
                  <option value="agendada">Agendada</option>
                  <option value="realizada">Realizada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              {/* Extra fields for "realizada" */}
              {isFormRealizada && (
                <div className="space-y-4 border-t border-white/[0.06] pt-4">
                  <div>
                    <label
                      htmlFor="reuniao-animo"
                      className="mb-1 block text-xs text-[#9b9b9b]"
                    >
                      Ânimo do Tripulante
                    </label>
                    <select
                      id="reuniao-animo"
                      value={formData.animo}
                      onChange={(e) =>
                        updateField(
                          "animo",
                          e.target.value as ReuniaoMock["animo"],
                        )
                      }
                    >
                      {ANIMO_OPTIONS.map((key) => (
                        <option key={key} value={key}>
                          {ANIMO_EMOJIS[key]} {ANIMO_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#e6e6e6]">
                      Produtiva?
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.produtiva}
                      onClick={() =>
                        updateField("produtiva", !formData.produtiva)
                      }
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus:outline-none",
                        formData.produtiva
                          ? "bg-[#4aa971]"
                          : "bg-white/[0.08]",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white transition-transform",
                          formData.produtiva
                            ? "translate-x-4"
                            : "translate-x-0.5",
                        )}
                        style={{ marginTop: 1 }}
                      />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#e6e6e6]">
                        Declarou vendas?
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.vendasDeclaradas}
                        onClick={() =>
                          updateField(
                            "vendasDeclaradas",
                            !formData.vendasDeclaradas,
                          )
                        }
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus:outline-none",
                          formData.vendasDeclaradas
                            ? "bg-[#4aa971]"
                            : "bg-white/[0.08]",
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white transition-transform",
                            formData.vendasDeclaradas
                              ? "translate-x-4"
                              : "translate-x-0.5",
                          )}
                          style={{ marginTop: 1 }}
                        />
                      </button>
                    </div>

                    {formData.vendasDeclaradas && (
                      <div>
                        <label
                          htmlFor="reuniao-vendas-valor"
                          className="mb-1 block text-xs text-[#9b9b9b]"
                        >
                          Valor das Vendas (R$)
                        </label>
                        <input
                          id="reuniao-vendas-valor"
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={formData.valorVendas}
                          onChange={(e) =>
                            updateField("valorVendas", e.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#e6e6e6]">
                      Diagnóstico Bússola realizado?
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.diagnosticoBussola}
                      onClick={() =>
                        updateField(
                          "diagnosticoBussola",
                          !formData.diagnosticoBussola,
                        )
                      }
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus:outline-none",
                        formData.diagnosticoBussola
                          ? "bg-[#4aa971]"
                          : "bg-white/[0.08]",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white transition-transform",
                          formData.diagnosticoBussola
                            ? "translate-x-4"
                            : "translate-x-0.5",
                        )}
                        style={{ marginTop: 1 }}
                      />
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="reuniao-transcricao"
                      className="mb-1 block text-xs text-[#9b9b9b]"
                    >
                      Transcrição
                    </label>
                    <textarea
                      id="reuniao-transcricao"
                      rows={4}
                      placeholder="Resumo da reunião..."
                      value={formData.transcricao}
                      onChange={(e) =>
                        updateField("transcricao", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reuniao-observacoes"
                      className="mb-1 block text-xs text-[#9b9b9b]"
                    >
                      Observações
                    </label>
                    <textarea
                      id="reuniao-observacoes"
                      rows={3}
                      placeholder="Observações adicionais..."
                      value={formData.observacoes}
                      onChange={(e) =>
                        updateField("observacoes", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border border-white/10 hover:bg-white/5 text-[#e6e6e6] px-3 py-1.5 text-[13px] rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#529cca] hover:bg-[#6bb1de] text-white px-3 py-1.5 text-[13px] font-medium rounded"
                >
                  Criar Reunião
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
