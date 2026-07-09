import type {
  AdminNotification,
  AdminNotificationEntityType,
  AdminNotificationType,
} from "@shared/types/notification";
import { supabase } from "../lib/supabase";

interface AdminNotificationRow {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  entity_type: AdminNotificationEntityType;
  entity_id: string;
  read_at: string | null;
  created_at: string;
}

function mapNotificationRow(row: AdminNotificationRow): AdminNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function listAdminNotifications(limit = 50): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapNotificationRow(row as AdminNotificationRow));
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationAsRead(notificationId: string): Promise<AdminNotification> {
  const { data, error } = await supabase
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Notificação não encontrada");

  return mapNotificationRow(data as AdminNotificationRow);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const { error } = await supabase
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) throw new Error(error.message);
}

export async function getUnreadCountByType(): Promise<Record<AdminNotificationType, number>> {
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("type")
    .is("read_at", null);

  if (error) throw new Error(error.message);

  const counts: Record<AdminNotificationType, number> = {
    new_order: 0,
    new_customer: 0,
  };

  for (const row of data ?? []) {
    const type = row.type as AdminNotificationType;
    if (type in counts) counts[type] += 1;
  }

  return counts;
}
