import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  X,
  Phone,
  Mail,
  User,
  CalendarDays,
  FileText,
  Handshake,
  DollarSign,
  Palette,
  Upload,
  Table,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/hooks/useStore";
import {
  getTripulantes,
  addTripulante,
  addObservacao,
  deleteTripulante,
  updateTripulante,
  computeKPIs,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/mock-data";
import type { TripulanteMock } from "@/lib/mock-data";

const PLANOS = ["Plano Completo", "Plano Essencial"];

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

interface NewTripulanteForm {
  name: string;
  loja: string;
  cidade: string;
  uf: string;
  phone: string;
  email: string;
  tenente: string;
  plano: string;
}

const EMPTY_FORM: NewTripulanteForm = {
  name: "",
  loja: "",
  cidade: "",
  uf: "",
  phone: "",
  email: "",
  tenente: "",
  plano: "",
};

interface ParsedRow {
  name: string;
  loja: string;
  cidade: string;
  uf: string;
  phone: string;
  email: string;
  tenente: string;
  plano: string;
  valid: boolean;
  error?: string;
}

function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["Arquivo vazio ou sem dados. Precisa ter cabeçalho + pelo menos 1 linha."] };

  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

  const errors: string[] = [];
  const rows: ParsedRow[] = [];

  const nameIdx = headers.findIndex((h) => h.includes("nome") || h === "name");
  const lojaIdx = headers.findIndex((h) => h.includes("loja") || h.includes("unidade") || h.includes("empresa"));
  const cidadeIdx = headers.findIndex((h) => h.includes("cidade") || h.includes("city"));
  const ufIdx = headers.findIndex((h) => h === "uf" || h.includes("estado") || h.includes("state"));
  const phoneIdx = headers.findIndex((h) => h.includes("telefone") || h.includes("phone") || h.includes("whatsapp") || h.includes("celular"));
  const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("e-mail"));
  const tenenteIdx = headers.findIndex((h) => h.includes("tenente") || h.includes("responsavel") || h.includes("responsável"));
  const planoIdx = headers.findIndex((h) => h.includes("plano") || h.includes("plan"));

  if (nameIdx === -1) errors.push("Coluna 'Nome' não encontrada no cabeçalho.");

  if (errors.length > 0) return { rows, errors };

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = cols[nameIdx] || "";
    const loja = lojaIdx >= 0 ? (cols[lojaIdx] || "") : "";
    const cidade = cidadeIdx >= 0 ? (cols[cidadeIdx] || "") : "";
    const uf = ufIdx >= 0 ? (cols[ufIdx] || "").toUpperCase().slice(0, 2) : "";
    const phone = phoneIdx >= 0 ? (cols[phoneIdx] || "") : "";
    const email = emailIdx >= 0 ? (cols[emailIdx] || "") : "";
    const tenente = tenenteIdx >= 0 ? (cols[tenenteIdx] || "") : "";
    const plano = planoIdx >= 0 ? (cols[planoIdx] || "Plano Completo") : "Plano Completo";

    if (!name && !loja) continue;

    const valid = !!name;
    rows.push({
      name, loja, cidade, uf, phone, email, tenente, plano,
      valid,
      error: !valid ? `Linha ${i + 1}: Nome é obrigatório` : undefined,
    });
  }

  return { rows, errors };
}

interface TripulantesPageProps {
  onNavigateJornada?: (tripulanteId?: string) => void;
}

export default function TripulantesPage({ onNavigateJornada }: TripulantesPageProps) {
  useStore();
  useAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newObsText, setNewObsText] = useState("");
  const [newForm, setNewForm] = useState<NewTripulanteForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<NewTripulanteForm>(EMPTY_FORM);

  // Import state
  const [importMode, setImportMode] = useState<"csv" | "paste">("csv");
  const [pasteText, setPasteText] = useState("");
  const [importPreview, setImportPreview] = useState<ParsedRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detailModalRef = useRef<HTMLDivElement>(null);
  const createModalRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);

  const allTripulantes = getTripulantes();

  const selectedTripulante = selectedId
    ? allTripulantes.find((t) => t.id === selectedId) ?? null
    : null;

  const filtered = allTripulantes.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      t.name.toLowerCase().includes(q) ||
      t.loja.toLowerCase().includes(q) ||
      t.cidade.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "todos" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function openDetail(t: TripulanteMock) {
    setSelectedId(t.id);
    setNewObsText("");
    setDetailOpen(true);
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelectedId(null);
  }

  function openCreate() {
    setNewForm(EMPTY_FORM);
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
  }

  async function handleAddObservacao() {
    if (!newObsText.trim()) {
      toast.error("Digite uma observação antes de salvar.");
      return;
    }
    if (!selectedId) return;
    try {
      await addObservacao(selectedId, {
        texto: newObsText.trim(),
        autor: "Nicholas",
        data: new Date().toISOString().split("T")[0],
      });
      setNewObsText("");
      toast.success("Observação salva com sucesso.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao salvar observação: ${msg}`);
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { name, loja, cidade, uf, phone, email, tenente, plano } = newForm;
    if (!name) {
      toast.error("O nome é obrigatório.");
      return;
    }

    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");

    try {
      await addTripulante({
        name,
        loja,
        cidade,
        uf,
        phone,
        email,
        tenente,
        plano,
        status: "ativo",
        dataEntrada: new Date().toISOString().split("T")[0],
        avatar: initials || "??",
      });
      toast.success(`Tripulante "${name}" criado com sucesso!`);
      closeCreate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao criar tripulante: ${msg}`);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTripulante) return;
    const { name, loja, cidade, uf, phone, email, tenente, plano } = editForm;
    if (!name) {
      toast.error("O nome é obrigatório.");
      return;
    }
    try {
      await updateTripulante(selectedTripulante.id, {
        name,
        loja,
        cidade,
        uf,
        phone,
        email,
        tenente,
        plano,
      });
      toast.success("Tripulante atualizado!");
      setEditOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao atualizar tripulante: ${msg}`);
    }
  }

  async function handleDelete() {
    if (!selectedTripulante) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir "${selectedTripulante.name}"? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    try {
      await deleteTripulante(selectedTripulante.id);
      toast.success(`Tripulante "${selectedTripulante.name}" excluído com sucesso.`);
      closeDetail();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Falha ao excluir tripulante: ${msg}`);
    }
  }

  // --- Import handlers ---
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors } = parseCSV(text);
      setImportPreview(rows);
      setImportErrors(errors);
    };
    reader.readAsText(file, "UTF-8");
  }

  function handlePastePreview() {
    if (!pasteText.trim()) {
      toast.error("Cole os dados da planilha no campo de texto.");
      return;
    }
    const { rows, errors } = parseCSV(pasteText);
    setImportPreview(rows);
    setImportErrors(errors);
  }

  async function handleConfirmImport() {
    const validRows = importPreview.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error("Nenhuma linha válida para importar.");
      return;
    }

    let imported = 0;
    let failed = 0;
    for (const row of validRows) {
      const initials = row.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      try {
        await addTripulante({
          name: row.name,
          loja: row.loja || "",
          cidade: row.cidade || "Não informada",
          uf: row.uf || "XX",
          phone: row.phone || "",
          email: row.email || "",
          tenente: row.tenente || "Não atribuído",
          status: "ativo",
          dataEntrada: new Date().toISOString().split("T")[0],
          avatar: initials,
          plano: row.plano || "Plano Completo",
        });
        imported++;
      } catch {
        failed++;
      }
    }

    if (failed > 0) {
      toast.error(`Falha ao importar ${failed} linha${failed > 1 ? "s" : ""}.`);
    }
    if (imported > 0) {
      toast.success(`${imported} tripulante${imported > 1 ? "s" : ""} importado${imported > 1 ? "s" : ""} com sucesso!`);
    }
    setImportOpen(false);
    setImportPreview([]);
    setImportErrors([]);
    setPasteText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeImport() {
    setImportOpen(false);
    setImportPreview([]);
    setImportErrors([]);
    setPasteText("");
    setImportMode("csv");
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (importOpen) closeImport();
        if (editOpen) setEditOpen(false);
        if (detailOpen) closeDetail();
        if (createOpen) closeCreate();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [detailOpen, createOpen, importOpen, editOpen]);

  function handleDetailBackdropClick(e: React.MouseEvent) {
    if (detailModalRef.current && !detailModalRef.current.contains(e.target as Node)) {
      closeDetail();
    }
  }

  function handleCreateBackdropClick(e: React.MouseEvent) {
    if (createModalRef.current && !createModalRef.current.contains(e.target as Node)) {
      closeCreate();
    }
  }

  function handleEditBackdropClick(e: React.MouseEvent) {
    if (editModalRef.current && !editModalRef.current.contains(e.target as Node)) {
      setEditOpen(false);
    }
  }

  const kpis = selectedTripulante ? computeKPIs(selectedTripulante.id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-white">Tripulantes</h1>
          <p className="mt-1 text-[13px] text-[#9b9b9b]">
            Gerencie os tripulantes da operação
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded border border-white/10 hover:bg-white/5 text-[#e6e6e6] px-3 py-1.5 text-[13px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Importar Lista
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded bg-[#529cca] hover:bg-[#6bb1de] text-white px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Novo Tripulante
          </button>
        </div>
      </header>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6f6f6f]"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar por nome, loja ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar tripulantes"
            className="w-full pl-9"
          />
        </div>
        <div>
          <label htmlFor="status-filter" className="sr-only">
            Filtrar por status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "todos" | "ativo" | "inativo")}
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* Grid of cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openDetail(t)}
              className="flex items-start gap-3 rounded-md border border-white/[0.06] hover:border-white/[0.10] hover:bg-white/[0.02] p-4 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
              aria-label={`Ver detalhes de ${t.name}`}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-medium text-[#9b9b9b]"
                aria-hidden="true"
              >
                {t.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-white">{t.name}</p>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium",
                      t.status === "ativo" ? "text-[#4aa971]" : "text-[#6f6f6f]"
                    )}
                  >
                    ● {t.status === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[13px] text-[#9b9b9b]">{t.loja}</p>
                <p className="mt-0.5 text-xs text-[#6f6f6f]">
                  {t.cidade}/{t.uf}
                </p>
                <p className="mt-1.5 text-xs text-[#6f6f6f]">
                  Entrada: {formatDate(t.dataEntrada)}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center justify-center gap-2" role="status">
          <User className="h-10 w-10 text-[#6f6f6f]" aria-hidden="true" />
          <p className="text-[13px] text-[#9b9b9b]">Nenhum tripulante encontrado.</p>
          <p className="text-xs text-[#6f6f6f]">
            Tente ajustar os filtros ou adicione um novo tripulante.
          </p>
        </div>
      )}

      {/* Detail modal */}
      {detailOpen && selectedTripulante && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhes de ${selectedTripulante.name}`}
          onClick={handleDetailBackdropClick}
        >
          <div
            ref={detailModalRef}
            className="bg-[#1f1f1f] border border-white/[0.08] rounded-lg w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-[13px] font-medium text-[#9b9b9b]"
                  aria-hidden="true"
                >
                  {selectedTripulante.avatar}
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-white">{selectedTripulante.name}</h2>
                  <p className="text-[13px] text-[#9b9b9b]">{selectedTripulante.loja}</p>
                  <p className="text-xs text-[#6f6f6f]">
                    {selectedTripulante.cidade}/{selectedTripulante.uf}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                aria-label="Fechar modal"
                className="text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-1 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dados Cadastrais */}
            <section className="mb-6" aria-labelledby="dados-heading">
              <h3
                id="dados-heading"
                className="mb-3 text-[14px] font-semibold text-white"
              >
                Dados Cadastrais
              </h3>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <DetailRow icon={Phone} label="Telefone" value={selectedTripulante.phone} />
                <DetailRow icon={Mail} label="E-mail" value={selectedTripulante.email} />
                {/* Responsável removido — toda equipe atende todos os tripulantes */}
                <DetailRow icon={FileText} label="Plano" value={selectedTripulante.plano} />
                <DetailRow
                  icon={CalendarDays}
                  label="Data de Entrada"
                  value={formatDate(selectedTripulante.dataEntrada)}
                />
                <DetailRow
                  icon={User}
                  label="Status"
                  value={selectedTripulante.status === "ativo" ? "Ativo" : "Inativo"}
                />
              </div>
            </section>

            <div className="border-t border-white/[0.06] my-6" />

            {/* Observacoes */}
            <section className="mb-6" aria-labelledby="obs-heading">
              <h3
                id="obs-heading"
                className="mb-3 text-[14px] font-semibold text-white"
              >
                Observações
              </h3>

              <div className="mb-4 flex gap-2">
                <label htmlFor="new-obs" className="sr-only">
                  Nova observação
                </label>
                <textarea
                  id="new-obs"
                  rows={2}
                  placeholder="Escreva uma observação..."
                  value={newObsText}
                  onChange={(e) => setNewObsText(e.target.value)}
                  className="flex-1 resize-none"
                />
                <button
                  type="button"
                  onClick={handleAddObservacao}
                  className="self-end rounded bg-[#529cca] hover:bg-[#6bb1de] text-white px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
                >
                  Salvar
                </button>
              </div>

              {selectedTripulante.observacoes.length === 0 ? (
                <p className="text-[13px] text-[#6f6f6f]">Nenhuma observação registrada.</p>
              ) : (
                <ul className="space-y-2" aria-label="Lista de observações">
                  {selectedTripulante.observacoes.map((obs) => (
                    <li
                      key={obs.id}
                      className="border-l-2 border-white/[0.10] pl-3 py-1"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-[#9b9b9b]">{obs.autor}</span>
                        <span className="text-xs text-[#6f6f6f]" aria-hidden="true">·</span>
                        <time className="text-xs text-[#6f6f6f]" dateTime={obs.data}>
                          {formatDate(obs.data)}
                        </time>
                      </div>
                      <p className="text-[13px] text-[#e6e6e6]">{obs.texto}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Resumo / mini-KPIs */}
            {kpis && (
              <>
                <div className="border-t border-white/[0.06] my-6" />
                <section className="mb-6" aria-labelledby="resumo-heading">
                  <h3
                    id="resumo-heading"
                    className="mb-3 text-[14px] font-semibold text-white"
                  >
                    Resumo
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <MiniKpi
                      icon={Handshake}
                      label="Reuniões"
                      value={String(kpis.atual.reunioes)}
                    />
                    <MiniKpi
                      icon={DollarSign}
                      label="Vendas"
                      value={formatCurrency(kpis.atual.vendas)}
                    />
                    <MiniKpi
                      icon={Palette}
                      label="Criativos"
                      value={String(kpis.atual.criativos)}
                    />
                  </div>
                </section>
              </>
            )}

            {/* Action buttons */}
            <div className="border-t border-white/[0.06] pt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!selectedTripulante) return;
                  setEditForm({
                    name: selectedTripulante.name,
                    loja: selectedTripulante.loja,
                    cidade: selectedTripulante.cidade,
                    uf: selectedTripulante.uf,
                    phone: selectedTripulante.phone,
                    email: selectedTripulante.email,
                    tenente: selectedTripulante.tenente,
                    plano: selectedTripulante.plano,
                  });
                  setEditOpen(true);
                }}
                className="w-full rounded-lg border border-white/10 hover:bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Editar Tripulante
              </button>
              {onNavigateJornada && (
                <button
                  type="button"
                  onClick={() => { setDetailOpen(false); onNavigateJornada(selectedTripulante.id); }}
                  className="w-full rounded border border-white/10 hover:bg-white/5 text-[#529cca] px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
                >
                  Ver Jornada Completa →
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                className="w-full rounded text-[#e07464] hover:bg-white/5 px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#e07464]"
              >
                Excluir Tripulante
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Novo Tripulante"
          onClick={handleCreateBackdropClick}
        >
          <div
            ref={createModalRef}
            className="bg-[#1f1f1f] border border-white/[0.08] rounded-lg w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-[16px] font-semibold text-white">Novo Tripulante</h2>
              <button
                type="button"
                onClick={closeCreate}
                aria-label="Fechar modal"
                className="text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-1 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <FormField
                id="create-name"
                label="Nome completo"
                value={newForm.name}
                onChange={(v) => setNewForm((f) => ({ ...f, name: v }))}
                placeholder="Ex: Carlos Eduardo Mendes"
              />
              <FormField
                id="create-loja"
                label="Loja"
                value={newForm.loja}
                onChange={(v) => setNewForm((f) => ({ ...f, loja: v }))}
                placeholder="Ex: Colchões Premium Campinas"
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="create-cidade"
                  label="Cidade"
                  value={newForm.cidade}
                  onChange={(v) => setNewForm((f) => ({ ...f, cidade: v }))}
                  placeholder="Ex: Campinas"
                />
                <div>
                  <label
                    htmlFor="create-uf"
                    className="mb-1 block text-xs font-medium text-[#9b9b9b]"
                  >
                    UF
                  </label>
                  <select
                    id="create-uf"
                    value={newForm.uf}
                    onChange={(e) => setNewForm((f) => ({ ...f, uf: e.target.value }))}
                    className="w-full"
                  >
                    <option value="">Selecione</option>
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <FormField
                id="create-phone"
                label="Telefone"
                value={newForm.phone}
                onChange={(v) => setNewForm((f) => ({ ...f, phone: v }))}
                placeholder="(00) 00000-0000"
                type="tel"
              />
              <FormField
                id="create-email"
                label="E-mail"
                value={newForm.email}
                onChange={(v) => setNewForm((f) => ({ ...f, email: v }))}
                placeholder="email@exemplo.com.br"
                type="email"
              />
              {/* Campo responsável removido — toda equipe atende todos os tripulantes */}
              <div>
                <label
                  htmlFor="create-plano"
                  className="mb-1 block text-xs font-medium text-[#9b9b9b]"
                >
                  Plano
                </label>
                <select
                  id="create-plano"
                  value={newForm.plano}
                  onChange={(e) => setNewForm((f) => ({ ...f, plano: e.target.value }))}
                  className="w-full"
                >
                  <option value="">Selecione</option>
                  {PLANOS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded bg-[#529cca] hover:bg-[#6bb1de] text-white py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
              >
                Criar Tripulante
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && selectedTripulante && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Editar Tripulante"
          onClick={handleEditBackdropClick}
        >
          <div
            ref={editModalRef}
            className="bg-[#1f1f1f] border border-white/[0.08] rounded-xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-[16px] font-semibold text-white">Editar Tripulante</h2>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                aria-label="Fechar modal"
                className="text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-1 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <FormField
                id="edit-name"
                label="Nome completo"
                value={editForm.name}
                onChange={(v) => setEditForm((f) => ({ ...f, name: v }))}
                placeholder="Ex: Carlos Eduardo Mendes"
              />
              <FormField
                id="edit-loja"
                label="Loja"
                value={editForm.loja}
                onChange={(v) => setEditForm((f) => ({ ...f, loja: v }))}
                placeholder="Ex: Colchões Premium Campinas"
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  id="edit-cidade"
                  label="Cidade"
                  value={editForm.cidade}
                  onChange={(v) => setEditForm((f) => ({ ...f, cidade: v }))}
                  placeholder="Ex: Campinas"
                />
                <div>
                  <label
                    htmlFor="edit-uf"
                    className="mb-1 block text-xs font-medium text-[#9b9b9b]"
                  >
                    UF
                  </label>
                  <select
                    id="edit-uf"
                    value={editForm.uf}
                    onChange={(e) => setEditForm((f) => ({ ...f, uf: e.target.value }))}
                    className="w-full"
                  >
                    <option value="">Selecione</option>
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <FormField
                id="edit-phone"
                label="Telefone"
                value={editForm.phone}
                onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))}
                placeholder="(00) 00000-0000"
                type="tel"
              />
              <FormField
                id="edit-email"
                label="E-mail"
                value={editForm.email}
                onChange={(v) => setEditForm((f) => ({ ...f, email: v }))}
                placeholder="email@exemplo.com.br"
                type="email"
              />
              {/* Campo responsável removido — toda equipe atende todos os tripulantes */}
              <div>
                <label
                  htmlFor="edit-plano"
                  className="mb-1 block text-xs font-medium text-[#9b9b9b]"
                >
                  Plano
                </label>
                <select
                  id="edit-plano"
                  value={editForm.plano}
                  onChange={(e) => setEditForm((f) => ({ ...f, plano: e.target.value }))}
                  className="w-full"
                >
                  <option value="">Selecione</option>
                  {PLANOS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded bg-[#529cca] hover:bg-[#6bb1de] text-white py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============== IMPORT MODAL ============== */}
      {importOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeImport(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Importar tripulantes"
        >
          <div className="bg-[#1f1f1f] border border-white/[0.08] rounded-lg w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-[16px] font-semibold text-white">Importar Tripulantes</h2>
              <button
                type="button"
                onClick={closeImport}
                aria-label="Fechar"
                className="text-[#9b9b9b] hover:text-white hover:bg-white/5 px-2 py-1 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-6 text-[13px] text-[#9b9b9b]">
              Importe uma lista de tripulantes via arquivo CSV ou colando dados de uma planilha.
            </p>

            {/* Mode tabs */}
            <div className="mb-6 flex gap-2">
              <button
                type="button"
                onClick={() => { setImportMode("csv"); setImportPreview([]); setImportErrors([]); }}
                className={cn(
                  "flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-medium transition-colors",
                  importMode === "csv"
                    ? "bg-[#529cca] text-white"
                    : "border border-white/10 text-[#9b9b9b] hover:bg-white/5 hover:text-white"
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload CSV
              </button>
              <button
                type="button"
                onClick={() => { setImportMode("paste"); setImportPreview([]); setImportErrors([]); }}
                className={cn(
                  "flex items-center gap-2 rounded px-3 py-1.5 text-[13px] font-medium transition-colors",
                  importMode === "paste"
                    ? "bg-[#529cca] text-white"
                    : "border border-white/10 text-[#9b9b9b] hover:bg-white/5 hover:text-white"
                )}
              >
                <Table className="h-3.5 w-3.5" />
                Colar da Planilha
              </button>
            </div>

            {/* CSV Upload */}
            {importMode === "csv" && (
              <div className="mb-6">
                <label className="mb-3 block text-xs font-medium text-[#9b9b9b]">
                  Selecione o arquivo CSV
                </label>
                <div className="relative rounded-md border border-dashed border-white/10 hover:border-white/20 p-8 text-center transition-colors">
                  <Upload className="mx-auto mb-2 h-6 w-6 text-[#6f6f6f]" />
                  <p className="text-[13px] text-[#9b9b9b]">Arraste o arquivo aqui ou clique para selecionar</p>
                  <p className="mt-1 text-xs text-[#6f6f6f]">Formatos aceitos: .csv (separado por vírgula ou ponto-e-vírgula)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </div>
              </div>
            )}

            {/* Paste mode */}
            {importMode === "paste" && (
              <div className="mb-6">
                <label htmlFor="paste-area" className="mb-3 block text-xs font-medium text-[#9b9b9b]">
                  Cole os dados da planilha (com cabeçalho)
                </label>
                <textarea
                  id="paste-area"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"Nome;Loja;Cidade;UF;Telefone;Email;Tenente;Plano\nCarlos Silva;Colchões Premium;Campinas;SP;(19)99812-4433;carlos@email.com;Matheus Silva;Plano Completo"}
                  rows={6}
                  className="w-full font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handlePastePreview}
                  className="mt-3 rounded border border-white/10 hover:bg-white/5 text-[#e6e6e6] px-3 py-1.5 text-[13px] transition-colors"
                >
                  Processar dados
                </button>
              </div>
            )}

            {/* Format guide */}
            <div className="mb-6 rounded-md border border-white/[0.06] p-3">
              <p className="mb-1 text-xs font-medium text-[#9b9b9b]">Formato esperado (cabeçalho)</p>
              <code className="text-xs text-[#529cca] break-all">
                Nome ; Loja ; Cidade ; UF ; Telefone ; Email ; Tenente ; Plano
              </code>
              <p className="mt-2 text-xs text-[#6f6f6f]">
                Coluna obrigatória: <strong className="text-[#9b9b9b]">Nome</strong>. Todas as demais são opcionais e podem ser editadas depois. Separador: vírgula ou ponto-e-vírgula.
              </p>
            </div>

            {/* Errors */}
            {importErrors.length > 0 && (
              <div className="mb-4 rounded-md border border-white/[0.06] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-3.5 w-3.5 text-[#e07464]" />
                  <span className="text-[13px] font-medium text-[#e07464]">Erros encontrados</span>
                </div>
                {importErrors.map((err, i) => (
                  <p key={i} className="text-xs text-[#e07464]">{err}</p>
                ))}
              </div>
            )}

            {/* Preview table */}
            {importPreview.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-semibold text-white">
                    Pré-visualização ({importPreview.filter((r) => r.valid).length} válidos de {importPreview.length})
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-md border border-white/[0.06]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-[#6f6f6f] font-medium"></th>
                        <th className="px-3 py-2 text-left text-[#6f6f6f] font-medium">Nome</th>
                        <th className="px-3 py-2 text-left text-[#6f6f6f] font-medium">Loja</th>
                        <th className="px-3 py-2 text-left text-[#6f6f6f] font-medium">Cidade</th>
                        <th className="px-3 py-2 text-left text-[#6f6f6f] font-medium">UF</th>
                        <th className="px-3 py-2 text-left text-[#6f6f6f] font-medium">Telefone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-t border-white/[0.06]">
                          <td className="px-3 py-2">
                            {row.valid ? (
                              <CheckCircle className="h-3.5 w-3.5 text-[#4aa971]" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-[#e07464]" />
                            )}
                          </td>
                          <td className="px-3 py-2 text-[#e6e6e6] font-medium">{row.name || "—"}</td>
                          <td className="px-3 py-2 text-[#9b9b9b]">{row.loja || "—"}</td>
                          <td className="px-3 py-2 text-[#9b9b9b]">{row.cidade || "—"}</td>
                          <td className="px-3 py-2 text-[#9b9b9b]">{row.uf || "—"}</td>
                          <td className="px-3 py-2 text-[#9b9b9b]">{row.phone || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreview.length > 20 && (
                    <p className="px-3 py-2 text-xs text-[#6f6f6f] border-t border-white/[0.06]">
                      ...e mais {importPreview.length - 20} linhas
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeImport}
                className="rounded text-[#9b9b9b] hover:text-white hover:bg-white/5 px-3 py-1.5 text-[13px] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importPreview.filter((r) => r.valid).length === 0}
                className={cn(
                  "rounded px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#529cca]",
                  importPreview.filter((r) => r.valid).length > 0
                    ? "bg-[#529cca] text-white hover:bg-[#6bb1de]"
                    : "border border-white/10 text-[#6f6f6f] cursor-not-allowed"
                )}
              >
                Importar {importPreview.filter((r) => r.valid).length} tripulante{importPreview.filter((r) => r.valid).length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#6f6f6f]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs text-[#6f6f6f]">{label}</p>
        <p className="truncate text-[13px] text-[#e6e6e6]">{value}</p>
      </div>
    </div>
  );
}

function MiniKpi({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-white/[0.06] rounded-md p-3">
      <div className="flex items-center gap-2 text-[#9b9b9b]">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 text-[18px] font-semibold text-white">{value}</p>
    </div>
  );
}

function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-[#9b9b9b]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
}
