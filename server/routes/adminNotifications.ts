import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  getUnreadCountByType,
  getUnreadNotificationCount,
  listAdminNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/adminNotifications";

const router = Router();

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const notifications = await listAdminNotifications();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar notificações",
    });
  }
});

router.get("/unread-count", requireAdmin, async (_req, res) => {
  try {
    const [count, byType] = await Promise.all([
      getUnreadNotificationCount(),
      getUnreadCountByType(),
    ]);
    res.json({ count, byType });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar notificações",
    });
  }
});

router.patch("/read-all", requireAdmin, async (_req, res) => {
  try {
    await markAllNotificationsAsRead();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao marcar notificações",
    });
  }
});

router.patch("/:id/read", requireAdmin, async (req, res) => {
  try {
    const notification = await markNotificationAsRead(req.params.id);
    res.json(notification);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao marcar notificação";
    const status = message.includes("não encontrada") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
