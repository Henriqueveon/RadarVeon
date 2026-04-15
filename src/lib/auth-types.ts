// Tipos relacionados a autenticação e perfis

export type UserRole = "almirante" | "capitao" | "tenente" | "cabo";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  observacao_funcao: string | null;
  approved: boolean;
  avatar_iniciais: string | null;
  created_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  almirante: "Almirante — Gestor",
  capitao: "Capitão — Gestão Comercial",
  tenente: "Tenente — Geração de Demanda",
  cabo: "Cabo — Criação de Mídia",
};

export const ROLE_LABELS_SHORT: Record<UserRole, string> = {
  almirante: "Almirante",
  capitao: "Capitão",
  tenente: "Tenente",
  cabo: "Cabo",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  almirante: "Gestor da operação",
  capitao: "Especialista em gestão comercial",
  tenente: "Especialista em geração de demanda",
  cabo: "Especialista em criação de mídia",
};

export function getInitials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
