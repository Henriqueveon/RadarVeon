// ============================================================
// RADAR VEON — Dados Mockados Realistas
// ============================================================

export interface Tenente {
  id: string;
  name: string;
  role: string;
}

export interface TripulanteMock {
  id: string;
  name: string;
  loja: string;
  cidade: string;
  uf: string;
  phone: string;
  email: string;
  tenente: string;
  status: "ativo" | "inativo";
  dataEntrada: string;
  avatar: string;
  plano: string;
  observacoes: Observacao[];
}

export interface Observacao {
  id: string;
  texto: string;
  autor: string;
  data: string;
}

export interface KPIData {
  reunioes: number;
  vendas: number;
  oficinas: number;
  criativos: number;
  campanhasNovas: number;
  otimizacoes: number;
  demandasCriadas: number;
  demandasConcluidas: number;
}

export interface CampanhaRegistro {
  id: string;
  tripulanteId: string;
  data: string;
  tipo: "nova_campanha" | "otimizacao" | "ajuste_verba" | "pausa" | "reativacao";
  descricao: string;
  responsavel: string;
  investimento: number;
  resultado: string;
}

export interface ReuniaoMock {
  id: string;
  tripulanteId: string;
  tenenteId: string;
  data: string;
  horario: string;
  status: "realizada" | "agendada" | "cancelada";
  animo: "muito_bem" | "bem" | "neutro" | "desmotivado" | "critico";
  produtiva: boolean;
  vendasDeclaradas: boolean;
  valorVendas: number | null;
  diagnosticoBussola: boolean;
  transcricao: string;
  observacoes: string;
  linkDocumento: string;
}

export interface CriativoMock {
  id: string;
  tripulanteId: string;
  data: string;
  tipo: "imagem_estatica" | "carrossel" | "video" | "stories" | "outro";
  status: "em_producao" | "aprovado" | "publicado" | "reprovado";
  responsavel: string;
  linkArquivo: string;
  descricao: string;
}

// --- Tenentes ---
export const tenentes: Tenente[] = [
  { id: "t1", name: "Matheus Silva", role: "Gestor de Tráfego" },
  { id: "t2", name: "Rafael Oliveira", role: "Consultor Estratégico" },
  { id: "t3", name: "Breno Santos", role: "Produtor Criativo" },
];

// --- Tripulantes ---
export const tripulantes: TripulanteMock[] = [
  {
    id: "1", name: "Carlos Eduardo Mendes", loja: "Colchões Premium Campinas", cidade: "Campinas", uf: "SP",
    phone: "(19) 99812-4433", email: "carlos@colchoespremium.com.br", tenente: "Matheus Silva",
    status: "ativo", dataEntrada: "2025-08-15", avatar: "CE", plano: "Plano Completo",
    observacoes: [
      { id: "o1", texto: "Tripulante muito engajado, participa de todas as oficinas.", autor: "Rafael Oliveira", data: "2026-04-08" },
      { id: "o2", texto: "Solicitou revisão da estratégia de criativos para o mês de maio.", autor: "Breno Santos", data: "2026-04-03" },
    ],
  },
  {
    id: "2", name: "Ana Paula Ferreira", loja: "Estofados Confort", cidade: "Ribeirão Preto", uf: "SP",
    phone: "(16) 99745-2210", email: "ana@estofadosconfort.com.br", tenente: "Rafael Oliveira",
    status: "ativo", dataEntrada: "2025-10-02", avatar: "AP", plano: "Plano Essencial",
    observacoes: [
      { id: "o3", texto: "Precisa de mais atenção nas campanhas de Google Ads.", autor: "Matheus Silva", data: "2026-04-05" },
    ],
  },
  {
    id: "3", name: "Roberto Lima", loja: "Móveis Casa Nova", cidade: "Belo Horizonte", uf: "MG",
    phone: "(31) 99634-8877", email: "roberto@moveiscasanova.com.br", tenente: "Matheus Silva",
    status: "ativo", dataEntrada: "2025-06-20", avatar: "RL", plano: "Plano Completo",
    observacoes: [],
  },
  {
    id: "4", name: "Fernanda Costa", loja: "Colchões & Sonhos", cidade: "Curitiba", uf: "PR",
    phone: "(41) 99521-3366", email: "fernanda@colchoesesonhos.com.br", tenente: "Rafael Oliveira",
    status: "ativo", dataEntrada: "2025-12-10", avatar: "FC", plano: "Plano Completo",
    observacoes: [
      { id: "o4", texto: "Excelente resultado na Black Friday. Manter estratégia.", autor: "Matheus Silva", data: "2026-03-28" },
    ],
  },
  {
    id: "5", name: "João Marcos Pereira", loja: "JP Estofados", cidade: "Goiânia", uf: "GO",
    phone: "(62) 99488-1155", email: "joao@jpestofados.com.br", tenente: "Breno Santos",
    status: "ativo", dataEntrada: "2026-01-08", avatar: "JM", plano: "Plano Essencial",
    observacoes: [],
  },
  {
    id: "6", name: "Mariana Alves", loja: "Alves Colchões", cidade: "Salvador", uf: "BA",
    phone: "(71) 99377-6644", email: "mariana@alvescolchoes.com.br", tenente: "Matheus Silva",
    status: "ativo", dataEntrada: "2025-09-14", avatar: "MA", plano: "Plano Completo",
    observacoes: [],
  },
  {
    id: "7", name: "Paulo Henrique Dias", loja: "PH Móveis Planejados", cidade: "Florianópolis", uf: "SC",
    phone: "(48) 99266-5533", email: "paulo@phmoveis.com.br", tenente: "Rafael Oliveira",
    status: "inativo", dataEntrada: "2025-05-03", avatar: "PH", plano: "Plano Essencial",
    observacoes: [
      { id: "o5", texto: "Tripulante pausou contrato por questões pessoais. Retorno previsto em maio.", autor: "Rafael Oliveira", data: "2026-03-15" },
    ],
  },
  {
    id: "8", name: "Luciana Barbosa", loja: "Barbosa Estofados & Colchões", cidade: "Fortaleza", uf: "CE",
    phone: "(85) 99155-4422", email: "luciana@barbosaestofados.com.br", tenente: "Breno Santos",
    status: "ativo", dataEntrada: "2025-11-20", avatar: "LB", plano: "Plano Completo",
    observacoes: [],
  },
  {
    id: "9", name: "Thiago Rocha", loja: "Rocha Colchões Express", cidade: "Manaus", uf: "AM",
    phone: "(92) 99044-3311", email: "thiago@rochacolchoes.com.br", tenente: "Matheus Silva",
    status: "ativo", dataEntrada: "2026-02-01", avatar: "TR", plano: "Plano Essencial",
    observacoes: [],
  },
  {
    id: "10", name: "Camila Souza", loja: "Souza Home Design", cidade: "Porto Alegre", uf: "RS",
    phone: "(51) 98933-2200", email: "camila@souzahome.com.br", tenente: "Rafael Oliveira",
    status: "ativo", dataEntrada: "2025-07-22", avatar: "CS", plano: "Plano Completo",
    observacoes: [
      { id: "o6", texto: "Tripulante com melhor taxa de conversão da frota este mês.", autor: "Matheus Silva", data: "2026-04-09" },
    ],
  },
];

// --- KPIs por tripulante (semana atual vs anterior) ---
export function getKPIs(tripulanteId?: string): { atual: KPIData; anterior: KPIData } {
  if (tripulanteId) {
    const seed = parseInt(tripulanteId) || 1;
    return {
      atual: {
        reunioes: 1 + (seed % 2),
        vendas: 8000 + seed * 2200,
        oficinas: 1,
        criativos: 2 + (seed % 3),
        campanhasNovas: seed % 3,
        otimizacoes: 2 + (seed % 4),
        demandasCriadas: 0,
        demandasConcluidas: 0,
      },
      anterior: {
        reunioes: 1,
        vendas: 6500 + seed * 1800,
        oficinas: 1,
        criativos: 1 + (seed % 2),
        campanhasNovas: (seed + 1) % 3,
        otimizacoes: 1 + (seed % 3),
        demandasCriadas: 0,
        demandasConcluidas: 0,
      },
    };
  }
  return {
    atual: { reunioes: 18, vendas: 127500, oficinas: 2, criativos: 24, campanhasNovas: 7, otimizacoes: 31, demandasCriadas: 0, demandasConcluidas: 0 },
    anterior: { reunioes: 15, vendas: 98200, oficinas: 2, criativos: 19, campanhasNovas: 5, otimizacoes: 26, demandasCriadas: 0, demandasConcluidas: 0 },
  };
}

// --- Campanhas ---
export const campanhas: CampanhaRegistro[] = [
  { id: "c1", tripulanteId: "1", data: "2026-04-09", tipo: "otimizacao", descricao: "Ajuste de público-alvo Meta Ads — segmentação por interesse em decoração", responsavel: "Matheus Silva", investimento: 1200, resultado: "CPL caiu de R$18 para R$12" },
  { id: "c2", tripulanteId: "1", data: "2026-04-07", tipo: "nova_campanha", descricao: "Campanha Dia das Mães — Carrossel com 5 peças + vídeo curto", responsavel: "Matheus Silva", investimento: 2500, resultado: "42 leads em 3 dias" },
  { id: "c3", tripulanteId: "2", data: "2026-04-09", tipo: "otimizacao", descricao: "Teste A/B de criativos — imagem vs vídeo no Instagram", responsavel: "Rafael Oliveira", investimento: 800, resultado: "Vídeo com 3x mais engajamento" },
  { id: "c4", tripulanteId: "3", data: "2026-04-08", tipo: "ajuste_verba", descricao: "Aumento de verba diária de R$50 para R$80 após bons resultados", responsavel: "Matheus Silva", investimento: 2400, resultado: "Projeção: +60% de leads" },
  { id: "c5", tripulanteId: "4", data: "2026-04-09", tipo: "nova_campanha", descricao: "Google Ads Search — palavras-chave colchão ortopédico Curitiba", responsavel: "Rafael Oliveira", investimento: 1500, resultado: "15 leads nas primeiras 48h" },
  { id: "c6", tripulanteId: "5", data: "2026-04-07", tipo: "pausa", descricao: "Pausa temporária de campanhas — tripulante em reforma da loja", responsavel: "Breno Santos", investimento: 0, resultado: "Retorno previsto: 14/04" },
  { id: "c7", tripulanteId: "6", data: "2026-04-08", tipo: "otimizacao", descricao: "Revisão de copy dos anúncios — foco em urgência e promoção", responsavel: "Matheus Silva", investimento: 950, resultado: "CTR subiu de 1.2% para 2.8%" },
  { id: "c8", tripulanteId: "8", data: "2026-04-09", tipo: "nova_campanha", descricao: "Campanha local Fortaleza — Geolocalização 15km da loja", responsavel: "Breno Santos", investimento: 1800, resultado: "28 leads, 4 visitas à loja" },
  { id: "c9", tripulanteId: "9", data: "2026-04-06", tipo: "reativacao", descricao: "Reativação de campanha após ajustes na landing page", responsavel: "Matheus Silva", investimento: 600, resultado: "Aguardando dados (3 dias)" },
  { id: "c10", tripulanteId: "10", data: "2026-04-09", tipo: "otimizacao", descricao: "Otimização de lance automático para conversão em vez de cliques", responsavel: "Rafael Oliveira", investimento: 1100, resultado: "CPA reduziu 22%" },
];

// --- Métricas comparativas por tripulante ---
export function getCampanhaMetricas(tripulanteId: string) {
  const seed = parseInt(tripulanteId) || 1;
  return {
    semanaAtual: {
      campanhasNovas: seed % 3,
      otimizacoes: 2 + (seed % 4),
      investimento: 800 + seed * 400,
      leads: 10 + seed * 5,
    },
    semanaAnterior: {
      campanhasNovas: (seed + 1) % 3,
      otimizacoes: 1 + (seed % 3),
      investimento: 600 + seed * 350,
      leads: 7 + seed * 4,
    },
  };
}

// --- Reuniões ---
export const reunioes: ReuniaoMock[] = [
  { id: "r1", tripulanteId: "1", tenenteId: "t2", data: "2026-04-09", horario: "10:00", status: "realizada", animo: "muito_bem", produtiva: true, vendasDeclaradas: true, valorVendas: 12500, diagnosticoBussola: true, transcricao: "Carlos reportou aumento significativo nas vendas após campanha de Dia das Mães. Equipe da loja está motivada. Discutimos estratégia para manter momentum pós-campanha.", observacoes: "Sugerir upsell de acessórios na próxima reunião.", linkDocumento: "" },
  { id: "r2", tripulanteId: "2", tenenteId: "t2", data: "2026-04-08", horario: "14:00", status: "realizada", animo: "bem", produtiva: true, vendasDeclaradas: true, valorVendas: 8200, diagnosticoBussola: false, transcricao: "Ana relatou dificuldade com atendimento no WhatsApp. Sugerimos implementar mensagens automáticas via CRM.", observacoes: "Agendar treinamento de CRM AGULHA.", linkDocumento: "" },
  { id: "r3", tripulanteId: "4", tenenteId: "t2", data: "2026-04-07", horario: "09:30", status: "realizada", animo: "neutro", produtiva: true, vendasDeclaradas: false, valorVendas: null, diagnosticoBussola: true, transcricao: "Fernanda está preocupada com sazonalidade. Apresentamos plano de campanha para período de baixa.", observacoes: "", linkDocumento: "" },
  { id: "r4", tripulanteId: "3", tenenteId: "t1", data: "2026-04-10", horario: "11:00", status: "agendada", animo: "neutro", produtiva: false, vendasDeclaradas: false, valorVendas: null, diagnosticoBussola: false, transcricao: "", observacoes: "Preparar relatório de performance das últimas 4 semanas.", linkDocumento: "" },
  { id: "r5", tripulanteId: "6", tenenteId: "t1", data: "2026-04-10", horario: "15:00", status: "agendada", animo: "neutro", produtiva: false, vendasDeclaradas: false, valorVendas: null, diagnosticoBussola: false, transcricao: "", observacoes: "", linkDocumento: "" },
  { id: "r6", tripulanteId: "8", tenenteId: "t3", data: "2026-04-11", horario: "10:30", status: "agendada", animo: "neutro", produtiva: false, vendasDeclaradas: false, valorVendas: null, diagnosticoBussola: false, transcricao: "", observacoes: "Luciana pediu revisão dos criativos.", linkDocumento: "" },
  { id: "r7", tripulanteId: "5", tenenteId: "t3", data: "2026-04-05", horario: "16:00", status: "cancelada", animo: "desmotivado", produtiva: false, vendasDeclaradas: false, valorVendas: null, diagnosticoBussola: false, transcricao: "", observacoes: "João cancelou por conta da reforma. Reagendar quando loja reabrir.", linkDocumento: "" },
  { id: "r8", tripulanteId: "10", tenenteId: "t2", data: "2026-04-09", horario: "16:30", status: "realizada", animo: "muito_bem", produtiva: true, vendasDeclaradas: true, valorVendas: 18900, diagnosticoBussola: true, transcricao: "Camila bateu recorde de vendas. Estratégia de remarketing funcionou muito bem. Planejar escala de verba.", observacoes: "Melhor tripulante do mês. Considerar case de sucesso.", linkDocumento: "" },
];

// --- Criativos ---
export const criativos: CriativoMock[] = [
  { id: "cr1", tripulanteId: "1", data: "2026-04-09", tipo: "carrossel", status: "publicado", responsavel: "Breno Santos", linkArquivo: "", descricao: "Carrossel Dia das Mães — 5 peças com foco em colchões ortopédicos" },
  { id: "cr2", tripulanteId: "1", data: "2026-04-08", tipo: "video", status: "publicado", responsavel: "Breno Santos", linkArquivo: "", descricao: "Vídeo 15s Reels — Promoção Dia das Mães" },
  { id: "cr3", tripulanteId: "2", data: "2026-04-09", tipo: "imagem_estatica", status: "aprovado", responsavel: "Breno Santos", linkArquivo: "", descricao: "Banner promoção estofados — 30% OFF" },
  { id: "cr4", tripulanteId: "3", data: "2026-04-07", tipo: "stories", status: "publicado", responsavel: "Breno Santos", linkArquivo: "", descricao: "Sequência de 3 stories com depoimento de cliente" },
  { id: "cr5", tripulanteId: "4", data: "2026-04-08", tipo: "imagem_estatica", status: "em_producao", responsavel: "Breno Santos", linkArquivo: "", descricao: "Arte para Google Display — colchões terapêuticos" },
  { id: "cr6", tripulanteId: "6", data: "2026-04-09", tipo: "carrossel", status: "publicado", responsavel: "Breno Santos", linkArquivo: "", descricao: "Carrossel antes/depois — decoração de quarto" },
  { id: "cr7", tripulanteId: "8", data: "2026-04-07", tipo: "video", status: "aprovado", responsavel: "Breno Santos", linkArquivo: "", descricao: "Vídeo institucional loja — tour 30s" },
  { id: "cr8", tripulanteId: "9", data: "2026-04-06", tipo: "imagem_estatica", status: "reprovado", responsavel: "Breno Santos", linkArquivo: "", descricao: "Banner Facebook — precisa ajustar cores da marca" },
  { id: "cr9", tripulanteId: "10", data: "2026-04-09", tipo: "carrossel", status: "publicado", responsavel: "Breno Santos", linkArquivo: "", descricao: "Carrossel 4 peças — coleção nova primavera" },
  { id: "cr10", tripulanteId: "10", data: "2026-04-08", tipo: "stories", status: "publicado", responsavel: "Breno Santos", linkArquivo: "", descricao: "Stories com countdown para promoção relâmpago" },
  { id: "cr11", tripulanteId: "5", data: "2026-04-05", tipo: "imagem_estatica", status: "em_producao", responsavel: "Breno Santos", linkArquivo: "", descricao: "Arte reabertura loja após reforma" },
  { id: "cr12", tripulanteId: "1", data: "2026-04-06", tipo: "video", status: "publicado", responsavel: "Breno Santos", linkArquivo: "", descricao: "Vídeo depoimento cliente satisfeito — 45s" },
];

// --- Helpers ---
export const TIPO_CAMPANHA_LABELS: Record<CampanhaRegistro["tipo"], string> = {
  nova_campanha: "Nova Campanha",
  otimizacao: "Otimização",
  ajuste_verba: "Ajuste de Verba",
  pausa: "Pausa",
  reativacao: "Reativação",
};

export const TIPO_CRIATIVO_LABELS: Record<CriativoMock["tipo"], string> = {
  imagem_estatica: "Imagem Estática",
  carrossel: "Carrossel",
  video: "Vídeo",
  stories: "Stories",
  outro: "Outro",
};

export const STATUS_CRIATIVO_LABELS: Record<CriativoMock["status"], string> = {
  em_producao: "Em Produção",
  aprovado: "Aprovado",
  publicado: "Publicado",
  reprovado: "Reprovado",
};

export const ANIMO_LABELS: Record<ReuniaoMock["animo"], string> = {
  muito_bem: "Muito Bem",
  bem: "Bem",
  neutro: "Neutro",
  desmotivado: "Desmotivado",
  critico: "Crítico",
};

export const ANIMO_EMOJIS: Record<ReuniaoMock["animo"], string> = {
  muito_bem: "😄",
  bem: "🙂",
  neutro: "😐",
  desmotivado: "😔",
  critico: "🚨",
};

export function getTripulanteById(id: string) {
  return tripulantes.find((t) => t.id === id);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatVariation(atual: number, anterior: number): { value: string; positive: boolean; neutral: boolean } {
  if (anterior === 0) return { value: "+100%", positive: true, neutral: false };
  const pct = ((atual - anterior) / anterior) * 100;
  if (Math.abs(pct) < 1) return { value: "0%", positive: false, neutral: true };
  return {
    value: `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`,
    positive: pct > 0,
    neutral: false,
  };
}
