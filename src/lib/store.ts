// ============================================================
// RADAR VEON — Store com Supabase + cache em memória + Realtime
// ============================================================
// Arquitetura:
// - Cache em memória para leitura síncrona pelos componentes
// - Todas as mutações escrevem no Supabase + atualizam cache + notify()
// - Realtime: mudanças de outros usuários atualizam o cache automaticamente
// ============================================================

import { supabase } from "./supabase";
import { createNotification } from "./notifications";
import type { Profile } from "./auth-types";
import type {
  TripulanteMock,
  CampanhaRegistro,
  ReuniaoMock,
  CriativoMock,
  Observacao,
} from "./mock-data";

export interface TeamMember {
  id: string;
  nome: string;
  role: string;
}

export interface EventoManual {
  id: string;
  tripulanteId: string;
  tipo: "onboarding" | "marco" | "alerta_manual" | "observacao" | "oficina" | "venda";
  titulo: string;
  descricao: string;
  data: string;
  responsavel: string;
  autor_id?: string | null;
  created_at?: string;
}

// ---------- Cache em memória ----------
interface Cache {
  tripulantes: TripulanteMock[];
  campanhas: CampanhaRegistro[];
  reunioes: ReuniaoMock[];
  criativos: CriativoMock[];
  observacoes: (Observacao & { tripulanteId: string })[];
  eventosManuais: EventoManual[];
  team: TeamMember[];
  initialized: boolean;
}

const cache: Cache = {
  tripulantes: [],
  campanhas: [],
  reunioes: [],
  criativos: [],
  observacoes: [],
  eventosManuais: [],
  team: [],
  initialized: false,
};

// ---------- Listeners pub/sub ----------
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  listeners.forEach((fn) => fn());
}

// ---------- Autor atual (setado pelo AuthContext) ----------
let currentAuthorId: string | null = null;
let currentAuthorName: string = "";

export function setCurrentAuthor(id: string | null, name: string = "") {
  currentAuthorId = id;
  currentAuthorName = name;
}

export function getCurrentAuthor() {
  return { id: currentAuthorId, name: currentAuthorName };
}

// Retorna membros aprovados da equipe pra preencher dropdowns de "Responsável"
export function getTeam(): TeamMember[] {
  return cache.team;
}

export interface ProfissionalCompleto {
  id: string;
  nome: string;
  email: string;
  role: string;
  observacao_funcao: string | null;
  avatar_iniciais: string | null;
  approved: boolean;
  created_at: string;
}

export async function fetchProfissionais(): Promise<ProfissionalCompleto[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, email, role, observacao_funcao, avatar_iniciais, approved, created_at")
    .order("nome");
  if (error) {
    console.error("[store] fetchProfissionais:", error);
    return [];
  }
  return (data ?? []) as ProfissionalCompleto[];
}

export interface HistoricoAcao {
  id: string;
  tipo:
    | "tripulante_criado"
    | "tripulante_editado"
    | "reuniao"
    | "campanha"
    | "criativo"
    | "evento_manual"
    | "observacao";
  descricao: string;
  tripulanteId: string | null;
  tripulanteNome: string;
  data: string;
  detalhes?: string;
}

export async function fetchHistoricoProfissional(profileId: string): Promise<HistoricoAcao[]> {
  const trips = cache.tripulantes;
  const trimap: Record<string, string> = {};
  for (const t of trips) trimap[t.id] = t.name;

  const [tripsRes, reunioesRes, campanhasRes, criativosRes, eventosRes, obsRes] = await Promise.all([
    supabase
      .from("tripulantes")
      .select("id, name, created_at")
      .eq("autor_id", profileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reunioes")
      .select("id, tripulante_id, status, data, horario, created_at, valor_vendas")
      .eq("autor_id", profileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("campanhas")
      .select("id, tripulante_id, tipo, descricao, investimento, created_at")
      .eq("autor_id", profileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("criativos")
      .select("id, tripulante_id, tipo, status, descricao, created_at")
      .eq("autor_id", profileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("eventos_manuais")
      .select("id, tripulante_id, tipo, titulo, descricao, created_at")
      .eq("autor_id", profileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("observacoes")
      .select("id, tripulante_id, texto, created_at")
      .eq("autor_id", profileId)
      .order("created_at", { ascending: false }),
  ]);

  const acoes: HistoricoAcao[] = [];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  for (const t of (tripsRes.data ?? []) as any[]) {
    acoes.push({
      id: `trip-${t.id}`,
      tipo: "tripulante_criado",
      descricao: "Cadastrou tripulante",
      tripulanteId: t.id,
      tripulanteNome: t.name,
      data: t.created_at,
    });
  }
  for (const r of (reunioesRes.data ?? []) as any[]) {
    const nome = trimap[r.tripulante_id] ?? "—";
    let desc = `Reunião ${r.status}`;
    if (r.valor_vendas) desc += ` · vendas R$ ${Number(r.valor_vendas).toLocaleString("pt-BR")}`;
    acoes.push({
      id: `reu-${r.id}`,
      tipo: "reuniao",
      descricao: desc,
      tripulanteId: r.tripulante_id,
      tripulanteNome: nome,
      data: r.created_at,
      detalhes: `${r.data} ${r.horario}`,
    });
  }
  for (const c of (campanhasRes.data ?? []) as any[]) {
    const nome = trimap[c.tripulante_id] ?? "—";
    const tipoLabel = c.tipo.replace(/_/g, " ");
    acoes.push({
      id: `cmp-${c.id}`,
      tipo: "campanha",
      descricao: `${tipoLabel}${c.investimento ? ` · R$ ${Number(c.investimento).toLocaleString("pt-BR")}` : ""}`,
      tripulanteId: c.tripulante_id,
      tripulanteNome: nome,
      data: c.created_at,
      detalhes: c.descricao,
    });
  }
  for (const cr of (criativosRes.data ?? []) as any[]) {
    const nome = trimap[cr.tripulante_id] ?? "—";
    acoes.push({
      id: `cri-${cr.id}`,
      tipo: "criativo",
      descricao: `Criativo: ${cr.tipo.replace(/_/g, " ")} · ${cr.status.replace(/_/g, " ")}`,
      tripulanteId: cr.tripulante_id,
      tripulanteNome: nome,
      data: cr.created_at,
      detalhes: cr.descricao,
    });
  }
  for (const ev of (eventosRes.data ?? []) as any[]) {
    const nome = trimap[ev.tripulante_id] ?? "—";
    acoes.push({
      id: `ev-${ev.id}`,
      tipo: ev.titulo === "Cadastro atualizado" ? "tripulante_editado" : "evento_manual",
      descricao: ev.titulo,
      tripulanteId: ev.tripulante_id,
      tripulanteNome: nome,
      data: ev.created_at,
      detalhes: ev.descricao,
    });
  }
  for (const o of (obsRes.data ?? []) as any[]) {
    const nome = trimap[o.tripulante_id] ?? "—";
    acoes.push({
      id: `obs-${o.id}`,
      tipo: "observacao",
      descricao: "Adicionou observação",
      tripulanteId: o.tripulante_id,
      tripulanteNome: nome,
      data: o.created_at,
      detalhes: o.texto,
    });
  }
  /* eslint-enable */

  acoes.sort((a, b) => b.data.localeCompare(a.data));
  return acoes;
}

// ---------- Row mappers ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTripulante(row: any): TripulanteMock {
  return {
    id: row.id,
    name: row.name,
    loja: row.loja ?? "",
    cidade: row.cidade ?? "",
    uf: row.uf ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    tenente: row.tenente ?? "",
    status: row.status ?? "ativo",
    dataEntrada: row.data_entrada,
    avatar: row.avatar ?? "",
    plano: row.plano ?? "Plano Completo",
    observacoes: [],
  };
}

function mapCampanha(row: any): CampanhaRegistro {
  return {
    id: row.id,
    tripulanteId: row.tripulante_id,
    data: row.data,
    tipo: row.tipo,
    descricao: row.descricao ?? "",
    responsavel: row.responsavel ?? "",
    investimento: Number(row.investimento ?? 0),
    resultado: row.resultado ?? "",
  };
}

function mapReuniao(row: any): ReuniaoMock {
  return {
    id: row.id,
    tripulanteId: row.tripulante_id,
    tenenteId: row.tenente_id ?? "",
    data: row.data,
    horario: row.horario,
    status: row.status,
    animo: row.animo ?? "neutro",
    produtiva: row.produtiva ?? false,
    vendasDeclaradas: row.vendas_declaradas ?? false,
    valorVendas: row.valor_vendas !== null ? Number(row.valor_vendas) : null,
    diagnosticoBussola: row.diagnostico_bussola ?? false,
    transcricao: row.transcricao ?? "",
    observacoes: row.observacoes ?? "",
    linkDocumento: row.link_documento ?? "",
  };
}

function mapCriativo(row: any): CriativoMock {
  return {
    id: row.id,
    tripulanteId: row.tripulante_id,
    data: row.data,
    tipo: row.tipo,
    status: row.status,
    responsavel: row.responsavel ?? "",
    linkArquivo: row.link_arquivo ?? "",
    descricao: row.descricao ?? "",
  };
}

function mapObservacao(row: any): Observacao & { tripulanteId: string } {
  return {
    id: row.id,
    texto: row.texto,
    autor: row.autor_nome,
    data: row.data,
    tripulanteId: row.tripulante_id,
  };
}

function mapEvento(row: any): EventoManual {
  return {
    id: row.id,
    tripulanteId: row.tripulante_id,
    tipo: row.tipo,
    titulo: row.titulo,
    descricao: row.descricao ?? "",
    data: row.data,
    responsavel: row.responsavel ?? "",
    autor_id: row.autor_id,
    created_at: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------- Initial load ----------
let initPromise: Promise<void> | null = null;

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function initializeStore(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const TIMEOUT = 8000;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emptyResult = { data: [], error: null } as any;

      const [t, c, r, cr, o, e] = await Promise.all([
        withTimeout(
          Promise.resolve(supabase.from("tripulantes").select("*").order("created_at", { ascending: false })),
          TIMEOUT,
          emptyResult
        ),
        withTimeout(
          Promise.resolve(supabase.from("campanhas").select("*").order("data", { ascending: false })),
          TIMEOUT,
          emptyResult
        ),
        withTimeout(
          Promise.resolve(supabase.from("reunioes").select("*").order("data", { ascending: false })),
          TIMEOUT,
          emptyResult
        ),
        withTimeout(
          Promise.resolve(supabase.from("criativos").select("*").order("data", { ascending: false })),
          TIMEOUT,
          emptyResult
        ),
        withTimeout(
          Promise.resolve(supabase.from("observacoes").select("*").order("created_at", { ascending: false })),
          TIMEOUT,
          emptyResult
        ),
        withTimeout(
          Promise.resolve(supabase.from("eventos_manuais").select("*").order("data", { ascending: false })),
          TIMEOUT,
          emptyResult
        ),
      ]);

      // Carrega membros aprovados da equipe (pra dropdown de responsável)
      const teamRes = await withTimeout(
        Promise.resolve(
          supabase
            .from("profiles")
            .select("id, nome, role")
            .eq("approved", true)
            .order("nome")
        ),
        TIMEOUT,
        emptyResult
      );
      if (teamRes.error) console.error("[store] team:", teamRes.error);
      cache.team = ((teamRes.data ?? []) as Profile[]).map((p) => ({
        id: p.id,
        nome: p.nome,
        role: p.role,
      }));

      if (t.error) console.error("[store] tripulantes:", t.error);
      if (c.error) console.error("[store] campanhas:", c.error);
      if (r.error) console.error("[store] reunioes:", r.error);
      if (cr.error) console.error("[store] criativos:", cr.error);
      if (o.error) console.error("[store] observacoes:", o.error);
      if (e.error) console.error("[store] eventos:", e.error);

      cache.tripulantes = ((t.data ?? []) as unknown[]).map(mapTripulante);
      cache.campanhas = ((c.data ?? []) as unknown[]).map(mapCampanha);
      cache.reunioes = ((r.data ?? []) as unknown[]).map(mapReuniao);
      cache.criativos = ((cr.data ?? []) as unknown[]).map(mapCriativo);
      cache.observacoes = ((o.data ?? []) as unknown[]).map(mapObservacao);
      cache.eventosManuais = ((e.data ?? []) as unknown[]).map(mapEvento);

      hydrateObservacoes();
    } catch (err) {
      console.error("[store] Erro inesperado em initializeStore:", err);
    }

    cache.initialized = true;
    notify();

    try {
      subscribeRealtime();
    } catch (err) {
      console.error("[store] Erro ao assinar realtime:", err);
    }
  })();
  return initPromise;
}

function hydrateObservacoes() {
  const grouped: Record<string, Observacao[]> = {};
  for (const obs of cache.observacoes) {
    if (!grouped[obs.tripulanteId]) grouped[obs.tripulanteId] = [];
    grouped[obs.tripulanteId].push({ id: obs.id, texto: obs.texto, autor: obs.autor, data: obs.data });
  }
  for (const t of cache.tripulantes) {
    t.observacoes = grouped[t.id] ?? [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let realtimeChannel: any = null;

function subscribeRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = supabase
    .channel("store_sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "tripulantes" }, async () => {
      const { data } = await supabase.from("tripulantes").select("*").order("created_at", { ascending: false });
      cache.tripulantes = (data ?? []).map(mapTripulante);
      hydrateObservacoes();
      notify();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "campanhas" }, async () => {
      const { data } = await supabase.from("campanhas").select("*").order("data", { ascending: false });
      cache.campanhas = (data ?? []).map(mapCampanha);
      notify();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "reunioes" }, async () => {
      const { data } = await supabase.from("reunioes").select("*").order("data", { ascending: false });
      cache.reunioes = (data ?? []).map(mapReuniao);
      notify();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "criativos" }, async () => {
      const { data } = await supabase.from("criativos").select("*").order("data", { ascending: false });
      cache.criativos = (data ?? []).map(mapCriativo);
      notify();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "observacoes" }, async () => {
      const { data } = await supabase.from("observacoes").select("*").order("created_at", { ascending: false });
      cache.observacoes = (data ?? []).map(mapObservacao);
      hydrateObservacoes();
      notify();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "eventos_manuais" }, async () => {
      const { data } = await supabase.from("eventos_manuais").select("*").order("data", { ascending: false });
      cache.eventosManuais = (data ?? []).map(mapEvento);
      notify();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, nome, role")
        .eq("approved", true)
        .order("nome");
      cache.team = ((data ?? []) as Profile[]).map((p) => ({
        id: p.id,
        nome: p.nome,
        role: p.role,
      }));
      notify();
    })
    .subscribe();
}

export function isInitialized(): boolean {
  return cache.initialized;
}

// ============================================================
// Public API
// ============================================================

// --- Tripulantes ---
export function getTripulantes(): TripulanteMock[] {
  return cache.tripulantes;
}

export function getActiveTripulantes(): TripulanteMock[] {
  return cache.tripulantes.filter((t) => t.status === "ativo");
}

export function getTripulanteById(id: string): TripulanteMock | undefined {
  return cache.tripulantes.find((t) => t.id === id);
}

export async function addTripulante(t: Omit<TripulanteMock, "id" | "observacoes">) {
  const { data, error } = await supabase
    .from("tripulantes")
    .insert({
      name: t.name,
      loja: t.loja,
      cidade: t.cidade,
      uf: t.uf,
      phone: t.phone,
      email: t.email,
      tenente: t.tenente,
      plano: t.plano,
      status: t.status,
      data_entrada: t.dataEntrada,
      avatar: t.avatar,
      autor_id: currentAuthorId,
    })
    .select()
    .single();

  if (error) throw error;

  const newT = mapTripulante(data);
  cache.tripulantes.unshift(newT);
  notify();

  if (currentAuthorId) {
    createNotification(
      {
        tipo: "new_tripulante",
        titulo: "Novo tripulante cadastrado",
        descricao: `${t.name}${t.loja ? ` (${t.loja})` : ""} foi adicionado à frota.`,
        linkEntity: `tripulante/${newT.id}`,
      },
      currentAuthorId
    );
  }

  return newT;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  loja: "Loja",
  cidade: "Cidade",
  uf: "UF",
  phone: "Telefone",
  email: "E-mail",
  tenente: "Tenente responsável",
  plano: "Plano",
  status: "Status",
  avatar: "Avatar",
};

export async function updateTripulante(id: string, updates: Partial<TripulanteMock>) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const dbUpdates: any = {};
  const changes: string[] = [];
  const prev = cache.tripulantes.find((t) => t.id === id);

  if ("name" in updates) dbUpdates.name = updates.name;
  if ("loja" in updates) dbUpdates.loja = updates.loja;
  if ("cidade" in updates) dbUpdates.cidade = updates.cidade;
  if ("uf" in updates) dbUpdates.uf = updates.uf;
  if ("phone" in updates) dbUpdates.phone = updates.phone;
  if ("email" in updates) dbUpdates.email = updates.email;
  if ("tenente" in updates) dbUpdates.tenente = updates.tenente;
  if ("plano" in updates) dbUpdates.plano = updates.plano;
  if ("status" in updates) dbUpdates.status = updates.status;
  if ("avatar" in updates) dbUpdates.avatar = updates.avatar;

  if (prev) {
    for (const key of Object.keys(dbUpdates)) {
      const oldV = (prev as any)[key === "name" ? "name" : key];
      const newV = (updates as any)[key];
      if (oldV !== newV && newV !== undefined) {
        const label = FIELD_LABELS[key] ?? key;
        changes.push(`${label}: "${oldV || "(vazio)"}" → "${newV || "(vazio)"}"`);
      }
    }
  }
  /* eslint-enable */

  const { error } = await supabase.from("tripulantes").update(dbUpdates).eq("id", id);
  if (error) throw error;

  const idx = cache.tripulantes.findIndex((t) => t.id === id);
  if (idx !== -1) {
    cache.tripulantes[idx] = { ...cache.tripulantes[idx], ...updates };
    notify();
  }

  if (changes.length > 0 && currentAuthorId) {
    await addEventoManual({
      tripulanteId: id,
      tipo: "observacao",
      titulo: "Cadastro atualizado",
      descricao: changes.join(" · "),
      data: new Date().toISOString().split("T")[0],
      responsavel: currentAuthorName,
    });
  }
}

export async function deleteEventoManual(id: string) {
  const { error } = await supabase.from("eventos_manuais").delete().eq("id", id);
  if (error) throw error;
  cache.eventosManuais = cache.eventosManuais.filter((e) => e.id !== id);
  notify();
}

export async function deleteObservacao(id: string) {
  const { error } = await supabase.from("observacoes").delete().eq("id", id);
  if (error) throw error;
  cache.observacoes = cache.observacoes.filter((o) => o.id !== id);
  for (const t of cache.tripulantes) {
    t.observacoes = t.observacoes.filter((o) => o.id !== id);
  }
  notify();
}

export async function deleteTripulante(id: string) {
  const trip = cache.tripulantes.find((t) => t.id === id);
  const { error } = await supabase.from("tripulantes").delete().eq("id", id);
  if (error) throw error;

  cache.tripulantes = cache.tripulantes.filter((t) => t.id !== id);
  cache.campanhas = cache.campanhas.filter((c) => c.tripulanteId !== id);
  cache.reunioes = cache.reunioes.filter((r) => r.tripulanteId !== id);
  cache.criativos = cache.criativos.filter((c) => c.tripulanteId !== id);
  cache.eventosManuais = cache.eventosManuais.filter((e) => e.tripulanteId !== id);
  notify();

  if (currentAuthorId && trip) {
    createNotification(
      {
        tipo: "tripulante_deleted",
        titulo: "Tripulante excluído",
        descricao: `${trip.name} foi removido da frota.`,
      },
      currentAuthorId
    );
  }
}

export async function addObservacao(tripulanteId: string, obs: Omit<Observacao, "id">) {
  const { data, error } = await supabase
    .from("observacoes")
    .insert({
      tripulante_id: tripulanteId,
      texto: obs.texto,
      autor_nome: obs.autor,
      data: obs.data,
      autor_id: currentAuthorId,
    })
    .select()
    .single();

  if (error) throw error;

  const newObs = { id: data.id, texto: obs.texto, autor: obs.autor, data: obs.data };
  const trip = cache.tripulantes.find((t) => t.id === tripulanteId);
  if (trip) trip.observacoes.unshift(newObs);
  cache.observacoes.unshift({ ...newObs, tripulanteId });
  notify();
}

// --- Campanhas ---
export function getCampanhas(): CampanhaRegistro[] {
  return cache.campanhas;
}

export async function addCampanha(c: Omit<CampanhaRegistro, "id">) {
  const { data, error } = await supabase
    .from("campanhas")
    .insert({
      tripulante_id: c.tripulanteId,
      data: c.data,
      tipo: c.tipo,
      descricao: c.descricao,
      responsavel: c.responsavel,
      investimento: c.investimento,
      resultado: c.resultado,
      autor_id: currentAuthorId,
    })
    .select()
    .single();

  if (error) throw error;

  const newC = mapCampanha(data);
  cache.campanhas.unshift(newC);
  notify();

  const trip = cache.tripulantes.find((t) => t.id === c.tripulanteId);
  if (currentAuthorId) {
    createNotification(
      {
        tipo: "new_campanha",
        titulo: "Nova campanha registrada",
        descricao: `${c.tipo.replace("_", " ")} para ${trip?.name ?? "tripulante"}.`,
        linkEntity: `tripulante/${c.tripulanteId}`,
      },
      currentAuthorId
    );
  }

  return newC;
}

// --- Reuniões ---
export function getReunioes(): ReuniaoMock[] {
  return cache.reunioes;
}

export async function addReuniao(r: Omit<ReuniaoMock, "id">) {
  const { data, error } = await supabase
    .from("reunioes")
    .insert({
      tripulante_id: r.tripulanteId,
      tenente_id: r.tenenteId,
      data: r.data,
      horario: r.horario,
      status: r.status,
      animo: r.animo,
      produtiva: r.produtiva,
      vendas_declaradas: r.vendasDeclaradas,
      valor_vendas: r.valorVendas,
      diagnostico_bussola: r.diagnosticoBussola,
      transcricao: r.transcricao,
      observacoes: r.observacoes,
      link_documento: r.linkDocumento,
      autor_id: currentAuthorId,
    })
    .select()
    .single();

  if (error) throw error;

  const newR = mapReuniao(data);
  cache.reunioes.unshift(newR);
  notify();

  const trip = cache.tripulantes.find((t) => t.id === r.tripulanteId);
  if (currentAuthorId) {
    createNotification(
      {
        tipo: "new_reuniao",
        titulo: `Reunião ${r.status}`,
        descricao: `Com ${trip?.name ?? "tripulante"} em ${r.data} às ${r.horario}.`,
        linkEntity: `tripulante/${r.tripulanteId}`,
      },
      currentAuthorId
    );
  }

  return newR;
}

export async function updateReuniao(id: string, updates: Partial<ReuniaoMock>) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const dbUpdates: any = {};
  if ("status" in updates) dbUpdates.status = updates.status;
  if ("animo" in updates) dbUpdates.animo = updates.animo;
  if ("produtiva" in updates) dbUpdates.produtiva = updates.produtiva;
  if ("vendasDeclaradas" in updates) dbUpdates.vendas_declaradas = updates.vendasDeclaradas;
  if ("valorVendas" in updates) dbUpdates.valor_vendas = updates.valorVendas;
  if ("diagnosticoBussola" in updates) dbUpdates.diagnostico_bussola = updates.diagnosticoBussola;
  if ("transcricao" in updates) dbUpdates.transcricao = updates.transcricao;
  if ("observacoes" in updates) dbUpdates.observacoes = updates.observacoes;
  if ("linkDocumento" in updates) dbUpdates.link_documento = updates.linkDocumento;
  /* eslint-enable */

  const { error } = await supabase.from("reunioes").update(dbUpdates).eq("id", id);
  if (error) throw error;

  const idx = cache.reunioes.findIndex((r) => r.id === id);
  if (idx !== -1) {
    cache.reunioes[idx] = { ...cache.reunioes[idx], ...updates };
    notify();
  }
}

// --- Criativos ---
export function getCriativos(): CriativoMock[] {
  return cache.criativos;
}

export async function addCriativo(c: Omit<CriativoMock, "id">) {
  const { data, error } = await supabase
    .from("criativos")
    .insert({
      tripulante_id: c.tripulanteId,
      data: c.data,
      tipo: c.tipo,
      status: c.status,
      responsavel: c.responsavel,
      link_arquivo: c.linkArquivo,
      descricao: c.descricao,
      autor_id: currentAuthorId,
    })
    .select()
    .single();

  if (error) throw error;

  const newC = mapCriativo(data);
  cache.criativos.unshift(newC);
  notify();

  const trip = cache.tripulantes.find((t) => t.id === c.tripulanteId);
  if (currentAuthorId) {
    createNotification(
      {
        tipo: "new_criativo",
        titulo: "Novo criativo registrado",
        descricao: `${c.tipo.replace("_", " ")} para ${trip?.name ?? "tripulante"}.`,
        linkEntity: `tripulante/${c.tripulanteId}`,
      },
      currentAuthorId
    );
  }

  return newC;
}

// --- Eventos Manuais ---
export function getEventosManuais(): EventoManual[] {
  return cache.eventosManuais;
}

export async function addEventoManual(e: Omit<EventoManual, "id">) {
  const { data, error } = await supabase
    .from("eventos_manuais")
    .insert({
      tripulante_id: e.tripulanteId,
      tipo: e.tipo,
      titulo: e.titulo,
      descricao: e.descricao,
      data: e.data,
      responsavel: e.responsavel,
      autor_id: currentAuthorId,
    })
    .select()
    .single();

  if (error) throw error;

  const newE = mapEvento(data);
  cache.eventosManuais.unshift(newE);
  notify();

  if (currentAuthorId) {
    createNotification(
      {
        tipo: "new_evento",
        titulo: e.titulo,
        descricao: e.descricao,
        linkEntity: `tripulante/${e.tripulanteId}`,
      },
      currentAuthorId
    );
  }

  return newE;
}

// ============================================================
// Lógica: KPIs, Timeline, Health
// ============================================================

export function computeKPIs(tripulanteId?: string, startDate?: string, endDate?: string) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getTime() - 7 * 86400000);
  const end = endDate ? new Date(endDate) : now;
  const periodMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - periodMs);
  const prevEnd = new Date(start.getTime());

  function inRange(dateStr: string, from: Date, to: Date) {
    const d = new Date(dateStr);
    return d >= from && d <= to;
  }

  function filterItems<T extends { tripulanteId: string }>(arr: T[], dateField: (i: T) => string, from: Date, to: Date) {
    return arr.filter((item) => {
      const matchTrip = !tripulanteId || item.tripulanteId === tripulanteId;
      const matchDate = inRange(dateField(item), from, to);
      return matchTrip && matchDate;
    });
  }

  const currReunioes = filterItems(cache.reunioes, (r) => r.data, start, end).filter((r) => r.status === "realizada");
  const prevReunioes = filterItems(cache.reunioes, (r) => r.data, prevStart, prevEnd).filter((r) => r.status === "realizada");

  const currVendas = currReunioes.reduce((s, r) => s + (r.valorVendas ?? 0), 0);
  const prevVendas = prevReunioes.reduce((s, r) => s + (r.valorVendas ?? 0), 0);

  const currCampNovas = filterItems(cache.campanhas, (c) => c.data, start, end).filter((c) => c.tipo === "nova_campanha");
  const prevCampNovas = filterItems(cache.campanhas, (c) => c.data, prevStart, prevEnd).filter((c) => c.tipo === "nova_campanha");

  const currOtimizacoes = filterItems(cache.campanhas, (c) => c.data, start, end).filter((c) => c.tipo === "otimizacao");
  const prevOtimizacoes = filterItems(cache.campanhas, (c) => c.data, prevStart, prevEnd).filter((c) => c.tipo === "otimizacao");

  const currCriativos = filterItems(cache.criativos, (c) => c.data, start, end);
  const prevCriativos = filterItems(cache.criativos, (c) => c.data, prevStart, prevEnd);

  const currOficinas = Math.ceil(currReunioes.length / 4) || 0;
  const prevOficinas = Math.ceil(prevReunioes.length / 4) || 0;

  return {
    atual: {
      reunioes: currReunioes.length,
      vendas: currVendas,
      oficinas: currOficinas,
      criativos: currCriativos.length,
      campanhasNovas: currCampNovas.length,
      otimizacoes: currOtimizacoes.length,
    },
    anterior: {
      reunioes: prevReunioes.length,
      vendas: prevVendas,
      oficinas: prevOficinas,
      criativos: prevCriativos.length,
      campanhasNovas: prevCampNovas.length,
      otimizacoes: prevOtimizacoes.length,
    },
  };
}

export interface TimelineEvent {
  id: string;
  tripulanteId: string;
  tipo: "onboarding" | "reuniao" | "campanha" | "criativo" | "venda" | "oficina" | "observacao" | "alerta" | "marco" | "alerta_manual";
  titulo: string;
  descricao: string;
  data: string;
  responsavel: string;
  fonte: "automatico" | "manual";
  metadata?: Record<string, unknown>;
}

const TIPO_CAMP_MAP: Record<string, string> = {
  nova_campanha: "Nova Campanha",
  otimizacao: "Otimização",
  ajuste_verba: "Ajuste de Verba",
  pausa: "Pausa de Campanha",
  reativacao: "Reativação",
};

const TIPO_CRI_MAP: Record<string, string> = {
  imagem_estatica: "Imagem Estática",
  carrossel: "Carrossel",
  video: "Vídeo",
  stories: "Stories",
  outro: "Outro",
};

export function getTimelineForTripulante(tripulanteId: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const r of cache.reunioes.filter((r) => r.tripulanteId === tripulanteId)) {
    events.push({
      id: `reuniao-${r.id}`,
      tripulanteId,
      tipo: "reuniao",
      titulo: `Reunião ${r.status === "realizada" ? "realizada" : r.status === "agendada" ? "agendada" : "cancelada"}`,
      descricao: r.transcricao || r.observacoes || `Reunião ${r.status} às ${r.horario}`,
      data: r.data,
      responsavel: r.tenenteId,
      fonte: "automatico",
      metadata: { animo: r.animo, produtiva: r.produtiva, vendas: r.valorVendas, status: r.status },
    });
  }

  for (const c of cache.campanhas.filter((c) => c.tripulanteId === tripulanteId)) {
    events.push({
      id: `campanha-${c.id}`,
      tripulanteId,
      tipo: "campanha",
      titulo: TIPO_CAMP_MAP[c.tipo] || c.tipo,
      descricao: c.descricao,
      data: c.data,
      responsavel: c.responsavel,
      fonte: "automatico",
      metadata: { tipoCampanha: c.tipo, investimento: c.investimento, resultado: c.resultado },
    });
  }

  for (const cr of cache.criativos.filter((c) => c.tripulanteId === tripulanteId)) {
    events.push({
      id: `criativo-${cr.id}`,
      tripulanteId,
      tipo: "criativo",
      titulo: `Criativo: ${TIPO_CRI_MAP[cr.tipo] || cr.tipo}`,
      descricao: cr.descricao,
      data: cr.data,
      responsavel: cr.responsavel,
      fonte: "automatico",
      metadata: { tipoCriativo: cr.tipo, status: cr.status },
    });
  }

  const trip = cache.tripulantes.find((t) => t.id === tripulanteId);
  if (trip) {
    for (const obs of trip.observacoes) {
      events.push({
        id: `obs-${obs.id}`,
        tripulanteId,
        tipo: "observacao",
        titulo: "Observação interna",
        descricao: obs.texto,
        data: obs.data,
        responsavel: obs.autor,
        fonte: "automatico",
      });
    }
  }

  for (const ev of cache.eventosManuais.filter((e) => e.tripulanteId === tripulanteId)) {
    events.push({
      id: `manual-${ev.id}`,
      tripulanteId,
      tipo: ev.tipo,
      titulo: ev.titulo,
      descricao: ev.descricao,
      data: ev.data,
      responsavel: ev.responsavel,
      fonte: "manual",
    });
  }

  if (trip && trip.status === "ativo") {
    const reunioes = cache.reunioes.filter((r) => r.tripulanteId === tripulanteId && r.status === "realizada");
    const lastReuniao = reunioes.sort((a, b) => b.data.localeCompare(a.data))[0];
    const daysSinceReuniao = lastReuniao ? Math.floor((Date.now() - new Date(lastReuniao.data).getTime()) / 86400000) : 999;

    if (daysSinceReuniao > 14) {
      events.push({
        id: `alerta-reuniao-${tripulanteId}`,
        tripulanteId,
        tipo: "alerta",
        titulo: "Sem contato recente",
        descricao: `Última reunião realizada há ${daysSinceReuniao} dias.`,
        data: new Date().toISOString().split("T")[0],
        responsavel: "Sistema",
        fonte: "automatico",
      });
    }

    const campanhasAtivas = cache.campanhas.filter((c) => c.tripulanteId === tripulanteId && c.tipo !== "pausa");
    const lastCampanha = campanhasAtivas.sort((a, b) => b.data.localeCompare(a.data))[0];
    const daysSinceCampanha = lastCampanha ? Math.floor((Date.now() - new Date(lastCampanha.data).getTime()) / 86400000) : 999;

    if (daysSinceCampanha > 21) {
      events.push({
        id: `alerta-campanha-${tripulanteId}`,
        tripulanteId,
        tipo: "alerta",
        titulo: "Sem campanhas recentes",
        descricao: `Nenhuma campanha/otimização há ${daysSinceCampanha} dias.`,
        data: new Date().toISOString().split("T")[0],
        responsavel: "Sistema",
        fonte: "automatico",
      });
    }

    const vendasRecentes = reunioes.filter((r) => {
      const d = new Date(r.data);
      return r.vendasDeclaradas && Date.now() - d.getTime() < 30 * 86400000;
    });
    if (vendasRecentes.length === 0) {
      events.push({
        id: `alerta-vendas-${tripulanteId}`,
        tripulanteId,
        tipo: "alerta",
        titulo: "Sem vendas declaradas recentes",
        descricao: "Nenhuma venda declarada nos últimos 30 dias.",
        data: new Date().toISOString().split("T")[0],
        responsavel: "Sistema",
        fonte: "automatico",
      });
    }
  }

  events.sort((a, b) => b.data.localeCompare(a.data));
  return events;
}

export function getTripulanteHealth(tripulanteId: string) {
  const reunioes = cache.reunioes.filter((r) => r.tripulanteId === tripulanteId && r.status === "realizada");
  const campanhas = cache.campanhas.filter((c) => c.tripulanteId === tripulanteId);
  const criativos = cache.criativos.filter((c) => c.tripulanteId === tripulanteId);

  const totalVendas = reunioes.reduce((s, r) => s + (r.valorVendas ?? 0), 0);
  const totalReunioesLifetime = reunioes.length;
  const totalCriativosLifetime = criativos.length;
  const campanhasAtivas = campanhas.filter((c) => c.tipo !== "pausa").length;

  const recent = reunioes.filter((r) => Date.now() - new Date(r.data).getTime() < 60 * 86400000);
  const freqMediaDias = recent.length > 1 ? Math.round(60 / recent.length) : recent.length === 1 ? 60 : 0;

  const last4w = reunioes.filter((r) => Date.now() - new Date(r.data).getTime() < 28 * 86400000).length;
  const prev4w = reunioes.filter((r) => {
    const diff = Date.now() - new Date(r.data).getTime();
    return diff >= 28 * 86400000 && diff < 56 * 86400000;
  }).length;
  const tendencia: "crescente" | "estavel" | "decrescente" = last4w > prev4w ? "crescente" : last4w === prev4w ? "estavel" : "decrescente";

  let score = 50;
  if (totalReunioesLifetime > 0) score += 10;
  if (freqMediaDias > 0 && freqMediaDias <= 14) score += 15;
  else if (freqMediaDias > 14) score += 5;
  if (campanhasAtivas > 0) score += 10;
  if (totalVendas > 0) score += 10;
  if (tendencia === "crescente") score += 5;
  if (tendencia === "decrescente") score -= 10;
  score = Math.max(0, Math.min(100, score));

  const status: "saudavel" | "atencao" | "risco" = score >= 70 ? "saudavel" : score >= 40 ? "atencao" : "risco";

  const lastReuniao = reunioes.sort((a, b) => b.data.localeCompare(a.data))[0];
  const lastCampanha = campanhas.sort((a, b) => b.data.localeCompare(a.data))[0];
  const lastDates = [lastReuniao?.data, lastCampanha?.data].filter(Boolean).sort().reverse();
  const ultimoContato = lastDates[0] || null;

  return {
    totalReunioesLifetime,
    totalCriativosLifetime,
    totalVendas,
    campanhasAtivas,
    freqMediaDias,
    tendencia,
    score,
    status,
    ultimoContato,
  };
}
