// ============================================================
// RADAR VEON — Modelo de Dados (TypeScript Interfaces)
// ============================================================

// --- Enums ---

export type UserRole = "almirante" | "equipe" | "tripulante";

export type EixoType = "servico" | "treinamento" | "tecnologia";

export type HealthStatus = "verde" | "amarelo" | "vermelho";

export type FrequenciaType = "diaria" | "semanal" | "quinzenal" | "mensal";

export type TicketStatus = "aberto" | "em_andamento" | "resolvido";

export type TicketPrioridade = "baixa" | "media" | "alta" | "urgente";

export type ReuniaoTipo = "acompanhamento" | "onboarding" | "estrategia";

// --- Entities ---

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Tripulante {
  id: string;
  profile_id: string | null;
  business_name: string;
  business_type: string;
  city: string;
  state: string;
  phone: string;
  contract_start: string;
  contract_plan: string;
  health_score: number;
  health_status: HealthStatus;
  meta_ads_account_id: string | null;
  google_ads_account_id: string | null;
  agulha_active: boolean;
  perfil_comportamental_done: boolean;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface Entrega {
  id: string;
  tripulante_id: string;
  responsavel_id: string;
  eixo: EixoType;
  tipo: string;
  descricao: string;
  attachments: string[];
  delivered_at: string;
  created_at: string;
}

export interface Cadencia {
  id: string;
  eixo: EixoType;
  tipo: string;
  frequencia: FrequenciaType;
  quantidade_minima: number;
  peso_no_eixo: number;
  active: boolean;
}

export interface TicketSuporte {
  id: string;
  tripulante_id: string;
  aberto_por: string;
  assunto: string;
  descricao: string;
  status: TicketStatus;
  prioridade: TicketPrioridade;
  responsavel_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface PresencaOficina {
  id: string;
  oficina_numero: number;
  oficina_tema: string;
  oficina_data: string;
  tripulante_id: string;
  presente: boolean;
  notas: string | null;
}

export interface AcaoReuniao {
  acao: string;
  responsavel: string;
  prazo: string;
}

export interface Reuniao {
  id: string;
  tripulante_id: string;
  responsavel_id: string;
  tipo: ReuniaoTipo;
  pauta: string;
  acoes: AcaoReuniao[];
  data_reuniao: string;
}

// --- Joined / Extended types ---

export interface TripulanteWithProfile extends Tripulante {
  profile: Profile | null;
}

export interface EntregaWithRelations extends Entrega {
  tripulante: Pick<Tripulante, "id" | "business_name" | "city" | "state">;
  responsavel: Pick<Profile, "id" | "full_name">;
}

export interface TicketWithRelations extends TicketSuporte {
  tripulante: Pick<Tripulante, "id" | "business_name">;
  aberto_por_profile: Pick<Profile, "id" | "full_name">;
  responsavel: Pick<Profile, "id" | "full_name"> | null;
}

export interface ReuniaoWithRelations extends Reuniao {
  tripulante: Pick<Tripulante, "id" | "business_name">;
  responsavel: Pick<Profile, "id" | "full_name">;
}

// --- Delivery type options per axis ---

export const TIPOS_POR_EIXO: Record<EixoType, string[]> = {
  servico: [
    "Otimização de campanha",
    "Criativo produzido",
    "Construção de oferta",
    "Reunião de acompanhamento",
    "Suporte pontual",
  ],
  treinamento: [
    "Oficina (grupo)",
    "Treinamento individual",
    "Material disponibilizado",
  ],
  tecnologia: [
    "Implantação AGULHA",
    "Teste de perfil aplicado",
    "Suporte técnico",
  ],
};

export const BUSINESS_TYPES = [
  "Colchões",
  "Móveis",
  "Estofados",
  "Colchões e Móveis",
  "Outros",
] as const;

export const EIXO_LABELS: Record<EixoType, string> = {
  servico: "Prestação de Serviço",
  treinamento: "Treinamento e Educação",
  tecnologia: "Tecnologia",
};

export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  verde: "Saudável",
  amarelo: "Atenção",
  vermelho: "Crítico",
};
