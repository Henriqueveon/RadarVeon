import { useEffect, useRef, useState } from "react";
import { Bell, Check, X, Users, Megaphone, Handshake, Palette, MapPin, UserPlus, UserCheck, UserX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  approveUser,
  denyUser,
  type Notificacao,
  type NotifTipo,
} from "@/lib/notifications";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const NOTIF_ICON: Record<NotifTipo, React.ComponentType<{ className?: string }>> = {
  access_request: UserPlus,
  access_granted: UserCheck,
  access_denied: UserX,
  new_tripulante: Users,
  new_reuniao: Handshake,
  new_campanha: Megaphone,
  new_criativo: Palette,
  new_evento: MapPin,
  tripulante_deleted: X,
};

const NOTIF_COLOR: Record<NotifTipo, string> = {
  access_request: "text-[#d79b3f]",
  access_granted: "text-[#4aa971]",
  access_denied: "text-[#e07464]",
  new_tripulante: "text-[#529cca]",
  new_reuniao: "text-[#529cca]",
  new_campanha: "text-[#a78bfa]",
  new_criativo: "text-[#e879a3]",
  new_evento: "text-[#d79b3f]",
  tripulante_deleted: "text-[#e07464]",
};

export function NotificationsBell() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter((n) => !n.lida).length;

  async function loadNotifs() {
    if (!user) return;
    const data = await fetchNotifications();
    setNotifs(data);
  }

  useEffect(() => {
    if (!user) return;
    loadNotifs();

    const channel = supabase
      .channel("notificacoes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes" },
        () => {
          loadNotifs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  async function handleMarkRead(id: string) {
    await markAsRead(id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  }

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllAsRead(user.id);
    setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })));
    toast.success("Todas marcadas como lidas");
  }

  async function handleApprove(notif: Notificacao) {
    const profileId = notif.link_entity?.replace("profile/", "");
    if (!profileId) return;
    setProcessing((prev) => new Set(prev).add(notif.id));
    const { error } = await approveUser(profileId);
    setProcessing((prev) => {
      const n = new Set(prev);
      n.delete(notif.id);
      return n;
    });
    if (error) {
      toast.error("Erro ao aprovar: " + error);
    } else {
      toast.success("Acesso aprovado!");
      await markAsRead(notif.id);
      loadNotifs();
    }
  }

  async function handleDeny(notif: Notificacao) {
    const profileId = notif.link_entity?.replace("profile/", "");
    if (!profileId) return;
    if (!window.confirm("Negar acesso e excluir esta solicitação?")) return;
    setProcessing((prev) => new Set(prev).add(notif.id));
    const { error } = await denyUser(profileId);
    setProcessing((prev) => {
      const n = new Set(prev);
      n.delete(notif.id);
      return n;
    });
    if (error) {
      toast.error("Erro ao negar: " + error);
    } else {
      toast.success("Solicitação negada");
      await markAsRead(notif.id);
      loadNotifs();
    }
  }

  if (!user || !profile?.approved) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className="relative flex h-8 w-8 items-center justify-center rounded hover:bg-white/5 text-white transition-colors"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e07464] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-[380px] max-h-[500px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#1f1f1f] shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <h3 className="text-[14px] font-semibold text-white">Notificações</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[12px] text-[#529cca] hover:text-[#6bb1de]"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-[#9b9b9b]">Nenhuma notificação</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {notifs.map((n) => {
                  const Icon = NOTIF_ICON[n.tipo] ?? Bell;
                  const isRequest = n.tipo === "access_request";
                  const isProcessing = processing.has(n.id);
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "group px-4 py-3 hover:bg-white/[0.02] transition-colors",
                        !n.lida && "bg-[#529cca]/[0.04]"
                      )}
                    >
                      <div className="flex gap-3">
                        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", NOTIF_COLOR[n.tipo])} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-medium text-white">
                              {n.titulo}
                            </p>
                            {!n.lida && !isRequest && (
                              <button
                                type="button"
                                onClick={() => handleMarkRead(n.id)}
                                aria-label="Marcar como lida"
                                className="text-[#6f6f6f] hover:text-white"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          {n.descricao && (
                            <p className="mt-0.5 text-[12px] text-[#9b9b9b] break-words">
                              {n.descricao}
                            </p>
                          )}
                          {n.autor && (
                            <p className="mt-1 text-[11px] text-[#6f6f6f]">
                              por {n.autor.nome} · {n.autor.role}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-[#6f6f6f]">
                            {formatDistanceToNow(new Date(n.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>

                          {isRequest && profile?.role === "almirante" && (
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprove(n)}
                                disabled={isProcessing}
                                className="rounded bg-[#4aa971]/10 hover:bg-[#4aa971]/20 text-[#4aa971] text-[12px] font-medium px-2.5 py-1 transition-colors disabled:opacity-50"
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeny(n)}
                                disabled={isProcessing}
                                className="rounded bg-[#e07464]/10 hover:bg-[#e07464]/20 text-[#e07464] text-[12px] font-medium px-2.5 py-1 transition-colors disabled:opacity-50"
                              >
                                Negar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
