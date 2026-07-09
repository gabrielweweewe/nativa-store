import {
  fetchAdminNotifications,
  fetchAdminUnreadCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminUnreadCountResponse,
} from "@/lib/adminApi";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import type { AdminNotification } from "@shared/types/notification";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const POLL_INTERVAL_MS = 30_000;

interface AdminNotificationsContextValue {
  notifications: AdminNotification[];
  unreadCount: number;
  unreadByType: AdminUnreadCountResponse["byType"];
  isLoading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextValue | null>(null);

export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByType, setUnreadByType] = useState<AdminUnreadCountResponse["byType"]>({
    new_order: 0,
    new_customer: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const [notifData, unreadData] = await Promise.all([
        fetchAdminNotifications(),
        fetchAdminUnreadCount(),
      ]);
      setNotifications(notifData);
      setUnreadCount(unreadData.count);
      setUnreadByType(unreadData.byType);
    } catch {
      // Silencioso no polling para não poluir o painel com toasts
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setUnreadByType({ new_order: 0, new_customer: 0 });
      return;
    }

    refresh();
    const intervalId = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, refresh]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await markAdminNotificationRead(notificationId);
      await refresh();
    },
    [refresh],
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAdminNotificationsRead();
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      unreadByType,
      isLoading,
      refresh,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, unreadCount, unreadByType, isLoading, refresh, markAsRead, markAllAsRead],
  );

  return (
    <AdminNotificationsContext.Provider value={value}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}

export function useAdminNotifications() {
  const context = useContext(AdminNotificationsContext);
  if (!context) {
    throw new Error("useAdminNotifications deve ser usado dentro de AdminNotificationsProvider");
  }
  return context;
}
