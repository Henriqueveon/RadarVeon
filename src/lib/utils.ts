import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { HealthStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: ptBR,
  });
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function daysSince(date: string | Date): number {
  return differenceInDays(new Date(), new Date(date));
}

export function healthStatusColor(status: HealthStatus): string {
  const colors: Record<HealthStatus, string> = {
    verde: "text-health-green",
    amarelo: "text-health-yellow",
    vermelho: "text-health-red",
  };
  return colors[status];
}

export function healthStatusBg(status: HealthStatus): string {
  const colors: Record<HealthStatus, string> = {
    verde: "bg-health-green",
    amarelo: "bg-health-yellow",
    vermelho: "bg-health-red",
  };
  return colors[status];
}

export function scoreToStatus(score: number): HealthStatus {
  if (score >= 80) return "verde";
  if (score >= 50) return "amarelo";
  return "vermelho";
}
