import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAdminNotifications } from "@/contexts/AdminNotificationsContext";
import type { AdminNotification } from "@shared/types/notification";
import { Bell, ShoppingCart, UserPlus } from "lucide-react";
import { useState } from "react";
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

function NotificationList({
  notifications,
  unreadCount,
  onOpen,
  onMarkAll,
}: {
  notifications: AdminNotification[];
  unreadCount: number;
  onOpen: (notification: AdminNotification) => void;
  onMarkAll: () => void;
}) {
  if (notifications.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-[#8B6F5E]">
        Nenhuma notificação por enquanto.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#E8D5C4]/80">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#8B6F5E]">
            {unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}
          </span>
          <button
            type="button"
            onClick={onMarkAll}
            className="text-xs font-semibold text-[#C4522A] active:opacity-70"
          >
            Marcar todas como lidas
          </button>
        </div>
      )}
      {notifications.slice(0, 12).map((notification) => (
        <button
          key={notification.id}
          type="button"
          onClick={() => onOpen(notification)}
          className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors active:bg-[#FAF7F2]"
        >
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF7F2]">
            <NotificationIcon type={notification.type} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm leading-snug ${notification.readAt ? "text-[#8B6F5E]" : "font-semibold text-[#3D2B1F]"}`}
            >
              {notification.title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#8B6F5E]">
              {notification.message}
            </p>
            <p className="mt-1.5 text-[10px] text-[#8B6F5E]/80">
              {new Date(notification.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
          {!notification.readAt && (
            <span className="mt-2 size-2 shrink-0 rounded-full bg-[#C4522A]" />
          )}
        </button>
      ))}
    </div>
  );
}

export default function AdminNotificationsBell() {
  const [, setLocation] = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();
  const [sheetOpen, setSheetOpen] = useState(false);

  async function handleOpenNotification(notification: AdminNotification) {
    if (!notification.readAt) {
      try {
        await markAsRead(notification.id);
      } catch {
        // Navega mesmo se falhar marcar como lida
      }
    }
    setSheetOpen(false);
    setLocation(getNotificationHref(notification));
  }

  const triggerButton = (
    <Button variant="outline" size="icon-sm" className="relative border-[#E8D5C4] sm:size-9">
      <Bell className="size-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#C4522A] px-1 text-[9px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );

  return (
    <>
      <div className="lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>{triggerButton}</SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[88dvh] rounded-t-3xl p-0"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <SheetHeader className="border-b border-[#E8D5C4] px-4 py-4">
              <SheetTitle style={{ fontFamily: "'Playfair Display', serif" }}>
                Notificações
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto">
              <NotificationList
                notifications={notifications}
                unreadCount={unreadCount}
                onOpen={handleOpenNotification}
                onMarkAll={() => markAllAsRead()}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden lg:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
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
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#8B6F5E]">
                      {notification.message}
                    </p>
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
      </div>
    </>
  );
}
