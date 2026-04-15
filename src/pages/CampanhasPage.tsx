import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
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
import { toast } from "sonner";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  getActiveTripulantes,
  getCampanhas,
  addCampanha,
  getTripulanteById,
  getTeam,
} from "@/lib/store";
import {
  formatCurrency,
  formatVariation,
  TIPO_CAMPANHA_LABELS,
  type CampanhaRegistro,
} from "@/lib/mock-data";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TIPO_COLORS: Record<CampanhaRegistro["tipo"], string> = {
  nova_campanha: "#529cca",
  otimizacao: "#4aa971",
  ajuste_verba: "#d79b3f",
  pausa: "#e07464",
  reativacao: "#a78bfa",
};

const TIPO_OPTIONS: CampanhaRegistro["tipo"][] = [
  "nova_campanha",
  "otimizacao",
  "ajuste_verba",
  "pausa",
  "reativacao",
];

const INITIAL_FORM = {
  data: "",
  tripulanteId: "",
  tipo: "" as CampanhaRegistro["tipo"] | "",
  descricao: "",
  responsavel: "",
  investimento: "",
  resultado: "",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getWeekRange(weeksAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const currentMonday = new Date(now);
  currentMonday.setHours(0, 0, 0, 0);
  currentMonday.setDate(now.getDate() + mondayOffset - weeksAgo * 7);

  const sunday = new Date(currentMonday);
  sunday.setDate(currentMonday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: currentMonday, end: sunday };
}

function isInRange(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(dateStr + "T12:00:00");
  return d >= start && d <= end;
}

interface WeekMetrics {
  campanhasNovas: number;
  otimizacoes: number;
  investimento: number;
}

function computeWeekMetrics(
  campanhas: CampanhaRegistro[],
  tripulanteId: string,
  weeksAgo: number,
): WeekMetrics {
  const { start, end } = getWeekRange(weeksAgo);
  const filtered = campanhas.filter(
    (c) => c.tripulanteId === tripulanteId && isInRange(c.data, start, end),
  );
  return {
    campanhasNovas: filtered.filter((c) => c.tipo === "nova_campanha").length,
    otimizacoes: filtered.filter((c) => c.tipo === "otimizacao").length,
    investimento: filtered.reduce((sum, c) => sum + c.investimento, 0),
  };
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function CampanhasPage() {
  useStore();
  const { profile } = useAuth();
  const team = getTeam();

  const [selectedTripulanteId, setSelectedTripulanteId] = useState<
    string | null
  >(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (showModal && profile && !form.responsavel) {
      setForm((f) => ({ ...f, responsavel: profile.nome }));
    }
  }, [showModal, profile, form.responsavel]);

  const selectedTripulante = selectedTripulanteId
    ? getTripulanteById(selectedTripulanteId)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.data ||
      !form.tripulanteId ||
      !form.tipo ||
      !form.descricao ||
      !form.responsavel
    ) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    try {
      await addCampanha({
        tripulanteId: form.tripulanteId,
        data: form.data,
        tipo: form.tipo as CampanhaRegistro["tipo"],
        descricao: form.descricao,
        responsavel: form.responsavel,
        investimento: form.investimento ? parseFloat(form.investimento) : 0,
        resultado: form.resultado,
      });
      toast.success("Registro criado com sucesso!");
      setForm(INITIAL_FORM);
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao criar registro: ${msg}`);
    }
  };

  const handleCloseModal = () => {
    setForm(INITIAL_FORM);
    setShowModal(false);
  };

  if (selectedTripulante && selectedTripulanteId) {
    return (
      <MicroView
        tripulanteId={selectedTripulanteId}
        onBack={() => setSelectedTripulanteId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-white">
          Campanhas e Otimizações
        </h1>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded bg-[#529cca] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#6bb1de] focus:outline-none focus:ring-2 focus:ring-[#529cca]/40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Novo Registro
        </button>
      </div>

      <MacroTable onSelect={setSelectedTripulanteId} />

      {showModal && (
        <NovoRegistroModal
          form={form}
          setForm={setForm}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          team={team}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MACRO TABLE                                                        */
/* ------------------------------------------------------------------ */

function MacroTable({ onSelect }: { onSelect: (id: string) => void }) {
  const activeTripulantes = getActiveTripulantes();
  const allCampanhas = getCampanhas();

  const rows = useMemo(() => {
    return activeTripulantes.map((t) => {
      const atual = computeWeekMetrics(allCampanhas, t.id, 0);
      const anterior = computeWeekMetrics(allCampanhas, t.id, 1);
      const variation = formatVariation(atual.investimento, anterior.investimento);
      return { tripulante: t, atual, anterior, variation };
    });
  }, [activeTripulantes, allCampanhas]);

  if (rows.length === 0) {
    return (
      <div className="border border-white/[0.06] rounded-md p-8 text-center text-[#6f6f6f] text-sm">
        Nenhum tripulante ativo encontrado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-[#6f6f6f]">
            <th scope="col" className="px-3 py-2 font-medium">
              Tripulante
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-center">
              Campanhas
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-center">
              Otimizações
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-right">
              Investimento
            </th>
            <th scope="col" className="px-3 py-2 font-medium text-right">
              Variação
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ tripulante, atual, variation }) => (
            <tr
              key={tripulante.id}
              tabIndex={0}
              role="button"
              aria-label={`Ver detalhes de ${tripulante.name}`}
              onClick={() => onSelect(tripulante.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(tripulante.id);
                }
              }}
              className="cursor-pointer border-t border-white/[0.06] hover:bg-white/[0.02] focus:bg-white/[0.02] focus:outline-none"
            >
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.06] text-[11px] font-medium text-[#9b9b9b]">
                    {tripulante.avatar}
                  </span>
                  <div>
                    <p className="text-[13px] text-[#e6e6e6]">
                      {tripulante.name}
                    </p>
                    <p className="text-xs text-[#6f6f6f]">
                      {tripulante.loja}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-center text-[#e6e6e6]">
                {atual.campanhasNovas}
              </td>
              <td className="px-3 py-2.5 text-center text-[#e6e6e6]">
                {atual.otimizacoes}
              </td>
              <td className="px-3 py-2.5 text-right text-[#e6e6e6]">
                {formatCurrency(atual.investimento)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <VariationText variation={variation} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VARIATION TEXT                                                     */
/* ------------------------------------------------------------------ */

function VariationText({
  variation,
}: {
  variation: { value: string; positive: boolean; neutral: boolean };
}) {
  if (variation.neutral) {
    return (
      <span className="text-[13px] text-[#6f6f6f]">— {variation.value}</span>
    );
  }
  if (variation.positive) {
    return (
      <span className="text-[13px] text-[#4aa971]">↑ {variation.value}</span>
    );
  }
  return (
    <span className="text-[13px] text-[#e07464]">↓ {variation.value}</span>
  );
}

/* ------------------------------------------------------------------ */
/*  MICRO VIEW                                                         */
/* ------------------------------------------------------------------ */

function MicroView({
  tripulanteId,
  onBack,
}: {
  tripulanteId: string;
  onBack: () => void;
}) {
  useStore();

  const tripulante = getTripulanteById(tripulanteId)!;
  const allCampanhas = getCampanhas();

  const atual = computeWeekMetrics(allCampanhas, tripulanteId, 0);
  const anterior = computeWeekMetrics(allCampanhas, tripulanteId, 1);

  const tripulanteCampanhas = useMemo(
    () =>
      allCampanhas
        .filter((c) => c.tripulanteId === tripulanteId)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [allCampanhas, tripulanteId],
  );

  const chartData = [
    {
      nome: "Campanhas",
      atual: atual.campanhasNovas,
      anterior: anterior.campanhasNovas,
    },
    {
      nome: "Otimizações",
      atual: atual.otimizacoes,
      anterior: anterior.otimizacoes,
    },
    {
      nome: "Investimento",
      atual: atual.investimento,
      anterior: anterior.investimento,
    },
  ];

  const comparisonRows = [
    {
      label: "Campanhas Novas",
      atual: atual.campanhasNovas,
      anterior: anterior.campanhasNovas,
      isCurrency: false,
    },
    {
      label: "Otimizações",
      atual: atual.otimizacoes,
      anterior: anterior.otimizacoes,
      isCurrency: false,
    },
    {
      label: "Investimento",
      atual: atual.investimento,
      anterior: anterior.investimento,
      isCurrency: true,
    },
    {
      label: "Total de Ações",
      atual: atual.campanhasNovas + atual.otimizacoes,
      anterior: anterior.campanhasNovas + anterior.otimizacoes,
      isCurrency: false,
    },
  ];

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-[#9b9b9b] hover:text-white focus:outline-none"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Voltar
      </button>

      <header>
        <h1 className="text-[22px] font-semibold text-white">
          {tripulante.name}
        </h1>
        <p className="text-[13px] text-[#9b9b9b]">{tripulante.loja}</p>
      </header>

      {/* Comparison table */}
      <section aria-label="Métricas comparativas">
        <h2 className="mb-3 text-[14px] font-semibold text-white">
          Comparativo
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-[#6f6f6f]">
                <th className="px-3 py-2 font-medium">Métrica</th>
                <th className="px-3 py-2 font-medium text-right">Anterior</th>
                <th className="px-3 py-2 font-medium text-right">Atual</th>
                <th className="px-3 py-2 font-medium text-right">Variação</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => {
                const variation = formatVariation(row.atual, row.anterior);
                return (
                  <tr
                    key={row.label}
                    className="border-t border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2.5 text-[13px] text-[#e6e6e6]">
                      {row.label}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] text-[#9b9b9b]">
                      {row.isCurrency
                        ? formatCurrency(row.anterior)
                        : row.anterior}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] text-white">
                      {row.isCurrency ? formatCurrency(row.atual) : row.atual}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <VariationText variation={variation} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bar chart */}
      <section aria-label="Gráfico comparativo semanal">
        <h2 className="mb-3 text-[14px] font-semibold text-white">
          Comparativo Semanal
        </h2>
        <div className="h-64 border border-white/[0.06] rounded-md p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="nome"
                tick={{ fill: "#9b9b9b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#9b9b9b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.02)" }}
                contentStyle={{
                  backgroundColor: "#1f1f1f",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ color: "#9b9b9b", fontSize: 11 }} />
              <Bar
                dataKey="atual"
                name="Semana Atual"
                fill="#529cca"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="anterior"
                name="Semana Anterior"
                fill="#6f6f6f"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Timeline */}
      <section aria-label="Histórico de ações">
        <h2 className="mb-3 text-[14px] font-semibold text-white">
          Histórico de Ações
        </h2>
        {tripulanteCampanhas.length === 0 ? (
          <p className="text-[13px] text-[#6f6f6f]">
            Nenhum registro encontrado para este tripulante.
          </p>
        ) : (
          <ul className="space-y-0">
            {tripulanteCampanhas.map((c) => (
              <li
                key={c.id}
                className="flex gap-3 border-t border-white/[0.06] py-3 first:border-t-0"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: TIPO_COLORS[c.tipo] }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <time
                      dateTime={c.data}
                      className="text-xs text-[#6f6f6f]"
                    >
                      {new Date(c.data + "T00:00:00").toLocaleDateString(
                        "pt-BR",
                      )}
                    </time>
                    <span
                      className="text-xs font-medium"
                      style={{ color: TIPO_COLORS[c.tipo] }}
                    >
                      {TIPO_CAMPANHA_LABELS[c.tipo]}
                    </span>
                    {c.investimento > 0 && (
                      <span className="text-xs text-[#4aa971]">
                        {formatCurrency(c.investimento)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-[#e6e6e6]">
                    {c.descricao}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-[#6f6f6f]">
                    <span>{c.responsavel}</span>
                    {c.resultado && <span>· {c.resultado}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NOVO REGISTRO MODAL                                                */
/* ------------------------------------------------------------------ */

function NovoRegistroModal({
  form,
  setForm,
  onClose,
  onSubmit,
  team,
}: {
  form: typeof INITIAL_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof INITIAL_FORM>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  team: { id: string; nome: string; role: string }[];
}) {
  const activeTripulantes = getActiveTripulantes();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Novo registro de campanha"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#1f1f1f] border border-white/[0.08] rounded-lg w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-white">
            Novo Registro
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="rounded p-1 text-[#9b9b9b] hover:bg-white/5 hover:text-white focus:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reg-data"
              className="mb-1 block text-xs text-[#9b9b9b]"
            >
              Data
            </label>
            <input
              id="reg-data"
              type="date"
              required
              value={form.data}
              onChange={(e) =>
                setForm((f) => ({ ...f, data: e.target.value }))
              }
            />
          </div>

          <div>
            <label
              htmlFor="reg-tripulante"
              className="mb-1 block text-xs text-[#9b9b9b]"
            >
              Tripulante
            </label>
            <select
              id="reg-tripulante"
              required
              value={form.tripulanteId}
              onChange={(e) =>
                setForm((f) => ({ ...f, tripulanteId: e.target.value }))
              }
            >
              <option value="" disabled>
                Selecione...
              </option>
              {activeTripulantes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="reg-tipo"
              className="mb-1 block text-xs text-[#9b9b9b]"
            >
              Tipo
            </label>
            <select
              id="reg-tipo"
              required
              value={form.tipo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tipo: e.target.value as CampanhaRegistro["tipo"],
                }))
              }
            >
              <option value="" disabled>
                Selecione...
              </option>
              {TIPO_OPTIONS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TIPO_CAMPANHA_LABELS[tipo]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="reg-descricao"
              className="mb-1 block text-xs text-[#9b9b9b]"
            >
              Descrição
            </label>
            <textarea
              id="reg-descricao"
              required
              rows={3}
              value={form.descricao}
              onChange={(e) =>
                setForm((f) => ({ ...f, descricao: e.target.value }))
              }
              placeholder="Descreva a ação..."
            />
          </div>

          <div>
            <label
              htmlFor="reg-responsavel"
              className="mb-1 block text-xs text-[#9b9b9b]"
            >
              Responsável
            </label>
            <select
              id="reg-responsavel"
              required
              value={form.responsavel}
              onChange={(e) =>
                setForm((f) => ({ ...f, responsavel: e.target.value }))
              }
            >
              <option value="" disabled>
                Selecionar responsável
              </option>
              {team.map((m) => (
                <option key={m.id} value={m.nome}>
                  {m.nome} — {m.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="reg-investimento"
              className="mb-1 block text-xs text-[#9b9b9b]"
            >
              Investimento (R$)
            </label>
            <input
              id="reg-investimento"
              type="number"
              min="0"
              step="0.01"
              value={form.investimento}
              onChange={(e) =>
                setForm((f) => ({ ...f, investimento: e.target.value }))
              }
              placeholder="0,00"
            />
          </div>

          <div>
            <label
              htmlFor="reg-resultado"
              className="mb-1 block text-xs text-[#9b9b9b]"
            >
              Resultado
            </label>
            <input
              id="reg-resultado"
              type="text"
              value={form.resultado}
              onChange={(e) =>
                setForm((f) => ({ ...f, resultado: e.target.value }))
              }
              placeholder="Ex: CPL caiu de R$18 para R$12"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-white/10 hover:bg-white/5 text-[#e6e6e6] px-3 py-1.5 text-[13px] rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#529cca] hover:bg-[#6bb1de] text-white px-3 py-1.5 text-[13px] font-medium rounded"
            >
              Criar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
