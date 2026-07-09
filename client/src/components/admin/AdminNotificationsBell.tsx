import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminNotifications } from "@/contexts/AdminNotificationsContext";
import type { AdminNotification } from "@shared/types/notification";
import { Bell, ShoppingCart, UserPlus } from "lucide-react";
import { useLocation } from "wouter";

function NotificationIcon({ type }: { type: AdminNotification["type"] }) {
  if (type === "new_order") return <ShoppingCart className="size-4 text-[#C4522A]" />;
  return <UserPlus className="size-4 text-[#2D6A4F]" />;
}

function getNotificationHref(notification: AdminNotification): string {
  if (notification.entityType === "order") {
    return `/admin/pedidos/${notification.entityId}`;
  }
  return `/admin/clientes/${notification.entityId}`;
}

export default function AdminNotificationsBell() {
  const [, setLocation] = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();

  async function handleOpenNotification(notification: AdminNotification) {
    if (!notification.readAt) {
      try {
        await markAsRead(notification.id);
      } catch {
        // Navega mesmo se falhar marcar como lida
      }
    }
    setLocation(getNotificationHref(notification));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative border-[#E8D5C4]">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#C4522A] px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="text-xs font-medium text-[#C4522A] hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-[#8B6F5E]">
            Nenhuma notificação por enquanto.
          </div>
        ) : (
          notifications.slice(0, 8).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="cursor-pointer items-start gap-3 p-3"
              onClick={() => handleOpenNotification(notification)}
            >
              <NotificationIcon type={notification.type} />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${notification.readAt ? "text-[#8B6F5E]" : "font-semibold text-[#3D2B1F]"}`}
                >
                  {notification.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-[#8B6F5E]">{notification.message}</p>
                <p className="mt-1 text-[10px] text-[#8B6F5E]/80">
                  {new Date(notification.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              {!notification.readAt && (
                <span className="mt-1 size-2 shrink-0 rounded-full bg-[#C4522A]" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
