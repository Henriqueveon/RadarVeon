import { supabase } from "./supabase";

export type NotifTipo =
  | "access_request"
  | "access_granted"
  | "access_denied"
  | "new_tripulante"
  | "new_reuniao"
  | "new_campanha"
  | "new_criativo"
  | "new_evento"
  | "tripulante_deleted";

export interface Notificacao {
  id: string;
  recipient_id: string | null;
  tipo: NotifTipo;
  titulo: string;
  descricao: string;
  link_entity: string | null;
  autor_id: string | null;
  lida: boolean;
  created_at: string;
  autor?: { nome: string; role: string } | null;
}

export interface NotifyPayload {
  tipo: NotifTipo;
  titulo: string;
  descricao?: string;
  linkEntity?: string;
  recipientId?: string | null;
}

export async function createNotification(
  p: NotifyPayload,
  autorId: string | null
) {
  const { error } = await supabase.from("notificacoes").insert({
    recipient_id: p.recipientId ?? null,
    tipo: p.tipo,
    titulo: p.titulo,
    descricao: p.descricao ?? "",
    link_entity: p.linkEntity ?? null,
    autor_id: autorId,
  });
  if (error) console.error("createNotification:", error);
}

export async function fetchNotifications(): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*, autor:profiles!notificacoes_autor_id_fkey(nome, role)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("fetchNotifications:", error);
    return [];
  }
  return (data ?? []) as Notificacao[];
}

export async function markAsRead(id: string) {
  await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
}

export async function markAllAsRead(userId: string) {
  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .or(`recipient_id.eq.${userId},recipient_id.is.null`);
}

export async function approveUser(profileId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ approved: true })
    .eq("id", profileId);
  if (error) {
    console.error("approveUser:", error);
    return { error: error.message };
  }
  return { error: null };
}

export async function denyUser(profileId: string) {
  const { error } = await supabase.from("profiles").delete().eq("id", profileId);
  if (error) {
    console.error("denyUser:", error);
    return { error: error.message };
  }
  return { error: null };
}
