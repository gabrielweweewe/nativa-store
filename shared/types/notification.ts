export type AdminNotificationType = "new_order" | "new_customer";

export type AdminNotificationEntityType = "order" | "customer";

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  entityType: AdminNotificationEntityType;
  entityId: string;
  readAt: string | null;
  createdAt: string;
}
